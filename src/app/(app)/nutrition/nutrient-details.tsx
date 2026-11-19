import type { Dictionary } from "@/lib/i18n";
import { fmt } from "@/lib/i18n";
import { NUTRIENT_KEYS, NUTRIENTS, type NutrientKey } from "@/lib/nutrition/nutrients";
import { isComplete, type NutrientTotals } from "@/lib/nutrition/calc";
import { formatNutrient } from "@/lib/format";

/** Every tracked nutrient with how many of the day's foods actually had data. */
export function NutrientDetails({ totals, t, locale }: { totals: NutrientTotals; t: Dictionary; locale: string }) {
  const groups: { title: string; keys: NutrientKey[] }[] = [
    { title: t.nutrition.more, keys: NUTRIENT_KEYS.filter((k) => NUTRIENTS[k].group === "detail") },
    { title: t.nutrition.minerals, keys: NUTRIENT_KEYS.filter((k) => NUTRIENTS[k].group === "mineral") },
    { title: t.nutrition.vitamins, keys: NUTRIENT_KEYS.filter((k) => NUTRIENTS[k].group === "vitamin") },
  ];
  return (
    <details className="group">
      <summary className="flex cursor-pointer list-none items-center justify-between">
        <span className="font-semibold">{t.nutrition.details}</span>
        <span className="text-muted transition group-open:rotate-180">⌄</span>
      </summary>
      <p className="mt-2 text-xs text-faint">{t.nutrition.detailsHint}</p>
      {groups.map((g) => (
        <div key={g.title} className="mt-4">
          <h3 className="mb-1 text-[13px] font-medium uppercase tracking-[0.08em] text-muted">{g.title}</h3>
          <ul className="divide-y divide-line/60">
            {g.keys.map((k) => {
              const tot = totals[k];
              return (
                <li key={k} className="flex items-center justify-between py-2 text-sm">
                  <span>{t.nutrients[k]}</span>
                  {tot.known === 0 ? (
                    <span className="text-faint">{t.nutrition.noData}</span>
                  ) : (
                    <span className="num">
                      {formatNutrient(k, tot.value, locale)}
                      {!isComplete(tot) && (
                        <span className="ml-2 text-xs text-warn">{fmt(t.nutrition.coverage, { known: tot.known, of: tot.of })}</span>
                      )}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </details>
  );
}
