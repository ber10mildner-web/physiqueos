"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { fmt } from "@/lib/i18n";
import type { DiaryEntry } from "@/lib/data/types";
import { foodPeek } from "@/lib/nutrition/peek";
import { formatNumber, formatNutrient } from "@/lib/format";
import { FoodIcon } from "@/components/food-icon";
import { cx } from "@/components/ui";

const MACROS = [
  { key: "protein_g", color: "var(--protein)" },
  { key: "carbs_g", color: "var(--carbs)" },
  { key: "fat_g", color: "var(--fat)" },
] as const;

/**
 * Short "what is in it?" overview of one diary entry, opened by tapping the
 * food's picture. Deliberately compact: kcal, macros, fibre and the few
 * vitamins/minerals the food is rich in. Unknown values are shown as unknown.
 */
export function FoodPeekSheet({ entry, onClose }: { entry: DiaryEntry; onClose: () => void }) {
  const { t, locale } = useI18n();
  const [per100, setPer100] = useState(false);
  const grams = per100 ? 100 : entry.amount_g;
  const p = foodPeek(entry.nutrients_per_100g, grams);
  const v = p.values;
  const pct = (share: number) => formatNumber(Math.round(share * 100), locale);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={entry.food_name}>
      <button type="button" aria-label={t.common.close} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-h-[88dvh] w-full max-w-xl animate-fade-up overflow-y-auto rounded-t-[28px] border border-line bg-surface px-5 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-surface-3" />
        <div className="flex items-center gap-3">
          <FoodIcon name={entry.food_name} kind={entry.source} size="lg" />
          <div className="min-w-0 flex-1">
            <h2 className="text-lg leading-tight font-semibold">{entry.food_name}</h2>
            {entry.food_brand && <p className="truncate text-sm text-muted">{entry.food_brand}</p>}
          </div>
          <button type="button" onClick={onClose} className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-muted" aria-label={t.common.close}>
            <X className="size-4" />
          </button>
        </div>

        {/* Portion or per 100 g */}
        <div className="mt-4 grid grid-cols-2 gap-1 rounded-full bg-surface-2 p-1 text-[13px]">
          {[false, true].map((on) => (
            <button
              key={String(on)}
              type="button"
              onClick={() => setPer100(on)}
              aria-pressed={per100 === on}
              className={cx("num h-8 rounded-full", per100 === on ? "bg-surface text-text shadow-sm" : "text-muted")}
            >
              {on ? t.peek.per100 : fmt(t.peek.portion, { grams: formatNumber(entry.amount_g, locale) })}
            </button>
          ))}
        </div>

        {/* kcal + macros */}
        <div className="mt-4 grid grid-cols-4 gap-2 rounded-2xl bg-surface-2 p-3 text-center">
          <div>
            <div className="num text-[15px] font-semibold">{v.energy_kcal === undefined ? "?" : formatNumber(v.energy_kcal, locale)}</div>
            <div className="mt-0.5 text-[10px] text-muted">kcal</div>
          </div>
          {MACROS.map(({ key, color }) => (
            <div key={key}>
              <div className="num text-[15px] font-semibold">{v[key] === undefined ? "?" : `${formatNumber(v[key]!, locale, 1)} g`}</div>
              <div className="mt-0.5 flex items-center justify-center gap-1 text-[10px] text-muted">
                <span className="size-1.5 rounded-full" style={{ background: color }} />
                {t.nutrients[key]}
              </div>
            </div>
          ))}
        </div>

        {/* Fibre (the question that started this) + sugar */}
        <div className="mt-3 rounded-2xl bg-surface-2 px-3 py-2.5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="flex items-center gap-1.5 text-sm font-medium">
              <span className="size-1.5 rounded-full" style={{ background: "var(--fiber)" }} />
              {t.nutrients.fiber_g}
            </span>
            <span className="num text-sm">
              {v.fiber_g === undefined ? <span className="text-faint">{t.peek.unknown}</span> : formatNutrient("fiber_g", v.fiber_g, locale)}
            </span>
          </div>
          {p.fiberShare !== null && (
            <>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-3">
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, p.fiberShare * 100)}%`, background: "var(--fiber)" }} />
              </div>
              <p className="mt-1 text-xs text-muted">{v.fiber_g === 0 ? t.peek.fiberNone : fmt(t.peek.fiberShare, { share: pct(p.fiberShare) })}</p>
            </>
          )}
          <div className="mt-2 flex items-baseline justify-between gap-3 border-t border-line/60 pt-2 text-xs text-muted">
            <span>{t.peek.sugar}</span>
            <span className="num">{v.sugar_g === undefined ? t.peek.unknown : formatNutrient("sugar_g", v.sugar_g, locale)}</span>
          </div>
        </div>

        {/* A few notable vitamins and minerals */}
        <div className="mt-4">
          <h3 className="mb-2 text-[13px] font-medium tracking-[0.08em] text-muted uppercase">{t.peek.notable}</h3>
          {p.microsKnown === 0 ? (
            <p className="text-sm text-muted">{t.peek.microsUnknown}</p>
          ) : (
            <>
              {p.highlights.length === 0 ? (
                <p className="text-sm text-muted">{t.peek.noNotable}</p>
              ) : (
                <ul className="flex flex-wrap gap-1.5">
                  {p.highlights.map((h) => (
                    <li key={h.key} className={cx("num rounded-full border px-3 py-1 text-[13px]", h.notable ? "border-accent/50 bg-accent/10" : "border-line")}>
                      {t.nutrients[h.key]} <span className="text-muted">{formatNutrient(h.key, h.value, locale)}</span>{" "}
                      <span className={cx("font-medium", h.notable ? "text-accent" : "text-muted")}>{fmt(t.peek.shareOfDay, { share: pct(h.share) })}</span>
                    </li>
                  ))}
                </ul>
              )}
              {p.microsKnown < p.microsTotal && (
                <p className="mt-2 text-xs text-faint">{fmt(t.peek.microsPartial, { known: p.microsKnown, of: p.microsTotal })}</p>
              )}
            </>
          )}
        </div>

        <p className="mt-4 text-[11px] leading-snug text-faint">{t.peek.footnote}</p>
      </div>
    </div>,
    document.body,
  );
}
