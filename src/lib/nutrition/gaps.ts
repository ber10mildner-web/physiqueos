/**
 * "Missing nutrient" hints: compares the average intake of the logged days with
 * reference values for adults (DGE/ÖGE/SGE Referenzwerte, as published by the
 * Deutsche Gesellschaft für Ernährung; values for 25–51 years). Pure (tested).
 *
 * A nutrient is only judged when most foods had a value for it, because a sum
 * over incomplete data would look too low. This is information, not a
 * diagnosis: no supplement or medical advice is derived from it.
 */
import type { Sex } from "./energy";
import type { NutrientKey } from "./nutrients";
import type { NutrientTotals } from "./calc";

type Ref = { male: number; female: number };
export const REFERENCES: Partial<Record<NutrientKey, Ref>> = {
  fiber_g: { male: 30, female: 30 },
  potassium_mg: { male: 4000, female: 4000 },
  calcium_mg: { male: 1000, female: 1000 },
  magnesium_mg: { male: 350, female: 300 },
  iron_mg: { male: 11, female: 15 },
  zinc_mg: { male: 14, female: 8 },
  vitamin_a_ug: { male: 850, female: 700 },
  vitamin_c_mg: { male: 110, female: 95 },
  vitamin_d_ug: { male: 20, female: 20 },
  vitamin_e_mg: { male: 14, female: 12 },
  folate_ug: { male: 300, female: 300 },
  vitamin_b12_ug: { male: 4, female: 4 },
};

/** Foods that are good sources, for the hint text (German / English). */
export const SOURCES: Partial<Record<NutrientKey, { de: string; en: string }>> = {
  fiber_g: { de: "Haferflocken, Linsen, Bohnen, Vollkornbrot, Himbeeren, Leinsamen", en: "oats, lentils, beans, wholegrain bread, raspberries, flaxseed" },
  potassium_mg: { de: "Kartoffeln, Bananen, Bohnen, Spinat, Avocado", en: "potatoes, bananas, beans, spinach, avocado" },
  calcium_mg: { de: "Milch, Joghurt, Skyr, Käse, Brokkoli, Mineralwasser mit viel Calcium", en: "milk, yoghurt, skyr, cheese, broccoli, calcium-rich mineral water" },
  magnesium_mg: { de: "Kürbiskerne, Haferflocken, Nüsse, Vollkorn, Bananen", en: "pumpkin seeds, oats, nuts, whole grains, bananas" },
  iron_mg: { de: "Rindfleisch, Linsen, Haferflocken, Kürbiskerne (mit Vitamin C dazu)", en: "beef, lentils, oats, pumpkin seeds (with vitamin C)" },
  zinc_mg: { de: "Rindfleisch, Haferflocken, Kürbiskerne, Käse, Linsen", en: "beef, oats, pumpkin seeds, cheese, lentils" },
  vitamin_a_ug: { de: "Karotten, Süßkartoffeln, Spinat, Grünkohl", en: "carrots, sweet potatoes, spinach, kale" },
  vitamin_c_mg: { de: "Paprika, Kiwi, Brokkoli, Orangen, Erdbeeren", en: "bell peppers, kiwi, broccoli, oranges, strawberries" },
  vitamin_d_ug: { de: "fetter Fisch (Lachs, Hering), Eier; im Winter kommt kaum etwas über die Sonne", en: "oily fish (salmon, herring), eggs; in winter the sun provides very little" },
  vitamin_e_mg: { de: "Nüsse, Mandeln, Sonnenblumenkerne, Raps- und Olivenöl", en: "nuts, almonds, sunflower seeds, rapeseed and olive oil" },
  folate_ug: { de: "Blattgemüse, Hülsenfrüchte, Brokkoli, Vollkorn", en: "leafy greens, legumes, broccoli, whole grains" },
  vitamin_b12_ug: { de: "Fleisch, Fisch, Eier, Milchprodukte", en: "meat, fish, eggs, dairy" },
};

/** Share of entries that must have a value before a nutrient is judged. */
export const MIN_COVERAGE = 0.7;
/** Below this share of the reference value a hint is shown. */
export const LOW_SHARE = 0.7;
export const MIN_DAYS = 3;

export interface Gap {
  key: NutrientKey;
  avg: number;
  reference: number;
  share: number;
}

export interface GapResult {
  gaps: Gap[];
  /** Nutrients not judged because too few foods had values. */
  unknown: NutrientKey[];
  days: number;
  enoughDays: boolean;
}

/** @param days totals of each logged day (days without entries left out). */
export function nutrientGaps(days: NutrientTotals[], sex: Sex | null, fiberGoal?: number | null): GapResult {
  const s: Sex = sex ?? "male";
  const result: GapResult = { gaps: [], unknown: [], days: days.length, enoughDays: days.length >= MIN_DAYS };
  if (!result.enoughDays) return result;
  for (const [key, ref] of Object.entries(REFERENCES) as [NutrientKey, Ref][]) {
    const known = days.reduce((a, d) => a + d[key].known, 0);
    const of = days.reduce((a, d) => a + d[key].of, 0);
    if (of === 0 || known / of < MIN_COVERAGE) {
      result.unknown.push(key);
      continue;
    }
    const avg = days.reduce((a, d) => a + d[key].value, 0) / days.length;
    const reference = key === "fiber_g" && fiberGoal ? fiberGoal : ref[s];
    const share = avg / reference;
    if (share < LOW_SHARE) result.gaps.push({ key, avg, reference, share });
  }
  result.gaps.sort((a, b) => a.share - b.share);
  return result;
}
