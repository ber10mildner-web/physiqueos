import { describe, expect, it } from "vitest";
import { dueDates, medicationDueDates } from "./routines";
import { supplementDiaryValues } from "./wellbeing";
import { workoutMinutes } from "@/lib/training/calc";

describe("routines", () => {
  // 2026-11-21 is a Saturday
  it("lists the due days of the last week, never before the start day", () => {
    expect(dueDates([6, 7, 1], "2026-01-01", "2026-11-21")).toEqual(["2026-11-15", "2026-11-16", "2026-11-21"]);
    expect(dueDates([6, 7, 1], "2026-11-21", "2026-11-21")).toEqual(["2026-11-21"]);
    expect(dueDates([2], "2026-11-21", "2026-11-21")).toEqual([]);
    expect(dueDates([], "2026-01-01", "2026-11-21")).toEqual([]);
    expect(dueDates([1, 2, 3, 4, 5, 6, 7], "2026-01-01", "2026-11-21")).toHaveLength(7);
  });

  it("turns nutrients per dose into diary values that add up to one dose", () => {
    const { per100g, amount_g } = supplementDiaryValues({ energy_kcal: 9, fat_g: 1, vitamin_d_ug: 25 }, 2);
    expect(amount_g).toBe(2);
    expect((per100g.energy_kcal! * amount_g) / 100).toBeCloseTo(9);
    expect((per100g.vitamin_d_ug! * amount_g) / 100).toBeCloseTo(25);
    // without a dose weight one dose counts as 1 g
    expect(supplementDiaryValues({ energy_kcal: 9 }, null)).toEqual({ per100g: { energy_kcal: 900 }, amount_g: 1 });
  });

  it("computes workout length in minutes", () => {
    expect(workoutMinutes("2026-11-21T09:00:00Z", "2026-11-21T10:15:00Z")).toBe(75);
    expect(workoutMinutes("2026-11-21T09:00:00Z", null)).toBeNull();
    expect(workoutMinutes("2026-11-21T10:00:00Z", "2026-11-21T09:00:00Z")).toBeNull();
  });

  it("supplements every second day and in a 3-on/1-off cycle", () => {
    const med = { auto_days: [], every_days: 2, cycle_on_days: null, cycle_off_days: null, schedule_start: "2026-11-01", auto_from: "2026-11-01" };
    expect(medicationDueDates(med, "2026-11-21")).toEqual(["2026-11-15", "2026-11-17", "2026-11-19", "2026-11-21"]);
    // set up today: no back-fill before that, even though the cycle started earlier
    const cyc = { auto_days: [1, 2, 3, 4, 5, 6, 7], every_days: null, cycle_on_days: 21, cycle_off_days: 7, schedule_start: "2026-11-01", auto_from: "2026-11-20" };
    expect(medicationDueDates(cyc, "2026-11-23")).toEqual(["2026-11-20", "2026-11-21"]);
  });
});
