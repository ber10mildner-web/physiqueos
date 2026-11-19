"use server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { requireUser, getToday } from "@/lib/auth";
import { isIsoDate } from "@/lib/dates";
import { isLocale, LOCALE_COOKIE } from "@/lib/i18n";

export type ActionResult = { ok: true } | { ok: false; error: string };

const optionalNumber = (min: number, max: number) =>
  z.preprocess((v) => (v === "" || v === null || v === undefined ? null : Number(String(v).replace(",", "."))), z.number().min(min).max(max).nullable());

const profileSchema = z.object({
  display_name: z.string().trim().max(80).transform((v) => v || null),
  sex: z.enum(["male", "female"]).nullable().catch(null),
  birth_date: z.string().refine((v) => v === "" || isIsoDate(v)).transform((v) => v || null),
  height_cm: optionalNumber(100, 250),
  activity_level: z.enum(["sedentary", "light", "moderate", "active", "very_active"]).nullable().catch(null),
});

export async function saveProfile(formData: FormData): Promise<ActionResult> {
  const { supabase, userId } = await requireUser();
  const parsed = profileSchema.safeParse({
    display_name: formData.get("display_name") ?? "",
    sex: formData.get("sex") || null,
    birth_date: formData.get("birth_date") ?? "",
    height_cm: formData.get("height_cm"),
    activity_level: formData.get("activity_level") || null,
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
});

/** Saves a goal. One goal per start date; saving again on the same date replaces it. */
export async function saveGoal(formData: FormData): Promise<ActionResult> {
  const { supabase, userId } = await requireUser();
  const raw = Object.fromEntries(formData);
  const parsed = goalSchema.safeParse({ ...raw, valid_from: raw.valid_from || (await getToday()) });
  if (!parsed.success) return { ok: false, error: "invalid" };
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
