"use client";
import { useState, useTransition } from "react";
import { useI18n } from "@/lib/i18n/client";
import { fmt } from "@/lib/i18n";
import { formatNumber } from "@/lib/format";
import { GOAL_TYPES, TRAINING_LEVELS, goalAim, hasPace, proteinPerKg, type GoalType, type TrainingLevel } from "@/lib/body/goals";
import type { BodyGoal } from "@/lib/data/body-goal";
import { Button, Field, Input, Notice, cx } from "@/components/ui";
import { saveBodyGoalAction } from "./actions";

const LOSE = [0.25, 0.5, 0.75];
const GAIN = [0.1, 0.25, 0.5];

/**
 * The body goal: what the user is after, their training level, the pace, an
 * optional goal weight and their own words. Sigma derives calories and protein
 * from the choices; the free text is context for Claude.
 */
export function BodyGoalForm({ goal, currentKg }: { goal: BodyGoal; currentKg: number | null }) {
  const { t, locale } = useI18n();
  const [type, setType] = useState<GoalType | null>(goal.goal_type);
  const [level, setLevel] = useState<TrainingLevel | null>(goal.training_level);
  const [pace, setPace] = useState<number | null>(goal.goal_pace_kg_week);
  const [weight, setWeight] = useState(goal.goal_weight_kg === null ? "" : String(goal.goal_weight_kg));
  const [note, setNote] = useState(goal.goal_note ?? "");
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [pending, start] = useTransition();
  const touch = () => setStatus("idle");

  const g = weight.trim() === "" ? null : Number(weight.replace(",", "."));
  const validWeight = g === null || (Number.isFinite(g) && g >= 30 && g <= 300);
  const kg = currentKg ?? g ?? 75;
  const recommended = type ? Math.abs(goalAim({ goal: type, level, currentKg: kg, goalWeightKg: null, paceKgWeek: null })) : null;
  const options = type === "muscle_gain" ? GAIN : LOSE;
  // a pace from the other direction (e.g. after switching goals) falls back to the recommendation
  const chosenPace = pace !== null && options.includes(pace) ? pace : null;
  const kgText = (v: number) => formatNumber(v, locale, 2);

  const chip = (on: boolean) => cx("rounded-xl px-2 text-[13px] font-medium transition", on ? "bg-surface-3 text-text shadow" : "text-muted");

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-1.5 text-[13px] text-muted">{t.bodyGoal.goal}</div>
        <div className="grid grid-cols-2 gap-1 rounded-2xl bg-surface-2 p-1">
          {GOAL_TYPES.map((x) => (
            <button
              key={x}
              type="button"
              aria-pressed={type === x}
              onClick={() => {
                setType(x);
                touch();
              }}
              className={cx(chip(type === x), "min-h-11 py-1.5 leading-tight")}
            >
              {t.bodyGoal.types[x]}
            </button>
          ))}
        </div>
        {type && <p className="mt-1.5 text-xs text-muted">{t.bodyGoal.typeHints[type]}</p>}
      </div>

      <div>
        <div className="mb-1.5 text-[13px] text-muted">{t.bodyGoal.level}</div>
        <div className="grid grid-cols-3 gap-1 rounded-2xl bg-surface-2 p-1">
          {TRAINING_LEVELS.map((x) => (
            <button
              key={x}
              type="button"
              aria-pressed={level === x}
              onClick={() => {
                setLevel(x);
                touch();
              }}
              className={cx(chip(level === x), "flex min-h-12 flex-col items-center justify-center py-1 leading-tight")}
            >
              <span>{t.bodyGoal.levels[x]}</span>
              <span className="text-[10px] font-normal text-faint">{t.bodyGoal.levelHints[x]}</span>
            </button>
          ))}
        </div>
      </div>

      {type && hasPace(type) && recommended !== null && (
        <div>
          <div className="mb-1.5 text-[13px] text-muted">{type === "muscle_gain" ? t.goalWeight.paceGain : t.goalWeight.paceLose}</div>
          <div className="grid grid-cols-3 gap-1 rounded-2xl bg-surface-2 p-1">
            <button
              type="button"
              onClick={() => {
                setPace(null);
                touch();
              }}
              className={cx(chip(chosenPace === null), "num col-span-3 h-9")}
            >
              {fmt(t.bodyGoal.recommended, { kg: kgText(recommended) })}
            </button>
            {options.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setPace(p);
                  touch();
                }}
                className={cx(chip(chosenPace === p), "num h-9")}
              >
                {kgText(p)} kg
              </button>
            ))}
          </div>
          {currentKg !== null && (
            <p className="mt-1.5 text-xs text-faint">{fmt(t.goalWeight.paceHint, { pct: formatNumber(((chosenPace ?? recommended) / currentKg) * 100, locale, 1) })}</p>
          )}
        </div>
      )}
      {type && !hasPace(type) && recommended !== null && (
        <p className="num text-xs text-muted">{fmt(t.bodyGoal.paceFixed, { kg: `${type === "recomp" ? "−" : ""}${kgText(recommended)}` })}</p>
      )}
      {type && <p className="text-xs text-muted">{fmt(t.bodyGoal.protein, { g: formatNumber(proteinPerKg(type), locale, 1) })}</p>}

      <Field label={t.bodyGoal.goalWeight} hint={t.bodyGoal.goalWeightHint}>
        <Input
          type="number"
          inputMode="decimal"
          step="0.1"
          min={30}
          max={300}
          value={weight}
          placeholder={currentKg !== null ? formatNumber(currentKg, "en", 1) : "75"}
          onChange={(e) => {
            setWeight(e.target.value);
            touch();
          }}
          className="num"
        />
      </Field>

      <label className="block">
        <span className="mb-1.5 block text-[13px] text-muted">{t.bodyGoal.note}</span>
        <textarea
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
            touch();
          }}
          maxLength={1000}
          rows={3}
          placeholder={t.bodyGoal.notePlaceholder}
          className="w-full rounded-2xl border border-line bg-surface-2 px-4 py-3 text-[16px] text-text outline-none placeholder:text-faint focus:border-accent/60"
        />
        <span className="mt-1 block text-xs text-faint">{t.bodyGoal.noteHint}</span>
      </label>

      {status === "error" && <Notice tone="error">{t.errors.invalidInput}</Notice>}
      <Button
        type="button"
        className="w-full"
        disabled={!validWeight || pending}
        onClick={() =>
          start(async () => {
            const res = await saveBodyGoalAction({
              goal_type: type,
              training_level: level,
              goal_pace_kg_week: type && hasPace(type) ? chosenPace : type ? null : g === null ? null : (pace ?? 0.5),
              goal_weight_kg: g,
              goal_note: note.trim() || null,
            });
            setStatus(res.ok ? "saved" : "error");
          })
        }
      >
        {pending ? t.common.saving : status === "saved" ? `✓ ${t.common.saved}` : t.common.save}
      </Button>
    </div>
  );
}
