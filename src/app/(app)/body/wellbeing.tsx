"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { formatDate } from "@/lib/dates";
import { MEDICATION_KINDS, SKIN_AREAS, type Medication, type MedicationLog, type SkinArea, type SkinLog } from "@/lib/data/types";
import { Button, EmptyState, Field, Input, Notice, Select, cx } from "@/components/ui";
import { addMedicationAction, archiveMedicationAction, saveSkin, setMedicationTakenAction } from "./actions";

const SKIN_COLORS = ["bg-fiber/15 text-fiber", "bg-fiber/10 text-fiber", "bg-warn/15 text-warn", "bg-carbs/15 text-carbs", "bg-danger/15 text-danger"];

export function SkinForm({ today, entry }: { today: string; entry: SkinLog | null }) {
  const { t } = useI18n();
  const router = useRouter();
  const [score, setScore] = useState<number | null>(entry?.score ?? null);
  const [areas, setAreas] = useState<SkinArea[]>(entry?.areas ?? []);
  const [note, setNote] = useState(entry?.note ?? "");
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [pending, start] = useTransition();

  const save = (next: { score: number | null; areas: SkinArea[]; note: string }) => {
    if (next.score === null) return;
    start(async () => {
      const res = await saveSkin({ date: today, score: next.score!, areas: next.areas, note: next.note.trim() || null });
      setStatus(res.ok ? "saved" : "error");
      if (res.ok) router.refresh();
    });
  };

  return (
    <div className="space-y-3">
      <div>
        <div className="mb-1.5 text-sm font-medium">{t.wellbeing.skin}</div>
        <div className="grid grid-cols-5 gap-1.5" role="radiogroup" aria-label={t.wellbeing.skin}>
          {t.wellbeing.skinScale.map((label, i) => (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={score === i}
              onClick={() => {
                setScore(i);
                save({ score: i, areas, note });
              }}
              className={cx("h-11 rounded-xl text-xs font-medium transition", score === i ? SKIN_COLORS[i] + " ring-1 ring-current" : "bg-surface-2 text-muted")}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {score !== null && score > 0 && (
        <div>
          <div className="mb-1.5 text-sm font-medium">{t.wellbeing.areas}</div>
          <div className="flex flex-wrap gap-1.5">
            {SKIN_AREAS.map((a) => {
              const on = areas.includes(a);
              return (
                <button
                  key={a}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    const next = on ? areas.filter((x) => x !== a) : [...areas, a];
                    setAreas(next);
                    save({ score, areas: next, note });
                  }}
                  className={cx("h-8 rounded-full px-3 text-xs font-medium", on ? "bg-accent text-accent-ink" : "bg-surface-2 text-muted")}
                >
                  {t.wellbeing.areaNames[a]}
                </button>
              );
            })}
          </div>
        </div>
      )}
      {score !== null && (
        <Field label={t.wellbeing.note}>
          <Input value={note} maxLength={1000} placeholder={t.wellbeing.notePlaceholder} onChange={(e) => setNote(e.target.value)} onBlur={() => note !== (entry?.note ?? "") && save({ score, areas, note })} />
        </Field>
      )}
      {status === "error" && <Notice tone="error">{t.errors.invalidInput}</Notice>}
      {pending ? <p className="text-xs text-faint">{t.common.saving}</p> : status === "saved" ? <p className="text-xs text-fiber">✓ {t.common.saved}</p> : null}
    </div>
  );
}

export function MedicationChecklist({ today, medications, taken }: { today: string; medications: Medication[]; taken: string[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const [done, setDone] = useState(new Set(taken));
  const [pending, start] = useTransition();
  if (!medications.length) return <p className="text-sm text-muted">{t.wellbeing.noMeds}</p>;
  return (
    <ul className="space-y-1.5">
      {medications.map((m) => {
        const on = done.has(m.id);
        return (
          <li key={m.id}>
            <button
              type="button"
              aria-pressed={on}
              disabled={pending}
              onClick={() => {
                const next = new Set(done);
                if (on) next.delete(m.id);
                else next.add(m.id);
                setDone(next);
                start(async () => {
                  const res = await setMedicationTakenAction({ medicationId: m.id, date: today, taken: !on });
                  if (!res.ok) setDone(done);
                  router.refresh();
                });
              }}
              className={cx("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left", on ? "bg-accent/10" : "bg-surface-2")}
            >
              <span className={cx("grid size-6 shrink-0 place-items-center rounded-full border", on ? "border-accent bg-accent text-accent-ink" : "border-line")}>
                {on && <Check className="size-4" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="font-medium">{m.name}</span>
                {m.dose && <span className="text-sm text-muted"> · {m.dose}</span>}
              </span>
              <span className="text-xs text-faint">{t.wellbeing.kinds[m.kind]}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function MedicationManager({ medications }: { medications: Medication[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState(false);
  return (
    <div className="space-y-3">
      {medications.length > 0 && (
        <ul className="divide-y divide-line">
          {medications.map((m) => (
            <li key={m.id} className="flex items-center gap-2 py-2">
              <span className="flex-1 text-sm">
                {m.name}
                {m.dose && <span className="text-muted"> · {m.dose}</span>}
              </span>
              <button
                type="button"
                aria-label={t.wellbeing.remove}
                disabled={pending}
                className="grid size-8 place-items-center rounded-lg text-faint hover:text-danger"
                onClick={() =>
                  start(async () => {
                    await archiveMedicationAction(m.id);
                    router.refresh();
                  })
                }
              >
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <form
        className="space-y-3"
        action={(fd) =>
          start(async () => {
            setError(false);
            const res = await addMedicationAction({
              name: String(fd.get("name") ?? ""),
              dose: String(fd.get("dose") ?? "").trim() || null,
              kind: String(fd.get("kind") ?? "medication"),
            });
            if (!res.ok) return setError(true);
            router.refresh();
          })
        }
      >
        <Field label={t.wellbeing.medName}>
          <Input name="name" required maxLength={100} placeholder={t.wellbeing.medNamePlaceholder} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t.wellbeing.medDose}>
            <Input name="dose" maxLength={100} placeholder={t.wellbeing.medDosePlaceholder} />
          </Field>
          <Field label={t.wellbeing.kind}>
            <Select name="kind" defaultValue="medication">
              {MEDICATION_KINDS.map((k) => (
                <option key={k} value={k}>
                  {t.wellbeing.kinds[k]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        {error && <Notice tone="error">{t.errors.invalidInput}</Notice>}
        <Button type="submit" variant="secondary" className="w-full" disabled={pending}>
          {t.wellbeing.addMed}
        </Button>
      </form>
    </div>
  );
}

export function WellbeingHistory({ skin, logs, days }: { skin: SkinLog[]; logs: MedicationLog[]; days: string[] }) {
  const { t, locale } = useI18n();
  const rows = days
    .map((d) => ({ d, s: skin.find((x) => x.entry_date === d), m: logs.filter((l) => l.entry_date === d) }))
    .filter((r) => r.s || r.m.length);
  if (!rows.length) return <EmptyState>{t.wellbeing.empty}</EmptyState>;
  return (
    <ul className="divide-y divide-line">
      {rows.map(({ d, s, m }) => (
        <li key={d} className="py-2.5">
          <div className="flex items-center gap-2 text-sm font-medium">
            {formatDate(d, locale)}
            {s && <span className={cx("rounded-full px-2 py-0.5 text-xs", SKIN_COLORS[s.score])}>{t.wellbeing.skinScale[s.score]}</span>}
          </div>
          <div className="text-xs text-muted">
            {[s?.areas.map((a) => t.wellbeing.areaNames[a]).join(", "), s?.note, [...new Set(m.map((l) => l.name))].join(", ")].filter(Boolean).join(" · ")}
          </div>
        </li>
      ))}
    </ul>
  );
}
