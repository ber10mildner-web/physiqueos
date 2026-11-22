import { describe, expect, it } from "vitest";
import { addDays, isIsoDate, startOfWeek, todayIn, weekdayOf } from "./dates";

describe("dates", () => {
  it("validates ISO dates strictly", () => {
    expect(isIsoDate("2026-02-28")).toBe(true);
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("2026-2-3")).toBe(false);
    expect(isIsoDate(null)).toBe(false);
  });

  it("adds days across month and year boundaries", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("computes today in the user's time zone", () => {
    const instant = new Date("2026-11-19T23:30:00Z");
    expect(todayIn("Europe/Berlin", instant)).toBe("2026-11-20");
    expect(todayIn("America/New_York", instant)).toBe("2026-11-19");
    expect(todayIn("Not/AZone", instant)).toBe("2026-11-20"); // falls back to Europe/Berlin
  });
});

describe("weeks", () => {
  it("weekdayOf and startOfWeek use Monday as first day", () => {
    expect(weekdayOf("2026-11-22")).toBe(7);
    expect(weekdayOf("2026-11-23")).toBe(1);
    expect(startOfWeek("2026-11-22")).toBe("2026-11-16");
    expect(startOfWeek("2026-11-23")).toBe("2026-11-23");
  });
});
