import { describe, expect, it } from "vitest";
import { ageFromBirthDate, bmrMifflinStJeor, caloriesFromMacroTargets, macrosForCalories, suggestTargets, tdee } from "./energy";

describe("Mifflin-St Jeor", () => {
  it("matches hand-calculated values", () => {
    // 10*80 + 6.25*180 - 5*25 + 5 = 800 + 1125 - 125 + 5 = 1805
    expect(bmrMifflinStJeor({ sex: "male", weightKg: 80, heightCm: 180, ageYears: 25 })).toBe(1805);
    // 10*60 + 6.25*165 - 5*30 - 161 = 600 + 1031.25 - 150 - 161 = 1320.25
    expect(bmrMifflinStJeor({ sex: "female", weightKg: 60, heightCm: 165, ageYears: 30 })).toBeCloseTo(1320.25);
  });

  it("applies the activity factor", () => {
    expect(tdee({ sex: "male", weightKg: 80, heightCm: 180, ageYears: 25, activity: "moderate" })).toBeCloseTo(1805 * 1.55);
  });

  it("rejects invalid input", () => {
    expect(() => bmrMifflinStJeor({ sex: "male", weightKg: 0, heightCm: 180, ageYears: 25 })).toThrow();
  });
});

describe("ageFromBirthDate", () => {
  it("counts birthdays correctly", () => {
    expect(ageFromBirthDate("2000-11-20", new Date(2026, 10, 19))).toBe(25);
    expect(ageFromBirthDate("2000-11-19", new Date(2026, 10, 19))).toBe(26);
  });
});

describe("targets", () => {
  it("adjusts calories per phase and splits macros consistently", () => {
    const p = { sex: "male" as const, weightKg: 80, heightCm: 180, ageYears: 25, activity: "moderate" as const };
    const maint = suggestTargets(p, "maintenance");
    const cut = suggestTargets(p, "cut");
    const bulk = suggestTargets(p, "lean_bulk");
    expect(maint.targets.energy_kcal).toBe(2800); // 2797.75 -> nearest 10
    expect(cut.targets.energy_kcal).toBe(2240); // 0.8 * 2797.75 = 2238.2
    expect(bulk.targets.energy_kcal).toBe(3080); // 1.1 * 2797.75 = 3077.5
    for (const s of [maint, cut, bulk]) {
      const kcal = caloriesFromMacroTargets(s.targets);
      expect(Math.abs(kcal - s.targets.energy_kcal)).toBeLessThanOrEqual(30); // rounding to 5 g steps
    }
    expect(cut.targets.protein_g).toBe(175); // 2.2 g/kg * 80 = 176 -> 175
  });

  it("never produces negative carbs", () => {
    const t = macrosForCalories(1000, 150, "cut");
    expect(t.carbs_g).toBe(0);
  });

  it("sets fibre to at least 30 g and 14 g per 1000 kcal", () => {
    expect(macrosForCalories(1800, 70, "maintenance").fiber_g).toBe(30);
    expect(macrosForCalories(3000, 90, "lean_bulk").fiber_g).toBe(42);
  });
});
