import Link from "next/link";
import { Lightbulb, Plus } from "lucide-react";
import type { GapFood } from "@/lib/nutrition/gap-foods";
import type { NutrientKey } from "@/lib/nutrition/nutrients";
import type { Dictionary } from "@/lib/i18n";
import { fmt } from "@/lib/i18n";
import { SOURCES, type GapResult } from "@/lib/nutrition/gaps";
import { NUTRIENTS } from "@/lib/nutrition/nutrients";
import { formatNumber } from "@/lib/format";
import { ProgressBar } from "./ui";

/** Nutrients that were clearly low on the logged days, with foods that help. */
export function NutrientGaps({
  result,
  t,
  locale,
  limit = 3,
  foods = {},
}: {
  result: GapResult;
  t: Dictionary;
  locale: string;
  limit?: number;
  /** Concrete suggestions per nutrient (values from Sigma's database). */
  foods?: Partial<Record<NutrientKey, GapFood[]>>;
}) {
  if (!result.enoughDays) return <p className="text-sm text-muted">{fmt(t.gaps.needDays, { n: 3 })}</p>;
  const lang = locale.startsWith("de") ? "de" : "en";
  return (
    <div className="space-y-3">
      {result.gaps.length === 0 ? (
        <p className="text-sm text-muted">{t.gaps.allGood}</p>
      ) : (
        result.gaps.slice(0, limit).map((g) => {
          const unit = NUTRIENTS[g.key].unit;
          const d = NUTRIENTS[g.key].decimals > 1 ? 1 : NUTRIENTS[g.key].decimals;
          return (
            <div key={g.key} className="rounded-2xl bg-surface-2 p-3">
              <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
                <span className="font-medium">{t.nutrients[g.key]}</span>
                <span className="num text-xs text-muted">
                  Ø {formatNumber(g.avg, locale, d)} / {formatNumber(g.reference, locale, d)} {unit}
                </span>
              </div>
              <ProgressBar value={g.avg} max={g.reference} color="var(--warn)" />
              {foods[g.key]?.length ? (
                <div className="mt-2">
                  <p className="num flex gap-1.5 text-xs text-muted">
                    <Lightbulb className="mt-px size-3.5 shrink-0 text-accent" />
                    {fmt(t.gapFoods.missing, { amount: formatNumber(g.reference - g.avg, locale, d), unit })}
                  </p>
                  <ul className="mt-1.5 space-y-1">
                    {foods[g.key]!.map((f) => (
                      <li key={f.name}>
                        <Link
                          href={f.basicId ? `/nutrition/add?basic=${encodeURIComponent(f.basicId)}&g=${f.grams}` : `/nutrition/add?q=${encodeURIComponent(f.name)}`}
                          className="flex items-center gap-2 rounded-xl bg-surface px-2.5 py-2 text-xs transition hover:bg-surface-3"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="truncate">
                              <span className="num font-medium">{formatNumber(f.grams, locale, 0)} g</span> {f.name}
                            </div>
                            <div className="num text-[11px] text-muted">
                              {fmt(t.gapFoods.adds, { amount: formatNumber(f.adds, locale, d), unit })}
                              {f.covers < 0.95 && ` (${fmt(t.gapFoods.covers, { pct: Math.round(f.covers * 100) })})`}
                              {f.kcal !== null && ` · ${fmt(t.gapFoods.kcal, { kcal: f.kcal })}`}
                              {f.fromDiary && ` · ${t.gapFoods.yours}`}
                            </div>
                          </div>
                          <span className="inline-flex shrink-0 items-center gap-1 text-accent">
                            <Plus className="size-3.5" /> {t.gapFoods.add}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  {g.key === "vitamin_d_ug" && SOURCES.vitamin_d_ug && <p className="mt-1.5 text-[11px] text-faint">{SOURCES.vitamin_d_ug[lang]}</p>}
                </div>
              ) : (
                SOURCES[g.key] && (
                  <p className="mt-2 flex gap-1.5 text-xs text-muted">
                    <Lightbulb className="mt-px size-3.5 shrink-0 text-accent" />
                    {SOURCES[g.key]![lang]}
                  </p>
                )
              )}
            </div>
          );
        })
      )}
      {result.unknown.length > 0 && (
        <p className="text-xs text-faint">{fmt(t.gaps.unknown, { list: result.unknown.map((k) => t.nutrients[k]).join(", ") })}</p>
      )}
      <p className="text-[11px] text-faint">{t.gaps.disclaimer}</p>
    </div>
  );
}
