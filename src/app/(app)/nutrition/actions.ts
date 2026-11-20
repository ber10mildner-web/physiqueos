"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import type { FoodCandidate } from "@/lib/food-sources/types";
import { logFoodEntry } from "@/lib/data/mutations";
import { addWater, copyEntries, setFoodFavorite } from "@/lib/data/tracking";

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Logs an amount of a food. The food is stored in (or updated in) the user's
 * library first so it shows up under "recently used" and future barcode scans,
 * then the diary entry is written with a snapshot of the per-100 g values.
 */
export async function logFood(input: { food: FoodCandidate; amount_g: number; meal: string; date: string }): Promise<ActionResult & { foodId?: string }> {
  const res = await logFoodEntry(input, await requireUser());
  if (res.ok) revalidatePath("/", "layout");
  return res;
}

export async function copyMeal(fromDate: string, toDate: string, meal: string | null): Promise<ActionResult & { copied?: number }> {
  const res = await copyEntries({ fromDate, toDate, meal }, await requireUser());
  if (res.ok) revalidatePath("/", "layout");
  return res;
}

export async function toggleFavorite(foodId: string, favorite: boolean): Promise<ActionResult> {
  const res = await setFoodFavorite(foodId, favorite, await requireUser());
  if (res.ok) revalidatePath("/nutrition", "layout");
  return res;
}

export async function changeWater(date: string, amountMl: number): Promise<ActionResult & { total?: number }> {
  const res = await addWater(date, amountMl, await requireUser());
  if (res.ok) revalidatePath("/", "layout");
  return res;
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
