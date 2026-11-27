/**
 * Warning when the weight falls faster than is good for keeping muscle. Pure (tested).
 *
 * Why: in a deficit, losing more than about 1 % of body weight per week raises
 * the share of lean mass lost (Helms et al. 2014; Garthe et al. 2011: 0.7 %/week
 * kept strength and lean mass better than 1.4 %/week). Losing much faster than
 * the planned pace is an earlier hint that the deficit is bigger than intended.
 *
 * To avoid false alarms (water loss in the first days of a diet, single light
 * days) the warning needs the 4-week trend over at least 14 days AND the last
 * 2 weeks to still be fast, so a fast start that has already slowed down stops warning.
 */
import { weightRate, type Rate } from "./forecast";
import { KCAL_PER_KG } from "./goals";
import type { WeightPoint } from "./weight";

/** Losing at least this share of body weight per week is "too fast" whatever the plan. */
export const HIGH_PCT_PER_WEEK = 1.0;
/** At least this many times the planned loss counts as "faster than planned". */
export const FASTER_RATIO = 1.5;
/** ...and at least this much faster in absolute terms (kg/week), so tiny plans don't trigger it. */
export const FASTER_MIN_KG = 0.2;
/** Trend must span at least this many days. */
export const MIN_SPAN_DAYS = 14;
/** The safe pace Sigma points to when the plan itself is too fast (% per week). */
export const SAFE_PCT_PER_WEEK = 0.7;

export interface FastLoss {
  /** "high": over 1 % per week (muscle at risk); "faster": clearly faster than planned. */
  level: "high" | "faster";
  /** Measured trend (kg/week, negative). */
  kgPerWeek: number;
  /** Trend as % of body weight per week (positive). */
  pctPerWeek: number;
  /** Planned pace (kg/week, negative) or null without a loss plan. */
  plannedKgPerWeek: number | null;
  /** About how many kcal per day more would bring the pace back to the target (rounded to 50). */
  extraKcal: number;
}

export interface FastLossInput {
  points: WeightPoint[];
  today: string;
  /** 4-week trend (from the coach), null without enough weigh-ins. */
  rate: Rate | null;
  /** Smoothed current weight. */
  currentKg: number | null;
  /** Signed planned pace (kg/week). */
  wantedKgPerWeek: number | null;
}

function isFast(kgPerWeek: number, currentKg: number, wanted: number | null): "high" | "faster" | null {
  if (kgPerWeek >= 0) return null;
  const pct = (-kgPerWeek / currentKg) * 100;
  if (pct >= HIGH_PCT_PER_WEEK) return "high";
  if (wanted !== null && wanted < 0 && kgPerWeek / wanted >= FASTER_RATIO && wanted - kgPerWeek >= FASTER_MIN_KG) return "faster";
  return null;
}

export function fastLoss({ points, today, rate, currentKg, wantedKgPerWeek }: FastLossInput): FastLoss | null {
  if (!rate || !currentKg || currentKg <= 0 || rate.spanDays < MIN_SPAN_DAYS) return null;
  const level = isFast(rate.kgPerWeek, currentKg, wantedKgPerWeek);
  if (!level) return null;
  // the last two weeks must still be fast (if there is enough data to tell)
  const recent = weightRate(points, today, 14);
  if (recent && !isFast(recent.kgPerWeek, currentKg, wantedKgPerWeek)) return null;

  const safe = (-currentKg * SAFE_PCT_PER_WEEK) / 100;
  // aim for the plan if it is a sensible loss, else the safe pace
  const target = wantedKgPerWeek !== null && wantedKgPerWeek < 0 && wantedKgPerWeek >= safe ? wantedKgPerWeek : safe;
  const extra = Math.max(0, ((target - rate.kgPerWeek) * KCAL_PER_KG) / 7);
  return {
    level,
    kgPerWeek: Math.round(rate.kgPerWeek * 100) / 100,
    pctPerWeek: Math.round((-rate.kgPerWeek / currentKg) * 1000) / 10,
    plannedKgPerWeek: wantedKgPerWeek !== null && wantedKgPerWeek < 0 ? wantedKgPerWeek : null,
    extraKcal: Math.round(extra / 50) * 50,
  };
}
