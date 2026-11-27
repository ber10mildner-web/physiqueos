import Link from "next/link";
import { ensureRoutines } from "@/lib/data/routines";
import { CalendarDays, Camera, ChevronRight, Plus, Quote, Scale, ScanBarcode, Sparkles } from "lucide-react";
import { quoteOfDay } from "@/lib/quotes";
import { claudeLink } from "@/lib/claude-link";
import { getI18n } from "@/lib/i18n/server";
import { fmt } from "@/lib/i18n";
import { getDiaryRange, getGoalOn, getGoalsBetween, getProfile, getWeights } from "@/lib/data";
import { getWater } from "@/lib/data/tracking";
import { listCardio, listCardioTemplates, listPlans, listWorkouts } from "@/lib/data/training";
import { burnForRange } from "@/lib/burn-data";
import { getTimeZone, getToday } from "@/lib/auth";
import { addDays, dayFractionIn, formatDate, startOfWeek } from "@/lib/dates";
import { sumItems } from "@/lib/nutrition/calc";
import { nutrientGaps } from "@/lib/nutrition/gaps";
import { eatenFoods, suggestGapFoods } from "@/lib/nutrition/gap-foods";
import { loadCoach } from "@/lib/coach";
import { CoachCard } from "@/components/coach-card";
import { CheckinCard } from "@/components/checkin-card";
import { loadProgress } from "@/lib/progress-data";
import { goalLabel } from "@/lib/body/goal-label";
import { isoWeekday } from "@/lib/nutrition/goal-days";
import { GoalStatus } from "@/components/goal-status";
import { FastLossWarning } from "@/components/fast-loss-warning";
import { scheduleFor } from "@/lib/training/schedule";
import { movingAverage, trendChange } from "@/lib/body/weight";
import { formatNumber } from "@/lib/format";
import { Card, Page, SectionTitle, buttonClass, cx } from "@/components/ui";
import { DaySummary } from "@/components/day-summary";
import { EnergyBalance } from "@/components/energy-balance";
import { NutrientGaps } from "@/components/nutrient-gaps";
import { WaterCard } from "./nutrition/water-card";
import { TodayTraining } from "./today-training";

