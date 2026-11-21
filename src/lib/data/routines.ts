import "server-only";
/**
 * Routines: cardio templates and supplements that log themselves on chosen weekdays.
 *
 * There is no per-user background job. Instead, whenever the app or Claude reads
 * data, ensureRoutines() fills in what is due for the last few days. Each automatic
 * entry is recorded in routine_runs first, so an entry the user deleted (e.g. skipped
 * the walk that day) is never added again.
 */
import { cache } from "react";
import { ctxOr, type Ctx } from "./core";
import { addDays } from "@/lib/dates";
import { isoWeekday } from "@/lib/nutrition/goal-days";
import { listCardioTemplates, logCardioTemplate } from "./training";
import { listMedications, recordIntake } from "./wellbeing";

/** How many days back missed automatic entries are filled in (today included). */
export const ROUTINE_BACKFILL_DAYS = 7;

/** Days on which an item with these weekdays is due, from `autoFrom` up to `today`, newest last. */
export function dueDates(autoDays: number[], autoFrom: string, today: string, backfill = ROUTINE_BACKFILL_DAYS): string[] {
  if (!autoDays.length) return [];
  const out: string[] = [];
  for (let i = backfill - 1; i >= 0; i--) {
    const d = addDays(today, -i);
    if (d >= autoFrom && autoDays.includes(isoWeekday(d))) out.push(d);
  }
  return out;
}

type Run = { kind: "cardio" | "supplement"; ref_id: string; run_date: string };

async function run(today: string, c: Ctx): Promise<number> {
  const [templates, meds] = await Promise.all([listCardioTemplates(c), listMedications(c)]);
  const wanted: Run[] = [
    ...templates.flatMap((t) => dueDates(t.auto_days, t.auto_from, today).map((d) => ({ kind: "cardio" as const, ref_id: t.id, run_date: d }))),
    ...meds.flatMap((m) => dueDates(m.auto_days, m.auto_from, today).map((d) => ({ kind: "supplement" as const, ref_id: m.id, run_date: d }))),
  ];
  if (!wanted.length) return 0;
  // Claim the runs. Rows that already exist are skipped and not returned,
  // so two requests at the same time never create the same entry twice.
  const { data, error } = await c.supabase
    .from("routine_runs")
    .upsert(wanted.map((w) => ({ ...w, user_id: c.userId })), { onConflict: "user_id,kind,ref_id,run_date", ignoreDuplicates: true })
    .select("kind, ref_id, run_date");
  if (error) {
    // e.g. migration not run yet: the app keeps working without routines
    console.error("routines", error.message);
    return 0;
  }
  let made = 0;
  for (const r of (data ?? []) as Run[]) {
    if (r.kind === "cardio") {
      const t = templates.find((x) => x.id === r.ref_id);
      if (t && (await logCardioTemplate(t, r.run_date, c)).ok) made++;
    } else {
      const m = meds.find((x) => x.id === r.ref_id);
      if (!m) continue;
      // don't double up if it was already ticked off by hand that day
      const { count } = await c.supabase
        .from("medication_logs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", c.userId)
        .eq("medication_id", m.id)
        .eq("entry_date", r.run_date);
      if (!count && (await recordIntake(m, r.run_date, "manual", c)).ok) made++;
    }
  }
  return made;
}

const runForWeb = cache(async (today: string) => run(today, await ctxOr()));

/** Adds due automatic entries. Safe to call often; runs once per request in the web app. */
export async function ensureRoutines(today: string, ctx?: Ctx): Promise<number> {
  try {
    return ctx ? await run(today, ctx) : await runForWeb(today);
  } catch (e) {
    console.error("routines", e);
    return 0;
  }
}
