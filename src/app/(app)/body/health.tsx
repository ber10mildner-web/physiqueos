"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";
import { fmt } from "@/lib/i18n";
import { formatDate } from "@/lib/dates";
import { formatNumber } from "@/lib/format";
import type { DailyHealth } from "@/lib/data/types";
import { Button, EmptyState, Field, Input, Notice } from "@/components/ui";
import { saveHealth } from "./actions";

const FIELDS = [
  { name: "sleep_score", max: 100 },
  { name: "sleep_hours", max: 24, decimal: true },
  { name: "resting_hr", max: 200 },
  { name: "hrv_ms", max: 300 },
  { name: "body_battery", max: 100 },
  { name: "stress", max: 100 },
  { name: "steps", max: 200000 },
] as const;

export function HealthForm({ today }: { today: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const labels: Record<(typeof FIELDS)[number]["name"], string> = {
    sleep_score: t.health.sleepScore,
    sleep_hours: t.health.sleepHours,
    resting_hr: t.health.restingHr,
    hrv_ms: t.health.hrv,
    body_battery: t.health.bodyBattery,
    stress: t.health.stress,
    steps: t.health.steps,
  };
  return (
    <form
      className="space-y-3"
      action={(fd) =>
        start(async () => {
          const n = (k: string) => {
            const s = String(fd.get(k) ?? "").trim().replace(",", ".");
            return s === "" ? null : Number(s);
          };
          const int = (k: string) => {
            const v = n(k);
            return v === null ? null : Math.round(v);
          };
          const hours = n("sleep_hours");
          const res = await saveHealth({
            date: String(fd.get("date")),
            sleep_score: int("sleep_score"),
            sleep_minutes: hours === null ? null : Math.round(hours * 60),
            resting_hr: int("resting_hr"),
            hrv_ms: int("hrv_ms"),
            body_battery: int("body_battery"),
            steps: int("steps"),
            stress: int("stress"),
          });
          setStatus(res.ok ? "saved" : "error");
          if (res.ok) router.refresh();
        })
      }
    >
      <Field label={t.body.date}>
        <Input name="date" type="date" defaultValue={today} max={today} required />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        {FIELDS.map((f) => (
          <Field key={f.name} label={labels[f.name]}>
            <Input name={f.name} type="number" inputMode={"decimal" in f ? "decimal" : "numeric"} step={"decimal" in f ? "0.1" : "1"} min={0} max={f.max} className="num" />
          </Field>
        ))}
      </div>
      {status === "error" && <Notice tone="error">{t.errors.invalidInput}</Notice>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? t.common.saving : status === "saved" ? `✓ ${t.common.saved}` : t.common.save}
      </Button>
      <p className="text-xs text-faint">{t.health.garminHint}</p>
    </form>
  );
}

export function HealthList({ days }: { days: DailyHealth[] }) {
  const { t, locale } = useI18n();
  if (!days.length) return <EmptyState>{t.health.empty}</EmptyState>;
  return (
    <ul className="divide-y divide-line">
      {days.map((d) => {
        const parts = [
          d.sleep_score !== null && `${t.health.sleepScore} ${d.sleep_score}`,
          d.sleep_minutes !== null && fmt(t.health.minutesShort, { h: Math.floor(d.sleep_minutes / 60), m: d.sleep_minutes % 60 }),
          d.resting_hr !== null && `${t.health.restingHr} ${d.resting_hr}`,
          d.hrv_ms !== null && `HRV ${d.hrv_ms}`,
          d.body_battery !== null && `${t.health.bodyBattery} ${d.body_battery}`,
          d.stress !== null && `${t.health.stress} ${d.stress}`,
          d.steps !== null && `${formatNumber(d.steps, locale)} ${t.health.steps}`,
        ].filter(Boolean);
        return (
          <li key={d.entry_date} className="py-2.5">
            <div className="text-sm font-medium">{formatDate(d.entry_date, locale)}</div>
            <div className="num text-xs text-muted">{parts.join(" · ")}</div>
          </li>
        );
      })}
    </ul>
  );
}

/** Latest day's values as tiles; only values that exist are shown. */
export function HealthToday({ day }: { day: DailyHealth | null }) {
  const { t, locale } = useI18n();
  if (!day) return <EmptyState>{t.health.empty}</EmptyState>;
  const tiles = [
    day.sleep_minutes !== null && { label: t.health.sleepHours.replace(" (h)", ""), value: fmt(t.health.minutesShort, { h: Math.floor(day.sleep_minutes / 60), m: day.sleep_minutes % 60 }) },
    day.sleep_score !== null && { label: t.health.sleepScore, value: String(day.sleep_score) },
    day.body_battery !== null && { label: t.health.bodyBattery, value: String(day.body_battery) },
    day.resting_hr !== null && { label: t.health.restingHr, value: `${day.resting_hr} bpm` },
    day.hrv_ms !== null && { label: "HRV", value: `${day.hrv_ms} ms` },
    day.stress !== null && { label: t.health.stress, value: String(day.stress) },
    day.steps !== null && { label: t.health.steps, value: formatNumber(day.steps, locale) },
  ].filter((x): x is { label: string; value: string } => Boolean(x));
  return (
    <div>
      <div className="mb-2 text-xs text-muted">
        {formatDate(day.entry_date, locale)}
        {day.source === "garmin" ? " · Garmin" : ""}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {tiles.map((x) => (
          <div key={x.label} className="rounded-2xl bg-surface-2 px-3 py-2.5">
            <div className="truncate text-xs text-muted">{x.label}</div>
            <div className="num mt-0.5 font-semibold">{x.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
