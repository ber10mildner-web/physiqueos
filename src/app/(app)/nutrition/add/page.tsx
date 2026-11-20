import { getI18n } from "@/lib/i18n/server";
import { getFavoriteFoods, getRecentFoods } from "@/lib/data";
import { listRecipes } from "@/lib/data/recipes";
import { recipeAsCandidate } from "@/lib/nutrition/recipe-candidate";
import { getTimeZone, getToday } from "@/lib/auth";
import { isIsoDate } from "@/lib/dates";
import { MEALS, type MealSlot } from "@/lib/data/types";
import { Page, PageHeader } from "@/components/ui";
import { AddFood, type Tab } from "./add-food";

/** Suggest a meal slot from the user's local time of day. */
function defaultMeal(timeZone: string): MealSlot {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone, hour: "numeric", hourCycle: "h23" }).format(new Date()));
  if (hour >= 5 && hour < 11) return "breakfast";
  if (hour >= 11 && hour < 15) return "lunch";
  if (hour >= 17 && hour < 22) return "dinner";
  return "snack";
}

export default async function AddFoodPage({ searchParams }: PageProps<"/nutrition/add">) {
  const { t } = await getI18n();
  const sp = await searchParams;
  const today = await getToday();
  const date = isIsoDate(sp.date) ? sp.date : today;
  const meal = MEALS.includes(sp.meal as MealSlot) ? (sp.meal as MealSlot) : defaultMeal(await getTimeZone());
  const tab: Tab = sp.tab === "scan" || sp.tab === "manual" || sp.tab === "recipes" ? sp.tab : "search";
  const [recent, favorites, recipes] = await Promise.all([getRecentFoods(), getFavoriteFoods(), listRecipes()]);
  return (
    <Page>
      <PageHeader title={t.addFood.title} back={{ href: `/nutrition?date=${date}`, label: t.nutrition.title }} />
      <AddFood initialTab={tab} initialMeal={meal} date={date} today={today} recent={recent} favorites={favorites} recipes={recipes.map(recipeAsCandidate)} />
    </Page>
  );
}
