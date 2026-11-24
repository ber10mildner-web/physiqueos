/**
 * Open Food Facts (https://world.openfoodfacts.org)
 *
 * - Data licence: Open Database License (ODbL). Attribution required ("Data from Open Food Facts").
 * - No API key. Rate limits (2024 docs): 100 product reads/min, 10 search requests/min per IP.
 * - Requests must send a descriptive User-Agent.
 * - `nutriments.<name>_100g` values are normalised by OFF to grams per 100 g / 100 ml
 *   (energy: `energy-kcal_100g` in kcal, `energy-kj_100g` in kJ).
 */
import { NUTRIENTS, NUTRIENT_KEYS, type NutrientMap } from "@/lib/nutrition/nutrients";
import { unitFactor } from "@/lib/nutrition/nutrients";
import { BARCODE_RE, SourceUnavailableError, type FoodCandidate } from "./types";

const BASE = "https://world.openfoodfacts.org";
export const OFF_FIELDS = [
  "code",
  "product_name",
  "product_name_de",
  "product_name_en",
  "generic_name",
  "brands",
  "serving_quantity",
  "serving_quantity_unit",
  "image_front_small_url",
  "nutriments",
].join(",");

export interface OffProduct {
  code?: string;
  product_name?: string;
  product_name_de?: string;
  product_name_en?: string;
  generic_name?: string;
  brands?: string;
  serving_quantity?: number | string;
  serving_quantity_unit?: string;
  image_front_small_url?: string;
  nutriments?: Record<string, unknown>;
}

function num(v: unknown): number | undefined {
  const n = typeof v === "string" ? Number(v.replace(",", ".")) : v;
  return typeof n === "number" && Number.isFinite(n) && n >= 0 ? n : undefined;
}

export function mapOffNutriments(nutriments: Record<string, unknown> | undefined): NutrientMap {
  const out: NutrientMap = {};
  if (!nutriments) return out;
  for (const key of NUTRIENT_KEYS) {
    const def = NUTRIENTS[key];
    if (!def.off) continue;
    for (const field of def.off) {
      const raw = num(nutriments[`${field}_100g`]);
      if (raw === undefined) continue;
      const factor = def.unit === "kcal" ? 1 : unitFactor("g", def.unit);
      if (factor === null) continue;
      out[key] = raw * factor;
      break;
    }
  }
  // Some products only carry kJ. 1 kcal = 4.184 kJ (thermochemical calorie).
  if (out.energy_kcal === undefined) {
    const kj = num(nutriments["energy-kj_100g"]);
    if (kj !== undefined) out.energy_kcal = kj / 4.184;
  }
  return out;
}

export function mapOffProduct(p: OffProduct, fallbackCode?: string, locale: "de" | "en" = "de"): FoodCandidate | null {
  const code = (p.code ?? fallbackCode ?? "").trim();
  const names = locale === "de"
    ? [p.product_name_de, p.product_name, p.product_name_en, p.generic_name]
    : [p.product_name_en, p.product_name, p.product_name_de, p.generic_name];
  const name = names.map((n) => n?.trim()).find((n) => n);
  if (!code || !name) return null;
  const serving = num(p.serving_quantity);
  const servingUnit = (p.serving_quantity_unit ?? "g").toLowerCase();
  return {
    source: "openfoodfacts",
    source_id: code,
    source_url: `${BASE}/product/${encodeURIComponent(code)}`,
    name,
    brand: p.brands?.split(",")[0]?.trim() || null,
    barcode: BARCODE_RE.test(code) ? code : null,
    serving_size_g: serving && (servingUnit === "g" || servingUnit === "ml") ? serving : null,
    image_url: p.image_front_small_url ?? null,
    nutrients: mapOffNutriments(p.nutriments),
  };
}

function headers() {
  return {
    "User-Agent": process.env.OFF_USER_AGENT || "Sigma/0.3 (personal nutrition tracker)",
    Accept: "application/json",
  };
}

/** Network errors, timeouts and server errors are worth one more try; 404 and rate limits are not. */
const RETRY_DELAY_MS = 600;

/**
 * GET with one retry: OFF often answers a single request slowly or with a 5xx
 * and works again a moment later. Throws SourceUnavailableError when both fail.
 */
export async function offGet(url: string, timeoutMs: number, revalidate: number, fetchImpl: typeof fetch = fetch): Promise<Response> {
  let last = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    try {
      const res = await fetchImpl(url, { headers: headers(), signal: AbortSignal.timeout(timeoutMs), next: { revalidate } } as RequestInit);
      if (res.ok || res.status === 404) return res;
      last = `HTTP ${res.status}`;
      if (res.status === 429 || res.status < 500) break;
    } catch (e) {
      last = (e as Error).message;
    }
  }
  throw new SourceUnavailableError("openfoodfacts", last);
}

/** Live lookup (no cache). Use lookupOffProduct from off-cache.ts in the app. */
export async function fetchOffProduct(barcode: string, locale: "de" | "en" = "de"): Promise<FoodCandidate | null> {
  if (!BARCODE_RE.test(barcode)) return null;
  const res = await offGet(`${BASE}/api/v2/product/${barcode}.json?fields=${OFF_FIELDS}`, 6000, 86_400);
  if (res.status === 404) return null;
  const body = (await res.json()) as { status?: number; product?: OffProduct };
  if (body.status !== 1 || !body.product) return null;
  return mapOffProduct(body.product, barcode, locale);
}

/** Live search (no cache). Use searchOffCached from off-cache.ts in the app. */
export async function searchOff(query: string, locale: "de" | "en" = "de", pageSize = 15): Promise<FoodCandidate[]> {
  const params = new URLSearchParams({
    search_terms: query,
    search_simple: "1",
    action: "process",
    json: "1",
    page_size: String(pageSize),
    sort_by: "unique_scans_n",
    lc: locale,
    fields: OFF_FIELDS,
  });
  const res = await offGet(`${BASE}/cgi/search.pl?${params}`, 7000, 3600);
  if (!res.ok) throw new SourceUnavailableError("openfoodfacts", `HTTP ${res.status}`);
  const body = (await res.json()) as { products?: OffProduct[] };
  return (body.products ?? [])
    .map((p) => mapOffProduct(p, undefined, locale))
    .filter((c): c is FoodCandidate => c !== null);
}
