"use client";
import { useI18n } from "@/lib/i18n/client";
import type { FoodCandidate } from "@/lib/food-sources/types";
import { hasRequiredNutrients } from "@/lib/nutrition/nutrients";
import { formatNumber } from "@/lib/format";

export function FoodRow({ food, onSelect }: { food: FoodCandidate; onSelect: (f: FoodCandidate) => void }) {
  const { t, locale } = useI18n();
  const n = food.nutrients;
  const complete = hasRequiredNutrients(n);
  return (
    <li>
      <button type="button" onClick={() => onSelect(food)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-2/60">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px]">{food.name}</div>
          <div className="num truncate text-xs text-muted">
            {food.brand ? `${food.brand} · ` : ""}
            {complete
              ? `${t.nutrientShort.protein_g} ${formatNumber(n.protein_g!, locale, 1)} · ${t.nutrientShort.carbs_g} ${formatNumber(n.carbs_g!, locale, 1)} · ${t.nutrientShort.fat_g} ${formatNumber(n.fat_g!, locale, 1)}${n.fiber_g !== undefined ? ` · ${t.nutrientShort.fiber_g} ${formatNumber(n.fiber_g, locale, 1)}` : ""}`
              : t.common.unknown}
          </div>
        </div>
        <div className="text-right">
          <div className="num text-sm">{n.energy_kcal !== undefined ? formatNumber(n.energy_kcal, locale) : "–"}</div>
          <div className="text-[10px] text-faint">kcal/100 g</div>
        </div>
      </button>
    </li>
  );
}
