import { describe, expect, it } from "vitest";
import { QUOTES, quoteOfDay } from "./quotes";
import { addDays } from "./dates";

describe("quote of the day", () => {
  it("has the same number of lines in both languages", () => {
    expect(QUOTES.de.length).toBe(QUOTES.en.length);
  });
  it("shows a different line on each of 40 consecutive days", () => {
    const seen = new Set(Array.from({ length: QUOTES.de.length }, (_, i) => quoteOfDay(addDays("2026-11-20", i), "de")));
    expect(seen.size).toBe(QUOTES.de.length);
  });
});
