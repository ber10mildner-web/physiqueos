import type { NutrientMap } from "@/lib/nutrition/nutrients";
import type { ActivityLevel, Phase, Sex } from "@/lib/nutrition/energy";
import type { GoalTargets } from "@/lib/nutrition/goal-days";
import type { FoodSource } from "@/lib/food-sources/types";

export type MealSlot = "breakfast" | "pre_workout" | "lunch" | "post_workout" | "dinner" | "snack";
/** Every meal slot Sigma knows, in the default order. Which ones a user sees: see meal-slots.ts. */
export const MEALS: MealSlot[] = ["breakfast", "pre_workout", "post_workout", "lunch", "dinner", "snack"];
/** A meal as the user set it up: which slot, and an optional own name (e.g. "Supplemente"). */
export interface MealSetting {
  key: MealSlot;
  name: string | null;
}
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
  /** Water card shown (off unless switched on in the settings). */
  water_tracking: boolean;
  /** The user's meals in their order (null = default). */
  meal_slots: MealSetting[] | null;
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
  /** true if `date` is one of the weekdays with different targets (energy_kcal … fiber_g are then those). */
  alt_day: boolean;
  /** Targets on normal days. */
  base: GoalTargets;
  /** ISO weekdays (1 = Monday) with different targets, and those targets. */
  alt_days: number[];
  alt: GoalTargets | null;
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
  /** ISO weekdays (1 = Monday … 7 = Sunday) on which this plan is planned. */
  schedule_days: number[];
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
  feeling: number | null;
  energy: number | null;
  effort: number | null;
  rating_note: string | null;
  sets: WorkoutSet[];
  exercise_notes: ExerciseNote[];
}

/** Subjective rating after a workout or cardio session, each 1–10. */
export interface TrainingRating {
  feeling: number | null;
  energy: number | null;
  effort: number | null;
  rating_note: string | null;
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
  feeling: number | null;
  energy: number | null;
  effort: number | null;
  rating_note: string | null;
  machine_minutes: number | null;
  machine_level: number | null;
  machine_floors: number | null;
  machine_steps: number | null;
  machine_kcal: number | null;
  machine_photo_path: string | null;
  incline_pct: number | null;
  speed_kmh: number | null;
  template_id: string | null;
}

/** Repeatable cardio, e.g. "Incline walk 30 min, 6 %, 5 km/h". auto_days: ISO weekdays (1 = Monday). */
export interface CardioTemplate {
  id: string;
  name: string;
  activity: CardioActivity;
  duration_min: number;
  distance_km: number | null;
  avg_hr: number | null;
  kcal: number | null;
  incline_pct: number | null;
  speed_kmh: number | null;
  effort: number | null;
  auto_days: number[];
  auto_from: string;
}

/** How one exercise felt in a workout. */
export interface ExerciseNote {
  exercise_id: string;
  feeling: number | null;
  note: string | null;
}

export const SKIN_AREAS = ["forehead", "nose", "cheeks", "chin", "jaw", "neck", "chest", "back", "other"] as const;
export type SkinArea = (typeof SKIN_AREAS)[number];

export interface SkinLog {
  entry_date: string;
  score: number;
  areas: SkinArea[];
  note: string | null;
  source: "manual" | "claude";
}

/** Tags for day notes (journal); same list as the check in the day_notes migration. */
export const DAY_TAGS = ["sick", "pain", "poor_sleep", "stress", "travel", "alcohol", "eating_out"] as const;
export type DayTag = (typeof DAY_TAGS)[number];

export interface DayNote {
  entry_date: string;
  note: string | null;
  tags: DayTag[];
  source: "manual" | "claude";
}

export const MEDICATION_KINDS = ["medication", "supplement", "skincare"] as const;
export type MedicationKind = (typeof MEDICATION_KINDS)[number];

export interface Medication {
  id: string;
  name: string;
  dose: string | null;
  kind: MedicationKind;
  position: number;
  /** Nutrients of ONE dose (null = no nutrients, e.g. a medication). */
  nutrients: NutrientMap | null;
  /** Weight of one dose in g (used for the diary entry). */
  dose_g: number | null;
  auto_days: number[];
  auto_from: string;
  /** Every N days from schedule_start instead of weekdays (null = weekdays). See lib/medication-schedule. */
  every_days: number | null;
  /** Cycle: N days on, then N days off, from schedule_start (null = no cycle). */
  cycle_on_days: number | null;
  cycle_off_days: number | null;
  schedule_start: string | null;
}

export interface MedicationLog {
  id: string;
  medication_id: string | null;
  name: string;
  dose: string | null;
  entry_date: string;
  taken_at: string;
  source: "manual" | "claude";
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
  /** Garmin: active calories and resting energy (BMR) of the day. */
  active_kcal: number | null;
  bmr_kcal: number | null;
  source: "manual" | "garmin" | "claude";
}
