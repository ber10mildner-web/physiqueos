import type { Dictionary } from "@/lib/i18n";
import { fmt } from "@/lib/i18n";
import type { DiaryEntry, MealSlot } from "@/lib/data/types";
import { sumItems } from "@/lib/nutrition/calc";
import { formatNumber } from "@/lib/format";
import { SectionTitle, cx } from "@/components/ui";

/** Protein per meal as bars against the per-meal target (≈0.4 g/kg). */
export function ProteinMeals({ meals, entries, target, weightKnown, t, locale }: { meals: { key: MealSlot; name: string }[]; entries: DiaryEntry[]; target: number; weightKnown: boolean; t: Dictionary; locale: string }) {
  const rows = meals.map((m) => {
    const items = entries.filter((e) => e.meal === m.key);
    return { meal: m.key, name: m.name, protein: sumItems(items).protein_g.value, items: items.length };
  });
  const max = Math.max(target * 1.5, ...rows.map((r) => r.protein));
  const main = rows.filter((r) => r.meal !== "snack");
  const reached = main.filter((r) => r.protein >= target).length;
  return (
    <div>
      <SectionTitle>{t.proteinMeals.title}</SectionTitle>
      <div className="flex h-32 items-end gap-3">
        {rows.map((r) => {
          const ok = r.protein >= target;
          return (
            <div key={r.meal} className="flex flex-1 flex-col items-center gap-1.5">
              <span className={cx("num text-xs", ok ? "text-protein" : "text-muted")}>{r.items ? `${formatNumber(r.protein, locale)} g` : "–"}</span>
              <div className="relative flex h-20 w-full items-end overflow-hidden rounded-xl bg-surface-2">
                <div className="absolute inset-x-0 border-t border-dashed border-protein/60" style={{ bottom: `${(target / max) * 100}%` }} />
                <div className={cx("w-full rounded-xl transition-[height] duration-500", ok ? "bg-protein" : "bg-protein/40")} style={{ height: `${(r.protein / max) * 100}%` }} />
              </div>
              <span className="truncate text-[11px] text-muted">{r.name}</span>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-faint">
        {fmt(t.proteinMeals.summary, { reached, of: main.length, target })} {weightKnown ? t.proteinMeals.basisWeight : t.proteinMeals.basisGoal}
      </p>
    </div>
  );
}
