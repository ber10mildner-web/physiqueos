import { describe, expect, it } from "vitest";
import { autoPair, defaultPose, weightNear } from "./photo-compare";

const photos = [
  { id: "c", taken_on: "2026-11-20", pose: "front" },
  { id: "b", taken_on: "2026-10-01", pose: "side" },
  { id: "a", taken_on: "2026-09-01", pose: "front" },
  { id: "d", taken_on: "2026-10-15", pose: "front" },
];

describe("photo compare", () => {
  it("pairs the oldest and newest photo of a pose", () => {
    expect(autoPair(photos, "front")!.map((p) => p.id)).toEqual(["a", "c"]);
    expect(autoPair(photos, "side")).toBeNull();
  });
  it("picks the pose with the most photos", () => {
    expect(defaultPose(photos)).toBe("front");
    expect(defaultPose([])).toBe("front");
  });
  it("finds the trend weight near a date", () => {
    const trend = [
      { date: "2026-11-17", average: 80 },
      { date: "2026-11-21", average: 79.5 },
    ];
    expect(weightNear(trend, "2026-11-20")).toBe(79.5);
    expect(weightNear(trend, "2026-12-01")).toBeNull();
  });
});
