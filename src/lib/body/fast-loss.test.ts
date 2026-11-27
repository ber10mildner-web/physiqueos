import { describe, expect, it } from "vitest";
import { fastLoss } from "./fast-loss";
import { weightRate } from "./forecast";
import { addDays } from "@/lib/dates";
import type { WeightPoint } from "./weight";

const today = "2026-11-27";
/** Daily weigh-ins for `days` days ending today, changing by `perDay` (kg). */
const series = (days: number, endKg: number, perDay: number): WeightPoint[] =>
  Array.from({ length: days }, (_, i) => ({ date: addDays(today, -i), weight: endKg - perDay * i }));

const run = (points: WeightPoint[], wanted: number | null) => {
  const rate = weightRate(points, today);
  return fastLoss({ points, today, rate, currentKg: rate?.fittedNow ?? null, wantedKgPerWeek: wanted });
};

describe("fastLoss", () => {
  it("warns above 1 % of body weight per week, whatever the plan", () => {
    const w = run(series(28, 80, -0.13), -1.0)!; // ≈ −0.91 kg/week ≈ 1.1 %
    expect(w.level).toBe("high");
    expect(w.pctPerWeek).toBeGreaterThanOrEqual(1);
    // the plan (1 kg/week) is itself too fast, so it points to the safe 0.7 % pace
    expect(w.extraKcal).toBeGreaterThan(0);
  });

  it("warns when clearly faster than planned", () => {
    const w = run(series(28, 80, -0.1), -0.4)!; // −0.7 kg/week vs. −0.4 planned
    expect(w.level).toBe("faster");
    expect(w.plannedKgPerWeek).toBe(-0.4);
    // (0.7 − 0.4) × 7700 / 7 ≈ 330 → 350
    expect(w.extraKcal).toBe(350);
  });

  it("stays quiet on plan, when gaining, or without a loss plan below 1 %", () => {
    expect(run(series(28, 80, -0.07), -0.5)).toBeNull();
    expect(run(series(28, 80, 0.05), 0.2)).toBeNull();
    expect(run(series(28, 80, -0.1), null)).toBeNull();
    expect(run(series(28, 80, -0.1), 0)).toBeNull();
  });

  it("ignores tiny absolute differences", () => {
    // −0.21 vs. −0.1 planned: ratio > 1.5 but only 0.11 kg/week apart
    expect(run(series(28, 80, -0.03), -0.1)).toBeNull();
  });

  it("needs at least 14 days of trend (first-week water loss)", () => {
    expect(run(series(12, 80, -0.3), -0.5)).toBeNull();
  });

  it("stops warning once the last two weeks have slowed down", () => {
    // fast first two weeks, then flat
    const pts = Array.from({ length: 28 }, (_, i) => ({ date: addDays(today, -i), weight: i < 14 ? 80 : 80 + 0.2 * (i - 13) }));
    expect(weightRate(pts, today)!.kgPerWeek).toBeLessThan(-0.7); // the 4-week line alone would warn
    expect(run(pts, -0.4)).toBeNull();
  });
});
