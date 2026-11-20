import { describe, expect, it } from "vitest";
import { estimate1RM, records, suggestNext, volume } from "./calc";

describe("training calc", () => {
  it("estimates 1RM with Epley", () => {
    expect(estimate1RM(100, 1)).toBe(100);
    expect(estimate1RM(100, 5)).toBeCloseTo(116.67, 2);
    expect(estimate1RM(100, 15)).toBeNull();
    expect(estimate1RM(0, 5)).toBeNull();
  });

  it("sums working-set volume only", () => {
    expect(volume([{ reps: 10, weight_kg: 50, is_warmup: true }, { reps: 8, weight_kg: 80 }, { reps: 6, weight_kg: 85 }])).toBe(640 + 510);
  });

  it("finds records ignoring warm-ups", () => {
    const r = records([
      { reps: 5, weight_kg: 120, is_warmup: true },
      { reps: 8, weight_kg: 100 },
      { reps: 3, weight_kg: 110 },
      { reps: 5, weight_kg: 110 },
    ]);
    expect(r.bestWeight).toEqual({ weight_kg: 110, reps: 5 });
    expect(r.best1RM?.weight_kg).toBe(110); // 110×5 → 128.3 beats 100×8 → 126.7; warm-up 120×5 ignored
  });

  it("picks the highest estimated 1RM", () => {
    const r = records([
      { reps: 8, weight_kg: 100 },
      { reps: 5, weight_kg: 110 },
    ]);
    // 100·(1+8/30)=126.67, 110·(1+5/30)=128.33
    expect(r.best1RM?.weight_kg).toBe(110);
  });

  it("suggests double progression", () => {
    expect(suggestNext([], 12, "barbell")).toEqual({ kind: "first" });
    expect(suggestNext([{ reps: 12, weight_kg: 60 }, { reps: 12, weight_kg: 60 }], 12, "barbell")).toEqual({ kind: "increase", weight_kg: 62.5 });
    expect(suggestNext([{ reps: 12, weight_kg: 20 }, { reps: 12, weight_kg: 20 }], 12, "dumbbell")).toEqual({ kind: "increase", weight_kg: 22 });
    expect(suggestNext([{ reps: 12, weight_kg: 60 }, { reps: 10, weight_kg: 60 }], 12, "barbell")).toEqual({ kind: "same", weight_kg: 60 });
    expect(suggestNext([{ reps: 15, weight_kg: 0 }], 12, "bodyweight")).toEqual({ kind: "same", weight_kg: 0 });
  });
});
