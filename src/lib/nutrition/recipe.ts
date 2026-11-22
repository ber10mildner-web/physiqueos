import { NUTRIENT_KEYS, type NutrientKey, type NutrientMap } from "./nutrients";

export interface RecipeIngredientInput {
  amount_g: number;
  nutrients_per_100g: NutrientMap;
}

export interface RecipeNutrition {
  /** Sum of raw ingredient weights. */
  rawWeightG: number;
  /** Weight used for "per 100 g": cooked weight if given, else raw weight. */
  totalWeightG: number;
  /** Nutrients of the whole dish (see `partial` for sums that miss some ingredients). */
  total: NutrientMap;
  /** Nutrients per 100 g of the finished dish (same keys as `total`). */
  per100g: NutrientMap;
  /** Nutrients no usable value exists for (see recipeNutrition). */
  unknown: NutrientKey[];
  /**
   * Nutrients summed over only some ingredients, with the share (0–1) of the
   * raw weight that had data. These values are a lower bound.
   */
  partial: { key: NutrientKey; knownShare: number }[];
}

/** Energy and macros must be complete: a partial calorie sum would silently undercount. */
const STRICT_KEYS: readonly NutrientKey[] = ["energy_kcal", "protein_g", "carbs_g", "fat_g"];

/**
 * Nutrition of a recipe. Cooking changes weight (water loss/gain) but not the
 * nutrients, so the dish total is the sum of the raw ingredients and
 * "per 100 g" is relative to the cooked weight.
 *
 * Energy and macros are only reported when every ingredient has them. Other
 * nutrients (fibre, vitamins, minerals) are summed over the ingredients that
 * have data – branded foods rarely list micros, and dropping the whole value
 * would hide e.g. the fibre of the vegetables. Such sums are listed in
 * `partial` with their coverage so the UI can say so, like day totals do.
 */
export function recipeNutrition(ingredients: RecipeIngredientInput[], cookedWeightG?: number | null): RecipeNutrition {
  const rawWeightG = ingredients.reduce((s, i) => s + i.amount_g, 0);
  const totalWeightG = cookedWeightG && cookedWeightG > 0 ? cookedWeightG : rawWeightG;
  const total: NutrientMap = {};
  const per100g: NutrientMap = {};
  const unknown: NutrientKey[] = [];
  const partial: RecipeNutrition["partial"] = [];
  for (const key of NUTRIENT_KEYS) {
    if (ingredients.length === 0) break;
    let sum = 0;
    let knownWeight = 0;
    let missing = 0;
    for (const ing of ingredients) {
      const v = ing.nutrients_per_100g[key];
      if (typeof v !== "number") {
        missing += 1;
        continue;
      }
      sum += (v * ing.amount_g) / 100;
      knownWeight += ing.amount_g;
    }
    const strict = STRICT_KEYS.includes(key);
    if (missing === ingredients.length || (strict && missing > 0)) {
      unknown.push(key);
      continue;
    }
    total[key] = sum;
    if (totalWeightG > 0) per100g[key] = (sum / totalWeightG) * 100;
    if (missing > 0) partial.push({ key, knownShare: rawWeightG > 0 ? knownWeight / rawWeightG : 0 });
  }
  return { rawWeightG, totalWeightG, total, per100g, unknown, partial };
}

/** Parses lines like "200 g Haferflocken", "Haferflocken 200g", "1,5 kg Hähnchen". */
export function parseIngredientLine(line: string): { name: string; amount_g: number | null } | null {
  const text = line.replace(/^[\s\-*•·]+/, "").trim();
  if (!text) return null;
  const unit = "(kg|g|gr|gramm|ml|l)";
  const lead = text.match(new RegExp(`^(\\d+(?:[.,]\\d+)?)\\s*${unit}\\.?\\s+(.+)$`, "i"));
  const trail = text.match(new RegExp(`^(.+?)[\\s,:]+(\\d+(?:[.,]\\d+)?)\\s*${unit}\\.?$`, "i"));
  const m = lead ? { n: lead[1], u: lead[2], name: lead[3] } : trail ? { n: trail[2], u: trail[3], name: trail[1] } : null;
  if (!m) return { name: text, amount_g: null };
  const n = Number(m.n.replace(",", "."));
  const u = m.u.toLowerCase();
  const factor = u === "kg" || u === "l" ? 1000 : 1;
  return { name: m.name.trim(), amount_g: Math.round(n * factor * 10) / 10 };
}
