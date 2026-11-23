import "server-only";
/**
 * Recognises a meal from a photo (plus optional recipe and deviations) with the
 * Claude API. The model ONLY names ingredients and their raw amounts; it never
 * estimates nutrient values. Sigma looks every ingredient up in its own food
 * database (photo-match.ts) and the user confirms the list before anything is saved.
 */
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { DISH_TYPES } from "@/lib/nutrition/cooking";
import type { TokenUsage } from "./cost";

const Ingredient = z.object({
  name: z.string().describe("German name as specific as known, e.g. 'Hackfleisch gemischt', 'Gouda gerieben', 'Olivenöl'"),
  search: z.string().describe("Short generic German search term for a food database (1-3 words), e.g. 'Hackfleisch gemischt', 'Gouda', 'Olivenöl', 'Nudeln roh', 'Reis gekocht', 'Wasser'"),
  search_en: z.string().describe("Same food in English for the USDA database, e.g. 'ground beef and pork', 'gouda cheese'"),
  branded: z.boolean().describe("true for packaged/processed products with varying recipes (Pesto, Fertigsoße, Wurst, Brot, Käse-Marke); false for whole/basic foods"),
  amount_g: z.number().describe("Raw amount in grams as it goes into the dish"),
  cooks: z.boolean().describe("true if it is heated in the dish and loses water (meat, fish, vegetables, sauces, cooking liquid). false for fats/oils, sugar, salt, dry pasta/rice/grains, water absorbed by pasta/rice, already cooked components and anything added after cooking"),
  from: z.enum(["recipe", "deviation", "photo"]).describe("recipe = amount from the given recipe, deviation = changed/added because of the user's notes, photo = estimated from the photo"),
});

const MealAnalysis = z.object({
  readable: z.boolean().describe("false if neither a meal nor a recipe can be recognised"),
  dish_name: z.string().describe("Short German name of the dish, e.g. 'Nudelauflauf mit Brokkoli'"),
  dish_type: z.enum(DISH_TYPES).describe("bake = Auflauf/Lasagne/Gratin, pan = Pfannengericht, roast = gebratenes/gegrilltes Fleisch/Ofengemüse, stew = Eintopf/Suppe/Curry/Chili, sauce = Soße, grain = Risotto/Reis-/Nudelgericht, baked_goods = Kuchen/Brot/Pizza, raw = Salat/Bowl/Müsli/belegtes Brot, other"),
  basis: z.enum(["recipe", "portion"]).describe("recipe = amounts are for the whole recipe, portion = amounts are an estimate for the plate in the photo"),
  ingredients: z.array(Ingredient),
  assumptions: z.array(z.string()).describe("Up to 4 short German notes on what you assumed (e.g. '2 EL Öl zum Anbraten angenommen', '1 Ei weniger laut Notiz'). Empty if nothing notable."),
});
export type MealAnalysis = z.infer<typeof MealAnalysis>;
export type AnalysedIngredient = MealAnalysis["ingredients"][number];

const SYSTEM = `You help log home-cooked meals in a nutrition tracker. You identify the ingredients of a dish and their raw amounts in grams. You never state calories or nutrient values: the app looks every ingredient up in its database.

Rules:
- If a recipe is given (photo or text, often a Thermomix/Cookidoo screenshot), take the ingredients and amounts from it for the whole recipe (basis "recipe"). Apply the user's deviations (e.g. "ein Ei weniger", "mit Sahne statt Milch", "doppelt Käse") to the amounts and mark changed items from "deviation". Use the photo of the meal only to check the recipe.
- Without a recipe, estimate a realistic home-style recipe for the plate in the photo (basis "portion"): the eaten weight the user gives is the plate's weight after cooking. Only the proportions matter, so estimate carefully which share of the plate is meat, carbs, vegetables, sauce and cheese.
- Do not underestimate hidden calories: always include cooking fat for fried, pan or roasted dishes (typically 1-2 EL Öl or Butter per 2 portions), cream/cheese/butter in sauces, dressings and toppings. When unsure between two amounts of a calorie-dense ingredient, take the higher one.
- Convert units to grams: 1 EL Öl ≈ 10 g, 1 EL Butter ≈ 15 g, 1 TL ≈ 4 g, 1 Ei ≈ 55 g (without shell), 1 Zwiebel ≈ 100 g, 1 Knoblauchzehe ≈ 4 g, 1 Dose Tomaten ≈ 400 g, 1 Becher Sahne ≈ 200 g, 1 Prise ≈ 0 (leave out). Leave out salt, pepper and dried herbs below 5 g.
- List ingredients raw, as they go into the pot ("Hähnchenbrust roh", "Kartoffeln roh"). Exception: a plain side that was clearly cooked separately and is estimated from the photo may be listed cooked ("Reis gekocht", "Nudeln gekocht", "Salzkartoffeln") with cooks = false.
- Pasta, rice or grains given dry in a recipe and cooked in water that is drained: list the dry amount ("Nudeln roh", cooks = false) and add the water they absorb as a separate ingredient "Wasser" (search "Wasser", cooks = false): pasta ≈ 1.2 × dry weight, rice ≈ 1.5 × dry weight. Water or broth that is part of the recipe (e.g. Thermomix "200 g Wasser") is listed as given with cooks = true.
- search must be a plain generic term a German food database knows; name can be more specific.`;

export interface MealPhotoInput {
  foodPhoto: Buffer | null;
  recipePhotos: Buffer[];
  recipeText: string;
  notes: string;
  eatenG: number | null;
}

export const MEAL_PHOTO_MODEL = () => process.env.ANTHROPIC_MODEL || "claude-opus-5-5";

export async function analyseMealPhoto(input: MealPhotoInput): Promise<{ analysis: MealAnalysis | null; model: string; usage: TokenUsage }> {
  const client = new Anthropic();
  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  const image = (b: Buffer): Anthropic.Beta.BetaContentBlockParam => ({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: b.toString("base64") } });
  if (input.foodPhoto) content.push({ type: "text", text: "Photo of the meal:" }, image(input.foodPhoto));
  input.recipePhotos.forEach((p, i) => content.push({ type: "text", text: `Recipe photo ${i + 1}:` }, image(p)));
  const parts = [
    input.recipeText.trim() ? `Recipe (typed by the user):\n${input.recipeText.trim()}` : null,
    input.notes.trim() ? `Deviations from the recipe / special notes from the user:\n${input.notes.trim()}` : null,
    input.eatenG ? `The user ate ${input.eatenG} g of the finished dish (for context; list amounts as described above).` : null,
    !input.recipeText.trim() && input.recipePhotos.length === 0 ? "No recipe given: estimate from the photo." : null,
  ].filter(Boolean);
  content.push({ type: "text", text: parts.join("\n\n") || "Identify the ingredients." });

  const model = MEAL_PHOTO_MODEL();
  const response = await client.beta.messages.parse({
    model,
    max_tokens: 8000,
    system: SYSTEM,
    output_config: { effort: (process.env.AI_PHOTO_EFFORT as "low" | "medium" | "high" | undefined) || "low", format: betaZodOutputFormat(MealAnalysis) },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    messages: [{ role: "user", content }],
  });
  const usage = response.usage;
  const tokens: TokenUsage = {
    input_tokens: usage.input_tokens,
    output_tokens: usage.output_tokens,
    cache_creation_input_tokens: usage.cache_creation_input_tokens,
    cache_read_input_tokens: usage.cache_read_input_tokens,
  };
  if (response.stop_reason === "refusal") return { analysis: null, model: response.model, usage: tokens };
  return { analysis: response.parsed_output ?? null, model: response.model, usage: tokens };
}
