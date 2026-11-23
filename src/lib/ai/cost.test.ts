import { describe, expect, it } from "vitest";
import { checkBudget, costEur, MAX_CALL_EUR, readLimits } from "./cost";

describe("ai cost", () => {
  it("prices a typical meal photo call around one cent", () => {
    const c = costEur("claude-opus-5-5", { input_tokens: 2500, output_tokens: 600 });
    expect(c).toBeCloseTo(((2500 * 4 + 600 * 20) / 1e6) * 0.95, 6);
    expect(c).toBeLessThan(0.03);
  });

  it("prices unknown models conservatively", () => {
    expect(costEur("claude-something-new", { input_tokens: 1e6, output_tokens: 0 })).toBeCloseTo(5 * 0.95);
  });

  it("stops before the monthly budget would be exceeded", () => {
    const limits = { monthlyBudgetEur: 2, dailyPhotoLimit: 3 };
    expect(checkBudget({ monthEur: 0.5, todayPhotos: 0 }, limits, true)).toEqual({ ok: true });
    expect(checkBudget({ monthEur: 2 - MAX_CALL_EUR / 2, todayPhotos: 0 }, limits, true)).toEqual({ ok: false, reason: "budget" });
    expect(checkBudget({ monthEur: 0, todayPhotos: 3 }, limits, true)).toEqual({ ok: false, reason: "daily_limit" });
    expect(checkBudget({ monthEur: 0, todayPhotos: 3 }, limits, false)).toEqual({ ok: true });
  });

  it("reads limits from the environment", () => {
    expect(readLimits({})).toEqual({ monthlyBudgetEur: 2, dailyPhotoLimit: 15 });
    expect(readLimits({ AI_MONTHLY_BUDGET_EUR: "5", AI_DAILY_PHOTO_LIMIT: "x" })).toEqual({ monthlyBudgetEur: 5, dailyPhotoLimit: 15 });
  });
});
