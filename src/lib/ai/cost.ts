/**
 * Cost of in-app Claude API calls, for the per-user budget (see usage.ts).
 * Prices in US$ per million tokens (platform.claude.com pricing, Nov 2026).
 * Thinking tokens are billed as output and are included in output_tokens.
 */
const PRICES_USD: Record<string, { input: number; output: number }> = {
  "claude-opus-5-5": { input: 4, output: 20 },
  "claude-opus-5": { input: 5, output: 25 },
  "claude-opus-4-8": { input: 5, output: 25 },
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5 },
};
/** Unknown models (e.g. a server-side fallback) are priced like the most expensive Opus. */
const FALLBACK_PRICE = { input: 5, output: 25 };

/** Deliberately a little high so the budget errs on the safe side. */
export const USD_TO_EUR = 0.95;

export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
}

export function costEur(model: string, usage: TokenUsage): number {
  const p = PRICES_USD[model.replace(/-\d{8}$/, "")] ?? FALLBACK_PRICE;
  const input = usage.input_tokens + (usage.cache_creation_input_tokens ?? 0) * 1.25 + (usage.cache_read_input_tokens ?? 0) * 0.1;
  return ((input * p.input + usage.output_tokens * p.output) / 1_000_000) * USD_TO_EUR;
}

export interface AiLimits {
  monthlyBudgetEur: number;
  dailyPhotoLimit: number;
}

/** Most a single photo call can cost (several images + thinking); a call only starts if this much budget is left. */
export const MAX_CALL_EUR = 0.05;

export function readLimits(env: Record<string, string | undefined> = process.env): AiLimits {
  const n = (v: string | undefined, d: number) => (v && Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : d);
  return { monthlyBudgetEur: n(env.AI_MONTHLY_BUDGET_EUR, 2), dailyPhotoLimit: n(env.AI_DAILY_PHOTO_LIMIT, 15) };
}

export type BudgetCheck = { ok: true } | { ok: false; reason: "budget" | "daily_limit" };

export function checkBudget(used: { monthEur: number; todayPhotos: number }, limits: AiLimits, countsAsPhoto: boolean): BudgetCheck {
  if (used.monthEur + MAX_CALL_EUR > limits.monthlyBudgetEur) return { ok: false, reason: "budget" };
  if (countsAsPhoto && used.todayPhotos >= limits.dailyPhotoLimit) return { ok: false, reason: "daily_limit" };
  return { ok: true };
}
