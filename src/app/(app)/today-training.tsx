import Link from "next/link";
import { CheckCircle2, Circle, Dumbbell, Footprints, Play } from "lucide-react";
import type { Dictionary } from "@/lib/i18n";
import { fmt } from "@/lib/i18n";
import type { ScheduleItem } from "@/lib/training/schedule";
import { formatNumber } from "@/lib/format";
import { cx } from "@/components/ui";
import { StartButton } from "./training/start-button";

/** Start page: what is planned today and tomorrow (plans with weekdays + cardio routines). */
export function TodayTraining({ today, tomorrow, hasActive, t, locale }: { today: ScheduleItem[]; tomorrow: ScheduleItem[]; hasActive: boolean; t: Dictionary; locale: string }) {
  return (
    <div className="space-y-4">
      <Day title={t.common.today} items={today} isToday hasActive={hasActive} t={t} locale={locale} />
      <div className="border-t border-line" />
      <Day title={t.schedule.tomorrow} items={tomorrow} isToday={false} hasActive={hasActive} t={t} locale={locale} />
    </div>
  );
}

function Day({ title, items, isToday, hasActive, t, locale }: { title: string; items: ScheduleItem[]; isToday: boolean; hasActive: boolean; t: Dictionary; locale: string }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted">{t.schedule.restDay}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((it) => {
            const done = it.status === "done";
            const strength = it.kind === "plan" || it.kind === "workout";
            const Icon = strength ? Dumbbell : Footprints;
            const name = it.kind === "cardio" ? (it.name ?? t.training.activities[it.activity as keyof typeof t.training.activities] ?? it.activity) : it.name;
            const sub =
              it.kind === "plan"
                ? fmt(t.schedule.exercises, { n: it.exercises })
                : it.kind === "routine" || it.kind === "cardio"
                  ? `${formatNumber(it.minutes, locale)} min`
                  : "";
            if (isToday && it.kind === "plan" && it.status === "open") {
              return (
                <li key={`${it.kind}-${it.id}`} className="flex">
                  <StartButton planId={it.id} label={it.name} sub={`${sub} · ${t.schedule.tapToStart}`} disabled={hasActive} />
                </li>
              );
            }
            const href =
              it.kind === "plan" && it.workoutId ? `/training/workout/${it.workoutId}` : it.kind === "workout" ? `/training/workout/${it.id}` : it.kind === "plan" ? `/training/plans/${it.id}` : "/training#routines";
            return (
              <li key={`${it.kind}-${it.id}`}>
                <Link href={href} className="flex min-h-12 items-center gap-3 rounded-2xl bg-surface-2 px-4 py-2 transition active:scale-[0.99]">
                  <Icon className={cx("size-4 shrink-0", done ? "text-accent" : "text-muted")} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{name}</span>
                    {sub && <span className="block text-xs text-muted">{sub}</span>}
                  </span>
                  {it.status === "active" ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-accent">
                      <Play className="size-3" /> {t.training.resume}
                    </span>
                  ) : done ? (
                    <span className="inline-flex items-center gap-1 text-xs text-accent">
                      <CheckCircle2 className="size-4" /> {it.kind === "routine" ? t.schedule.logged : t.schedule.done}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-faint">
                      <Circle className="size-4" /> {it.kind === "routine" ? t.schedule.autoLogs : t.schedule.planned}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
