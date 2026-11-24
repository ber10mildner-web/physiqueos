import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import type { Dictionary } from "@/lib/i18n";
import { fmt } from "@/lib/i18n";
import type { ProgressData } from "@/lib/progress-data";
import type { SignalStatus } from "@/lib/body/progress";
import { formatNumber } from "@/lib/format";
import { Card, SectionTitle, buttonClass, cx } from "./ui";

const DOT: Record<SignalStatus, string> = { good: "bg-fiber", warn: "bg-carbs", info: "bg-faint" };
const signed = (v: number, locale: string, d: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${formatNumber(Math.abs(v), locale, d)}`;

/**
 * Weekly check-in: weight trend against the goal's pace, waist, strength,
 * protein and photos, with one overall verdict. `title` switches between the
 * Sunday check-in on the start page and the always visible progress card.
 */
export function CheckinCard({ progress, goalLabel, t, locale, variant = "progress" }: { progress: ProgressData; goalLabel: string | null; t: Dictionary; locale: string; variant?: "sunday" | "progress" }) {
  const format = (key: string, v: number | string) => {
    if (typeof v !== "number") return v;
    if (key === "rate" || key === "aim") return signed(v, locale, 2);
    if (key === "change" || key === "pct") return signed(v, locale, 1);
    if (key === "cm") return formatNumber(v, locale, 1);
    return formatNumber(v, locale);
  };
  const advice = (t.checkin.advice as Record<string, string>)[progress.verdict];
  const needsWaist = progress.signals.some((s) => s.msg === "waist_none" || s.msg === "waist_first");
  const needsPhoto = progress.signals.some((s) => s.msg === "photo_due" || s.msg === "photo_none");

  return (
    <Card>
      <SectionTitle>
        <span className="inline-flex items-center gap-2">
          <ClipboardCheck className="size-4 text-accent" /> {variant === "sunday" ? t.checkin.title : t.checkin.progressTitle}
        </span>
      </SectionTitle>
      {goalLabel && <p className="-mt-1 mb-2 text-xs text-muted">{goalLabel}</p>}
      <div className={cx("rounded-2xl p-3", progress.verdict === "on_track" ? "bg-fiber/10" : progress.verdict === "needs_data" ? "bg-surface-2" : "bg-carbs/10")}>
        <div className="font-medium">{t.checkin.verdict[progress.verdict]}</div>
        {advice && <p className="mt-1 text-xs text-muted">{advice}</p>}
      </div>
      <ul className="mt-3 space-y-2.5">
        {progress.signals.map((s) => (
          <li key={s.key} className="flex gap-3 text-sm">
            <span className={cx("mt-1.5 size-2 shrink-0 rounded-full", DOT[s.status])} aria-hidden="true" />
            <div className="min-w-0">
              <span className="font-medium">{t.checkin.labels[s.key]}</span>{" "}
              <span className="num text-muted">{fmt((t.checkin.msg as Record<string, string>)[s.msg] ?? s.msg, Object.fromEntries(Object.entries(s.values).map(([k, v]) => [k, format(k, v)])))}</span>
            </div>
          </li>
        ))}
      </ul>
      {(needsWaist || needsPhoto) && (
        <div className={cx("mt-3 grid gap-2", needsWaist && needsPhoto ? "grid-cols-2" : "grid-cols-1")}>
          {needsWaist && (
            <Link href="/body#waist" className={buttonClass("secondary", "sm")}>
              {t.checkin.measure}
            </Link>
          )}
          {needsPhoto && (
            <Link href="/body/photos" className={buttonClass("secondary", "sm")}>
              {t.checkin.photo}
            </Link>
          )}
        </div>
      )}
      <p className="mt-3 text-[11px] text-faint">{t.checkin.basis}</p>
    </Card>
  );
}
