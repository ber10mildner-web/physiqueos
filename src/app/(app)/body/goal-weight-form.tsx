"use client";
import { useState, useTransition } from "react";
import { useI18n } from "@/lib/i18n/client";
import { fmt } from "@/lib/i18n";
import { formatNumber } from "@/lib/format";
import { Button, Field, Input, Notice, cx } from "@/components/ui";
import { saveBodyGoalAction } from "./actions";

const LOSE = [0.25, 0.5, 0.75, 1];
const GAIN = [0.1, 0.25, 0.5];

/** Goal weight + wanted pace. The direction (lose/gain) follows from goal vs. current weight. */
export function GoalWeightForm({ goalKg, paceKgWeek, currentKg }: { goalKg: number | null; paceKgWeek: number | null; currentKg: number | null }) {
  const { t, locale } = useI18n();
  const [goal, setGoal] = useState(goalKg === null ? "" : String(goalKg));
  const [pace, setPace] = useState<number | null>(paceKgWeek);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [pending, start] = useTransition();
  const g = goal.trim() === "" ? null : Number(goal.replace(",", "."));
  const valid = g === null || (Number.isFinite(g) && g >= 30 && g <= 300);
  const gaining = g !== null && currentKg !== null && g > currentKg;
  const options = gaining ? GAIN : LOSE;
  const chosen = pace !== null && options.includes(pace) ? pace : gaining ? 0.25 : 0.5;

  return (
    <div className="space-y-3">
      <Field label={t.goalWeight.label} hint={currentKg !== null ? fmt(t.goalWeight.current, { kg: formatNumber(currentKg, locale, 1) }) : undefined}>
        <Input
          type="number"
          inputMode="decimal"
          step="0.1"
          min={30}
          max={300}
          value={goal}
          placeholder={currentKg !== null ? formatNumber(currentKg, "en", 1) : "75"}
          onChange={(e) => {
            setGoal(e.target.value);
            setStatus("idle");
          }}
          className="num text-lg"
        />
      </Field>
      {g !== null && (
        <div>
          <div className="mb-1.5 text-[13px] text-muted">{gaining ? t.goalWeight.paceGain : t.goalWeight.paceLose}</div>
          <div className="grid grid-flow-col gap-1 rounded-2xl bg-surface-2 p-1">
            {options.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setPace(p);
                  setStatus("idle");
                }}
                className={cx("num h-9 rounded-xl text-[13px] font-medium", chosen === p ? "bg-surface-3 text-text" : "text-muted")}
              >
                {formatNumber(p, locale, 2)} kg
              </button>
            ))}
          </div>
          {currentKg !== null && (
            <p className="mt-1.5 text-xs text-faint">{fmt(t.goalWeight.paceHint, { pct: formatNumber((chosen / currentKg) * 100, locale, 1) })}</p>
          )}
        </div>
      )}
      {status === "error" && <Notice tone="error">{t.errors.invalidInput}</Notice>}
      <Button
        type="button"
        className="w-full"
        disabled={!valid || pending}
        onClick={() =>
          start(async () => {
            const res = await saveBodyGoalAction({ goal_weight_kg: g, goal_pace_kg_week: g === null ? null : chosen });
            setStatus(res.ok ? "saved" : "error");
          })
        }
      >
        {pending ? t.common.saving : status === "saved" ? `✓ ${t.common.saved}` : t.common.save}
      </Button>
    </div>
  );
}
