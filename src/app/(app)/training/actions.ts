"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getToday, requireUser } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import {
  addCardio,
  addSet,
  archivePlan,
  createExercise,
  deleteCardio,
  deleteSet,
  deleteWorkout,
  finishWorkout,
  listPlans,
  savePlan,
  startWorkout,
  updateSet,
} from "@/lib/data/training";
import { exerciseHint, type ExerciseHint } from "@/lib/training/hints";
import type { Exercise } from "@/lib/data/types";

type R<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const done = () => revalidatePath("/training", "layout");

export async function startWorkoutAction(planId: string | null) {
  const ctx = await requireUser();
  const { t } = await getI18n();
  const plan = planId ? (await listPlans(ctx)).find((p) => p.id === planId) : null;
  const res = await startWorkout({ planId: plan?.id ?? null, date: await getToday(), name: plan?.name ?? t.training.startEmpty }, ctx);
  if (!res.ok) return res;
  done();
  redirect(`/training/workout/${res.id}`);
}

export async function addSetAction(input: { workoutId: string; exerciseId: string; reps: number; weight_kg: number; is_warmup: boolean }): Promise<R<{ id: string }>> {
  const res = await addSet(input, await requireUser());
  if (res.ok) done();
  return res;
}

export async function updateSetAction(id: string, input: { reps: number; weight_kg: number; is_warmup: boolean }): Promise<R> {
  const res = await updateSet(id, input, await requireUser());
  if (res.ok) done();
  return res;
}

export async function deleteSetAction(id: string): Promise<R> {
  const res = await deleteSet(id, await requireUser());
  if (res.ok) done();
  return res;
}

export async function finishWorkoutAction(id: string) {
  const res = await finishWorkout(id, await requireUser());
  if (!res.ok) return res;
  done();
  redirect("/training");
}

export async function deleteWorkoutAction(id: string) {
  const res = await deleteWorkout(id, await requireUser());
  if (!res.ok) return res;
  done();
  redirect("/training");
}

export async function hintAction(exerciseId: string, workoutId: string): Promise<ExerciseHint> {
  return exerciseHint(exerciseId, workoutId, await requireUser());
}

export async function createExerciseAction(input: { name: string; muscle_group: string; equipment: string }): Promise<R<{ exercise: Exercise }>> {
  const res = await createExercise(input, await requireUser());
  if (!res.ok) return res;
  done();
  return {
    ok: true,
    exercise: { id: res.id, user_id: "me", name_de: input.name.trim(), name_en: input.name.trim(), muscle_group: input.muscle_group, equipment: input.equipment } as Exercise,
  };
}

export async function savePlanAction(input: {
  id?: string;
  name: string;
  exercises: { exercise_id: string; target_sets: number; rep_min: number; rep_max: number }[];
}): Promise<R<{ id: string }>> {
  const res = await savePlan(input, await requireUser());
  if (res.ok) done();
  return res;
}

export async function archivePlanAction(id: string) {
  const res = await archivePlan(id, await requireUser());
  if (!res.ok) return res;
  done();
  redirect("/training");
}

export async function addCardioAction(input: {
  date: string;
  activity: string;
  duration_min: number;
  distance_km: number | null;
  avg_hr: number | null;
  kcal: number | null;
}): Promise<R> {
  const res = await addCardio(input as Parameters<typeof addCardio>[0], await requireUser());
  if (res.ok) done();
  return res;
}

export async function deleteCardioAction(id: string): Promise<R> {
  const res = await deleteCardio(id, await requireUser());
  if (res.ok) done();
  return res;
}
