import { describe, expect, it, vi } from "vitest";
import { createOffCache, normalizeQuery, PRODUCT_FRESH_MS, productKey, searchKey, type CacheRow, type OffCacheStore } from "./off-cache";
import { SourceUnavailableError, type FoodCandidate } from "./types";

const food = (code: string, name: string): FoodCandidate => ({
  source: "openfoodfacts",
  source_id: code,
  source_url: null,
  name,
  brand: "Testmarke",
  barcode: code,
  serving_size_g: null,
  image_url: null,
  nutrients: { energy_kcal: 100, protein_g: 5, carbs_g: 10, fat_g: 2 },
});

function memoryStore(now: () => number): OffCacheStore & { rows: Map<string, CacheRow> } {
  const rows = new Map<string, CacheRow>();
  return {
    rows,
    get: async (key) => rows.get(key) ?? null,
    put: async (list) => list.forEach((r) => rows.set(r.key, { ...r, fetched_at: new Date(now()).toISOString() })),
    productsByName: async (locale, words, limit) =>
      [...rows.values()]
        .filter((r) => r.kind === "product" && r.key.startsWith(`p:${locale}:`) && words.every((w) => r.name?.toLowerCase().includes(w)))
        .slice(0, limit)
        .map((r) => r.data as FoodCandidate),
  };
}

const down = () => Promise.reject(new SourceUnavailableError("openfoodfacts", "HTTP 503"));

describe("Open Food Facts cache", () => {
  it("serves a fresh product from the cache without asking OFF", async () => {
    let t = Date.parse("2026-11-24T12:00:00Z");
    const store = memoryStore(() => t);
    const product = vi.fn(async (code: string) => food(code, "Skyr"));
    const cache = createOffCache(store, { product, search: async () => [] }, () => t);
    expect((await cache.lookupProduct("4000000000001", "de"))?.name).toBe("Skyr");
    t += 60_000;
    expect((await cache.lookupProduct("4000000000001", "de"))?.name).toBe("Skyr");
    expect(product).toHaveBeenCalledTimes(1);
    expect(store.rows.has(productKey("de", "4000000000001"))).toBe(true);
  });

  it("falls back to an old cached product when OFF is down, and refreshes stale ones when it is up", async () => {
    let t = Date.parse("2026-11-24T12:00:00Z");
    const store = memoryStore(() => t);
    let up = true;
    const product = vi.fn(async (code: string) => (up ? food(code, `Skyr ${t}`) : down()));
    const cache = createOffCache(store, { product, search: async () => [] }, () => t);
    const first = await cache.lookupProduct("4000000000001", "de");
    t += PRODUCT_FRESH_MS + 1;
    up = false;
    expect(await cache.lookupProduct("4000000000001", "de")).toEqual(first);
    up = true;
    expect((await cache.lookupProduct("4000000000001", "de"))?.name).toBe(`Skyr ${t}`);
  });

  it("still reports 'unavailable' when there is nothing cached", async () => {
    const cache = createOffCache(memoryStore(Date.now), { product: down, search: down });
    await expect(cache.lookupProduct("4000000000001", "de")).rejects.toBeInstanceOf(SourceUnavailableError);
    await expect(cache.search("skyr", "de", 10)).rejects.toBeInstanceOf(SourceUnavailableError);
  });

  it("caches searches and falls back to cached products by name", async () => {
    const t = Date.parse("2026-11-24T12:00:00Z");
    const store = memoryStore(() => t);
    let up = true;
    const search = vi.fn(async () => (up ? [food("4000000000001", "Skyr Natur"), food("4000000000002", "Skyr Vanille")] : down()));
    const cache = createOffCache(store, { product: down, search }, () => t);
    await cache.search("Skyr", "de", 10);
    expect(store.rows.has(searchKey("de", "  skyr ", 10))).toBe(true);
    up = false;
    // Same search, other spelling → cached search (fresh, so OFF is not asked at all).
    expect(await cache.search("SKYR", "de", 10)).toHaveLength(2);
    expect(search).toHaveBeenCalledTimes(1);
    // Never searched before → products whose name contains all words.
    expect((await cache.search("vanille skyr", "de", 10)).map((f) => f.name)).toEqual(["Skyr Vanille"]);
    // Barcode lookups profit from search results too.
    expect((await cache.lookupProduct("4000000000002", "de"))?.name).toBe("Skyr Vanille");
  });

  it("works without a store and survives a broken one", async () => {
    const product = async (code: string) => food(code, "Quark");
    expect((await createOffCache(null, { product, search: down }).lookupProduct("4000000000003", "de"))?.name).toBe("Quark");
    const broken: OffCacheStore = { get: () => Promise.reject(new Error("db")), put: () => Promise.reject(new Error("db")), productsByName: () => Promise.reject(new Error("db")) };
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await createOffCache(broken, { product, search: down }).lookupProduct("4000000000003", "de"))?.name).toBe("Quark");
    errors.mockRestore();
  });

  it("normalises queries", () => {
    expect(normalizeQuery("  Haferflocken   Zart ")).toBe("haferflocken zart");
  });
});
