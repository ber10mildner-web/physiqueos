import { describe, expect, it } from "vitest";
import { cookedWeight, DEFAULT_LOSS_PCT, isWater, rawWeight, waterCandidate } from "./cooking";
import { hasRequiredNutrients } from "./nutrients";
import { recipeNutrition } from "./recipe";

describe("cooking water loss", () => {
  const casserole = [
    { amount_g: 500, cooks: true }, // Hackfleisch
    { amount_g: 400, cooks: true }, // Tomaten
    { amount_g: 30, cooks: false }, // Öl
  ];

  it("only reduces the ingredients that cook", () => {
    expect(rawWeight(casserole)).toBe(930);
    expect(cookedWeight(casserole, 15)).toBe(930 - 135);
    expect(cookedWeight(casserole, 0)).toBe(930);
  });

  it("raises the calories per 100 g compared to the raw weight", () => {
    const ings = [
      { amount_g: 500, nutrients_per_100g: { energy_kcal: 250, protein_g: 18, carbs_g: 0, fat_g: 20 } },
      { amount_g: 500, nutrients_per_100g: { energy_kcal: 20, protein_g: 1, carbs_g: 3, fat_g: 0 } },
    ];
    const raw = recipeNutrition(ings).per100g.energy_kcal!;
    const cooked = recipeNutrition(ings, cookedWeight(ings.map((i) => ({ amount_g: i.amount_g, cooks: true })), DEFAULT_LOSS_PCT.bake)).per100g.energy_kcal!;
    expect(raw).toBeCloseTo(135);
    expect(cooked).toBeCloseTo(1350 / 8.5);
  });

  it("clamps silly values", () => {
    expect(cookedWeight(casserole, -5)).toBe(930);
    expect(cookedWeight(casserole, 500)).toBe(930 - 540);
  });

  it("water is a complete zero food", () => {
    const w = waterCandidate();
    expect(hasRequiredNutrients(w.nutrients)).toBe(true);
    expect(w.nutrients.energy_kcal).toBe(0);
    expect(isWater("Wasser")).toBe(true);
    expect(isWater("Kochwasser")).toBe(true);
    expect(isWater("Wassermelone")).toBe(false);
  });
});
