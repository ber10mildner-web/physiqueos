import { describe, expect, it } from "vitest";
import { appendNote } from "./day-notes";

describe("appendNote", () => {
  it("keeps the existing note and adds a new line", () => {
    expect(appendNote("Krampf im Arm", "Kalium genommen")).toBe("Krampf im Arm\nKalium genommen");
  });
  it("handles empty sides and duplicates", () => {
    expect(appendNote(null, " Kalium ")).toBe("Kalium");
    expect(appendNote("Kalium", "")).toBe("Kalium");
    expect(appendNote(null, null)).toBeNull();
    expect(appendNote("Krampf im Arm, Kalium", "Kalium")).toBe("Krampf im Arm, Kalium");
  });
});
