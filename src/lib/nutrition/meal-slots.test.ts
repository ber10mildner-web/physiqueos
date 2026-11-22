import { describe, expect, it } from "vitest";
import { DEFAULT_MEAL_SLOTS, mealForHour, mealName, parseMealSlots, visibleMeals } from "./meal-slots";
import de from "@/lib/i18n/de";

describe("meal slots", () => {
  it("parses settings: known slots, no duplicates, trimmed names, default when empty", () => {
    expect(parseMealSlots(null)).toEqual(DEFAULT_MEAL_SLOTS);
    expect(parseMealSlots([])).toEqual(DEFAULT_MEAL_SLOTS);
    expect(
      parseMealSlots([
        { key: "breakfast", name: "  " },
        { key: "pre_workout", name: "Vor dem Gym" },
        { key: "breakfast", name: "doppelt" },
        { key: "brunch" },
        { key: "snack", name: " Supplemente " },
      ]),
    ).toEqual([
      { key: "breakfast", name: null },
      { key: "pre_workout", name: "Vor dem Gym" },
      { key: "snack", name: "Supplemente" },
    ]);
  });

  it("uses own names, else the translation", () => {
    const slots = [{ key: "snack" as const, name: "Supplemente" }];
    expect(mealName("snack", slots, de.meals)).toBe("Supplemente");
    expect(mealName("post_workout", slots, de.meals)).toBe("Post-Meal");
  });

  it("keeps hidden meals that have entries visible", () => {
    expect(visibleMeals([{ key: "breakfast", name: null }, { key: "dinner", name: null }], ["snack", "breakfast"])).toEqual(["breakfast", "dinner", "snack"]);
  });

  it("preselects a meal by time among the user's meals", () => {
    const slots = [{ key: "breakfast" as const, name: null }, { key: "post_workout" as const, name: null }];
    expect(mealForHour(8, slots)).toBe("breakfast");
    expect(mealForHour(23, slots)).toBe("breakfast");
  });
});
