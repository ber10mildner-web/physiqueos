/** Strength training calculations. Pure functions, unit-tested. */

export interface SetLike {
  reps: number;
  weight_kg: number;
  is_warmup?: boolean;
}

/**
 * Estimated one-rep max (Epley: w · (1 + reps/30)).
 * Estimates above ~12 reps get unreliable, so we return null there.
 */
export function estimate1RM(weightKg: number, reps: number): number | null {
  if (reps <= 0 || weightKg <= 0) return null;
  if (reps === 1) return weightKg;
  if (reps > 12) return null;
  return weightKg * (1 + reps / 30);
}

/** Total volume (kg × reps) of working sets. */
export function volume(sets: SetLike[]): number {
  return sets.filter((s) => !s.is_warmup).reduce((sum, s) => sum + s.reps * s.weight_kg, 0);
}

export interface Records {
  bestWeight: { weight_kg: number; reps: number } | null;
  best1RM: { value: number; weight_kg: number; reps: number } | null;
}

export function records(sets: SetLike[]): Records {
  let bestWeight: Records["bestWeight"] = null;
  let best1RM: Records["best1RM"] = null;
  for (const s of sets) {
    if (s.is_warmup || s.reps <= 0) continue;
    if (!bestWeight || s.weight_kg > bestWeight.weight_kg || (s.weight_kg === bestWeight.weight_kg && s.reps > bestWeight.reps)) {
      bestWeight = { weight_kg: s.weight_kg, reps: s.reps };
    }
    const e = estimate1RM(s.weight_kg, s.reps);
    if (e !== null && (!best1RM || e > best1RM.value)) best1RM = { value: e, weight_kg: s.weight_kg, reps: s.reps };
  }
  return { bestWeight, best1RM };
}

/** Smallest sensible load step for the equipment. */
export function loadStep(equipment: string): number {
  if (equipment === "dumbbell" || equipment === "kettlebell") return 2;
  if (equipment === "bodyweight") return 0;
  return 2.5;
}

/** Workout length in whole minutes, or null while it is still running / times are implausible. */
export function workoutMinutes(startedAt: string, finishedAt: string | null): number | null {
  if (!finishedAt) return null;
  const ms = Date.parse(finishedAt) - Date.parse(startedAt);
  if (!Number.isFinite(ms) || ms <= 0 || ms > 12 * 3600_000) return null;
  return Math.round(ms / 60_000);
}

export type Coach =
  | { kind: "first" }
  /** All working sets at the top weight reached the top of the range: go up one step. */
  | { kind: "increase"; weight_kg: number; reps: number; from_kg: number }
  /** Same weight, one more rep than last time (up to the top of the range). */
  | { kind: "reps"; weight_kg: number; reps: number }
  /** Last time no set reached the bottom of the range: one step lighter. */
  | { kind: "lighter"; weight_kg: number; reps: number }
  /** Three sessions in a row without progress at the same weight: about 10 % lighter, then build back up. */
  | { kind: "deload"; weight_kg: number; reps: number; sessions: number };

/** Working sets of one session, at its heaviest weight. */
function topSets(session: SetLike[]): { weight: number; reps: number[] } | null {
  const working = session.filter((s) => !s.is_warmup && s.reps > 0);
  if (!working.length) return null;
  const weight = Math.max(...working.map((s) => s.weight_kg));
  return { weight, reps: working.filter((s) => s.weight_kg === weight).map((s) => s.reps) };
}

const roundToStep = (v: number, step: number) => Math.round(Math.round(v / step) * step * 100) / 100;

/**
 * Progressive overload coach (double progression with stall detection).
 * @param sessions previous sessions of this exercise, newest first (each a list of sets).
 */
export function coachNext(sessions: SetLike[][], repMin: number, repMax: number, equipment: string): Coach {
  const tops = sessions.map(topSets).filter((t): t is NonNullable<typeof t> => t !== null);
  const last = tops[0];
  if (!last) return { kind: "first" };
  const step = loadStep(equipment);
  const lowest = Math.min(...last.reps);
  const highest = Math.max(...last.reps);

  if (step === 0) {
    // Bodyweight: only reps can go up.
    return { kind: "reps", weight_kg: last.weight, reps: highest + 1 };
  }
  if (lowest >= repMax) return { kind: "increase", weight_kg: roundToStep(last.weight + step, step / 2), reps: repMin, from_kg: last.weight };
  if (highest < repMin && last.weight - step > 0) return { kind: "lighter", weight_kg: roundToStep(last.weight - step, step / 2), reps: repMin };

  // Stall: the last three sessions at the same weight without more total reps.
  const recent = tops.slice(0, 3);
  if (recent.length === 3 && recent.every((t) => t.weight === last.weight)) {
    const total = (t: { reps: number[] }) => t.reps.reduce((a, b) => a + b, 0);
    if (total(recent[0]) <= total(recent[2])) {
      const lighter = Math.max(step, roundToStep(last.weight * 0.9, step));
      if (lighter < last.weight) return { kind: "deload", weight_kg: lighter, reps: repMax, sessions: 3 };
    }
  }
  return { kind: "reps", weight_kg: last.weight, reps: Math.min(repMax, lowest + 1) };
}

export interface StrengthPoint {
  date: string;
  /** Estimated max (kg) for loaded exercises, max reps for bodyweight. */
  value: number;
  /** The set that produced the value. */
  weight_kg: number;
  reps: number;
}

export interface StrengthHistory {
  metric: "e1rm" | "reps";
  /** One point per session, oldest first. */
  points: StrengthPoint[];
}

/**
 * Trend estimate for charts: Epley like estimate1RM, but also for sets above 12 reps
 * (less exact there, yet still fine to show whether a high-rep exercise gets stronger).
 */
function trendMax(weightKg: number, reps: number): number {
  return reps === 1 ? weightKg : weightKg * (1 + reps / 30);
}

/**
 * One point per session for the strength chart: the best working set by estimated max.
 * If the exercise was never done with added weight, the metric is the most reps in one set.
 * @param sets sets of one exercise in any order, each tagged with its workout and date.
 */
export function strengthHistory(sets: (SetLike & { workout_id: string; workout_date: string })[]): StrengthHistory {
  const working = sets.filter((s) => !s.is_warmup && s.reps > 0);
  const metric = working.some((s) => s.weight_kg > 0) ? "e1rm" : "reps";
  const byWorkout = new Map<string, StrengthPoint>();
  for (const s of working) {
    if (metric === "e1rm" && s.weight_kg <= 0) continue;
    const value = metric === "e1rm" ? trendMax(s.weight_kg, s.reps) : s.reps;
    const cur = byWorkout.get(s.workout_id);
    if (!cur || value > cur.value) byWorkout.set(s.workout_id, { date: s.workout_date, value: Math.round(value * 10) / 10, weight_kg: s.weight_kg, reps: s.reps });
  }
  const points = [...byWorkout.values()].sort((a, b) => a.date.localeCompare(b.date));
  return { metric, points };
}
