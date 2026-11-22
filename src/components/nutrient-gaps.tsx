import { Lightbulb } from "lucide-react";
import type { Dictionary } from "@/lib/i18n";
import { fmt } from "@/lib/i18n";
import { SOURCES, type GapResult } from "@/lib/nutrition/gaps";
import { NUTRIENTS } from "@/lib/nutrition/nutrients";
import { formatNumber } from "@/lib/format";
import { ProgressBar } from "./ui";

/** Nutrients that were clearly low on the logged days, with foods that help. */
export function NutrientGaps({ result, t, locale, limit = 3 }: { result: GapResult; t: Dictionary; locale: string; limit?: number }) {
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
              {SOURCES[g.key] && (
                <p className="mt-2 flex gap-1.5 text-xs text-muted">
                  <Lightbulb className="mt-px size-3.5 shrink-0 text-accent" />
                  {SOURCES[g.key]![lang]}
                </p>
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
