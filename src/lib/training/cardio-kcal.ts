/**
 * Best-estimate calories for a cardio session, combining up to three sources:
 *
 * 1. Work: what the machine display says you did (steps / floors / level × time
 *    on a stair climber), converted with the ACSM stepping equation and your
 *    body weight. Most objective when steps or floors are known.
 * 2. Heart rate: the watch's calories (Garmin), or the Keytel formula from the
 *    average heart rate if no watch value exists. Reflects how hard your body
 *    actually worked, but the watch does not know the machine level.
 * 3. Machine: the calorie number on the display. Machines usually assume a
 *    standard body weight and tend to overestimate, so it gets the lowest weight.
 *
 * The result is a weighted average of the available sources. All values are
 * gross calories (including what you would burn at rest), like Garmin reports.
 */

export interface KcalInput {
  activity: string;
  duration_min: number;
  avg_hr: number | null;
  /** Calories recorded on the session (Garmin or typed in). */
  kcal: number | null;
  source: string;
  machine_minutes: number | null;
  machine_level: number | null;
  machine_floors: number | null;
  machine_steps: number | null;
  machine_kcal: number | null;
}

export interface Person {
  weight_kg: number | null;
  age: number | null;
  sex: "male" | "female" | "other" | null;
}

export type KcalSourceKind = "work" | "watch" | "heart_rate" | "machine";

export interface KcalSource {
  kind: KcalSourceKind;
  kcal: number;
  weight: number;
  note?: "steps" | "floors" | "level";
}

export interface KcalEstimate {
  kcal: number;
  sources: KcalSource[];
}

/** Assumptions for stair climbers (StairMaster-style step mills). */
export const STEP_HEIGHT_M = 0.2;
export const STEPS_PER_FLOOR = 16;
/** Approximate step rate per level on a StairMaster StepMill: level 1 ≈ 24, level 20 ≈ 162 steps/min. */
export const stepsPerMinuteForLevel = (level: number) => 24 + (Math.max(1, Math.min(20, level)) - 1) * ((162 - 24) / 19);

const KCAL_PER_LITRE_O2 = 5;

/** ACSM stepping equation for continuous stair climbing (no stepping down). ml O2 / kg / min. */
export function stairVo2(stepsPerMin: number, stepHeightM = STEP_HEIGHT_M): number {
  return 0.2 * stepsPerMin + 1.8 * stepHeightM * stepsPerMin + 3.5;
}

export function stairWorkKcal(steps: number, minutes: number, weightKg: number): number {
  const rate = steps / minutes;
  return (stairVo2(rate) * weightKg * minutes * KCAL_PER_LITRE_O2) / 1000;
}

/** Keytel et al. (2005), kcal per minute from heart rate. Average of both formulas if sex is unknown. */
export function keytelKcalPerMin(hr: number, weightKg: number, age: number, sex: Person["sex"]): number {
  const male = (-55.0969 + 0.6309 * hr + 0.1988 * weightKg + 0.2017 * age) / 4.184;
  const female = (-20.4022 + 0.4472 * hr - 0.1263 * weightKg + 0.074 * age) / 4.184;
  const v = sex === "male" ? male : sex === "female" ? female : (male + female) / 2;
  return Math.max(0, v);
}

const isStairs = (activity: string) => activity === "stairs";

export function hasMachineData(s: KcalInput): boolean {
  return [s.machine_minutes, s.machine_level, s.machine_floors, s.machine_steps, s.machine_kcal].some((v) => v !== null);
}

export function estimateCardioKcal(s: KcalInput, p: Person): KcalEstimate | null {
  const minutes = s.machine_minutes ?? s.duration_min;
  const sources: KcalSource[] = [];

  if (isStairs(s.activity) && p.weight_kg && minutes > 0) {
    let steps: number | null = null;
    let note: KcalSource["note"];
    if (s.machine_steps) [steps, note] = [s.machine_steps, "steps"];
    else if (s.machine_floors) [steps, note] = [s.machine_floors * STEPS_PER_FLOOR, "floors"];
    else if (s.machine_level) [steps, note] = [stepsPerMinuteForLevel(s.machine_level) * minutes, "level"];
    if (steps !== null) sources.push({ kind: "work", kcal: stairWorkKcal(steps, minutes, p.weight_kg), weight: note === "level" ? 1.5 : 3, note });
  }

  if (s.kcal !== null && s.kcal > 0) sources.push({ kind: "watch", kcal: s.kcal, weight: 2 });
  else if (s.avg_hr && p.weight_kg && p.age) sources.push({ kind: "heart_rate", kcal: keytelKcalPerMin(s.avg_hr, p.weight_kg, p.age, p.sex) * s.duration_min, weight: 2 });

  if (s.machine_kcal !== null && s.machine_kcal > 0) sources.push({ kind: "machine", kcal: s.machine_kcal, weight: 1 });

  if (!sources.length) return null;
  const total = sources.reduce((a, x) => a + x.weight, 0);
  const kcal = sources.reduce((a, x) => a + x.kcal * x.weight, 0) / total;
  return { kcal: Math.round(kcal), sources: sources.map((x) => ({ ...x, kcal: Math.round(x.kcal) })) };
}

export function ageOn(birthDate: string | null, date: string): number | null {
  if (!birthDate) return null;
  const [by, bm, bd] = birthDate.split("-").map(Number);
  const [y, m, d] = date.split("-").map(Number);
  return y - by - (m < bm || (m === bm && d < bd) ? 1 : 0);
}
