import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, Users } from "lucide-react";
import { getI18n } from "@/lib/i18n/server";
import { fmt } from "@/lib/i18n";
import { listRecipes } from "@/lib/data/recipes";
import { recipeNutrition } from "@/lib/nutrition/recipe";
import { PRIMARY_NUTRIENTS, type NutrientMap } from "@/lib/nutrition/nutrients";
import { formatNumber, formatNutrient } from "@/lib/format";
import { getRecipeIdea, ideaIngredients } from "@/lib/recipes/catalog";
import { recipeInsights } from "@/lib/recipes/insights";
import { currentGapKeys } from "@/lib/recipes/gap-keys";
import { RecipeInsightsCard } from "@/components/recipe-insights";
import { Card, Page, PageHeader, SectionTitle, buttonClass, cx } from "@/components/ui";
import { AdoptButton } from "./adopt-button";

export default async function RecipeIdeaPage({ params, searchParams }: PageProps<"/nutrition/recipes/ideas/[slug]">) {
  const { slug } = await params;
  const { f } = await searchParams;
  const { t, locale } = await getI18n();
  const r = t.recipeIdeas;
  const idea = getRecipeIdea(slug, locale);
  if (!idea) notFound();
  const [mine, gapKeys] = await Promise.all([listRecipes(), currentGapKeys()]);
  const existing = mine.find((m) => m.name.trim().toLowerCase() === idea.name.toLowerCase());

  const ings = ideaIngredients(idea);
  const n = recipeNutrition(ings, idea.cookedWeightG);
  const insights = recipeInsights(ings, idea.cookedWeightG, idea.servings);
  const perServing: NutrientMap = Object.fromEntries(Object.entries(n.total).map(([k, v]) => [k, v / idea.servings]));
  const servingG = Math.round(n.totalWeightG / idea.servings / 5) * 5;
  const back = typeof f === "string" && f ? `/nutrition/recipes?f=${encodeURIComponent(f)}` : "/nutrition/recipes";

  return (
    <Page>
      <PageHeader title={idea.name} back={{ href: back, label: t.recipes.title }} wrapTitle />
      <div className="-mt-3 mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
        <span className="inline-flex items-center gap-1">
          <Clock className="size-3.5" /> {fmt(r.minutes, { n: idea.minutes })}
        </span>
        <span className="inline-flex items-center gap-1">
          <Users className="size-3.5" /> {idea.servings === 1 ? r.oneServing : fmt(r.servings, { n: idea.servings })}
        </span>
        <span className="num">{fmt(r.servingWeight, { g: formatNumber(servingG, locale) })}</span>
      </div>

      <div className="space-y-4">
        <Card>
          <SectionTitle>{r.nutrition}</SectionTitle>
          <div className="grid grid-cols-5 gap-1 text-center">
            {PRIMARY_NUTRIENTS.map((key) => (
              <div key={key}>
                <div className="num text-[15px] font-medium">{perServing[key] !== undefined ? formatNutrient(key, perServing[key]!, locale, false) : "–"}</div>
                <div className="text-[11px] leading-tight text-muted">{key === "energy_kcal" ? "kcal" : t.nutrients[key]}</div>
              </div>
            ))}
          </div>
        </Card>

        <RecipeInsightsCard insights={insights} t={t} perServing={perServing} gapKeys={gapKeys} />

        <Card>
          <SectionTitle>{r.ingredients}</SectionTitle>
          <ul className="space-y-1.5 text-[15px]">
            {idea.ingredients.map((i) => (
              <li key={i.food.source_id} className="flex justify-between gap-3">
                <span className="min-w-0">{i.food.name}</span>
                <span className="num shrink-0 text-muted">{formatNumber(i.amount_g, locale)} g</span>
              </li>
            ))}
          </ul>
          {idea.cookedWeightG && <p className="mt-3 text-[11px] leading-snug text-faint">{r.cookedEstimate}</p>}
        </Card>

        <Card>
          <SectionTitle>{r.steps}</SectionTitle>
          <ol className="list-decimal space-y-2 pl-5 text-[15px] leading-snug marker:text-muted">
            {idea.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </Card>

        {existing ? (
          <Link href={`/nutrition/recipes/${existing.id}`} className={cx(buttonClass("secondary"), "w-full")}>
            {r.alreadyMine} · {r.open}
          </Link>
        ) : (
          <div>
            <AdoptButton slug={idea.slug} label={r.adopt} />
            <p className="mt-1.5 text-center text-xs text-faint">{r.adoptHint}</p>
          </div>
        )}
        <p className="text-center text-[11px] text-faint">{r.source}</p>
      </div>
    </Page>
  );
}
