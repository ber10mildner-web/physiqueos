import type { Dictionary } from "@/lib/i18n";
import { fmt } from "@/lib/i18n";
import type { NutrientTotals } from "@/lib/nutrition/calc";
import type { NutritionGoal } from "@/lib/data/types";
import { formatNumber } from "@/lib/format";
import { ProgressBar, cx } from "./ui";

const MACROS = [
  { key: "protein_g", goal: "protein_g", color: "var(--protein)" },
  { key: "carbs_g", goal: "carbs_g", color: "var(--carbs)" },
  { key: "fat_g", goal: "fat_g", color: "var(--fat)" },
  { key: "fiber_g", goal: "fiber_g", color: "var(--fiber)" },
] as const;

/** Calories ring + macro bars. Shows incomplete-data markers when some foods lack a value. */
export function DaySummary({ totals, goal, t, locale }: { totals: NutrientTotals; goal: NutritionGoal | null; t: Dictionary; locale: string }) {
  const kcal = totals.energy_kcal.value;
  const target = goal?.energy_kcal ?? 0;
  const pct = target > 0 ? Math.min(1, kcal / target) : 0;
  const over = target > 0 && kcal > target;
  const R = 52;
  const C = 2 * Math.PI * R;

  return (
    <div>
      <div className="flex items-center gap-5">
        <div className="relative size-32 shrink-0">
          <svg viewBox="0 0 120 120" className="size-full -rotate-90">
            <circle cx="60" cy="60" r={R} fill="none" stroke="var(--surface-3)" strokeWidth="9" />
            <circle
              cx="60"
              cy="60"
              r={R}
              fill="none"
              stroke={over ? "var(--danger)" : "var(--accent)"}
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - pct)}
              className="transition-[stroke-dashoffset] duration-700 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="num text-[26px] font-semibold leading-none tracking-tight">{formatNumber(kcal, locale)}</span>
            <span className="mt-1 text-[11px] text-muted">kcal {t.dashboard.eaten}</span>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          {goal ? (
            <>
              <div className={cx("num text-xl font-semibold tracking-tight", over && "text-danger")}>
                {over
                  ? fmt(t.dashboard.caloriesOver, { value: formatNumber(kcal - target, locale) })
                  : fmt(t.dashboard.caloriesLeft, { value: formatNumber(target - kcal, locale) })}
              </div>
              <div className="num mt-1 text-sm text-muted">
                {t.dashboard.target}: {formatNumber(target, locale)} kcal · {t.phases[goal.phase]}
                {goal.alt_day && <span className="text-accent"> · {t.dashboard.altDay}</span>}
              </div>
            </>
          ) : (
            <div className="text-sm text-muted">{t.dashboard.noGoal}</div>
          )}
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4">
        {MACROS.map((m) => {
          const tot = totals[m.key];
          const g = goal?.[m.goal] ?? 0;
          const incomplete = tot.of > 0 && tot.known < tot.of;
          return (
            <div key={m.key}>
              <div className="mb-1.5 flex items-baseline justify-between gap-2 text-[13px]">
                <span className="truncate text-muted">{t.nutrients[m.key]}</span>
                <span className="num shrink-0 whitespace-nowrap">
                  {formatNumber(tot.value, locale)}
                  {incomplete && <span className="text-warn" title={fmt(t.nutrition.coverage, { known: tot.known, of: tot.of })}>*</span>}
                  <span className="text-faint">{g > 0 ? `/${g}` : ""} g</span>
                </span>
              </div>
              <ProgressBar value={tot.value} max={g} color={m.color} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
