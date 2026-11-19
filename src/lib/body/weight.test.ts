import { describe, expect, it } from "vitest";
import { dayNumber, movingAverage, trendChange } from "./weight";

describe("movingAverage", () => {
  it("averages over a trailing 7-day calendar window", () => {
    const pts = [
      { date: "2026-11-01", weight: 80 },
      { date: "2026-11-02", weight: 81 },
      { date: "2026-11-07", weight: 79 },
      { date: "2026-11-08", weight: 78 },
    ];
    const t = movingAverage(pts);
    expect(t[0].average).toBe(80);
    expect(t[2].average).toBeCloseTo(80); // 1st, 2nd, 7th
    expect(t[2].samples).toBe(3);
    // 8th: window 2nd..8th -> 81, 79, 78
    expect(t[3].average).toBeCloseTo(79.333, 3);
    expect(t[3].samples).toBe(3);
  });

  it("sorts unsorted input and does not interpolate gaps", () => {
    const t = movingAverage([
      { date: "2026-12-31", weight: 70 },
      { date: "2026-12-01", weight: 72 },
    ]);
    expect(t.map((p) => p.date)).toEqual(["2026-12-01", "2026-12-31"]);
    expect(t[1].average).toBe(70);
    expect(t[1].samples).toBe(1);
  });

  it("handles month and DST boundaries by calendar day", () => {
    expect(dayNumber("2026-03-30") - dayNumber("2026-03-28")).toBe(2);
    expect(dayNumber("2027-01-01") - dayNumber("2026-12-31")).toBe(1);
  });
});

describe("trendChange", () => {
  it("compares the latest average with the one ~7 days earlier", () => {
    const pts = Array.from({ length: 15 }, (_, i) => ({ date: `2026-11-${String(i + 1).padStart(2, "0")}`, weight: 80 - i * 0.1 }));
    const r = trendChange(movingAverage(pts))!;
    expect(r.from.date).toBe("2026-11-08");
    expect(r.change).toBeCloseTo(-0.7, 5);
  });

  it("returns null without enough history", () => {
    expect(trendChange(movingAverage([{ date: "2026-11-01", weight: 80 }]))).toBeNull();
    expect(trendChange(movingAverage([{ date: "2026-11-01", weight: 80 }, { date: "2026-11-03", weight: 79 }]))).toBeNull();
  });
});
