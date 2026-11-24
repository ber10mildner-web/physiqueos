/**
 * Cache for Open Food Facts.
 *
 * OFF is free but often slow or briefly down (and allows only 10 searches per
 * minute per IP). So:
 *   1. Fresh hit in the cache → return it without asking OFF.
 *   2. Otherwise ask OFF (with one retry, see offGet) and store the result.
 *   3. OFF unreachable → the old hit from the cache, however old. For a search
 *      that was never cached: cached products whose name matches the query.
 * Only when the cache has nothing either does the user see "not reachable".
 *
 * Only public product data is stored (no user data), shared by all users.
 * The logic here is pure; the Supabase part lives in off-cache-store.ts.
 */
import type { FoodCandidate } from "./types";
import { SourceUnavailableError } from "./types";

export type Locale = "de" | "en";

export interface CacheRow {
  key: string;
  kind: "product" | "search";
  name: string | null;
  data: FoodCandidate | FoodCandidate[];
  fetched_at: string;
}

export interface OffCacheStore {
  get(key: string): Promise<CacheRow | null>;
  put(rows: Omit<CacheRow, "fetched_at">[]): Promise<void>;
  /** Cached products of this locale whose name contains every word of the query. */
  productsByName(locale: Locale, words: string[], limit: number): Promise<FoodCandidate[]>;
}

export interface OffFetchers {
  product(code: string, locale: Locale): Promise<FoodCandidate | null>;
  search(query: string, locale: Locale, pageSize: number): Promise<FoodCandidate[]>;
}

const DAY = 86_400_000;
/** Product data rarely changes; searches change as OFF grows. */
export const PRODUCT_FRESH_MS = 30 * DAY;
export const SEARCH_FRESH_MS = 3 * DAY;

export const productKey = (locale: Locale, code: string) => `p:${locale}:${code}`;
export const normalizeQuery = (q: string) => q.toLowerCase().normalize("NFC").replace(/\s+/g, " ").trim();
export const searchKey = (locale: Locale, q: string, pageSize: number) => `s:${locale}:${pageSize}:${normalizeQuery(q)}`;
export const queryWords = (q: string) => normalizeQuery(q).split(" ").filter((w) => w.length >= 2).slice(0, 4);

const isFresh = (row: CacheRow, maxAgeMs: number, now: number) => now - Date.parse(row.fetched_at) < maxAgeMs;

/** Never let a broken cache break the lookup. */
async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch (e) {
    console.error("off cache", e);
    return fallback;
  }
}

const productRow = (locale: Locale, f: FoodCandidate): Omit<CacheRow, "fetched_at"> => ({
  key: productKey(locale, f.source_id ?? ""),
  kind: "product",
  name: [f.name, f.brand].filter(Boolean).join(" ").slice(0, 300),
  data: f,
});

export function createOffCache(store: OffCacheStore | null, fetchers: OffFetchers, now: () => number = Date.now) {
  async function lookupProduct(code: string, locale: Locale): Promise<FoodCandidate | null> {
    const cached = store ? await safe(store.get(productKey(locale, code)), null) : null;
    if (cached && isFresh(cached, PRODUCT_FRESH_MS, now())) return cached.data as FoodCandidate;
    try {
      const food = await fetchers.product(code, locale);
      if (food && store) await safe(store.put([productRow(locale, food)]), undefined);
      return food;
    } catch (e) {
      if (e instanceof SourceUnavailableError && cached) return cached.data as FoodCandidate;
      throw e;
    }
  }

  async function search(query: string, locale: Locale, pageSize: number): Promise<FoodCandidate[]> {
    const key = searchKey(locale, query, pageSize);
    const cached = store ? await safe(store.get(key), null) : null;
    if (cached && isFresh(cached, SEARCH_FRESH_MS, now())) return cached.data as FoodCandidate[];
    try {
      const list = await fetchers.search(query, locale, pageSize);
      if (store) {
        const products = list.filter((f) => f.source_id).map((f) => productRow(locale, f));
        await safe(store.put([{ key, kind: "search", name: normalizeQuery(query).slice(0, 300), data: list }, ...products]), undefined);
      }
      return list;
    } catch (e) {
      if (!(e instanceof SourceUnavailableError) || !store) throw e;
      if (cached) return cached.data as FoodCandidate[];
      const words = queryWords(query);
      const similar = words.length ? await safe(store.productsByName(locale, words, pageSize), []) : [];
      if (similar.length) return similar;
      throw e;
    }
  }

  return { lookupProduct, search };
}
