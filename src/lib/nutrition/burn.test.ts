import { describe, expect, it } from "vitest";
import { dailyBurn, type BurnInput } from "./burn";

const base: BurnInput = {
  date: "2026-11-22",
  profile: { sex: "male", birth_date: "2000-01-01", height_cm: 180 },
  weightKg: 80,
  intakeKcal: 2500,
  health: null,
  cardio: [],
  gymMinutes: [],
};
// Mifflin: 10·80 + 6.25·180 − 5·26 + 5 = 1800
const BMR = 1800;

describe("dailyBurn", () => {
  it("counts only the part of the resting energy that has passed today", () => {
    const b = dailyBurn({ ...base, intakeKcal: 0, dayFraction: 0.5 })!;
    expect(b.total).toBe(BMR / 2);
  });

  it("needs a profile and weight without Garmin", () => {
    expect(dailyBurn({ ...base, profile: null })).toBeNull();
    expect(dailyBurn({ ...base, weightKg: null })).toBeNull();
  });

  it("estimates BMR + steps + gym + TEF", () => {
    const b = dailyBurn({ ...base, health: { steps: 10000, active_kcal: null, bmr_kcal: null }, gymMinutes: [60, null] })!;
    expect(b.basis).toBe("estimate");
    const part = (k: string) => b.parts.find((p) => p.key === k)?.kcal;
    expect(part("bmr")).toBe(BMR);
    expect(part("steps")).toBe(320); // 10000 × 0.0004 × 80
    expect(part("gym")).toBe(280); // 3.5 × 80 × 1 h
    expect(part("tef")).toBe(250);
    expect(b.total).toBe(BMR + 320 + 280 + 250);
    expect(b.gymWithoutDuration).toBe(1);
  });

  it("does not count walking cardio steps twice and subtracts the resting share", () => {
    const b = dailyBurn({ ...base, intakeKcal: 0, health: { steps: 6000, active_kcal: null, bmr_kcal: null }, cardio: [{ activity: "walk", duration_min: 30, kcal: 250 }] })!;
    const part = (k: string) => b.parts.find((p) => p.key === k)?.kcal;
    expect(part("steps")).toBe(Math.round((6000 - 30 * 110) * 0.0004 * 80));
    expect(part("cardio")).toBe(Math.round(250 - (BMR / 1440) * 30));
  });

  it("uses Garmin active calories and BMR, adding only strength training", () => {
    const b = dailyBurn({ ...base, profile: null, health: { steps: 12000, active_kcal: 700, bmr_kcal: 1850 }, cardio: [{ activity: "walk", duration_min: 30, kcal: 250 }], gymMinutes: [45] })!;
    expect(b.basis).toBe("garmin");
    expect(b.parts.map((p) => p.key)).toEqual(["bmr", "garmin_active", "gym"]);
    expect(b.total).toBe(1850 + 700 + 210);
  });
});
