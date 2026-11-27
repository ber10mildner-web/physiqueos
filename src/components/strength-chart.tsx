"use client";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TrendingDown, TrendingUp } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { fmt } from "@/lib/i18n";
import { formatDate } from "@/lib/dates";
import { formatNumber } from "@/lib/format";
import type { StrengthHistory, StrengthPoint } from "@/lib/training/calc";
import { cx } from "@/components/ui";

type Row = StrengthPoint & { i: number; today: boolean };

/**
 * Strength over time for one exercise: best set per session as estimated max (or reps for bodyweight).
 * `today` is the current, still running session; it is drawn highlighted at the end.
 * `compact` is the small version inside a running workout.
 */
export function StrengthChart({ history, today, compact = false }: { history: StrengthHistory; today?: StrengthPoint | null; compact?: boolean }) {
  const { t, locale } = useI18n();
  const points = today ? [...history.points, today] : history.points;
  if (points.length < 2) return null;
  const rows: Row[] = points.map((p, i) => ({
    ...p,
    i,
    today: !!today && i === points.length - 1,
  }));

  const reps = history.metric === "reps";
  const unit = reps ? ` ${t.training.reps}` : " kg";
  const value = (v: number) => `${formatNumber(v, locale, reps ? 0 : 1)}${unit}`;
  const first = rows[0];
  const last = rows[rows.length - 1];
  const delta = Math.round((last.value - first.value) * 10) / 10;
  const pct = first.value > 0 ? Math.round((delta / first.value) * 100) : 0;
  const values = rows.map((r) => r.value);
  const pad = reps ? 1 : Math.max(2.5, (Math.max(...values) - Math.min(...values)) * 0.15);
  const min = Math.max(0, Math.floor(Math.min(...values) - pad));
  const max = Math.ceil(Math.max(...values) + pad);
  const up = delta > 0;
  const Icon = delta < 0 ? TrendingDown : TrendingUp;

  return (
    <div className={compact ? "mt-2" : undefined}>
      <div className="mb-1.5 flex items-baseline justify-between gap-2 text-xs">
        <span className="min-w-0 truncate text-muted">{reps ? t.training.chartReps : t.training.chartMax}</span>
        <span className={cx("num inline-flex shrink-0 items-center gap-1 whitespace-nowrap font-medium", up ? "text-accent" : "text-muted")}>
          <Icon className="size-3.5" aria-hidden="true" />
          {fmt(t.training.chartSince, {
            delta: `${delta > 0 ? "+" : delta < 0 ? "−" : "±"}${value(Math.abs(delta))}${reps || compact || pct === 0 ? "" : ` (${pct > 0 ? "+" : "−"}${Math.abs(pct)} %)`}`,
            date: formatDate(first.date, locale, { day: "numeric", month: "numeric" }),
          })}
        </span>
      </div>
      <div
        className={cx("w-full", compact ? "h-24" : "h-56")}
        role="img"
        aria-label={`${reps ? t.training.chartReps : t.training.chartMax}: ${value(first.value)} → ${value(last.value)}`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 6, right: 8, bottom: 0, left: compact ? -20 : -12 }}>
            <CartesianGrid stroke="var(--line)" vertical={false} />
            <XAxis
              dataKey="i"
              type="number"
              domain={[0, rows.length - 1]}
              hide={compact}
              ticks={compact ? undefined : tickIndexes(rows.length)}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--faint)", fontSize: 11 }}
              tickFormatter={(i: number) =>
                rows[i]?.today
                  ? t.training.chartToday
                  : formatDate(rows[i]?.date ?? first.date, locale, {
                      day: "numeric",
                      month: "short",
                    })
              }
            />
            <YAxis
              domain={[min, max]}
              tickLine={false}
              axisLine={false}
              width={44}
              tickCount={compact ? 3 : 5}
              allowDecimals={false}
              tick={{ fill: "var(--faint)", fontSize: compact ? 10 : 11 }}
              tickFormatter={(v: number) => formatNumber(v, locale, 0)}
            />
            <Tooltip
              cursor={{ stroke: "var(--faint)", strokeWidth: 1 }}
              content={({ active, payload }) => {
                const r = active && (payload?.[0]?.payload as Row | undefined);
                if (!r) return null;
                return (
                  <div className="rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs shadow-xl">
                    <div className="mb-1 text-muted">{r.today ? t.training.chartToday : formatDate(r.date, locale)}</div>
                    <div className="num text-text">{reps ? `${r.reps} ${t.training.reps}` : `${formatNumber(r.weight_kg, locale, 1)} kg × ${r.reps}`}</div>
                    {!reps && (
                      <div className="num text-muted">
                        ≈ {value(r.value)} {t.training.chartMaxShort}
                      </div>
                    )}
                  </div>
                );
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="var(--accent)"
              strokeWidth={2}
              isAnimationActive={false}
              activeDot={{ r: 5, stroke: "var(--surface)", strokeWidth: 2 }}
              dot={(props: { cx?: number; cy?: number; index?: number }) => {
                const r = rows[props.index ?? 0];
                const isLast = props.index === rows.length - 1;
                if (props.cx === undefined || props.cy === undefined) return <g key={props.index} />;
                return r.today ? (
                  <circle key={props.index} cx={props.cx} cy={props.cy} r={4.5} fill="var(--surface)" stroke="var(--accent)" strokeWidth={2} />
                ) : (
                  <circle key={props.index} cx={props.cx} cy={props.cy} r={isLast ? 4 : 2.5} fill="var(--accent)" stroke="var(--surface)" strokeWidth={isLast ? 2 : 1} />
                );
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** About four evenly spread x ticks, always including first and last. */
function tickIndexes(n: number): number[] {
  if (n <= 4) return [...Array(n).keys()];
  const step = (n - 1) / 3;
  return [0, Math.round(step), Math.round(step * 2), n - 1];
}
