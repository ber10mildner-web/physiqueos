import { describe, expect, it } from "vitest";
import { scheduleFor } from "./schedule";

// 2026-11-23 is a Monday
const data = {
  plans: [
    { id: "push", name: "Push", schedule_days: [1, 4], exercises: [1, 2, 3] },
    { id: "legs", name: "Beine", schedule_days: [2], exercises: [1] },
    { id: "free", name: "Ohne Tage", schedule_days: [], exercises: [] },
  ],
  templates: [{ id: "walk", name: "Incline Walk", duration_min: 30, auto_days: [1, 3], auto_from: "2026-11-01" }],
  workouts: [
    { id: "w1", plan_id: "push", name: "Push", workout_date: "2026-11-23", finished_at: "2026-11-23T18:00:00Z" },
    { id: "w2", plan_id: "free", name: "Ohne Tage", workout_date: "2026-11-23", finished_at: null },
  ],
  cardio: [{ id: "c1", session_date: "2026-11-23", template_id: "walk", activity: "walk", duration_min: 30, notes: "Incline Walk" }],
};

describe("scheduleFor", () => {
  it("lists planned and done items of a day", () => {
    expect(scheduleFor("2026-11-23", data)).toEqual([
      { kind: "plan", id: "push", name: "Push", exercises: 3, status: "done", workoutId: "w1" },
      { kind: "routine", id: "walk", name: "Incline Walk", minutes: 30, status: "done" },
      { kind: "workout", id: "w2", name: "Ohne Tage", status: "active" },
    ]);
  });

  it("shows open plans for tomorrow and nothing on rest days", () => {
    expect(scheduleFor("2026-11-24", data)).toEqual([{ kind: "plan", id: "legs", name: "Beine", exercises: 1, status: "open", workoutId: null }]);
    expect(scheduleFor("2026-11-29", data)).toEqual([]);
  });
});
