import "server-only";
/**
 * Supabase-backed store for the Open Food Facts cache (table public.off_cache,
 * migration 20261124000100). The table holds only public product data and has
 * no grants for app users, so it is read and written with the server-only
 * admin client. Without SUPABASE_SECRET_KEY the cache is simply off and every
 * lookup goes straight to OFF (still with a retry).
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchOffProduct, searchOff } from "./openfoodfacts";
import { createOffCache, type CacheRow, type Locale, type OffCacheStore } from "./off-cache";
import type { FoodCandidate } from "./types";

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

function supabaseStore(): OffCacheStore | null {
  const db = createAdminClient();
  if (!db) return null;
  return {
    async get(key) {
      const { data, error } = await db.from("off_cache").select("key, kind, name, data, fetched_at").eq("key", key).maybeSingle();
      if (error) throw new Error(error.message);
      return (data as CacheRow | null) ?? null;
    },
    async put(rows) {
      if (rows.length === 0) return;
      const now = new Date().toISOString();
      const unique = [...new Map(rows.map((r) => [r.key, { ...r, fetched_at: now }])).values()];
      const { error } = await db.from("off_cache").upsert(unique, { onConflict: "key" });
      if (error) throw new Error(error.message);
    },
    async productsByName(locale, words, limit) {
      let q = db.from("off_cache").select("data").eq("kind", "product").like("key", `p:${locale}:%`);
      for (const w of words) q = q.ilike("name", `%${escapeLike(w)}%`);
      const { data, error } = await q.order("fetched_at", { ascending: false }).limit(limit);
      if (error) throw new Error(error.message);
      return (data ?? []).map((r) => r.data as FoodCandidate);
    },
  };
}

let cache: ReturnType<typeof createOffCache> | null = null;
const instance = () => (cache ??= createOffCache(supabaseStore(), { product: fetchOffProduct, search: searchOff }));

/** Barcode lookup on Open Food Facts through the cache. */
export const lookupOffProduct = (code: string, locale: Locale = "de") => instance().lookupProduct(code, locale);

/** Open Food Facts search through the cache. */
export const searchOffCached = (query: string, locale: Locale = "de", pageSize = 15) => instance().search(query, locale, pageSize);
