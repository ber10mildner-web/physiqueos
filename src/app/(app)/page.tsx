import Link from "next/link";
import { ensureRoutines } from "@/lib/data/routines";
import { ScanBarcode, Plus, Scale, Camera, Quote, Sparkles } from "lucide-react";
import { quoteOfDay } from "@/lib/quotes";
import { getI18n } from "@/lib/i18n/server";
import { getDiary, getGoalOn, getProfile, getWeights } from "@/lib/data";
import { getToday } from "@/lib/auth";
import { addDays, formatDate } from "@/lib/dates";
import { sumItems } from "@/lib/nutrition/calc";
import { movingAverage, trendChange } from "@/lib/body/weight";
import { formatNumber } from "@/lib/format";
import { Card, Page, SectionTitle, buttonClass, cx } from "@/components/ui";
import { DaySummary } from "@/components/day-summary";

export default async function DashboardPage() {
  const { t, locale } = await getI18n();
  const today = await getToday();
  await ensureRoutines(today);
  const [entries, goal, weights, profile] = await Promise.all([getDiary(today), getGoalOn(today), getWeights(addDays(today, -40)), getProfile()]);
  const totals = sumItems(entries);
  const trend = movingAverage(weights.map((w) => ({ date: w.entry_date, weight: w.weight_kg })));
  const latest = trend.at(-1);
  const change = trendChange(trend);

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
          <DaySummary totals={totals} goal={goal} t={t} locale={locale} />
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
          </Card>
        </Link>

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

/** Opens a new Claude chat with the question already filled in. */
function claudeLink(prompt: string) {
  return `https://claude.ai/new?q=${encodeURIComponent(prompt)}`;
}
