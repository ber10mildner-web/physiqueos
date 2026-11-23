/**
 * Short nutrient overview for one food ("what is actually in it?"), shown when
 * the food's picture in the diary is tapped. Pure (tested).
 *
 * Kept deliberately short: energy, macros, fibre, sugar and the few vitamins
 * and minerals of which the amount delivers the largest share of the daily
 * reference. A missing value is unknown, never zero.
 */
import { scaleNutrients } from "./calc";
import { REFERENCES } from "./gaps";
import { MICRO_NUTRIENTS, type NutrientKey, type NutrientMap } from "./nutrients";

/** Vitamins/minerals below this share of the daily reference are not listed at all. */
export const MIN_SHARE = 0.05;
/** From this share on a vitamin/mineral counts as a real source (EU claim "source of" is 15 %). */
export const NOTABLE_SHARE = 0.15;
/** At most this many vitamins/minerals are listed. */
export const MAX_HIGHLIGHTS = 4;

export interface Highlight {
  key: NutrientKey;
  value: number;
  /** Share of the adult daily reference (mean of the DGE values for men and women). */
  share: number;
  /** At least NOTABLE_SHARE of the daily reference. */
  notable: boolean;
}

export interface FoodPeek {
  /** Values for the chosen amount; missing key = unknown. */
  values: NutrientMap;
  /** The vitamins/minerals with the largest share of the daily reference, largest first. */
  highlights: Highlight[];
  /** Share of the daily fibre reference, when fibre is known. */
  fiberShare: number | null;
  /** How many of the vitamins and minerals have a value at all. */
  microsKnown: number;
  microsTotal: number;
}

/** Daily reference used for the "% of daily need" hints (adults, DGE). */
export function dailyReference(key: NutrientKey): number | null {
  const r = REFERENCES[key];
  return r ? (r.male + r.female) / 2 : null;
}

export function foodPeek(per100g: NutrientMap, grams: number): FoodPeek {
  const values = scaleNutrients(per100g, grams);
  const highlights: Highlight[] = [];
  for (const key of MICRO_NUTRIENTS) {
    const v = values[key];
    const ref = dailyReference(key);
    if (v === undefined || !ref) continue;
    const share = v / ref;
    if (share >= MIN_SHARE) highlights.push({ key, value: v, share, notable: share >= NOTABLE_SHARE });
  }
  highlights.sort((a, b) => b.share - a.share);
  const fiberRef = dailyReference("fiber_g");
  return {
    values,
    highlights: highlights.slice(0, MAX_HIGHLIGHTS),
    fiberShare: values.fiber_g === undefined || !fiberRef ? null : values.fiber_g / fiberRef,
    microsKnown: MICRO_NUTRIENTS.filter((k) => per100g[k] !== undefined).length,
    microsTotal: MICRO_NUTRIENTS.length,
  };
}
