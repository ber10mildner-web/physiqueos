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

export type Suggestion =
  | { kind: "first" }
  | { kind: "increase"; weight_kg: number }
  | { kind: "same"; weight_kg: number };

/**
 * Double progression: once every working set of the last session reached the
 * top of the rep range, add one load step; otherwise keep the weight and aim
 * for more reps.
 */
export function suggestNext(lastSession: SetLike[], repMax: number, equipment: string): Suggestion {
  const working = lastSession.filter((s) => !s.is_warmup && s.reps > 0);
  if (working.length === 0) return { kind: "first" };
  const top = Math.max(...working.map((s) => s.weight_kg));
  const topSets = working.filter((s) => s.weight_kg === top);
  const step = loadStep(equipment);
  if (step > 0 && topSets.every((s) => s.reps >= repMax)) return { kind: "increase", weight_kg: Math.round((top + step) * 100) / 100 };
  return { kind: "same", weight_kg: top };
}

/** Workout length in whole minutes, or null while it is still running / times are implausible. */
export function workoutMinutes(startedAt: string, finishedAt: string | null): number | null {
  if (!finishedAt) return null;
  const ms = Date.parse(finishedAt) - Date.parse(startedAt);
  if (!Number.isFinite(ms) || ms <= 0 || ms > 12 * 3600_000) return null;
  return Math.round(ms / 60_000);
}
