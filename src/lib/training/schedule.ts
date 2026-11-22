/**
 * What is planned on a day: strength plans scheduled on that weekday and cardio
 * routines that repeat on it, plus whatever was actually done. Pure (tested).
 */
import { weekdayOf } from "@/lib/dates";

interface PlanLike {
  id: string;
  name: string;
  schedule_days: number[];
  exercises: unknown[];
}
interface TemplateLike {
  id: string;
  name: string;
  duration_min: number;
  auto_days: number[];
  auto_from: string;
}
interface WorkoutLike {
  id: string;
  plan_id: string | null;
  name: string;
  workout_date: string;
  finished_at: string | null;
}
interface CardioLike {
  id: string;
  session_date: string;
  template_id: string | null;
  activity: string;
  duration_min: number;
  notes: string | null;
}

export type ScheduleItem =
  | { kind: "plan"; id: string; name: string; exercises: number; status: "open" | "active" | "done"; workoutId: string | null }
  | { kind: "routine"; id: string; name: string; minutes: number; status: "open" | "done" }
  | { kind: "workout"; id: string; name: string; status: "active" | "done" }
  | { kind: "cardio"; id: string; name: string | null; activity: string; minutes: number; status: "done" };

export function scheduleFor(
  date: string,
  data: { plans: PlanLike[]; templates: TemplateLike[]; workouts: WorkoutLike[]; cardio: CardioLike[] },
): ScheduleItem[] {
  const wd = weekdayOf(date);
  const workouts = data.workouts.filter((w) => w.workout_date === date);
  const cardio = data.cardio.filter((c) => c.session_date === date);
  const items: ScheduleItem[] = [];
  const usedWorkouts = new Set<string>();
  const usedCardio = new Set<string>();

  for (const p of data.plans.filter((p) => p.schedule_days.includes(wd))) {
    const w = workouts.find((x) => x.plan_id === p.id);
    if (w) usedWorkouts.add(w.id);
    items.push({ kind: "plan", id: p.id, name: p.name, exercises: p.exercises.length, status: w ? (w.finished_at ? "done" : "active") : "open", workoutId: w?.id ?? null });
  }
  for (const t of data.templates.filter((t) => t.auto_days.includes(wd) && t.auto_from <= date)) {
    const c = cardio.find((x) => x.template_id === t.id);
    if (c) usedCardio.add(c.id);
    items.push({ kind: "routine", id: t.id, name: t.name, minutes: t.duration_min, status: c ? "done" : "open" });
  }
  // done but not planned (e.g. an extra session, or a plan without weekdays)
  for (const w of workouts.filter((w) => !usedWorkouts.has(w.id)))
    items.push({ kind: "workout", id: w.id, name: w.name, status: w.finished_at ? "done" : "active" });
  for (const c of cardio.filter((c) => !usedCardio.has(c.id)))
    items.push({ kind: "cardio", id: c.id, name: c.notes, activity: c.activity, minutes: c.duration_min, status: "done" });
  return items;
}
