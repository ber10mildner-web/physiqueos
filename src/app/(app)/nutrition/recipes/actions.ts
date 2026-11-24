"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getI18n } from "@/lib/i18n/server";
import { getRecipeIdea } from "@/lib/recipes/catalog";
import { requireUser } from "@/lib/auth";
import { deleteRecipe, logRecipeEntry, saveRecipe, saveRecipeIdea, updateRecipeFlags, type RecipeInput } from "@/lib/data/recipes";

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

/** Copies a bundled recipe idea into the user's own recipes and opens it there. */
export async function adoptRecipeIdeaAction(slug: string) {
  const ctx = await requireUser();
  const { t, locale } = await getI18n();
  const idea = getRecipeIdea(slug, locale);
  if (!idea) return { ok: false as const, error: "not_found" };
  const res = await saveRecipeIdea(idea, `${t.recipeIdeas.adoptNote} · ${t.recipeIdeas.source}`, ctx);
  if (!res.ok) return res;
  revalidatePath("/nutrition", "layout");
  redirect(`/nutrition/recipes/${res.id}`);
}
