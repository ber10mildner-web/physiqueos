import "server-only";
/**
 * Routines: cardio templates, supplements and fixed meals that log themselves on chosen weekdays
 * (supplements also every N days and in on/off cycles, see lib/medication-schedule).
 *
 * There is no per-user background job. Instead, whenever the app or Claude reads
 * data, ensureRoutines() fills in what is due for the last few days. Each automatic
 * entry is recorded in routine_runs first, so an entry the user deleted (e.g. skipped
 * the walk that day) is never added again.
 */
import { cache } from "react";
import { ctxOr, type Ctx } from "./core";
import { PLAN_AHEAD_DAYS, addDays } from "@/lib/dates";
import { isoWeekday } from "@/lib/nutrition/goal-days";
import { hasSchedule, isDue, type MedicationSchedule } from "@/lib/medication-schedule";
import { listCardioTemplates, logCardioTemplate } from "./training";
import { listMedications, recordIntake } from "./wellbeing";
import { applyMealTemplate, listMealTemplates } from "./meal-templates";

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

/** Of `dates`, the ones on which an item with these weekdays is due (never before `autoFrom`). */
export function dueAmong(autoDays: number[], autoFrom: string, dates: string[]): string[] {
  return dates.filter((d) => d >= autoFrom && autoDays.includes(isoWeekday(d)));
}

/** Like dueDates, for a medication / supplement with weekdays, an every-N-days rhythm and/or an on/off cycle. */
export function medicationDueDates(m: MedicationSchedule & { auto_from: string }, today: string, backfill = ROUTINE_BACKFILL_DAYS): string[] {
  if (!hasSchedule(m)) return [];
  const out: string[] = [];
  for (let i = backfill - 1; i >= 0; i--) {
    const d = addDays(today, -i);
    // auto_from = last save: never back-fill days before the user set this up or changed it
    if (d >= m.auto_from && isDue(m, d)) out.push(d);
  }
  return out;
}

type Run = { kind: "cardio" | "supplement" | "meal"; ref_id: string; run_date: string };

/**
 * Claims the runs. Rows that already exist are skipped and not returned,
 * so two requests at the same time never create the same entry twice.
 * Null when routine_runs can't be written (e.g. a migration not run yet).
 */
async function claim(wanted: Run[], c: Ctx): Promise<Run[] | null> {
  const { data, error } = await c.supabase
    .from("routine_runs")
    .upsert(wanted.map((w) => ({ ...w, user_id: c.userId })), { onConflict: "user_id,kind,ref_id,run_date", ignoreDuplicates: true })
    .select("kind, ref_id, run_date");
  if (error) {
    console.error("routines", error.message);
    return null;
  }
  return (data ?? []) as Run[];
}

async function run(today: string, c: Ctx): Promise<number> {
  const [templates, meds, meals] = await Promise.all([listCardioTemplates(c), listMedications(c), listMealTemplates(c)]);
  const wanted: Run[] = [
    ...templates.flatMap((t) => dueDates(t.auto_days, t.auto_from, today).map((d) => ({ kind: "cardio" as const, ref_id: t.id, run_date: d }))),
    ...meds.flatMap((m) => medicationDueDates(m, today).map((d) => ({ kind: "supplement" as const, ref_id: m.id, run_date: d }))),
    ...meals.flatMap((m) => dueDates(m.auto_days, m.auto_from, today).map((d) => ({ kind: "meal" as const, ref_id: m.id, run_date: d }))),
  ];
  if (!wanted.length) return 0;
  const claimed = await claim(wanted, c);
  if (!claimed) return 0; // the app keeps working without routines
  let made = 0;
  for (const r of claimed) {
    if (r.kind === "cardio") {
      const t = templates.find((x) => x.id === r.ref_id);
      if (!t) continue;
      // the watch already recorded this kind of session that day: don't add it twice
      const { count } = await c.supabase
        .from("cardio_sessions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", c.userId)
        .eq("session_date", r.run_date)
        .eq("activity", t.activity)
        .neq("source", "manual");
      if (!count && (await logCardioTemplate(t, r.run_date, c)).ok) made++;
    } else if (r.kind === "meal") {
      const m = meals.find((x) => x.id === r.ref_id);
      if (m && (await applyMealTemplate(m, r.run_date, c))) made++;
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

/**
 * Fixed meals for days ahead (up to PLAN_AHEAD_DAYS), so a planned day already shows
 * its fixed breakfast etc. and the user can plan the rest around it. Only meals:
 * cardio and supplements still log themselves on the day. If the fixed meal changes
 * or is removed later, removePlannedMeals() takes these entries out again.
 */
export async function ensurePlannedMeals(dates: string[], today: string, ctx?: Ctx): Promise<number> {
  const ahead = dates.filter((d) => d > today && d <= addDays(today, PLAN_AHEAD_DAYS));
  if (!ahead.length) return 0;
  try {
    const c = await ctxOr(ctx);
    const meals = await listMealTemplates(c);
    const wanted: Run[] = meals.flatMap((m) => dueAmong(m.auto_days, m.auto_from, ahead).map((d) => ({ kind: "meal" as const, ref_id: m.id, run_date: d })));
    if (!wanted.length) return 0;
    let made = 0;
    for (const r of (await claim(wanted, c)) ?? []) {
      const m = meals.find((x) => x.id === r.ref_id);
      if (m && (await applyMealTemplate(m, r.run_date, c))) made++;
    }
    return made;
  } catch (e) {
    console.error("planned meals", e);
    return 0;
  }
}
