import { describe, expect, it } from "vitest";
import { forecastLine, goalEta, wantedRate, weightRate } from "./forecast";
import { addDays } from "@/lib/dates";

const series = (end: string, days: number, start: number, perDay: number, every = 1) =>
  Array.from({ length: Math.floor(days / every) }, (_, i) => ({ date: addDays(end, -i * every), weight: start + perDay * (days - i * every) }));

describe("weightRate", () => {
  it("fits a straight line through the weigh-ins", () => {
    const r = weightRate(series("2026-11-22", 28, 80, -0.1), "2026-11-22")!;
    expect(r.kgPerWeek).toBeCloseTo(-0.7, 5);
    expect(r.samples).toBe(28);
  });
  it("needs enough weigh-ins over enough days", () => {
    expect(weightRate(series("2026-11-22", 4, 80, 0), "2026-11-22")).toBeNull();
    expect(weightRate([1, 2, 3, 4, 5, 6].map((i) => ({ date: addDays("2026-11-22", -i), weight: 80 })), "2026-11-22")).toBeNull();
  });
  it("is robust against one heavy day", () => {
    const pts = series("2026-11-22", 21, 80, 0);
    pts[3] = { ...pts[3], weight: 82 };
    expect(Math.abs(weightRate(pts, "2026-11-22")!.kgPerWeek)).toBeLessThan(0.15);
  });
});

describe("goalEta", () => {
  it("computes the date the goal is reached", () => {
    expect(goalEta(80, 78, -0.5, "2026-11-23")).toEqual({ kind: "on_track", date: "2026-12-21", days: 28, weeks: 4 });
  });
  it("handles reached, flat and wrong direction", () => {
    expect(goalEta(78.2, 78, -0.5, "2026-11-23").kind).toBe("reached");
    expect(goalEta(80, 78, -0.01, "2026-11-23").kind).toBe("flat");
    expect(goalEta(80, 78, 0.3, "2026-11-23").kind).toBe("wrong_direction");
    expect(goalEta(80, 60, -0.1, "2026-11-23").kind).toBe("too_far");
  });
});

describe("wantedRate / forecastLine", () => {
  it("signs the pace towards the goal", () => {
    expect(wantedRate(80, 75, 0.5)).toBe(-0.5);
    expect(wantedRate(70, 75, 0.25)).toBe(0.25);
    expect(wantedRate(75.1, 75, 0.5)).toBe(0);
    expect(wantedRate(80, null, 0.5)).toBeNull();
  });
  it("stops the forecast line at the goal", () => {
    const line = forecastLine({ kgPerWeek: -0.7, fittedNow: 80, samples: 20, spanDays: 27 }, 79, "2026-11-23");
    expect(line[1].date).toBe("2026-12-03");
    expect(line[1].weight).toBeCloseTo(79, 1);
  });
});
