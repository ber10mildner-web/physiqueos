"use client";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/client";
import { fmt } from "@/lib/i18n";
import type { NutrientTotals } from "@/lib/nutrition/calc";
import type { NutritionGoal } from "@/lib/data/types";
import { formatNumber } from "@/lib/format";
import { ProgressBar } from "./ui";
import { NutrientSourcesSheet, type SourceEntry } from "./nutrient-sources";

const MACROS = [
  { key: "protein_g", color: "var(--protein)" },
  { key: "carbs_g", color: "var(--carbs)" },
  { key: "fat_g", color: "var(--fat)" },
  { key: "fiber_g", color: "var(--fiber)" },
] as const;

type MacroKey = (typeof MACROS)[number]["key"];

/** Macro bars. With the day's entries, tapping a macro shows which foods brought the most of it. */
export function MacroGrid({ totals, goal, entries }: { totals: NutrientTotals; goal: NutritionGoal | null; entries?: SourceEntry[] }) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState<MacroKey | null>(null);
  const tappable = Boolean(entries?.length);
  const color = MACROS.find((m) => m.key === open)?.color ?? "var(--accent)";
  return (
    <>
      <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4">
        {MACROS.map((m) => {
          const tot = totals[m.key];
          const g = goal?.[m.key] ?? 0;
          const incomplete = tot.of > 0 && tot.known < tot.of;
          const body = (
            <>
              <div className="mb-1.5 flex items-baseline justify-between gap-2 text-[13px]">
                <span className="truncate text-muted">{t.nutrients[m.key]}</span>
                <span className="num shrink-0 whitespace-nowrap">
                  {formatNumber(tot.value, locale)}
                  {incomplete && <span className="text-warn" title={fmt(t.nutrition.coverage, { known: tot.known, of: tot.of })}>*</span>}
                  <span className="text-faint">{g > 0 ? `/${g}` : ""} g</span>
                </span>
              </div>
              <ProgressBar value={tot.value} max={g} color={m.color} />
            </>
          );
          return tappable ? (
            <button
              key={m.key}
              type="button"
              onClick={() => setOpen(m.key)}
              aria-label={fmt(t.sources.open, { nutrient: t.nutrients[m.key] })}
              className="-m-1.5 rounded-xl p-1.5 text-left transition active:scale-[0.98] active:bg-surface-2"
            >
              {body}
            </button>
          ) : (
            <div key={m.key}>{body}</div>
          );
        })}
      </div>
      {open && entries && <NutrientSourcesSheet nutrient={open} entries={entries} color={color} onClose={() => setOpen(null)} />}
    </>
  );
}
