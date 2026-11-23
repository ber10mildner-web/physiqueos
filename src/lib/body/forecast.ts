/**
 * Weight trend rate and goal forecast. Pure (tested).
 *
 * The rate is a least-squares line through the raw weigh-ins of the last few
 * weeks. Unlike "today minus 7 days ago" this uses every weigh-in, so single
 * salty or high-carb days barely move it.
 */
import { dayNumber, type WeightPoint } from "./weight";
import { addDays } from "@/lib/dates";

export interface Rate {
  /** kg per week (negative = losing). */
  kgPerWeek: number;
  /** Fitted weight on the last day of the window (smoothed "now"). */
  fittedNow: number;
  /** Weigh-ins used and the days they span. */
  samples: number;
  spanDays: number;
}

/** Minimum data before a rate is reported. */
export const MIN_SAMPLES = 5;
export const MIN_SPAN_DAYS = 10;

/**
 * Linear trend over the weigh-ins within `windowDays` before (and including) `endDate`.
 * Returns null when there are too few weigh-ins or they span too few days.
 */
export function weightRate(points: WeightPoint[], endDate: string, windowDays = 28): Rate | null {
  const end = dayNumber(endDate);
  const inWindow = points.filter((p) => {
    const d = dayNumber(p.date);
    return d <= end && end - d < windowDays && Number.isFinite(p.weight) && p.weight > 0;
  });
  if (inWindow.length < MIN_SAMPLES) return null;
  const xs = inWindow.map((p) => dayNumber(p.date) - end);
  const span = Math.max(...xs) - Math.min(...xs);
  if (span < MIN_SPAN_DAYS) return null;
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = inWindow.reduce((a, p) => a + p.weight, 0) / n;
  let sxy = 0;
  let sxx = 0;
  xs.forEach((x, i) => {
    sxy += (x - mx) * (inWindow[i].weight - my);
    sxx += (x - mx) ** 2;
  });
  const slope = sxx === 0 ? 0 : sxy / sxx;
  return { kgPerWeek: slope * 7, fittedNow: my - slope * mx, samples: n, spanDays: span };
}

/** Within this distance of the goal it counts as reached. */
export const REACHED_KG = 0.3;
/** Slower than this (kg/week) counts as "flat". */
export const FLAT_KG_PER_WEEK = 0.05;
/** Forecasts further out than this are not shown as a date. */
export const MAX_FORECAST_DAYS = 730;

export type Eta =
  | { kind: "reached" }
  | { kind: "on_track"; date: string; days: number; weeks: number }
  | { kind: "too_far" }
  | { kind: "flat" }
  | { kind: "wrong_direction" };

/** When `current` reaches `goal` at `kgPerWeek`, counted from `today`. */
export function goalEta(current: number, goal: number, kgPerWeek: number, today: string): Eta {
  const remaining = goal - current;
  if (Math.abs(remaining) <= REACHED_KG) return { kind: "reached" };
  if (Math.abs(kgPerWeek) < FLAT_KG_PER_WEEK) return { kind: "flat" };
  if (Math.sign(remaining) !== Math.sign(kgPerWeek)) return { kind: "wrong_direction" };
  const days = Math.ceil((remaining / kgPerWeek) * 7);
  if (days > MAX_FORECAST_DAYS) return { kind: "too_far" };
  return { kind: "on_track", date: addDays(today, days), days, weeks: Math.round((days / 7) * 10) / 10 };
}

/**
 * The pace the user wants, signed (negative = losing): from goal weight and the
 * chosen pace in kg/week. null without a goal weight or pace.
 */
export function wantedRate(current: number, goal: number | null, paceKgWeek: number | null): number | null {
  if (goal === null || paceKgWeek === null || paceKgWeek <= 0) return null;
  const remaining = goal - current;
  if (Math.abs(remaining) <= REACHED_KG) return 0;
  return Math.sign(remaining) * paceKgWeek;
}

/** Points for a dashed forecast line: from the fitted weight today towards the goal (at most `maxDays`). */
export function forecastLine(rate: Rate, goal: number | null, today: string, maxDays = 56): WeightPoint[] {
  if (Math.abs(rate.kgPerWeek) < FLAT_KG_PER_WEEK) return [];
  let days = maxDays;
  if (goal !== null) {
    const eta = goalEta(rate.fittedNow, goal, rate.kgPerWeek, today);
    if (eta.kind === "on_track") days = Math.min(maxDays, eta.days);
    else if (eta.kind === "reached") return [];
  }
  const end = rate.fittedNow + (rate.kgPerWeek / 7) * days;
  return [
    { date: today, weight: rate.fittedNow },
    { date: addDays(today, days), weight: end },
  ];
}
