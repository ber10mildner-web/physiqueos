"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { isIsoDate } from "@/lib/dates";
import { PHOTO_BUCKET } from "@/lib/data";

export type ActionResult = { ok: true } | { ok: false; error: string };

const schema = z.object({
  storage_path: z.string().regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|webp)$/),
  taken_on: z.string().refine(isIsoDate),
  pose: z.enum(["front", "side", "back", "other"]),
  width: z.number().int().positive().max(10000),
  height: z.number().int().positive().max(10000),
});

/** Records a photo after the browser uploaded it to the private bucket. */
export async function recordPhoto(input: z.input<typeof schema>): Promise<ActionResult> {
  const { supabase, userId } = await requireUser();
  const parsed = schema.safeParse(input);
  if (!parsed.success || !parsed.data.storage_path.startsWith(`${userId}/`)) return { ok: false, error: "invalid" };
  const { error } = await supabase.from("progress_photos").insert({ ...parsed.data, user_id: userId });
  if (error) {
    await supabase.storage.from(PHOTO_BUCKET).remove([parsed.data.storage_path]);
    return { ok: false, error: error.message };
  }
  revalidatePath("/body/photos");
  return { ok: true };
}

export async function deletePhoto(id: string): Promise<ActionResult> {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase.from("progress_photos").select("storage_path").eq("id", id).eq("user_id", userId).maybeSingle();
  if (error || !data) return { ok: false, error: error?.message ?? "not_found" };
  const { error: se } = await supabase.storage.from(PHOTO_BUCKET).remove([data.storage_path]);
  if (se) return { ok: false, error: se.message };
  const { error: de } = await supabase.from("progress_photos").delete().eq("id", id).eq("user_id", userId);
  if (de) return { ok: false, error: de.message };
  revalidatePath("/body/photos");
  return { ok: true };
}
