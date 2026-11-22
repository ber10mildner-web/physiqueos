import { getI18n } from "@/lib/i18n/server";
import { getFavoriteFoods, getRecentFoods } from "@/lib/data";
import { listRecipes } from "@/lib/data/recipes";
import { recipeAsCandidate } from "@/lib/nutrition/recipe-candidate";
import { getTimeZone, getToday } from "@/lib/auth";
import { isIsoDate } from "@/lib/dates";
import { MEALS, type MealSetting, type MealSlot } from "@/lib/data/types";
import { getProfile } from "@/lib/data";
import { mealForHour, mealSlotsOf } from "@/lib/nutrition/meal-slots";
import { Page, PageHeader } from "@/components/ui";
import { AddFood, type Tab } from "./add-food";

/** Suggest one of the user's meals from the local time of day. */
function defaultMeal(timeZone: string, slots: MealSetting[]): MealSlot {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone, hour: "numeric", hourCycle: "h23" }).format(new Date()));
  return mealForHour(hour, slots);
}

export default async function AddFoodPage({ searchParams }: PageProps<"/nutrition/add">) {
  const { t } = await getI18n();
  const sp = await searchParams;
  const today = await getToday();
  const date = isIsoDate(sp.date) ? sp.date : today;
  const meal = MEALS.includes(sp.meal as MealSlot) ? (sp.meal as MealSlot) : defaultMeal(await getTimeZone(), mealSlotsOf(await getProfile()));
  const tab: Tab = sp.tab === "scan" || sp.tab === "manual" || sp.tab === "recipes" ? sp.tab : "search";
  const [recent, favorites, recipes] = await Promise.all([getRecentFoods(), getFavoriteFoods(), listRecipes()]);
  return (
    <Page>
      <PageHeader title={t.addFood.title} back={{ href: `/nutrition?date=${date}`, label: t.nutrition.title }} />
      <AddFood initialTab={tab} initialMeal={meal} date={date} today={today} recent={recent} favorites={favorites} recipes={recipes.map(recipeAsCandidate)} />
    </Page>
  );
}
