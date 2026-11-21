import { describe, expect, it } from "vitest";
import { allBasicFoods, BASIC_FOOD_COUNT, getBasicFood, normalize, searchBasic } from "./basic";
import { hasRequiredNutrients } from "@/lib/nutrition/nutrients";

const first = (q: string) => searchBasic(q)[0]?.name;

describe("basic foods", () => {
  it("has a few hundred foods, all loggable", () => {
    expect(BASIC_FOOD_COUNT).toBeGreaterThan(200);
    for (const f of allBasicFoods()) expect(hasRequiredNutrients(f.nutrients)).toBe(true);
  });

  it("normalizes umlauts and punctuation", () => {
    expect(normalize("Äpfel, roh (mit Schale)")).toBe("aepfel roh mit schale");
    expect(normalize("Grieß")).toBe("griess");
  });

  it("finds the raw whole food first", () => {
    expect(first("Apfel")).toBe("Apfel, roh (mit Schale)");
    expect(first("äpfel")).toBe("Apfel, roh (mit Schale)");
    expect(first("Banane")).toBe("Banane, roh");
    expect(first("Kiwi")).toBe("Kiwi, grün, roh");
    expect(first("Zwiebeln")).toBe("Zwiebel, roh");
    expect(first("Möhre")).toBe("Karotte, roh");
    expect(first("Ei")).toBe("Ei, roh (Vollei)");
    expect(first("Reis")).toBe("Reis, weiß, roh");
    expect(first("reis gekocht")).toBe("Reis, weiß, gekocht");
    expect(first("Hähnchen")).toBe("Hähnchenbrust, roh");
  });

  it("matches English names and plural forms", () => {
    expect(first("apple")).toBe("Apfel, roh (mit Schale)");
    expect(first("Tomaten")).toBe("Tomate, roh");
    expect(searchBasic("apple", "en")[0]?.name).toBe("Apple, raw, with skin");
  });

  it("returns nothing for unrelated or too short queries", () => {
    expect(searchBasic("x")).toEqual([]);
    expect(searchBasic("Nutella")).toEqual([]);
  });

  it("carries fibre, vitamins and a portion size", () => {
    const kiwi = searchBasic("Kiwi")[0];
    expect(kiwi.source).toBe("usda");
    expect(kiwi.source_id).toBe("sr28-09148");
    expect(kiwi.nutrients.fiber_g).toBe(3);
    expect(kiwi.nutrients.vitamin_c_mg).toBeGreaterThan(80);
    expect(kiwi.serving_size_g).toBe(75);
  });

  it("looks foods up by source_id", () => {
    expect(getBasicFood("sr28-09040")?.name).toBe("Banane, roh");
    expect(getBasicFood("sr28-00000")).toBeNull();
    expect(getBasicFood("171688")).toBeNull();
  });
});
