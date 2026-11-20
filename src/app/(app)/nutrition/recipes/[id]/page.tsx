import { notFound } from "next/navigation";
import { getI18n } from "@/lib/i18n/server";
import { getRecipe } from "@/lib/data/recipes";
import { getFavoriteFoods, getRecentFoods } from "@/lib/data";
import { getToday } from "@/lib/auth";
import { Page, PageHeader } from "@/components/ui";
import { RecipeEditor } from "./recipe-editor";

export default async function RecipePage({ params }: PageProps<"/nutrition/recipes/[id]">) {
  const { id } = await params;
  const { t } = await getI18n();
  const [recipe, recent, favorites, today] = await Promise.all([id === "new" ? null : getRecipe(id), getRecentFoods(), getFavoriteFoods(), getToday()]);
  if (id !== "new" && !recipe) notFound();
  return (
    <Page>
      <PageHeader title={recipe ? recipe.name : t.recipes.new} back={{ href: "/nutrition/recipes", label: t.recipes.title }} />
      <RecipeEditor recipe={recipe} recent={recent} favorites={favorites} today={today} />
    </Page>
  );
}
