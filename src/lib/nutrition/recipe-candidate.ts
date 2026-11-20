import type { FoodCandidate } from "@/lib/food-sources/types";
import type { Recipe } from "@/lib/data/types";
import { recipeNutrition } from "./recipe";

/** Presents a recipe like a food (values per 100 g of the finished dish). */
export function recipeAsCandidate(r: Recipe): FoodCandidate & { unknown: string[] } {
  const n = recipeNutrition(r.ingredients, r.cooked_weight_g);
  const serving = r.servings && n.totalWeightG > 0 ? Math.round(n.totalWeightG / r.servings) : null;
  return {
    id: r.id,
    source: "recipe",
    source_id: r.id,
    source_url: null,
    name: r.name,
    brand: null,
    barcode: null,
    serving_size_g: serving,
    image_url: null,
    nutrients: n.per100g,
    is_favorite: r.is_favorite,
    unknown: n.unknown,
  };
}
