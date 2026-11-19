/**
 * Energy requirement and target calculation.
 *
 * BMR: Mifflin–St Jeor (1990), the equation recommended by the Academy of
 * Nutrition and Dietetics for healthy adults.
 *   men:   10·kg + 6.25·cm − 5·age + 5
 *   women: 10·kg + 6.25·cm − 5·age − 161
 * TDEE = BMR × PAL (physical activity level).
 *
 * These are estimates (typically ±10 %). The UI always lets the user override
 * every target; the weekly weight trend is the real feedback signal.
 */

export type Sex = "male" | "female";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type Phase = "cut" | "maintenance" | "lean_bulk" | "custom";

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

/** Energy adjustment relative to maintenance. */
export const PHASE_ADJUSTMENT: Record<Exclude<Phase, "custom">, number> = {
  cut: -0.2,
  maintenance: 0,
  lean_bulk: 0.1,
};

/** Protein in g per kg bodyweight per phase (ISSN position stand range 1.6–2.2 g/kg). */
export const PROTEIN_PER_KG: Record<Exclude<Phase, "custom">, number> = {
  cut: 2.2,
  maintenance: 1.8,
  lean_bulk: 1.8,
};

/** Share of energy from fat. */
export const FAT_ENERGY_SHARE = 0.25;

/** Fibre: 14 g per 1000 kcal (Dietary Guidelines for Americans), at least 30 g (DGE). */
export const FIBER_PER_1000_KCAL = 14;
export const FIBER_MIN_G = 30;

export interface ProfileInput {
  sex: Sex;
  ageYears: number;
  heightCm: number;
  weightKg: number;
  activity: ActivityLevel;
}

export function ageFromBirthDate(birthDate: string, today: Date = new Date()): number {
  const [y, m, d] = birthDate.split("-").map(Number);
  let age = today.getFullYear() - y;
  const beforeBirthday = today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d);
  if (beforeBirthday) age -= 1;
  return age;
}

export function bmrMifflinStJeor(p: Pick<ProfileInput, "sex" | "ageYears" | "heightCm" | "weightKg">): number {
  if (p.weightKg <= 0 || p.heightCm <= 0 || p.ageYears <= 0) throw new RangeError("invalid profile values");
  const base = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.ageYears;
  return p.sex === "male" ? base + 5 : base - 161;
}

export function tdee(p: ProfileInput): number {
  return bmrMifflinStJeor(p) * ACTIVITY_FACTORS[p.activity];
}

export interface Targets {
  energy_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
}

const roundTo = (v: number, step: number) => Math.round(v / step) * step;

/** Split a calorie target into macros. Carbs get the remainder (never negative). */
export function macrosForCalories(energyKcal: number, weightKg: number, phase: Exclude<Phase, "custom">): Targets {
  const protein = roundTo(weightKg * PROTEIN_PER_KG[phase], 5);
  const fat = roundTo((energyKcal * FAT_ENERGY_SHARE) / 9, 5);
  const carbs = Math.max(0, roundTo((energyKcal - protein * 4 - fat * 9) / 4, 5));
  const fiber = Math.max(FIBER_MIN_G, Math.round((energyKcal / 1000) * FIBER_PER_1000_KCAL));
  return { energy_kcal: energyKcal, protein_g: protein, carbs_g: carbs, fat_g: fat, fiber_g: fiber };
}

export interface Suggestion {
  bmr: number;
  tdee: number;
  targets: Targets;
}

export function suggestTargets(p: ProfileInput, phase: Exclude<Phase, "custom">): Suggestion {
  const b = bmrMifflinStJeor(p);
  const t = b * ACTIVITY_FACTORS[p.activity];
  const energy = roundTo(t * (1 + PHASE_ADJUSTMENT[phase]), 10);
  return { bmr: Math.round(b), tdee: Math.round(t), targets: macrosForCalories(energy, p.weightKg, phase) };
}

/** kcal implied by macro targets (useful to show when the user edits macros manually). */
export function caloriesFromMacroTargets(t: Pick<Targets, "protein_g" | "carbs_g" | "fat_g">): number {
  return t.protein_g * 4 + t.carbs_g * 4 + t.fat_g * 9;
}
