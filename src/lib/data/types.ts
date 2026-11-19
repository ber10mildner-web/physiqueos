import type { NutrientMap } from "@/lib/nutrition/nutrients";
import type { ActivityLevel, Phase, Sex } from "@/lib/nutrition/energy";
import type { FoodSource } from "@/lib/food-sources/types";

export type MealSlot = "breakfast" | "lunch" | "dinner" | "snack";
export const MEALS: MealSlot[] = ["breakfast", "lunch", "dinner", "snack"];
export type PhotoPose = "front" | "side" | "back" | "other";
export const POSES: PhotoPose[] = ["front", "side", "back", "other"];

export interface Profile {
  id: string;
  display_name: string | null;
  locale: "de" | "en";
  sex: Sex | null;
  birth_date: string | null;
  height_cm: number | null;
  activity_level: ActivityLevel | null;
}

export interface NutritionGoal {
  id: string;
  valid_from: string;
  phase: Phase;
  energy_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
}

export interface Food {
  id: string;
  source: FoodSource;
  source_id: string | null;
  source_url: string | null;
  name: string;
  brand: string | null;
  barcode: string | null;
  serving_size_g: number | null;
  image_url: string | null;
  nutrients: NutrientMap;
}

export interface DiaryEntry {
  id: string;
  entry_date: string;
  meal: MealSlot;
  food_id: string | null;
  food_name: string;
  food_brand: string | null;
  source: FoodSource;
  source_id: string | null;
  nutrients_per_100g: NutrientMap;
  amount_g: number;
  created_at: string;
}

export interface WeightEntry {
  id: string;
  entry_date: string;
  weight_kg: number;
  note: string | null;
}

export interface ProgressPhoto {
  id: string;
  taken_on: string;
  pose: PhotoPose;
  storage_path: string;
  width: number | null;
  height: number | null;
  note: string | null;
  url: string | null;
}
