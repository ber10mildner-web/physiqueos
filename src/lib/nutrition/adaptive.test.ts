import { describe, expect, it } from "vitest";
import { estimateTdee, shiftTargets, suggestTarget, weeklyAverageTarget } from "./adaptive";
import { addDays } from "@/lib/dates";

const today = "2026-11-23";
const days = (n: number, kcal: number, target: number | null = 2500) => Array.from({ length: n }, (_, i) => ({ date: addDays(today, -1 - i), kcal, target }));
const weights = (n: number, start: number, perDay: number) => Array.from({ length: n }, (_, i) => ({ date: addDays(today, -1 - i), weight: start - perDay * i }));
const base = { energy_kcal: 2500, protein_g: 160, carbs_g: 300, fat_g: 70, fiber_g: 35 };

describe("estimateTdee", () => {
  it("adds the energy that went into losing weight", () => {
    // eats 2200, loses 0.5 kg/week → maintenance ≈ 2200 + 550
    const res = estimateTdee(days(28, 2200), weights(28, 80, -0.5 / 7), today);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.estimate.tdee).toBeGreaterThan(2700);
    expect(res.estimate.tdee).toBeLessThan(2800);
    expect(res.estimate.confidence).toBe("high");
  });
  it("leaves out half-logged days and needs enough data", () => {
    const d = [...days(13, 2500), ...days(28, 900).slice(13)];
    const res = estimateTdee(d, weights(28, 80, 0), today);
    expect(res).toMatchObject({ ok: false, reason: "few_days", loggedDays: 13 });
    expect(estimateTdee(days(28, 2500), weights(3, 80, 0), today)).toMatchObject({ ok: false, reason: "few_weights" });
  });
  it("never uses today", () => {
    const res = estimateTdee([{ date: today, kcal: 5000, target: 2500 }, ...days(20, 2500)], weights(20, 80, 0), today);
    expect(res.ok && res.estimate.avgIntake).toBe(2500);
  });
});

describe("suggestTarget", () => {
  const est = (tdee: number) => {
    const r = estimateTdee(days(28, tdee), weights(28, 80, 0), today);
    if (!r.ok) throw new Error("no estimate");
    return r.estimate;
  };
  it("aims for the wanted pace from the goal weight", () => {
    const s = suggestTarget({ estimate: est(2800), currentWeight: 80, goalWeightKg: 75, paceKgWeek: 0.5, phase: "cut", base, alt: null, altDays: [], floorKcal: 1700 })!;
    expect(s.idealKcal).toBe(2250);
    expect(s.change).toBe(-250);
    expect(s.base.energy_kcal).toBe(2250);
    expect(s.base.protein_g).toBe(160);
  });
  it("takes the pace from the body goal when one is set", () => {
    // fat loss, no pace chosen: 0.5 % of 80 kg = 0.4 kg/week ≈ 440 kcal below 2800
    const s = suggestTarget({ estimate: est(2800), currentWeight: 80, goalWeightKg: null, paceKgWeek: null, phase: "custom", goalType: "fat_loss", trainingLevel: "intermediate", base, alt: null, altDays: [], floorKcal: 1700 })!;
    expect(s.aimSource).toBe("goal_type");
    expect(s.aimKgPerWeek).toBe(-0.4);
    expect(s.idealKcal).toBe(2360);
    // recomp ignores a goal weight's pace
    const r = suggestTarget({ estimate: est(2800), currentWeight: 80, goalWeightKg: 70, paceKgWeek: 1, phase: "cut", goalType: "recomp", base, alt: null, altDays: [], floorKcal: 1700 })!;
    expect(r.aimKgPerWeek).toBe(-0.16);
  });
  it("caps big jumps and respects the floor", () => {
    const s = suggestTarget({ estimate: est(1800), currentWeight: 80, goalWeightKg: 70, paceKgWeek: 1, phase: "cut", base, alt: null, altDays: [], floorKcal: 1700 })!;
    expect(s.idealKcal).toBe(1700);
    expect(s.change).toBe(-400);
  });
  it("returns nothing for small differences or an unknown pace", () => {
    expect(suggestTarget({ estimate: est(2500), currentWeight: 80, goalWeightKg: null, paceKgWeek: null, phase: "maintenance", base, alt: null, altDays: [], floorKcal: 1500 })).toBeNull();
    expect(suggestTarget({ estimate: est(3000), currentWeight: 80, goalWeightKg: null, paceKgWeek: null, phase: "custom", base, alt: null, altDays: [], floorKcal: 1500 })).toBeNull();
  });
  it("moves weekday targets by the same amount", () => {
    const alt = { ...base, energy_kcal: 2900, carbs_g: 400 };
    expect(weeklyAverageTarget(base, alt, [2, 4])).toBeCloseTo((2500 * 5 + 2900 * 2) / 7);
    const s = suggestTarget({ estimate: est(3000), currentWeight: 80, goalWeightKg: null, paceKgWeek: null, phase: "maintenance", base, alt, altDays: [2, 4], floorKcal: 1500 })!;
    expect(s.alt!.energy_kcal - s.base.energy_kcal).toBe(400);
  });
});

describe("shiftTargets", () => {
  it("takes fat down only when carbs would go below 50 g", () => {
    expect(shiftTargets(base, -200)).toMatchObject({ energy_kcal: 2300, carbs_g: 250, fat_g: 70 });
    const low = shiftTargets({ ...base, carbs_g: 80 }, -400);
    expect(low.carbs_g).toBe(50);
    expect(low.fat_g).toBeLessThan(70);
  });
});
