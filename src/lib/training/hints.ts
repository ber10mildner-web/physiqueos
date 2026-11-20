import "server-only";
import { getExerciseSets } from "@/lib/data/training";
import type { Ctx } from "@/lib/data/core";
import { records, type Records } from "./calc";

export interface ExerciseHint {
  exerciseId: string;
  lastDate: string | null;
  lastSets: { reps: number; weight_kg: number; is_warmup: boolean }[];
  records: Records;
}

/** "Last time" sets and all-time records of an exercise, ignoring the given (current) workout. */
export async function exerciseHint(exerciseId: string, excludeWorkoutId?: string, ctx?: Ctx): Promise<ExerciseHint> {
  const all = (await getExerciseSets(exerciseId, 300, ctx)).filter((s) => s.workout_id !== excludeWorkoutId);
  const lastWorkout = all[0]?.workout_id;
  const lastSets = all
    .filter((s) => s.workout_id === lastWorkout)
    .sort((a, b) => a.position - b.position)
    .map((s) => ({ reps: s.reps, weight_kg: s.weight_kg, is_warmup: s.is_warmup }));
  return { exerciseId, lastDate: all[0]?.workout_date ?? null, lastSets, records: records(all) };
}
