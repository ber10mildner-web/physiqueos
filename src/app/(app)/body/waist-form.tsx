"use client";
import { useState, useTransition } from "react";
import { useI18n } from "@/lib/i18n/client";
import { fmt } from "@/lib/i18n";
import { formatDate } from "@/lib/dates";
import { formatNumber } from "@/lib/format";
import type { WaistTrend } from "@/lib/body/progress";
import { Button, Field, Input, Notice, cx } from "@/components/ui";
import { deleteWaistAction, saveWaistAction } from "./actions";

/** Waist measurement: latest value, change, a small form and the last entries. */
export function WaistCard({ today, trend, history }: { today: string; trend: WaistTrend | null; history: { id: string; date: string; waist_cm: number }[] }) {
  const { t, locale } = useI18n();
  const [value, setValue] = useState("");
  const [date, setDate] = useState(today);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [pending, start] = useTransition();
  const cm = Number(value.replace(",", "."));
  const valid = value.trim() !== "" && cm >= 40 && cm <= 200;

  return (
    <div className="space-y-3">
      {trend ? (
        <div className="flex items-end justify-between">
          <div className="num text-3xl font-semibold tracking-tight">
            {formatNumber(trend.latest, locale, 1)}
            <span className="ml-1 text-base font-normal text-muted">cm</span>
          </div>
          {trend.days > 0 ? (
            <div className={cx("num rounded-full px-3 py-1 text-sm", trend.change <= 0 ? "bg-fiber/10 text-fiber" : "bg-carbs/10 text-carbs")}>
              {fmt(t.waist.change, { change: `${trend.change > 0 ? "+" : ""}${formatNumber(trend.change, locale, 1)}`, days: trend.days })}
            </div>
          ) : (
            <div className="max-w-[60%] text-right text-xs text-muted">{t.waist.first}</div>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted">{t.waist.none}</p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label={t.waist.label}>
          <Input
            type="number"
            inputMode="decimal"
            step="0.1"
            min={40}
            max={200}
            value={value}
            placeholder={trend ? String(trend.latest) : "85"}
            onChange={(e) => {
              setValue(e.target.value);
              setStatus("idle");
            }}
            className="num text-lg"
          />
        </Field>
        <Field label={t.body.date}>
          <Input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>
      <p className="text-xs text-faint">{t.waist.how}</p>
      {status === "error" && <Notice tone="error">{t.errors.invalidInput}</Notice>}
      <Button
        type="button"
        className="w-full"
        disabled={!valid || pending}
        onClick={() =>
          start(async () => {
            const res = await saveWaistAction({ date, waist_cm: cm });
            setStatus(res.ok ? "saved" : "error");
            if (res.ok) setValue("");
          })
        }
      >
        {pending ? t.common.saving : status === "saved" ? `✓ ${t.common.saved}` : t.common.save}
      </Button>
      {history.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer list-none text-center text-xs text-muted">{t.waist.history}</summary>
          <ul className="mt-2 divide-y divide-line text-sm">
            {[...history].reverse().slice(0, 12).map((h) => (
              <li key={h.id} className="flex items-center justify-between py-2">
                <span className="text-muted">{formatDate(h.date, locale, { day: "numeric", month: "short", year: "numeric" })}</span>
                <span className="flex items-center gap-3">
                  <span className="num">{formatNumber(h.waist_cm, locale, 1)} cm</span>
                  <button type="button" className="text-xs text-faint hover:text-text" onClick={() => start(async () => void (await deleteWaistAction(h.id)))}>
                    {t.common.delete}
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
