import "server-only";
/** Skin log (one entry per day) and medications / supplements with intake log. */
import { z } from "zod";
import { check, ctxOr, num, type Ctx } from "./core";
import { NUTRIENT_KEYS, sanitizeNutrients, type NutrientMap } from "@/lib/nutrition/nutrients";
import { dateSchema, type Result } from "./mutations";
import { addDays } from "@/lib/dates";
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

const MED_COLUMNS = "id, name, dose, kind, position, nutrients, dose_g, auto_days, auto_from";

function mapMedication(r: Record<string, unknown>): Medication {
  const n = r.nutrients ? sanitizeNutrients(r.nutrients) : null;
  return {
    ...(r as unknown as Medication),
    nutrients: n && Object.keys(n).length ? n : null,
    dose_g: num(r.dose_g),
    auto_days: ((r.auto_days as number[] | null) ?? []).map(Number),
  };
}

export async function listMedications(ctx?: Ctx): Promise<Medication[]> {
  const { supabase, userId } = await ctxOr(ctx);
  const { data, error } = await supabase
    .from("medications")
    .select(MED_COLUMNS)
    .eq("user_id", userId)
    .eq("archived", false)
    .order("position")
    .order("created_at");
  check(error, !ctx);
  return (data ?? []).map(mapMedication);
}

const nutrientValue = z.number().min(0).max(100000);
const medicationSchema = z.object({
  id: uuid.optional(),
  name: z.string().trim().min(1).max(100),
  dose: z.string().trim().max(100).nullish(),
  kind: z.enum(MEDICATION_KINDS).default("medication"),
  /** Nutrients of one dose. */
  nutrients: z.partialRecord(z.enum(NUTRIENT_KEYS), nutrientValue).nullish(),
  dose_g: z.number().positive().max(1000).nullish(),
  auto_days: z.array(z.number().int().min(1).max(7)).max(7).default([]),
  /** Today in the user's time zone: automatic intake starts from here. */
  today: dateSchema.optional(),
});

/** Adds a medication / supplement, or updates it when an id is given. */
export async function saveMedication(input: z.input<typeof medicationSchema>, ctx?: Ctx): Promise<Result<{ id: string }>> {
  const parsed = medicationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { supabase, userId } = await ctxOr(ctx);
  const { id, today, ...d } = parsed.data;
  const nutrients = d.nutrients ? sanitizeNutrients(d.nutrients) : null;
  const row = {
    name: d.name,
    dose: d.dose || null,
    kind: d.kind,
    nutrients: nutrients && Object.keys(nutrients).length ? nutrients : null,
    dose_g: d.dose_g ?? null,
    auto_days: [...new Set(d.auto_days)].sort(),
    ...(today ? { auto_from: today } : {}),
  };
  if (id) {
    const { data, error } = await supabase.from("medications").update(row).eq("id", id).eq("user_id", userId).select("id").maybeSingle();
    if (error || !data) return { ok: false, error: error?.message ?? "not_found" };
    // values added or changed later also count for intakes already ticked off this week
    if (today) {
      const med = await getMedication(id, { supabase, userId });
      if (med) {
        const synced = await syncRecentIntakes(med, today, { supabase, userId });
        if (!synced.ok) return synced;
      }
    }
    return { ok: true, id };
  }
  const { count } = await supabase.from("medications").select("id", { count: "exact", head: true }).eq("user_id", userId);
  const { data, error } = await supabase
    .from("medications")
    .insert({ ...row, user_id: userId, position: count ?? 0 })
    .select("id")
    .single();
  return error ? { ok: false, error: error.message } : { ok: true, id: data.id };
}

/** Kept for callers that only add (name, dose, kind). */
export const addMedication = (input: { name: string; dose?: string | null; kind?: Medication["kind"] }, ctx?: Ctx) => saveMedication(input, ctx);

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

/** Diary values for one dose: per 100 g plus the amount, so totals come out right. */
export function supplementDiaryValues(nutrients: NutrientMap, doseG: number | null): { per100g: NutrientMap; amount_g: number } {
  const amount = doseG && doseG > 0 ? doseG : 1;
  const per100g: NutrientMap = {};
  for (const [k, v] of Object.entries(nutrients) as [keyof NutrientMap, number][]) per100g[k] = Math.round(((v * 100) / amount) * 10000) / 10000;
  return { per100g, amount_g: amount };
}

/**
 * Records one intake. Supplements with nutrients also get a diary entry (meal "snack"),
 * linked to the intake so removing the intake removes the entry too.
 */
