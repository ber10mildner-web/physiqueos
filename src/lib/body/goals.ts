/**
 * Body goals beyond a goal weight. Pure (tested).
 *
 * The goal type decides the pace Sigma aims for and how much protein it
 * suggests; the training level fine-tunes the pace. Sources for the numbers:
 * - Fat loss while keeping muscle: about 0.5 % of body weight per week
 *   (Helms et al. 2014, "slower is better" for lean, trained people), protein
 *   about 2.2 g/kg (ISSN position stand 2017: 1.6–2.2 g/kg, higher end in a deficit).
 * - Recomp: a small deficit (≈ 0.2 % per week) with high protein; works best for
 *   beginners and people returning to training (Barakat et al. 2020).
 * - Muscle gain: a small surplus, slower the more experienced you are
 *   (beginner ≈ 1–1.5 %, intermediate ≈ 0.5–1 %, advanced ≈ 0.25–0.5 % per month).
 * All of these are starting points; the weight trend and the adaptive calorie
 * check correct them with real data.
 */
import { bmrMifflinStJeor, macrosForCalories, ACTIVITY_FACTORS, type Phase, type ProfileInput, type Suggestion } from "@/lib/nutrition/energy";

/** Energy in one kg of body mass change (mixed fat and lean tissue, common estimate). */
export const KCAL_PER_KG = 7700;

export const GOAL_TYPES = ["fat_loss", "recomp", "muscle_gain", "maintain"] as const;
export type GoalType = (typeof GOAL_TYPES)[number];
export const TRAINING_LEVELS = ["beginner", "intermediate", "advanced"] as const;
export type TrainingLevel = (typeof TRAINING_LEVELS)[number];

/** Within this distance of the goal weight it counts as reached. */
const REACHED_KG = 0.3;

/** Default pace in % of body weight per week (signed). */
export function defaultPacePct(goal: GoalType, level: TrainingLevel | null): number {
  const l = level ?? "intermediate";
  switch (goal) {
    case "fat_loss":
      return l === "advanced" ? -0.4 : -0.5;
    case "recomp":
      return -0.2;
    case "muscle_gain":
      return l === "beginner" ? 0.3 : l === "intermediate" ? 0.2 : 0.1;
    case "maintain":
      return 0;
  }
}

/** Protein in g per kg body weight. */
export function proteinPerKg(goal: GoalType): number {
  return goal === "fat_loss" || goal === "recomp" ? 2.2 : 1.8;
}

/** The stored nutrition phase that matches a goal (same protein factor). */
export function phaseForGoal(goal: GoalType): Exclude<Phase, "custom"> {
  return goal === "fat_loss" || goal === "recomp" ? "cut" : goal === "muscle_gain" ? "lean_bulk" : "maintenance";
}

/** Whether the user can choose a pace for this goal (recomp and maintain have a fixed one). */
export const hasPace = (goal: GoalType | null): boolean => goal === "fat_loss" || goal === "muscle_gain";

/**
 * The signed pace (kg/week) Sigma aims for with a goal type. A chosen pace
 * overrides the default; a goal weight acts as a stop: once reached the aim is 0.
 */
export function goalAim(input: { goal: GoalType; level: TrainingLevel | null; currentKg: number; goalWeightKg: number | null; paceKgWeek: number | null }): number {
  const { goal, level, currentKg, goalWeightKg, paceKgWeek } = input;
  if (goal === "maintain") return 0;
  const def = (currentKg * defaultPacePct(goal, level)) / 100;
  if (goal === "recomp") return round2(def);
  const sign = goal === "fat_loss" ? -1 : 1;
  if (goalWeightKg !== null && sign * (goalWeightKg - currentKg) <= REACHED_KG) return 0;
  const pace = paceKgWeek !== null && paceKgWeek > 0 ? paceKgWeek : Math.abs(def);
  return round2(sign * pace);
}

const round2 = (v: number) => Math.round(v * 100) / 100 || 0;

/**
 * Formula-based start targets for a goal (before Sigma has enough logged days
 * to measure the real burn): maintenance from Mifflin–St Jeor × activity, plus
 * or minus the energy for the goal's pace.
 */
export function suggestTargetsForGoal(
  p: ProfileInput,
  goal: { goal: GoalType; level: TrainingLevel | null; goalWeightKg: number | null; paceKgWeek: number | null },
): Suggestion & { aimKgPerWeek: number } {
  const bmr = bmrMifflinStJeor(p);
  const tdee = bmr * ACTIVITY_FACTORS[p.activity];
  const aim = goalAim({ goal: goal.goal, level: goal.level, currentKg: p.weightKg, goalWeightKg: goal.goalWeightKg, paceKgWeek: goal.paceKgWeek });
  // never below the BMR: a deficit that deep costs muscle
  const energy = Math.round(Math.max(bmr, tdee + (aim / 7) * KCAL_PER_KG) / 10) * 10;
  return { bmr: Math.round(bmr), tdee: Math.round(tdee), targets: macrosForCalories(energy, p.weightKg, phaseForGoal(goal.goal)), aimKgPerWeek: aim };
}
