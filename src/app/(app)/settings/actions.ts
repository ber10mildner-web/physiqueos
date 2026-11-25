"use server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { requireUser, getToday } from "@/lib/auth";
import { isIsoDate } from "@/lib/dates";
import { isLocale, LOCALE_COOKIE } from "@/lib/i18n";
import { parseMealSlots } from "@/lib/nutrition/meal-slots";

export type ActionResult = { ok: true } | { ok: false; error: string };

const optionalNumber = (min: number, max: number) =>
  z.preprocess((v) => (v === "" || v === null || v === undefined ? null : Number(String(v).replace(",", "."))), z.number().min(min).max(max).nullable());

const profileSchema = z.object({
  display_name: z.string().trim().max(80).transform((v) => v || null),
  sex: z.enum(["male", "female"]).nullable().catch(null),
  birth_date: z.string().refine((v) => v === "" || isIsoDate(v)).transform((v) => v || null),
  height_cm: optionalNumber(100, 250),
  activity_level: z.enum(["sedentary", "light", "moderate", "active", "very_active"]).nullable().catch(null),
  water_target_ml: optionalNumber(500, 8000).transform((v) => (v === null ? null : Math.round(v))),
  water_tracking: z.boolean(),
});

export async function saveProfile(formData: FormData): Promise<ActionResult> {
  const { supabase, userId } = await requireUser();
  const parsed = profileSchema.safeParse({
    display_name: formData.get("display_name") ?? "",
    sex: formData.get("sex") || null,
    birth_date: formData.get("birth_date") ?? "",
    height_cm: formData.get("height_cm"),
    activity_level: formData.get("activity_level") || null,
    water_target_ml: formData.get("water_target_ml"),
    water_tracking: formData.get("water_tracking") === "on",
  });
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

const goalSchema = z.object({
  phase: z.enum(["cut", "maintenance", "lean_bulk", "custom"]),
  energy_kcal: z.coerce.number().int().min(800).max(8000),
  protein_g: z.coerce.number().int().min(0).max(600),
  carbs_g: z.coerce.number().int().min(0).max(1200),
  fat_g: z.coerce.number().int().min(0).max(400),
  fiber_g: z.coerce.number().int().min(0).max(150),
  valid_from: z.string().refine(isIsoDate),
  alt_days: z.array(z.coerce.number().int().min(1).max(7)).max(7),
  alt_energy_kcal: z.coerce.number().int().min(800).max(8000).nullable(),
  alt_protein_g: z.coerce.number().int().min(0).max(600).nullable(),
  alt_carbs_g: z.coerce.number().int().min(0).max(1200).nullable(),
  alt_fat_g: z.coerce.number().int().min(0).max(400).nullable(),
  alt_fiber_g: z.coerce.number().int().min(0).max(150).nullable(),
});

/** Saves a goal. One goal per start date; saving again on the same date replaces it. */
export async function saveGoal(formData: FormData): Promise<ActionResult> {
  const { supabase, userId } = await requireUser();
  const raw = Object.fromEntries(formData);
  const altDays = formData.getAll("alt_days").map(String);
  const opt = (k: string) => (String(raw[k] ?? "").trim() === "" ? null : raw[k]);
  const parsed = goalSchema.safeParse({
    ...raw,
    valid_from: raw.valid_from || (await getToday()),
    alt_days: altDays,
    alt_energy_kcal: altDays.length ? opt("alt_energy_kcal") : null,
    alt_protein_g: altDays.length ? opt("alt_protein_g") : null,
    alt_carbs_g: altDays.length ? opt("alt_carbs_g") : null,
    alt_fat_g: altDays.length ? opt("alt_fat_g") : null,
    alt_fiber_g: altDays.length ? opt("alt_fiber_g") : null,
  });
  if (!parsed.success) return { ok: false, error: "invalid" };
  const alt = [parsed.data.alt_energy_kcal, parsed.data.alt_protein_g, parsed.data.alt_carbs_g, parsed.data.alt_fat_g, parsed.data.alt_fiber_g];
  if (parsed.data.alt_days.length && alt.some((v) => v === null)) return { ok: false, error: "invalid" };
  parsed.data.alt_days = [...new Set(parsed.data.alt_days)].sort();
  const { error } = await supabase
    .from("nutrition_goals")
    .upsert({ ...parsed.data, user_id: userId }, { onConflict: "user_id,valid_from" });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setLocale(locale: string): Promise<void> {
  if (!isLocale(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  const { supabase, userId } = await requireUser();
  await supabase.from("profiles").update({ locale }).eq("id", userId);
  revalidatePath("/", "layout");
}

/** Saves which meals the user sees, their order and own names. */
export async function saveMealSlots(slots: { key: string; name: string | null }[]): Promise<ActionResult> {
  const { supabase, userId } = await requireUser();
  if (!Array.isArray(slots) || slots.length === 0 || slots.length > 10) return { ok: false, error: "invalid" };
  const parsed = parseMealSlots(slots);
  const { error } = await supabase.from("profiles").update({ meal_slots: parsed }).eq("id", userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}
