/**
 * Turns what the AI read off a nutrition label into a prefilled food for the
 * manual form. Pure, no AI here (see src/lib/ai/label-reader.ts).
 *
 * - Values are taken per 100 g / 100 ml. If the label only has a per-portion
 *   column, they are scaled with the printed portion size; without a portion
 *   size nothing is scaled and no values are filled in.
 * - Energy: kcal as printed; only kJ → kcal (1 kcal = 4.184 kJ).
 * - Values the label does not show stay empty (= unknown), never 0.
 */
import type { FoodCandidate } from "@/lib/food-sources/types";
import { NUTRIENT_KEYS, sanitizeNutrients, type NutrientKey, type NutrientMap } from "./nutrients";

export interface LabelReading {
  readable: boolean;
  name: string | null;
  brand: string | null;
  basis: "per_100g" | "per_serving";
  serving_g: number | null;
  energy_kj: number | null;
  values: Partial<Record<NutrientKey, number | null>>;
}

export type LabelResult =
  | { ok: true; food: Partial<FoodCandidate>; scaledFromServing: boolean }
  | { ok: false; reason: "unreadable" | "no_serving" };

const round = (v: number) => Math.round(v * 1000) / 1000;

export function labelToFood(r: LabelReading): LabelResult {
  if (!r.readable) return { ok: false, reason: "unreadable" };
  const serving = r.serving_g && r.serving_g > 0 && r.serving_g <= 2000 ? r.serving_g : null;
  let factor = 1;
  if (r.basis === "per_serving") {
    if (!serving) return { ok: false, reason: "no_serving" };
    factor = 100 / serving;
  }
  const raw: Record<string, unknown> = {};
  for (const k of NUTRIENT_KEYS) {
    const v = r.values[k];
    if (typeof v === "number") raw[k] = v * factor;
  }
  const nutrients: NutrientMap = sanitizeNutrients(raw);
  if (nutrients.energy_kcal === undefined && typeof r.energy_kj === "number" && r.energy_kj >= 0) nutrients.energy_kcal = (r.energy_kj * factor) / 4.184;
  // Salt and sodium are the same information (salt = sodium × 2.5); fill in the missing one.
  if (nutrients.salt_g !== undefined && nutrients.sodium_mg === undefined) nutrients.sodium_mg = (nutrients.salt_g / 2.5) * 1000;
  if (nutrients.sodium_mg !== undefined && nutrients.salt_g === undefined) nutrients.salt_g = (nutrients.sodium_mg / 1000) * 2.5;
  for (const k of Object.keys(nutrients) as NutrientKey[]) nutrients[k] = round(nutrients[k]!);
  if (Object.keys(nutrients).length === 0) return { ok: false, reason: "unreadable" };
  return {
    ok: true,
    scaledFromServing: factor !== 1,
    food: {
      name: r.name?.trim().slice(0, 200) || "",
      brand: r.brand?.trim().slice(0, 200) || null,
      serving_size_g: serving,
      nutrients,
    },
  };
}
