import { describe, expect, it } from "vitest";
import { claudeLogPrompt } from "@/lib/nutrition/claude-log-prompt";
import { claudeLink } from "@/lib/claude-link";

describe("claudeLogPrompt", () => {
  it("names the date, the user's meal name and the slot key", () => {
    const p = claudeLogPrompt({ date: "2026-11-23", meal: "snack", mealName: "Supplemente", locale: "de" });
    expect(p).toContain("2026-11-23");
    expect(p).toContain("„Supplemente“");
    expect(p).toContain("snack");
    expect(p).toContain("search_foods");
    expect(p).toContain("log_recipe");
  });
  it("has an English version", () => {
    const p = claudeLogPrompt({ date: "2026-11-23", meal: "lunch", mealName: "Lunch", locale: "en" });
    expect(p).toMatch(/^Please log food in Sigma/);
  });
  it("fits in a claude.ai link", () => {
    const url = claudeLink(claudeLogPrompt({ date: "2026-11-23", meal: "post_workout", mealName: "Post-Meal", locale: "de" }));
    expect(url.startsWith("https://claude.ai/new?q=")).toBe(true);
    expect(url.length).toBeLessThan(4000);
  });
});
