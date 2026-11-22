import { describe, expect, it } from "vitest";
import { foodIcon, foodInitial } from "./food-icon";

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
    ["Burger Gurken", "🥒"],
    ["Datteln entsteint", "🌴"],
    ["Zimt, gemahlen", "🧂"],
    ["Electrolyte Powder", "💧"],
    ["Flohsamenschalen", "🌾"],
    ["Cheeseburger", "🍔"],
  ])("%s → %s", (name, icon) => expect(foodIcon(name)).toBe(icon));

  it("gives no picture rather than a wrong one (initial instead), a pot for recipes", () => {
    expect(foodIcon("Xyz")).toBeNull();
    expect(foodInitial("  ägyptisches Brot")).toBe("Ä");
    expect(foodIcon("Omas Spezial", "recipe")).toBe("🥘");
  });
});
