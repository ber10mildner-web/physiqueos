import "server-only";
/** Writes shared by the web app (server actions) and the MCP server. */
import { z } from "zod";
import { ctxOr, type Ctx } from "./core";
import { isIsoDate } from "@/lib/dates";
import { hasRequiredNutrients, sanitizeNutrients } from "@/lib/nutrition/nutrients";
import type { FoodCandidate } from "@/lib/food-sources/types";

export type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

export const mealSchema = z.enum(["breakfast", "pre_workout", "lunch", "post_workout", "dinner", "snack"]);
export const dateSchema = z.string().refine(isIsoDate, "invalid date");

export const candidateSchema = z.object({
  id: z.string().uuid().optional(),
  source: z.enum(["openfoodfacts", "usda", "custom"]),
  source_id: z.string().max(64).nullable(),
  source_url: z.string().url().max(500).nullable(),
  name: z.string().trim().min(1).max(200),
  brand: z.string().trim().max(200).nullable(),
  barcode: z.string().regex(/^[0-9]{6,14}$/).nullable(),
  serving_size_g: z.number().positive().max(5000).nullable(),
  image_url: z.string().url().max(500).nullable(),
  nutrients: z.record(z.string(), z.unknown()),
});

/**
 * Stores a food in the user's library (or reuses an existing one) and returns
 * its id. External products are de-duplicated by (source, source_id).
 */
export async function upsertFood(food: z.infer<typeof candidateSchema>, ctx?: Ctx): Promise<Result<{ foodId: string }>> {
  const { supabase, userId } = await ctxOr(ctx);
  const nutrients = sanitizeNutrients(food.nutrients);
  if (!hasRequiredNutrients(nutrients)) return { ok: false, error: "incomplete" };
  if (food.id) {
    const { data, error } = await supabase.from("foods").select("id").eq("id", food.id).eq("user_id", userId).maybeSingle();
    if (error || !data) return { ok: false, error: "not_found" };
    return { ok: true, foodId: data.id };
  }
  const row = {
    user_id: userId,
    source: food.source,
    source_id: food.source === "custom" ? null : food.source_id,
    source_url: food.source_url,
    name: food.name,
    brand: food.brand,
    barcode: food.barcode,
    serving_size_g: food.serving_size_g,
    image_url: food.image_url,
    nutrients,
    fetched_at: food.source === "custom" ? null : new Date().toISOString(),
  };
  if (row.source !== "custom" && !row.source_id) return { ok: false, error: "invalid" };
  const q =
    row.source === "custom"
      ? supabase.from("foods").insert(row).select("id").single()
      : supabase.from("foods").upsert(row, { onConflict: "user_id,source,source_id" }).select("id").single();
  const { data, error } = await q;
  if (error) return { ok: false, error: error.message };
  return { ok: true, foodId: data.id };
}

const logSchema = z.object({ food: candidateSchema, amount_g: z.number().positive().max(5000), meal: mealSchema, date: dateSchema });

/** Logs an amount of a food; the diary keeps a snapshot of the per-100 g values. */
export async function logFoodEntry(input: { food: FoodCandidate; amount_g: number; meal: string; date: string }, ctx?: Ctx): Promise<Result<{ foodId: string }>> {
  const parsed = logSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { food, amount_g, meal, date } = parsed.data;
  const saved = await upsertFood(food, ctx);
  if (!saved.ok) return saved;
  const { supabase, userId } = await ctxOr(ctx);
  const { error } = await supabase.from("diary_entries").insert({
    user_id: userId,
    entry_date: date,
    meal,
    food_id: saved.foodId,
    food_name: food.name,
    food_brand: food.brand,
    source: food.source,
    source_id: food.source === "custom" ? null : food.source_id,
    nutrients_per_100g: sanitizeNutrients(food.nutrients),
    amount_g: Math.round(amount_g * 10) / 10,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, foodId: saved.foodId };
}

/** One weight per day: logging again on the same date replaces it. */
export async function upsertWeight(input: { date: string; weight_kg: number; note?: string | null }, ctx?: Ctx): Promise<Result> {
  const parsed = z.object({ date: dateSchema, weight_kg: z.number().min(20).max(400), note: z.string().max(500).nullish() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { supabase, userId } = await ctxOr(ctx);
  const { error } = await supabase.from("weight_entries").upsert(
    { user_id: userId, entry_date: parsed.data.date, weight_kg: Math.round(parsed.data.weight_kg * 100) / 100, note: parsed.data.note || null },
    { onConflict: "user_id,entry_date" },
  );
  return error ? { ok: false, error: error.message } : { ok: true };
}
