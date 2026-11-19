import { describe, expect, it } from "vitest";
import { checkPlausibility, energyFromMacros, isComplete, round, scaleNutrients, sumItems } from "./calc";

describe("scaleNutrients", () => {
  it("scales per-100 g values linearly", () => {
    const r = scaleNutrients({ energy_kcal: 370, protein_g: 13.5, fiber_g: 10 }, 300);
    expect(r.energy_kcal).toBeCloseTo(1110);
    expect(r.protein_g).toBeCloseTo(40.5);
    expect(r.fiber_g).toBeCloseTo(30);
  });

  it("keeps unknown nutrients unknown instead of zero", () => {
    const r = scaleNutrients({ energy_kcal: 100 }, 50);
    expect(r).toEqual({ energy_kcal: 50 });
    expect("vitamin_c_mg" in r).toBe(false);
  });

  it("keeps known zeros as zero", () => {
    expect(scaleNutrients({ fat_g: 0 }, 250)).toEqual({ fat_g: 0 });
  });

  it("rejects negative or non-finite amounts", () => {
    expect(() => scaleNutrients({}, -1)).toThrow();
    expect(() => scaleNutrients({}, Number.NaN)).toThrow();
  });
});

describe("sumItems", () => {
  const items = [
    { nutrients_per_100g: { energy_kcal: 370, protein_g: 13.5, vitamin_c_mg: 0 }, amount_g: 80 },
    { nutrients_per_100g: { energy_kcal: 60, protein_g: 11, vitamin_c_mg: 10 }, amount_g: 250 },
    { nutrients_per_100g: { energy_kcal: 52, protein_g: 0.3 }, amount_g: 150 },
  ];
  const totals = sumItems(items);

  it("sums energy and macros", () => {
    expect(totals.energy_kcal.value).toBeCloseTo(296 + 150 + 78);
    expect(totals.protein_g.value).toBeCloseTo(10.8 + 27.5 + 0.45);
  });

  it("reports coverage for partially known nutrients", () => {
    expect(totals.vitamin_c_mg).toEqual({ value: 25, known: 2, of: 3 });
    expect(isComplete(totals.vitamin_c_mg)).toBe(false);
    expect(isComplete(totals.energy_kcal)).toBe(true);
    expect(totals.vitamin_d_ug).toEqual({ value: 0, known: 0, of: 3 });
  });

  it("handles an empty day", () => {
    const empty = sumItems([]);
    expect(empty.energy_kcal).toEqual({ value: 0, known: 0, of: 0 });
    expect(isComplete(empty.energy_kcal)).toBe(false);
  });
});

describe("energyFromMacros / plausibility", () => {
  it("uses EU Atwater factors including fibre", () => {
    // Oats-like label: P 13.5, C 58.7, F 7, fibre 10 -> 54 + 234.8 + 63 + 20 = 371.8
    expect(energyFromMacros({ protein_g: 13.5, carbs_g: 58.7, fat_g: 7, fiber_g: 10 })).toBeCloseTo(371.8);
    expect(energyFromMacros({ protein_g: 1 })).toBeNull();
  });

  it("accepts a consistent label", () => {
    expect(checkPlausibility({ energy_kcal: 372, protein_g: 13.5, carbs_g: 58.7, fat_g: 7, fiber_g: 10, sugar_g: 0.7, saturated_fat_g: 1.3 })).toEqual([]);
  });

  it("flags impossible or inconsistent values", () => {
    expect(checkPlausibility({ energy_kcal: 100, protein_g: 60, carbs_g: 50, fat_g: 1 })).toContain("macros_exceed_100g");
    expect(checkPlausibility({ energy_kcal: 100, protein_g: 20, carbs_g: 50, fat_g: 10 })).toContain("energy_mismatch");
    expect(checkPlausibility({ carbs_g: 5, sugar_g: 9 })).toContain("sugar_exceeds_carbs");
    expect(checkPlausibility({ fat_g: 2, saturated_fat_g: 5 })).toContain("sat_fat_exceeds_fat");
  });

  it("rounds without float noise", () => {
    expect(round(1.005, 2)).toBe(1.01);
    expect(round(0.1 + 0.2, 1)).toBe(0.3);
  });
});
