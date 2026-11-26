import { resolveToken } from "@/lib/token-auth";
import { getDiary, getGoalOn } from "@/lib/data";
import { ensureRoutines } from "@/lib/data/routines";
import { sumItems } from "@/lib/nutrition/calc";
import { todayIn } from "@/lib/dates";

/**
 * Today's remaining calories and macros for a home / lock screen widget
 * (e.g. the free iPhone app Scriptable, see /settings/widget):
 * GET https://<app>/api/widget/<widget token>
 * Read-only, only this summary, only with a widget token.
 */
const KEYS = ["energy_kcal", "protein_g", "carbs_g", "fat_g", "fiber_g"] as const;

export async function GET(_req: Request, ctx: RouteContext<"/api/widget/[token]">) {
  const { token } = await ctx.params;
  const auth = await resolveToken(token, "widget");
  if (!auth.ok) return auth.response;
  const c = { supabase: auth.admin, userId: auth.userId };
  const date = todayIn(auth.timeZone);
  await ensureRoutines(date, c); // automatic supplements / fixed meals count too
  const [entries, goal] = await Promise.all([getDiary(date, c), getGoalOn(date, c)]);
  const totals = sumItems(entries);
  const body = {
    date,
    ...Object.fromEntries(
      KEYS.map((k) => {
        const eaten = Math.round(totals[k].value);
        const target = goal?.[k] ?? null;
        return [k.replace(/_(g|kcal)$/, ""), { eaten, goal: target, left: target === null ? null : Math.round(target - totals[k].value) }];
      }),
    ),
  };
  return Response.json(body, { headers: { "Cache-Control": "no-store" } });
}
