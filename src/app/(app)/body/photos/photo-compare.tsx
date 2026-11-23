"use client";
/* eslint-disable @next/next/no-img-element -- signed URLs are short-lived; bypass the image optimizer on purpose */
import { useState } from "react";
import { X } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { fmt } from "@/lib/i18n";
import type { ProgressPhoto } from "@/lib/data/types";
import { dayNumber } from "@/lib/body/weight";
import { formatDate } from "@/lib/dates";
import { formatNumber } from "@/lib/format";
import { Card, cx } from "@/components/ui";

/** Before/after of two photos: side by side, or blended with a slider. */
export function PhotoCompare({
  pair,
  weights,
  title,
  onClose,
}: {
  pair: [ProgressPhoto, ProgressPhoto];
  /** Smoothed weight near each photo's date (null if none). */
  weights: [number | null, number | null];
  title?: string;
  onClose?: () => void;
}) {
  const { t, locale } = useI18n();
  const [mode, setMode] = useState<"side" | "slider">("side");
  const [pos, setPos] = useState(50);
  const [before, after] = pair;
  const days = dayNumber(after.taken_on) - dayNumber(before.taken_on);
  const diff = weights[0] !== null && weights[1] !== null ? weights[1] - weights[0] : null;

  const caption = (p: ProgressPhoto, i: 0 | 1) => (
    <div className="text-xs">
      <div className="font-medium">{i === 0 ? t.photos.before : t.photos.after}</div>
      <div className="num text-muted">
        {formatDate(p.taken_on, locale)}
        {weights[i] !== null && ` · ${formatNumber(weights[i]!, locale, 1)} kg`}
      </div>
    </div>
  );

  return (
    <Card className="!p-3">
      <div className="mb-2 flex items-center gap-2">
        <div className="min-w-0 flex-1">
          {title && <div className="truncate text-sm font-medium">{title}</div>}
          <div className="num text-xs text-muted">
            {fmt(t.photos.days, { n: days })}
            {diff !== null && (
              <span className={cx("ml-1.5 font-medium", diff <= 0 ? "text-fiber" : "text-carbs")}>
                · {fmt(t.photoCompare.weightDiff, { diff: `${diff > 0 ? "+" : diff < 0 ? "−" : ""}${formatNumber(Math.abs(diff), locale, 1)}` })}
              </span>
            )}
          </div>
        </div>
        {onClose && (
          <button type="button" className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2" aria-label={t.photos.compareDone} onClick={onClose}>
            <X className="size-4" />
          </button>
        )}
      </div>
      <div className="mb-2 grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-0.5">
        {(["side", "slider"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cx("h-7 rounded-lg px-2.5 text-xs font-medium", mode === m ? "bg-surface-3 text-text" : "text-muted")}
          >
            {m === "side" ? t.photoCompare.sideBySide : t.photoCompare.slider}
          </button>
        ))}
      </div>

      {mode === "side" ? (
        <div className="grid grid-cols-2 gap-2">
          {pair.map((p, i) => (
            <figure key={p.id}>
              {p.url ? <img src={p.url} alt="" className="aspect-[3/4] w-full rounded-2xl bg-surface-2 object-cover" /> : <div className="aspect-[3/4] rounded-2xl bg-surface-2" />}
              <figcaption className="mt-1.5">{caption(p, i as 0 | 1)}</figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <div>
          <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-surface-2">
            {before.url && <img src={before.url} alt="" className="absolute inset-0 size-full object-cover" />}
            {after.url && <img src={after.url} alt="" className="absolute inset-0 size-full object-cover" style={{ clipPath: `inset(0 0 0 ${pos}%)` }} />}
            <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white/90 shadow" style={{ left: `${pos}%` }} />
            <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] text-white">{t.photos.before}</span>
            <span className="absolute right-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] text-white">{t.photos.after}</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={pos}
            onChange={(e) => setPos(Number(e.target.value))}
            aria-label={t.photoCompare.sliderHint}
            className="mt-3 w-full accent-[var(--accent)]"
          />
          <div className="mt-1 flex justify-between">
            {caption(before, 0)}
            <div className="text-right">{caption(after, 1)}</div>
          </div>
        </div>
      )}
    </Card>
  );
}
