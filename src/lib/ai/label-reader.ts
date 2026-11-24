import "server-only";
/**
 * Reads a photographed nutrition label (Nährwerttabelle) with the Claude API.
 * Only a fallback when a barcode finds nothing or a food has no barcode (e.g.
 * bakery bread). The model only copies the printed numbers; the user checks
 * them in the manual form before anything is saved (see label.ts).
 * Same key, model and cost cap as the meal photo (usage.ts, feature "food_label").
 */
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { NUTRIENT_KEYS, NUTRIENTS, type NutrientKey } from "@/lib/nutrition/nutrients";
import type { LabelReading } from "@/lib/nutrition/label";
import type { TokenUsage } from "./cost";

const valueShape = Object.fromEntries(
  NUTRIENT_KEYS.map((k) => [k, z.number().nullable().describe(`${k.replace(/_(g|mg|ug|kcal)$/, "")} in ${NUTRIENTS[k].unit}; null if not printed`)]),
) as Record<NutrientKey, z.ZodNullable<z.ZodNumber>>;

const Label = z.object({
  readable: z.boolean().describe("false if the photo shows no nutrition table or its numbers cannot be read"),
  name: z.string().nullable().describe("Product name as printed on the package (German), null if not visible"),
  brand: z.string().nullable().describe("Brand or bakery name if visible, else null"),
  basis: z.enum(["per_100g", "per_serving"]).describe("per_100g if the table has a 'pro 100 g' or 'pro 100 ml' column (always prefer it); per_serving only if there is no per-100 column"),
  serving_g: z.number().nullable().describe("Portion size in g or ml if printed (e.g. 'pro Scheibe (50 g)' → 50), else null"),
  energy_kj: z.number().nullable().describe("Energy in kJ from the chosen column, null if not printed"),
  values: z.object(valueShape).describe("Values from the chosen column, in exactly the unit given; null for anything not printed. Never estimate."),
});

const PROMPT = `This is a photo of a food package, usually the nutrition table (Nährwerttabelle / Nährwertinformationen), sometimes with the front of the package.
Copy the printed values exactly. Use the column per 100 g / 100 ml whenever there is one. Do not calculate, estimate or fill in anything that is not printed; use null instead.
"davon gesättigte Fettsäuren" = saturated fat, "davon Zucker" = sugar, "Ballaststoffe" = fibre, "Salz" = salt. Vitamins and minerals only if listed, in the unit asked for (convert mg ↔ µg if the label uses the other one).
"<0,5 g" or "Spuren" → 0. A decimal comma is a decimal point.`;

export async function readLabel(jpegs: Buffer[]): Promise<{ reading: LabelReading | null; model: string; usage: TokenUsage }> {
  const client = new Anthropic();
  const response = await client.beta.messages.parse({
    model: process.env.ANTHROPIC_MODEL || "claude-opus-5-5",
    max_tokens: 3000,
    output_config: { effort: "low", format: betaZodOutputFormat(Label) },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    messages: [
      {
        role: "user",
        content: [
          ...jpegs.map((b) => ({ type: "image" as const, source: { type: "base64" as const, media_type: "image/jpeg" as const, data: b.toString("base64") } })),
          { type: "text", text: PROMPT },
        ],
      },
    ],
  });
  const u = response.usage;
  const usage: TokenUsage = { input_tokens: u.input_tokens, output_tokens: u.output_tokens, cache_creation_input_tokens: u.cache_creation_input_tokens, cache_read_input_tokens: u.cache_read_input_tokens };
  return { reading: response.stop_reason === "refusal" ? null : (response.parsed_output ?? null), model: response.model, usage };
}
