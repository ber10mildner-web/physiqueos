import "server-only";
import { z } from "zod";
import { ctxOr, num, type Ctx } from "./core";
import type { Result } from "./mutations";
import { dateSchema } from "./mutations";
import { GOAL_TYPES, TRAINING_LEVELS, type GoalType, type TrainingLevel } from "@/lib/body/goals";
import type { WaistPoint } from "@/lib/body/progress";

export interface BodyGoal {
  goal_weight_kg: number | null;
  /** Wanted pace in kg per week (always positive). null = Sigma's recommendation. */
  goal_pace_kg_week: number | null;
  /** What the user is after (fat loss keeping muscle, recomp, …). null = only a goal weight. */
  goal_type: GoalType | null;
  training_level: TrainingLevel | null;
  /** The user's own description of their situation (read by Claude in reviews). */
  goal_note: string | null;
}

const EMPTY: BodyGoal = { goal_weight_kg: null, goal_pace_kg_week: null, goal_type: null, training_level: null, goal_note: null };

/**
 * Body goal. Read separately from the profile and tolerant of missing
 * migrations: without the newer columns it falls back to goal weight only.
 */
export async function getBodyGoal(ctx?: Ctx): Promise<BodyGoal> {
  const { supabase, userId } = await ctxOr(ctx);
  const full = await supabase.from("profiles").select("goal_weight_kg, goal_pace_kg_week, goal_type, training_level, goal_note").eq("id", userId).maybeSingle();
  if (!full.error && full.data) {
    const d = full.data;
    return {
      goal_weight_kg: num(d.goal_weight_kg),
      goal_pace_kg_week: num(d.goal_pace_kg_week),
      goal_type: (GOAL_TYPES as readonly string[]).includes(d.goal_type) ? (d.goal_type as GoalType) : null,
      training_level: (TRAINING_LEVELS as readonly string[]).includes(d.training_level) ? (d.training_level as TrainingLevel) : null,
      goal_note: d.goal_note ?? null,
    };
  }
  const { data, error } = await supabase.from("profiles").select("goal_weight_kg, goal_pace_kg_week").eq("id", userId).maybeSingle();
  if (error || !data) return EMPTY;
  return { ...EMPTY, goal_weight_kg: num(data.goal_weight_kg), goal_pace_kg_week: num(data.goal_pace_kg_week) };
}

const schema = z.object({
  goal_weight_kg: z.number().min(30).max(300).nullable(),
  goal_pace_kg_week: z.number().gt(0).max(1.5).nullable(),
  goal_type: z.enum(GOAL_TYPES).nullable(),
  training_level: z.enum(TRAINING_LEVELS).nullable(),
  goal_note: z.string().trim().max(1000).nullable(),
});

export async function saveBodyGoal(input: BodyGoal, ctx?: Ctx): Promise<Result> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const v = parsed.data;
  const { supabase, userId } = await ctxOr(ctx);
  const { error } = await supabase
    .from("profiles")
    .update({
      goal_weight_kg: v.goal_weight_kg === null ? null : Math.round(v.goal_weight_kg * 10) / 10,
      goal_pace_kg_week: v.goal_pace_kg_week,
      goal_type: v.goal_type,
      training_level: v.training_level,
      goal_note: v.goal_note || null,
    })
    .eq("id", userId);
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Waist measurements since `from` (oldest first). Empty without the migration. */
export async function getWaist(from: string, ctx?: Ctx): Promise<(WaistPoint & { id: string })[]> {
  const { supabase, userId } = await ctxOr(ctx);
  const { data, error } = await supabase.from("body_measurements").select("id, entry_date, waist_cm").eq("user_id", userId).gte("entry_date", from).order("entry_date");
  if (error) return [];
  return (data ?? []).map((r) => ({ id: r.id, date: r.entry_date, waist_cm: Number(r.waist_cm) }));
}

const waistSchema = z.object({ date: dateSchema, waist_cm: z.number().min(40).max(200), source: z.enum(["manual", "claude"]).default("manual") });

/** One waist value per day: measuring again on the same date replaces it. */
export async function upsertWaist(input: z.input<typeof waistSchema>, ctx?: Ctx): Promise<Result> {
  const parsed = waistSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { supabase, userId } = await ctxOr(ctx);
  const { error } = await supabase
    .from("body_measurements")
    .upsert({ user_id: userId, entry_date: parsed.data.date, waist_cm: Math.round(parsed.data.waist_cm * 10) / 10, source: parsed.data.source }, { onConflict: "user_id,entry_date" });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function deleteWaist(id: string, ctx?: Ctx): Promise<Result> {
  const { supabase, userId } = await ctxOr(ctx);
  const { error } = await supabase.from("body_measurements").delete().eq("id", id).eq("user_id", userId);
  return error ? { ok: false, error: error.message } : { ok: true };
}
