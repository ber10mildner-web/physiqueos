import "server-only";
/** Loads what dailyBurn() needs for a range of days (dashboard, weekly summary, Claude). */
import type { Ctx } from "@/lib/data";
import { getProfile, getWeights } from "@/lib/data";
import { getHealthRange } from "@/lib/data/health";
import { listCardio, listWorkouts } from "@/lib/data/training";
import { withKcalEstimates } from "@/lib/cardio";
import { dailyBurn, type Burn } from "@/lib/nutrition/burn";
import { workoutMinutes } from "@/lib/training/calc";
import { addDays } from "@/lib/dates";

export async function burnForRange(from: string, to: string, intakeByDate: Record<string, number>, ctx?: Ctx, todayFraction?: { date: string; fraction: number }): Promise<Record<string, Burn | null>> {
  const [profile, weights, health, rawCardio, workouts] = await Promise.all([
    getProfile(ctx),
    getWeights(undefined, ctx),
    getHealthRange(from, to, ctx),
    listCardio({ from, to }, ctx),
    listWorkouts({ from, to, limit: 200 }, ctx),
  ]);
  const cardio = await withKcalEstimates(rawCardio, ctx);
  const out: Record<string, Burn | null> = {};
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const weight = weights.filter((w) => w.entry_date <= d).at(-1) ?? weights[0];
    out[d] = dailyBurn({
      date: d,
      profile,
      weightKg: weight?.weight_kg ?? null,
      intakeKcal: intakeByDate[d] ?? 0,
      health: health.find((h) => h.entry_date === d) ?? null,
      cardio: cardio.filter((c) => c.session_date === d).map((c) => ({ activity: c.activity, duration_min: c.duration_min, kcal: c.estimate?.kcal ?? c.kcal })),
      dayFraction: todayFraction?.date === d ? todayFraction.fraction : 1,
      gymMinutes: workouts.filter((w) => w.workout_date === d).map((w) => workoutMinutes(w.started_at, w.finished_at)),
    });
  }
  return out;
}
