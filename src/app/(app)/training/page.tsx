import Link from "next/link";
import { ChevronRight, Dumbbell, Pencil, Plus } from "lucide-react";
import { getI18n } from "@/lib/i18n/server";
import { fmt } from "@/lib/i18n";
import { getToday, requireUser } from "@/lib/auth";
import { PHOTO_BUCKET, getLatestWeight } from "@/lib/data";
import { withKcalEstimates } from "@/lib/cardio";
import { displayReaderEnabled } from "@/lib/ai/display-reader";
import { addDays, formatDate } from "@/lib/dates";
import { formatNumber } from "@/lib/format";
import { listCardio, listCardioTemplates, listPlans, listWorkouts } from "@/lib/data/training";
import { ensureRoutines } from "@/lib/data/routines";
import { volume, workoutMinutes } from "@/lib/training/calc";
import { Card, EmptyState, Page, PageHeader, SectionTitle, buttonClass } from "@/components/ui";
import { StartButton } from "./start-button";
import { CardioForm, CardioList } from "./cardio";
import { CardioRoutines } from "./cardio-routines";

export default async function TrainingPage({ searchParams }: PageProps<"/training">) {
  const { t, locale } = await getI18n();
  const today = await getToday();
  const dow = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7; // Monday = 0
  const weekStart = addDays(today, -dow);
  await ensureRoutines(today);
  const [plans, workouts, rawCardio, ctx, latestWeight, templates] = await Promise.all([
    listPlans(),
    listWorkouts({ limit: 30 }),
    listCardio({ from: addDays(today, -60) }),
    requireUser(),
    getLatestWeight(),
    listCardioTemplates(),
  ]);
  const cardio = await withKcalEstimates(rawCardio);
  // "Als Vorlage speichern" on a logged session opens the template form with its values
  const fromId = (await searchParams).vorlage;
  const from = typeof fromId === "string" ? cardio.find((c) => c.id === fromId) : undefined;
  const prefill = from
    ? {
        name: from.template_id && from.notes ? from.notes : t.training.activities[from.activity],
        activity: from.activity,
        duration_min: from.duration_min,
        distance_km: from.distance_km,
        avg_hr: from.avg_hr,
        kcal: from.kcal ?? from.estimate?.kcal ?? null,
        incline_pct: from.incline_pct,
        speed_kmh: from.speed_kmh,
        effort: from.effort,
      }
    : null;
  const shown = cardio.slice(0, 15);
  const photoPaths = shown.filter((c) => c.machine_photo_path).map((c) => c.machine_photo_path!);
  const photoUrls: Record<string, string> = {};
  if (photoPaths.length) {
    const { data } = await ctx.supabase.storage.from(PHOTO_BUCKET).createSignedUrls(photoPaths, 60 * 60);
    for (const c of shown) {
      const url = data?.find((d) => d.path === c.machine_photo_path)?.signedUrl;
      if (url) photoUrls[c.id] = url;
    }
  }
  const active = workouts.find((w) => !w.finished_at);
  const week = workouts.filter((w) => w.workout_date >= weekStart);
  const weekCardio = cardio.filter((c) => c.session_date >= weekStart);
  const weekVolume = week.reduce((s, w) => s + volume(w.sets), 0);
  const weekCardioMin = weekCardio.reduce((s, c) => s + c.duration_min, 0);

  return (
    <Page>
      <PageHeader title={t.training.title} />
      <div className="space-y-4">
        {active && (
          <Link href={`/training/workout/${active.id}`} className="block">
            <Card className="flex items-center gap-3 border-accent/40 bg-accent/5">
              <div className="grid size-11 place-items-center rounded-2xl bg-accent text-accent-ink">
                <Dumbbell className="size-5" />
              </div>
              <div className="flex-1">
                <div className="font-medium">{active.name}</div>
                <div className="text-sm text-muted">
                  {t.training.active} · {fmt(t.training.setsCount, { n: active.sets.length })}
                </div>
              </div>
              <span className="text-sm font-medium text-accent">{t.training.resume}</span>
            </Card>
          </Link>
        )}

        <Card>
          <SectionTitle>{t.training.thisWeek}</SectionTitle>
          <div className="grid grid-cols-3 gap-3">
            <Stat label={t.training.sessions} value={String(week.length)} />
            <Stat label={t.training.volume} value={`${formatNumber(weekVolume / 1000, locale, 1)} t`} />
            <Stat label={t.training.cardio} value={`${formatNumber(weekCardioMin, locale)} min`} />
          </div>
        </Card>

        <Card>
          <SectionTitle
            action={
              <Link href="/training/plans/new" className={buttonClass("ghost", "sm")}>
                <Plus className="size-4" /> {t.training.newPlan}
              </Link>
            }
          >
            {t.training.start}
          </SectionTitle>
          <div className="space-y-2">
            {plans.map((p) => (
              <div key={p.id} className="flex items-center gap-2">
                <StartButton planId={p.id} label={p.name} sub={`${p.exercises.length} ${t.training.exercises}`} disabled={Boolean(active)} />
                <Link href={`/training/plans/${p.id}`} aria-label={t.common.edit} className="grid size-12 shrink-0 place-items-center rounded-2xl bg-surface-2 text-muted">
                  <Pencil className="size-4" />
                </Link>
              </div>
            ))}
            {!plans.length && <p className="pb-1 text-sm text-muted">{t.training.noPlans}</p>}
            <StartButton planId={null} label={t.training.startEmpty} disabled={Boolean(active)} />
          </div>
        </Card>

        <Card>
          <SectionTitle>{t.training.history}</SectionTitle>
          {workouts.length === 0 ? (
            <EmptyState>{t.training.noHistory}</EmptyState>
          ) : (
            <ul className="divide-y divide-line">
              {workouts.slice(0, 15).map((w) => (
                <li key={w.id}>
                  <Link href={`/training/workout/${w.id}`} className="flex items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{w.name}</div>
                      <div className="text-xs text-muted">
                        {formatDate(w.workout_date, locale)} · {fmt(t.training.setsCount, { n: w.sets.filter((s) => !s.is_warmup).length })} ·{" "}
                        {formatNumber(volume(w.sets), locale)} kg
                        {workoutMinutes(w.started_at, w.finished_at) !== null && ` · ${workoutMinutes(w.started_at, w.finished_at)} min`}
                        {w.finished_at ? "" : ` · ${t.training.active}`}
                      </div>
                    </div>
                    <ChevronRight className="size-4 text-faint" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div id="routines" className="scroll-mt-4">
        <Card>
          <SectionTitle>{t.routines.title}</SectionTitle>
          <CardioRoutines
            key={`${templates.map((x) => x.id).join()}-${from?.id ?? ""}`}
            prefill={prefill}
            templates={templates}
            loggedToday={cardio.filter((c) => c.session_date === today && c.template_id).map((c) => c.template_id!)}
          />
        </Card>
        </div>

        <Card>
          <SectionTitle>{t.training.addCardio}</SectionTitle>
          <CardioForm today={today} />
        </Card>
        <Card>
          <SectionTitle>{t.training.recentCardio}</SectionTitle>
          <CardioList sessions={shown} userId={ctx.userId} photoUrls={photoUrls} aiEnabled={displayReaderEnabled()} hasWeight={Boolean(latestWeight)} />
        </Card>
      </div>
    </Page>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface-2 px-3 py-2.5">
      <div className="text-xs text-muted">{label}</div>
      <div className="num mt-0.5 text-lg font-semibold">{value}</div>
    </div>
  );
}
