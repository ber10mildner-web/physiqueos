import "server-only";
/**
 * Per-user cost control for in-app Claude API calls: every call is recorded in
 * ai_usage with its real token cost; a new call only starts if the monthly
 * budget (AI_MONTHLY_BUDGET_EUR, default 2 €) still has room and, for meal
 * photos, the daily limit (AI_DAILY_PHOTO_LIMIT, default 15) is not reached.
 * Later, a paid plan can simply raise these limits per user.
 */
import type { Ctx } from "@/lib/data/core";
import { checkBudget, costEur, readLimits, type AiLimits, type BudgetCheck, type TokenUsage } from "./cost";

export type AiFeature = "meal_photo" | "cardio_display" | "food_label";

export const aiEnabled = () => Boolean(process.env.ANTHROPIC_API_KEY);

/** UTC instant of local midnight at the start of `iso` (YYYY-MM-DD) in `timeZone`. */
export function localMidnightUtc(iso: string, timeZone: string): Date {
  const noonUtc = new Date(`${iso}T12:00:00Z`);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(noonUtc)
      .map((p) => [p.type, p.value]),
  );
  const wall = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute));
  const offsetMs = wall - noonUtc.getTime();
  return new Date(Date.parse(`${iso}T00:00:00Z`) - offsetMs);
}

export interface AiUsageSummary extends AiLimits {
  enabled: boolean;
  monthEur: number;
  todayPhotos: number;
  monthPhotos: number;
}

export async function getAiUsage(ctx: Ctx, today: string, timeZone: string): Promise<AiUsageSummary> {
  const limits = readLimits();
  const since = localMidnightUtc(`${today.slice(0, 7)}-01`, timeZone).toISOString();
  const dayStart = localMidnightUtc(today, timeZone).getTime();
  const { data, error } = await ctx.supabase.from("ai_usage").select("feature, cost_eur, created_at").eq("user_id", ctx.userId).gte("created_at", since).limit(5000);
  if (error) throw new Error(`ai_usage: ${error.message}`);
  let monthEur = 0;
  let todayPhotos = 0;
  let monthPhotos = 0;
  for (const r of data ?? []) {
    monthEur += Number(r.cost_eur);
    if (r.feature === "meal_photo") {
      monthPhotos += 1;
      if (Date.parse(r.created_at as string) >= dayStart) todayPhotos += 1;
    }
  }
  return { ...limits, enabled: aiEnabled(), monthEur, todayPhotos, monthPhotos };
}

export async function canSpend(ctx: Ctx, today: string, timeZone: string, feature: AiFeature): Promise<BudgetCheck & { usage: AiUsageSummary }> {
  const usage = await getAiUsage(ctx, today, timeZone);
  return { ...checkBudget(usage, usage, feature === "meal_photo"), usage };
}

export async function recordUsage(ctx: Ctx, feature: AiFeature, model: string, usage: TokenUsage): Promise<number> {
  const cost = costEur(model, usage);
  const { error } = await ctx.supabase.from("ai_usage").insert({
    user_id: ctx.userId,
    feature,
    model: model.slice(0, 100),
    input_tokens: usage.input_tokens + (usage.cache_creation_input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0),
    output_tokens: usage.output_tokens,
    cost_eur: Math.round(cost * 100000) / 100000,
  });
  if (error) console.error("ai_usage insert failed", error);
  return cost;
}
