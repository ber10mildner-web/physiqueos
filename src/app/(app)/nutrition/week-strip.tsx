import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Dictionary } from "@/lib/i18n";
import { addDays, formatDate, startOfWeek } from "@/lib/dates";
import { cx } from "@/components/ui";

/** Monday–Sunday strip: tap a day to open it; a dot marks days with entries. */
export function WeekStrip({ date, today, lastDay, logged, locale, t }: { date: string; today: string; lastDay: string; logged: Set<string>; locale: string; t: Dictionary }) {
  const monday = startOfWeek(date);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const nextWeek = addDays(monday, 7);
  return (
    <div className="mb-4 flex items-center gap-1 rounded-3xl border border-line bg-surface p-1.5">
      <Link href={`/nutrition?date=${addDays(monday, -1)}`} className="grid h-14 w-7 shrink-0 place-items-center rounded-xl text-faint hover:text-text" aria-label={t.week.previous}>
        <ChevronLeft className="size-4" />
      </Link>
      <ol className="grid flex-1 grid-cols-7 gap-0.5">
        {days.map((d) => {
          const active = d === date;
          const future = d > lastDay;
          const label = formatDate(d, locale, { weekday: "narrow" });
          const inner = (
            <>
              <span className={cx("text-[11px]", active ? "text-accent-ink/70" : "text-faint")}>{label}</span>
              <span className={cx("num text-[15px] font-semibold", d === today && !active && "text-accent", d > today && !active && "text-muted")}>{Number(d.slice(8))}</span>
              <span className={cx("size-1.5 rounded-full", logged.has(d) ? (active ? "bg-accent-ink" : "bg-accent") : "bg-surface-3")} />
            </>
          );
          return (
            <li key={d}>
              {future ? (
                <span className="flex h-14 flex-col items-center justify-center gap-0.5 rounded-2xl opacity-35">{inner}</span>
              ) : (
                <Link
                  href={`/nutrition?date=${d}`}
                  aria-current={active ? "date" : undefined}
                  aria-label={formatDate(d, locale, { weekday: "long", day: "numeric", month: "long" })}
                  className={cx("flex h-14 flex-col items-center justify-center gap-0.5 rounded-2xl transition", active ? "bg-accent text-accent-ink" : "hover:bg-surface-2")}
                >
                  {inner}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
      {nextWeek <= lastDay ? (
        <Link href={`/nutrition?date=${nextWeek}`} className="grid h-14 w-7 shrink-0 place-items-center rounded-xl text-faint hover:text-text" aria-label={t.week.next}>
          <ChevronRight className="size-4" />
        </Link>
      ) : (
        <span className="w-7 shrink-0" />
      )}
    </div>
  );
}
