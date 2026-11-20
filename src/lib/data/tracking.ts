import "server-only";
import { z } from "zod";
import { check, ctxOr, type Ctx } from "./core";
import { dateSchema, mealSchema, type Result } from "./mutations";

/** Total water (ml) for a day. */
export async function getWater(date: string, ctx?: Ctx): Promise<number> {
  const { supabase, userId } = await ctxOr(ctx);
  const { data, error } = await supabase.from("water_logs").select("amount_ml").eq("user_id", userId).eq("entry_date", date);
  check(error, !ctx);
  return Math.max(0, (data ?? []).reduce((s, r) => s + r.amount_ml, 0));
}

export async function getWaterRange(from: string, to: string, ctx?: Ctx): Promise<Record<string, number>> {
  const { supabase, userId } = await ctxOr(ctx);
  const { data, error } = await supabase.from("water_logs").select("entry_date, amount_ml").eq("user_id", userId).gte("entry_date", from).lte("entry_date", to);
  check(error, !ctx);
  const out: Record<string, number> = {};
  for (const r of data ?? []) out[r.entry_date] = (out[r.entry_date] ?? 0) + r.amount_ml;
  return out;
}

/** Adds (or with a negative amount, removes) water. The day total never goes below 0. */
export async function addWater(date: string, amountMl: number, ctx?: Ctx): Promise<Result<{ total: number }>> {
  const parsed = z.object({ date: dateSchema, amount: z.number().int().min(-5000).max(5000).refine((v) => v !== 0) }).safeParse({ date, amount: amountMl });
  if (!parsed.success) return { ok: false, error: "invalid" };
  const current = await getWater(date, ctx);
  const amount = Math.max(parsed.data.amount, -current);
  if (amount === 0) return { ok: true, total: current };
  const { supabase, userId } = await ctxOr(ctx);
  const { error } = await supabase.from("water_logs").insert({ user_id: userId, entry_date: date, amount_ml: amount });
  if (error) return { ok: false, error: error.message };
  return { ok: true, total: current + amount };
}

export async function setFoodFavorite(foodId: string, favorite: boolean, ctx?: Ctx): Promise<Result> {
  const { supabase, userId } = await ctxOr(ctx);
  const { error } = await supabase.from("foods").update({ is_favorite: favorite }).eq("id", foodId).eq("user_id", userId);
  return error ? { ok: false, error: error.message } : { ok: true };
}

/**
 * Copies all entries of a meal (or of the whole day when meal is null) from one
 * date to another. Snapshots are copied as they are.
 */
export async function copyEntries(input: { fromDate: string; toDate: string; meal: string | null; toMeal?: string | null }, ctx?: Ctx): Promise<Result<{ copied: number }>> {
  const parsed = z
    .object({ fromDate: dateSchema, toDate: dateSchema, meal: mealSchema.nullable(), toMeal: mealSchema.nullish() })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { supabase, userId } = await ctxOr(ctx);
  let q = supabase
    .from("diary_entries")
    .select("meal, food_id, food_name, food_brand, source, source_id, nutrients_per_100g, amount_g, recipe_id")
    .eq("user_id", userId)
    .eq("entry_date", parsed.data.fromDate);
  if (parsed.data.meal) q = q.eq("meal", parsed.data.meal);
  const { data, error } = await q.order("created_at");
  if (error) return { ok: false, error: error.message };
  if (!data?.length) return { ok: true, copied: 0 };
  const rows = data.map((r) => ({ ...r, user_id: userId, entry_date: parsed.data.toDate, meal: parsed.data.toMeal ?? r.meal }));
  const { error: e2 } = await supabase.from("diary_entries").insert(rows);
  if (e2) return { ok: false, error: e2.message };
  return { ok: true, copied: rows.length };
}
