import "server-only";
/**
 * Period summaries used by the Claude connection (weekly reviews) and the app.
 * Everything is computed from stored data; nothing is estimated here except
 * clearly labelled derived values (averages, moving averages).
 */
import type { Ctx } from "@/lib/data";
import { getDiaryRange, getGoalsBetween, getWeights } from "@/lib/data";
import { getWaterRange } from "@/lib/data/tracking";
import { listCardio, listExercises, listWorkouts } from "@/lib/data/training";
import { getHealthRange } from "@/lib/data/health";
import { addDays } from "@/lib/dates";
import { dayNumber as dayNumberOf } from "@/lib/body/weight";
import { sumItems } from "@/lib/nutrition/calc";
import { NUTRIENT_KEYS, NUTRIENTS } from "@/lib/nutrition/nutrients";
import { movingAverage, trendChange } from "@/lib/body/weight";
import { records, volume } from "@/lib/training/calc";

const r1 = (v: number) => Math.round(v * 10) / 10;

export async function periodSummary(from: string, to: string, ctx: Ctx) {
  const [entries, goals, weights, water, workouts, cardio, health, exercises] = await Promise.all([
    getDiaryRange(from, to, ctx),
    getGoalsBetween(from, to, ctx),
    getWeights(addDays(from, -6), ctx),
    getWaterRange(from, to, ctx),
    listWorkouts({ from, to, limit: 200 }, ctx),
    listCardio({ from, to }, ctx),
    getHealthRange(from, to, ctx),
    listExercises(ctx),
  ]);

  const days: Record<string, unknown>[] = [];
  const loggedDays: ReturnType<typeof sumItems>[] = [];
  for (let d = from; dayNumberOf(d) <= dayNumberOf(to); d = addDays(d, 1)) {
    const items = entries.filter((e) => e.entry_date === d);
    const totals = sumItems(items);
    if (items.length) loggedDays.push(totals);
    days.push({
      date: d,
      entries: items.length,
      energy_kcal: Math.round(totals.energy_kcal.value),
      protein_g: r1(totals.protein_g.value),
      carbs_g: r1(totals.carbs_g.value),
      fat_g: r1(totals.fat_g.value),
      fiber_g: r1(totals.fiber_g.value),
      fiber_data_for: `${totals.fiber_g.known}/${totals.fiber_g.of} entries`,
      water_ml: water[d] ?? 0,
    });
  }

  const avg = (key: (typeof NUTRIENT_KEYS)[number]) =>
    loggedDays.length ? loggedDays.reduce((s, t) => s + t[key].value, 0) / loggedDays.length : null;
  const nutrientAverages = Object.fromEntries(
    NUTRIENT_KEYS.map((k) => {
      const known = loggedDays.reduce((s, t) => s + t[k].known, 0);
      const of = loggedDays.reduce((s, t) => s + t[k].of, 0);
      const a = avg(k);
      return [k, { avg_per_logged_day: a === null ? null : r1(a), unit: NUTRIENTS[k].unit, entries_with_data: `${known}/${of}` }];
    }),
  );

  const trend = movingAverage(weights.map((w) => ({ date: w.entry_date, weight: w.weight_kg })));
  const inRange = trend.filter((p) => p.date >= from && p.date <= to);
  const change = trendChange(trend);
  const name = new Map(exercises.map((e) => [e.id, e.name_de]));

  return {
    period: { from, to, days_logged: loggedDays.length, days_total: days.length },
    goals,
    nutrition: { daily: days, averages_per_logged_day: nutrientAverages },
    weight: {
      entries: inRange.map((p) => ({ date: p.date, weight_kg: p.weight, avg7_kg: r1(p.average) })),
      trend_change_last_7_days_kg: change ? Math.round(change.change * 100) / 100 : null,
    },
    training: {
      workouts: workouts.map((w) => ({
        date: w.workout_date,
        name: w.name,
        finished: Boolean(w.finished_at),
        volume_kg: Math.round(volume(w.sets)),
        exercises: [...new Set(w.sets.map((s) => s.exercise_id))].map((id) => {
          const sets = w.sets.filter((s) => s.exercise_id === id);
          const rec = records(sets);
          return {
            exercise: name.get(id) ?? id,
            sets: sets.filter((s) => !s.is_warmup).map((s) => `${s.weight_kg}×${s.reps}`).join(", "),
            best_e1rm_kg: rec.best1RM ? r1(rec.best1RM.value) : null,
          };
        }),
      })),
      cardio,
    },
    health,
  };
}
