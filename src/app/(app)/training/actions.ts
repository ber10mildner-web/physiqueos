"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTimeZone, getToday, requireUser } from "@/lib/auth";
import { todayIn } from "@/lib/dates";
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
  setWorkoutTimes,
  setExerciseNote,
  saveCardioTemplate,
  archiveCardioTemplate,
  listCardioTemplates,
  logCardioTemplate,
  startWorkout,
  updateSet,
} from "@/lib/data/training";
import { exerciseHint, type ExerciseHint } from "@/lib/training/hints";
import type { Exercise, TrainingRating } from "@/lib/data/types";
import { PHOTO_BUCKET } from "@/lib/data";
import { displayReaderEnabled, readDisplay, type DisplayValues } from "@/lib/ai/display-reader";
import { canSpend, recordUsage } from "@/lib/ai/usage";

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
  schedule_days?: number[];
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

export async function setWorkoutTimesAction(id: string, input: { started_at: string; finished_at: string | null }): Promise<R> {
  const res = await setWorkoutTimes(id, input, await requireUser());
  if (res.ok) done();
  return res;
}

export async function setExerciseNoteAction(input: { workoutId: string; exerciseId: string; feeling: number | null; note: string | null }): Promise<R> {
  const res = await setExerciseNote(input, await requireUser());
  if (res.ok) done();
  return res;
}

export async function saveCardioTemplateAction(input: {
  id?: string;
  name: string;
  activity: string;
  duration_min: number;
  distance_km: number | null;
  avg_hr: number | null;
  kcal: number | null;
  incline_pct: number | null;
  speed_kmh: number | null;
  effort: number | null;
  auto_days: number[];
}): Promise<R<{ id: string }>> {
  const res = await saveCardioTemplate({ ...(input as Parameters<typeof saveCardioTemplate>[0]), today: await getToday() }, await requireUser());
  if (res.ok) done();
  return res;
}

export async function archiveCardioTemplateAction(id: string): Promise<R> {
  const res = await archiveCardioTemplate(id, await requireUser());
  if (res.ok) done();
  return res;
}

/** One tap: logs the template for today. */
export async function logCardioTemplateAction(id: string): Promise<R> {
  const ctx = await requireUser();
  const t = (await listCardioTemplates(ctx)).find((x) => x.id === id);
  if (!t) return { ok: false, error: "not_found" };
  const res = await logCardioTemplate(t, await getToday(), ctx);
  if (res.ok) done();
  return res;
}

export async function addCardioAction(input: {
  date: string;
  activity: string;
  duration_min: number;
  distance_km: number | null;
  avg_hr: number | null;
  kcal: number | null;
  incline_pct?: number | null;
  speed_kmh?: number | null;
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
  const timeZone = await getTimeZone();
  const budget = await canSpend(ctx, todayIn(timeZone), timeZone, "cardio_display");
  if (!budget.ok) return { ok: false, error: budget.reason };
  try {
    const { values, model, usage } = await readDisplay(Buffer.from(await file.data.arrayBuffer()));
    await recordUsage(ctx, "cardio_display", model, usage);
    return values && values.readable ? { ok: true, values } : { ok: false, error: "unreadable" };
  } catch (e) {
    console.error("display reader", e);
    return { ok: false, error: "api" };
  }
}
