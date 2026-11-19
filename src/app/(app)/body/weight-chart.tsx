"use client";
import { ComposedChart, Line, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useI18n } from "@/lib/i18n/client";
import { dayNumber, type TrendPoint } from "@/lib/body/weight";
import { formatDate } from "@/lib/dates";
import { formatNumber } from "@/lib/format";

/** Raw weigh-ins as recessive dots, the 7-day average as the highlighted line. One y-axis. */
export function WeightChart({ data }: { data: TrendPoint[] }) {
  const { t, locale } = useI18n();
  const rows = data.map((p) => ({ x: dayNumber(p.date), date: p.date, weight: p.weight, average: Math.round(p.average * 100) / 100 }));
  const values = rows.flatMap((r) => [r.weight, r.average]);
  const min = Math.floor(Math.min(...values) - 0.5);
  const max = Math.ceil(Math.max(...values) + 0.5);

  return (
    <div>
      <div className="mb-2 flex gap-4 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded bg-accent" /> {t.body.chartTrend}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-muted" /> {t.body.chartWeight}
        </span>
      </div>
      <div className="h-56 w-full" role="img" aria-label={t.body.chartTrend}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 8, right: 4, bottom: 0, left: -12 }}>
            <CartesianGrid stroke="var(--line)" strokeDasharray="0" vertical={false} />
            <XAxis
              dataKey="x"
              type="number"
              domain={["dataMin", "dataMax"]}
              scale="linear"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--faint)", fontSize: 11 }}
              tickCount={5}
              tickFormatter={(x: number) => formatDate(new Date(x * 86_400_000).toISOString().slice(0, 10), locale, { day: "numeric", month: "short" })}
            />
            <YAxis
              domain={[min, max]}
              tickLine={false}
              axisLine={false}
              width={44}
              tick={{ fill: "var(--faint)", fontSize: 11 }}
              tickFormatter={(v: number) => formatNumber(v, locale, 0)}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ stroke: "var(--faint)", strokeWidth: 1 }}
              content={({ active, payload }) => {
                const r = active && payload?.[0]?.payload;
                if (!r) return null;
                return (
                  <div className="rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs shadow-xl">
                    <div className="mb-1 text-muted">{formatDate(r.date, locale)}</div>
                    <div className="num text-text">
                      {t.body.chartWeight}: {formatNumber(r.weight, locale, 2)} kg
                    </div>
                    <div className="num text-text">
                      {t.body.chartTrend}: {formatNumber(r.average, locale, 2)} kg
                    </div>
                  </div>
                );
              }}
            />
            <Scatter dataKey="weight" fill="var(--muted)" fillOpacity={0.55} shape="circle" isAnimationActive={false} />
            <Line type="monotone" dataKey="average" stroke="var(--accent)" strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: "var(--surface)", strokeWidth: 2 }} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
