import "server-only";
import { z } from "zod";
import { check, ctxOr, num, type Ctx } from "./core";
import { dateSchema, type Result } from "./mutations";
import { CARDIO_ACTIVITIES, EQUIPMENT, MUSCLE_GROUPS, type CardioSession, type Exercise, type Workout, type WorkoutPlan, type WorkoutSet } from "./types";

const uuid = z.string().uuid();

export async function listExercises(ctx?: Ctx): Promise<Exercise[]> {
  const { supabase, userId } = await ctxOr(ctx);
  const { data, error } = await supabase
    .from("exercises")
    .select("id, user_id, name_de, name_en, muscle_group, equipment")
    .or(`user_id.is.null,user_id.eq.${userId}`)
    .order("muscle_group")
    .order("name_de");
  check(error, !ctx);
  return (data ?? []) as Exercise[];
}

export async function createExercise(input: { name: string; muscle_group: string; equipment: string }, ctx?: Ctx): Promise<Result<{ id: string }>> {
  const parsed = z
    .object({ name: z.string().trim().min(1).max(100), muscle_group: z.enum(MUSCLE_GROUPS), equipment: z.enum(EQUIPMENT) })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { supabase, userId } = await ctxOr(ctx);
  const { data, error } = await supabase
    .from("exercises")
    .insert({ user_id: userId, name_de: parsed.data.name, name_en: parsed.data.name, muscle_group: parsed.data.muscle_group, equipment: parsed.data.equipment })
    .select("id")
    .single();
  return error ? { ok: false, error: error.message } : { ok: true, id: data.id };
}

export async function listPlans(ctx?: Ctx): Promise<WorkoutPlan[]> {
  const { supabase, userId } = await ctxOr(ctx);
  const { data, error } = await supabase.from("workout_plans").select("id, name, notes, position").eq("user_id", userId).eq("archived", false).order("position").order("created_at");
  check(error, !ctx);
  const plans = data ?? [];
  if (!plans.length) return [];
  const { data: pe, error: e2 } = await supabase
    .from("plan_exercises")
    .select("id, plan_id, exercise_id, position, target_sets, rep_min, rep_max")
    .eq("user_id", userId)
    .in("plan_id", plans.map((p) => p.id))
    .order("position");
  check(e2, !ctx);
  return plans.map((p) => ({ ...(p as Omit<WorkoutPlan, "exercises">), exercises: (pe ?? []).filter((x) => x.plan_id === p.id) }));
}

const planSchema = z.object({
  id: uuid.optional(),
  name: z.string().trim().min(1).max(100),
  notes: z.string().trim().max(2000).nullish(),
  exercises: z
    .array(z.object({ exercise_id: uuid, target_sets: z.number().int().min(1).max(20), rep_min: z.number().int().min(1).max(100), rep_max: z.number().int().min(1).max(100) }).refine((e) => e.rep_min <= e.rep_max))
    .max(40),
});

export async function savePlan(input: z.input<typeof planSchema>, ctx?: Ctx): Promise<Result<{ id: string }>> {
  const parsed = planSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { supabase, userId } = await ctxOr(ctx);
  const row = { user_id: userId, name: parsed.data.name, notes: parsed.data.notes || null };
  let id = parsed.data.id;
  if (id) {
    const { data, error } = await supabase.from("workout_plans").update(row).eq("id", id).eq("user_id", userId).select("id").maybeSingle();
    if (error || !data) return { ok: false, error: error?.message ?? "not_found" };
  } else {
    const { data, error } = await supabase.from("workout_plans").insert(row).select("id").single();
    if (error) return { ok: false, error: error.message };
    id = data.id as string;
  }
  const { error: de } = await supabase.from("plan_exercises").delete().eq("plan_id", id).eq("user_id", userId);
  if (de) return { ok: false, error: de.message };
  if (parsed.data.exercises.length) {
    const { error: ie } = await supabase
      .from("plan_exercises")
      .insert(parsed.data.exercises.map((e, position) => ({ ...e, position, plan_id: id, user_id: userId })));
    if (ie) return { ok: false, error: ie.message };
  }
  return { ok: true, id: id! };
}

export async function archivePlan(id: string, ctx?: Ctx): Promise<Result> {
  const { supabase, userId } = await ctxOr(ctx);
  const { error } = await supabase.from("workout_plans").update({ archived: true }).eq("id", id).eq("user_id", userId);
  return error ? { ok: false, error: error.message } : { ok: true };
}

