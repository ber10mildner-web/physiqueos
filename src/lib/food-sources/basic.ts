/**
 * Basic foods: a bundled list of ~250 unprocessed / generic foods (fruit, vegetables,
 * grains, legumes, nuts, eggs, dairy, meat, fish, oils) with German names.
 *
 * - Nutrient values: USDA National Nutrient Database for Standard Reference, Release 28
 *   (public domain), incl. fibre, vitamins and minerals. Missing values stay unknown.
 * - German names, aliases and portion sizes: curated in scripts/basic-foods/foods.mjs.
 *   Regenerate the JSON with `node scripts/basic-foods/build.mjs`.
 * - Works offline and costs nothing: no API call, so it is fast and never "unavailable".
 *
 * Stored in the user's library as source "usda" with source_id "sr28-<NDB number>",
 * so no database change is needed and entries de-duplicate per user.
 */
import { sanitizeNutrients } from "@/lib/nutrition/nutrients";
import { BASIC_PREFIX, isBasicSourceId, type FoodCandidate } from "./types";
import data from "./basic-foods.json";

interface BasicFood {
  id: string;
  de: string;
  en: string;
  sr: string;
  alias: string[];
  portion: number | null;
  n: Record<string, number>;
}

export { BASIC_PREFIX, isBasicSourceId };

/** Lowercase, fold umlauts/ß and accents, keep only letters/digits separated by single spaces. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

interface Indexed {
  food: BasicFood;
  /** Normalized search terms: German name first, then English name and aliases. */
  terms: string[];
}

const INDEX: Indexed[] = (data.foods as BasicFood[]).map((food) => ({
  food,
  terms: [...new Set([food.de, food.en, ...food.alias].map(normalize).filter(Boolean))],
}));
const BY_ID = new Map(INDEX.map((i) => [i.food.id, i.food]));

/** Crude German/English plural stripping: "zwiebeln" → "zwiebel", "kiwis" → "kiwi". */
function stem(token: string): string {
  if (token.length < 5) return token;
  return token.replace(/(en|n|s|e)$/, "");
}

function scoreTerm(term: string, q: string, tokens: string[]): number {
  if (term === q) return 100;
  if (term.startsWith(q + " ")) return 90;
  if (term.startsWith(q)) return 80;
  const words = term.split(" ");
  const prefixHit = (tok: string) => words.some((w) => w.startsWith(tok));
  if (tokens.every(prefixHit)) return 60;
  if (tokens.every((t) => prefixHit(stem(t)))) return 55;
  if (q.length >= 4 && tokens.every((t) => term.includes(t))) return 30;
  return 0;
}

export function toCandidate(food: BasicFood, locale: "de" | "en" = "de"): FoodCandidate {
  return {
    source: "usda",
    source_id: BASIC_PREFIX + food.id,
    source_url: null,
    name: locale === "en" ? food.en : food.de,
    brand: null,
    barcode: null,
    serving_size_g: food.portion,
    image_url: null,
    nutrients: sanitizeNutrients(food.n),
  };
}

/** Searches the bundled basic foods. Synchronous and offline; best matches first. */
export function searchBasic(query: string, locale: "de" | "en" = "de", limit = 8): FoodCandidate[] {
  const q = normalize(query);
  if (q.length < 2) return [];
  const tokens = q.split(" ");
  const hits: { food: BasicFood; score: number }[] = [];
  for (const { food, terms } of INDEX) {
    let score = 0;
    terms.forEach((t, i) => {
      // Small bonus when the display name itself matches.
      const s = scoreTerm(t, q, tokens) + (i === 0 ? 2 : 0);
      if (s > score) score = s;
    });
    if (score > 2) hits.push({ food, score });
  }
  hits.sort((a, b) => b.score - a.score || a.food.de.length - b.food.de.length);
  // Loose substring hits ("Erdapfel" for "apfel") only when nothing better matched.
  const strong = (hits[0]?.score ?? 0) >= 55;
  return hits
    .filter((h) => !strong || h.score >= 50)
    .slice(0, limit).map((h) => toCandidate(h.food, locale));
}

/** Looks up a basic food by its source_id ("sr28-09003"). */
export function getBasicFood(sourceId: string, locale: "de" | "en" = "de"): FoodCandidate | null {
  if (!isBasicSourceId(sourceId)) return null;
  const food = BY_ID.get(sourceId.slice(BASIC_PREFIX.length));
  return food ? toCandidate(food, locale) : null;
}

export const BASIC_FOOD_COUNT = INDEX.length;

/** All basic foods (for tests and tooling). */
export function allBasicFoods(locale: "de" | "en" = "de"): FoodCandidate[] {
  return INDEX.map((i) => toCandidate(i.food, locale));
}