export async function recordIntake(med: Medication, date: string, source: "manual" | "claude", ctx: Ctx): Promise<Result> {
  const { supabase, userId } = ctx;
  const { data: log, error } = await supabase
    .from("medication_logs")
    .insert({ user_id: userId, medication_id: med.id, name: med.name, dose: med.dose, entry_date: date, source })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  if (!med.nutrients) return { ok: true };
  const { per100g, amount_g } = supplementDiaryValues(med.nutrients, med.dose_g);
  const { error: de } = await supabase.from("diary_entries").insert({
    user_id: userId,
    entry_date: date,
    meal: "snack",
    food_id: null,
    food_name: med.name,
    food_brand: med.dose,
    source: "custom",
    source_id: null,
    nutrients_per_100g: per100g,
    amount_g,
    medication_log_id: log.id,
  });
  return de ? { ok: false, error: de.message } : { ok: true };
}

/** Days back (today included) whose intakes follow edited supplement values. */
export const INTAKE_SYNC_DAYS = 7;

/**
 * Rewrites the diary entries of a supplement's intakes from the last week so they
 * match its current nutrients: creates missing ones (ticked off before values were
 * entered), updates changed ones, removes them if the nutrients were cleared.
 */
export async function syncRecentIntakes(med: Medication, today: string, ctx: Ctx): Promise<Result> {
  const { supabase, userId } = ctx;
  const from = addDays(today, -(INTAKE_SYNC_DAYS - 1));
  const { data: logs, error } = await supabase
    .from("medication_logs")
    .select("id, entry_date, dose")
    .eq("user_id", userId)
    .eq("medication_id", med.id)
    .gte("entry_date", from)
    .lte("entry_date", today);
  if (error) return { ok: false, error: error.message };
  if (!logs?.length) return { ok: true };
  const ids = logs.map((l) => l.id as string);
  const { error: de } = await supabase.from("diary_entries").delete().eq("user_id", userId).in("medication_log_id", ids);
  if (de) return { ok: false, error: de.message };
  if (!med.nutrients) return { ok: true };
  const { per100g, amount_g } = supplementDiaryValues(med.nutrients, med.dose_g);
  const { error: ie } = await supabase.from("diary_entries").insert(
    logs.map((l) => ({
      user_id: userId,
      entry_date: l.entry_date,
      meal: "snack",
      food_id: null,
      food_name: med.name,
      food_brand: med.dose,
      source: "custom",
      source_id: null,
      nutrients_per_100g: per100g,
      amount_g,
      medication_log_id: l.id,
    })),
  );
  return ie ? { ok: false, error: ie.message } : { ok: true };
}

async function getMedication(id: string, ctx: Ctx): Promise<Medication | null> {
  const { data, error } = await ctx.supabase.from("medications").select(MED_COLUMNS).eq("id", id).eq("user_id", ctx.userId).maybeSingle();
  if (error || !data) return null;
  return mapMedication(data);
}

/** Marks a medication from the list as taken (or not taken) on a day. */
export async function setMedicationTaken(input: { medicationId: string; date: string; taken: boolean }, ctx?: Ctx): Promise<Result> {
  const parsed = z.object({ medicationId: uuid, date: dateSchema, taken: z.boolean() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const c = await ctxOr(ctx);
  const { medicationId, date, taken } = parsed.data;
  if (!taken) {
    // the linked diary entry goes away with the intake (on delete cascade)
    const { error } = await c.supabase.from("medication_logs").delete().eq("user_id", c.userId).eq("medication_id", medicationId).eq("entry_date", date);
    return error ? { ok: false, error: error.message } : { ok: true };
  }
  const med = await getMedication(medicationId, c);
  if (!med) return { ok: false, error: "not_found" };
  const { count } = await c.supabase
    .from("medication_logs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", c.userId)
    .eq("medication_id", medicationId)
    .eq("entry_date", date);
  if (count) return { ok: true };
  return recordIntake(med, date, "manual", c);
}

/** Logs an intake by name (used by Claude). Links to the user's list entry if the name matches. */
export async function logMedicationByName(input: { name: string; dose?: string | null; date: string; source?: "manual" | "claude" }, ctx?: Ctx): Promise<Result> {
  const parsed = z.object({ name: z.string().trim().min(1).max(100), dose: z.string().trim().max(100).nullish(), date: dateSchema, source: z.enum(["manual", "claude"]).default("manual") }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const c = await ctxOr(ctx);
  const meds = await listMedications(c);
  const match = meds.find((m) => m.name.toLowerCase() === parsed.data.name.toLowerCase());
  if (match) return recordIntake({ ...match, dose: parsed.data.dose || match.dose }, parsed.data.date, parsed.data.source, c);
  const { error } = await c.supabase.from("medication_logs").insert({
    user_id: c.userId,
    medication_id: null,
    name: parsed.data.name,
    dose: parsed.data.dose || null,
    entry_date: parsed.data.date,
    source: parsed.data.source,
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}
