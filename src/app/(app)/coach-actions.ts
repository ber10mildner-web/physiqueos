"use server";
import { revalidatePath } from "next/cache";
import { getToday, requireUser } from "@/lib/auth";
import { loadCoach } from "@/lib/coach";

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Applies the adaptive calorie suggestion as a new goal from today. The
 * suggestion is computed again on the server; nothing from the client is trusted.
 */
export async function applyCalorieSuggestion(expectedChange: number): Promise<ActionResult> {
  const ctx = await requireUser();
  const today = await getToday();
  const coach = await loadCoach(today, ctx);
  const s = coach.suggestion;
  const g = coach.nutritionGoal;
  if (!s || !g) return { ok: false, error: "no_suggestion" };
  // The numbers changed in the meantime (e.g. new weigh-in): let the user look again.
  if (s.change !== expectedChange) return { ok: false, error: "changed" };
  const row = {
    user_id: ctx.userId,
    valid_from: today,
    phase: g.phase,
    ...s.base,
    alt_days: s.alt ? g.alt_days : [],
    alt_energy_kcal: s.alt?.energy_kcal ?? null,
    alt_protein_g: s.alt?.protein_g ?? null,
    alt_carbs_g: s.alt?.carbs_g ?? null,
    alt_fat_g: s.alt?.fat_g ?? null,
    alt_fiber_g: s.alt?.fiber_g ?? null,
  };
  const { error } = await ctx.supabase.from("nutrition_goals").upsert(row, { onConflict: "user_id,valid_from" });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}
