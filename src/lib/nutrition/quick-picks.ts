/**
 * "Quick picks": the foods and recipes the user eats most often, so they can be
 * logged with one tap instead of searching. Pure functions (tested); the data
 * comes from src/lib/data/tracking.ts.
 */
import type { MealSlot } from "@/lib/data/types";
import type { NutrientMap } from "./nutrients";

export interface QuickPick {
  kind: "food" | "recipe";
  id: string;
  name: string;
  /** Amount logged last time (or the serving size / 100 g for a favourite never logged). */
  amount_g: number;
  /** Values per 100 g (for the kcal preview). */
  nutrients: NutrientMap;
  favorite: boolean;
  /** How often it was logged in each meal recently. */
  counts: Partial<Record<MealSlot, number>>;
  /** created_at of the latest diary entry ("" if never logged). */
  last_used: string;
}

export interface PickHistoryRow {
  food_id: string | null;
  recipe_id: string | null;
  meal: MealSlot;
  amount_g: number;
  created_at: string;
  food_name: string;
  nutrients_per_100g: NutrientMap;
}

export interface PickFavorite {
  kind: "food" | "recipe";
  id: string;
  name: string;
  serving_size_g: number | null;
  nutrients: NutrientMap;
}

/** Builds quick picks from recent diary rows (any order) and the user's favourites. */
export function buildQuickPicks(history: PickHistoryRow[], favorites: PickFavorite[]): QuickPick[] {
  const picks = new Map<string, QuickPick>();
  const sorted = [...history].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  for (const row of sorted) {
    const kind = row.recipe_id ? "recipe" : row.food_id ? "food" : null;
    const id = row.recipe_id ?? row.food_id;
    if (!kind || !id) continue;
    const key = `${kind}:${id}`;
    let p = picks.get(key);
    if (!p) {
      // newest row first: its amount and values are the ones to reuse
      p = { kind, id, name: row.food_name, amount_g: row.amount_g, nutrients: row.nutrients_per_100g, favorite: false, counts: {}, last_used: row.created_at };
      picks.set(key, p);
    }
    p.counts[row.meal] = (p.counts[row.meal] ?? 0) + 1;
  }
  for (const f of favorites) {
    const key = `${f.kind}:${f.id}`;
    const p = picks.get(key);
    if (p) {
      p.favorite = true;
      p.name = f.name;
      // recipes can change; a food's current library values are the ones logged next time
      p.nutrients = f.nutrients;
    } else {
      picks.set(key, { kind: f.kind, id: f.id, name: f.name, amount_g: f.serving_size_g ?? 100, nutrients: f.nutrients, favorite: true, counts: {}, last_used: "" });
    }
  }
  return [...picks.values()];
}

/**
 * Best picks for one meal: favourites first, then what is usually eaten in this
 * meal, then what is eaten often at all. Foods eaten only once in another meal
 * are left out so the list stays short and relevant.
 */
export function rankForMeal(picks: QuickPick[], meal: MealSlot, limit = 8): QuickPick[] {
  const total = (p: QuickPick) => Object.values(p.counts).reduce((s, n) => s + (n ?? 0), 0);
  const score = (p: QuickPick) => (p.favorite ? 1000 : 0) + (p.counts[meal] ?? 0) * 10 + total(p);
  return picks
    .filter((p) => p.favorite || (p.counts[meal] ?? 0) > 0 || total(p) >= 3)
    .sort((a, b) => score(b) - score(a) || (a.last_used < b.last_used ? 1 : -1) || a.name.localeCompare(b.name))
    .slice(0, limit);
}
