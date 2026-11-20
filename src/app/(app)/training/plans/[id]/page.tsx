import { notFound } from "next/navigation";
import { getI18n } from "@/lib/i18n/server";
import { listExercises, listPlans } from "@/lib/data/training";
import { Page, PageHeader } from "@/components/ui";
import { PlanEditor } from "./plan-editor";

export default async function PlanPage({ params }: PageProps<"/training/plans/[id]">) {
  const { id } = await params;
  const { t } = await getI18n();
  const [exercises, plans] = await Promise.all([listExercises(), id === "new" ? Promise.resolve([]) : listPlans()]);
  const plan = id === "new" ? null : plans.find((p) => p.id === id);
  if (id !== "new" && !plan) notFound();
  return (
    <Page>
      <PageHeader title={plan?.name ?? t.training.newPlan} back={{ href: "/training", label: t.training.title }} />
      <PlanEditor plan={plan ?? null} exercises={exercises} />
    </Page>
  );
}
