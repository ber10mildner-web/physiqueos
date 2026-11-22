import { describe, expect, it } from "vitest";
import { sumItems } from "./calc";
import { nutrientGaps } from "./gaps";

const day = (n: Record<string, number>) => sumItems([{ amount_g: 100, nutrients_per_100g: n }]);

describe("nutrientGaps", () => {
  it("needs at least 3 logged days", () => {
    expect(nutrientGaps([day({ fiber_g: 5 })], "male").enoughDays).toBe(false);
  });

  it("flags nutrients clearly below the reference, lowest first", () => {
    const days = [1, 2, 3].map(() => day({ fiber_g: 15, vitamin_d_ug: 2, vitamin_c_mg: 150, calcium_mg: 900 }));
    const r = nutrientGaps(days, "male");
    expect(r.gaps.map((g) => g.key)).toEqual(["vitamin_d_ug", "fiber_g"]);
    expect(r.unknown).toContain("zinc_mg");
  });

  it("uses the fibre goal and skips nutrients with too little data", () => {
    const days = [
      sumItems([
        { amount_g: 100, nutrients_per_100g: { fiber_g: 20, iron_mg: 1 } },
        { amount_g: 100, nutrients_per_100g: { fiber_g: 20 } },
      ]),
      day({ fiber_g: 40 }),
      day({ fiber_g: 40 }),
    ];
    const r = nutrientGaps(days, "female", 60);
    expect(r.gaps.map((g) => g.key)).toEqual(["fiber_g"]);
    expect(r.unknown).toContain("iron_mg");
  });
});
