import { describe, expect, it } from "vitest";
import { getBasicFood } from "@/lib/food-sources/basic";
import { categorize, matchesFilters, recipeInsights, shortName, type InsightIngredient } from "./insights";
import { getRecipeIdea, ideaIngredients, listRecipeIdeas } from "./catalog";

function basic(id: string, amount_g: number): InsightIngredient {
  const f = getBasicFood(`sr28-${id}`)!;
  return { name: f.name, source_id: f.source_id, amount_g, nutrients_per_100g: f.nutrients };
}

describe("categorize", () => {
  it("uses the USDA group of basic foods", () => {
    expect(categorize({ name: "x", source_id: "sr28-15236" })).toBe("fatty_fish");
    expect(categorize({ name: "x", source_id: "sr28-15015" })).toBe("fish");
    expect(categorize({ name: "x", source_id: "sr28-23557" })).toBe("red_meat");
    expect(categorize({ name: "x", source_id: "sr28-16426" })).toBe("soy");
    expect(categorize({ name: "x", source_id: "sr28-01123" })).toBe("egg");
    expect(categorize({ name: "x", source_id: "sr28-11457" })).toBe("leafy_oxalate");
  });

  it("reads German compound names of branded foods", () => {
    expect(categorize({ name: "Wildlachsfilet", source_id: "123" })).toBe("fatty_fish");
    expect(categorize({ name: "Hähnchenbrustfilet" })).toBe("poultry");
    expect(categorize({ name: "Rinderhackfleisch" })).toBe("red_meat");
    expect(categorize({ name: "Magerquark" })).toBe("dairy");
    expect(categorize({ name: "Erdnussbutter" })).toBe("nut_seed");
    expect(categorize({ name: "Haferdrink" })).toBe("plant_other");
    expect(categorize({ name: "Champignons" })).toBe("vegetable");
    expect(categorize({ name: "Eier Größe M" })).toBe("egg");
    expect(categorize({ name: "Protein Toby" })).toBe("unknown");
  });
});

describe("recipeInsights", () => {
  it("tags a salmon dish for skin and omega-3 and explains carotene + fat", () => {
    const ins = recipeInsights(ideaIngredients(getRecipeIdea("lachs-suesskartoffel-brokkoli")!), null, 1);
    expect(ins.tags).toEqual(expect.arrayContaining(["skin", "omega3"]));
    expect(ins.tags).not.toContain("vegetarian");
    expect(ins.skinFrom).toContain("omega3");
    expect(ins.notes.map((n) => n.key)).toEqual(expect.arrayContaining(["carotene_fat", "omega3_fish"]));
  });

  it("counts meat iron as well absorbed (heme)", () => {
    const ins = recipeInsights([basic("23557", 150), basic("20037", 200)], null, 1);
    expect(ins.tags).toContain("iron");
    expect(ins.notes[0]).toMatchObject({ key: "iron_heme" });
  });

  it("counts plant iron only together with vitamin C", () => {
    const lentils = recipeInsights([basic("16070", 250), basic("20445", 150)], null, 1);
    expect(lentils.tags).not.toContain("iron");
    expect(lentils.notes.map((n) => n.key)).toContain("iron_tip");
    const withPepper = recipeInsights([basic("16070", 250), basic("20445", 150), basic("11821", 150)], null, 1);
    expect(withPepper.tags).toContain("iron");
    expect(withPepper.notes.find((n) => n.key === "iron_vitc")?.vars).toMatchObject({ vitc: "Paprika" });
  });

  it("does not call spinach iron well absorbed (oxalate)", () => {
    const ins = recipeInsights([basic("11457", 300), basic("11821", 150), basic("04053", 5)], null, 1);
    expect(ins.tags).not.toContain("iron");
    expect(ins.notes.map((n) => n.key)).toContain("oxalate_iron");
  });

  it("marks vegan and vegetarian only when every ingredient is known", () => {
    const vegan = recipeInsights([basic("16057", 200), basic("20445", 150)], null, 1);
    expect(vegan.tags).toEqual(expect.arrayContaining(["vegetarian", "vegan"]));
    expect(vegan.notes.map((n) => n.key)).toContain("protein_combo");
    const unknown = recipeInsights([basic("16057", 200), { name: "Protein Toby", amount_g: 100, nutrients_per_100g: { energy_kcal: 200, protein_g: 20, carbs_g: 10, fat_g: 5 } }], null, 1);
    expect(unknown.tags).not.toContain("vegan");
    expect(unknown.tags).not.toContain("vegetarian");
  });

  it("only tags 'light' when servings are known", () => {
    const ings = [basic("05064", 150), basic("11090", 200)];
    expect(recipeInsights(ings, null, 1).tags).toContain("light");
    expect(recipeInsights(ings, null, null).tags).not.toContain("light");
  });

  it("judges micros per 100 kcal, ignoring unknown values", () => {
    const ins = recipeInsights([{ name: "Riegel", amount_g: 50, nutrients_per_100g: { energy_kcal: 400, protein_g: 30, carbs_g: 40, fat_g: 12 } }]);
    expect(ins.richIn).toEqual([]);
    expect(ins.tags).toEqual(["protein"]);
  });

  it("matches filters with AND and 'gaps' against rich nutrients", () => {
    const ins = recipeInsights(ideaIngredients(getRecipeIdea("makrele-kartoffeln-gurke")!), null, 1);
    expect(matchesFilters(ins, ["omega3", "vitamin_d"])).toBe(true);
    expect(matchesFilters(ins, ["omega3", "vegan"])).toBe(false);
    expect(matchesFilters(ins, ["gaps"], ["vitamin_d_ug"])).toBe(true);
    expect(matchesFilters(ins, ["gaps"], ["calcium_mg"])).toBe(false);
    expect(matchesFilters(ins, ["gaps"], [])).toBe(false);
  });
});

describe("recipe ideas", () => {
  it("only use existing basic foods and complete macros", () => {
    const ideas = listRecipeIdeas("de");
    expect(ideas.length).toBeGreaterThanOrEqual(15);
    expect(new Set(ideas.map((i) => i.slug)).size).toBe(ideas.length);
    for (const idea of ideas) {
      const ins = recipeInsights(ideaIngredients(idea), idea.cookedWeightG, idea.servings);
      expect(idea.steps.length, idea.slug).toBeGreaterThan(0);
      // every idea should be findable by at least one non-diet filter
      expect(ins.tags.filter((t) => t !== "vegetarian" && t !== "vegan").length, idea.slug).toBeGreaterThan(0);
    }
    expect(listRecipeIdeas("en")[0].name).not.toBe(ideas[0].name);
  });

  it("estimates the cooked weight from the cooking loss of fish and meat", () => {
    const idea = getRecipeIdea("lachs-suesskartoffel-brokkoli")!;
    expect(idea.cookedWeightG).toBe(595 - 25);
    expect(getRecipeIdea("overnight-oats-beeren")!.cookedWeightG).toBeNull();
  });

  it("shortens names", () => {
    expect(shortName("Paprika, rot, roh")).toBe("Paprika");
    expect(shortName("Hüttenkäse (körniger Frischkäse), fettarm")).toBe("Hüttenkäse");
  });
});
