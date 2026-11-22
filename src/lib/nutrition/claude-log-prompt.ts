/**
 * Prompt for "Mit Claude eintragen": opens claude.ai with everything Claude needs
 * to log a meal through the Sigma connector (MCP). Free for the user, because
 * Claude does the reading instead of a paid in-app AI call. Pure (tested).
 */
import type { MealSlot } from "@/lib/data/types";

export function claudeLogPrompt({ date, meal, mealName, locale }: { date: string; meal: MealSlot; mealName: string; locale: string }): string {
  if (locale.startsWith("en")) {
    return [
      `Please log food in Sigma for me: date ${date}, meal "${mealName}" (meal key: ${meal}).`,
      "Use the Sigma connector. I'll send a photo of the recipe, ingredient list or label, or just describe what I ate (also eating out, e.g. \"dürüm without sauce, quite greasy\"), plus how many grams I ate and any changes.",
      "1. Look up every ingredient with search_foods (my library first, then basic foods, then Open Food Facts, then USDA). Never invent nutritional values; ask me if something can't be found.",
      "2. For eating out, split the dish into its parts and estimate amounts, and tell me it's an estimate.",
      "3. Show me your matches and amounts, then save it with create_recipe (ask for the cooked total weight if I know it) and log my grams with log_recipe, or single foods with log_food.",
      "4. Finally, give me a short summary: kcal, protein, fibre and notable micronutrients.",
    ].join("\n");
  }
  return [
    `Bitte trag mir in Sigma Essen ein: Datum ${date}, Mahlzeit „${mealName}“ (Mahlzeit-Schlüssel: ${meal}).`,
    "Nutze den Sigma-Connector. Ich schicke dir ein Foto vom Rezept, der Zutatenliste oder dem Etikett, oder beschreibe einfach, was ich gegessen habe (auch auswärts, z. B. „Dürüm ohne Soße, ziemlich fettig“), dazu wie viel Gramm ich gegessen habe und was ich geändert habe.",
    "1. Such jede Zutat mit search_foods (zuerst meine Bibliothek, dann Basis-Lebensmittel, dann Open Food Facts, dann USDA). Erfinde nie Nährwerte; frag mich, wenn du etwas nicht findest.",
    "2. Bei Essen auswärts zerleg das Gericht in seine Bestandteile, schätz die Mengen und sag mir, dass es geschätzt ist.",
    "3. Zeig mir deine Treffer und Mengen, speichere es dann mit create_recipe (frag nach dem fertigen Gesamtgewicht, falls ich es weiß) und trag meine Gramm mit log_recipe ein, einzelne Lebensmittel mit log_food.",
    "4. Gib mir am Ende eine kurze Übersicht: kcal, Eiweiß, Ballaststoffe und auffällige Mikronährstoffe.",
  ].join("\n");
}
