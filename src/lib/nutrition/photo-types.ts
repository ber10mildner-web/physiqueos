import type { FoodCandidate } from "@/lib/food-sources/types";
import type { DishType } from "./cooking";

/** Response of POST /api/food/photo. */
export interface PhotoAnalysis {
  dish_name: string;
  dish_type: DishType;
  basis: "recipe" | "portion";
  loss_pct: number;
  assumptions: string[];
  ingredients: {
    name: string;
    search: string;
    amount_g: number;
    cooks: boolean;
    from: "recipe" | "deviation" | "photo";
    match: FoodCandidate | null;
    alternatives: FoodCandidate[];
  }[];
  cost_eur: number;
  month_eur: number;
  budget_eur: number;
}
