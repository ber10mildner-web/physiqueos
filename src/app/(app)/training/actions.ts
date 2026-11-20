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
  rateTraining,
  setCardioMachine,
  getCardio,
  savePlan,
  startWorkout,
  updateSet,
} from "@/lib/data/training";
import { exerciseHint, type ExerciseHint } from "@/lib/training/hints";
import type { Exercise, TrainingRating } from "@/lib/data/types";
import { PHOTO_BUCKET } from "@/lib/data";
import { displayReaderEnabled, readDisplay, type DisplayValues } from "@/lib/ai/display-reader";

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

export async function finishWorkoutAction(id: string, rating: TrainingRating | null) {
  const ctx = await requireUser();
  if (rating) {
    const r = await rateTraining("workout", id, rating, ctx);
    if (!r.ok) return r;
  }
  const res = await finishWorkout(id, ctx);
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

export async function rateTrainingAction(kind: "workout" | "cardio", id: string, rating: TrainingRating): Promise<R> {
  const res = await rateTraining(kind, id, rating, await requireUser());
  if (res.ok) done();
  return res;
}

export async function saveMachineAction(
  id: string,
  input: { machine_minutes: number | null; machine_level: number | null; machine_floors: number | null; machine_steps: number | null; machine_kcal: number | null },
): Promise<R> {
  const res = await setCardioMachine(id, input, await requireUser());
  if (res.ok) done();
  return res;
}

/** Called after the browser uploaded the display photo; replaces an older photo. */
export async function setMachinePhotoAction(id: string, path: string): Promise<R> {
  const ctx = await requireUser();
  const old = await getCardio(id, ctx);
  if (!old) return { ok: false, error: "not_found" };
  const res = await setCardioMachine(id, { machine_photo_path: path }, ctx);
  if (!res.ok) {
    await ctx.supabase.storage.from(PHOTO_BUCKET).remove([path]);
    return res;
  }
  if (old.machine_photo_path && old.machine_photo_path !== path) await ctx.supabase.storage.from(PHOTO_BUCKET).remove([old.machine_photo_path]);
  done();
  return { ok: true };
}

/** Reads the display photo with the Claude API (only if ANTHROPIC_API_KEY is configured). */
export async function readMachinePhotoAction(id: string): Promise<R<{ values: DisplayValues }>> {
  if (!displayReaderEnabled()) return { ok: false, error: "disabled" };
  const ctx = await requireUser();
  const session = await getCardio(id, ctx);
  if (!session?.machine_photo_path) return { ok: false, error: "no_photo" };
  const file = await ctx.supabase.storage.from(PHOTO_BUCKET).download(session.machine_photo_path);
  if (file.error || !file.data) return { ok: false, error: "download" };
  try {
    const values = await readDisplay(Buffer.from(await file.data.arrayBuffer()));
    return values && values.readable ? { ok: true, values } : { ok: false, error: "unreadable" };
  } catch (e) {
    console.error("display reader", e);
    return { ok: false, error: "api" };
  }
}
