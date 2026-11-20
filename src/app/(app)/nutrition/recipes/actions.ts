"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { deleteRecipe, logRecipeEntry, saveRecipe, updateRecipeFlags, type RecipeInput } from "@/lib/data/recipes";

export async function saveRecipeAction(input: RecipeInput) {
  const res = await saveRecipe(input, await requireUser());
  if (res.ok) revalidatePath("/nutrition", "layout");
  return res;
}

export async function logRecipe(recipeId: string, amountG: number, meal: string, date: string) {
  const res = await logRecipeEntry({ recipeId, amount_g: amountG, meal, date }, await requireUser());
  if (res.ok) revalidatePath("/", "layout");
  return res;
}

export async function setRecipeFlags(id: string, flags: { is_favorite?: boolean; archived?: boolean }) {
  const res = await updateRecipeFlags(id, flags, await requireUser());
  if (res.ok) revalidatePath("/nutrition", "layout");
  return res;
}

export async function deleteRecipeAction(id: string) {
  const res = await deleteRecipe(id, await requireUser());
  if (res.ok) revalidatePath("/nutrition", "layout");
  return res;
}
