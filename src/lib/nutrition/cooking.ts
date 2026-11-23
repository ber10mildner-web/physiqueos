/**
 * Water loss when cooking. Nobody weighs the finished pot, but the dish gets
 * lighter (water evaporates), so its calories per 100 g rise. Ignoring that
 * would log too few calories for every portion – the error Leo worries about.
 *
 * Model: the ingredients are listed raw (as they go into the pot); each one is
 * marked whether it loses water while cooking ("cooks"). Fats, sugar, dry pasta,
 * water absorbed by pasta/rice and toppings added afterwards do not. The cooked
 * weight is the raw total minus `lossPct` % of the ingredients that cook.
 *
 * Defaults per dish type use the upper end of typical ranges, so an estimate
 * errs towards slightly more calories rather than fewer. Always shown and editable.
 */
import { NUTRIENT_KEYS, type NutrientMap } from "./nutrients";
import type { FoodCandidate } from "@/lib/food-sources/types";

export const DISH_TYPES = ["bake", "pan", "roast", "stew", "sauce", "grain", "baked_goods", "raw", "other"] as const;
export type DishType = (typeof DISH_TYPES)[number];

/** % of the weight of the cooking ingredients that evaporates. */
export const DEFAULT_LOSS_PCT: Record<DishType, number> = {
  bake: 15, // Auflauf, Lasagne, Gratin
  pan: 15, // Pfannengericht, Geschnetzeltes, Gemüsepfanne
  roast: 25, // gebratenes/gegrilltes Fleisch, Braten, Ofengemüse
  stew: 10, // Eintopf, Suppe, Curry, Chili
  sauce: 10, // Pasta-/Tomatensoße, Bolognese
  grain: 10, // Risotto, Reis-/Nudelpfanne
  baked_goods: 12, // Kuchen, Brot, Pizza
  raw: 0, // Salat, Bowl, Müsli, Brot belegt
  other: 10,
};

export interface CookItem {
  amount_g: number;
  cooks: boolean;
}

export function rawWeight(items: CookItem[]): number {
  return items.reduce((s, i) => s + i.amount_g, 0);
}

/** Weight of the finished dish after water loss (rounded to whole grams). */
export function cookedWeight(items: CookItem[], lossPct: number): number {
  const pct = Math.min(60, Math.max(0, lossPct));
  const cooking = items.filter((i) => i.cooks).reduce((s, i) => s + i.amount_g, 0);
  return Math.round(rawWeight(items) - (cooking * pct) / 100);
}

/** Plain water (absorbed by pasta/rice, or cooking liquid in Thermomix recipes): no energy or nutrients. */
export function waterCandidate(name = "Wasser"): FoodCandidate {
  const nutrients: NutrientMap = {};
  for (const k of NUTRIENT_KEYS) nutrients[k] = 0;
  return { source: "custom", source_id: null, source_url: null, name, brand: null, barcode: null, serving_size_g: null, image_url: null, nutrients };
}

export function isWater(term: string): boolean {
  return /^(leitungs|mineral|koch)?wasser\b/i.test(term.trim());
}
