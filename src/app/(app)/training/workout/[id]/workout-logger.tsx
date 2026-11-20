"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LineChart, Plus, Trophy, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { fmt } from "@/lib/i18n";
import { formatNumber } from "@/lib/format";
import type { Exercise, Workout, WorkoutSet } from "@/lib/data/types";
import { estimate1RM, suggestNext, volume } from "@/lib/training/calc";
import type { ExerciseHint } from "@/lib/training/hints";
import { Button, Card, Notice, cx } from "@/components/ui";
import { ExercisePicker, exerciseName } from "../../exercise-picker";
import { addSetAction, deleteSetAction, deleteWorkoutAction, finishWorkoutAction, hintAction } from "../../actions";

type Target = { target_sets: number; rep_min: number; rep_max: number };

export function WorkoutLogger({
  workout,
  exercises: initialExercises,
  targets,
  order,
  hints: initialHints,
}: {
  workout: Workout;
  exercises: Exercise[];
  targets: Record<string, Target>;
  order: string[];
  hints: Record<string, ExerciseHint>;
}) {
  const { t, locale } = useI18n();
  const [exercises, setExercises] = useState(initialExercises);
  const [extra, setExtra] = useState<string[]>([]);
  const [hints, setHints] = useState(initialHints);
  const [picking, setPicking] = useState(false);
  const [pending, start] = useTransition();
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const ids = [...new Set([...order, ...extra])];
  const working = workout.sets.filter((s) => !s.is_warmup);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-surface px-3 py-2.5">
          <div className="text-xs text-muted">{t.training.sets}</div>
          <div className="num text-lg font-semibold">{working.length}</div>
        </div>
        <div className="rounded-2xl bg-surface px-3 py-2.5">
          <div className="text-xs text-muted">{t.training.volume}</div>
          <div className="num text-lg font-semibold">{formatNumber(volume(workout.sets), locale)} kg</div>
        </div>
      </div>

      {ids.map((exId) => {
        const ex = byId.get(exId);
        if (!ex) return null;
        return (
          <ExerciseBlock
            key={exId}
            workoutId={workout.id}
            exercise={ex}
            sets={workout.sets.filter((s) => s.exercise_id === exId)}
            target={targets[exId]}
            hint={hints[exId]}
          />
        );
      })}

      <Button type="button" variant="secondary" className="w-full" onClick={() => setPicking(true)}>
        <Plus className="size-4" /> {t.training.addExercise}
      </Button>

      {!workout.finished_at && (
        <Button type="button" className="w-full" disabled={pending} onClick={() => start(async () => void (await finishWorkoutAction(workout.id)))}>
          {t.training.finish}
        </Button>
      )}
      <Button
        type="button"
        variant="danger"
        className="w-full"
        disabled={pending}
        onClick={() => confirm(t.common.confirmDelete) && start(async () => void (await deleteWorkoutAction(workout.id)))}
      >
        {t.training.deleteWorkout}
      </Button>

      {picking && (
        <ExercisePicker
          exercises={exercises}
          onClose={() => setPicking(false)}
          onPick={async (e) => {
            setPicking(false);
            if (!byId.has(e.id)) setExercises((xs) => [...xs, e]);
            setExtra((x) => [...x, e.id]);
            if (!hints[e.id]) {
              const h = await hintAction(e.id, workout.id);
              setHints((hs) => ({ ...hs, [e.id]: h }));
            }
          }}
        />
      )}
    </div>
  );
}

