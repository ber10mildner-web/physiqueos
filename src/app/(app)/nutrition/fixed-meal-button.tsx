"use client";
import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { Pin, Trash2, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { fmt } from "@/lib/i18n";
import type { MealSlot } from "@/lib/data/types";
import { isoWeekday } from "@/lib/nutrition/goal-days";
import { Button, Notice, cx } from "@/components/ui";
import { WeekdayPicker, weekdayLabel } from "@/components/weekday-picker";
import { removeFixedMeal, saveFixedMeal } from "./actions";

export type FixedMealInfo = { id: string; name: string; meal: MealSlot; auto_days: number[] };

/**
 * Pin in a meal's header: save the meal as it is now as a fixed meal for chosen
 * weekdays, or remove one. Highlighted when a fixed meal covers the shown day.
 */
export function FixedMealButton({ meal, mealName, date, hasItems, fixed, color }: { meal: MealSlot; mealName: string; date: string; hasItems: boolean; fixed: FixedMealInfo[]; color: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const weekday = isoWeekday(date);
  const active = fixed.some((f) => f.auto_days.includes(weekday));
  if (!hasItems && !fixed.length) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t.fixedMeals.open}
        title={t.fixedMeals.open}
        className="-m-1 grid size-9 shrink-0 place-items-center rounded-full transition active:scale-95"
      >
        <Pin className={cx("size-4", !active && "text-faint")} style={active ? { color, fill: color } : undefined} />
      </button>
      {open && <FixedMealSheet meal={meal} mealName={mealName} date={date} hasItems={hasItems} fixed={fixed} onClose={() => setOpen(false)} />}
    </>
  );
}

function FixedMealSheet({ meal, mealName, date, hasItems, fixed, onClose }: { meal: MealSlot; mealName: string; date: string; hasItems: boolean; fixed: FixedMealInfo[]; onClose: () => void }) {
  const { t } = useI18n();
  const [days, setDays] = useState<number[]>([isoWeekday(date)]);
  const [status, setStatus] = useState<"idle" | "saved" | "error" | "noDay">("idle");
  const [pending, start] = useTransition();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={fmt(t.fixedMeals.title, { meal: mealName })}>
      <button type="button" aria-label={t.common.close} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-h-[85dvh] w-full max-w-xl animate-fade-up overflow-y-auto rounded-t-[28px] border border-line bg-surface px-5 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-surface-3" />
        <div className="flex items-start gap-3">
          <h2 className="min-w-0 flex-1 text-lg leading-tight font-semibold">{fmt(t.fixedMeals.title, { meal: mealName })}</h2>
          <button type="button" onClick={onClose} className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-muted" aria-label={t.common.close}>
            <X className="size-4" />
          </button>
        </div>

        {hasItems ? (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-muted">{fmt(t.fixedMeals.hint, { meal: mealName })}</p>
            <div>
              <p className="mb-1.5 text-[13px] text-muted">{t.fixedMeals.days}</p>
              <WeekdayPicker
                value={days}
                onChange={(v) => {
                  setDays(v);
                  setStatus("idle");
                }}
              />
            </div>
            {status === "noDay" && <Notice tone="warn">{t.fixedMeals.pickDay}</Notice>}
            {status === "error" && <Notice tone="error">{t.common.error}</Notice>}
            <Button
              type="button"
              className="w-full"
              disabled={pending}
              onClick={() => {
                if (!days.length) return setStatus("noDay");
                start(async () => {
                  const res = await saveFixedMeal(date, meal, days);
                  setStatus(res.ok ? "saved" : "error");
                });
              }}
            >
              {pending ? t.common.saving : status === "saved" ? `✓ ${t.fixedMeals.saved}` : t.fixedMeals.save}
            </Button>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">{fmt(t.fixedMeals.empty, { meal: mealName })}</p>
        )}

        {fixed.length > 0 && (
          <div className="mt-5">
            <h3 className="mb-2 text-[13px] font-medium tracking-[0.08em] text-muted uppercase">{t.fixedMeals.current}</h3>
            <ul className="space-y-2">
              {fixed.map((f) => (
                <li key={f.id} className="flex items-center gap-3 rounded-2xl bg-surface-2 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{f.name}</div>
                    <div className="text-xs text-muted">{weekdayLabel(f.auto_days, t)}</div>
                  </div>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => start(async () => void (await removeFixedMeal(f.id)))}
                    aria-label={t.fixedMeals.remove}
                    className="grid size-9 shrink-0 place-items-center rounded-full text-muted transition hover:bg-surface-3 hover:text-danger"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
