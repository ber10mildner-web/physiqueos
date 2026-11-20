import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, ScanBarcode } from "lucide-react";
import { getI18n } from "@/lib/i18n/server";
import { fmt } from "@/lib/i18n";
import { getDiary, getGoalOn, getProfile } from "@/lib/data";
import { getWater } from "@/lib/data/tracking";
import { getToday } from "@/lib/auth";
import { addDays, formatDate, isIsoDate } from "@/lib/dates";
import { sumItems } from "@/lib/nutrition/calc";
import { MEALS } from "@/lib/data/types";
import { formatNumber } from "@/lib/format";
import { Card, Page, PageHeader, buttonClass } from "@/components/ui";
import { DaySummary } from "@/components/day-summary";
import { EntryRow } from "./entry-row";
import { NutrientDetails } from "./nutrient-details";
import { WaterCard } from "./water-card";
import { CopyMealButton } from "./copy-meal-button";
import { BookOpen } from "lucide-react";

export default async function NutritionPage({ searchParams }: PageProps<"/nutrition">) {
  const { t, locale } = await getI18n();
  const today = await getToday();
  const sp = await searchParams;
  const date = isIsoDate(sp.date) ? sp.date : today;
  const [entries, goal, water, profile] = await Promise.all([getDiary(date), getGoalOn(date), getWater(date), getProfile()]);
  const totals = sumItems(entries);
  const label =
    date === today ? t.common.today : date === addDays(today, -1) ? t.common.yesterday : formatDate(date, locale, { weekday: "long", day: "numeric", month: "long" });

  return (
    <Page>
      <PageHeader
        title={t.nutrition.title}
        action={
          <Link href={`/nutrition/add?date=${date}&tab=scan`} className={buttonClass("secondary", "sm")} aria-label={t.dashboard.scan}>
            <ScanBarcode className="size-4" />
            {t.dashboard.scan}
          </Link>
        }
      />
      <div className="mb-4 flex items-center justify-between rounded-2xl bg-surface p-1">
        <Link href={`/nutrition?date=${addDays(date, -1)}`} className="grid size-10 place-items-center rounded-xl text-muted hover:bg-surface-2" aria-label={t.common.previousDay}>
          <ChevronLeft className="size-5" />
        </Link>
        <span className="font-medium">{label}</span>
        {date < today ? (
          <Link href={`/nutrition?date=${addDays(date, 1)}`} className="grid size-10 place-items-center rounded-xl text-muted hover:bg-surface-2" aria-label={t.common.nextDay}>
            <ChevronRight className="size-5" />
          </Link>
        ) : (
          <span className="size-10" />
        )}
      </div>

      <div className="space-y-4">
        <Card>
          <DaySummary totals={totals} goal={goal} t={t} locale={locale} />
        </Card>

        {MEALS.map((meal) => {
          const items = entries.filter((e) => e.meal === meal);
          const kcal = sumItems(items).energy_kcal.value;
          return (
            <Card key={meal} className="p-0">
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <h2 className="font-semibold">{t.meals[meal]}</h2>
                <div className="flex items-center gap-2">
                  {items.length > 0 && <span className="num text-sm text-muted">{formatNumber(kcal, locale)} kcal</span>}
                  <Link
                    href={`/nutrition/add?date=${date}&meal=${meal}`}
                    className="grid size-8 place-items-center rounded-full bg-surface-3 text-accent hover:brightness-110"
                    aria-label={fmt(t.nutrition.addTo, { meal: t.meals[meal] })}
                  >
                    <Plus className="size-4" />
                  </Link>
                </div>
              </div>
              {items.length > 0 ? (
                <ul className="divide-y divide-line border-t border-line">
                  {items.map((e) => (
                    <EntryRow key={e.id} entry={e} />
                  ))}
                </ul>
              ) : (
                <div className="px-4 pb-4">
                  <CopyMealButton fromDate={addDays(date, -1)} toDate={date} meal={meal} />
                </div>
              )}
            </Card>
          );
        })}

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
