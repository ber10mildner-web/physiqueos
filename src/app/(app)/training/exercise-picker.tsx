"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { EQUIPMENT, MUSCLE_GROUPS, type Exercise } from "@/lib/data/types";
import { Button, Field, Input, Notice, Select, cx } from "@/components/ui";
import { createExerciseAction } from "./actions";

export function exerciseName(e: Pick<Exercise, "name_de" | "name_en">, locale: string) {
  return locale === "de" ? e.name_de : e.name_en;
}

/** Full-screen exercise library with search, muscle filter and "create your own". */
export function ExercisePicker({ exercises, onPick, onClose }: { exercises: Exercise[]; onPick: (e: Exercise) => void; onClose: () => void }) {
  const { t, locale } = useI18n();
  const [q, setQ] = useState("");
  const [muscle, setMuscle] = useState<string>("all");
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [mg, setMg] = useState<string>("chest");
  const [eq, setEq] = useState<string>("barbell");
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return exercises.filter(
      (e) => (muscle === "all" || e.muscle_group === muscle) && (!needle || e.name_de.toLowerCase().includes(needle) || e.name_en.toLowerCase().includes(needle)),
    );
  }, [exercises, q, muscle]);

  const muscles = MUSCLE_GROUPS.filter((m) => m !== "cardio");

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg">
      <div className="mx-auto flex w-full max-w-xl items-center gap-2 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3">
        <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.training.searchExercise} />
        <button type="button" onClick={onClose} aria-label={t.common.close} className="grid size-12 shrink-0 place-items-center rounded-2xl bg-surface-2">
          <X className="size-5" />
        </button>
      </div>
      <div className="mx-auto w-full max-w-xl overflow-x-auto px-4 pb-3">
        <div className="flex gap-2">
          {["all", ...muscles].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMuscle(m)}
              className={cx("h-8 shrink-0 rounded-full px-3 text-[13px] font-medium", muscle === m ? "bg-accent text-accent-ink" : "bg-surface-2 text-muted")}
            >
              {m === "all" ? t.training.allMuscles : t.training.muscles[m as keyof typeof t.training.muscles]}
            </button>
          ))}
        </div>
      </div>
      <div className="mx-auto w-full max-w-xl flex-1 overflow-y-auto px-4 pb-[calc(2rem+env(safe-area-inset-bottom))]">
        {creating ? (
          <form
            className="space-y-3 rounded-3xl border border-line bg-surface p-4"
            onSubmit={(e) => {
              e.preventDefault();
              setError(false);
              start(async () => {
                const res = await createExerciseAction({ name, muscle_group: mg, equipment: eq });
                if (res.ok) onPick(res.exercise);
                else setError(true);
              });
            }}
          >
            <Field label={t.training.exerciseName}>
              <Input value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t.training.muscleGroup}>
                <Select value={mg} onChange={(e) => setMg(e.target.value)}>
                  {MUSCLE_GROUPS.map((m) => (
                    <option key={m} value={m}>
                      {t.training.muscles[m]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t.training.equipment}>
                <Select value={eq} onChange={(e) => setEq(e.target.value)}>
                  {EQUIPMENT.map((m) => (
                    <option key={m} value={m}>
                      {t.training.equipments[m]}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            {error && <Notice tone="error">{t.common.error}</Notice>}
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="secondary" onClick={() => setCreating(false)}>
                {t.common.cancel}
              </Button>
              <Button type="submit" disabled={pending}>
                {t.common.add}
              </Button>
            </div>
          </form>
        ) : (
          <>
            <button
              type="button"
              onClick={() => {
                setName(q);
                setCreating(true);
              }}
              className="mb-2 flex w-full items-center gap-3 rounded-2xl border border-dashed border-line px-4 py-3 text-left text-sm text-muted hover:text-text"
            >
              <Plus className="size-4" /> {t.training.customExercise}
            </button>
            {list.length === 0 && <p className="py-6 text-center text-sm text-muted">{t.training.noExercisesFound}</p>}
            <ul className="divide-y divide-line">
              {list.map((e) => (
                <li key={e.id}>
                  <button type="button" onClick={() => onPick(e)} className="flex w-full items-center justify-between gap-3 py-3 text-left">
                    <span className="font-medium">{exerciseName(e, locale)}</span>
                    <span className="shrink-0 text-xs text-muted">
                      {t.training.muscles[e.muscle_group]} · {t.training.equipments[e.equipment]}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
