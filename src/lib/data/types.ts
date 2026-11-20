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
  water_target_ml: number | null;
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
  is_favorite?: boolean;
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
  recipe_id: string | null;
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

export interface RecipeIngredient {
  id: string;
  position: number;
  food_id: string | null;
  name: string;
  brand: string | null;
  source: FoodSource;
  source_id: string | null;
  amount_g: number;
  nutrients_per_100g: NutrientMap;
}

export interface Recipe {
  id: string;
  name: string;
  notes: string | null;
  cooked_weight_g: number | null;
  servings: number | null;
  is_favorite: boolean;
  archived: boolean;
  updated_at: string;
  ingredients: RecipeIngredient[];
}

export type MuscleGroup = "chest" | "back" | "shoulders" | "biceps" | "triceps" | "legs" | "glutes" | "hamstrings" | "calves" | "core" | "full_body" | "cardio";
export const MUSCLE_GROUPS: MuscleGroup[] = ["chest", "back", "shoulders", "biceps", "triceps", "legs", "glutes", "hamstrings", "calves", "core", "full_body", "cardio"];
export type Equipment = "barbell" | "dumbbell" | "machine" | "cable" | "bodyweight" | "kettlebell" | "other";
export const EQUIPMENT: Equipment[] = ["barbell", "dumbbell", "machine", "cable", "bodyweight", "kettlebell", "other"];

export interface Exercise {
  id: string;
  user_id: string | null;
  name_de: string;
  name_en: string;
  muscle_group: MuscleGroup;
  equipment: Equipment;
}

export interface PlanExercise {
  id: string;
  exercise_id: string;
  position: number;
  target_sets: number;
  rep_min: number;
  rep_max: number;
}

export interface WorkoutPlan {
  id: string;
  name: string;
  notes: string | null;
  position: number;
  exercises: PlanExercise[];
}

export interface WorkoutSet {
  id: string;
  workout_id: string;
  exercise_id: string;
  position: number;
  reps: number;
  weight_kg: number;
  rpe: number | null;
  is_warmup: boolean;
  created_at: string;
}

export interface Workout {
  id: string;
  plan_id: string | null;
  name: string;
  workout_date: string;
  started_at: string;
  finished_at: string | null;
  notes: string | null;
  sets: WorkoutSet[];
}

export type CardioActivity = "run" | "bike" | "walk" | "row" | "swim" | "elliptical" | "stairs" | "hike" | "other";
export const CARDIO_ACTIVITIES: CardioActivity[] = ["run", "bike", "walk", "row", "swim", "elliptical", "stairs", "hike", "other"];

export interface CardioSession {
  id: string;
  session_date: string;
  activity: CardioActivity;
  duration_min: number;
  distance_km: number | null;
  avg_hr: number | null;
  kcal: number | null;
  notes: string | null;
  source: "manual" | "garmin" | "strava" | "claude";
}

export interface DailyHealth {
  entry_date: string;
  sleep_score: number | null;
  sleep_minutes: number | null;
  resting_hr: number | null;
  hrv_ms: number | null;
  body_battery: number | null;
  steps: number | null;
  stress: number | null;
  source: "manual" | "garmin" | "claude";
}
