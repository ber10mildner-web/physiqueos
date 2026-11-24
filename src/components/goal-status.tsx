import type { Dictionary } from "@/lib/i18n";
import { fmt } from "@/lib/i18n";
import type { Coach } from "@/lib/coach";
import { formatDate } from "@/lib/dates";
import { formatNumber } from "@/lib/format";
import { cx } from "./ui";

const signed = (v: number, locale: string, d = 2) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${formatNumber(Math.abs(v), locale, d)}`;

/** Trend rate, goal forecast and plan comparison. `compact` for the start page. */
export function GoalStatus({ coach, t, locale, compact = false }: { coach: Coach; t: Dictionary; locale: string; compact?: boolean }) {
  const { rate, eta, goal, wanted, current } = coach;
  const goalKg = goal.goal_weight_kg;

  if (compact) {
    if (!eta || goalKg === null) return null;
    const text =
      eta.kind === "on_track"
        ? fmt(t.forecast.etaShort, { date: formatDate(eta.date, locale, { day: "numeric", month: "short", year: "numeric" }) })
        : eta.kind === "reached"
          ? t.forecast.reached
          : eta.kind === "wrong_direction"
            ? t.forecast.wrong
            : eta.kind === "flat"
              ? t.forecast.flat
              : t.forecast.tooFar;
    return (
      <p className="num mt-2 text-xs text-muted">
        {fmt(t.forecast.goal, { goal: formatNumber(goalKg, locale, 1), left: formatNumber(Math.abs(goalKg - (current ?? goalKg)), locale, 1) })} · {text}
      </p>
    );
  }

  let planText: string | null = null;
  if (rate && wanted !== null && wanted !== 0 && goal.goal_type !== "recomp") {
    const diff = rate.kgPerWeek / wanted; // > 1 faster, < 1 slower
    planText = diff > 1.25 ? t.forecast.faster : diff < 0.75 ? t.forecast.slower : t.forecast.onPlan;
  }

  return (
    <div className="space-y-2 rounded-2xl bg-surface-2 p-3 text-sm">
      {rate ? (
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-muted">{t.forecast.rateLabel}</span>
          <span className={cx("num font-medium", wanted !== null && Math.sign(rate.kgPerWeek) === Math.sign(wanted) ? "text-fiber" : "text-text")}>
            {fmt(t.forecast.rate, { rate: signed(rate.kgPerWeek, locale) })}
          </span>
        </div>
      ) : (
        <p className="text-xs text-muted">{t.forecast.needMore}</p>
      )}
      {goalKg !== null && (
        <div>
          <div className="num font-medium">{fmt(t.forecast.goal, { goal: formatNumber(goalKg, locale, 1), left: formatNumber(Math.abs(goalKg - (current ?? goalKg)), locale, 1) })}</div>
          {eta && (
            <div className="text-xs text-muted">
              {eta.kind === "on_track"
                ? fmt(t.forecast.eta, { date: formatDate(eta.date, locale, { day: "numeric", month: "long", year: "numeric" }), weeks: formatNumber(eta.weeks, locale, eta.weeks < 10 ? 1 : 0) })
                : eta.kind === "reached"
                  ? t.forecast.reached
                  : eta.kind === "wrong_direction"
                    ? t.forecast.wrong
                    : eta.kind === "flat"
                      ? t.forecast.flat
                      : t.forecast.tooFar}
            </div>
          )}
          {wanted !== null && wanted !== 0 && (
            <div className="num text-xs text-muted">
              {fmt(t.forecast.planned, { rate: signed(wanted, locale) })}
              {planText && ` · ${planText}`}
            </div>
          )}
        </div>
      )}
      {goalKg === null && wanted !== null && wanted !== 0 && (
        <div className="num text-xs text-muted">
          {fmt(t.forecast.planned, { rate: signed(wanted, locale) })}
          {planText && ` · ${planText}`}
        </div>
      )}
      {rate && <p className="text-[11px] text-faint">{fmt(t.forecast.rateBasis, { n: rate.samples, days: rate.spanDays + 1 })}</p>}
    </div>
  );
}
