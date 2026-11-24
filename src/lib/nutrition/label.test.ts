import { describe, expect, it } from "vitest";
import { labelToFood, type LabelReading } from "./label";

const base: LabelReading = { readable: true, name: "Bauernbrot", brand: "Bäckerei Test", basis: "per_100g", serving_g: 50, energy_kj: 1000, values: {} };

describe("labelToFood", () => {
  it("takes per-100 g values as printed and leaves missing ones unknown", () => {
    const r = labelToFood({ ...base, values: { energy_kcal: 239, protein_g: 8.1, carbs_g: 45, fat_g: 1.6, fiber_g: null, salt_g: 1.2 } });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.scaledFromServing).toBe(false);
    expect(r.food).toMatchObject({ name: "Bauernbrot", brand: "Bäckerei Test", serving_size_g: 50 });
    expect(r.food.nutrients).toEqual({ energy_kcal: 239, protein_g: 8.1, carbs_g: 45, fat_g: 1.6, salt_g: 1.2, sodium_mg: 480 });
    expect(r.food.nutrients).not.toHaveProperty("fiber_g");
  });

  it("converts kJ when kcal is missing", () => {
    const r = labelToFood({ ...base, values: { protein_g: 8 } });
    expect(r.ok && r.food.nutrients?.energy_kcal).toBeCloseTo(239.006, 2);
  });

  it("scales a per-portion-only label to 100 g", () => {
    const r = labelToFood({ ...base, basis: "per_serving", serving_g: 40, energy_kj: null, values: { energy_kcal: 150, protein_g: 5, sodium_mg: 200 } });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.scaledFromServing).toBe(true);
    expect(r.food.nutrients).toMatchObject({ energy_kcal: 375, protein_g: 12.5, sodium_mg: 500, salt_g: 1.25 });
  });

  it("refuses per-portion values without a portion size and unreadable photos", () => {
    expect(labelToFood({ ...base, basis: "per_serving", serving_g: null, values: { energy_kcal: 150 } })).toEqual({ ok: false, reason: "no_serving" });
    expect(labelToFood({ ...base, readable: false })).toEqual({ ok: false, reason: "unreadable" });
    expect(labelToFood({ ...base, energy_kj: null, values: {} })).toEqual({ ok: false, reason: "unreadable" });
  });

  it("drops negative numbers", () => {
    const r = labelToFood({ ...base, values: { energy_kcal: 100, fat_g: -1 } });
    expect(r.ok && r.food.nutrients).not.toHaveProperty("fat_g");
  });
});
