"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { isIsoDate } from "@/lib/dates";
import { hasRequiredNutrients, sanitizeNutrients } from "@/lib/nutrition/nutrients";
import type { FoodCandidate } from "@/lib/food-sources/types";

export type ActionResult = { ok: true } | { ok: false; error: string };

const candidateSchema = z.object({
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

const logSchema = z.object({
  food: candidateSchema,
  amount_g: z.number().positive().max(5000),
  meal: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  date: z.string().refine(isIsoDate),
});

/**
 * Logs an amount of a food. The food is stored in (or updated in) the user's
 * library first so it shows up under "recently used" and future barcode scans,
 * then the diary entry is written with a snapshot of the per-100 g values.
 */
export async function logFood(input: { food: FoodCandidate; amount_g: number; meal: string; date: string }): Promise<ActionResult & { foodId?: string }> {
  const { supabase, userId } = await requireUser();
  const parsed = logSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { food, amount_g, meal, date } = parsed.data;
  const nutrients = sanitizeNutrients(food.nutrients);
  if (!hasRequiredNutrients(nutrients)) return { ok: false, error: "incomplete" };

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

  let foodId: string;
  if (food.id) {
    // Existing library item: keep it, just make sure it belongs to the user.
    const { data, error } = await supabase.from("foods").select("id").eq("id", food.id).eq("user_id", userId).maybeSingle();
    if (error || !data) return { ok: false, error: "not_found" };
    foodId = data.id;
  } else if (row.source === "custom") {
    const { data, error } = await supabase.from("foods").insert(row).select("id").single();
    if (error) return { ok: false, error: error.message };
    foodId = data.id;
  } else {
    const { data, error } = await supabase
      .from("foods")
      .upsert(row, { onConflict: "user_id,source,source_id" })
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };
    foodId = data.id;
  }

  const { error } = await supabase.from("diary_entries").insert({
    user_id: userId,
    entry_date: date,
    meal,
    food_id: foodId,
    food_name: food.name,
    food_brand: food.brand,
    source: food.source,
    source_id: row.source_id,
    nutrients_per_100g: nutrients,
    amount_g: Math.round(amount_g * 10) / 10,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true, foodId };
}

export async function updateEntryAmount(id: string, amountG: number): Promise<ActionResult> {
  const { supabase, userId } = await requireUser();
  const amount = z.number().positive().max(5000).safeParse(amountG);
  if (!amount.success) return { ok: false, error: "invalid" };
  const { error } = await supabase
    .from("diary_entries")
    .update({ amount_g: Math.round(amount.data * 10) / 10 })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteEntry(id: string): Promise<ActionResult> {
  const { supabase, userId } = await requireUser();
  const { error } = await supabase.from("diary_entries").delete().eq("id", id).eq("user_id", userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}
