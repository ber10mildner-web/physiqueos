/**
 * Mapper tests. The fixtures follow the documented response shapes of
 * Open Food Facts API v2 and USDA FoodData Central v1; the numbers are
 * synthetic test values, not real product data.
 */
import { describe, expect, it } from "vitest";
import { mapOffNutriments, mapOffProduct } from "./openfoodfacts";
import { mapUsdaFood, mapUsdaNutrients } from "./usda";
import { sanitizeNutrients, unitFactor } from "@/lib/nutrition/nutrients";

describe("unitFactor", () => {
  it("converts mass units", () => {
    expect(unitFactor("g", "mg")).toBe(1000);
    expect(unitFactor("mg", "µg")).toBe(1000);
    expect(unitFactor("UG", "µg")).toBe(1);
    expect(unitFactor("mcg", "mg")).toBe(0.001);
    expect(unitFactor("kcal", "kcal")).toBe(1);
    expect(unitFactor("kJ", "kcal")).toBeNull();
    expect(unitFactor("IU", "µg")).toBeNull();
  });
});

describe("Open Food Facts mapping", () => {
  const product = {
    code: "4000000000000",
    product_name: "Test Haferflocken",
    product_name_de: "Test Haferflocken zart",
    brands: "TestMarke, Andere",
    serving_quantity: 40,
    serving_quantity_unit: "g",
    image_front_small_url: "https://images.openfoodfacts.org/x.jpg",
    nutriments: {
      "energy-kcal_100g": 370,
      "energy-kj_100g": 1548,
      proteins_100g: 13.5,
      carbohydrates_100g: 58.7,
      fat_100g: 7,
      fiber_100g: 10,
      sugars_100g: "0.7",
      "saturated-fat_100g": 1.3,
      salt_100g: 0.01,
      sodium_100g: 0.004,
      magnesium_100g: 0.13,
      iron_100g: 0.0042,
      "vitamin-b1_100g": 0.0005,
      "vitamin-d_100g": 0.000002,
      "vitamin-c_unit": "mg",
    },
  };

  it("maps product fields and prefers the German name", () => {
    const f = mapOffProduct(product)!;
    expect(f.source).toBe("openfoodfacts");
    expect(f.source_id).toBe("4000000000000");
    expect(f.barcode).toBe("4000000000000");
    expect(f.source_url).toBe("https://world.openfoodfacts.org/product/4000000000000");
    expect(f.name).toBe("Test Haferflocken zart");
    expect(f.brand).toBe("TestMarke");
    expect(f.serving_size_g).toBe(40);
  });

  it("converts gram-based _100g values into the canonical units", () => {
    const n = mapOffNutriments(product.nutriments);
    expect(n.energy_kcal).toBe(370);
    expect(n.sugar_g).toBe(0.7);
    expect(n.sodium_mg).toBeCloseTo(4);
    expect(n.magnesium_mg).toBeCloseTo(130);
    expect(n.iron_mg).toBeCloseTo(4.2);
    expect(n.vitamin_b1_mg).toBeCloseTo(0.5);
    expect(n.vitamin_d_ug).toBeCloseTo(2);
  });

  it("leaves missing nutrients out (unknown, not zero)", () => {
    const n = mapOffNutriments(product.nutriments);
    expect(n.vitamin_c_mg).toBeUndefined();
    expect(n.calcium_mg).toBeUndefined();
  });

  it("falls back to kJ when kcal is missing", () => {
    expect(mapOffNutriments({ "energy-kj_100g": 418.4 }).energy_kcal).toBeCloseTo(100);
  });

  it("ignores negative and non-numeric values", () => {
    expect(mapOffNutriments({ fat_100g: -1, proteins_100g: "abc" })).toEqual({});
  });

  it("returns null without a name or code", () => {
    expect(mapOffProduct({ code: "123456789", nutriments: {} })).toBeNull();
    expect(mapOffProduct({ product_name: "x" })).toBeNull();
  });

  it("uses the English name for the English UI", () => {
    expect(mapOffProduct({ ...product, product_name_en: "Test oats" }, undefined, "en")!.name).toBe("Test oats");
  });
});

