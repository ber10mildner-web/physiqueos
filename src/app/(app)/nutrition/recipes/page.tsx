import Link from "next/link";
import { Clock, Plus, Star } from "lucide-react";
import { getI18n } from "@/lib/i18n/server";
import { fmt } from "@/lib/i18n";
import { listRecipes } from "@/lib/data/recipes";
import { recipeNutrition } from "@/lib/nutrition/recipe";
import { formatNumber } from "@/lib/format";
import { RECIPE_TAGS, matchesFilters, recipeInsights, type RecipeTag } from "@/lib/recipes/insights";
import { ideaIngredients, listRecipeIdeas } from "@/lib/recipes/catalog";
import { currentGapKeys } from "@/lib/recipes/gap-keys";
import { TagPills } from "@/components/recipe-insights";
import { Card, EmptyState, Page, PageHeader, SectionTitle, buttonClass, cx } from "@/components/ui";

const FILTERS = ["gaps", ...RECIPE_TAGS] as const;
type Filter = (typeof FILTERS)[number];

function parseFilters(raw: string | string[] | undefined): Filter[] {
  const s = Array.isArray(raw) ? raw.join(",") : (raw ?? "");
  return [...new Set(s.split(",").filter((x): x is Filter => (FILTERS as readonly string[]).includes(x)))];
}

function toggleHref(active: Filter[], f: Filter | null): string {
  const next = f === null ? [] : active.includes(f) ? active.filter((x) => x !== f) : [...active, f];
  return next.length ? `/nutrition/recipes?f=${next.join(",")}` : "/nutrition/recipes";
}

export default async function RecipesPage({ searchParams }: PageProps<"/nutrition/recipes">) {
  const { t, locale } = await getI18n();
  const r = t.recipeIdeas;
  const filters = parseFilters((await searchParams).f);
  const [recipes, gapKeys] = await Promise.all([listRecipes(), currentGapKeys()]);

  const mine = recipes.map((rec) => {
    const n = recipeNutrition(rec.ingredients, rec.cooked_weight_g);
    return { rec, n, ins: recipeInsights(rec.ingredients, rec.cooked_weight_g, rec.servings) };
  });
  const ideas = listRecipeIdeas(locale).map((idea) => {
    const ings = ideaIngredients(idea);
    const n = recipeNutrition(ings, idea.cookedWeightG);
    return { idea, n, ins: recipeInsights(ings, idea.cookedWeightG, idea.servings) };
  });
  const mineShown = mine.filter((m) => matchesFilters(m.ins, filters, gapKeys));
  const ideasShown = ideas.filter((m) => matchesFilters(m.ins, filters, gapKeys));
  const chips: Filter[] = gapKeys.length ? [...FILTERS] : [...RECIPE_TAGS];
  const label = (f: Filter) => (f === "gaps" ? r.gapsTag : r.tags[f as RecipeTag]);

  return (
    <Page>
      <PageHeader
        title={t.recipes.title}
        back={{ href: "/nutrition", label: t.nutrition.title }}
        action={
          <Link href="/nutrition/recipes/new" className={buttonClass("primary", "sm")}>
            <Plus className="size-4" /> {t.recipes.new}
          </Link>
        }
      />

      <nav aria-label={r.filter} className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        <Link
          href={toggleHref(filters, null)}
          className={cx("shrink-0 rounded-full border px-3.5 py-1.5 text-sm", filters.length === 0 ? "border-accent bg-accent text-accent-ink" : "border-line bg-surface text-muted")}
        >
          {r.all}
        </Link>
        {chips.map((f) => {
          const on = filters.includes(f);
          return (
            <Link
              key={f}
              href={toggleHref(filters, f)}
              aria-pressed={on}
              className={cx(
                "shrink-0 rounded-full border px-3.5 py-1.5 text-sm whitespace-nowrap",
                on ? "border-accent bg-accent text-accent-ink" : f === "gaps" ? "border-accent/50 bg-accent/10 text-text" : "border-line bg-surface text-muted",
              )}
            >
              {label(f)}
            </Link>
          );
        })}
      </nav>

      {filters.length > 0 && (
        <Card className="mb-4 space-y-2 py-3">
          {filters.map((f) => (
            <p key={f} className="text-[13px] leading-snug text-muted">
              <span className="font-medium text-text">{label(f)}:</span>{" "}
              {f === "gaps" ? (gapKeys.length ? fmt(r.gapsWhy, { list: gapKeys.map((k) => t.nutrients[k]).join(", ") }) : r.noGaps) : r.tagWhy[f as RecipeTag]}
            </p>
          ))}
        </Card>
      )}

      <div className="space-y-5">
        <section>
          <SectionTitle>{r.mine}</SectionTitle>
          {recipes.length === 0 ? (
            <Card>
              <EmptyState>{t.recipes.empty}</EmptyState>
              <p className="text-center text-xs text-faint">{t.recipes.viaClaude}</p>
            </Card>
          ) : mineShown.length === 0 ? (
            <p className="px-1 text-sm text-muted">{r.noMineMatch}</p>
          ) : (
            <Card className="p-0">
              <ul className="divide-y divide-line">
                {mineShown.map(({ rec, n, ins }) => (
                  <li key={rec.id}>
                    <Link href={`/nutrition/recipes/${rec.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2/60">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 truncate text-[15px]">
                          {rec.is_favorite && <Star className="size-3.5 shrink-0 fill-carbs text-carbs" />}
                          <span className="truncate">{rec.name}</span>
                        </div>
                        <div className="num text-xs text-muted">
                          {fmt(t.recipes.ingredientCount, { n: rec.ingredients.length })} · {formatNumber(n.totalWeightG, locale)} g
                        </div>
                        <TagPills tags={ins.tags} t={t} highlight={filters} />
                      </div>
                      <div className="text-right">
                        <div className="num text-sm">{n.per100g.energy_kcal !== undefined ? formatNumber(n.per100g.energy_kcal, locale) : "–"}</div>
                        <div className="text-[10px] text-faint">kcal/100 g</div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </section>

        <section>
          <SectionTitle>{r.ideas}</SectionTitle>
          {ideasShown.length === 0 ? (
            <p className="px-1 text-sm text-muted">{r.noMatch}</p>
          ) : (
            <Card className="p-0">
              <ul className="divide-y divide-line">
                {ideasShown.map(({ idea, n, ins }) => {
                  const kcal = n.total.energy_kcal !== undefined ? n.total.energy_kcal / idea.servings : null;
                  const protein = n.total.protein_g !== undefined ? n.total.protein_g / idea.servings : null;
                  return (
                    <li key={idea.slug}>
                      <Link href={`/nutrition/recipes/ideas/${idea.slug}${filters.length ? `?f=${filters.join(",")}` : ""}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2/60">
                        <div className="min-w-0 flex-1">
                          <div className="text-[15px] leading-snug">{idea.name}</div>
                          <div className="num mt-0.5 flex items-center gap-1 text-xs text-muted">
                            <Clock className="size-3" /> {fmt(r.minutes, { n: idea.minutes })}
                            {protein !== null && <> · {formatNumber(protein, locale)} g {t.nutrients.protein_g}</>}
                          </div>
                          <TagPills tags={ins.tags} t={t} highlight={filters} />
                        </div>
                        <div className="text-right">
                          <div className="num text-sm">{kcal !== null ? formatNumber(kcal, locale) : "–"}</div>
                          <div className="text-[10px] text-faint">{r.kcalPerServing}</div>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}
          <p className="mt-2 px-1 text-[11px] leading-snug text-faint">
            {r.ideasHint} {r.source}.
          </p>
        </section>
      </div>
    </Page>
  );
}
