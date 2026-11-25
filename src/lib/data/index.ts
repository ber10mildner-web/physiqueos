import "server-only";
/**
 * Data access layer. Every query filters by user id explicitly, and the web app's
 * client additionally runs under Row Level Security. The MCP server for Claude
 * reuses these functions with its own context.
 */
import { ctxOr, check, type Ctx } from "./core";
import { sanitizeNutrients } from "@/lib/nutrition/nutrients";
import { altTargets, targetsOn, type GoalRow } from "@/lib/nutrition/goal-days";
import { parseMealSlots } from "@/lib/nutrition/meal-slots";
import type { DiaryEntry, Food, NutritionGoal, Profile, ProgressPhoto, WeightEntry } from "./types";

export type { Ctx };

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

export async function getProfile(ctx?: Ctx): Promise<Profile | null> {
  const { supabase, userId } = await ctxOr(ctx);
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, locale, sex, birth_date, height_cm, activity_level, water_target_ml, water_tracking, meal_slots")
    .eq("id", userId)
    .maybeSingle();
  check(error, !ctx);
  return data ? ({ ...data, height_cm: num(data.height_cm), meal_slots: data.meal_slots ? parseMealSlots(data.meal_slots) : null } as Profile) : null;
}

/** The goal in effect on `date` (latest valid_from <= date). */
const GOAL_COLUMNS = "id, valid_from, phase, energy_kcal, protein_g, carbs_g, fat_g, fiber_g, alt_days, alt_energy_kcal, alt_protein_g, alt_carbs_g, alt_fat_g, alt_fiber_g";

/** Resolves a goal row for a day: on its special weekdays the alternative targets apply. */
export function resolveGoal(row: GoalRow, date: string): NutritionGoal {
  const { alt_day, ...targets } = targetsOn(row, date);
  return {
    id: row.id,
    valid_from: row.valid_from,
    phase: row.phase as NutritionGoal["phase"],
    ...targets,
    alt_day,
    base: { energy_kcal: row.energy_kcal, protein_g: row.protein_g, carbs_g: row.carbs_g, fat_g: row.fat_g, fiber_g: row.fiber_g },
    alt_days: row.alt_days ?? [],
    alt: altTargets(row),
  };
}

export async function getGoalOn(date: string, ctx?: Ctx): Promise<NutritionGoal | null> {
  const { supabase, userId } = await ctxOr(ctx);
  const { data, error } = await supabase
    .from("nutrition_goals")
    .select(GOAL_COLUMNS)
    .eq("user_id", userId)
    .lte("valid_from", date)
    .order("valid_from", { ascending: false })
    .limit(1)
    .maybeSingle();
  check(error, !ctx);
  return data ? resolveGoal(data as GoalRow, date) : null;
}

function mapEntry(row: Record<string, unknown>): DiaryEntry {
  return {
    ...(row as unknown as DiaryEntry),
    amount_g: Number(row.amount_g),
    nutrients_per_100g: sanitizeNutrients(row.nutrients_per_100g),
  };
}

export async function getDiary(date: string, ctx?: Ctx): Promise<DiaryEntry[]> {
  const { supabase, userId } = await ctxOr(ctx);
  const { data, error } = await supabase
    .from("diary_entries")
    .select("id, entry_date, meal, food_id, food_name, food_brand, source, source_id, nutrients_per_100g, amount_g, created_at, recipe_id")
    .eq("user_id", userId)
    .eq("entry_date", date)
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  check(error, !ctx);
  return (data ?? []).map(mapEntry);
}

export function mapFood(row: Record<string, unknown>): Food {
  return {
    ...(row as unknown as Food),
    serving_size_g: num(row.serving_size_g),
    nutrients: sanitizeNutrients(row.nutrients),
  };
}

export const FOOD_COLUMNS = "id, source, source_id, source_url, name, brand, barcode, serving_size_g, image_url, nutrients, is_favorite";