function mapSet(r: Record<string, unknown>): WorkoutSet {
  return { ...(r as unknown as WorkoutSet), weight_kg: Number(r.weight_kg), rpe: num(r.rpe) };
}

const WORKOUT_COLUMNS = "id, plan_id, name, workout_date, started_at, finished_at, notes";
const SET_COLUMNS = "id, workout_id, exercise_id, position, reps, weight_kg, rpe, is_warmup, created_at";

async function attachSets(workouts: Omit<Workout, "sets">[], ctx: Ctx, web: boolean): Promise<Workout[]> {
  if (!workouts.length) return [];
  const { data, error } = await ctx.supabase
    .from("workout_sets")
    .select(SET_COLUMNS)
    .eq("user_id", ctx.userId)
    .in("workout_id", workouts.map((w) => w.id))
    .order("position")
    .order("created_at");
  check(error, web);
  const sets = (data ?? []).map(mapSet);
  return workouts.map((w) => ({ ...w, sets: sets.filter((s) => s.workout_id === w.id) }));
}

export async function listWorkouts(range: { from?: string; to?: string; limit?: number } = {}, ctx?: Ctx): Promise<Workout[]> {
  const c = await ctxOr(ctx);
  let q = c.supabase.from("workouts").select(WORKOUT_COLUMNS).eq("user_id", c.userId);
  if (range.from) q = q.gte("workout_date", range.from);
  if (range.to) q = q.lte("workout_date", range.to);
  const { data, error } = await q.order("workout_date", { ascending: false }).order("started_at", { ascending: false }).limit(range.limit ?? 100);
  check(error, !ctx);
  return attachSets((data ?? []) as Omit<Workout, "sets">[], c, !ctx);
}

export async function getWorkout(id: string, ctx?: Ctx): Promise<Workout | null> {
  if (!uuid.safeParse(id).success) return null;
  const c = await ctxOr(ctx);
  const { data, error } = await c.supabase.from("workouts").select(WORKOUT_COLUMNS).eq("user_id", c.userId).eq("id", id).maybeSingle();
  check(error, !ctx);
  if (!data) return null;
  return (await attachSets([data as Omit<Workout, "sets">], c, !ctx))[0];
}

