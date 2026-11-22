import { describe, expect, it } from "vitest";
import { buildQuickPicks, rankForMeal, type PickHistoryRow } from "./quick-picks";

const row = (p: Partial<PickHistoryRow>): PickHistoryRow => ({
  food_id: null,
  recipe_id: null,
  meal: "breakfast",
  amount_g: 100,
  created_at: "2026-11-20T08:00:00Z",
  food_name: "x",
  nutrients_per_100g: { energy_kcal: 100 },
  ...p,
});

describe("quick picks", () => {
  it("reuses the latest amount and counts per meal", () => {
    const picks = buildQuickPicks(
      [
        row({ food_id: "oats", food_name: "Haferflocken", amount_g: 60, created_at: "2026-11-19T08:00:00Z" }),
        row({ food_id: "oats", food_name: "Haferflocken", amount_g: 80, created_at: "2026-11-21T08:00:00Z" }),
        row({ food_id: "oats", food_name: "Haferflocken", meal: "snack", amount_g: 40, created_at: "2026-11-20T15:00:00Z" }),
      ],
      [],
    );
    expect(picks).toHaveLength(1);
    expect(picks[0]).toMatchObject({ amount_g: 80, counts: { breakfast: 2, snack: 1 }, favorite: false });
  });

  it("adds favourites never logged with their serving size", () => {
    const picks = buildQuickPicks([], [{ kind: "food", id: "skyr", name: "Skyr", serving_size_g: 250, nutrients: { energy_kcal: 63 } }]);
    expect(picks[0]).toMatchObject({ id: "skyr", amount_g: 250, favorite: true });
  });

  it("ranks favourites first, then what is eaten in this meal; drops one-offs from other meals", () => {
    const picks = buildQuickPicks(
      [
        row({ food_id: "apple", food_name: "Apfel", meal: "breakfast" }),
        row({ food_id: "rice", food_name: "Reis", meal: "lunch" }),
        row({ recipe_id: "bowl", food_name: "Bowl", meal: "breakfast", created_at: "2026-11-21T08:00:00Z" }),
        row({ recipe_id: "bowl", food_name: "Bowl", meal: "breakfast", created_at: "2026-11-21T09:00:00Z" }),
      ],
      [{ kind: "food", id: "whey", name: "Whey", serving_size_g: 30, nutrients: {} }],
    );
    expect(rankForMeal(picks, "breakfast").map((p) => p.id)).toEqual(["whey", "bowl", "apple"]);
    expect(rankForMeal(picks, "dinner").map((p) => p.id)).toEqual(["whey"]);
  });
});
