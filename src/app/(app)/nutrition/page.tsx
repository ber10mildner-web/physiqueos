import Link from "next/link";
import { ensureRoutines } from "@/lib/data/routines";
import { BookOpen, ChevronRight, ScanBarcode } from "lucide-react";
import { getI18n } from "@/lib/i18n/server";
import { getDiary, getGoalOn, getLatestWeight, getLoggedDates, getProfile } from "@/lib/data";
import { getQuickPicks, getWater } from "@/lib/data/tracking";
import { getToday } from "@/lib/auth";
import { addDays, formatDate, isIsoDate, startOfWeek } from "@/lib/dates";
import { sumItems } from "@/lib/nutrition/calc";
import { rankForMeal } from "@/lib/nutrition/quick-picks";
import { proteinPerMealTarget } from "@/lib/nutrition/protein-meals";
import { MEALS } from "@/lib/data/types";
import { Card, Page, PageHeader, buttonClass } from "@/components/ui";
import { DaySummary } from "@/components/day-summary";
import { NutrientDetails } from "./nutrient-details";
import { WaterCard } from "./water-card";
import { CopyMealButton } from "./copy-meal-button";
import { MealCard } from "./meal-card";
import { WeekStrip } from "./week-strip";
import { ProteinMeals } from "./protein-meals";

export default async function NutritionPage({ searchParams }: PageProps<"/nutrition">) {
  const { t, locale } = await getI18n();
  const today = await getToday();
  const sp = await searchParams;
  const date = isIsoDate(sp.date) && sp.date <= today ? sp.date : today;
  await ensureRoutines(today);
  const monday = startOfWeek(date);
  const [entries, goal, water, profile, picks, logged, weight] = await Promise.all([
    getDiary(date),
    getGoalOn(date),
    getWater(date),
    getProfile(),
    getQuickPicks(today),
    getLoggedDates(monday, addDays(monday, 6)),
    getLatestWeight(),
  ]);
  const totals = sumItems(entries);
  const proteinTarget = proteinPerMealTarget(weight?.weight_kg ?? null, goal?.protein_g ?? null);
  const favoriteIds = new Set(picks.filter((p) => p.favorite && p.kind === "food").map((p) => p.id));
  const label =
    date === today ? t.common.today : date === addDays(today, -1) ? t.common.yesterday : formatDate(date, locale, { weekday: "long", day: "numeric", month: "long" });

  return (
    <Page>
      <PageHeader
        title={t.nutrition.title}
        subtitle={label}
        action={
          <Link href={`/nutrition/add?date=${date}&tab=scan`} className={buttonClass("secondary", "sm")} aria-label={t.dashboard.scan}>
            <ScanBarcode className="size-4" />
            {t.dashboard.scan}
          </Link>
        }
      />
      <WeekStrip date={date} today={today} logged={logged} locale={locale} t={t} />

      <div className="space-y-4">
        <Card>
          <DaySummary totals={totals} goal={goal} t={t} locale={locale} />
        </Card>

        {entries.length === 0 && (
          <div className="flex justify-center">
            <CopyMealButton fromDate={addDays(date, -1)} toDate={date} meal={null} />
          </div>
        )}

        {MEALS.map((meal) => (
          <MealCard
            key={meal}
            meal={meal}
            items={entries.filter((e) => e.meal === meal)}
            date={date}
            picks={rankForMeal(picks, meal, 12)}
            proteinTarget={proteinTarget}
            favoriteIds={favoriteIds}
            t={t}
            locale={locale}
          />
        ))}

        {entries.length > 0 && (
          <Card>
            <ProteinMeals entries={entries} target={proteinTarget} weightKnown={Boolean(weight)} t={t} locale={locale} />
          </Card>
        )}

        <Card>
          <WaterCard date={date} totalMl={water} targetMl={profile?.water_target_ml ?? 2500} />
        </Card>

        <Link href="/nutrition/recipes" className="block">
          <Card className="flex items-center gap-3 transition hover:bg-surface-2">
            <div className="grid size-11 place-items-center rounded-2xl bg-surface-3">
              <BookOpen className="size-5 text-accent" />
            </div>
            <div className="flex-1 font-medium">{t.recipes.title}</div>
            <ChevronRight className="size-5 text-faint" />
          </Card>
        </Link>

        {entries.length > 0 && (
          <Card>
            <NutrientDetails totals={totals} t={t} locale={locale} />
          </Card>
        )}
      </div>
    </Page>
  );
}
