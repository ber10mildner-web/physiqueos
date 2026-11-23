/**
 * Chooses the database food for each ingredient the photo AI named. Values
 * always come from Sigma's sources, never from the AI. Same preference as the
 * Claude connector's recipe flow: basic foods for whole foods (curated, with
 * fibre and vitamins), the user's own library and Open Food Facts for branded
 * products, USDA as the last resort. The user can switch to an alternative.
 */
import type { FoodCandidate } from "@/lib/food-sources/types";
import { hasRequiredNutrients } from "./nutrients";

export interface SourceHits {
  mine: FoodCandidate[];
  basic: FoodCandidate[];
  openfoodfacts: FoodCandidate[];
  usda: FoodCandidate[];
}

const keyOf = (f: FoodCandidate) => (f.id ? `id:${f.id}` : `${f.source}:${f.source_id ?? f.name}`);

export function pickMatch(branded: boolean, hits: SourceHits, maxAlternatives = 5): { match: FoodCandidate | null; alternatives: FoodCandidate[] } {
  const order: (keyof SourceHits)[] = branded ? ["mine", "openfoodfacts", "basic", "usda"] : ["basic", "mine", "usda", "openfoodfacts"];
  const seen = new Set<string>();
  const all: FoodCandidate[] = [];
  for (const s of order) {
    for (const f of hits[s]) {
      if (!hasRequiredNutrients(f.nutrients)) continue;
      // A basic food already in the library appears twice; keep the first.
      const k = f.source_id ? `${f.source}:${f.source_id}` : keyOf(f);
      if (seen.has(k)) continue;
      seen.add(k);
      all.push(f);
    }
  }
  return { match: all[0] ?? null, alternatives: all.slice(1, 1 + maxAlternatives) };
}
