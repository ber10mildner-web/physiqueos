"use client";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/client";
import { NUTRIENT_KEYS, NUTRIENTS, type NutrientKey } from "@/lib/nutrition/nutrients";
import { isComplete, type NutrientTotals } from "@/lib/nutrition/calc";
import { REFERENCES } from "@/lib/nutrition/gaps";
import type { Sex } from "@/lib/nutrition/energy";
import { formatNumber, formatNutrient } from "@/lib/format";
import { ProgressBar } from "@/components/ui";
import { NutrientSourcesSheet, type SourceEntry } from "@/components/nutrient-sources";

/**
 * Every tracked nutrient with the amount reached today, against the daily
 * reference where there is one. A * marks sums where some foods had no value.
 * Tapping a nutrient shows which foods brought the most of it.
 */
export function NutrientDetails({ totals, entries, sex }: { totals: NutrientTotals; entries: SourceEntry[]; sex: Sex | null }) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState<NutrientKey | null>(null);
  const groups: { title: string; keys: NutrientKey[] }[] = [
    { title: t.nutrition.vitamins, keys: NUTRIENT_KEYS.filter((k) => NUTRIENTS[k].group === "vitamin") },
    { title: t.nutrition.minerals, keys: NUTRIENT_KEYS.filter((k) => NUTRIENTS[k].group === "mineral") },
    { title: t.nutrition.more, keys: NUTRIENT_KEYS.filter((k) => NUTRIENTS[k].group === "detail") },
  ];
  const anyIncomplete = NUTRIENT_KEYS.some((k) => totals[k].known > 0 && !isComplete(totals[k]));
  return (
    <details className="group">
      <summary className="flex cursor-pointer list-none items-center justify-between">
        <span className="font-semibold">{t.nutrition.details}</span>
        <span className="text-muted transition group-open:rotate-180">⌄</span>
      </summary>
      {groups.map((g) => (
        <div key={g.title} className="mt-4">
          <h3 className="mb-1 text-[13px] font-medium uppercase tracking-[0.08em] text-muted">{g.title}</h3>
          <ul className="divide-y divide-line/60">
            {g.keys.map((k) => {
              const tot = totals[k];
              const r = REFERENCES[k];
              const ref = r ? r[sex ?? "male"] : null;
              const d = Math.min(NUTRIENTS[k].decimals, 1);
              return (
                <li key={k}>
                  <button
                    type="button"
                    disabled={tot.known === 0}
                    onClick={() => setOpen(k)}
                    className="block w-full py-2 text-left text-sm transition active:bg-surface-2 disabled:active:bg-transparent"
                  >
                    <span className="flex items-baseline justify-between gap-3">
                      <span>{t.nutrients[k]}</span>
                      {tot.known === 0 ? (
                        <span className="text-faint">{t.nutrition.noData}</span>
                      ) : (
                        <span className="num whitespace-nowrap">
                          <span className="font-medium">{ref ? formatNumber(tot.value, locale, d) : formatNutrient(k, tot.value, locale)}</span>
                          {!isComplete(tot) && <span className="text-warn">*</span>}
                          {ref && (
                            <span className="text-faint">
                              {" "}
                              / {formatNumber(ref, locale, d)} {NUTRIENTS[k].unit}
                            </span>
                          )}
                        </span>
                      )}
                    </span>
                    {ref && tot.known > 0 && <ProgressBar value={Math.min(tot.value, ref)} max={ref} color={tot.value >= ref ? "var(--accent)" : "var(--fiber)"} className="mt-1.5 !h-1" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <p className="mt-3 text-xs text-faint">
        {t.nutrition.detailsHint}
        {anyIncomplete && ` ${t.nutrition.incompleteHint}`}
      </p>
      {open && <NutrientSourcesSheet nutrient={open} entries={entries} color="var(--accent)" onClose={() => setOpen(null)} />}
    </details>
  );
}
