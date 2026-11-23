import { getI18n } from "@/lib/i18n/server";
import { getFavoriteFoods, getProfile, getRecentFoods } from "@/lib/data";
import { getTimeZone, getToday } from "@/lib/auth";
import { isIsoDate } from "@/lib/dates";
import { MEALS, type MealSlot } from "@/lib/data/types";
import { mealForHour, mealName, mealSlotsOf } from "@/lib/nutrition/meal-slots";
import { aiEnabled } from "@/lib/ai/usage";
import { claudeLink } from "@/lib/claude-link";
import { claudeLogPrompt } from "@/lib/nutrition/claude-log-prompt";
import { Page, PageHeader } from "@/components/ui";
import { PhotoLog } from "./photo-log";

export default async function PhotoMealPage({ searchParams }: PageProps<"/nutrition/photo">) {
  const { t, locale } = await getI18n();
  const sp = await searchParams;
  const [today, timeZone, profile] = await Promise.all([getToday(), getTimeZone(), getProfile()]);
  const date = isIsoDate(sp.date) ? sp.date : today;
  const slots = mealSlotsOf(profile);
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone, hour: "numeric", hourCycle: "h23" }).format(new Date()));
  const meal = MEALS.includes(sp.meal as MealSlot) ? (sp.meal as MealSlot) : mealForHour(hour, slots);
  const enabled = aiEnabled();
  const [recent, favorites] = enabled ? await Promise.all([getRecentFoods(), getFavoriteFoods()]) : [[], []];
  return (
    <Page>
      <PageHeader title={t.photoMeal.title} back={{ href: `/nutrition?date=${date}`, label: t.nutrition.title }} />
      <PhotoLog
        enabled={enabled}
        claudeHref={claudeLink(claudeLogPrompt({ date, meal, mealName: mealName(meal, slots, t.meals), locale }))}
        initialMeal={meal}
        date={date}
        recent={recent}
        favorites={favorites}
      />
    </Page>
  );
}
