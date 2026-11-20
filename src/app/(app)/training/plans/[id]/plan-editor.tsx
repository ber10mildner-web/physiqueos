"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import type { Exercise, WorkoutPlan } from "@/lib/data/types";
import { Button, Card, Field, Input, Notice, SectionTitle } from "@/components/ui";
import { ExercisePicker, exerciseName } from "../../exercise-picker";
import { archivePlanAction, savePlanAction } from "../../actions";

interface Row {
  key: string;
  exercise_id: string;
  target_sets: string;
  rep_min: string;
  rep_max: string;
}

export function PlanEditor({ plan, exercises: initialExercises }: { plan: WorkoutPlan | null; exercises: Exercise[] }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [exercises, setExercises] = useState(initialExercises);
  const [name, setName] = useState(plan?.name ?? "");
  const [rows, setRows] = useState<Row[]>(
    (plan?.exercises ?? []).map((e) => ({ key: e.id, exercise_id: e.exercise_id, target_sets: String(e.target_sets), rep_min: String(e.rep_min), rep_max: String(e.rep_max) })),
  );
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();
  const byId = new Map(exercises.map((e) => [e.id, e]));

  const update = (i: number, patch: Partial<Row>) => setRows((r) => r.map((row, j) => (j === i ? { ...row, ...patch } : row)));
  const move = (i: number, d: number) =>
    setRows((r) => {
      const n = [...r];
      const j = i + d;
      if (j < 0 || j >= n.length) return r;
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });

  const save = () => {
    setError(false);
    start(async () => {
      const res = await savePlanAction({
        id: plan?.id,
        name,
        exercises: rows.map((r) => ({ exercise_id: r.exercise_id, target_sets: Number(r.target_sets), rep_min: Number(r.rep_min), rep_max: Number(r.rep_max) })),
      });
      if (!res.ok) return setError(true);
      router.push("/training");
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <Field label={t.training.planName}>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t.training.planNamePlaceholder} maxLength={100} />
        </Field>
      </Card>
      <Card>
        <SectionTitle>{t.training.exercises}</SectionTitle>
        {rows.length === 0 && <p className="pb-3 text-sm text-muted">{t.training.planEmpty}</p>}
        <ul className="space-y-3">
          {rows.map((r, i) => {
            const ex = byId.get(r.exercise_id);
            return (
              <li key={r.key} className="rounded-2xl bg-surface-2 p-3">
                <div className="mb-2 flex items-center gap-1">
                  <span className="min-w-0 flex-1 truncate font-medium">{ex ? exerciseName(ex, locale) : "?"}</span>
                  <IconBtn label="up" onClick={() => move(i, -1)}>
                    <ArrowUp className="size-4" />
                  </IconBtn>
                  <IconBtn label="down" onClick={() => move(i, 1)}>
                    <ArrowDown className="size-4" />
                  </IconBtn>
                  <IconBtn label={t.common.delete} onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}>
                    <Trash2 className="size-4" />
                  </IconBtn>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Field label={t.training.targetSets}>
                    <Input type="number" inputMode="numeric" min={1} max={20} value={r.target_sets} onChange={(e) => update(i, { target_sets: e.target.value })} className="num h-10" />
                  </Field>
                  <Field label={`${t.training.reps} min`}>
                    <Input type="number" inputMode="numeric" min={1} max={100} value={r.rep_min} onChange={(e) => update(i, { rep_min: e.target.value })} className="num h-10" />
                  </Field>
                  <Field label={`${t.training.reps} max`}>
                    <Input type="number" inputMode="numeric" min={1} max={100} value={r.rep_max} onChange={(e) => update(i, { rep_max: e.target.value })} className="num h-10" />
                  </Field>
                </div>
              </li>
            );
          })}
        </ul>
        <Button type="button" variant="secondary" className="mt-3 w-full" onClick={() => setPicking(true)}>
          <Plus className="size-4" /> {t.training.addExercise}
        </Button>
      </Card>
      {error && <Notice tone="error">{t.errors.invalidInput}</Notice>}
      <Button type="button" className="w-full" disabled={pending || !name.trim()} onClick={save}>
        {pending ? t.common.saving : t.common.save}
      </Button>
      {plan && (
        <Button
          type="button"
          variant="danger"
          className="w-full"
          disabled={pending}
          onClick={() => confirm(t.common.confirmDelete) && start(async () => void (await archivePlanAction(plan.id)))}
        >
          {t.common.delete}
        </Button>
      )}
      {picking && (
        <ExercisePicker
          exercises={exercises}
          onClose={() => setPicking(false)}
          onPick={(e) => {
            if (!byId.has(e.id)) setExercises((xs) => [...xs, e]);
            setRows((rs) => [...rs, { key: crypto.randomUUID(), exercise_id: e.id, target_sets: "3", rep_min: "8", rep_max: "12" }]);
            setPicking(false);
          }}
        />
      )}
    </div>
  );
}

function IconBtn({ children, label, onClick }: { children: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-3 hover:text-text">
      {children}
    </button>
  );
}
