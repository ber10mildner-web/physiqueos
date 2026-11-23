/**
 * Adaptive energy target ("adaptive TDEE"). Pure (tested).
 *
 * Real maintenance = average eaten kcal − stored energy, where the stored energy
 * comes from the weight trend (≈ 7700 kcal per kg of body mass, the common
 * estimate for mixed fat/lean tissue). This is far more personal than any
 * formula, but only as good as the logging: days that were clearly not fully
 * logged are left out, and the result is always a suggestion the user confirms.
 */
import { weightRate, wantedRate, type Rate } from "@/lib/body/forecast";
import type { WeightPoint } from "@/lib/body/weight";
import { addDays } from "@/lib/dates";
import type { GoalTargets } from "./goal-days";

export const KCAL_PER_KG = 7700;
/** Days looked at (ending yesterday, so today's half-logged day is never used). */
export const WINDOW_DAYS = 28;
/** Fully logged days needed. */
export const MIN_LOGGED_DAYS = 14;
/** A day below this share of its target counts as "probably not fully logged". */
export const PARTIAL_SHARE = 0.5;
/** Suggestions smaller than this are not worth a change. */
export const MIN_CHANGE_KCAL = 100;
/** Largest single change, so the target moves in steps. */
export const MAX_CHANGE_KCAL = 400;
/** Default pace per phase in % of body weight per week, when no goal weight is set. */
export const PHASE_PACE_PCT: Record<string, number | null> = { cut: -0.5, maintenance: 0, lean_bulk: 0.25, custom: null };

export interface DayIntake {
  date: string;
  kcal: number;
  /** The day's target, to spot half-logged days. */
  target: number | null;
}

export interface TdeeEstimate {
  tdee: number;
  avgIntake: number;
  loggedDays: number;
  skippedDays: number;
  rate: Rate;
  confidence: "low" | "medium" | "high";
  from: string;
  to: string;
}

export type TdeeResult = { ok: true; estimate: TdeeEstimate } | { ok: false; reason: "few_days" | "few_weights"; loggedDays: number; weighIns: number };

/** @param today the user's today; the window ends yesterday. */
export function estimateTdee(days: DayIntake[], weights: WeightPoint[], today: string): TdeeResult {
  const to = addDays(today, -1);
  const from = addDays(to, -(WINDOW_DAYS - 1));
  const inWindow = days.filter((d) => d.date >= from && d.date <= to && d.kcal > 0);
  const full = inWindow.filter((d) => !(d.target && d.kcal < d.target * PARTIAL_SHARE) && d.kcal >= 800);
  const rate = weightRate(weights, to, WINDOW_DAYS);
  const weighIns = weights.filter((w) => w.date >= from && w.date <= to).length;
  if (full.length < MIN_LOGGED_DAYS) return { ok: false, reason: "few_days", loggedDays: full.length, weighIns };
  if (!rate) return { ok: false, reason: "few_weights", loggedDays: full.length, weighIns };
  const avgIntake = full.reduce((a, d) => a + d.kcal, 0) / full.length;
  const stored = (rate.kgPerWeek / 7) * KCAL_PER_KG;
  const tdee = avgIntake - stored;
  const confidence = full.length >= 24 && rate.samples >= 14 ? "high" : full.length >= 18 && rate.samples >= 8 ? "medium" : "low";
  return {
    ok: true,
    estimate: { tdee: Math.round(tdee), avgIntake: Math.round(avgIntake), loggedDays: full.length, skippedDays: inWindow.length - full.length, rate, confidence, from, to },
  };
}

/** Average daily target over a week, counting the special weekdays. */
export function weeklyAverageTarget(base: GoalTargets, alt: GoalTargets | null, altDays: number[]): number {
  if (!alt || !altDays.length) return base.energy_kcal;
  const n = new Set(altDays).size;
  return (base.energy_kcal * (7 - n) + alt.energy_kcal * n) / 7;
}

export interface TargetSuggestion {
  /** Signed pace the suggestion aims for (kg/week). */
  aimKgPerWeek: number;
  /** Where the pace comes from. */
  aimSource: "goal_weight" | "phase";
  /** Average daily kcal the user should eat. */
  idealKcal: number;
  /** Current weekly average target. */
  currentKcal: number;
  /** Change applied to every day (capped), rounded to 10. */
  change: number;
  base: GoalTargets;
  alt: GoalTargets | null;
}

const round10 = (v: number) => Math.round(v / 10) * 10;

/** Moves calories by `change`, through carbs first; fat takes over only if carbs would drop below 50 g. */
export function shiftTargets(t: GoalTargets, change: number): GoalTargets {
  const kcal = t.energy_kcal + change;
  let carbs = t.carbs_g + change / 4;
  let fat = t.fat_g;
  if (carbs < 50) {
    fat = Math.max(30, fat - ((50 - carbs) * 4) / 9);
    carbs = 50;
  }
  return { ...t, energy_kcal: kcal, carbs_g: Math.round(carbs), fat_g: Math.round(fat) };
}

/**
 * A new target from the measured TDEE and the wanted pace. Returns null when no
 * pace is known (phase "custom" without goal weight) or the change is too small.
 * @param floorKcal never suggest below this (e.g. the BMR).
 */
export function suggestTarget(input: {
  estimate: TdeeEstimate;
  currentWeight: number;
  goalWeightKg: number | null;
  paceKgWeek: number | null;
  phase: string;
  base: GoalTargets;
  alt: GoalTargets | null;
  altDays: number[];
  floorKcal: number;
}): TargetSuggestion | null {
  let aim = wantedRate(input.currentWeight, input.goalWeightKg, input.paceKgWeek);
  let aimSource: TargetSuggestion["aimSource"] = "goal_weight";
  if (aim === null) {
    const pct = PHASE_PACE_PCT[input.phase] ?? null;
    if (pct === null) return null;
    aim = (input.currentWeight * pct) / 100;
    aimSource = "phase";
  }
  const ideal = Math.max(input.floorKcal, input.estimate.tdee + (aim / 7) * KCAL_PER_KG);
  const current = weeklyAverageTarget(input.base, input.alt, input.altDays);
  const raw = ideal - current;
  if (Math.abs(raw) < MIN_CHANGE_KCAL) return null;
  const change = round10(Math.sign(raw) * Math.min(Math.abs(raw), MAX_CHANGE_KCAL));
  return {
    aimKgPerWeek: Math.round(aim * 100) / 100,
    aimSource,
    idealKcal: round10(ideal),
    currentKcal: Math.round(current),
    change,
    base: shiftTargets(input.base, change),
    alt: input.alt ? shiftTargets(input.alt, change) : null,
  };
}
