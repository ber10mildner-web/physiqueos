import { notFound } from "next/navigation";
import { getI18n } from "@/lib/i18n/server";
import { getRecipe } from "@/lib/data/recipes";
import { getFavoriteFoods, getRecentFoods } from "@/lib/data";
import { getToday } from "@/lib/auth";
import { Page, PageHeader } from "@/components/ui";
import { recipeInsights } from "@/lib/recipes/insights";
import { currentGapKeys } from "@/lib/recipes/gap-keys";
import { RecipeInsightsCard } from "@/components/recipe-insights";
import { RecipeEditor } from "./recipe-editor";

export default async function RecipePage({ params }: PageProps<"/nutrition/recipes/[id]">) {
  const { id } = await params;
  const { t } = await getI18n();
  const [recipe, recent, favorites, today, gapKeys] = await Promise.all([id === "new" ? null : getRecipe(id), getRecentFoods(), getFavoriteFoods(), getToday(), currentGapKeys()]);
  if (id !== "new" && !recipe) notFound();
  return (
    <Page>
      <PageHeader title={recipe ? recipe.name : t.recipes.new} back={{ href: "/nutrition/recipes", label: t.recipes.title }} />
      <RecipeEditor recipe={recipe} recent={recent} favorites={favorites} today={today} />
      {recipe && (
        <div className="mt-4">
          <RecipeInsightsCard insights={recipeInsights(recipe.ingredients, recipe.cooked_weight_g, recipe.servings)} t={t} gapKeys={gapKeys} />
        </div>
      )}
    </Page>
  );
}
