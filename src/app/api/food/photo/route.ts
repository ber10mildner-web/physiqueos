import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTimeZone } from "@/lib/auth";
import { todayIn } from "@/lib/dates";
import { searchMyFoods } from "@/lib/data";
import { searchBasic } from "@/lib/food-sources/basic";
import { searchOff } from "@/lib/food-sources/openfoodfacts";
import { searchUsda } from "@/lib/food-sources/usda";
import type { FoodCandidate } from "@/lib/food-sources/types";
import { analyseMealPhoto, type AnalysedIngredient } from "@/lib/ai/meal-photo";
import { aiEnabled, canSpend, recordUsage } from "@/lib/ai/usage";
import { DEFAULT_LOSS_PCT, isWater, waterCandidate } from "@/lib/nutrition/cooking";
import { pickMatch } from "@/lib/nutrition/photo-match";
import type { PhotoAnalysis } from "@/lib/nutrition/photo-types";

export const maxDuration = 60;

const MAX_IMAGE_BYTES = 3_000_000;

async function imageOf(v: FormDataEntryValue | null): Promise<Buffer | null> {
  if (!v || typeof v === "string" || v.size === 0) return null;
  if (v.size > MAX_IMAGE_BYTES || !/^image\/jpe?g$/.test(v.type)) throw new Error("image");
  return Buffer.from(await v.arrayBuffer());
}

const settled = (r: PromiseSettledResult<FoodCandidate[]>): FoodCandidate[] => (r.status === "fulfilled" ? r.value : []);

/** Looks every ingredient up in Sigma's sources (see photo-match.ts). External sources only where needed. */
async function lookup(ing: AnalysedIngredient, ctx: { supabase: Awaited<ReturnType<typeof createClient>>; userId: string }) {
  if (isWater(ing.search) || isWater(ing.name)) return { match: waterCandidate(), alternatives: [] as FoodCandidate[] };
  const basic = searchBasic(ing.search, "de", 4);
  const mine: FoodCandidate[] = await searchMyFoods(ing.search, 5, ctx).catch(() => []);
  const needOff = ing.branded || (basic.length === 0 && mine.length === 0);
  const needUsda = !ing.branded && basic.length === 0;
  const [off, usda] = await Promise.allSettled([needOff ? searchOff(ing.search, "de", 5) : Promise.resolve([]), needUsda && ing.search_en ? searchUsda(ing.search_en, 4) : Promise.resolve([])]);
  return pickMatch(ing.branded, { mine, basic, openfoodfacts: settled(off), usda: settled(usda) });
}

export async function POST(req: NextRequest) {
  if (!aiEnabled()) return NextResponse.json({ error: "disabled" }, { status: 400 });
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const ctx = { supabase, userId };

  let form: FormData;
  let foodPhoto: Buffer | null;
  let recipePhotos: Buffer[];
  try {
    form = await req.formData();
    foodPhoto = await imageOf(form.get("food"));
    recipePhotos = (await Promise.all(form.getAll("recipe").slice(0, 3).map(imageOf))).filter((b): b is Buffer => b !== null);
  } catch {
    return NextResponse.json({ error: "image" }, { status: 400 });
  }
  const recipeText = String(form.get("recipeText") ?? "").slice(0, 4000);
  const notes = String(form.get("notes") ?? "").slice(0, 1000);
  const eaten = Number(form.get("eatenG"));
  if (!foodPhoto && recipePhotos.length === 0 && !recipeText.trim()) return NextResponse.json({ error: "nothing" }, { status: 400 });

  const timeZone = await getTimeZone();
  const budget = await canSpend(ctx, todayIn(timeZone), timeZone, "meal_photo");
  if (!budget.ok) return NextResponse.json({ error: budget.reason }, { status: 429 });

  let result: Awaited<ReturnType<typeof analyseMealPhoto>>;
  try {
    result = await analyseMealPhoto({ foodPhoto, recipePhotos, recipeText, notes, eatenG: eaten > 0 && eaten < 5000 ? Math.round(eaten) : null });
  } catch (e) {
    console.error("meal photo", e);
    return NextResponse.json({ error: "api" }, { status: 502 });
  }
  const cost = await recordUsage(ctx, "meal_photo", result.model, result.usage);
  const a = result.analysis;
  if (!a || !a.readable || a.ingredients.length === 0) return NextResponse.json({ error: "unreadable" }, { status: 422 });

  const ingredients = await Promise.all(
    a.ingredients.slice(0, 40).map(async (ing) => {
      const { match, alternatives } = await lookup(ing, ctx);
      return { name: ing.name, search: ing.search, amount_g: Math.max(1, Math.round(ing.amount_g)), cooks: ing.cooks, from: ing.from, match, alternatives };
    }),
  );
  const body: PhotoAnalysis = {
    dish_name: a.dish_name,
    dish_type: a.dish_type,
    basis: a.basis,
    loss_pct: DEFAULT_LOSS_PCT[a.dish_type],
    assumptions: a.assumptions.slice(0, 6),
    ingredients,
    cost_eur: cost,
    month_eur: budget.usage.monthEur + cost,
    budget_eur: budget.usage.monthlyBudgetEur,
  };
  return NextResponse.json(body);
}
