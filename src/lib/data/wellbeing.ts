import "server-only";
/** Skin log (one entry per day) and medications / supplements with intake log. */
import { z } from "zod";
import { check, ctxOr, type Ctx } from "./core";
import { dateSchema, type Result } from "./mutations";
import { MEDICATION_KINDS, SKIN_AREAS, type Medication, type MedicationLog, type SkinLog } from "./types";

const uuid = z.string().uuid();

export async function getSkinRange(from: string, to: string, ctx?: Ctx): Promise<SkinLog[]> {
  const { supabase, userId } = await ctxOr(ctx);
  const { data, error } = await supabase
    .from("skin_logs")
    .select("entry_date, score, areas, note, source")
    .eq("user_id", userId)
    .gte("entry_date", from)
    .lte("entry_date", to)
    .order("entry_date", { ascending: false });
  check(error, !ctx);
  return (data ?? []) as SkinLog[];
}

export const skinSchema = z.object({
  date: dateSchema,
  score: z.number().int().min(0).max(4),
  areas: z.array(z.enum(SKIN_AREAS)).max(SKIN_AREAS.length).default([]),
  note: z.string().trim().max(1000).nullish(),
  source: z.enum(["manual", "claude"]).default("manual"),
});

/** One entry per day; saving again replaces that day's entry. */
export async function upsertSkin(input: z.input<typeof skinSchema>, ctx?: Ctx): Promise<Result> {
  const parsed = skinSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { supabase, userId } = await ctxOr(ctx);
  const { date, areas, ...rest } = parsed.data;
  const { error } = await supabase
    .from("skin_logs")
    .upsert({ ...rest, areas: [...new Set(areas)], note: rest.note || null, user_id: userId, entry_date: date, updated_at: new Date().toISOString() }, { onConflict: "user_id,entry_date" });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function deleteSkin(date: string, ctx?: Ctx): Promise<Result> {
  const { supabase, userId } = await ctxOr(ctx);
  const { error } = await supabase.from("skin_logs").delete().eq("user_id", userId).eq("entry_date", date);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function listMedications(ctx?: Ctx): Promise<Medication[]> {
  const { supabase, userId } = await ctxOr(ctx);
  const { data, error } = await supabase
    .from("medications")
    .select("id, name, dose, kind, position")
    .eq("user_id", userId)
    .eq("archived", false)
    .order("position")
    .order("created_at");
  check(error, !ctx);
  return (data ?? []) as Medication[];
}

const medicationSchema = z.object({
  name: z.string().trim().min(1).max(100),
  dose: z.string().trim().max(100).nullish(),
  kind: z.enum(MEDICATION_KINDS).default("medication"),
});

export async function addMedication(input: z.input<typeof medicationSchema>, ctx?: Ctx): Promise<Result<{ id: string }>> {
  const parsed = medicationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { supabase, userId } = await ctxOr(ctx);
  const { count } = await supabase.from("medications").select("id", { count: "exact", head: true }).eq("user_id", userId);
  const { data, error } = await supabase
    .from("medications")
    .insert({ ...parsed.data, dose: parsed.data.dose || null, user_id: userId, position: count ?? 0 })
    .select("id")
    .single();
  return error ? { ok: false, error: error.message } : { ok: true, id: data.id };
}

/** Removes a medication from the list; its intake history stays. */
export async function archiveMedication(id: string, ctx?: Ctx): Promise<Result> {
  const { supabase, userId } = await ctxOr(ctx);
  const { error } = await supabase.from("medications").update({ archived: true }).eq("id", id).eq("user_id", userId);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function getMedicationLogs(from: string, to: string, ctx?: Ctx): Promise<MedicationLog[]> {
  const { supabase, userId } = await ctxOr(ctx);
  const { data, error } = await supabase
    .from("medication_logs")
    .select("id, medication_id, name, dose, entry_date, taken_at, source")
    .eq("user_id", userId)
    .gte("entry_date", from)
    .lte("entry_date", to)
    .order("taken_at", { ascending: false });
  check(error, !ctx);
  return (data ?? []) as MedicationLog[];
}

/** Marks a medication from the list as taken (or not taken) on a day. */
export async function setMedicationTaken(input: { medicationId: string; date: string; taken: boolean }, ctx?: Ctx): Promise<Result> {
  const parsed = z.object({ medicationId: uuid, date: dateSchema, taken: z.boolean() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { supabase, userId } = await ctxOr(ctx);
  const { medicationId, date, taken } = parsed.data;
  if (!taken) {
    const { error } = await supabase.from("medication_logs").delete().eq("user_id", userId).eq("medication_id", medicationId).eq("entry_date", date);
    return error ? { ok: false, error: error.message } : { ok: true };
  }
  const { data: med, error: me } = await supabase.from("medications").select("name, dose").eq("id", medicationId).eq("user_id", userId).maybeSingle();
  if (me || !med) return { ok: false, error: me?.message ?? "not_found" };
  const { count } = await supabase
    .from("medication_logs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("medication_id", medicationId)
    .eq("entry_date", date);
  if (count) return { ok: true };
  const { error } = await supabase.from("medication_logs").insert({ user_id: userId, medication_id: medicationId, name: med.name, dose: med.dose, entry_date: date });
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Logs an intake by name (used by Claude). Links to the user's list entry if the name matches. */
export async function logMedicationByName(input: { name: string; dose?: string | null; date: string; source?: "manual" | "claude" }, ctx?: Ctx): Promise<Result> {
  const parsed = z.object({ name: z.string().trim().min(1).max(100), dose: z.string().trim().max(100).nullish(), date: dateSchema, source: z.enum(["manual", "claude"]).default("manual") }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const c = await ctxOr(ctx);
  const meds = await listMedications(c);
  const match = meds.find((m) => m.name.toLowerCase() === parsed.data.name.toLowerCase());
  const { error } = await c.supabase.from("medication_logs").insert({
    user_id: c.userId,
    medication_id: match?.id ?? null,
    name: match?.name ?? parsed.data.name,
    dose: parsed.data.dose || match?.dose || null,
    entry_date: parsed.data.date,
    source: parsed.data.source,
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}
