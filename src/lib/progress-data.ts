import "server-only";
/**
 * Loads everything the weekly check-in needs (waist, strength, protein,
 * photos) and judges it against the body goal. Shared by the start page, the
 * body page and the MCP server.
 */
import type { Ctx } from "@/lib/data";
import { getDiaryRange } from "@/lib/data";
import { ctxOr } from "@/lib/data/core";
import { getWaist } from "@/lib/data/body-goal";
import { listWorkouts } from "@/lib/data/training";
import type { DiaryEntry } from "@/lib/data/types";
import type { Coach } from "@/lib/coach";
import { addDays } from "@/lib/dates";
import { sumItems } from "@/lib/nutrition/calc";
import { STRENGTH_BEFORE_DAYS, STRENGTH_RECENT_DAYS, assessProgress, strengthTrend, waistTrend, type Progress, type StrengthTrend, type WaistPoint, type WaistTrend } from "@/lib/body/progress";

export interface ProgressData extends Progress {
  waist: WaistTrend | null;
  waistPoints: (WaistPoint & { id: string })[];
  strength: StrengthTrend | null;
  protein: { avg: number; target: number; days: number } | null;
  lastPhotoDate: string | null;
}

async function lastPhotoDate(ctx: Ctx): Promise<string | null> {
  const { data, error } = await ctx.supabase.from("progress_photos").select("taken_on").eq("user_id", ctx.userId).order("taken_on", { ascending: false }).limit(1);
  return error ? null : (data?.[0]?.taken_on ?? null);
}

/** @param entries diary entries covering at least the 7 days before today (loaded if missing). */
export async function loadProgress(today: string, coach: Coach, ctx?: Ctx, entries?: DiaryEntry[]): Promise<ProgressData> {
  const c = await ctxOr(ctx);
  const weekFrom = addDays(today, -7);
  const [waistPoints, workouts, photo, diary] = await Promise.all([
    getWaist(addDays(today, -60), c),
    listWorkouts({ from: addDays(today, -(STRENGTH_RECENT_DAYS + STRENGTH_BEFORE_DAYS)), to: today, limit: 100 }, c),
    lastPhotoDate(c),
    entries ? Promise.resolve(entries) : getDiaryRange(weekFrom, addDays(today, -1), c),
  ]);
  const waist = waistTrend(waistPoints, today);
  const strength = strengthTrend(
    workouts.flatMap((w) => w.sets.map((s) => ({ exercise_id: s.exercise_id, date: w.workout_date, reps: s.reps, weight_kg: s.weight_kg, is_warmup: s.is_warmup }))),
    today,
  );
  const perDay: number[] = [];
  for (let d = weekFrom; d < today; d = addDays(d, 1)) {
    const items = diary.filter((e) => e.entry_date === d);
    if (items.length) perDay.push(sumItems(items).protein_g.value);
  }
  const target = coach.nutritionGoal?.base.protein_g ?? 0;
  const protein = perDay.length && target ? { avg: perDay.reduce((a, b) => a + b, 0) / perDay.length, target, days: perDay.length } : null;
  const assessed = assessProgress({
    goal: coach.goal.goal_type,
    currentKg: coach.current,
    rateKgWeek: coach.rate?.kgPerWeek ?? null,
    aimKgWeek: coach.wanted,
    waist,
    strength,
    protein,
    lastPhotoDate: photo,
    today,
  });
  return { ...assessed, waist, waistPoints, strength, protein, lastPhotoDate: photo };
}
