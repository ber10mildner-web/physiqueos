import { notFound } from "next/navigation";
import { getI18n } from "@/lib/i18n/server";
import { formatDate } from "@/lib/dates";
import { formatNumber } from "@/lib/format";
import { getExerciseSets, listExercises } from "@/lib/data/training";
import { estimate1RM, records } from "@/lib/training/calc";
import { Card, EmptyState, Page, PageHeader, SectionTitle } from "@/components/ui";

export default async function ExercisePage({ params }: PageProps<"/training/exercise/[id]">) {
  const { id } = await params;
  const { t, locale } = await getI18n();
  const exercise = (await listExercises()).find((e) => e.id === id);
  if (!exercise) notFound();
  const sets = await getExerciseSets(id);
  const rec = records(sets);
  // One row per session: best working set by estimated 1RM.
  const sessions = new Map<string, { date: string; best: { weight_kg: number; reps: number; e1rm: number | null }; count: number }>();
  for (const s of sets) {
    if (s.is_warmup || s.reps <= 0) continue;
    const e = estimate1RM(s.weight_kg, s.reps);
    const cur = sessions.get(s.workout_id);
    if (!cur) sessions.set(s.workout_id, { date: s.workout_date, best: { weight_kg: s.weight_kg, reps: s.reps, e1rm: e }, count: 1 });
    else {
      cur.count++;
      if ((e ?? 0) > (cur.best.e1rm ?? 0)) cur.best = { weight_kg: s.weight_kg, reps: s.reps, e1rm: e };
    }
  }
  const rows = [...sessions.values()];
  const name = locale === "de" ? exercise.name_de : exercise.name_en;

  return (
    <Page>
      <PageHeader title={name} subtitle={`${t.training.muscles[exercise.muscle_group]} · ${t.training.equipments[exercise.equipment]}`} back={{ href: "/training", label: t.training.title }} />
      <div className="space-y-4">
        <Card>
          <SectionTitle>{t.training.records}</SectionTitle>
          {rec.bestWeight || rec.best1RM ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-surface-2 px-3 py-2.5">
                <div className="text-xs text-muted">{t.training.best}</div>
                <div className="num text-lg font-semibold">
                  {rec.bestWeight ? `${formatNumber(rec.bestWeight.weight_kg, locale, 1)} kg × ${rec.bestWeight.reps}` : "–"}
                </div>
              </div>
              <div className="rounded-2xl bg-surface-2 px-3 py-2.5">
                <div className="text-xs text-muted">{t.training.est1rm}</div>
                <div className="num text-lg font-semibold">{rec.best1RM ? `${formatNumber(rec.best1RM.value, locale, 1)} kg` : "–"}</div>
              </div>
            </div>
          ) : (
            <EmptyState>{t.training.noRecords}</EmptyState>
          )}
        </Card>
        <Card>
          <SectionTitle>{t.training.progress}</SectionTitle>
          {rows.length === 0 ? (
            <EmptyState>{t.training.noHistory}</EmptyState>
          ) : (
            <ul className="divide-y divide-line">
              {rows.map((r, i) => (
                <li key={i} className="num flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="text-muted">{formatDate(r.date, locale)}</span>
                  <span>
                    {formatNumber(r.best.weight_kg, locale, 1)} kg × {r.best.reps}
                  </span>
                  <span className="w-24 text-right text-muted">{r.best.e1rm ? `≈ ${formatNumber(r.best.e1rm, locale, 1)}` : "–"}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </Page>
  );
}
