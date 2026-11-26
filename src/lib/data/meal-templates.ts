import "server-only";
/**
 * Fixed meals: a meal saved from the diary (e.g. the usual breakfast) that Sigma
 * fills in by itself on chosen weekdays, but only when that meal is still empty
 * that day. Applied by ensureRoutines() like cardio and supplement routines, so a
 * fixed meal the user deleted on one day is not added again for that day.
 */
import { z } from "zod";
import { ctxOr, type Ctx } from "./core";
import { dateSchema, mealSchema, type Result } from "./mutations";
import { sanitizeNutrients } from "@/lib/nutrition/nutrients";
import { fixedMealName } from "@/lib/nutrition/fixed-meals";
import { isoWeekday } from "@/lib/nutrition/goal-days";
import type { MealSlot } from "./types";

export interface MealTemplateItem {
  food_id: string | null;
  recipe_id: string | null;
  food_name: string;
  food_brand: string | null;
  source: string;
  source_id: string | null;
  nutrients_per_100g: Record<string, number>;
  amount_g: number;
}

export interface MealTemplate {
  id: string;
  name: string;
  meal: MealSlot;
  items: MealTemplateItem[];
  auto_days: number[];
  auto_from: string;
}

/** What the meal cards need (no item snapshots). */
export type FixedMeal = Pick<MealTemplate, "id" | "name" | "meal" | "auto_days">;

const ITEM_COLUMNS = "food_id, recipe_id, food_name, food_brand, source, source_id, nutrients_per_100g, amount_g";

/** The user's fixed meals. Empty when the migration has not been run yet. */
export async function listMealTemplates(ctx?: Ctx): Promise<MealTemplate[]> {
  const { supabase, userId } = await ctxOr(ctx);
  const { data, error } = await supabase
    .from("meal_templates")
    .select("id, name, meal, items, auto_days, auto_from")
    .eq("user_id", userId)
    .order("created_at");
  if (error) {
    console.error("meal_templates", error.message);
    return [];
  }
  return (data ?? []).map((r) => ({
    ...(r as unknown as MealTemplate),
    auto_days: (r.auto_days ?? []).map(Number),
    items: Array.isArray(r.items) ? (r.items as MealTemplateItem[]) : [],
  }));
}

/**
 * Saves the meal as it is on `date` as a fixed meal for `days`. Those weekdays are
 * taken away from other fixed meals of the same slot (one fixed breakfast per day);
 * a fixed meal left without days is removed.
 */
export async function saveMealTemplate(input: { date: string; meal: string; days: number[]; today: string }, ctx?: Ctx): Promise<Result> {
  const parsed = z
    .object({ date: dateSchema, meal: mealSchema, days: z.array(z.number().int().min(1).max(7)).min(1).max(7), today: dateSchema })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { date, meal, today } = parsed.data;
  const days = [...new Set(parsed.data.days)].sort();
  const { supabase, userId } = await ctxOr(ctx);
  const { data: rows, error } = await supabase
    .from("diary_entries")
    .select(ITEM_COLUMNS)
    .eq("user_id", userId)
    .eq("entry_date", date)
    .eq("meal", meal)
    .is("medication_log_id", null)
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("created_at");
  if (error) return { ok: false, error: error.message };
  if (!rows?.length) return { ok: false, error: "empty" };
  const items: MealTemplateItem[] = rows.map((r) => ({
    ...(r as unknown as MealTemplateItem),
    amount_g: Number(r.amount_g),
    nutrients_per_100g: sanitizeNutrients(r.nutrients_per_100g) as Record<string, number>,
  }));

  const existing = (await listMealTemplates({ supabase, userId })).filter((t) => t.meal === meal);
  for (const t of existing) {
    const rest = t.auto_days.filter((d) => !days.includes(d));
    if (rest.length === t.auto_days.length) continue;
    await removePlannedMeals(t, t.auto_days.filter((d) => days.includes(d)), today, { supabase, userId });
    const res = rest.length
      ? await supabase.from("meal_templates").update({ auto_days: rest }).eq("id", t.id).eq("user_id", userId)
      : await supabase.from("meal_templates").delete().eq("id", t.id).eq("user_id", userId);
    if (res.error) return { ok: false, error: res.error.message };
  }
  const { error: e2 } = await supabase.from("meal_templates").insert({
    user_id: userId,
    name: fixedMealName(items.map((i) => i.food_name)),
    meal,
    items,
    auto_days: days,
    // from today on: the meal the template was made from already counts for its own day
    auto_from: today,
  });
  return e2 ? { ok: false, error: e2.message } : { ok: true };
}

