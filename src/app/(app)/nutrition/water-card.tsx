"use client";
import { useOptimistic, useTransition } from "react";
import { Droplet, Minus } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { fmt } from "@/lib/i18n";
import { formatNumber } from "@/lib/format";
import { ProgressBar } from "@/components/ui";
import { changeWater } from "./actions";

export function WaterCard({ date, totalMl, targetMl }: { date: string; totalMl: number; targetMl: number }) {
  const { t, locale } = useI18n();
  const [pending, start] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(totalMl);
  const add = (ml: number) =>
    start(async () => {
      setOptimistic(Math.max(0, optimistic + ml));
      await changeWater(date, ml);
    });
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="inline-flex items-center gap-1.5 font-semibold">
          <Droplet className="size-4 text-protein" /> {t.tracking.water}
        </span>
        <span className="num text-sm">
          {formatNumber(optimistic / 1000, locale, 2)} l <span className="text-faint">· {fmt(t.tracking.waterTarget, { value: formatNumber(targetMl / 1000, locale, 1) })}</span>
        </span>
      </div>
      <ProgressBar value={optimistic} max={targetMl} color="var(--protein)" />
      <div className="mt-3 flex gap-2">
        {[250, 500].map((ml) => (
          <button key={ml} type="button" disabled={pending} onClick={() => add(ml)} className="num h-9 flex-1 rounded-xl border border-line bg-surface-2 text-sm hover:bg-surface-3">
            +{ml} ml
          </button>
        ))}
        <button
          type="button"
          disabled={pending || optimistic <= 0}
          onClick={() => add(-250)}
          aria-label={`${t.tracking.undo} 250 ml`}
          className="grid h-9 w-11 place-items-center rounded-xl border border-line text-muted hover:bg-surface-2 disabled:opacity-40"
        >
          <Minus className="size-4" />
        </button>
      </div>
    </div>
  );
}
