import { describe, expect, it } from "vitest";
import { foodPeek } from "./peek";

describe("foodPeek", () => {
  it("scales to the eaten amount and keeps unknown values unknown", () => {
    const p = foodPeek({ energy_kcal: 280, protein_g: 2, carbs_g: 75, fat_g: 0.2 }, 50);
    expect(p.values.energy_kcal).toBe(140);
    expect(p.values.fiber_g).toBeUndefined();
    expect(p.fiberShare).toBeNull();
    expect(p.highlights).toEqual([]);
    expect(p.microsKnown).toBe(0);
  });

  it("reports a fibre share, also for zero fibre", () => {
    expect(foodPeek({ fiber_g: 6.7 }, 100).fiberShare).toBeCloseTo(6.7 / 30);
    expect(foodPeek({ fiber_g: 0 }, 100).fiberShare).toBe(0);
  });

  it("lists the largest vitamin and mineral shares first, at most four, and marks real sources", () => {
    const p = foodPeek(
      {
        potassium_mg: 696, // 17 %
        magnesium_mg: 54, // 17 % of 325
        vitamin_c_mg: 0.5, // tiny
        vitamin_d_ug: 10, // 50 %
        calcium_mg: 300, // 30 %
        iron_mg: 3, // 23 %
        zinc_mg: 0.1,
      },
      100,
    );
    expect(p.highlights.map((h) => h.key)).toEqual(["vitamin_d_ug", "calcium_mg", "iron_mg", "potassium_mg"]);
    expect(p.highlights[0].share).toBeCloseTo(0.5);
    expect(p.highlights.every((h) => h.notable)).toBe(true);
    expect(p.microsKnown).toBe(7);
  });

  it("still names small but present amounts, without marking them as notable", () => {
    // 72 g Medjool dates: about 13 % of the potassium reference
    const p = foodPeek({ potassium_mg: 696, magnesium_mg: 54, zinc_mg: 0.44, vitamin_c_mg: 0 }, 72);
    expect(p.highlights.map((h) => [h.key, h.notable])).toEqual([
      ["potassium_mg", false],
      ["magnesium_mg", false],
    ]);
  });
});
