"use client";
import { useState, useSyncExternalStore, useTransition } from "react";
import { Gauge } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { fmt } from "@/lib/i18n";
import type { Coach } from "@/lib/coach";
import { formatNumber } from "@/lib/format";
import { applyCalorieSuggestion } from "@/app/(app)/coach-actions";
import { Button, Card, Notice, SectionTitle } from "./ui";

const signed = (v: number, locale: string, d = 0) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${formatNumber(Math.abs(v), locale, d)}`;
const DISMISS_KEY = "sigma.coach.dismissed";
const noopSubscribe = () => () => {};
function readDismissed(): string | null {
  try {
    return localStorage.getItem(DISMISS_KEY);
  } catch {
    return null;
  }
}

/**
 * Adaptive calorie check: real burn from intake + weight trend, and a suggested
 * new target the user can apply with one tap. `always` shows the card even
 * without a suggestion (settings); otherwise it only appears when there is one.
 */
export function CoachCard({ coach, always = false }: { coach: Coach; always?: boolean }) {
  const { t, locale } = useI18n();
  const [pending, start] = useTransition();
  const [status, setStatus] = useState<"idle" | "applied" | "error">("idle");
  const [dismissed, setDismissed] = useState(false);
  const s = coach.suggestion;
  // "Later" hides one specific suggestion on this phone until the numbers change.
  const key = s ? `${s.change}:${s.base.energy_kcal}` : "";
  const stored = useSyncExternalStore(noopSubscribe, readDismissed, () => null);
  const hidden = dismissed || (s !== null && stored === key);

  if (!always && (!s || hidden) && status !== "applied") return null;
  const n = (v: number) => formatNumber(v, locale);
  const est = coach.tdee.ok ? coach.tdee.estimate : null;

  return (
    <Card>
      <SectionTitle>
        <span className="inline-flex items-center gap-2">
          <Gauge className="size-4 text-accent" /> {t.coach.title}
        </span>
      </SectionTitle>
      {est ? (
        <div className="space-y-1">
          <div className="num text-[15px] font-medium">{fmt(t.coach.tdee, { kcal: n(Math.round(est.tdee / 10) * 10) })}</div>
          <p className="num text-xs text-muted">
            {fmt(t.coach.basis, {
              days: est.loggedDays,
              intake: n(est.avgIntake),
              rate: signed(est.rate.kgPerWeek, locale, 2),
            })}{" "}
            ({t.coach.confidence[est.confidence]})
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted">
          {!coach.tdee.ok && coach.tdee.reason === "few_days"
            ? fmt(t.coach.needDays, { n: coach.tdee.loggedDays })
            : fmt(t.coach.needWeights, {
                n: coach.tdee.ok ? 0 : coach.tdee.weighIns,
              })}
        </p>
      )}

      {status === "applied" ? (
        <div className="mt-3">
          <Notice tone="success">{t.coach.applied}</Notice>
        </div>
      ) : s ? (
        <div className="mt-3 rounded-2xl bg-accent/10 p-3">
          <div className="num font-semibold">
            {s.alt
              ? fmt(t.coach.suggestAlt, {
                  base: n(s.base.energy_kcal),
                  alt: n(s.alt.energy_kcal),
                })
              : fmt(t.coach.suggest, { kcal: n(s.base.energy_kcal) })}
          </div>
          <div className="num text-xs text-muted">
            {fmt(t.coach.instead, {
              kcal: n(s.base.energy_kcal - s.change),
              delta: signed(s.change, locale),
            })}
          </div>
          <p className="num mt-2 text-xs text-muted">
            {fmt(s.aimSource === "goal_weight" ? t.coach.aimGoal : t.coach.aimPhase, { aim: signed(s.aimKgPerWeek, locale, 2) })}{" "}
            {Math.abs(s.idealKcal - s.currentKcal) > Math.abs(s.change) + 10 ? t.coach.capped : ""} {t.coach.macros}
          </p>
          {status === "error" && (
            <div className="mt-2">
              <Notice tone="error">{t.common.error}</Notice>
            </div>
          )}
          <div className={always ? "mt-3 grid" : "mt-3 grid grid-cols-2 gap-2"}>
            {!always && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  try {
                    localStorage.setItem(DISMISS_KEY, key);
                  } catch {
                    /* ignore */
                  }
                  setDismissed(true);
                }}
              >
                {t.coach.later}
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const res = await applyCalorieSuggestion(s.change);
                  setStatus(res.ok ? "applied" : "error");
                })
              }
            >
              {pending ? t.common.saving : t.coach.apply}
            </Button>
          </div>
        </div>
      ) : est ? (
        <p className="mt-2 text-xs text-muted">
          {!coach.nutritionGoal ? t.coach.noGoal : coach.nutritionGoal.phase === "custom" && coach.goal.goal_weight_kg === null ? t.coach.noPace : t.coach.noChange}
        </p>
      ) : null}
      <p className="mt-2 text-[11px] text-faint">{t.coach.hint}</p>
    </Card>
  );
}