/** Foods the user logged most recently (distinct), newest first. */
export async function getRecentFoods(limit = 12, ctx?: Ctx): Promise<Food[]> {
  const { supabase, userId } = await ctxOr(ctx);
  const { data, error } = await supabase
    .from("diary_entries")
    .select("food_id, created_at")
    .eq("user_id", userId)
    .not("food_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(150);
  check(error, !ctx);
  const ids: string[] = [];
  for (const r of data ?? []) {
    if (r.food_id && !ids.includes(r.food_id)) ids.push(r.food_id);
    if (ids.length >= limit) break;
  }
  if (ids.length === 0) return [];
  const { data: foods, error: e2 } = await supabase.from("foods").select(FOOD_COLUMNS).in("id", ids);
  check(e2, !ctx);
  const byId = new Map((foods ?? []).map((f) => [f.id as string, mapFood(f)]));
  return ids.map((id) => byId.get(id)).filter((f): f is Food => Boolean(f));
}

export async function searchMyFoods(query: string, limit = 10, ctx?: Ctx): Promise<Food[]> {
  const { supabase, userId } = await ctxOr(ctx);
  const q = query.replace(/[%_,()]/g, " ").trim();
  if (!q) return [];
  const { data, error } = await supabase
    .from("foods")
    .select(FOOD_COLUMNS)
    .eq("user_id", userId)
    .or(`name.ilike.%${q}%,brand.ilike.%${q}%`)
    .order("updated_at", { ascending: false })
    .limit(limit);
  check(error, !ctx);
  return (data ?? []).map(mapFood);
}

export async function getFoodByBarcode(barcode: string, ctx?: Ctx): Promise<Food | null> {
  const { supabase, userId } = await ctxOr(ctx);
  const { data, error } = await supabase
    .from("foods")
    .select(FOOD_COLUMNS)
    .eq("user_id", userId)
    .eq("barcode", barcode)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  check(error, !ctx);
  return data ? mapFood(data) : null;
}

export async function getFood(id: string, ctx?: Ctx): Promise<Food | null> {
  const { supabase, userId } = await ctxOr(ctx);
  const { data, error } = await supabase.from("foods").select(FOOD_COLUMNS).eq("user_id", userId).eq("id", id).maybeSingle();
  check(error, !ctx);
  return data ? mapFood(data) : null;
}

export async function getWeights(fromDate?: string, ctx?: Ctx): Promise<WeightEntry[]> {
  const { supabase, userId } = await ctxOr(ctx);
  let q = supabase.from("weight_entries").select("id, entry_date, weight_kg, note").eq("user_id", userId);
  if (fromDate) q = q.gte("entry_date", fromDate);
  const { data, error } = await q.order("entry_date", { ascending: true });
  check(error, !ctx);
  return (data ?? []).map((r) => ({ ...r, weight_kg: Number(r.weight_kg) }));
}

export async function getLatestWeight(ctx?: Ctx): Promise<WeightEntry | null> {
  const { supabase, userId } = await ctxOr(ctx);
  const { data, error } = await supabase
    .from("weight_entries")
    .select("id, entry_date, weight_kg, note")
    .eq("user_id", userId)
    .order("entry_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  check(error, !ctx);
  return data ? { ...data, weight_kg: Number(data.weight_kg) } : null;
}

export const PHOTO_BUCKET = "progress-photos";

/** Photos with short-lived signed URLs (1 hour). The bucket is private. */
export async function getPhotos(ctx?: Ctx): Promise<ProgressPhoto[]> {
  const { supabase, userId } = await ctxOr(ctx);
  const { data, error } = await supabase
    .from("progress_photos")
    .select("id, taken_on, pose, storage_path, width, height, note")
    .eq("user_id", userId)
    .order("taken_on", { ascending: false })
    .order("created_at", { ascending: false });
  check(error, !ctx);
  const rows = data ?? [];
  if (rows.length === 0) return [];
  const { data: signed, error: e2 } = await supabase.storage
    .from(PHOTO_BUCKET)
    .createSignedUrls(rows.map((r) => r.storage_path), 3600);
  check(e2, !ctx);
  const urls = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
  return rows.map((r) => ({ ...r, url: urls.get(r.storage_path) ?? null }) as ProgressPhoto);
}

export async function getFavoriteFoods(ctx?: Ctx): Promise<Food[]> {
  const { supabase, userId } = await ctxOr(ctx);
  const { data, error } = await supabase.from("foods").select(FOOD_COLUMNS).eq("user_id", userId).eq("is_favorite", true).order("name");
  check(error, !ctx);
  return (data ?? []).map(mapFood);
}

/** Diary entries in a date range (inclusive), oldest first. */
export async function getDiaryRange(from: string, to: string, ctx?: Ctx): Promise<DiaryEntry[]> {
  const { supabase, userId } = await ctxOr(ctx);
  const { data, error } = await supabase
    .from("diary_entries")
    .select("id, entry_date, meal, food_id, food_name, food_brand, source, source_id, nutrients_per_100g, amount_g, created_at, recipe_id")
    .eq("user_id", userId)
    .gte("entry_date", from)
    .lte("entry_date", to)
    .order("entry_date")
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("created_at")
    .limit(5000);
  check(error, !ctx);
  return (data ?? []).map(mapEntry);
}

/** All goals that overlap a range: the one in effect at `from` plus later changes. */
export async function getGoalsBetween(from: string, to: string, ctx?: Ctx): Promise<NutritionGoal[]> {
  const first = await getGoalOn(from, ctx);
  const { supabase, userId } = await ctxOr(ctx);
  const { data, error } = await supabase
    .from("nutrition_goals")
    .select(GOAL_COLUMNS)
    .eq("user_id", userId)
    .gt("valid_from", from)
    .lte("valid_from", to)
    .order("valid_from");
  check(error, !ctx);
  return [...(first ? [first] : []), ...((data ?? []) as GoalRow[]).map((r) => resolveGoal(r, r.valid_from))];
}

/** Dates in a range that have at least one diary entry. */
export async function getLoggedDates(from: string, to: string, ctx?: Ctx): Promise<Set<string>> {
  const { supabase, userId } = await ctxOr(ctx);
  const { data, error } = await supabase.from("diary_entries").select("entry_date").eq("user_id", userId).gte("entry_date", from).lte("entry_date", to).limit(2000);
  check(error, !ctx);
  return new Set((data ?? []).map((r) => r.entry_date as string));
}
