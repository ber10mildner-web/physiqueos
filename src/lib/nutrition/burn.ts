/**
 * Total energy burned on a day, as a transparent sum of parts. Pure (tested).
 *
 * With Garmin data (active calories from the watch):
 *   Grundumsatz (Garmin's BMR, else Mifflin–St Jeor) + Garmin active kcal
 *   + strength training logged in Sigma (the watch usually does not record it).
 *   Cardio logged in Sigma is NOT added: the watch already counted it via
 *   steps / heart rate, so it would be counted twice.
 *
 * Without Garmin:
 *   Grundumsatz (Mifflin–St Jeor)
 *   + everyday steps  (net ≈ 0.0004 kcal per kg per step, i.e. ~0.5 kcal/kg/km
 *     at ~1300 steps/km; steps made during walking/running cardio are left out)
 *   + cardio (Sigma's estimate minus the resting share already in the BMR)
 *   + strength training (MET 4.5 → net 3.5 kcal/kg/h; Compendium of Physical
 *     Activities 2024, resistance training 3.5–6 MET)
 *   + thermic effect of food (10 % of what was eaten).
 *
 * Every number is an estimate (typically ±10–15 %); the weight trend is the
 * real feedback.
 */
import { bmrMifflinStJeor, ageFromBirthDate, type Sex } from "./energy";

export const STEP_KCAL_PER_KG = 0.0004;
export const STEPS_PER_MIN_ON_FOOT = 110;
export const GYM_MET = 4.5;
export const TEF_SHARE = 0.1;
const ON_FOOT = new Set(["walk", "run", "hike", "stairs"]);

export type BurnPart = "bmr" | "garmin_active" | "steps" | "cardio" | "gym" | "tef";

export interface BurnInput {
  date: string;
  profile: { sex: Sex | null; birth_date: string | null; height_cm: number | null } | null;
  weightKg: number | null;
  intakeKcal: number;
  health: { steps: number | null; active_kcal: number | null; bmr_kcal: number | null } | null;
  /** Cardio sessions of the day with Sigma's kcal estimate (gross). */
  cardio: { activity: string; duration_min: number; kcal: number | null }[];
  /** Durations (min) of strength workouts logged in Sigma; null = no end time. */
  gymMinutes: (number | null)[];
  /** Share of the day that has passed (for "so far" today); 1 for past days. */
  dayFraction?: number;
}

export interface Burn {
  total: number;
  parts: { key: BurnPart; kcal: number }[];
  basis: "garmin" | "estimate";
  /** Strength workouts without a duration (not counted). */
  gymWithoutDuration: number;
}

export function estimateBmr(profile: BurnInput["profile"], weightKg: number | null, date: string): number | null {
  if (!profile?.sex || !profile.birth_date || !profile.height_cm || !weightKg) return null;
  const [y, m, d] = date.split("-").map(Number);
  const age = ageFromBirthDate(profile.birth_date, new Date(y, m - 1, d));
  if (age <= 0) return null;
  return bmrMifflinStJeor({ sex: profile.sex, ageYears: age, heightCm: profile.height_cm, weightKg });
}

/** null when neither Garmin nor the profile (sex, birth date, height, weight) allow an estimate. */
export function dailyBurn(input: BurnInput): Burn | null {
  const kg = input.weightKg;
  const garminActive = input.health?.active_kcal ?? null;
  const fullBmr = input.health?.bmr_kcal ?? estimateBmr(input.profile, kg, input.date);
  if (fullBmr === null) return null;
  const bmr = fullBmr * Math.min(1, Math.max(0, input.dayFraction ?? 1));

  const gymDone = input.gymMinutes.filter((m): m is number => m !== null && m > 0);
  const gym = kg ? gymDone.reduce((s, min) => s + (GYM_MET - 1) * kg * (min / 60), 0) : 0;
  const gymWithoutDuration = input.gymMinutes.length - gymDone.length;
  const parts: Burn["parts"] = [{ key: "bmr", kcal: bmr }];

  if (garminActive !== null) {
    parts.push({ key: "garmin_active", kcal: garminActive });
    if (gym > 0) parts.push({ key: "gym", kcal: gym });
    return finish(parts, "garmin", gymWithoutDuration);
  }

  const bmrPerMin = fullBmr / 1440;
  const cardio = input.cardio.reduce((s, c) => s + Math.max(0, (c.kcal ?? 0) - bmrPerMin * c.duration_min), 0);
  const onFootSteps = input.cardio.filter((c) => ON_FOOT.has(c.activity)).reduce((s, c) => s + c.duration_min * STEPS_PER_MIN_ON_FOOT, 0);
  const steps = kg && input.health?.steps ? Math.max(0, input.health.steps - onFootSteps) * STEP_KCAL_PER_KG * kg : 0;
  if (steps > 0) parts.push({ key: "steps", kcal: steps });
  if (cardio > 0) parts.push({ key: "cardio", kcal: cardio });
  if (gym > 0) parts.push({ key: "gym", kcal: gym });
  if (input.intakeKcal > 0) parts.push({ key: "tef", kcal: input.intakeKcal * TEF_SHARE });
  return finish(parts, "estimate", gymWithoutDuration);
}

function finish(parts: Burn["parts"], basis: Burn["basis"], gymWithoutDuration: number): Burn {
  const rounded = parts.map((p) => ({ key: p.key, kcal: Math.round(p.kcal) }));
  return { total: rounded.reduce((s, p) => s + p.kcal, 0), parts: rounded, basis, gymWithoutDuration };
}
