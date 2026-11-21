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
import { getMedicationLogs, getSkinRange } from "@/lib/data/wellbeing";
import { withKcalEstimates } from "@/lib/cardio";
import { isoWeekday } from "@/lib/nutrition/goal-days";
import { addDays } from "@/lib/dates";
import { dayNumber as dayNumberOf } from "@/lib/body/weight";
import { sumItems } from "@/lib/nutrition/calc";
import { NUTRIENT_KEYS, NUTRIENTS } from "@/lib/nutrition/nutrients";
import { movingAverage, trendChange } from "@/lib/body/weight";
import { records, volume, workoutMinutes } from "@/lib/training/calc";

const r1 = (v: number) => Math.round(v * 10) / 10;

export async function periodSummary(from: string, to: string, ctx: Ctx) {
  const [entries, goals, weights, water, workouts, rawCardio, health, exercises, skin, medLogs] = await Promise.all([
    getDiaryRange(from, to, ctx),
    getGoalsBetween(from, to, ctx),
    getWeights(addDays(from, -6), ctx),
    getWaterRange(from, to, ctx),
    listWorkouts({ from, to, limit: 200 }, ctx),
    listCardio({ from, to }, ctx),
    getHealthRange(from, to, ctx),
    listExercises(ctx),
    getSkinRange(from, to, ctx),
    getMedicationLogs(from, to, ctx),
  ]);
  const cardio = await withKcalEstimates(rawCardio, ctx);
  const goalFor = (d: string) => {
    const g = goals.filter((x) => x.valid_from <= d).at(-1) ?? goals[0];
    if (!g) return null;
    const alt = g.alt && g.alt_days.includes(isoWeekday(d));
    return { ...(alt ? g.alt! : g.base), alt_day: Boolean(alt) };
  };

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
      goal: goalFor(d),
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
    goals: goals.map((g) => ({ valid_from: g.valid_from, phase: g.phase, normal_days: g.base, special_weekdays_iso: g.alt_days, special_day_targets: g.alt })),
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
        duration_min: workoutMinutes(w.started_at, w.finished_at),
        rating: { feeling: w.feeling, energy: w.energy, effort: w.effort, note: w.rating_note },
        volume_kg: Math.round(volume(w.sets)),
        exercises: [...new Set(w.sets.map((s) => s.exercise_id))].map((id) => {
          const sets = w.sets.filter((s) => s.exercise_id === id);
          const rec = records(sets);
          return {
            exercise: name.get(id) ?? id,
            sets: sets.filter((s) => !s.is_warmup).map((s) => `${s.weight_kg}×${s.reps}`).join(", "),
            best_e1rm_kg: rec.best1RM ? r1(rec.best1RM.value) : null,
            feeling: w.exercise_notes.find((n) => n.exercise_id === id)?.feeling ?? null,
            note: w.exercise_notes.find((n) => n.exercise_id === id)?.note ?? null,
          };
        }),
      })),
      cardio: cardio.map(({ machine_photo_path, estimate, ...c }) => ({ ...c, has_display_photo: Boolean(machine_photo_path), kcal_estimate: estimate?.kcal ?? null })),
    },
    health,
    skin,
    medication_taken: medLogs.map((l) => ({ date: l.entry_date, name: l.name, dose: l.dose })),
  };
}
