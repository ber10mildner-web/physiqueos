import { describe, expect, it } from "vitest";
import { GAP_FOODS, eatenFoods, suggestGapFoods } from "./gap-foods";
import { getBasicFood } from "@/lib/food-sources/basic";

describe("GAP_FOODS", () => {
  it("only lists basic foods that exist and contain the nutrient", () => {
    for (const [key, list] of Object.entries(GAP_FOODS)) {
      for (const [id] of list!) {
        const f = getBasicFood(`sr28-${id}`);
        expect(f, id).not.toBeNull();
        expect((f!.nutrients as Record<string, number>)[key], `${id} ${key}`).toBeGreaterThan(0);
      }
    }
  });
});

describe("suggestGapFoods", () => {
  const gap = { key: "fiber_g" as const, avg: 22, reference: 30, share: 22 / 30 };
  it("suggests amounts from database values, capped at a portion", () => {
    const res = suggestGapFoods(gap, []);
    expect(res.length).toBeGreaterThan(0);
    for (const f of res) {
      expect(f.fromDiary).toBe(false);
      expect(f.adds).toBeGreaterThan(0);
      expect(f.grams % 5).toBe(0);
    }
    const oats = res.find((f) => f.name.startsWith("Haferflocken"));
    if (oats) expect(oats.grams).toBeLessThanOrEqual(90);
  });
  it("puts a food the user already eats first", () => {
    const eaten = eatenFoods([
      { food_name: "Vollkornbrot", nutrients_per_100g: { energy_kcal: 220, fiber_g: 8 }, amount_g: 80 },
      { food_name: "Vollkornbrot", nutrients_per_100g: { energy_kcal: 220, fiber_g: 8 }, amount_g: 60 },
      { food_name: "Cola", nutrients_per_100g: { energy_kcal: 42 }, amount_g: 330 },
    ]);
    const res = suggestGapFoods(gap, eaten);
    expect(res[0]).toMatchObject({ name: "Vollkornbrot", fromDiary: true, grams: 80 });
  });
  it("returns nothing when there is no gap", () => {
    expect(suggestGapFoods({ ...gap, avg: 31 }, [])).toEqual([]);
  });
});
