"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { ChevronDown, Repeat, Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { formatDate } from "@/lib/dates";
import { formatNumber } from "@/lib/format";
import { CARDIO_ACTIVITIES } from "@/lib/data/types";
import type { CardioWithEstimate } from "@/lib/cardio";
import { fmt } from "@/lib/i18n";
import { cx } from "@/components/ui";
import { CardioDetails } from "./cardio-details";
import { Button, EmptyState, Field, Input, Notice, Select } from "@/components/ui";
import { addCardioAction, deleteCardioAction } from "./actions";

const optNum = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim().replace(",", ".");
  return s === "" ? null : Number(s);
};

export function CardioForm({ today }: { today: string }) {
  const { t } = useI18n();
  const [pending, start] = useTransition();
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  return (
    <form
      className="space-y-3"
      action={(fd) =>
        start(async () => {
          const avg = optNum(fd.get("avg_hr"));
          const kcal = optNum(fd.get("kcal"));
          const res = await addCardioAction({
            date: String(fd.get("date")),
            activity: String(fd.get("activity")),
            duration_min: Number(optNum(fd.get("duration_min"))),
            distance_km: optNum(fd.get("distance_km")),
            avg_hr: avg === null ? null : Math.round(avg),
            kcal: kcal === null ? null : Math.round(kcal),
            incline_pct: optNum(fd.get("incline_pct")),
            speed_kmh: optNum(fd.get("speed_kmh")),
          });
          setStatus(res.ok ? "saved" : "error");
        })
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label={t.training.activity}>
          <Select name="activity" defaultValue="run">
            {CARDIO_ACTIVITIES.map((a) => (
              <option key={a} value={a}>
                {t.training.activities[a]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t.body.date}>
          <Input name="date" type="date" defaultValue={today} max={today} required />
        </Field>
        <Field label={t.training.durationMin}>
          <Input name="duration_min" type="number" inputMode="decimal" min={1} max={1440} step="any" required className="num" />
        </Field>
        <Field label={`${t.training.distanceKm} (${t.common.optional})`}>
          <Input name="distance_km" type="number" inputMode="decimal" min={0} max={1000} step="any" className="num" />
        </Field>
        <Field label={`${t.training.avgHr} (${t.common.optional})`}>
          <Input name="avg_hr" type="number" inputMode="numeric" min={30} max={250} className="num" />
        </Field>
        <Field label={`${t.training.kcal} (${t.common.optional})`}>
          <Input name="kcal" type="number" inputMode="numeric" min={0} max={10000} className="num" />
        </Field>
        <Field label={`${t.routines.incline} (${t.common.optional})`}>
          <Input name="incline_pct" type="number" inputMode="decimal" min={0} max={40} step="any" className="num" />
        </Field>
        <Field label={`${t.routines.speed} (${t.common.optional})`}>
          <Input name="speed_kmh" type="number" inputMode="decimal" min={0} max={40} step="any" className="num" />
        </Field>
      </div>
      {status === "error" && <Notice tone="error">{t.errors.invalidInput}</Notice>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? t.common.saving : status === "saved" ? `✓ ${t.common.saved}` : t.common.save}
      </Button>
    </form>
  );
}

export function CardioList({
  sessions,
  userId,
  photoUrls,
  aiEnabled,
  hasWeight,
}: {
  sessions: CardioWithEstimate[];
  userId: string;
  photoUrls: Record<string, string>;
  aiEnabled: boolean;
  hasWeight: boolean;
}) {
  const { t, locale } = useI18n();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState<string | null>(null);
  if (!sessions.length) return <EmptyState>{t.training.noCardio}</EmptyState>;
  return (
    <ul className="divide-y divide-line">
      {sessions.map((c) => {
        const machineEmpty = [c.machine_minutes, c.machine_level, c.machine_floors, c.machine_steps, c.machine_kcal].every((v) => v === null);
        const showEstimate = c.estimate && c.estimate.sources.length > 1;
        return (
          <li key={c.id} className="py-3">
            <div className="flex items-center gap-3">
              <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setOpen(open === c.id ? null : c.id)} aria-expanded={open === c.id}>
                <div className="flex items-center gap-1.5 font-medium">
                  {t.training.activities[c.activity]}
                  {c.source === "garmin" && <span className="text-xs font-normal text-faint">· Garmin</span>}
                  {c.template_id && c.notes && <span className="truncate text-xs font-normal text-faint">· {c.notes}</span>}
                  <ChevronDown className={cx("size-4 text-faint transition", open === c.id && "rotate-180")} />
                </div>
                <div className="num text-xs text-muted">
                  {formatDate(c.session_date, locale)} · {formatNumber(c.duration_min, locale)} min
                  {c.distance_km !== null && ` · ${formatNumber(c.distance_km, locale, 2)} km`}
                  {c.avg_hr !== null && ` · ${c.avg_hr} bpm`}
                  {c.kcal !== null && ` · ${c.kcal} kcal`}
                  {c.incline_pct !== null && ` · ${formatNumber(c.incline_pct, locale, 1)} %`}
                  {c.speed_kmh !== null && ` · ${formatNumber(c.speed_kmh, locale, 1)} km/h`}
                </div>
                {(showEstimate || c.feeling !== null || (c.machine_photo_path && machineEmpty)) && (
                  <div className="num mt-0.5 text-xs">
                    {showEstimate && <span className="text-accent">{t.machine.estimate} {fmt(t.machine.estimateShort, { kcal: formatNumber(c.estimate!.kcal, locale) })}</span>}
                    {showEstimate && c.feeling !== null && <span className="text-faint"> · </span>}
                    {c.feeling !== null && <span className="text-muted">{t.rating.feeling} {c.feeling}/10</span>}
                    {c.machine_photo_path && machineEmpty && <span className="text-warn"> {t.machine.waiting}</span>}
                  </div>
                )}
              </button>
              {!c.template_id && (
                <Link
                  href={`/training?vorlage=${c.id}#routines`}
                  aria-label={t.routines.saveAsTemplate}
                  title={t.routines.saveAsTemplate}
                  className="grid size-9 place-items-center rounded-xl text-faint hover:text-accent"
                >
                  <Repeat className="size-4" />
                </Link>
              )}
              <button
                type="button"
                aria-label={t.common.delete}
                disabled={pending}
                className="grid size-9 place-items-center rounded-xl text-faint hover:text-danger"
                onClick={() => {
                  if (!confirm(t.common.confirmDelete)) return;
                  start(async () => {
                    await deleteCardioAction(c.id);
                  });
                }}
              >
                <Trash2 className="size-4" />
              </button>
            </div>
            {open === c.id && (
              <CardioDetails session={c} userId={userId} photoUrl={photoUrls[c.id] ?? null} aiEnabled={aiEnabled} hasWeight={hasWeight} onClose={() => setOpen(null)} />
            )}
          </li>
        );
      })}
    </ul>
  );
}
