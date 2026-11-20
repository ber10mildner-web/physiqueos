import Link from "next/link";
import { Plus, Star } from "lucide-react";
import { getI18n } from "@/lib/i18n/server";
import { fmt } from "@/lib/i18n";
import { listRecipes } from "@/lib/data/recipes";
import { recipeNutrition } from "@/lib/nutrition/recipe";
import { formatNumber } from "@/lib/format";
import { Card, EmptyState, Page, PageHeader, buttonClass } from "@/components/ui";

export default async function RecipesPage() {
  const { t, locale } = await getI18n();
  const recipes = await listRecipes();
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
      {recipes.length === 0 ? (
        <Card>
          <EmptyState>{t.recipes.empty}</EmptyState>
          <p className="text-center text-xs text-faint">{t.recipes.viaClaude}</p>
        </Card>
      ) : (
        <Card className="p-0">
          <ul className="divide-y divide-line">
            {recipes.map((r) => {
              const n = recipeNutrition(r.ingredients, r.cooked_weight_g);
              return (
                <li key={r.id}>
                  <Link href={`/nutrition/recipes/${r.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2/60">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 truncate text-[15px]">
                        {r.is_favorite && <Star className="size-3.5 shrink-0 fill-carbs text-carbs" />}
                        {r.name}
                      </div>
                      <div className="num text-xs text-muted">
                        {fmt(t.recipes.ingredientCount, { n: r.ingredients.length })} · {formatNumber(n.totalWeightG, locale)} g
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="num text-sm">{n.per100g.energy_kcal !== undefined ? formatNumber(n.per100g.energy_kcal, locale) : "–"}</div>
                      <div className="text-[10px] text-faint">kcal/100 g</div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </Page>
  );
}
