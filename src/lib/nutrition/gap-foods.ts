/**
 * Concrete food suggestions for a nutrient gap ("about 8 g fibre missing:
 * e.g. 60 g oats"). Pure (tested).
 *
 * Values always come from Sigma's database: the user's own recently eaten foods
 * (snapshotted values) first, then the bundled basic foods (USDA SR28). Nothing
 * is estimated. Amounts are capped at a normal portion so the hint stays
 * realistic; if one portion does not close the gap, the share it covers is shown.
 */
import { getBasicFood } from "@/lib/food-sources/basic";
import type { NutrientKey, NutrientMap } from "./nutrients";
import type { Gap } from "./gaps";

/** Good everyday sources per nutrient: basic food id and a normal portion in g. */
export const GAP_FOODS: Partial<Record<NutrientKey, [id: string, portion: number][]>> = {
  fiber_g: [["08120", 60], ["16070", 150], ["09302", 125], ["12220", 15], ["16057", 150], ["09252", 180], ["12006", 15]],
  potassium_mg: [["11365", 250], ["09040", 120], ["16050", 150], ["11458", 150], ["09037", 70]],
  calcium_mg: [["01174", 250], ["01117", 200], ["01040", 30], ["01022", 30], ["01033", 20]],
  magnesium_mg: [["12014", 25], ["08120", 60], ["12061", 25], ["16070", 150], ["09040", 120]],
  iron_mg: [["16070", 150], ["12014", 25], ["08120", 60], ["23562", 125], ["11458", 150]],
  zinc_mg: [["23562", 125], ["12014", 25], ["08120", 60], ["01022", 30], ["16070", 150]],
  vitamin_a_ug: [["11124", 80], ["11508", 200], ["11458", 150], ["11233", 75]],
  vitamin_c_mg: [["11821", 150], ["09148", 75], ["11091", 150], ["09200", 150], ["09316", 150]],
  vitamin_d_ug: [["15039", 100], ["15236", 125], ["15046", 100], ["01123", 120]],
  vitamin_e_mg: [["12061", 25], ["12036", 25], ["12120", 25], ["04582", 10], ["09037", 70]],
  folate_ug: [["11458", 150], ["16070", 150], ["11091", 150], ["16057", 150], ["09037", 70]],
  vitamin_b12_ug: [["15039", 100], ["15236", 125], ["01123", 120], ["01174", 250], ["23562", 125]],
};

/** A food the user ate recently, with the values stored for it and the amount usually eaten. */
export interface EatenFood {
  name: string;
  per100: NutrientMap;
  usualAmountG: number;
}

export interface GapFood {
  name: string;
  grams: number;
  /** Amount of the nutrient these grams add (same unit as the nutrient). */
  adds: number;
  kcal: number | null;
  /** Share of the gap these grams close (0–1). */
  covers: number;
  fromDiary: boolean;
  /** Basic food id ("sr28-…") to open it directly; null for the user's own foods. */
  basicId: string | null;
}

const roundGrams = (g: number) => (g < 30 ? Math.max(5, Math.round(g / 5) * 5) : Math.round(g / 10) * 10);

function pick(name: string, per100: NutrientMap, key: NutrientKey, missing: number, maxG: number, basicId: string | null): GapFood | null {
  const v = per100[key];
  if (v === undefined || v <= 0) return null;
  const grams = roundGrams(Math.min(maxG, (missing / v) * 100));
  const adds = (v * grams) / 100;
  const kcal = per100.energy_kcal === undefined ? null : Math.round((per100.energy_kcal * grams) / 100);
  return { name, grams, adds, kcal, covers: Math.min(1, adds / missing), fromDiary: basicId === null, basicId };
}

/**
 * Up to `limit` suggestions for one gap. Foods the user already eats come first
 * when one normal portion closes at least 30 % of the gap.
 */
export function suggestGapFoods(gap: Gap, eaten: EatenFood[], locale: "de" | "en" = "de", limit = 3): GapFood[] {
  const missing = gap.reference - gap.avg;
  if (missing <= 0) return [];
  const out: GapFood[] = [];
  const seen = new Set<string>();
  const own = eaten
    .map((f) => pick(f.name, f.per100, gap.key, missing, Math.max(f.usualAmountG, 30), null))
    .filter((f): f is GapFood => f !== null && f.covers >= 0.3)
    .sort((a, b) => b.covers - a.covers);
  for (const f of own.slice(0, 1)) {
    out.push(f);
    seen.add(f.name.toLowerCase());
  }
  const basics = (GAP_FOODS[gap.key] ?? [])
    .map(([id, portion]) => {
      const food = getBasicFood(`sr28-${id}`, locale);
      return food ? pick(food.name, food.nutrients, gap.key, missing, portion * 1.5, food.source_id) : null;
    })
    .filter((f): f is GapFood => f !== null && f.covers >= 0.2 && !seen.has(f.name.toLowerCase()));
  // Best coverage first; among similar coverage the one with fewer calories.
  basics.sort((a, b) => b.covers - a.covers || (a.kcal ?? 0) - (b.kcal ?? 0));
  for (const f of basics) {
    if (out.length >= limit) break;
    out.push(f);
  }
  return out;
}

/** Groups diary entries into foods with their usual (median) amount. */
export function eatenFoods(entries: { food_name: string; nutrients_per_100g: NutrientMap; amount_g: number; recipe_id?: string | null }[]): EatenFood[] {
  const byName = new Map<string, { name: string; per100: NutrientMap; amounts: number[] }>();
  for (const e of entries) {
    if (e.recipe_id) continue; // recipes are whole meals, not a "add a bit more" food
    const k = e.food_name.toLowerCase();
    const cur = byName.get(k) ?? { name: e.food_name, per100: e.nutrients_per_100g, amounts: [] };
    cur.amounts.push(e.amount_g);
    byName.set(k, cur);
  }
  return [...byName.values()].map((f) => {
    const s = [...f.amounts].sort((a, b) => a - b);
    return { name: f.name, per100: f.per100, usualAmountG: s[Math.floor(s.length / 2)] };
  });
}