function ExerciseBlock({ workoutId, exercise, sets, target, hint }: { workoutId: string; exercise: Exercise; sets: WorkoutSet[]; target?: Target; hint?: ExerciseHint }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const repMin = target?.rep_min ?? 8;
  const repMax = target?.rep_max ?? 12;
  const suggestion = hint ? suggestNext(hint.lastSets, repMax, exercise.equipment) : null;
  const lastLogged = sets.filter((s) => !s.is_warmup).at(-1);
  const [kg, setKg] = useState(lastLogged ? String(lastLogged.weight_kg) : suggestion && suggestion.kind !== "first" ? String(suggestion.weight_kg) : "");
  const [reps, setReps] = useState(lastLogged ? String(lastLogged.reps) : "");
  const [warmup, setWarmup] = useState(false);
  const [pr, setPr] = useState(false);
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();

  const w = Number(kg.replace(",", "."));
  const r = Number(reps);
  const valid = kg.trim() !== "" && Number.isFinite(w) && w >= 0 && w <= 1000 && Number.isInteger(r) && r > 0 && r <= 200;

  const add = () => {
    setError(false);
    start(async () => {
      const res = await addSetAction({ workoutId, exerciseId: exercise.id, reps: r, weight_kg: w, is_warmup: warmup });
      if (!res.ok) return setError(true);
      const best = hint?.records.best1RM?.value;
      const e = estimate1RM(w, r);
      setPr(!warmup && best !== undefined && e !== null && e > best + 1e-9);
      setWarmup(false);
      router.refresh();
    });
  };

  const done = sets.filter((s) => !s.is_warmup).length;
  const suggestionText =
    suggestion?.kind === "first"
      ? fmt(t.training.suggestFirst, { min: repMin, max: repMax })
      : suggestion?.kind === "increase"
        ? fmt(t.training.suggestIncrease, { weight: formatNumber(suggestion.weight_kg, locale, 1) })
        : suggestion?.kind === "same"
          ? fmt(t.training.suggestSame, { weight: formatNumber(suggestion.weight_kg, locale, 1) })
          : null;

  return (
    <Card>
      <div className="mb-2 flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold">{exerciseName(exercise, locale)}</h3>
          <div className="text-xs text-muted">
            {target ? `${done}/${target.target_sets} ${t.training.sets} · ${repMin}–${repMax} ${t.training.reps}` : `${done} ${t.training.sets}`}
          </div>
        </div>
        <Link href={`/training/exercise/${exercise.id}`} aria-label={t.training.progress} className="grid size-9 place-items-center rounded-xl text-muted hover:bg-surface-2">
          <LineChart className="size-4" />
        </Link>
      </div>

      {hint && hint.lastSets.length > 0 && (
        <p className="num text-xs text-muted">
          {fmt(t.training.lastTime, {
            sets: hint.lastSets
              .filter((s) => !s.is_warmup)
              .map((s) => `${formatNumber(s.weight_kg, locale, 1)}×${s.reps}`)
              .join(", "),
          })}
        </p>
      )}
      {suggestionText && <p className="mt-0.5 text-xs text-accent">{fmt(t.training.suggestion, { text: suggestionText })}</p>}

      {sets.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {sets.map((s, i) => (
            <li key={s.id} className={cx("flex items-center gap-3 rounded-xl px-3 py-2", s.is_warmup ? "bg-surface-2/50 text-muted" : "bg-surface-2")}>
              <span className="w-5 text-xs text-faint">{s.is_warmup ? "W" : i + 1 - sets.slice(0, i).filter((x) => x.is_warmup).length}</span>
              <span className="num flex-1">
                {formatNumber(s.weight_kg, locale, 1)} kg × {s.reps}
              </span>
              <button
                type="button"
                aria-label={t.common.delete}
                className="text-faint hover:text-danger"
                onClick={() =>
                  start(async () => {
                    await deleteSetAction(s.id);
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

      {pr && (
        <div className="mt-3">
          <Notice tone="success">
            <span className="inline-flex items-center gap-2">
              <Trophy className="size-4" /> {t.training.newPr}
            </span>
          </Notice>
        </div>
      )}

      <div className="mt-3 flex items-end gap-2">
        <label className="flex-1">
          <span className="mb-1 block text-xs text-muted">{t.training.weight}</span>
          <input
            type="number"
            inputMode="decimal"
            step="any"
            min={0}
            value={kg}
            onChange={(e) => setKg(e.target.value)}
            className="num h-11 w-full rounded-xl border border-line bg-surface-2 px-3 text-[16px] outline-none focus:border-accent/60"
          />
        </label>
        <label className="flex-1">
          <span className="mb-1 block text-xs text-muted">{t.training.reps}</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            className="num h-11 w-full rounded-xl border border-line bg-surface-2 px-3 text-[16px] outline-none focus:border-accent/60"
          />
        </label>
        <button
          type="button"
          onClick={() => setWarmup((v) => !v)}
          className={cx("h-11 rounded-xl px-3 text-xs font-medium", warmup ? "bg-warn/15 text-warn" : "bg-surface-2 text-muted")}
          aria-pressed={warmup}
        >
          {t.training.warmup}
        </button>
        <button
          type="button"
          disabled={!valid || pending}
          onClick={add}
          aria-label={t.training.addSet}
          className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-accent-ink disabled:opacity-40"
        >
          <Plus className="size-5" />
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-danger">{t.errors.invalidInput}</p>}
    </Card>
  );
}
