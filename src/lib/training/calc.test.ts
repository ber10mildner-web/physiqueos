import { describe, expect, it } from "vitest";
import { coachNext, estimate1RM, records, strengthHistory, volume } from "./calc";

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
});

describe("coachNext", () => {
  const s = (w: number, ...reps: number[]) => reps.map((r) => ({ weight_kg: w, reps: r }));
  it("asks for a start weight without history", () => {
    expect(coachNext([], 8, 12, "barbell")).toEqual({ kind: "first" });
  });
  it("adds a step when every top set reached the top of the range", () => {
    expect(coachNext([s(80, 12, 12, 12)], 8, 12, "barbell")).toEqual({ kind: "increase", weight_kg: 82.5, reps: 8, from_kg: 80 });
    expect(coachNext([s(20, 12, 12)], 8, 12, "dumbbell")).toEqual({ kind: "increase", weight_kg: 22, reps: 8, from_kg: 20 });
  });
  it("ignores warm-ups and lighter back-off sets", () => {
    const session = [{ weight_kg: 40, reps: 10, is_warmup: true }, ...s(80, 12, 12), { weight_kg: 60, reps: 6 }];
    expect(coachNext([session], 8, 12, "barbell").kind).toBe("increase");
  });
  it("asks for one more rep at the same weight", () => {
    expect(coachNext([s(80, 9, 8, 8)], 8, 12, "barbell")).toEqual({ kind: "reps", weight_kg: 80, reps: 9 });
  });
  it("goes one step lighter when no set reached the range", () => {
    expect(coachNext([s(80, 6, 5)], 8, 12, "barbell")).toEqual({ kind: "lighter", weight_kg: 77.5, reps: 8 });
  });
  it("suggests a deload after three sessions without progress", () => {
    const res = coachNext([s(80, 9, 8), s(80, 9, 8), s(80, 10, 8)], 8, 12, "barbell");
    expect(res).toEqual({ kind: "deload", weight_kg: 72.5, reps: 12, sessions: 3 });
  });
  it("does not call it a stall while reps still go up", () => {
    expect(coachNext([s(80, 10, 9), s(80, 9, 8), s(80, 8, 8)], 8, 12, "barbell").kind).toBe("reps");
  });
  it("bodyweight: one more rep", () => {
    expect(coachNext([s(0, 15, 12)], 8, 12, "bodyweight")).toEqual({ kind: "reps", weight_kg: 0, reps: 16 });
  });
});

describe("strengthHistory", () => {
  const set = (workout_id: string, workout_date: string, weight_kg: number, reps: number, is_warmup = false) => ({ workout_id, workout_date, weight_kg, reps, is_warmup });

  it("takes the best working set per session, oldest first", () => {
    const h = strengthHistory([set("b", "2026-11-20", 60, 10, true), set("b", "2026-11-20", 100, 5), set("b", "2026-11-20", 90, 8), set("a", "2026-11-13", 95, 5)]);
    expect(h.metric).toBe("e1rm");
    expect(h.points.map((p) => p.date)).toEqual(["2026-11-13", "2026-11-20"]);
    // 100 × 5 ≈ 116.7 beats 90 × 8 = 114
    expect(h.points[1]).toEqual({ date: "2026-11-20", value: 116.7, weight_kg: 100, reps: 5 });
  });

  it("still charts high-rep sets", () => {
    const h = strengthHistory([set("a", "2026-11-01", 20, 15), set("b", "2026-11-08", 20, 18)]);
    expect(h.points.map((p) => p.value)).toEqual([30, 32]);
  });

  it("uses reps for bodyweight exercises", () => {
    const h = strengthHistory([set("a", "2026-11-01", 0, 8), set("a", "2026-11-01", 0, 10), set("b", "2026-11-08", 0, 12)]);
    expect(h.metric).toBe("reps");
    expect(h.points.map((p) => p.value)).toEqual([10, 12]);
  });

  it("is empty without working sets", () => {
    expect(strengthHistory([set("a", "2026-11-01", 50, 10, true)]).points).toEqual([]);
  });
});
