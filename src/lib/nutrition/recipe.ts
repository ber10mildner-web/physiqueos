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
  /** Nutrients of the whole dish. Only nutrients every ingredient has are included. */
  total: NutrientMap;
  /** Nutrients per 100 g of the finished dish (same keys as `total`). */
  per100g: NutrientMap;
  /** Nutrients that are unknown because at least one ingredient lacks them. */
  unknown: NutrientKey[];
}

/**
 * Nutrition of a recipe. Cooking changes weight (water loss/gain) but not the
 * nutrients, so the dish total is the sum of the raw ingredients and
 * "per 100 g" is relative to the cooked weight.
 *
 * A nutrient is only reported when every ingredient has a value for it – a
 * partial sum would understate the dish without the user noticing.
 */
export function recipeNutrition(ingredients: RecipeIngredientInput[], cookedWeightG?: number | null): RecipeNutrition {
  const rawWeightG = ingredients.reduce((s, i) => s + i.amount_g, 0);
  const totalWeightG = cookedWeightG && cookedWeightG > 0 ? cookedWeightG : rawWeightG;
  const total: NutrientMap = {};
  const per100g: NutrientMap = {};
  const unknown: NutrientKey[] = [];
  for (const key of NUTRIENT_KEYS) {
    if (ingredients.length === 0) break;
    let sum = 0;
    let complete = true;
    for (const ing of ingredients) {
      const v = ing.nutrients_per_100g[key];
      if (typeof v !== "number") {
        complete = false;
        break;
      }
      sum += (v * ing.amount_g) / 100;
    }
    if (complete) {
      total[key] = sum;
      if (totalWeightG > 0) per100g[key] = (sum / totalWeightG) * 100;
    } else {
      unknown.push(key);
    }
  }
  return { rawWeightG, totalWeightG, total, per100g, unknown };
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
