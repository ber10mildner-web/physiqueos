"use server";
import { revalidatePath } from "next/cache";
import { getToday, requireUser } from "@/lib/auth";
import { upsertWeight } from "@/lib/data/mutations";
import { upsertHealth } from "@/lib/data/health";
import { archiveMedication, saveMedication, setMedicationTaken, upsertSkin } from "@/lib/data/wellbeing";

export type ActionResult = { ok: true } | { ok: false; error: string };

/** One weight per day: logging again on the same date replaces the value. */
export async function saveWeight(formData: FormData): Promise<ActionResult> {
  const res = await upsertWeight(
    {
      date: String(formData.get("entry_date") ?? ""),
      weight_kg: Number(String(formData.get("weight_kg") ?? "").replace(",", ".")),
      note: String(formData.get("note") ?? "").trim() || null,
    },
    await requireUser(),
  );
  if (res.ok) revalidatePath("/", "layout");
  return res;
}

export async function deleteWeight(id: string): Promise<ActionResult> {
  const { supabase, userId } = await requireUser();
  const { error } = await supabase.from("weight_entries").delete().eq("id", id).eq("user_id", userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function saveHealth(input: {
  date: string;
  sleep_score: number | null;
  sleep_minutes: number | null;
  resting_hr: number | null;
  hrv_ms: number | null;
  body_battery: number | null;
  steps: number | null;
  stress: number | null;
}): Promise<ActionResult> {
  // Only send fields the user actually filled in, so existing values stay untouched.
  const values = Object.fromEntries(Object.entries(input).filter(([, v]) => v !== null));
  const res = await upsertHealth({ ...values, date: input.date, source: "manual" } as Parameters<typeof upsertHealth>[0], await requireUser());
  if (res.ok) revalidatePath("/body");
  return res;
}

export async function saveSkin(input: { date: string; score: number; areas: string[]; note: string | null }): Promise<ActionResult> {
  const res = await upsertSkin(input as Parameters<typeof upsertSkin>[0], await requireUser());
  if (res.ok) revalidatePath("/body");
  return res;
}

export async function setMedicationTakenAction(input: { medicationId: string; date: string; taken: boolean }): Promise<ActionResult> {
  const res = await setMedicationTaken(input, await requireUser());
  if (res.ok) revalidatePath("/", "layout");
  return res;
}

export async function saveMedicationAction(input: {
  id?: string;
  name: string;
  dose: string | null;
  kind: string;
  nutrients: Record<string, number> | null;
  dose_g: number | null;
  auto_days: number[];
}): Promise<ActionResult> {
  const res = await saveMedication({ ...(input as Parameters<typeof saveMedication>[0]), today: await getToday() }, await requireUser());
  // supplements with nutrients change the diary too
  if (res.ok) revalidatePath("/", "layout");
  return res.ok ? { ok: true } : res;
}

export async function archiveMedicationAction(id: string): Promise<ActionResult> {
  const res = await archiveMedication(id, await requireUser());
  if (res.ok) revalidatePath("/body");
  return res;
}
