/** Nutrition goals can have different targets on certain weekdays (e.g. cardio days). */

export interface GoalTargets {
  energy_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
}

export interface GoalRow extends GoalTargets {
  id: string;
  valid_from: string;
  phase: string;
  alt_days: number[] | null;
  alt_energy_kcal: number | null;
  alt_protein_g: number | null;
  alt_carbs_g: number | null;
  alt_fat_g: number | null;
  alt_fiber_g: number | null;
}

/** ISO weekday of a YYYY-MM-DD date: 1 = Monday … 7 = Sunday. */
export function isoWeekday(date: string): number {
  return ((new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7) + 1;
}

export function altTargets(row: GoalRow): GoalTargets | null {
  if (!row.alt_days?.length || row.alt_energy_kcal === null) return null;
  return {
    energy_kcal: row.alt_energy_kcal,
    protein_g: row.alt_protein_g ?? row.protein_g,
    carbs_g: row.alt_carbs_g ?? row.carbs_g,
    fat_g: row.alt_fat_g ?? row.fat_g,
    fiber_g: row.alt_fiber_g ?? row.fiber_g,
  };
}

/** Targets that apply on `date`, and whether it is one of the special weekdays. */
export function targetsOn(row: GoalRow, date: string): GoalTargets & { alt_day: boolean } {
  const alt = altTargets(row);
  if (alt && row.alt_days!.includes(isoWeekday(date))) return { ...alt, alt_day: true };
  return { energy_kcal: row.energy_kcal, protein_g: row.protein_g, carbs_g: row.carbs_g, fat_g: row.fat_g, fiber_g: row.fiber_g, alt_day: false };
}

/**
 * Macros for a different calorie target, keeping protein, fat and fibre from the
 * base goal and putting the difference into carbohydrates (4 kcal/g).
 */
export function shiftCarbs(base: GoalTargets, kcal: number): GoalTargets {
  return { ...base, energy_kcal: kcal, carbs_g: Math.max(0, Math.round(base.carbs_g + (kcal - base.energy_kcal) / 4)) };
}
