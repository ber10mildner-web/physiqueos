/**
 * Do the calories fit the macros? Pure (tested).
 *
 * Product databases (above all Open Food Facts, which anyone can edit) sometimes
 * carry a wrong energy value, e.g. a red onion with 326 kcal per 100 g while its
 * own macros (1 g protein, 4.9 g carbs, 0.1 g fat) give about 27 kcal.
 *
 * Energy from macros with the EU label factors (Regulation 1169/2011, Annex XIV):
 * protein 4, carbohydrate 4, fat 9, fibre 2 kcal/g. Alcohol (7 kcal/g) and polyols
 * (2.4 kcal/g) are not tracked, so drinks and sugar-free sweets can differ for good
 * reasons. That is why Sigma only warns and lets the user decide; it never
 * changes a value by itself.
 */
import type { NutrientMap } from "./nutrients";

export interface EnergyMismatch {
  /** kcal per 100 g in the data. */
  stated: number;
  /** kcal per 100 g calculated from protein, carbs, fat (and fibre). */
  fromMacros: number;
}

/** Calories from the macros, or null when one of protein, carbs, fat is unknown. */
export function energyFromMacros(n: NutrientMap): number | null {
  if (n.protein_g === undefined || n.carbs_g === undefined || n.fat_g === undefined) return null;
  return 4 * n.protein_g + 4 * n.carbs_g + 9 * n.fat_g + 2 * (n.fiber_g ?? 0);
}

/**
 * A mismatch when the stated kcal are far away from the macros: more than 35 %
 * and more than 40 kcal per 100 g. The 40 kcal floor keeps rounding on very
 * light foods (cucumbers, drinks) from raising alarms.
 */
export function energyMismatch(n: NutrientMap): EnergyMismatch | null {
  const stated = n.energy_kcal;
  const fromMacros = energyFromMacros(n);
  if (stated === undefined || fromMacros === null) return null;
  const diff = Math.abs(stated - fromMacros);
  if (diff <= 40 || diff <= 0.35 * Math.max(stated, fromMacros)) return null;
  return { stated, fromMacros: Math.round(fromMacros) };
}