describe("USDA FoodData Central mapping", () => {
  it("maps flat /foods/search nutrients by nutrient number with unit conversion", () => {
    const n = mapUsdaNutrients([
      { nutrientNumber: "208", unitName: "KCAL", value: 52 },
      { nutrientNumber: "203", unitName: "G", value: 0.26 },
      { nutrientNumber: "204", unitName: "G", value: 0.17 },
      { nutrientNumber: "205", unitName: "G", value: 13.8 },
      { nutrientNumber: "291", unitName: "G", value: 2.4 },
      { nutrientNumber: "401", unitName: "MG", value: 4.6 },
      { nutrientNumber: "320", unitName: "UG", value: 3 },
      { nutrientNumber: "268", unitName: "kJ", value: 218 },
    ]);
    expect(n).toMatchObject({ energy_kcal: 52, protein_g: 0.26, fat_g: 0.17, carbs_g: 13.8, fiber_g: 2.4, vitamin_c_mg: 4.6, vitamin_a_ug: 3 });
    expect(n.vitamin_d_ug).toBeUndefined();
  });

  it("maps nested /food/{id} nutrients and Atwater energy fallback", () => {
    const n = mapUsdaNutrients([
      { nutrient: { number: "958", unitName: "kcal" }, amount: 120 },
      { nutrient: { number: "203", unitName: "g" }, amount: 5 },
      { nutrient: { number: "307", unitName: "mg" }, amount: 300 },
    ]);
    expect(n).toEqual({ energy_kcal: 120, protein_g: 5, sodium_mg: 300 });
  });

  it("prefers 208 over Atwater values when both exist", () => {
    const n = mapUsdaNutrients([
      { nutrientNumber: "957", unitName: "KCAL", value: 99 },
      { nutrientNumber: "208", unitName: "KCAL", value: 100 },
    ]);
    expect(n.energy_kcal).toBe(100);
  });

  it("keeps source and id", () => {
    const f = mapUsdaFood({ fdcId: 171688, description: "Apples, raw, with skin", dataType: "SR Legacy", foodNutrients: [] });
    expect(f).toMatchObject({ source: "usda", source_id: "171688", name: "Apples, raw, with skin", barcode: null });
    expect(f.source_url).toContain("171688");
  });
});

describe("sanitizeNutrients", () => {
  it("keeps only known, finite, non-negative values", () => {
    expect(sanitizeNutrients({ energy_kcal: "120", protein_g: -1, bogus: 5, fat_g: Infinity, fiber_g: 0 })).toEqual({ energy_kcal: 120, fiber_g: 0 });
    expect(sanitizeNutrients(null)).toEqual({});
  });
});

describe("offGet retry", () => {
  it("retries once on server errors and network failures, not on 404 or 429", async () => {
    const { offGet } = await import("./openfoodfacts");
    const ok = new Response("{}", { status: 200 });
    let calls = 0;
    const flaky = (async () => (++calls === 1 ? new Response("", { status: 503 }) : ok)) as unknown as typeof fetch;
    expect((await offGet("https://x", 1000, 0, flaky)).status).toBe(200);
    expect(calls).toBe(2);

    calls = 0;
    const offline = (async () => {
      calls++;
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;
    await expect(offGet("https://x", 1000, 0, offline)).rejects.toThrow("fetch failed");
    expect(calls).toBe(2);

    calls = 0;
    const limited = (async () => {
      calls++;
      return new Response("", { status: 429 });
    }) as unknown as typeof fetch;
    await expect(offGet("https://x", 1000, 0, limited)).rejects.toThrow("HTTP 429");
    expect(calls).toBe(1);

    const missing = (async () => new Response("", { status: 404 })) as unknown as typeof fetch;
    expect((await offGet("https://x", 1000, 0, missing)).status).toBe(404);
  });
});
