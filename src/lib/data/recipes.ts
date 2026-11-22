import "server-only";
import { z } from "zod";
import { check, ctxOr, num, type Ctx } from "./core";
import { candidateSchema, dateSchema, mealSchema, upsertFood, type Result } from "./mutations";
import { hasRequiredNutrients, sanitizeNutrients } from "@/lib/nutrition/nutrients";
import { recipeNutrition } from "@/lib/nutrition/recipe";
import type { Recipe, RecipeIngredient } from "./types";

const RECIPE_COLUMNS = "id, name, notes, cooked_weight_g, servings, is_favorite, archived, updated_at";
const INGREDIENT_COLUMNS = "id, recipe_id, position, food_id, name, brand, source, source_id, amount_g, nutrients_per_100g";

function mapIngredient(r: Record<string, unknown>): RecipeIngredient & { recipe_id: string } {
  return {
    ...(r as unknown as RecipeIngredient & { recipe_id: string }),
    amount_g: Number(r.amount_g),
    nutrients_per_100g: sanitizeNutrients(r.nutrients_per_100g),
  };
}

export async function listRecipes(opts: { includeArchived?: boolean } = {}, ctx?: Ctx): Promise<Recipe[]> {
  const { supabase, userId } = await ctxOr(ctx);
  let q = supabase.from("recipes").select(RECIPE_COLUMNS).eq("user_id", userId);
  if (!opts.includeArchived) q = q.eq("archived", false);
  const { data, error } = await q.order("is_favorite", { ascending: false }).order("updated_at", { ascending: false });
  check(error, !ctx);
  const recipes = data ?? [];
  if (!recipes.length) return [];
  const { data: ings, error: e2 } = await supabase
    .from("recipe_ingredients")
    .select(INGREDIENT_COLUMNS)
    .eq("user_id", userId)
    .in("recipe_id", recipes.map((r) => r.id))
    .order("position");
  check(e2, !ctx);
  const byRecipe = new Map<string, RecipeIngredient[]>();
  for (const i of (ings ?? []).map(mapIngredient)) {
    const list = byRecipe.get(i.recipe_id) ?? [];
    list.push(i);
    byRecipe.set(i.recipe_id, list);
  }
  return recipes.map((r) => ({
    ...(r as unknown as Recipe),
    cooked_weight_g: num(r.cooked_weight_g),
    servings: num(r.servings),
    ingredients: byRecipe.get(r.id) ?? [],
  }));
}

export async function getRecipe(id: string, ctx?: Ctx): Promise<Recipe | null> {
  if (!z.string().uuid().safeParse(id).success) return null;
  const { supabase, userId } = await ctxOr(ctx);
  const { data, error } = await supabase.from("recipes").select(RECIPE_COLUMNS).eq("user_id", userId).eq("id", id).maybeSingle();
  check(error, !ctx);
  if (!data) return null;
  const { data: ings, error: e2 } = await supabase.from("recipe_ingredients").select(INGREDIENT_COLUMNS).eq("user_id", userId).eq("recipe_id", id).order("position");
  check(e2, !ctx);
  return { ...(data as unknown as Recipe), cooked_weight_g: num(data.cooked_weight_g), servings: num(data.servings), ingredients: (ings ?? []).map(mapIngredient) };
}

const ingredientSchema = z.object({
  food: candidateSchema.extend({ source: z.enum(["openfoodfacts", "usda", "custom"]) }),
  amount_g: z.number().positive().max(20000),
});

export const recipeInputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(200),
  notes: z.string().trim().max(2000).nullish(),
  cooked_weight_g: z.number().positive().max(50000).nullish(),
  servings: z.number().positive().max(100).nullish(),
  ingredients: z.array(ingredientSchema).min(1).max(100),
});
export type RecipeInput = z.input<typeof recipeInputSchema>;

/**
 * Creates or replaces a recipe. Every ingredient is stored in the food library
 * (so it is reusable) and snapshotted into the recipe.
 */
