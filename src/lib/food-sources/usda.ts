/**
 * USDA FoodData Central (https://fdc.nal.usda.gov)
 *
 * - Public domain data (CC0). Free API key from https://fdc.nal.usda.gov/api-key-signup
 *   (api.data.gov). Default limit: 1,000 requests/hour per key. DEMO_KEY works for testing
 *   but is heavily rate limited.
 * - We query "Foundation" and "SR Legacy" foods: generic foods with detailed
 *   vitamin/mineral data, values per 100 g. Names are English only.
 * - The key is used server-side only (env USDA_API_KEY).
 */
import { NUTRIENTS, NUTRIENT_KEYS, unitFactor, type NutrientMap } from "@/lib/nutrition/nutrients";
import { SourceUnavailableError, type FoodCandidate } from "./types";

const BASE = "https://api.nal.usda.gov/fdc/v1";

/** Nutrient as returned by /foods/search (flat) or /food/{id} (nested). */
export interface UsdaNutrient {
  nutrientNumber?: string;
  unitName?: string;
  value?: number;
  amount?: number;
  nutrient?: { number?: string; unitName?: string };
}

export interface UsdaFood {
  fdcId: number;
  description: string;
  dataType?: string;
  brandOwner?: string;
  brandName?: string;
  gtinUpc?: string;
  foodNutrients?: UsdaNutrient[];
}

export function mapUsdaNutrients(list: UsdaNutrient[] | undefined): NutrientMap {
  const byNumber = new Map<string, { value: number; unit: string }>();
  for (const n of list ?? []) {
    const number = n.nutrientNumber ?? n.nutrient?.number;
    const unit = n.unitName ?? n.nutrient?.unitName;
    const value = n.value ?? n.amount;
    if (!number || !unit || typeof value !== "number" || !Number.isFinite(value) || value < 0) continue;
    if (!byNumber.has(number)) byNumber.set(number, { value, unit });
  }
  const out: NutrientMap = {};
  for (const key of NUTRIENT_KEYS) {
    const def = NUTRIENTS[key];
    for (const number of def.usda ?? []) {
      const hit = byNumber.get(number);
      if (!hit) continue;
      const factor = unitFactor(hit.unit, def.unit);
      if (factor === null) continue;
      out[key] = hit.value * factor;
      break;
    }
  }
  return out;
}

export function mapUsdaFood(f: UsdaFood): FoodCandidate {
  return {
    source: "usda",
    source_id: String(f.fdcId),
    source_url: `https://fdc.nal.usda.gov/food-details/${f.fdcId}/nutrients`,
    name: f.description,
    brand: f.brandName || f.brandOwner || null,
    barcode: null,
    serving_size_g: null,
    image_url: null,
    nutrients: mapUsdaNutrients(f.foodNutrients),
  };
}

export async function searchUsda(query: string, pageSize = 10): Promise<FoodCandidate[]> {
  const key = process.env.USDA_API_KEY || "DEMO_KEY";
  const params = new URLSearchParams({ query, pageSize: String(pageSize) });
  params.append("dataType", "Foundation");
  params.append("dataType", "SR Legacy");
  let res: Response;
  try {
    res = await fetch(`${BASE}/foods/search?${params}`, {
      headers: { "X-Api-Key": key, Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
      next: { revalidate: 86_400 },
    });
  } catch (e) {
    throw new SourceUnavailableError("usda", (e as Error).message);
  }
  if (!res.ok) throw new SourceUnavailableError("usda", `HTTP ${res.status}`);
  const body = (await res.json()) as { foods?: UsdaFood[] };
  return (body.foods ?? []).map(mapUsdaFood);
}
