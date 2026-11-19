import { NUTRIENT_KEYS, type NutrientKey, type NutrientMap } from "./nutrients";

/** Round to a fixed number of decimals without floating point noise. */
export function round(value: number, decimals = 1): number {
  const f = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * f) / f;
}

/**
 * Nutrients for an eaten amount, given values per 100 g.
 * Unknown nutrients stay unknown (absent).
 */
export function scaleNutrients(per100g: NutrientMap, amountG: number): NutrientMap {
  if (!Number.isFinite(amountG) || amountG < 0) throw new RangeError("amount must be a non-negative number");
  const out: NutrientMap = {};
  for (const key of NUTRIENT_KEYS) {
    const v = per100g[key];
    if (typeof v === "number") out[key] = (v * amountG) / 100;
  }
  return out;
}

export interface LoggedItem {
  nutrients_per_100g: NutrientMap;
  amount_g: number;
}

export interface NutrientTotal {
  /** Sum over all items that have a value for this nutrient. */
  value: number;
  /** Number of items that contributed a value. */
  known: number;
  /** Total number of items. */
  of: number;
}

export type NutrientTotals = Record<NutrientKey, NutrientTotal>;

/**
 * Sums logged items. For every nutrient we also report how many items
 * actually had data, so the UI can show "45 mg (3 of 5 foods)" instead of
 * pretending an incomplete sum is the full picture.
 */
export function sumItems(items: LoggedItem[]): NutrientTotals {
  const totals = {} as NutrientTotals;
  for (const key of NUTRIENT_KEYS) totals[key] = { value: 0, known: 0, of: items.length };
  for (const item of items) {
    const scaled = scaleNutrients(item.nutrients_per_100g, item.amount_g);
    for (const key of NUTRIENT_KEYS) {
      const v = scaled[key];
      if (typeof v === "number") {
        totals[key].value += v;
        totals[key].known += 1;
      }
    }
  }
  return totals;
}

export function isComplete(t: NutrientTotal): boolean {
  return t.of > 0 && t.known === t.of;
}

/**
 * Energy estimated from macros with the Atwater factors used for EU labels
 * (Regulation (EU) No 1169/2011, Annex XIV): protein 4, carbs 4, fat 9, fibre 2 kcal/g.
 * `carbs_g` is "available carbohydrate" as on EU labels (fibre listed separately).
 */
export function energyFromMacros(n: NutrientMap): number | null {
  const { protein_g, carbs_g, fat_g, fiber_g } = n;
  if (protein_g === undefined || carbs_g === undefined || fat_g === undefined) return null;
  return protein_g * 4 + carbs_g * 4 + fat_g * 9 + (fiber_g ?? 0) * 2;
}

export type PlausibilityIssue = "macros_exceed_100g" | "energy_mismatch" | "fiber_exceeds_carbs_and_100g" | "sugar_exceeds_carbs" | "sat_fat_exceeds_fat";

/**
 * Sanity checks for per-100 g values (used for manual entry and imported data).
 * These are warnings, not hard errors: labels and databases can legitimately deviate
 * (e.g. polyols, alcohol, US-style total carbs).
 */
export function checkPlausibility(n: NutrientMap): PlausibilityIssue[] {
  const issues: PlausibilityIssue[] = [];
  const mass = (n.protein_g ?? 0) + (n.carbs_g ?? 0) + (n.fat_g ?? 0) + (n.fiber_g ?? 0);
  if (mass > 100.5) issues.push("macros_exceed_100g");
  const est = energyFromMacros(n);
  if (est !== null && n.energy_kcal !== undefined) {
    const diff = Math.abs(est - n.energy_kcal);
    if (diff > Math.max(25, n.energy_kcal * 0.2)) issues.push("energy_mismatch");
  }
  if (n.sugar_g !== undefined && n.carbs_g !== undefined && n.sugar_g > n.carbs_g + 0.5) issues.push("sugar_exceeds_carbs");
  if (n.saturated_fat_g !== undefined && n.fat_g !== undefined && n.saturated_fat_g > n.fat_g + 0.5) issues.push("sat_fat_exceeds_fat");
  return issues;
}
