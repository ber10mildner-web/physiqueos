import type { NutrientMap } from "@/lib/nutrition/nutrients";

export type FoodSource = "openfoodfacts" | "usda" | "custom" | "recipe";

/**
 * A food as returned by a lookup – not yet stored. Values per 100 g.
 * `id` is set when the food already exists in the user's library.
 */
export interface FoodCandidate {
  id?: string;
  source: FoodSource;
  source_id: string | null;
  source_url: string | null;
  name: string;
  brand: string | null;
  barcode: string | null;
  serving_size_g: number | null;
  image_url: string | null;
  nutrients: NutrientMap;
  is_favorite?: boolean;
}

export class SourceUnavailableError extends Error {
  constructor(
    public readonly source: FoodSource,
    message: string,
  ) {
    super(message);
  }
}

export const BARCODE_RE = /^[0-9]{6,14}$/;
