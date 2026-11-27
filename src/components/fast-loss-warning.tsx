import { TriangleAlert } from "lucide-react";
import type { Dictionary } from "@/lib/i18n";
import { fmt } from "@/lib/i18n";
import type { FastLoss } from "@/lib/body/fast-loss";
import { formatNumber } from "@/lib/format";
import { Notice } from "./ui";

/** Warning when the weight trend falls faster than is good for keeping muscle. */
export function FastLossWarning({ warning, t, locale, compact = false }: { warning: FastLoss | null; t: Dictionary; locale: string; compact?: boolean }) {
  if (!warning) return null;
  const rate = formatNumber(Math.abs(warning.kgPerWeek), locale, 2);
  const text =
    warning.level === "high" || warning.plannedKgPerWeek === null
      ? fmt(t.fastLoss.high, { rate, pct: formatNumber(warning.pctPerWeek, locale, 1) })
      : fmt(t.fastLoss.faster, { rate, planned: formatNumber(Math.abs(warning.plannedKgPerWeek), locale, 2) });
  const advice = warning.extraKcal >= 50 ? fmt(t.fastLoss.advice, { kcal: formatNumber(warning.extraKcal, locale) }) : t.fastLoss.adviceNoKcal;
  return (
    <Notice tone="warn">
      <div className="flex gap-2.5">
        <TriangleAlert className="mt-0.5 size-4 shrink-0" />
        <div className="space-y-1">
          <div className="font-medium">{t.fastLoss.title}</div>
          <p className="num text-text">{text}</p>
          <p className="text-text">{advice}</p>
          {!compact && <p className="text-[11px] text-muted">{t.fastLoss.basis}</p>}
        </div>
      </div>
    </Notice>
  );
}
