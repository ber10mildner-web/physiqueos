import "server-only";
import { getDiaryRange, getGoalOn, getProfile } from "@/lib/data";
import { getToday } from "@/lib/auth";
import { addDays } from "@/lib/dates";
import { sumItems } from "@/lib/nutrition/calc";
import { nutrientGaps } from "@/lib/nutrition/gaps";
import type { NutrientKey } from "@/lib/nutrition/nutrients";

/** Nutrients the user was short of in the last 7 complete days (same rule as the dashboard hints). */
export async function currentGapKeys(): Promise<NutrientKey[]> {
  const today = await getToday();
  const from = addDays(today, -7);
  const [entries, profile, goal] = await Promise.all([getDiaryRange(from, addDays(today, -1)), getProfile(), getGoalOn(today)]);
  const days = [];
  for (let d = from; d < today; d = addDays(d, 1)) {
    const items = entries.filter((e) => e.entry_date === d);
    if (items.length) days.push(sumItems(items));
  }
  // Fibre has its own filter; the gap filter is about vitamins and minerals.
  return nutrientGaps(days, profile?.sex ?? null, goal?.fiber_g)
    .gaps.map((g) => g.key)
    .filter((k) => k !== "fiber_g");
}
