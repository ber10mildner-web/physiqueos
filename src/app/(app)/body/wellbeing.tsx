"use client";
import { useState, useTransition } from "react";
import { Check, Pencil, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { formatDate } from "@/lib/dates";
import { MEDICATION_KINDS, SKIN_AREAS, type Medication, type MedicationLog, type SkinArea, type SkinLog } from "@/lib/data/types";
import { Button, EmptyState, Field, Input, Notice, Select, cx } from "@/components/ui";
import { archiveMedicationAction, saveMedicationAction, saveSkin, setMedicationTakenAction } from "./actions";
import { WeekdayPicker, weekdayLabel } from "@/components/weekday-picker";
import { MICRO_NUTRIENTS, NUTRIENTS, type NutrientKey } from "@/lib/nutrition/nutrients";

const SKIN_COLORS = ["bg-fiber/15 text-fiber", "bg-fiber/10 text-fiber", "bg-warn/15 text-warn", "bg-carbs/15 text-carbs", "bg-danger/15 text-danger"];

export function SkinForm({ today, entry }: { today: string; entry: SkinLog | null }) {
  const { t } = useI18n();
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
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      {medications.length > 0 && (
        <ul className="divide-y divide-line">
          {medications.map((m) =>
            editing === m.id ? (
              <li key={m.id} className="py-2">
                <MedicationEditor medication={m} onDone={() => setEditing(null)} />
              </li>
            ) : (
              <li key={m.id} className="flex items-center gap-2 py-2">
                <span className="min-w-0 flex-1 text-sm">
                  {m.name}
                  {m.dose && <span className="text-muted"> · {m.dose}</span>}
                  {(m.nutrients || m.auto_days.length > 0) && (
                    <span className="block text-xs text-faint">
                      {[m.nutrients && t.wellbeing.countsInDiary, m.auto_days.length > 0 && `${t.wellbeing.auto}: ${weekdayLabel(m.auto_days, t)}`].filter(Boolean).join(" · ")}
                    </span>
                  )}
                </span>
                <button type="button" aria-label={t.wellbeing.edit} className="grid size-8 place-items-center rounded-lg text-muted" onClick={() => setEditing(m.id)}>
                  <Pencil className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label={t.wellbeing.remove}
                  disabled={pending}
                  className="grid size-8 place-items-center rounded-lg text-faint hover:text-danger"
                  onClick={() =>
                    start(async () => {
                      await archiveMedicationAction(m.id);
                    })
                  }
                >
                  <X className="size-4" />
                </button>
              </li>
            ),
          )}
        </ul>
      )}
      {editing === null && <MedicationEditor key={medications.length} medication={null} onDone={() => undefined} />}
    </div>
  );
}

const MAIN_NUTRIENTS: NutrientKey[] = ["energy_kcal", "protein_g", "carbs_g", "fat_g", "fiber_g"];

const parseNum = (s: string) => {
  const v = s.trim().replace(",", ".");
  return v === "" ? null : Number(v);
};

/** Add or edit a medication / supplement, optionally with nutrients per dose and automatic days. */
function MedicationEditor({ medication, onDone }: { medication: Medication | null; onDone: () => void }) {
  const { t } = useI18n();
  const [name, setName] = useState(medication?.name ?? "");
  const [dose, setDose] = useState(medication?.dose ?? "");
  const [kind, setKind] = useState<string>(medication?.kind ?? "supplement");
  const [doseG, setDoseG] = useState(medication?.dose_g != null ? String(medication.dose_g) : "");
  const [values, setValues] = useState<Partial<Record<NutrientKey, string>>>(
    Object.fromEntries(Object.entries(medication?.nutrients ?? {}).map(([k, v]) => [k, String(v)])),
  );
  const [days, setDays] = useState<number[]>(medication?.auto_days ?? []);
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();
  const hasMicros = MICRO_NUTRIENTS.some((k) => values[k]);

  const nutrientInput = (k: NutrientKey) => (
    <Field key={k} label={`${t.nutrients[k]} (${NUTRIENTS[k].unit})`}>
      <Input
        value={values[k] ?? ""}
        onChange={(e) => setValues((v) => ({ ...v, [k]: e.target.value }))}
        type="number"
        inputMode="decimal"
        min={0}
        step="any"
        className="num"
      />
    </Field>
  );

  const save = () =>
    start(async () => {
      setError(false);
      const nutrients: Record<string, number> = {};
      for (const [k, raw] of Object.entries(values)) {
        const n = parseNum(raw ?? "");
        if (n === null) continue;
        if (!Number.isFinite(n) || n < 0) return setError(true);
        nutrients[k] = n;
      }
      const g = parseNum(doseG);
      if (g !== null && !(g > 0)) return setError(true);
      const res = await saveMedicationAction({
        id: medication?.id,
        name,
        dose: dose.trim() || null,
        kind,
        nutrients: Object.keys(nutrients).length ? nutrients : null,
        dose_g: g,
        auto_days: days,
      });
      if (!res.ok) return setError(true);
      if (!medication) {
        setName("");
        setDose("");
        setDoseG("");
        setValues({});
        setDays([]);
      }
      onDone();
    });

  return (
    <div className={cx("space-y-3", medication && "rounded-2xl border border-line p-3")}>
      <Field label={t.wellbeing.medName}>
        <Input value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} placeholder={t.wellbeing.medNamePlaceholder} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t.wellbeing.medDose}>
          <Input value={dose} onChange={(e) => setDose(e.target.value)} maxLength={100} placeholder={t.wellbeing.medDosePlaceholder} />
        </Field>
        <Field label={t.wellbeing.kind}>
          <Select value={kind} onChange={(e) => setKind(e.target.value)}>
            {MEDICATION_KINDS.map((k) => (
              <option key={k} value={k}>
                {t.wellbeing.kinds[k]}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      {kind === "supplement" && (
        <details className="group rounded-2xl bg-surface-2/60 p-3" open={Boolean(medication?.nutrients)}>
          <summary className="cursor-pointer list-none text-sm font-medium">{t.wellbeing.nutrients}</summary>
          <p className="mt-1 text-xs text-faint">{t.wellbeing.nutrientsHint}</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {MAIN_NUTRIENTS.map(nutrientInput)}
            <Field label={t.wellbeing.doseG}>
              <Input value={doseG} onChange={(e) => setDoseG(e.target.value)} type="number" inputMode="decimal" min={0} step="any" placeholder="1" className="num" />
            </Field>
          </div>
          <details className="mt-3" open={hasMicros}>
            <summary className="cursor-pointer list-none text-sm text-muted">+ {t.wellbeing.moreNutrients}</summary>
            <div className="mt-3 grid grid-cols-2 gap-3">{MICRO_NUTRIENTS.map(nutrientInput)}</div>
          </details>
        </details>
      )}
      <div>
        <div className="mb-1 text-[13px] text-muted">{t.wellbeing.daily}</div>
        <WeekdayPicker value={days} onChange={setDays} />
        <p className="mt-1 text-xs text-faint">{t.wellbeing.dailyHint}</p>
      </div>
      {error && <Notice tone="error">{t.errors.invalidInput}</Notice>}
      <div className={cx("grid gap-2", medication ? "grid-cols-2" : "grid-cols-1")}>
        {medication && (
          <Button type="button" variant="ghost" disabled={pending} onClick={onDone}>
            {t.common.cancel}
          </Button>
        )}
        <Button type="button" variant={medication ? "primary" : "secondary"} disabled={pending || !name.trim()} onClick={save}>
          {pending ? t.common.saving : medication ? t.wellbeing.save : t.wellbeing.addMed}
        </Button>
      </div>
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
