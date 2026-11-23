"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { logRecipeEntry, saveRecipe, updateRecipeFlags, type RecipeInput } from "@/lib/data/recipes";

/**
 * Saves the confirmed photo meal as a recipe (with the estimated cooked weight)
 * and logs the eaten grams. Without "keep" the recipe is archived: the diary
 * entry has its own snapshot, and the recipe list stays tidy.
 */
export async function logPhotoMealAction(input: { recipe: RecipeInput; keep: boolean; eaten_g: number; meal: string; date: string }) {
  const ctx = await requireUser();
  const saved = await saveRecipe(input.recipe, ctx);
  if (!saved.ok) return saved;
  const logged = await logRecipeEntry({ recipeId: saved.id, amount_g: input.eaten_g, meal: input.meal, date: input.date }, ctx);
  if (!input.keep) await updateRecipeFlags(saved.id, { archived: true }, ctx);
  revalidatePath("/", "layout");
  return logged.ok ? { ok: true as const, id: saved.id } : logged;
}
