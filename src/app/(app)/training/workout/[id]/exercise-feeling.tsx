"use client";
import { useState, useTransition } from "react";
import { Smile } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import type { ExerciseNote } from "@/lib/data/types";
import { cx } from "@/components/ui";
import { setExerciseNoteAction } from "../../actions";

const SCALE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/** How an exercise felt (1–10) plus a short note. Saves right away, no reload needed. */
export function ExerciseFeeling({ workoutId, exerciseId, initial }: { workoutId: string; exerciseId: string; initial?: ExerciseNote }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [feeling, setFeeling] = useState<number | null>(initial?.feeling ?? null);
  const [note, setNote] = useState(initial?.note ?? "");
  const [savedNote, setSavedNote] = useState(initial?.note ?? "");
  const [error, setError] = useState(false);
  const [, start] = useTransition();

  const save = (f: number | null, n: string) =>
    start(async () => {
      const res = await setExerciseNoteAction({ workoutId, exerciseId, feeling: f, note: n.trim() || null });
      setError(!res.ok);
      if (res.ok) setSavedNote(n);
    });

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cx("inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium", feeling !== null || savedNote ? "bg-accent/10 text-accent" : "bg-surface-2 text-muted")}
      >
        <Smile className="size-3.5" />
        {t.workoutTimes.exerciseFeeling}
        {feeling !== null && <span className="num">{feeling}/10</span>}
        {savedNote && feeling === null && <span>·</span>}
      </button>
      {open && (
        <div className="mt-2 space-y-2 rounded-2xl bg-surface-2/60 p-3">
          <div className="text-xs text-faint">{t.workoutTimes.exerciseFeelingHint}</div>
          <div className="grid grid-cols-10 gap-1" role="radiogroup" aria-label={t.workoutTimes.exerciseFeeling}>
            {SCALE.map((n) => {
              const active = feeling === n;
              return (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => {
                    const next = active ? null : n;
                    setFeeling(next);
                    save(next, note);
                  }}
                  className={cx("num h-8 rounded-lg text-sm font-medium transition", active ? "bg-accent text-accent-ink" : "bg-surface-3 text-muted")}
                >
                  {n}
                </button>
              );
            })}
          </div>
          <input
            value={note}
            maxLength={500}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => note !== savedNote && save(feeling, note)}
            placeholder={t.workoutTimes.exerciseNotePlaceholder}
            aria-label={t.workoutTimes.exerciseNote}
            className="h-10 w-full rounded-xl border border-line bg-surface-2 px-3 text-[16px] outline-none focus:border-accent/60"
          />
          {error && <p className="text-xs text-danger">{t.errors.invalidInput}</p>}
        </div>
      )}
    </div>
  );
}
