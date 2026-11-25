"use client";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { fmt } from "@/lib/i18n";
import { contributors } from "@/lib/nutrition/contributors";
import type { NutrientKey, NutrientMap } from "@/lib/nutrition/nutrients";
import { formatNumber, formatNutrient } from "@/lib/format";
import { FoodIcon } from "./food-icon";

export type SourceEntry = { food_name: string; amount_g: number; nutrients_per_100g: NutrientMap; source?: string | null };

/**
 * "Where does today's protein come from?": the day's foods ranked by how much of
 * one nutrient they brought. Opened by tapping a macro or a nutrient row.
 */
export function NutrientSourcesSheet({ nutrient, entries, color, onClose }: { nutrient: NutrientKey; entries: SourceEntry[]; color: string; onClose: () => void }) {
  const { t, locale } = useI18n();
  const r = contributors(entries, nutrient);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={t.nutrients[nutrient]}>
      <button type="button" aria-label={t.common.close} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-h-[85dvh] w-full max-w-xl animate-fade-up overflow-y-auto rounded-t-[28px] border border-line bg-surface px-5 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-surface-3" />
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg leading-tight font-semibold">{fmt(t.sources.title, { nutrient: t.nutrients[nutrient] })}</h2>
            <p className="num mt-0.5 text-sm text-muted">{fmt(t.sources.total, { value: formatNutrient(nutrient, r.total, locale) })}</p>
          </div>
          <button type="button" onClick={onClose} className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-muted" aria-label={t.common.close}>
            <X className="size-4" />
          </button>
        </div>

        {r.items.length === 0 ? (
          <p className="mt-4 text-sm text-muted">{t.sources.none}</p>
        ) : (
          <ul className="mt-4 space-y-2.5">
            {r.items.map((c) => (
              <li key={c.name} className="flex items-center gap-3">
                <FoodIcon name={c.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="truncate">{c.name}</span>
                    <span className="num shrink-0 font-semibold">{formatNutrient(nutrient, c.value, locale)}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
                      <div className="h-full rounded-full" style={{ width: `${Math.max(2, c.share * 100)}%`, background: color }} />
                    </div>
                    <span className="num w-[86px] shrink-0 text-right text-[11px] text-muted">
                      {formatNumber(c.grams, locale)} g · {formatNumber(Math.round(c.share * 100), locale)} %
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        {r.unknown > 0 && <p className="mt-4 text-xs text-faint">{fmt(t.sources.unknown, { n: r.unknown })}</p>}
      </div>
    </div>,
    document.body,
  );
}
