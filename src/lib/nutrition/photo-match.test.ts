import { describe, expect, it } from "vitest";
import type { FoodCandidate } from "@/lib/food-sources/types";
import { pickMatch } from "./photo-match";

const food = (name: string, source: FoodCandidate["source"], source_id: string | null, complete = true): FoodCandidate => ({
  source,
  source_id,
  source_url: null,
  name,
  brand: null,
  barcode: null,
  serving_size_g: null,
  image_url: null,
  nutrients: complete ? { energy_kcal: 100, protein_g: 1, carbs_g: 1, fat_g: 1 } : { energy_kcal: 100 },
});

describe("pickMatch", () => {
  const hits = {
    mine: [food("Zwiebelbaguette", "openfoodfacts", "123")],
    basic: [food("Zwiebel, roh", "usda", "sr28-11282")],
    openfoodfacts: [food("Zwiebeln Bio", "openfoodfacts", "456", false)],
    usda: [food("Onions, raw", "usda", "1103")],
  };

  it("prefers basic foods for whole foods", () => {
    const r = pickMatch(false, hits);
    expect(r.match?.name).toBe("Zwiebel, roh");
    expect(r.alternatives.map((f) => f.name)).toEqual(["Zwiebelbaguette", "Onions, raw"]);
  });

  it("prefers the own library and Open Food Facts for branded products, skipping incomplete ones", () => {
    const r = pickMatch(true, hits);
    expect(r.match?.name).toBe("Zwiebelbaguette");
    expect(r.alternatives.map((f) => f.name)).not.toContain("Zwiebeln Bio");
  });

  it("de-duplicates a basic food that is also in the library", () => {
    const r = pickMatch(false, { ...hits, mine: [{ ...food("Zwiebel, roh", "usda", "sr28-11282"), id: "x" }] });
    expect(r.alternatives.filter((f) => f.name === "Zwiebel, roh")).toHaveLength(0);
  });

  it("returns null when nothing usable was found", () => {
    expect(pickMatch(false, { mine: [], basic: [], openfoodfacts: [], usda: [] }).match).toBeNull();
  });
});
