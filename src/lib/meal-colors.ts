import type { MealSlot } from "@/lib/data/types";

/** One colour per meal, so the sections of the day are easy to tell apart. */
export const MEAL_COLORS: Record<MealSlot, string> = {
  breakfast: "#f5b84b", // warm yellow
  pre_workout: "#c8f560", // Sigma lime
  lunch: "#f08a4b", // orange
  post_workout: "#5f8cf0", // blue
  dinner: "#a07cf0", // violet
  snack: "#14a3a0", // teal
};

/** A colour mixed with transparency, e.g. for tinted backgrounds. */
export const tint = (color: string, percent: number) => `color-mix(in srgb, ${color} ${percent}%, transparent)`;
