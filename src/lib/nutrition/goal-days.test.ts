import { describe, expect, it } from "vitest";
import { isoWeekday, shiftCarbs, targetsOn, type GoalRow } from "./goal-days";

const row: GoalRow = {
  id: "g",
  valid_from: "2026-11-01",
  phase: "cut",
  energy_kcal: 2150,
  protein_g: 170,
  carbs_g: 200,
  fat_g: 70,
  fiber_g: 30,
  alt_days: [2, 4],
  alt_energy_kcal: 2300,
  alt_protein_g: 170,
  alt_carbs_g: 238,
  alt_fat_g: 70,
  alt_fiber_g: 30,
};

describe("goal days", () => {
  it("knows ISO weekdays", () => {
    expect(isoWeekday("2026-11-16")).toBe(1); // Monday
    expect(isoWeekday("2026-11-22")).toBe(7); // Sunday
  });

  it("uses the alternative targets on the chosen weekdays only", () => {
    expect(targetsOn(row, "2026-11-17")).toMatchObject({ energy_kcal: 2300, carbs_g: 238, alt_day: true }); // Tuesday
    expect(targetsOn(row, "2026-11-19")).toMatchObject({ energy_kcal: 2300, alt_day: true }); // Thursday
    expect(targetsOn(row, "2026-11-18")).toMatchObject({ energy_kcal: 2150, carbs_g: 200, alt_day: false }); // Wednesday
  });

  it("ignores alternative days without targets", () => {
    expect(targetsOn({ ...row, alt_energy_kcal: null }, "2026-11-17").alt_day).toBe(false);
    expect(targetsOn({ ...row, alt_days: [] }, "2026-11-17").alt_day).toBe(false);
  });

  it("puts extra calories into carbohydrates", () => {
    expect(shiftCarbs(row, 2300)).toMatchObject({ energy_kcal: 2300, protein_g: 170, carbs_g: 238, fat_g: 70 });
    expect(shiftCarbs(row, 1000).carbs_g).toBe(0);
  });
});
