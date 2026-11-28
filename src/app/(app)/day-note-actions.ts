"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { saveDayNote } from "@/lib/data/day-notes";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function saveDayNoteAction(input: { date: string; note: string | null; tags: string[] }): Promise<ActionResult> {
  const res = await saveDayNote({ date: input.date, note: input.note, tags: input.tags as never, source: "manual" }, await requireUser());
  if (res.ok) {
    revalidatePath("/");
    revalidatePath("/nutrition");
    revalidatePath("/week");
  }
  return res;
}
