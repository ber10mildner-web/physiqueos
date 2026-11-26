import { describe, expect, it } from "vitest";
import { cyclePhase, isDue, type MedicationSchedule } from "./medication-schedule";

const base: MedicationSchedule = { auto_days: [], every_days: null, cycle_on_days: null, cycle_off_days: null, schedule_start: "2026-11-01" };

describe("medication schedule", () => {
  // 2026-11-21 is a Saturday
  it("weekdays", () => {
    const s = { ...base, auto_days: [6] };
    expect(isDue(s, "2026-11-21")).toBe(true);
    expect(isDue(s, "2026-11-22")).toBe(false);
    expect(isDue({ ...s, schedule_start: "2026-11-22" }, "2026-11-21")).toBe(false);
  });

  it("every second day from the start day", () => {
    const s = { ...base, every_days: 2 };
    expect(isDue(s, "2026-11-01")).toBe(true);
    expect(isDue(s, "2026-11-02")).toBe(false);
    expect(isDue(s, "2026-11-03")).toBe(true);
    expect(isDue(s, "2026-12-01")).toBe(true); // 30 days later
    expect(isDue(s, "2026-10-30")).toBe(false); // before start
  });

  it("3 weeks on, 1 week off (daily)", () => {
    const s = { ...base, auto_days: [1, 2, 3, 4, 5, 6, 7], cycle_on_days: 21, cycle_off_days: 7 };
    expect(isDue(s, "2026-11-01")).toBe(true);
    expect(isDue(s, "2026-11-21")).toBe(true); // day 21
    expect(isDue(s, "2026-11-22")).toBe(false); // pause starts
    expect(isDue(s, "2026-11-28")).toBe(false);
    expect(isDue(s, "2026-11-29")).toBe(true); // next cycle
    expect(cyclePhase(s, "2026-11-22")).toEqual({ pause: true, daysLeft: 7 });
    expect(cyclePhase(s, "2026-11-20")).toEqual({ pause: false, daysLeft: 2 });
  });

  it("cycle combined with every second day", () => {
    const s = { ...base, every_days: 2, cycle_on_days: 14, cycle_off_days: 14 };
    expect(isDue(s, "2026-11-13")).toBe(true);
    expect(isDue(s, "2026-11-15")).toBe(false); // pause
    expect(isDue(s, "2026-11-29")).toBe(true);
  });

  it("nothing scheduled", () => {
    expect(isDue(base, "2026-11-21")).toBe(false);
    expect(isDue({ ...base, cycle_on_days: 21, cycle_off_days: 7 }, "2026-11-02")).toBe(false);
  });
});
