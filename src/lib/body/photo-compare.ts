/** Helpers for the before/after photo comparison. Pure (tested). */
import { dayNumber, type TrendPoint } from "./weight";

interface PhotoLike {
  id: string;
  taken_on: string;
  pose: string;
}

/** Oldest and newest photo of a pose (needs two different photos), else null. */
export function autoPair<P extends PhotoLike>(photos: P[], pose: string): [P, P] | null {
  const of = photos.filter((p) => p.pose === pose).sort((a, b) => a.taken_on.localeCompare(b.taken_on));
  if (of.length < 2) return null;
  return [of[0], of.at(-1)!];
}

/** The pose with the most photos (ties: front, side, back, other), for the default comparison. */
export function defaultPose(photos: PhotoLike[]): string {
  const order = ["front", "side", "back", "other"];
  let best = "front";
  let n = 0;
  for (const pose of order) {
    const c = photos.filter((p) => p.pose === pose).length;
    if (c > n) {
      best = pose;
      n = c;
    }
  }
  return best;
}

/**
 * Smoothed weight (7-day average) around a photo date: the trend point on that
 * day, else the closest one within `maxDays`. null if none is close enough.
 */
export function weightNear(trend: Pick<TrendPoint, "date" | "average">[], date: string, maxDays = 3): number | null {
  const d = dayNumber(date);
  let best: { dist: number; v: number } | null = null;
  for (const p of trend) {
    const dist = Math.abs(dayNumber(p.date) - d);
    if (dist <= maxDays && (!best || dist < best.dist)) best = { dist, v: p.average };
  }
  return best?.v ?? null;
}
