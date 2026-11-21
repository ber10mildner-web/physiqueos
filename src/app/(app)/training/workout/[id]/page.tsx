import { notFound } from "next/navigation";
import { getI18n } from "@/lib/i18n/server";
import { formatDate } from "@/lib/dates";
import { getWorkout, listExercises, listPlans } from "@/lib/data/training";
import { exerciseHint } from "@/lib/training/hints";
import { getTimeZone, requireUser } from "@/lib/auth";
import { Page, PageHeader } from "@/components/ui";
import { WorkoutLogger } from "./workout-logger";

export default async function WorkoutPage({ params }: PageProps<"/training/workout/[id]">) {
  const { id } = await params;
  const { t, locale } = await getI18n();
  // one round trip instead of two: plans are few, so load them right away
  const [workout, exercises, plans] = await Promise.all([getWorkout(id), listExercises(), listPlans()]);
  if (!workout) notFound();
  const plan = plans.find((p) => p.id === workout.plan_id);
  const targets = Object.fromEntries((plan?.exercises ?? []).map((e) => [e.exercise_id, { target_sets: e.target_sets, rep_min: e.rep_min, rep_max: e.rep_max }]));
  const order = [...new Set([...(plan?.exercises ?? []).map((e) => e.exercise_id), ...workout.sets.map((s) => s.exercise_id)])];
  const ctx = await requireUser();
  const [hints, timeZone] = await Promise.all([
    Promise.all(order.map(async (ex) => [ex, await exerciseHint(ex, workout.id, ctx)] as const)).then(Object.fromEntries),
    getTimeZone(),
  ]);
  return (
    <Page>
      <PageHeader
        title={workout.name}
        subtitle={`${formatDate(workout.workout_date, locale)} · ${workout.finished_at ? t.training.finished : t.training.active}`}
        back={{ href: "/training", label: t.training.title }}
      />
      <WorkoutLogger workout={workout} exercises={exercises} targets={targets} order={order} hints={hints} timeZone={timeZone} />
    </Page>
  );
}
