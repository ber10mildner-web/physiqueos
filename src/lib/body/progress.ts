/**
 * Progress beyond the scale: waist, strength, protein and photos, judged
 * against the body goal. Pure (tested). Used by the weekly check-in.
 *
 * Why: in a cut the scale alone cannot tell fat from muscle. A falling waist
 * with stable strength means fat is going and muscle stays; falling strength
 * in a deficit is the earliest warning sign of muscle loss (or poor recovery).
 */
import { dayNumber } from "./weight";
import { addDays } from "@/lib/dates";
import { estimate1RM } from "@/lib/training/calc";
import type { GoalType } from "./goals";

export interface WaistPoint {
  date: string;
  waist_cm: number;
}

export interface WaistTrend {
  latest: number;
  latestDate: string;
  /** Change against the measurement used for comparison (cm). */
  change: number;
  /** cm per week. */
  perWeek: number;
  days: number;
}

/** Look back this far for a comparison measurement. */
export const WAIST_WINDOW_DAYS = 35;
/** Comparison measurements must be at least this far apart. */
export const WAIST_MIN_DAYS = 7;

/** Latest waist vs. the oldest measurement within the last 5 weeks (at least 7 days earlier). */
export function waistTrend(points: WaistPoint[], today: string): WaistTrend | null {
  const sorted = [...points].filter((p) => p.date <= today).sort((a, b) => (a.date < b.date ? -1 : 1));
  const latest = sorted.at(-1);
  if (!latest) return null;
  const from = addDays(latest.date, -WAIST_WINDOW_DAYS);
  const base = sorted.find((p) => p.date >= from && dayNumber(latest.date) - dayNumber(p.date) >= WAIST_MIN_DAYS);
  if (!base) return { latest: latest.waist_cm, latestDate: latest.date, change: 0, perWeek: 0, days: 0 };
  const days = dayNumber(latest.date) - dayNumber(base.date);
  const change = Math.round((latest.waist_cm - base.waist_cm) * 10) / 10;
  return { latest: latest.waist_cm, latestDate: latest.date, change, perWeek: Math.round((change / days) * 7 * 100) / 100, days };
}

export interface StrengthSet {
  exercise_id: string;
  date: string;
  reps: number;
  weight_kg: number;
  is_warmup: boolean;
}

export interface StrengthTrend {
  /** Median change of the best estimated 1RM per exercise (%). */
  changePct: number;
  /** Exercises trained in both periods. */
  exercises: number;
  up: number;
  down: number;
}

/** Recent period (days, ending today) and the period before it for comparison. */
export const STRENGTH_RECENT_DAYS = 14;
export const STRENGTH_BEFORE_DAYS = 28;
/** Within ±this % an exercise counts as "held". */
export const STRENGTH_HELD_PCT = 2.5;

/**
 * Best estimated 1RM per exercise in the last 2 weeks vs. the 4 weeks before.
 * Only exercises trained in both periods count; at least 2 are needed.
 */
export function strengthTrend(sets: StrengthSet[], today: string): StrengthTrend | null {
  const recentFrom = addDays(today, -(STRENGTH_RECENT_DAYS - 1));
  const beforeFrom = addDays(recentFrom, -STRENGTH_BEFORE_DAYS);
  const best = new Map<string, { recent: number; before: number }>();
  for (const s of sets) {
    if (s.is_warmup || s.date > today || s.date < beforeFrom) continue;
    const e = estimate1RM(s.weight_kg, s.reps);
    if (e === null) continue;
    const b = best.get(s.exercise_id) ?? { recent: 0, before: 0 };
    if (s.date >= recentFrom) b.recent = Math.max(b.recent, e);
    else b.before = Math.max(b.before, e);
    best.set(s.exercise_id, b);
  }
  const changes = [...best.values()].filter((b) => b.recent > 0 && b.before > 0).map((b) => ((b.recent - b.before) / b.before) * 100);
  if (changes.length < 2) return null;
  const sorted = [...changes].sort((a, b) => a - b);
  const mid = sorted.length / 2;
  const median = sorted.length % 2 ? sorted[Math.floor(mid)] : (sorted[mid - 1] + sorted[mid]) / 2;
  return {
    changePct: Math.round(median * 10) / 10,
    exercises: changes.length,
    up: changes.filter((c) => c > STRENGTH_HELD_PCT).length,
    down: changes.filter((c) => c < -STRENGTH_HELD_PCT).length,
  };
}

export type SignalStatus = "good" | "warn" | "info";
export type SignalKey = "weight" | "waist" | "strength" | "protein" | "photo";

export interface Signal {
  key: SignalKey;
  status: SignalStatus;
  /** Message id, looked up in the dictionary (checkin.msg.<id>). */
  msg: string;
  values: Record<string, number | string>;
}

export interface ProgressInput {
  goal: GoalType | null;
  currentKg: number | null;
  /** Measured weight trend (kg/week), null without enough weigh-ins. */
  rateKgWeek: number | null;
  /** Signed pace Sigma aims for (kg/week). */
  aimKgWeek: number | null;
  waist: WaistTrend | null;
  strength: StrengthTrend | null;
  /** Average protein of the last 7 logged days and the target (g). */
  protein: { avg: number; target: number; days: number } | null;
  lastPhotoDate: string | null;
  today: string;
}

