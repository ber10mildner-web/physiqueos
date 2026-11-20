import { describe, expect, it } from "vitest";
import { ageOn, estimateCardioKcal, keytelKcalPerMin, stairWorkKcal, stepsPerMinuteForLevel, type KcalInput } from "./cardio-kcal";

const base: KcalInput = {
  activity: "stairs",
  duration_min: 60,
  avg_hr: null,
  kcal: null,
  source: "garmin",
  machine_minutes: null,
  machine_level: null,
  machine_floors: null,
  machine_steps: null,
  machine_kcal: null,
};
const leo = { weight_kg: 80, age: 25, sex: "male" as const };

describe("cardio calories", () => {
  it("computes stair work with the ACSM stepping equation", () => {
    // 60 steps/min, 20 cm: VO2 = 12 + 21.6 + 3.5 = 37.1 ml/kg/min → 80 kg × 60 min × 5 kcal/L
    expect(stairWorkKcal(3600, 60, 80)).toBeCloseTo(890.4, 1);
  });

  it("maps StepMill levels to step rates", () => {
    expect(stepsPerMinuteForLevel(1)).toBe(24);
    expect(stepsPerMinuteForLevel(20)).toBeCloseTo(162);
    expect(stepsPerMinuteForLevel(99)).toBeCloseTo(162);
  });

  it("uses the Keytel heart-rate formula", () => {
    expect(keytelKcalPerMin(150, 80, 25, "male")).toBeCloseTo(14.45, 1);
  });

  it("returns nothing without any source", () => {
    expect(estimateCardioKcal(base, leo)).toBeNull();
  });

  it("combines machine work, Garmin and machine display with weights 3/2/1", () => {
    const e = estimateCardioKcal({ ...base, kcal: 600, machine_steps: 3600, machine_kcal: 1000 }, leo)!;
    expect(e.sources.map((s) => s.kind)).toEqual(["work", "watch", "machine"]);
    expect(e.kcal).toBe(Math.round((890.4 * 3 + 600 * 2 + 1000) / 6));
  });

  it("prefers steps over floors over level and trusts level less", () => {
    const floors = estimateCardioKcal({ ...base, machine_floors: 225 }, leo)!;
    expect(floors.sources[0]).toMatchObject({ note: "floors", weight: 3 });
    const level = estimateCardioKcal({ ...base, machine_level: 6 }, leo)!;
    expect(level.sources[0]).toMatchObject({ note: "level", weight: 1.5 });
  });

  it("falls back to heart rate when there is no watch value", () => {
    const e = estimateCardioKcal({ ...base, avg_hr: 150 }, leo)!;
    expect(e.sources[0].kind).toBe("heart_rate");
    expect(e.kcal).toBe(Math.round(keytelKcalPerMin(150, 80, 25, "male") * 60));
  });

  it("does not compute stair work for other activities", () => {
    const e = estimateCardioKcal({ ...base, activity: "run", kcal: 500, machine_steps: 3000 }, leo)!;
    expect(e.sources.map((s) => s.kind)).toEqual(["watch"]);
  });

  it("computes age on a date", () => {
    expect(ageOn("2000-11-21", "2026-11-20")).toBe(25);
    expect(ageOn("2000-11-20", "2026-11-20")).toBe(26);
    expect(ageOn(null, "2026-11-20")).toBeNull();
  });
});
