import { describe, expect, it } from "vitest";
import { DEFAULT_FOOD_ICON, foodIcon } from "./food-icon";

describe("foodIcon", () => {
  it.each([
    ["Haferflocken", "🌾"],
    ["Oats (raw weight)", "🌾"],
    ["Erdnussbutter", "🥜"],
    ["Butter", "🧈"],
    ["Reiswaffeln", "🍘"],
    ["Basmati Reis", "🍚"],
    ["Preiselbeeren", "🍓"],
    ["Skyr Natur", "🥣"],
    ["Whey Protein Vanille", "🥤"],
    ["Hähnchenbrust", "🍗"],
    ["Champignons", "🍄"],
    ["Apfel", "🍎"],
    ["Walnüsse", "🌰"],
    ["Chili con Carne", "🍲"],
    ["Eier", "🥚"],
    ["Omega 3 Kapseln", "💊"],
  ])("%s → %s", (name, icon) => expect(foodIcon(name)).toBe(icon));

  it("falls back to a plate, or a pot for recipes", () => {
    expect(foodIcon("Xyz")).toBe(DEFAULT_FOOD_ICON);
    expect(foodIcon("Omas Spezial", "recipe")).toBe("🥘");
  });
});
