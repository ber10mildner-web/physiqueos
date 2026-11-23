import "server-only";
/**
 * Reads the numbers from a photo of a cardio machine display (e.g. Stairmaster)
 * with the Claude API. Optional: only active if ANTHROPIC_API_KEY is set in the
 * server environment. Without a key, Claude can read the same photo for free
 * through the Claude connection (MCP tools list_cardio_photos / get_cardio_photo).
 */
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { TokenUsage } from "./cost";

export const displayReaderEnabled = () => Boolean(process.env.ANTHROPIC_API_KEY);

const DisplayValues = z.object({
  minutes: z.number().nullable().describe("Elapsed workout time in minutes (convert mm:ss or h:mm:ss), null if not shown"),
  level: z.number().nullable().describe("Intensity level / speed level, null if not shown"),
  floors: z.number().nullable().describe("Floors climbed, null if not shown"),
  steps: z.number().nullable().describe("Steps climbed, null if not shown"),
  kcal: z.number().nullable().describe("Calories shown by the machine, null if not shown"),
  readable: z.boolean().describe("false if the image is not a machine display or the numbers cannot be read"),
});
export type DisplayValues = z.infer<typeof DisplayValues>;

const PROMPT = `This is a photo of the display of a gym cardio machine, usually a stair climber (StairMaster / StepMill), taken after a workout.
Read the values exactly as shown. Do not estimate or calculate anything that is not displayed; use null for values that are not visible.
Time: convert to minutes (e.g. 45:30 → 45.5, 1:02:00 → 62).`;

export async function readDisplay(jpeg: Buffer): Promise<{ values: DisplayValues | null; model: string; usage: TokenUsage }> {
  const client = new Anthropic();
  const response = await client.beta.messages.parse({
    model: process.env.ANTHROPIC_MODEL || "claude-opus-5-5",
    max_tokens: 2000,
    output_config: { effort: "low", format: betaZodOutputFormat(DisplayValues) },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: "image/jpeg", data: jpeg.toString("base64") } },
          { type: "text", text: PROMPT },
        ],
      },
    ],
  });
  const u = response.usage;
  const usage: TokenUsage = { input_tokens: u.input_tokens, output_tokens: u.output_tokens, cache_creation_input_tokens: u.cache_creation_input_tokens, cache_read_input_tokens: u.cache_read_input_tokens };
  return { values: response.stop_reason === "refusal" ? null : (response.parsed_output ?? null), model: response.model, usage };
}
