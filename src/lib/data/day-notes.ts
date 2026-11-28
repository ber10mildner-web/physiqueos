import "server-only";
/** Day notes: a small journal per day (free text + tags), one entry per day. */
import { z } from "zod";
import { check, ctxOr, type Ctx } from "./core";
import { dateSchema, type Result } from "./mutations";
import { DAY_TAGS, type DayNote } from "./types";

export const DAY_NOTE_MAX = 2000;

export async function getDayNotes(from: string, to: string, ctx?: Ctx): Promise<DayNote[]> {
  const { supabase, userId } = await ctxOr(ctx);
  const { data, error } = await supabase
    .from("day_notes")
    .select("entry_date, note, tags, source")
    .eq("user_id", userId)
    .gte("entry_date", from)
    .lte("entry_date", to)
    .order("entry_date", { ascending: false });
  check(error, !ctx);
  return (data ?? []) as DayNote[];
}

export async function getDayNote(date: string, ctx?: Ctx): Promise<DayNote | null> {
  return (await getDayNotes(date, date, ctx))[0] ?? null;
}

export const dayNoteSchema = z.object({
  date: dateSchema,
  note: z.string().trim().max(DAY_NOTE_MAX).nullish(),
  tags: z.array(z.enum(DAY_TAGS)).max(DAY_TAGS.length).default([]),
  source: z.enum(["manual", "claude"]).default("manual"),
});

/** Saves a day's note (replaces it). An empty note without tags deletes the day's entry. */
export async function saveDayNote(input: z.input<typeof dayNoteSchema>, ctx?: Ctx): Promise<Result> {
  const parsed = dayNoteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { supabase, userId } = await ctxOr(ctx);
  const { date, note, tags, source } = parsed.data;
  const unique = [...new Set(tags)];
  if (!note && !unique.length) {
    const { error } = await supabase.from("day_notes").delete().eq("user_id", userId).eq("entry_date", date);
    return error ? { ok: false, error: error.message } : { ok: true };
  }
  const { error } = await supabase
    .from("day_notes")
    .upsert({ user_id: userId, entry_date: date, note: note || null, tags: unique, source, updated_at: new Date().toISOString() }, { onConflict: "user_id,entry_date" });
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Joins an existing note and an addition (used by Claude so it never overwrites what the user wrote). */
export function appendNote(existing: string | null, addition: string | null | undefined): string | null {
  const a = existing?.trim() ?? "";
  const b = addition?.trim() ?? "";
  if (!b) return a || null;
  if (!a) return b;
  if (a.includes(b)) return a;
  return `${a}\n${b}`;
}

/** Adds text and tags to a day's note, keeping what is already there. */
export async function addToDayNote(
  input: { date: string; note?: string | null; tags?: string[]; replace?: boolean; source?: "manual" | "claude" },
  ctx?: Ctx,
): Promise<Result<{ note: DayNote | null }>> {
  const existing = input.replace ? null : await getDayNote(input.date, ctx);
  const note = appendNote(existing?.note ?? null, input.note);
  if (note && note.length > DAY_NOTE_MAX) return { ok: false, error: `note too long (max ${DAY_NOTE_MAX} characters in total)` };
  const tags = [...new Set([...(existing?.tags ?? []), ...(input.tags ?? [])])];
  const res = await saveDayNote({ date: input.date, note, tags: tags as never, source: input.source ?? "manual" }, ctx);
  if (!res.ok) return res;
  return { ok: true, note: await getDayNote(input.date, ctx) };
}
