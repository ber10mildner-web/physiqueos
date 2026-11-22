"use client";
import { useOptimistic, useState, useTransition } from "react";
import { CloudOff, Droplet, GlassWater, Minus } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { fmt } from "@/lib/i18n";
import { formatNumber } from "@/lib/format";
import { runOrQueue } from "@/lib/offline/queue";
import { ProgressBar, cx } from "@/components/ui";

const GLASS_ML = 250;

/** Water with one tap per glass. Works offline (sent when back online). */
export function WaterCard({ date, totalMl, targetMl, compact = false }: { date: string; totalMl: number; targetMl: number; compact?: boolean }) {
  const { t, locale } = useI18n();
  const [pending, start] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(totalMl);
  const [queued, setQueued] = useState(0);
  const add = (ml: number) =>
    start(async () => {
      setOptimistic(Math.max(0, optimistic + ml));
      const res = await runOrQueue("water", { date, ml });
      if (res.ok && res.queued) setQueued((q) => q + ml);
    });
  const total = optimistic + queued;
  const glasses = Math.max(1, Math.round(targetMl / GLASS_ML));
  const filled = Math.min(glasses, Math.floor(total / GLASS_ML));

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="inline-flex items-center gap-1.5 font-semibold">
          <Droplet className="size-4 text-protein" /> {t.tracking.water}
        </span>
        <span className="num text-sm">
          {formatNumber(total / 1000, locale, 2)} l <span className="text-faint">· {fmt(t.tracking.waterTarget, { value: formatNumber(targetMl / 1000, locale, 1) })}</span>
        </span>
      </div>
      {compact ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => add(GLASS_ML)}
            aria-label={`+${GLASS_ML} ml`}
            className="grid flex-1 grid-flow-col gap-1 rounded-2xl bg-surface-2 p-2 transition active:scale-[0.98]"
            style={{ gridTemplateColumns: `repeat(${Math.min(glasses, 12)}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: Math.min(glasses, 12) }, (_, i) => (
              <GlassWater key={i} className={cx("mx-auto size-5", i < filled ? "text-protein" : "text-surface-3")} strokeWidth={i < filled ? 2.2 : 1.6} />
            ))}
          </button>
          <button
            type="button"
            onClick={() => add(GLASS_ML)}
            className="num h-11 rounded-2xl bg-protein/15 px-3 text-sm font-medium text-protein active:scale-[0.97]"
          >
            +{GLASS_ML} ml
          </button>
        </div>
      ) : (
        <>
          <ProgressBar value={total} max={targetMl} color="var(--protein)" />
          <div className="mt-3 flex gap-2">
            {[250, 500].map((ml) => (
              <button key={ml} type="button" disabled={pending} onClick={() => add(ml)} className="num h-9 flex-1 rounded-xl border border-line bg-surface-2 text-sm hover:bg-surface-3">
                +{ml} ml
              </button>
            ))}
            <button
              type="button"
              disabled={pending || total <= 0}
              onClick={() => add(-250)}
              aria-label={`${t.tracking.undo} 250 ml`}
              className="grid h-9 w-11 place-items-center rounded-xl border border-line text-muted hover:bg-surface-2 disabled:opacity-40"
            >
              <Minus className="size-4" />
            </button>
          </div>
        </>
      )}
      {queued !== 0 && (
        <p className="mt-2 inline-flex items-center gap-1 text-xs text-muted">
          <CloudOff className="size-3.5" /> {t.offline.queuedShort}
        </p>
      )}
    </div>
  );
}
