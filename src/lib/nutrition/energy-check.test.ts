import { describe, expect, it } from "vitest";
import { energyMismatch } from "./energy-check";

describe("energy check", () => {
  it("flags the REWE Bio red onion from Open Food Facts (326 kcal)", () => {
    expect(energyMismatch({ energy_kcal: 326, protein_g: 1, carbs_g: 4.9, fat_g: 0.1, fiber_g: 1.4 })).toEqual({ stated: 326, fromMacros: 27 });
  });

  it("accepts normal foods", () => {
    expect(energyMismatch({ energy_kcal: 372, protein_g: 13.5, carbs_g: 58.7, fat_g: 7, fiber_g: 10 })).toBeNull(); // oats
    expect(energyMismatch({ energy_kcal: 62, protein_g: 11, carbs_g: 4, fat_g: 0.2 })).toBeNull(); // skyr
    expect(energyMismatch({ energy_kcal: 884, protein_g: 0, carbs_g: 0, fat_g: 100 })).toBeNull(); // oil
    expect(energyMismatch({ energy_kcal: 15, protein_g: 0.7, carbs_g: 3.6, fat_g: 0.1 })).toBeNull(); // cucumber
    expect(energyMismatch({ energy_kcal: 43, protein_g: 0.5, carbs_g: 3.1, fat_g: 0 })).toBeNull(); // beer: alcohol, but small
  });

  it("flags kJ typed into the kcal field", () => {
    expect(energyMismatch({ energy_kcal: 1490, protein_g: 7, carbs_g: 75, fat_g: 1.5 })).not.toBeNull();
  });

  it("needs all three macros", () => {
    expect(energyMismatch({ energy_kcal: 326, carbs_g: 4.9 })).toBeNull();
  });
});
