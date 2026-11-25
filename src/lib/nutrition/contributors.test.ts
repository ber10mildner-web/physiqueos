import { describe, expect, it } from "vitest";
import { contributors } from "./contributors";
import { fixedMealName } from "./fixed-meals";

const e = (food_name: string, amount_g: number, protein_g?: number) => ({
  food_name,
  amount_g,
  nutrients_per_100g: protein_g === undefined ? { energy_kcal: 100 } : { protein_g, energy_kcal: 100 },
});

describe("contributors", () => {
  it("ranks foods by the amount they brought, merging the same food", () => {
    const r = contributors([e("Skyr", 500, 11), e("Haferflocken", 80, 13.5), e("Körniger Frischkäse", 200, 10), e("Skyr", 100, 11), e("Apfel", 150, 0)], "protein_g");
    expect(r.items.map((c) => c.name)).toEqual(["Skyr", "Körniger Frischkäse", "Haferflocken"]);
    expect(r.items[0].value).toBeCloseTo(66);
    expect(r.items[0].grams).toBe(600);
    expect(r.total).toBeCloseTo(66 + 20 + 10.8);
    expect(r.items.reduce((s, c) => s + c.share, 0)).toBeCloseTo(1);
    expect(r.unknown).toBe(0);
  });

  it("counts foods without data instead of treating them as zero", () => {
    const r = contributors([e("Skyr", 100, 11), e("Unbekannt", 100)], "protein_g");
    expect(r.items).toHaveLength(1);
    expect(r.unknown).toBe(1);
  });
});

describe("fixedMealName", () => {
  it("names the meal after its first foods", () => {
    expect(fixedMealName(["Haferflocken", "Skyr Natur", "Heidelbeeren, roh", "Honig"])).toBe("Haferflocken, Skyr Natur +2");
    expect(fixedMealName(["Ei, hart gekocht"])).toBe("Ei");
  });
});
