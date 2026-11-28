import Link from "next/link";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { getI18n } from "@/lib/i18n/server";
import { fmt } from "@/lib/i18n";
import { getToday } from "@/lib/auth";
import { addDays, formatDate, isIsoDate, startOfWeek } from "@/lib/dates";
import { weekSummary } from "@/lib/week";
import { claudeLink } from "@/lib/claude-link";
import { formatNumber } from "@/lib/format";
import { Card, Page, PageHeader, ProgressBar, SectionTitle, buttonClass, cx } from "@/components/ui";
import { NutrientGaps } from "@/components/nutrient-gaps";
import { DayTagChips } from "@/components/day-note-card";
import { getDayNotes } from "@/lib/data/day-notes";

export default async function WeekPage({ searchParams }: PageProps<"/week">) {
  const { t, locale } = await getI18n();
  const today = await getToday();
  const sp = await searchParams;
  const thisMonday = startOfWeek(today);
  const monday = isIsoDate(sp.start) && sp.start <= today ? startOfWeek(sp.start) : thisMonday;
  const [w, notes] = await Promise.all([weekSummary(monday, today, undefined, locale === "en" ? "en" : "de"), getDayNotes(monday, addDays(monday, 6))]);
  const n = (v: number | null, d = 0) => (v === null ? "–" : formatNumber(v, locale, d));
  const range = `${formatDate(w.monday, locale, { day: "numeric", month: "short" })} – ${formatDate(w.sunday, locale, { day: "numeric", month: "short" })}`;
  const maxKcal = Math.max(1, ...w.days.map((d) => Math.max(d.kcal, d.target ?? 0, d.burn ?? 0)));
  const prompt = fmt(t.week.claudePrompt, { from: w.monday, to: w.sunday });

  return (
    <Page>
      <PageHeader title={t.week.title} subtitle={w.complete ? range : `${range} · ${t.week.running}`} back={{ href: "/", label: t.nav.dashboard }} />
      <div className="mb-4 flex items-center justify-between rounded-2xl bg-surface p-1">
        <Link href={`/week?start=${addDays(monday, -7)}`} className="grid size-10 place-items-center rounded-xl text-muted hover:bg-surface-2" aria-label={t.week.previous}>
          <ChevronLeft className="size-5" />
        </Link>
        <span className="text-sm font-medium">{monday === thisMonday ? t.week.thisWeek : monday === addDays(thisMonday, -7) ? t.week.lastWeek : range}</span>
        {monday < thisMonday ? (
          <Link href={`/week?start=${addDays(monday, 7)}`} className="grid size-10 place-items-center rounded-xl text-muted hover:bg-surface-2" aria-label={t.week.next}>
            <ChevronRight className="size-5" />
          </Link>
        ) : (
          <span className="size-10" />
        )}
      </div>

      <div className="space-y-4">
        <Card>
          <SectionTitle>{t.week.calories}</SectionTitle>
          <div className="flex h-36 items-end gap-2">
            {w.days.map((d) => {
              const future = d.date > today;
              const over = d.target !== null && d.kcal > d.target * 1.05;
              return (
                <div key={d.date} className={cx("flex flex-1 flex-col items-center gap-1", future && "opacity-30")}>
                  <div className="relative flex h-28 w-full items-end justify-center rounded-xl bg-surface-2">
                    {d.target !== null && <div className="absolute inset-x-1 border-t border-dashed border-faint" style={{ bottom: `${(d.target / maxKcal) * 100}%` }} />}
                    {d.burn !== null && d.entries > 0 && <div className="absolute inset-x-0 h-0.5 rounded bg-carbs" style={{ bottom: `${(d.burn / maxKcal) * 100}%` }} />}
                    <div className={cx("w-3/5 rounded-t-lg", over ? "bg-danger/80" : "bg-accent")} style={{ height: `${(d.kcal / maxKcal) * 100}%` }} />
                  </div>
                  <span className="text-[11px] text-muted">{formatDate(d.date, locale, { weekday: "short" })}</span>
                </div>
              );
            })}
          </div>
          <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-faint">
            <span className="inline-flex items-center gap-1"><span className="size-2 rounded-sm bg-accent" /> {t.burn.eaten}</span>
            <span className="inline-flex items-center gap-1"><span className="h-0.5 w-3 bg-carbs" /> {t.burn.burned}</span>
            <span className="inline-flex items-center gap-1"><span className="w-3 border-t border-dashed border-faint" /> {t.dashboard.target}</span>
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Stat label={t.week.avgKcal} value={n(w.avgKcal)} sub={w.avgTarget !== null ? `${t.dashboard.target} ${n(w.avgTarget)}` : undefined} />
            <Stat label={t.week.daysLogged} value={`${w.loggedDays}/${w.elapsedDays}`} />
            <Stat
              label={t.burn.balance}
              value={w.balance === null ? "–" : `${w.balance > 0 ? "+" : ""}${n(w.balance)}`}
              sub={w.balance !== null ? fmt(t.week.balanceDays, { n: w.balanceDays }) : undefined}
              tone={w.balance === null ? undefined : w.balance > 0 ? "text-carbs" : "text-fiber"}
            />
          </div>
        </Card>

        <Card>
          <SectionTitle>{t.week.nutrition}</SectionTitle>
          <div className="space-y-3">
            <Bar label={t.nutrients.protein_g} value={w.avgProtein} goal={w.proteinGoal} unit="g" color="var(--protein)" locale={locale} />
            <Bar label={t.nutrients.fiber_g} value={w.avgFiber} goal={w.fiberGoal} unit="g" color="var(--fiber)" locale={locale} />
            {w.waterTracking && <Bar label={t.tracking.water} value={w.avgWater === null ? null : w.avgWater / 1000} goal={w.waterTarget / 1000} unit="l" color="var(--protein)" locale={locale} decimals={1} />}
          </div>
          <p className="mt-2 text-[11px] text-faint">{t.week.avgHint}</p>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <Card>
            <SectionTitle>{t.dashboard.weight}</SectionTitle>
            <div className={cx("num text-2xl font-semibold", w.weight.change !== null && (w.weight.change <= 0 ? "text-fiber" : "text-carbs"))}>
              {w.weight.change === null ? "–" : `${w.weight.change > 0 ? "+" : ""}${formatNumber(w.weight.change, locale, 2)} kg`}
            </div>
            <p className="mt-1 text-xs text-muted">
              {w.weight.end !== null ? `Ø ${formatNumber(w.weight.end, locale, 1)} kg · ` : ""}
              {fmt(t.week.weighIns, { n: w.weight.weighIns })}
            </p>
          </Card>
          <Card>
            <SectionTitle>{t.training.title}</SectionTitle>
            <div className="num text-2xl font-semibold">{w.training.workouts}× <span className="text-base font-normal text-muted">Gym</span></div>
            <p className="mt-1 text-xs text-muted">
              {formatNumber(w.training.volumeKg / 1000, locale, 1)} t · {fmt(t.week.cardio, { n: w.training.cardioSessions, min: formatNumber(w.training.cardioMin, locale) })}
            </p>
          </Card>
        </div>

        {(w.health.sleepScore !== null || w.health.steps !== null) && (
          <Card>
            <SectionTitle>{t.week.recovery}</SectionTitle>
            <div className="grid grid-cols-3 gap-2">
              <Stat label={t.health.sleepScore} value={n(w.health.sleepScore)} />
              <Stat label={t.week.sleepHours} value={w.health.sleepMin === null ? "–" : formatNumber(w.health.sleepMin / 60, locale, 1)} />
              <Stat label={t.health.steps} value={n(w.health.steps)} />
            </div>
          </Card>
        )}

        {notes.length > 0 && (
          <Card>
            <SectionTitle>{t.dayNote.weekTitle}</SectionTitle>
            <ul className="space-y-2">
              {[...notes].reverse().map((d) => (
                <li key={d.entry_date}>
                  <Link href={`/nutrition?date=${d.entry_date}`} className="block rounded-xl bg-surface-2 px-3 py-2.5 transition hover:bg-surface-3">
                    <div className="text-xs font-medium text-muted">{formatDate(d.entry_date, locale, { weekday: "long", day: "numeric", month: "short" })}</div>
                    <DayTagChips tags={d.tags} className="mt-1.5" />
                    {d.note && <p className="mt-1 line-clamp-3 whitespace-pre-line text-sm leading-snug">{d.note}</p>}
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card>
          <SectionTitle>{t.gaps.title}</SectionTitle>
          <NutrientGaps result={w.gaps} t={t} locale={locale} limit={5} foods={w.gapFoods} />
        </Card>

        <a href={claudeLink(prompt)} target="_blank" rel="noreferrer" className={cx(buttonClass("secondary"), "w-full")}>
          <Sparkles className="size-4 text-accent" /> {t.week.askClaude}
        </a>
        <p className="text-center text-xs text-faint">{t.askClaude.hint}</p>
      </div>
    </Page>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div className="rounded-2xl bg-surface-2 px-3 py-2.5">
      <div className="text-[11px] text-muted">{label}</div>
      <div className={cx("num mt-0.5 text-lg font-semibold", tone)}>{value}</div>
      {sub && <div className="num text-[11px] text-faint">{sub}</div>}
    </div>
  );
}

function Bar({ label, value, goal, unit, color, locale, decimals = 0 }: { label: string; value: number | null; goal: number | null; unit: string; color: string; locale: string; decimals?: number }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between text-[13px]">
        <span className="text-muted">Ø {label}</span>
        <span className="num">
          {value === null ? "–" : formatNumber(value, locale, decimals)}
          <span className="text-faint">{goal ? ` / ${formatNumber(goal, locale, decimals)}` : ""} {unit}</span>
        </span>
      </div>
      <ProgressBar value={value ?? 0} max={goal ?? 0} color={color} />
    </div>
  );
}
