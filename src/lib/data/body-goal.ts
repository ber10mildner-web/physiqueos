import "server-only";
import { z } from "zod";
import { ctxOr, num, type Ctx } from "./core";
import type { Result } from "./mutations";

export interface BodyGoal {
  goal_weight_kg: number | null;
  /** Wanted pace in kg per week (always positive). */
  goal_pace_kg_week: number | null;
}

/**
 * Goal weight and pace. Read separately from the profile and tolerant of a
 * missing migration: without the columns it simply returns "no goal".
 */
export async function getBodyGoal(ctx?: Ctx): Promise<BodyGoal> {
  const { supabase, userId } = await ctxOr(ctx);
  const { data, error } = await supabase.from("profiles").select("goal_weight_kg, goal_pace_kg_week").eq("id", userId).maybeSingle();
  if (error || !data) return { goal_weight_kg: null, goal_pace_kg_week: null };
  return { goal_weight_kg: num(data.goal_weight_kg), goal_pace_kg_week: num(data.goal_pace_kg_week) };
}

const schema = z.object({
  goal_weight_kg: z.number().min(30).max(300).nullable(),
  goal_pace_kg_week: z.number().gt(0).max(1.5).nullable(),
});

export async function saveBodyGoal(input: BodyGoal, ctx?: Ctx): Promise<Result> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { supabase, userId } = await ctxOr(ctx);
  const { error } = await supabase
    .from("profiles")
    .update({ goal_weight_kg: parsed.data.goal_weight_kg === null ? null : Math.round(parsed.data.goal_weight_kg * 10) / 10, goal_pace_kg_week: parsed.data.goal_pace_kg_week })
    .eq("id", userId);
  return error ? { ok: false, error: error.message } : { ok: true };
}