export async function saveRecipe(input: RecipeInput, ctx?: Ctx): Promise<Result<{ id: string }>> {
  const parsed = recipeInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const r = parsed.data;
  for (const ing of r.ingredients) {
    if (!hasRequiredNutrients(sanitizeNutrients(ing.food.nutrients))) return { ok: false, error: `incomplete:${ing.food.name}` };
  }
  const { supabase, userId } = await ctxOr(ctx);
  const recipeRow = { user_id: userId, name: r.name, notes: r.notes || null, cooked_weight_g: r.cooked_weight_g ?? null, servings: r.servings ?? null };

  let id = r.id;
  if (id) {
    const { data, error } = await supabase.from("recipes").update(recipeRow).eq("id", id).eq("user_id", userId).select("id").maybeSingle();
    if (error || !data) return { ok: false, error: error?.message ?? "not_found" };
  } else {
    const { data, error } = await supabase.from("recipes").insert(recipeRow).select("id").single();
    if (error) return { ok: false, error: error.message };
    id = data.id as string;
  }

  const rows = [];
  for (const [position, ing] of r.ingredients.entries()) {
    const saved = await upsertFood(ing.food, { supabase, userId });
    if (!saved.ok) return { ok: false, error: saved.error };
    rows.push({
      recipe_id: id,
      user_id: userId,
      position,
      food_id: saved.foodId,
      name: ing.food.name,
      brand: ing.food.brand,
      source: ing.food.source,
      source_id: ing.food.source === "custom" ? null : ing.food.source_id,
      amount_g: Math.round(ing.amount_g * 10) / 10,
      nutrients_per_100g: sanitizeNutrients(ing.food.nutrients),
    });
  }
  const { error: delErr } = await supabase.from("recipe_ingredients").delete().eq("recipe_id", id).eq("user_id", userId);
  if (delErr) return { ok: false, error: delErr.message };
  const { error: insErr } = await supabase.from("recipe_ingredients").insert(rows);
  if (insErr) return { ok: false, error: insErr.message };
  return { ok: true, id: id! };
}

export async function updateRecipeFlags(id: string, flags: { is_favorite?: boolean; archived?: boolean }, ctx?: Ctx): Promise<Result> {
  const { supabase, userId } = await ctxOr(ctx);
  const { error } = await supabase.from("recipes").update(flags).eq("id", id).eq("user_id", userId);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function deleteRecipe(id: string, ctx?: Ctx): Promise<Result> {
  const { supabase, userId } = await ctxOr(ctx);
  const { error } = await supabase.from("recipes").delete().eq("id", id).eq("user_id", userId);
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Logs an amount of a recipe. Energy/macros must be complete; micros may be partial sums (see recipeNutrition). */
export async function logRecipeEntry(input: { recipeId: string; amount_g: number; meal: string; date: string }, ctx?: Ctx): Promise<Result> {
  const parsed = z.object({ recipeId: z.string().uuid(), amount_g: z.number().positive().max(5000), meal: mealSchema, date: dateSchema }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const c = await ctxOr(ctx);
  const recipe = await getRecipe(parsed.data.recipeId, c);
  if (!recipe) return { ok: false, error: "not_found" };
  const nutrition = recipeNutrition(recipe.ingredients, recipe.cooked_weight_g);
  if (!hasRequiredNutrients(nutrition.per100g)) return { ok: false, error: "incomplete" };
  const { error } = await c.supabase.from("diary_entries").insert({
    user_id: c.userId,
    entry_date: parsed.data.date,
    meal: parsed.data.meal,
    food_id: null,
    recipe_id: recipe.id,
    food_name: recipe.name,
    food_brand: null,
    source: "recipe",
    source_id: recipe.id,
    nutrients_per_100g: nutrition.per100g,
    amount_g: Math.round(parsed.data.amount_g * 10) / 10,
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}
