import "server-only";
/** Weekly summary (Monday–Sunday) for the app's week page and the start page. */
import type { Ctx } from "@/lib/data";
import { getDiaryRange, getGoalsBetween, getProfile, getWeights } from "@/lib/data";
import { getWaterRange } from "@/lib/data/tracking";
import { getHealthRange } from "@/lib/data/health";
import { listCardio, listWorkouts } from "@/lib/data/training";
import { burnForRange } from "@/lib/burn-data";
import { addDays } from "@/lib/dates";
import { sumItems, type NutrientTotals } from "@/lib/nutrition/calc";
import { nutrientGaps } from "@/lib/nutrition/gaps";
import { eatenFoods, suggestGapFoods } from "@/lib/nutrition/gap-foods";
import { isoWeekday } from "@/lib/nutrition/goal-days";
import { movingAverage } from "@/lib/body/weight";
import { volume } from "@/lib/training/calc";

export interface WeekDay {
  date: string;
  kcal: number;
  protein: number;
  entries: number;
  target: number | null;
  burn: number | null;
  water: number;
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);

export async function weekSummary(monday: string, today: string, ctx?: Ctx, lang: "de" | "en" = "de") {
  const sunday = addDays(monday, 6);
  const last = sunday < today ? sunday : today;
  const [entries, goals, weights, water, health, workouts, cardio, profile] = await Promise.all([
    getDiaryRange(monday, last, ctx),
    getGoalsBetween(monday, last, ctx),
    getWeights(addDays(monday, -13), ctx),
    getWaterRange(monday, last, ctx),
    getHealthRange(monday, last, ctx),
    listWorkouts({ from: monday, to: last, limit: 100 }, ctx),
    listCardio({ from: monday, to: last }, ctx),
    getProfile(ctx),
  ]);
  const goalOn = (d: string) => {
    const g = goals.filter((x) => x.valid_from <= d).at(-1) ?? goals[0];
    if (!g) return null;
    return g.alt && g.alt_days.includes(isoWeekday(d)) ? g.alt : g.base;
  };

  const totalsByDay: Record<string, NutrientTotals> = {};
  const intake: Record<string, number> = {};
  for (let d = monday; d <= last; d = addDays(d, 1)) {
    totalsByDay[d] = sumItems(entries.filter((e) => e.entry_date === d));
    intake[d] = totalsByDay[d].energy_kcal.value;
  }
  const burns = await burnForRange(monday, last, intake, ctx);

  const days: WeekDay[] = [];
  for (let d = monday; d <= sunday; d = addDays(d, 1)) {
    const t = totalsByDay[d];
    days.push({
      date: d,
      kcal: t ? Math.round(t.energy_kcal.value) : 0,
      protein: t ? Math.round(t.protein_g.value) : 0,
      entries: t ? t.energy_kcal.of : 0,
      target: goalOn(d)?.energy_kcal ?? null,
      burn: burns[d]?.total ?? null,
      water: water[d] ?? 0,
    });
  }
  const logged = days.filter((d) => d.entries > 0);
  const loggedTotals = logged.map((d) => totalsByDay[d.date]);
  const withBurn = logged.filter((d) => d.burn !== null);

  const trend = movingAverage(weights.map((w) => ({ date: w.entry_date, weight: w.weight_kg })));
  const startAvg = trend.filter((p) => p.date < monday).at(-1)?.average ?? null;
  const endAvg = trend.filter((p) => p.date <= last).at(-1)?.average ?? null;
  const weighIns = weights.filter((w) => w.entry_date >= monday && w.entry_date <= last).length;

  const fiberGoal = goalOn(last)?.fiber_g ?? null;
  const gaps = nutrientGaps(loggedTotals, profile?.sex ?? null, fiberGoal);
  const eaten = eatenFoods(entries);
  const gapFoods = Object.fromEntries(gaps.gaps.slice(0, 5).map((g) => [g.key, suggestGapFoods(g, eaten, lang)]));
  return {
    monday,
    sunday,
    complete: sunday < today,
    days,
    loggedDays: logged.length,
    elapsedDays: days.filter((d) => d.date <= last).length,
    avgKcal: avg(logged.map((d) => d.kcal)),
    avgTarget: avg(logged.map((d) => d.target).filter((x): x is number => x !== null)),
    avgProtein: avg(logged.map((d) => d.protein)),
    proteinGoal: goalOn(last)?.protein_g ?? null,
    avgFiber: avg(loggedTotals.map((t) => t.fiber_g.value)),
    fiberGoal,
    avgWater: avg(days.filter((d) => d.date <= last && d.water > 0).map((d) => d.water)),
    waterTarget: profile?.water_target_ml ?? 2500,
    balance: withBurn.length ? withBurn.reduce((s, d) => s + d.kcal - d.burn!, 0) : null,
    balanceDays: withBurn.length,
    weight: { start: startAvg, end: endAvg, change: startAvg !== null && endAvg !== null ? endAvg - startAvg : null, weighIns },
    training: {
      workouts: workouts.length,
      volumeKg: workouts.reduce((s, w) => s + volume(w.sets), 0),
      cardioSessions: cardio.length,
      cardioMin: cardio.reduce((s, c) => s + c.duration_min, 0),
    },
    health: {
      sleepScore: avg(health.map((h) => h.sleep_score).filter((x): x is number => x !== null)),
      sleepMin: avg(health.map((h) => h.sleep_minutes).filter((x): x is number => x !== null)),
      steps: avg(health.map((h) => h.steps).filter((x): x is number => x !== null)),
    },
    gaps,
    gapFoods,
  };
}

export type WeekSummary = Awaited<ReturnType<typeof weekSummary>>;