export default async function DashboardPage() {
  const { t, locale } = await getI18n();
  const today = await getToday();
  const tomorrow = addDays(today, 1);
  const monday = startOfWeek(today);
  // 28 days back for the calorie check; also covers this week and the nutrient hints.
  const from = addDays(today, -28);
  await ensureRoutines(today);
  const [entries, goal, weights, profile, water, plans, templates, workouts, cardio, goals] = await Promise.all([
    getDiaryRange(from, today),
    getGoalOn(today),
    getWeights(addDays(today, -40)),
    getProfile(),
    getWater(today),
    listPlans(),
    listCardioTemplates(),
    listWorkouts({ from: monday, limit: 50 }),
    listCardio({ from: today }),
    getGoalsBetween(from, today),
  ]);
  const todays = entries.filter((e) => e.entry_date === today);
  const totals = sumItems(todays);
  const fraction = dayFractionIn(await getTimeZone());
  const burn = (await burnForRange(today, today, { [today]: totals.energy_kcal.value }, undefined, { date: today, fraction }))[today];
  const trend = movingAverage(weights.map((w) => ({ date: w.entry_date, weight: w.weight_kg })));
  const latest = trend.at(-1);
  const change = trendChange(trend);
  const schedule = { plans, templates, workouts, cardio };
  const hasActive = workouts.some((w) => !w.finished_at);

  // nutrient hints from the last 7 complete days
  const pastDays: ReturnType<typeof sumItems>[] = [];
  for (let d = addDays(today, -7); d < today; d = addDays(d, 1)) {
    const items = entries.filter((e) => e.entry_date === d);
    if (items.length) pastDays.push(sumItems(items));
  }
  const gaps = nutrientGaps(pastDays, profile?.sex ?? null, goal?.fiber_g);
  const lang = locale.startsWith("de") ? "de" : "en";
  const eaten = eatenFoods(entries.filter((e) => e.entry_date >= addDays(today, -28) && e.entry_date < today));
  const gapFoods = Object.fromEntries(gaps.gaps.slice(0, 2).map((g) => [g.key, suggestGapFoods(g, eaten, lang)]));
  const coach = await loadCoach(today, undefined, { weights, entries, goals, goalToday: goal, profile });
  // Sunday: weekly check-in (weight, waist, strength, protein, photos against the goal)
  const isSunday = isoWeekday(today) === 7;
  const progress = isSunday ? await loadProgress(today, coach, undefined, entries) : null;

  // this week so far
  const weekDays = [...new Set(entries.filter((e) => e.entry_date >= monday).map((e) => e.entry_date))];
  const weekKcal = weekDays.length ? weekDays.reduce((s, d) => s + sumItems(entries.filter((e) => e.entry_date === d)).energy_kcal.value, 0) / weekDays.length : null;

  const actions = [
    { href: `/nutrition/add?tab=scan`, label: t.dashboard.scan, icon: ScanBarcode },
    { href: `/nutrition/add`, label: t.dashboard.addFood, icon: Plus },
    { href: `/body`, label: t.dashboard.logWeight, icon: Scale },
    { href: `/body/photos`, label: t.dashboard.addPhoto, icon: Camera },
  ];

  return (
    <Page>
      <header className="mb-5 pt-2">
        <p className="text-sm text-muted">{formatDate(today, locale, { weekday: "long", day: "numeric", month: "long" })}</p>
        <h1 className="text-[28px] font-semibold tracking-tight">
          {profile?.display_name ? `${t.dashboard.greeting}, ${profile.display_name}` : t.dashboard.greeting}
        </h1>
      </header>

      <div className="space-y-4">
        <figure className="flex gap-3 rounded-3xl border border-line bg-surface px-4 py-3.5">
          <Quote className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
          <div>
            <figcaption className="text-xs text-muted">{t.quote.title}</figcaption>
            <blockquote className="mt-0.5 text-[15px] leading-snug">{quoteOfDay(today, locale)}</blockquote>
          </div>
        </figure>

        <Card>
          <DaySummary totals={totals} goal={goal} t={t} locale={locale} entries={todays.map(({ food_name, amount_g, nutrients_per_100g }) => ({ food_name, amount_g, nutrients_per_100g }))} />
          {!goal && (
            <Link href="/settings" className={cx(buttonClass("primary", "sm"), "mt-4 w-full")}>
              {t.dashboard.setGoal}
            </Link>
          )}
        </Card>

        <div className="grid grid-cols-4 gap-2">
          {actions.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="flex flex-col items-center justify-start gap-2 rounded-3xl border border-line bg-surface px-1 py-4 text-center text-xs leading-tight text-muted transition hover:bg-surface-2 active:scale-[0.97]">
              <Icon className="size-[22px] text-accent" strokeWidth={1.9} />
              {label}
            </Link>
          ))}
        </div>

        <Card>
          <SectionTitle action={<Link href="/training" className="text-xs text-muted hover:text-text">{t.schedule.all}</Link>}>{t.schedule.title}</SectionTitle>
          <TodayTraining today={scheduleFor(today, schedule)} tomorrow={scheduleFor(tomorrow, schedule)} hasActive={hasActive} t={t} locale={locale} />
          {plans.length > 0 && plans.every((p) => p.schedule_days.length === 0) && <p className="mt-3 text-xs text-faint">{t.schedule.setDaysHint}</p>}
        </Card>

        <Card>
          <SectionTitle>{t.burn.title}</SectionTitle>
          <EnergyBalance intake={totals.energy_kcal.value} burn={burn} isToday t={t} locale={locale} />
        </Card>

        {profile?.water_tracking && (
          <Card>
            <WaterCard date={today} totalMl={water} targetMl={profile.water_target_ml ?? 2500} compact />
          </Card>
        )}

        <Link href="/week" className="block">
          <Card className="flex items-center gap-3 transition hover:bg-surface-2/60">
            <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-surface-2">
              <CalendarDays className="size-5 text-accent" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium">{t.week.title}</div>
              <div className="num truncate text-xs text-muted">
                {fmt(t.week.teaser, {
                  days: weekDays.length,
                  kcal: weekKcal === null ? "–" : formatNumber(weekKcal, locale),
                  workouts: workouts.length,
                })}
              </div>
            </div>
            <ChevronRight className="size-5 text-faint" />
          </Card>
        </Link>

        <Card>
          <SectionTitle>{t.gaps.title}</SectionTitle>
          <NutrientGaps result={gaps} t={t} locale={locale} limit={2} foods={gapFoods} />
        </Card>

        <Link href="/body" className="block">
          <Card className="transition hover:bg-surface-2/60">
            <SectionTitle>{t.dashboard.weight}</SectionTitle>
            {latest ? (
              <div className="flex items-end justify-between">
                <div>
                  <div className="num text-3xl font-semibold tracking-tight">
                    {formatNumber(latest.average, locale, 1)}
                    <span className="ml-1 text-base font-normal text-muted">kg</span>
                  </div>
                  <div className="text-xs text-muted">{t.dashboard.trend7}</div>
                </div>
                {change && (
                  <div className="text-right">
                    <div className={cx("num text-lg font-medium", change.change <= 0 ? "text-fiber" : "text-carbs")}>
                      {change.change > 0 ? "+" : ""}
                      {formatNumber(change.change, locale, 2)} kg
                    </div>
                    <div className="text-xs text-muted">{t.dashboard.weekChange}</div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted">{t.dashboard.noWeight}</p>
            )}
            <GoalStatus coach={coach} t={t} locale={locale} compact />
          </Card>
        </Link>

        {/* on Sundays the check-in already says "too fast" */}
        {progress?.verdict !== "too_fast" && progress?.verdict !== "muscle_risk" && (
          <Link href="/body" className="block">
            <FastLossWarning warning={coach.fastLoss} t={t} locale={locale} compact />
          </Link>
        )}

        {progress && <CheckinCard progress={progress} goalLabel={goalLabel(coach.goal, t)} t={t} locale={locale} variant="sunday" />}

        <CoachCard coach={coach} />

        <Card>
          <SectionTitle>
            <span className="inline-flex items-center gap-2">
              <Sparkles className="size-4 text-accent" /> {t.askClaude.title}
            </span>
          </SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                [t.askClaude.week, t.askClaude.weekPrompt],
                [t.askClaude.training, t.askClaude.trainingPrompt],
                [t.askClaude.food, t.askClaude.foodPrompt],
                [t.askClaude.skin, t.askClaude.skinPrompt],
              ] as const
            ).map(([label, prompt]) => (
              <a key={label} href={claudeLink(prompt)} target="_blank" rel="noreferrer" className={buttonClass("secondary", "sm")}>
                {label}
              </a>
            ))}
          </div>
          <p className="mt-2 text-xs text-faint">{t.askClaude.hint}</p>
        </Card>
      </div>
    </Page>
  );
}
