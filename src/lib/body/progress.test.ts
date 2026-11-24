import { describe, expect, it } from "vitest";
import { assessProgress, strengthTrend, waistTrend, type ProgressInput, type StrengthSet } from "./progress";
import { addDays } from "@/lib/dates";

const today = "2026-11-24";

describe("waistTrend", () => {
  it("compares with the oldest measurement of the last 5 weeks", () => {
    const t = waistTrend(
      [
        { date: addDays(today, -60), waist_cm: 95 },
        { date: addDays(today, -28), waist_cm: 88 },
        { date: addDays(today, -14), waist_cm: 87 },
        { date: today, waist_cm: 86 },
      ],
      today,
    )!;
    expect(t).toMatchObject({ latest: 86, change: -2, days: 28, perWeek: -0.5 });
  });
  it("reports a first measurement without change", () => {
    expect(waistTrend([{ date: today, waist_cm: 86 }], today)).toMatchObject({ days: 0, change: 0 });
    expect(waistTrend([], today)).toBeNull();
  });
});

const set = (ex: string, daysAgo: number, weight: number, reps = 8, warm = false): StrengthSet => ({ exercise_id: ex, date: addDays(today, -daysAgo), weight_kg: weight, reps, is_warmup: warm });

describe("strengthTrend", () => {
  it("takes the median change of exercises trained in both periods", () => {
    const t = strengthTrend([set("a", 2, 100), set("a", 20, 100), set("b", 3, 60), set("b", 25, 58), set("c", 5, 40), set("c", 30, 44), set("d", 1, 50)], today)!;
    expect(t.exercises).toBe(3);
    expect(t.changePct).toBeCloseTo(0, 1);
    expect(t.up).toBe(1);
    expect(t.down).toBe(1);
  });
  it("ignores warm-ups and needs two exercises", () => {
    expect(strengthTrend([set("a", 2, 100), set("a", 20, 90), set("b", 2, 200, 8, true), set("b", 20, 60)], today)).toBeNull();
  });
});

const base: ProgressInput = {
  goal: "fat_loss",
  currentKg: 80,
  rateKgWeek: -0.4,
  aimKgWeek: -0.4,
  waist: { latest: 86, latestDate: today, change: -1.5, perWeek: -0.4, days: 28 },
  strength: { changePct: 1, exercises: 4, up: 1, down: 0 },
  protein: { avg: 170, target: 175, days: 7 },
  lastPhotoDate: addDays(today, -6),
  today,
};

describe("assessProgress", () => {
  it("is on track when weight and waist fall and strength holds", () => {
    const p = assessProgress(base);
    expect(p.verdict).toBe("on_track");
    expect(p.signals.every((s) => s.status === "good")).toBe(true);
  });
  it("warns about muscle loss when strength drops in a deficit", () => {
    expect(assessProgress({ ...base, rateKgWeek: -0.9, strength: { changePct: -6, exercises: 4, up: 0, down: 3 } }).verdict).toBe("muscle_risk");
  });
  it("flags a too fast or too slow cut", () => {
    expect(assessProgress({ ...base, rateKgWeek: -0.9 }).verdict).toBe("too_fast");
    expect(assessProgress({ ...base, rateKgWeek: -0.05 }).verdict).toBe("too_slow");
  });
  it("treats a stable weight as the plan in a recomp", () => {
    const p = assessProgress({ ...base, goal: "recomp", rateKgWeek: -0.1, aimKgWeek: -0.16, strength: { changePct: 4, exercises: 3, up: 2, down: 0 } });
    expect(p.signals.find((s) => s.key === "weight")!.msg).toBe("weight_stable");
    expect(p.verdict).toBe("on_track");
  });
  it("asks for data when nothing is measured", () => {
    const p = assessProgress({ ...base, rateKgWeek: null, waist: null, strength: null, protein: null, lastPhotoDate: null });
    expect(p.verdict).toBe("needs_data");
  });
  it("flags low protein", () => {
    expect(assessProgress({ ...base, protein: { avg: 120, target: 175, days: 7 } }).verdict).toBe("mixed");
  });
});
