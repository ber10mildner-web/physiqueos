/**
 * Which of the day's foods bring the most of a nutrient ("where does my protein
 * come from?"). Entries of the same food are added up. Foods without a value for
 * the nutrient are counted separately, never as zero. Pure (tested).
 */
import { scaleNutrients } from "./calc";
import type { NutrientKey, NutrientMap } from "./nutrients";

export interface Contributor {
  name: string;
  /** Amount of the nutrient this food brought today (unit of the nutrient). */
  value: number;
  /** Eaten grams of the food. */
  grams: number;
  /** Share of the day's known total (0–1). */
  share: number;
}

export interface Contributors {
  items: Contributor[];
  total: number;
  /** Number of foods without data for this nutrient. */
  unknown: number;
}

export function contributors(
  entries: { food_name: string; nutrients_per_100g: NutrientMap; amount_g: number }[],
  key: NutrientKey,
): Contributors {
  const byName = new Map<string, Contributor>();
  let unknown = 0;
  for (const e of entries) {
    const v = scaleNutrients(e.nutrients_per_100g, e.amount_g)[key];
    if (typeof v !== "number") {
      unknown++;
      continue;
    }
    const k = e.food_name.trim().toLowerCase();
    const c = byName.get(k) ?? { name: e.food_name.trim(), value: 0, grams: 0, share: 0 };
    c.value += v;
    c.grams += e.amount_g;
    byName.set(k, c);
  }
  const items = [...byName.values()].filter((c) => c.value > 0);
  const total = items.reduce((s, c) => s + c.value, 0);
  for (const c of items) c.share = total > 0 ? c.value / total : 0;
  items.sort((a, b) => b.value - a.value);
  return { items, total, unknown };
}
