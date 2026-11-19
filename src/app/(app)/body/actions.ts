"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { isIsoDate } from "@/lib/dates";

export type ActionResult = { ok: true } | { ok: false; error: string };

const weightSchema = z.object({
  entry_date: z.string().refine(isIsoDate),
  weight_kg: z.preprocess((v) => Number(String(v).replace(",", ".")), z.number().min(20).max(400)),
  note: z.string().trim().max(500).transform((v) => v || null),
});

/** One weight per day: logging again on the same date replaces the value. */
export async function saveWeight(formData: FormData): Promise<ActionResult> {
  const { supabase, userId } = await requireUser();
  const parsed = weightSchema.safeParse({
    entry_date: formData.get("entry_date"),
    weight_kg: formData.get("weight_kg"),
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { error } = await supabase
    .from("weight_entries")
    .upsert({ ...parsed.data, weight_kg: Math.round(parsed.data.weight_kg * 100) / 100, user_id: userId }, { onConflict: "user_id,entry_date" });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteWeight(id: string): Promise<ActionResult> {
  const { supabase, userId } = await requireUser();
  const { error } = await supabase.from("weight_entries").delete().eq("id", id).eq("user_id", userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}
