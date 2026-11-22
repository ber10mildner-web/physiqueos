import { describe, expect, it } from "vitest";
import { parseIngredientLine, recipeNutrition } from "./recipe";

describe("recipeNutrition", () => {
  const ingredients = [
    { amount_g: 200, nutrients_per_100g: { energy_kcal: 350, protein_g: 12, carbs_g: 70, fat_g: 2, fiber_g: 3 } },
    { amount_g: 500, nutrients_per_100g: { energy_kcal: 110, protein_g: 23, carbs_g: 0, fat_g: 2, vitamin_c_mg: 0 } },
    { amount_g: 300, nutrients_per_100g: { energy_kcal: 20, protein_g: 1, carbs_g: 3, fat_g: 0.2, fiber_g: 1.5 } },
  ];

  it("sums raw ingredients and divides by the cooked weight", () => {
    const r = recipeNutrition(ingredients, 800);
    expect(r.rawWeightG).toBe(1000);
    expect(r.totalWeightG).toBe(800);
    expect(r.total.energy_kcal).toBeCloseTo(700 + 550 + 60);
    expect(r.per100g.energy_kcal).toBeCloseTo((1310 / 800) * 100);
    expect(r.per100g.protein_g).toBeCloseTo(((24 + 115 + 3) / 800) * 100);
  });

  it("uses the raw weight when no cooked weight is given", () => {
    expect(recipeNutrition(ingredients).per100g.energy_kcal).toBeCloseTo(131);
  });

  it("sums micros over the ingredients that have them and reports coverage", () => {
    const r = recipeNutrition(ingredients, 800);
    // fibre known for 200 g + 300 g of 1000 g
    expect(r.total.fiber_g).toBeCloseTo(6 + 4.5);
    expect(r.per100g.fiber_g).toBeCloseTo((10.5 / 800) * 100);
    expect(r.partial).toContainEqual({ key: "fiber_g", knownShare: 0.5 });
    expect(r.partial).toContainEqual({ key: "vitamin_c_mg", knownShare: 0.5 });
    expect(r.unknown).not.toContain("fiber_g");
    expect(r.unknown).toContain("zinc_mg");
    expect(r.partial.map((p) => p.key)).not.toContain("energy_kcal");
  });

  it("keeps energy and macros unknown if any ingredient lacks them", () => {
    const r = recipeNutrition([...ingredients, { amount_g: 50, nutrients_per_100g: { energy_kcal: 100, fiber_g: 1 } }]);
    expect(r.per100g.protein_g).toBeUndefined();
    expect(r.unknown).toContain("protein_g");
    expect(r.per100g.energy_kcal).toBeDefined();
  });

  it("handles an empty recipe", () => {
    const r = recipeNutrition([]);
    expect(r.per100g).toEqual({});
    expect(r.totalWeightG).toBe(0);
  });

  it("logging 300 g of the dish gives the right share", () => {
    const r = recipeNutrition(ingredients, 800);
    const eaten = (r.per100g.energy_kcal! * 300) / 100;
    expect(eaten).toBeCloseTo(1310 * (300 / 800));
  });
});

describe("parseIngredientLine", () => {
  it("parses common formats", () => {
    expect(parseIngredientLine("200 g Haferflocken")).toEqual({ name: "Haferflocken", amount_g: 200 });
    expect(parseIngredientLine("- Hähnchenbrust 1,5 kg")).toEqual({ name: "Hähnchenbrust", amount_g: 1500 });
    expect(parseIngredientLine("Milch: 250ml")).toEqual({ name: "Milch", amount_g: 250 });
    expect(parseIngredientLine("• 12.5g Salz")).toEqual({ name: "Salz", amount_g: 12.5 });
  });

  it("keeps lines without an amount", () => {
    expect(parseIngredientLine("Pfeffer")).toEqual({ name: "Pfeffer", amount_g: null });
    expect(parseIngredientLine("   ")).toBeNull();
  });
});
