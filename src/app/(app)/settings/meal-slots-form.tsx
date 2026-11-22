"use client";
import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { MEALS, type MealSetting, type MealSlot } from "@/lib/data/types";
import { MAX_MEAL_NAME } from "@/lib/nutrition/meal-slots";
import { Button, Input, Notice, cx } from "@/components/ui";
import { saveMealSlots } from "./actions";

interface Row {
  key: MealSlot;
  on: boolean;
  name: string;
}

/** Choose, rename and order meals. Shown meals first (in order), then the hidden ones. */
export function MealSlotsForm({ slots }: { slots: MealSetting[] }) {
  const { t } = useI18n();
  const [rows, setRows] = useState<Row[]>([
    ...slots.map((s) => ({ key: s.key, on: true, name: s.name ?? "" })),
    ...MEALS.filter((m) => !slots.some((s) => s.key === m)).map((key) => ({ key, on: false, name: "" })),
  ]);
  const [status, setStatus] = useState<"idle" | "saved" | "error" | "empty">("idle");
  const [pending, start] = useTransition();
  const update = (i: number, patch: Partial<Row>) => {
    setStatus("idle");
    setRows((r) => r.map((row, j) => (j === i ? { ...row, ...patch } : row)));
  };
  const move = (i: number, d: number) =>
    setRows((r) => {
      const j = i + d;
      if (j < 0 || j >= r.length) return r;
      const n = [...r];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">{t.mealSetup.hint}</p>
      <ul className="space-y-2">
        {rows.map((r, i) => (
          <li key={r.key} className={cx("flex items-center gap-2 rounded-2xl bg-surface-2 p-2", !r.on && "opacity-60")}>
            <label className="flex shrink-0 items-center p-1.5">
              <input
                type="checkbox"
                checked={r.on}
                onChange={(e) => update(i, { on: e.target.checked })}
                aria-label={`${t.meals[r.key]}: ${t.mealSetup.show}`}
                className="size-5 accent-[var(--accent)]"
              />
            </label>
            <Input
              value={r.name}
              onChange={(e) => update(i, { name: e.target.value })}
              placeholder={t.meals[r.key]}
              maxLength={MAX_MEAL_NAME}
              aria-label={`${t.meals[r.key]}: ${t.mealSetup.namePlaceholder}`}
              className="h-10 min-w-0 flex-1 text-[15px]"
            />
            <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={t.mealSetup.up} className="grid size-9 shrink-0 place-items-center rounded-xl text-muted disabled:opacity-30">
              <ArrowUp className="size-4" />
            </button>
            <button type="button" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label={t.mealSetup.down} className="grid size-9 shrink-0 place-items-center rounded-xl text-muted disabled:opacity-30">
              <ArrowDown className="size-4" />
            </button>
          </li>
        ))}
      </ul>
      <p className="text-xs text-faint">{t.mealSetup.hiddenNote}</p>
      {status === "error" && <Notice tone="error">{t.common.error}</Notice>}
      {status === "empty" && <Notice tone="warn">{t.mealSetup.atLeastOne}</Notice>}
      <Button
        type="button"
        className="w-full"
        disabled={pending}
        onClick={() => {
          const chosen = rows.filter((r) => r.on).map((r) => ({ key: r.key, name: r.name.trim() || null }));
          if (!chosen.length) return setStatus("empty");
          start(async () => {
            const res = await saveMealSlots(chosen);
            setStatus(res.ok ? "saved" : "error");
          });
        }}
      >
        {pending ? t.common.saving : status === "saved" ? `✓ ${t.common.saved}` : t.common.save}
      </Button>
    </div>
  );
}
