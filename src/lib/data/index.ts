import "server-only";
/**
 * Data access layer. All reads go through the signed-in user's Supabase client,
 * so Row Level Security applies. A future MCP server for Claude will reuse these.
 */
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { sanitizeNutrients } from "@/lib/nutrition/nutrients";
import type { DiaryEntry, Food, NutritionGoal, Profile, ProgressPhoto, WeightEntry } from "./types";

/**
 * Throws database errors, except "table does not exist" (migrations not run yet),
 * which sends the user to a setup hint instead of a generic server error.
 */
function check(error: { code?: string; message?: string } | null): void {
  if (!error) return;
  if (error.code === "PGRST205" || error.code === "42P01" || /does not exist|schema cache/i.test(error.message ?? "")) {
    redirect("/setup?reason=database");
  }
  throw error;
}

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

export async function getProfile(): Promise<Profile | null> {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, locale, sex, birth_date, height_cm, activity_level")
    .eq("id", userId)
    .maybeSingle();
  check(error);
  return data ? { ...data, height_cm: num(data.height_cm) } as Profile : null;
}

/** The goal in effect on `date` (latest valid_from <= date). */
export async function getGoalOn(date: string): Promise<NutritionGoal | null> {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("nutrition_goals")
    .select("id, valid_from, phase, energy_kcal, protein_g, carbs_g, fat_g, fiber_g")
    .eq("user_id", userId)
    .lte("valid_from", date)
    .order("valid_from", { ascending: false })
    .limit(1)
    .maybeSingle();
  check(error);
  return data as NutritionGoal | null;
}

function mapEntry(row: Record<string, unknown>): DiaryEntry {
  return {
    ...(row as unknown as DiaryEntry),
    amount_g: Number(row.amount_g),
    nutrients_per_100g: sanitizeNutrients(row.nutrients_per_100g),
  };
}

export async function getDiary(date: string): Promise<DiaryEntry[]> {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("diary_entries")
    .select("id, entry_date, meal, food_id, food_name, food_brand, source, source_id, nutrients_per_100g, amount_g, created_at")
    .eq("user_id", userId)
    .eq("entry_date", date)
    .order("created_at", { ascending: true });
  check(error);
  return (data ?? []).map(mapEntry);
}

function mapFood(row: Record<string, unknown>): Food {
  return {
    ...(row as unknown as Food),
    serving_size_g: num(row.serving_size_g),
    nutrients: sanitizeNutrients(row.nutrients),
  };
}

const FOOD_COLUMNS = "id, source, source_id, source_url, name, brand, barcode, serving_size_g, image_url, nutrients";

/** Foods the user logged most recently (distinct), newest first. */
export async function getRecentFoods(limit = 12): Promise<Food[]> {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("diary_entries")
    .select("food_id, created_at")
    .eq("user_id", userId)
    .not("food_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(150);
  check(error);
  const ids: string[] = [];
  for (const r of data ?? []) {
    if (r.food_id && !ids.includes(r.food_id)) ids.push(r.food_id);
    if (ids.length >= limit) break;
  }
  if (ids.length === 0) return [];
  const { data: foods, error: e2 } = await supabase.from("foods").select(FOOD_COLUMNS).in("id", ids);
  check(e2);
  const byId = new Map((foods ?? []).map((f) => [f.id as string, mapFood(f)]));
  return ids.map((id) => byId.get(id)).filter((f): f is Food => Boolean(f));
}

export async function searchMyFoods(query: string, limit = 10): Promise<Food[]> {
  const { supabase, userId } = await requireUser();
  const q = query.replace(/[%_,()]/g, " ").trim();
  if (!q) return [];
  const { data, error } = await supabase
    .from("foods")
    .select(FOOD_COLUMNS)
    .eq("user_id", userId)
    .or(`name.ilike.%${q}%,brand.ilike.%${q}%`)
    .order("updated_at", { ascending: false })
    .limit(limit);
  check(error);
  return (data ?? []).map(mapFood);
}

export async function getFoodByBarcode(barcode: string): Promise<Food | null> {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("foods")
    .select(FOOD_COLUMNS)
    .eq("user_id", userId)
    .eq("barcode", barcode)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  check(error);
  return data ? mapFood(data) : null;
}

export async function getFood(id: string): Promise<Food | null> {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase.from("foods").select(FOOD_COLUMNS).eq("user_id", userId).eq("id", id).maybeSingle();
  check(error);
  return data ? mapFood(data) : null;
}

export async function getWeights(fromDate?: string): Promise<WeightEntry[]> {
  const { supabase, userId } = await requireUser();
  let q = supabase.from("weight_entries").select("id, entry_date, weight_kg, note").eq("user_id", userId);
  if (fromDate) q = q.gte("entry_date", fromDate);
  const { data, error } = await q.order("entry_date", { ascending: true });
  check(error);
  return (data ?? []).map((r) => ({ ...r, weight_kg: Number(r.weight_kg) }));
}

export async function getLatestWeight(): Promise<WeightEntry | null> {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("weight_entries")
    .select("id, entry_date, weight_kg, note")
    .eq("user_id", userId)
    .order("entry_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  check(error);
  return data ? { ...data, weight_kg: Number(data.weight_kg) } : null;
}

export const PHOTO_BUCKET = "progress-photos";

/** Photos with short-lived signed URLs (1 hour). The bucket is private. */
export async function getPhotos(): Promise<ProgressPhoto[]> {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("progress_photos")
    .select("id, taken_on, pose, storage_path, width, height, note")
    .eq("user_id", userId)
    .order("taken_on", { ascending: false })
    .order("created_at", { ascending: false });
  check(error);
  const rows = data ?? [];
  if (rows.length === 0) return [];
  const { data: signed, error: e2 } = await supabase.storage
    .from(PHOTO_BUCKET)
    .createSignedUrls(rows.map((r) => r.storage_path), 3600);
  check(e2);
  const urls = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
  return rows.map((r) => ({ ...r, url: urls.get(r.storage_path) ?? null }) as ProgressPhoto);
}
