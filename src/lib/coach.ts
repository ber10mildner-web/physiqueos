import "server-only";
/**
 * "Coach": weight trend rate + goal forecast and the adaptive calorie suggestion,
 * shared by the start page, the body page, settings and the MCP server.
 */
import type { Ctx } from "@/lib/data";
import { getDiaryRange, getGoalOn, getGoalsBetween, getProfile, getWeights } from "@/lib/data";
import { getBodyGoal, type BodyGoal } from "@/lib/data/body-goal";
import type { DiaryEntry, NutritionGoal, Profile, WeightEntry } from "@/lib/data/types";
import { addDays } from "@/lib/dates";
import { sumItems } from "@/lib/nutrition/calc";
import { isoWeekday } from "@/lib/nutrition/goal-days";
import { ageFromBirthDate, bmrMifflinStJeor } from "@/lib/nutrition/energy";
import { WINDOW_DAYS, estimateTdee, suggestTarget, type DayIntake, type TargetSuggestion, type TdeeResult } from "@/lib/nutrition/adaptive";
import { forecastLine, goalEta, wantedRate, weightRate, type Eta, type Rate } from "@/lib/body/forecast";
import type { WeightPoint } from "@/lib/body/weight";

export interface Coach {
  goal: BodyGoal;
  /** Trend rate over the last 28 days (null without enough weigh-ins). */
  rate: Rate | null;
  /** Smoothed current weight (fitted line, else the latest weigh-in). */
  current: number | null;
  eta: Eta | null;
  /** Signed wanted pace from goal weight and pace (kg/week). */
  wanted: number | null;
  forecast: WeightPoint[];
  tdee: TdeeResult;
  suggestion: TargetSuggestion | null;
  /** Goal in effect today. */
  nutritionGoal: NutritionGoal | null;
}

export interface CoachInput {
  today: string;
  weights: WeightEntry[];
  /** Diary entries covering at least the last 28 days before today. */
  entries: DiaryEntry[];
  goals: NutritionGoal[];
  goalToday: NutritionGoal | null;
  profile: Profile | null;
  bodyGoal: BodyGoal;
}

function floorKcal(profile: Profile | null, weight: number, today: string): number {
  const fallback = profile?.sex === "female" ? 1200 : 1500;
  if (!profile?.sex || !profile.birth_date || !profile.height_cm) return fallback;
  try {
    const bmr = bmrMifflinStJeor({ sex: profile.sex, ageYears: ageFromBirthDate(profile.birth_date, new Date(`${today}T12:00:00Z`)), heightCm: profile.height_cm, weightKg: weight });
    return Math.max(fallback, Math.round(bmr / 10) * 10);
  } catch {
    return fallback;
  }
}

export function buildCoach(input: CoachInput): Coach {
  const { today, bodyGoal } = input;
  const points = input.weights.map((w) => ({ date: w.entry_date, weight: w.weight_kg }));
  const rate = weightRate(points, today);
  const current = rate?.fittedNow ?? points.at(-1)?.weight ?? null;
  const goalKg = bodyGoal.goal_weight_kg;
  const eta = rate && goalKg !== null ? goalEta(rate.fittedNow, goalKg, rate.kgPerWeek, today) : null;
  const wanted = current !== null ? wantedRate(current, goalKg, bodyGoal.goal_pace_kg_week) : null;

  const goalOn = (d: string) => {
    const g = input.goals.filter((x) => x.valid_from <= d).at(-1) ?? null;
    if (!g) return null;
    return (g.alt && g.alt_days.includes(isoWeekday(d)) ? g.alt : g.base).energy_kcal;
  };
  const days: DayIntake[] = [];
  for (let d = addDays(today, -WINDOW_DAYS); d < today; d = addDays(d, 1)) {
    const items = input.entries.filter((e) => e.entry_date === d);
    if (items.length) days.push({ date: d, kcal: sumItems(items).energy_kcal.value, target: goalOn(d) });
  }
  const tdee = estimateTdee(days, points, today);
  const g = input.goalToday;
  const suggestion =
    tdee.ok && g && current !== null
      ? suggestTarget({
          estimate: tdee.estimate,
          currentWeight: current,
          goalWeightKg: goalKg,
          paceKgWeek: bodyGoal.goal_pace_kg_week,
          phase: g.phase,
          base: g.base,
          alt: g.alt,
          altDays: g.alt_days,
          floorKcal: floorKcal(input.profile, current, today),
        })
      : null;
  return { goal: bodyGoal, rate, current, eta, wanted, forecast: rate ? forecastLine(rate, goalKg, today) : [], tdee, suggestion, nutritionGoal: g };
}

/** Loads everything the coach needs. Pass already loaded data to save queries. */
export async function loadCoach(today: string, ctx?: Ctx, preloaded: Partial<Omit<CoachInput, "today">> = {}): Promise<Coach> {
  const from = addDays(today, -WINDOW_DAYS);
  const [weights, entries, goals, goalToday, profile, bodyGoal] = await Promise.all([
    preloaded.weights ?? getWeights(addDays(today, -WINDOW_DAYS - 1), ctx),
    preloaded.entries ?? getDiaryRange(from, addDays(today, -1), ctx),
    preloaded.goals ?? getGoalsBetween(from, today, ctx),
    preloaded.goalToday !== undefined ? preloaded.goalToday : getGoalOn(today, ctx),
    preloaded.profile !== undefined ? preloaded.profile : getProfile(ctx),
    preloaded.bodyGoal ?? getBodyGoal(ctx),
  ]);
  return buildCoach({ today, weights, entries, goals, goalToday, profile, bodyGoal });
}
