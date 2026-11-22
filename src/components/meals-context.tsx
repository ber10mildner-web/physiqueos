"use client";
import { createContext, useContext, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n/client";
import type { MealSetting, MealSlot } from "@/lib/data/types";
import { DEFAULT_MEAL_SLOTS, mealName } from "@/lib/nutrition/meal-slots";

const MealsContext = createContext<MealSetting[]>(DEFAULT_MEAL_SLOTS);

/** Makes the user's meal setup (order and own names) available to client components. */
export function MealsProvider({ slots, children }: { slots: MealSetting[]; children: ReactNode }) {
  return <MealsContext value={slots}>{children}</MealsContext>;
}

export function useMeals() {
  const slots = useContext(MealsContext);
  const { t } = useI18n();
  return { slots, name: (key: MealSlot) => mealName(key, slots, t.meals) };
}