export interface Progress {
  signals: Signal[];
  /** Overall verdict id (checkin.verdict.<id>). */
  verdict: "on_track" | "too_fast" | "too_slow" | "muscle_risk" | "needs_data" | "mixed";
}

/** How the week went, measured against the goal. */
export function assessProgress(p: ProgressInput): Progress {
  const signals: Signal[] = [];
  // without a goal type the direction comes from the goal weight
  const goal: GoalType = p.goal ?? (p.aimKgWeek ? (p.aimKgWeek < 0 ? "fat_loss" : "muscle_gain") : "maintain");
  const losing = goal === "fat_loss" || goal === "recomp";

  // weight trend vs. the planned pace
  if (p.rateKgWeek === null) signals.push({ key: "weight", status: "info", msg: "weight_none", values: {} });
  else {
    const rate = p.rateKgWeek;
    const aim = p.aimKgWeek ?? 0;
    const pct = p.currentKg ? Math.abs(rate / p.currentKg) * 100 : 0;
    if (goal === "recomp" || goal === "maintain" || aim === 0) {
      // stable is the plan; more than ~0.5 % per week either way is a drift
      const drift = pct > 0.5;
      signals.push({ key: "weight", status: drift ? "warn" : "good", msg: drift ? (rate < 0 ? "weight_drift_down" : "weight_drift_up") : "weight_stable", values: { rate } });
    } else {
      const ratio = rate / aim; // 1 = exactly on plan
      const msg = ratio > 1.5 ? "weight_fast" : ratio < 0.5 ? "weight_slow" : "weight_on_plan";
      signals.push({ key: "weight", status: msg === "weight_on_plan" ? "good" : "warn", msg, values: { rate, aim } });
    }
  }

  // waist
  if (!p.waist) signals.push({ key: "waist", status: "info", msg: "waist_none", values: {} });
  else if (p.waist.days === 0) signals.push({ key: "waist", status: "info", msg: "waist_first", values: { cm: p.waist.latest } });
  else {
    const c = p.waist.change;
    let status: SignalStatus = "info";
    let msg = "waist_same";
    if (c <= -0.5) {
      status = losing || goal === "maintain" ? "good" : "info";
      msg = "waist_down";
    } else if (c >= 0.5) {
      // during a gain a slowly growing waist is expected; fast growth means too much fat
      status = goal === "muscle_gain" && p.waist.perWeek <= 0.25 ? "info" : "warn";
      msg = "waist_up";
    } else status = goal === "fat_loss" ? "info" : "good";
    signals.push({ key: "waist", status, msg, values: { change: c, days: p.waist.days, cm: p.waist.latest } });
  }

  // strength
  if (!p.strength) signals.push({ key: "strength", status: "info", msg: "strength_none", values: {} });
  else {
    const c = p.strength.changePct;
    const held = Math.abs(c) <= STRENGTH_HELD_PCT;
    let status: SignalStatus;
    let msg: string;
    if (c < -STRENGTH_HELD_PCT) {
      status = "warn";
      msg = losing ? "strength_down_cut" : "strength_down";
    } else if (held) {
      status = goal === "muscle_gain" ? "info" : "good";
      msg = "strength_held";
    } else {
      status = "good";
      msg = "strength_up";
    }
    signals.push({ key: "strength", status, msg, values: { pct: c, n: p.strength.exercises } });
  }

  // protein
  if (p.protein && p.protein.days >= 3 && p.protein.target > 0) {
    const share = p.protein.avg / p.protein.target;
    signals.push({ key: "protein", status: share >= 0.9 ? "good" : "warn", msg: share >= 0.9 ? "protein_ok" : "protein_low", values: { avg: Math.round(p.protein.avg), target: Math.round(p.protein.target) } });
  }

  // photo
  const photoAge = p.lastPhotoDate ? dayNumber(p.today) - dayNumber(p.lastPhotoDate) : null;
  signals.push(
    photoAge !== null && photoAge <= 14
      ? { key: "photo", status: "good", msg: "photo_recent", values: { days: photoAge } }
      : { key: "photo", status: "info", msg: photoAge === null ? "photo_none" : "photo_due", values: { days: photoAge ?? 0 } },
  );

  const by = (k: SignalKey) => signals.find((s) => s.key === k)!;
  const weight = by("weight");
  const strength = by("strength");
  let verdict: Progress["verdict"];
  if (losing && strength.msg === "strength_down_cut" && (weight.msg === "weight_fast" || weight.msg === "weight_on_plan")) verdict = "muscle_risk";
  else if (weight.msg === "weight_fast") verdict = "too_fast";
  else if (weight.msg === "weight_slow") verdict = "too_slow";
  else if (weight.status === "info" && strength.status === "info" && by("waist").status === "info") verdict = "needs_data";
  else if (signals.some((s) => s.status === "warn")) verdict = "mixed";
  else verdict = "on_track";
  return { signals, verdict };
}
