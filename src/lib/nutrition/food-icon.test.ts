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
    // mismatches found in the audit (2026-11-25)
    ["Heidelbeeren, roh", "🫐"],
    ["Brombeeren", "🫐"],
    ["Erdbeeren", "🍓"],
    ["Grapefruit, roh", "🍊"],
    ["Honigmelone", "🍈"],
    ["Wassermelone", "🍉"],
    ["Weißkohl, roh", "🥦"],
    ["Weiße Bohnen, gekocht", "🫘"],
    ["Eigelb", "🥚"],
    ["Mangold", "🥬"],
    ["Rucola", "🥬"],
    ["Coca-Cola Zero", "🧃"],
    ["Butternut-Kürbis", "🎃"],
    ["Kürbiskerne", "🌱"],
    ["Erdnussbutter / Erdnussmus, ohne Salz", "🥜"],
    ["Erdnüsse, geröstet", "🥜"],
    ["Kokosnuss, Fruchtfleisch", "🥥"],
    ["Mango Fruchtfleisch", "🥭"],
    ["Tofu, natur", "🫘"],
    ["Haferdrink", "🥛"],
    ["Knoblauch", "🧅"],
    ["Schnittlauch", "🌿"],
    ["Kräuterquark", "🥣"],
    ["Pfeffersalami", "🥩"],
    ["Pfefferminztee", "🍵"],
    ["Rosinen", "🍇"],
    ["Quinoa, gekocht", "🌾"],
  ])("%s → %s", (name, icon) => expect(foodIcon(name)).toBe(icon));

  it("gives no picture rather than a wrong one (initial instead), a pot for recipes", () => {
    expect(foodIcon("Xyz")).toBeNull();
    expect(foodIcon("Granatapfel")).toBeNull();
    expect(foodIcon("Maracuja (Passionsfrucht)")).toBeNull();
    expect(foodIcon("Pflaume, roh")).toBeNull();
    expect(foodIcon("Feigen, getrocknet")).toBeNull();
    expect(foodInitial("  ägyptisches Brot")).toBe("Ä");
    expect(foodIcon("Omas Spezial", "recipe")).toBe("🥘");
  });
});