export async function startWorkout(input: { planId: string | null; date: string; name: string }, ctx?: Ctx): Promise<Result<{ id: string }>> {
  const parsed = z.object({ planId: uuid.nullable(), date: dateSchema, name: z.string().trim().min(1).max(100) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { supabase, userId } = await ctxOr(ctx);
  const { data, error } = await supabase
    .from("workouts")
    .insert({ user_id: userId, plan_id: parsed.data.planId, workout_date: parsed.data.date, name: parsed.data.name })
    .select("id")
    .single();
  return error ? { ok: false, error: error.message } : { ok: true, id: data.id };
}

const setSchema = z.object({
  reps: z.number().int().min(0).max(200),
  weight_kg: z.number().min(0).max(1000),
  rpe: z.number().min(1).max(10).nullish(),
  is_warmup: z.boolean().optional(),
});

export async function addSet(input: { workoutId: string; exerciseId: string } & z.input<typeof setSchema>, ctx?: Ctx): Promise<Result<{ id: string }>> {
  const parsed = setSchema.extend({ workoutId: uuid, exerciseId: uuid }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { supabase, userId } = await ctxOr(ctx);
  const { count } = await supabase.from("workout_sets").select("id", { count: "exact", head: true }).eq("workout_id", parsed.data.workoutId).eq("user_id", userId);
  const { data, error } = await supabase
    .from("workout_sets")
    .insert({
      workout_id: parsed.data.workoutId,
      exercise_id: parsed.data.exerciseId,
      user_id: userId,
      position: count ?? 0,
      reps: parsed.data.reps,
      weight_kg: parsed.data.weight_kg,
      rpe: parsed.data.rpe ?? null,
      is_warmup: parsed.data.is_warmup ?? false,
    })
    .select("id")
    .single();
  return error ? { ok: false, error: error.message } : { ok: true, id: data.id };
}

export async function updateSet(id: string, input: z.input<typeof setSchema>, ctx?: Ctx): Promise<Result> {
  const parsed = setSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { supabase, userId } = await ctxOr(ctx);
  const { error } = await supabase.from("workout_sets").update(parsed.data).eq("id", id).eq("user_id", userId);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function deleteSet(id: string, ctx?: Ctx): Promise<Result> {
  const { supabase, userId } = await ctxOr(ctx);
  const { error } = await supabase.from("workout_sets").delete().eq("id", id).eq("user_id", userId);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function finishWorkout(id: string, ctx?: Ctx): Promise<Result> {
  const { supabase, userId } = await ctxOr(ctx);
  const { error } = await supabase.from("workouts").update({ finished_at: new Date().toISOString() }).eq("id", id).eq("user_id", userId);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function deleteWorkout(id: string, ctx?: Ctx): Promise<Result> {
  const { supabase, userId } = await ctxOr(ctx);
  const { error } = await supabase.from("workouts").delete().eq("id", id).eq("user_id", userId);
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** All working sets of an exercise, newest first (for history, records and suggestions). */
export async function getExerciseSets(exerciseId: string, limit = 300, ctx?: Ctx): Promise<(WorkoutSet & { workout_date: string })[]> {
  const { supabase, userId } = await ctxOr(ctx);
  const { data, error } = await supabase
    .from("workout_sets")
    .select(`${SET_COLUMNS}, workouts!inner(workout_date)`)
    .eq("user_id", userId)
    .eq("exercise_id", exerciseId)
    .order("created_at", { ascending: false })
    .limit(limit);
  check(error, !ctx);
  return (data ?? []).map((r) => {
    const w = (r as unknown as { workouts: { workout_date: string } | { workout_date: string }[] }).workouts;
    return { ...mapSet(r), workout_date: Array.isArray(w) ? w[0].workout_date : w.workout_date };
  });
}

/** Sets of many exercises at once (newest first), used to build "last time" hints. */
export async function getSetsForExercises(exerciseIds: string[], ctx?: Ctx): Promise<WorkoutSet[]> {
  if (!exerciseIds.length) return [];
  const { supabase, userId } = await ctxOr(ctx);
  const { data, error } = await supabase
    .from("workout_sets")
    .select(SET_COLUMNS)
    .eq("user_id", userId)
    .in("exercise_id", exerciseIds)
    .order("created_at", { ascending: false })
    .limit(1000);
  check(error, !ctx);
  return (data ?? []).map(mapSet);
}

export async function listCardio(range: { from?: string; to?: string } = {}, ctx?: Ctx): Promise<CardioSession[]> {
  const { supabase, userId } = await ctxOr(ctx);
  let q = supabase.from("cardio_sessions").select("id, session_date, activity, duration_min, distance_km, avg_hr, kcal, notes, source").eq("user_id", userId);
  if (range.from) q = q.gte("session_date", range.from);
  if (range.to) q = q.lte("session_date", range.to);
  const { data, error } = await q.order("session_date", { ascending: false }).limit(200);
  check(error, !ctx);
  return (data ?? []).map((r) => ({ ...(r as CardioSession), duration_min: Number(r.duration_min), distance_km: num(r.distance_km) }));
}

export const cardioSchema = z.object({
  date: dateSchema,
  activity: z.enum(CARDIO_ACTIVITIES),
  duration_min: z.number().positive().max(1440),
  distance_km: z.number().min(0).max(1000).nullish(),
  avg_hr: z.number().int().min(30).max(250).nullish(),
  kcal: z.number().int().min(0).max(10000).nullish(),
  notes: z.string().trim().max(1000).nullish(),
  source: z.enum(["manual", "garmin", "strava", "claude"]).default("manual"),
  source_id: z.string().max(100).nullish(),
});

export async function addCardio(input: z.input<typeof cardioSchema>, ctx?: Ctx): Promise<Result> {
  const parsed = cardioSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { supabase, userId } = await ctxOr(ctx);
  const { date, ...rest } = parsed.data;
  const row = { ...rest, user_id: userId, session_date: date, source_id: rest.source_id ?? null };
  const { error } = rest.source_id
    ? await supabase.from("cardio_sessions").upsert(row, { onConflict: "user_id,source,source_id" })
    : await supabase.from("cardio_sessions").insert(row);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function deleteCardio(id: string, ctx?: Ctx): Promise<Result> {
  const { supabase, userId } = await ctxOr(ctx);
  const { error } = await supabase.from("cardio_sessions").delete().eq("id", id).eq("user_id", userId);
  return error ? { ok: false, error: error.message } : { ok: true };
}
