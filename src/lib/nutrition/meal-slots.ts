/**
 * Which meals a user sees, in which order and under which name. Stored per
 * user in profiles.meal_slots; without a setting the classic four are shown.
 */
import { MEALS, type MealSetting, type MealSlot } from "@/lib/data/types";

export const DEFAULT_MEAL_SLOTS: MealSetting[] = (["breakfast", "lunch", "dinner", "snack"] as MealSlot[]).map((key) => ({ key, name: null }));
export const MAX_MEAL_NAME = 40;

/** Validates stored/submitted settings: known slots only, no duplicates, at least one. */
export function parseMealSlots(raw: unknown): MealSetting[] {
  if (!Array.isArray(raw)) return DEFAULT_MEAL_SLOTS;
  const out: MealSetting[] = [];
  for (const item of raw) {
    const key = (item as { key?: unknown })?.key;
    if (typeof key !== "string" || !MEALS.includes(key as MealSlot) || out.some((s) => s.key === key)) continue;
    const name = (item as { name?: unknown }).name;
    const clean = typeof name === "string" ? name.trim().slice(0, MAX_MEAL_NAME) : "";
    out.push({ key: key as MealSlot, name: clean || null });
  }
  return out.length ? out : DEFAULT_MEAL_SLOTS;
}

export function mealSlotsOf(profile: { meal_slots: MealSetting[] | null } | null | undefined): MealSetting[] {
  return profile?.meal_slots?.length ? profile.meal_slots : DEFAULT_MEAL_SLOTS;
}

/** The user's name for a meal, or the translated default. */
export function mealName(key: MealSlot, slots: MealSetting[], defaults: Record<MealSlot, string>): string {
  return slots.find((s) => s.key === key)?.name ?? defaults[key];
}

/**
 * Meals to show on a day: the user's meals, plus any hidden meal that still has
 * entries (so nothing logged ever disappears), in the user's order.
 */
export function visibleMeals(slots: MealSetting[], used: Iterable<MealSlot>): MealSlot[] {
  const keys = slots.map((s) => s.key);
  for (const m of used) if (!keys.includes(m)) keys.push(m);
  return keys;
}

/** Meal to preselect when adding food at a given hour, among the user's meals. */
export function mealForHour(hour: number, slots: MealSetting[]): MealSlot {
  const want: MealSlot = hour >= 5 && hour < 11 ? "breakfast" : hour >= 11 && hour < 15 ? "lunch" : hour >= 17 && hour < 22 ? "dinner" : "snack";
  const keys = slots.map((s) => s.key);
  return keys.includes(want) ? want : keys[0];
}
