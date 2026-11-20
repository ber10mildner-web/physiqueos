import "server-only";
import { z } from "zod";
import { check, ctxOr, type Ctx } from "./core";
import { dateSchema, type Result } from "./mutations";
import type { DailyHealth } from "./types";

export async function getHealthRange(from: string, to: string, ctx?: Ctx): Promise<DailyHealth[]> {
  const { supabase, userId } = await ctxOr(ctx);
  const { data, error } = await supabase
    .from("daily_health")
    .select("entry_date, sleep_score, sleep_minutes, resting_hr, hrv_ms, body_battery, steps, stress, source")
    .eq("user_id", userId)
    .gte("entry_date", from)
    .lte("entry_date", to)
    .order("entry_date", { ascending: false });
  check(error, !ctx);
  return (data ?? []) as DailyHealth[];
}

const int = (min: number, max: number) => z.number().int().min(min).max(max).nullish();
export const healthSchema = z.object({
  date: dateSchema,
  sleep_score: int(0, 100),
  sleep_minutes: int(0, 1440),
  resting_hr: int(20, 200),
  hrv_ms: int(0, 300),
  body_battery: int(0, 100),
  steps: int(0, 200000),
  stress: int(0, 100),
  source: z.enum(["manual", "garmin", "claude"]).default("manual"),
});

/** Upserts one day. Fields that are not given are left unchanged. */
export async function upsertHealth(input: z.input<typeof healthSchema>, ctx?: Ctx): Promise<Result> {
  const parsed = healthSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { supabase, userId } = await ctxOr(ctx);
  const { date, ...values } = parsed.data;
  const row: Record<string, unknown> = { user_id: userId, entry_date: date, updated_at: new Date().toISOString(), source: values.source };
  for (const [k, v] of Object.entries(values)) if (v !== undefined && k !== "source") row[k] = v;
  const { error } = await supabase.from("daily_health").upsert(row, { onConflict: "user_id,entry_date" });
  return error ? { ok: false, error: error.message } : { ok: true };
}
