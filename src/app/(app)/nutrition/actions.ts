"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getToday, requireUser } from "@/lib/auth";
import { deleteMealTemplate, saveMealTemplate } from "@/lib/data/meal-templates";
import type { FoodCandidate } from "@/lib/food-sources/types";
import { correctFoodEnergy, logFoodEntry } from "@/lib/data/mutations";
import { addWater, copyEntries, setFoodFavorite } from "@/lib/data/tracking";
import { getFood } from "@/lib/data";
import { logRecipeEntry } from "@/lib/data/recipes";
import { MEALS } from "@/lib/data/types";

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

/** Stores the calories calculated from the macros for a library food (wrong value in the source). */
export async function fixFoodEnergy(foodId: string): Promise<ActionResult> {
  const res = await correctFoodEnergy(foodId, await requireUser());
  if (res.ok) revalidatePath("/nutrition", "layout");
  return res.ok ? { ok: true } : res;
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

/**
 * Puts a diary entry into a meal at a position (drag with the finger): `orderedIds`
 * is the meal's complete new order, including the moved entry. Works within a
 * meal (re-sorting) and across meals of the same day.
 */
export async function placeEntry(id: string, meal: string, orderedIds: string[]): Promise<ActionResult> {
  const { supabase, userId } = await requireUser();
  const input = z
    .object({ id: z.string().uuid(), meal: z.enum(MEALS as [string, ...string[]]), orderedIds: z.array(z.string().uuid()).min(1).max(200) })
    .safeParse({ id, meal, orderedIds });
  if (!input.success || !input.data.orderedIds.includes(input.data.id) || new Set(input.data.orderedIds).size !== input.data.orderedIds.length)
    return { ok: false, error: "invalid" };
  const results = await Promise.all(
    input.data.orderedIds.map((entryId, i) =>
      supabase
        .from("diary_entries")
        .update(entryId === input.data.id ? { meal: input.data.meal, sort_order: i } : { sort_order: i })
        .eq("id", entryId)
        .eq("user_id", userId),
    ),
  );
  const failed = results.find((r) => r.error);
  revalidatePath("/", "layout");
  return failed?.error ? { ok: false, error: failed.error.message } : { ok: true };
}

export async function deleteEntry(id: string): Promise<ActionResult> {
  const { supabase, userId } = await requireUser();
  const { error } = await supabase.from("diary_entries").delete().eq("id", id).eq("user_id", userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

/** One-tap logging of a favourite / frequently eaten food or recipe with its usual amount. */
export async function quickLog(input: { kind: "food" | "recipe"; id: string; amount_g: number; meal: string; date: string }): Promise<ActionResult> {
  const ctx = await requireUser();
  let res: ActionResult;
  if (input.kind === "recipe") {
    res = await logRecipeEntry({ recipeId: input.id, amount_g: input.amount_g, meal: input.meal, date: input.date }, ctx);
  } else {
    const food = z.string().uuid().safeParse(input.id).success ? await getFood(input.id, ctx) : null;
    if (!food) return { ok: false, error: "not_found" };
    const logged = await logFoodEntry({ food, amount_g: input.amount_g, meal: input.meal, date: input.date }, ctx);
    res = logged.ok ? { ok: true } : logged;
  }
  if (res.ok) revalidatePath("/", "layout");
  return res;
}

/** Saves the meal as it is on `date` as a fixed meal for the chosen weekdays. */
export async function saveFixedMeal(date: string, meal: string, days: number[]): Promise<ActionResult> {
  const ctx = await requireUser();
  const res = await saveMealTemplate({ date, meal, days, today: await getToday() }, ctx);
  if (res.ok) revalidatePath("/nutrition", "layout");
  return res;
}

export async function removeFixedMeal(id: string): Promise<ActionResult> {
  const res = await deleteMealTemplate(id, await getToday(), await requireUser());
  if (res.ok) revalidatePath("/nutrition", "layout");
  return res;
}
