import { describe, expect, it } from "vitest";
import { defaultPacePct, goalAim, phaseForGoal, proteinPerKg, suggestTargetsForGoal } from "./goals";

describe("goalAim", () => {
  it("aims for about 0.5 % body weight per week when cutting", () => {
    expect(goalAim({ goal: "fat_loss", level: "intermediate", currentKg: 80, goalWeightKg: null, paceKgWeek: null })).toBe(-0.4);
    expect(goalAim({ goal: "fat_loss", level: "advanced", currentKg: 80, goalWeightKg: null, paceKgWeek: null })).toBe(-0.32);
  });
  it("uses a chosen pace and stops at the goal weight", () => {
    expect(goalAim({ goal: "fat_loss", level: null, currentKg: 80, goalWeightKg: 75, paceKgWeek: 0.25 })).toBe(-0.25);
    expect(goalAim({ goal: "fat_loss", level: null, currentKg: 75.1, goalWeightKg: 75, paceKgWeek: 0.5 })).toBe(0);
    expect(goalAim({ goal: "muscle_gain", level: "beginner", currentKg: 70, goalWeightKg: 75, paceKgWeek: null })).toBe(0.21);
    expect(goalAim({ goal: "muscle_gain", level: null, currentKg: 76, goalWeightKg: 75, paceKgWeek: 0.25 })).toBe(0);
  });
  it("keeps recomp slightly below maintenance and maintain at zero", () => {
    expect(goalAim({ goal: "recomp", level: "beginner", currentKg: 80, goalWeightKg: 70, paceKgWeek: 1 })).toBe(-0.16);
    expect(goalAim({ goal: "maintain", level: null, currentKg: 80, goalWeightKg: 70, paceKgWeek: 1 })).toBe(0);
  });
  it("slows muscle gain with experience", () => {
    expect(defaultPacePct("muscle_gain", "beginner")).toBeGreaterThan(defaultPacePct("muscle_gain", "advanced"));
  });
});

describe("goal targets", () => {
  it("maps goals to protein and phase", () => {
    expect(proteinPerKg("fat_loss")).toBe(2.2);
    expect(proteinPerKg("muscle_gain")).toBe(1.8);
    expect(phaseForGoal("recomp")).toBe("cut");
  });
  it("subtracts the energy of the planned loss from the formula maintenance", () => {
    const p = { sex: "male" as const, ageYears: 25, heightCm: 180, weightKg: 80, activity: "moderate" as const };
    const s = suggestTargetsForGoal(p, { goal: "fat_loss", level: "intermediate", goalWeightKg: null, paceKgWeek: null });
    // tdee ≈ 1805 × 1.55 = 2798; −0.4 kg/week ≈ −440 kcal
    expect(s.tdee).toBe(2798);
    expect(s.targets.energy_kcal).toBe(2360);
    expect(s.targets.protein_g).toBe(175);
    const keep = suggestTargetsForGoal(p, { goal: "maintain", level: null, goalWeightKg: null, paceKgWeek: null });
    expect(keep.targets.energy_kcal).toBe(2800);
  });
});
