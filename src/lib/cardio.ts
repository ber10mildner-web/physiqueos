import "server-only";
import type { Ctx } from "@/lib/data";
import { getProfile, getWeights } from "@/lib/data";
import type { CardioSession } from "@/lib/data/types";
import { ageOn, estimateCardioKcal, type KcalEstimate } from "@/lib/training/cardio-kcal";

export type CardioWithEstimate = CardioSession & { estimate: KcalEstimate | null };

/** Adds Sigma's best calorie estimate to each session, using the weight on that day and the profile. */
export async function withKcalEstimates(sessions: CardioSession[], ctx?: Ctx): Promise<CardioWithEstimate[]> {
  if (!sessions.length) return [];
  const [profile, weights] = await Promise.all([getProfile(ctx), getWeights(undefined, ctx)]);
  return sessions.map((s) => {
    // weight on that day, or the closest earlier one, or the first one after
    const before = weights.filter((w) => w.entry_date <= s.session_date).at(-1) ?? weights[0];
    const estimate = estimateCardioKcal(s, {
      weight_kg: before?.weight_kg ?? null,
      age: ageOn(profile?.birth_date ?? null, s.session_date),
      sex: profile?.sex ?? null,
    });
    return { ...s, estimate };
  });
}