export async function deleteMealTemplate(id: string, today: string, ctx?: Ctx): Promise<Result> {
  if (!z.string().uuid().safeParse(id).success || !dateSchema.safeParse(today).success) return { ok: false, error: "invalid" };
  const { supabase, userId } = await ctxOr(ctx);
  const t = (await listMealTemplates({ supabase, userId })).find((x) => x.id === id);
  if (t) await removePlannedMeals(t, t.auto_days, today, { supabase, userId });
  const { error } = await supabase.from("meal_templates").delete().eq("id", id).eq("user_id", userId);
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Fills the fixed meal in on `date` unless the user already logged something in that meal. */
export async function applyMealTemplate(t: MealTemplate, date: string, c: Ctx): Promise<boolean> {
  const { count } = await c.supabase
    .from("diary_entries")
    .select("id", { count: "exact", head: true })
    .eq("user_id", c.userId)
    .eq("entry_date", date)
    .eq("meal", t.meal);
  if (count) return false;
  const rows = t.items.map((i, n) => ({
    user_id: c.userId,
    entry_date: date,
    meal: t.meal,
    food_id: i.food_id,
    recipe_id: i.recipe_id,
    food_name: i.food_name,
    food_brand: i.food_brand,
    source: i.source,
    source_id: i.source_id,
    nutrients_per_100g: sanitizeNutrients(i.nutrients_per_100g),
    amount_g: i.amount_g,
    sort_order: n,
  }));
  let { error } = await c.supabase.from("diary_entries").insert(rows);
  // a food or recipe deleted from the library since: keep the snapshot without the link
  if (error) ({ error } = await c.supabase.from("diary_entries").insert(rows.map((r) => ({ ...r, food_id: null, recipe_id: null }))));
  if (error) console.error("fixed meal", error.message);
  return !error;
}

/** Diary entries on one day that came from these template items unchanged (same food, same amount). */
export function plannedEntryIds(items: Pick<MealTemplateItem, "food_name" | "amount_g">[], entries: { id: string; food_name: string; amount_g: number }[]): string[] {
  const left = items.map((i) => `${i.food_name}|${Number(i.amount_g)}`);
  const ids: string[] = [];
  for (const e of entries) {
    const at = left.indexOf(`${e.food_name}|${Number(e.amount_g)}`);
    if (at < 0) continue;
    left.splice(at, 1);
    ids.push(e.id);
  }
  return ids;
}

/**
 * Takes a fixed meal back out of days still ahead (after `today`) on the given weekdays,
 * when it is removed or those weekdays go to another fixed meal. Only entries the
 * user left as they were are removed; anything changed or added by hand stays.
 */
async function removePlannedMeals(t: MealTemplate, weekdays: number[], today: string, c: Ctx): Promise<void> {
  if (!weekdays.length) return;
  const { data: runs, error } = await c.supabase
    .from("routine_runs")
    .select("run_date")
    .eq("user_id", c.userId)
    .eq("kind", "meal")
    .eq("ref_id", t.id)
    .gt("run_date", today);
  if (error) return console.error("planned meals", error.message);
  const dates = (runs ?? []).map((r) => r.run_date as string).filter((d) => weekdays.includes(isoWeekday(d)));
  for (const date of dates) {
    const { data: rows } = await c.supabase
      .from("diary_entries")
      .select("id, food_name, amount_g")
      .eq("user_id", c.userId)
      .eq("entry_date", date)
      .eq("meal", t.meal)
      .is("medication_log_id", null);
    const ids = plannedEntryIds(t.items, (rows ?? []) as { id: string; food_name: string; amount_g: number }[]);
    if (ids.length) await c.supabase.from("diary_entries").delete().eq("user_id", c.userId).in("id", ids);
  }
  if (dates.length) await c.supabase.from("routine_runs").delete().eq("user_id", c.userId).eq("kind", "meal").eq("ref_id", t.id).in("run_date", dates);
}
