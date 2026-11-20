"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { formatDate } from "@/lib/dates";
import { formatNumber } from "@/lib/format";
import { CARDIO_ACTIVITIES, type CardioSession } from "@/lib/data/types";
import { Button, EmptyState, Field, Input, Notice, Select } from "@/components/ui";
import { addCardioAction, deleteCardioAction } from "./actions";

const optNum = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim().replace(",", ".");
  return s === "" ? null : Number(s);
};

export function CardioForm({ today }: { today: string }) {
  const { t } = useI18n();
  const router = useRouter();
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
          });
          setStatus(res.ok ? "saved" : "error");
          if (res.ok) router.refresh();
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
      </div>
      {status === "error" && <Notice tone="error">{t.errors.invalidInput}</Notice>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? t.common.saving : status === "saved" ? `✓ ${t.common.saved}` : t.common.save}
      </Button>
    </form>
  );
}

export function CardioList({ sessions }: { sessions: CardioSession[] }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  if (!sessions.length) return <EmptyState>{t.training.noCardio}</EmptyState>;
  return (
    <ul className="divide-y divide-line">
      {sessions.map((c) => (
        <li key={c.id} className="flex items-center gap-3 py-3">
          <div className="min-w-0 flex-1">
            <div className="font-medium">{t.training.activities[c.activity]}</div>
            <div className="num text-xs text-muted">
              {formatDate(c.session_date, locale)} · {formatNumber(c.duration_min, locale)} min
              {c.distance_km !== null && ` · ${formatNumber(c.distance_km, locale, 2)} km`}
              {c.avg_hr !== null && ` · ${c.avg_hr} bpm`}
              {c.kcal !== null && ` · ${c.kcal} kcal`}
            </div>
          </div>
          <button
            type="button"
            aria-label={t.common.delete}
            disabled={pending}
            className="grid size-9 place-items-center rounded-xl text-faint hover:text-danger"
            onClick={() => {
              if (!confirm(t.common.confirmDelete)) return;
              start(async () => {
                await deleteCardioAction(c.id);
                router.refresh();
              });
            }}
          >
            <Trash2 className="size-4" />
          </button>
        </li>
      ))}
    </ul>
  );
}
