/**
 * Canonical list of tracked nutrients.
 *
 * Values are always stored per 100 g of food in the unit given here.
 * A nutrient that is missing from a food's map is UNKNOWN – it is never
 * treated as zero when we report totals (see calc.ts / coverage).
 */

export type NutrientUnit = "kcal" | "g" | "mg" | "µg";

export type NutrientGroup = "energy" | "macro" | "detail" | "mineral" | "vitamin";

export interface NutrientDef {
  key: NutrientKey;
  unit: NutrientUnit;
  group: NutrientGroup;
  /** Open Food Facts `nutriments` field prefix (values in g per 100 g, energy in kcal). */
  off?: string[];
  /** USDA FoodData Central nutrient numbers, in order of preference. */
  usda?: string[];
  /** Decimal places for display. */
  decimals: number;
}

export const NUTRIENT_KEYS = [
  "energy_kcal",
  "protein_g",
  "carbs_g",
  "fat_g",
  "fiber_g",
  "sugar_g",
  "saturated_fat_g",
  "salt_g",
  "sodium_mg",
  "potassium_mg",
  "calcium_mg",
  "magnesium_mg",
  "iron_mg",
  "zinc_mg",
  "phosphorus_mg",
  "vitamin_a_ug",
  "vitamin_c_mg",
  "vitamin_d_ug",
  "vitamin_e_mg",
  "vitamin_k_ug",
  "vitamin_b1_mg",
  "vitamin_b2_mg",
  "vitamin_b3_mg",
  "vitamin_b6_mg",
  "vitamin_b12_ug",
  "folate_ug",
] as const;

export type NutrientKey = (typeof NUTRIENT_KEYS)[number];

/** Nutrient values per 100 g (or totals). Missing key = unknown. */
export type NutrientMap = Partial<Record<NutrientKey, number>>;

export const NUTRIENTS: Record<NutrientKey, NutrientDef> = {
  energy_kcal: { key: "energy_kcal", unit: "kcal", group: "energy", off: ["energy-kcal"], usda: ["208", "957", "958"], decimals: 0 },
  protein_g: { key: "protein_g", unit: "g", group: "macro", off: ["proteins"], usda: ["203"], decimals: 1 },
  carbs_g: { key: "carbs_g", unit: "g", group: "macro", off: ["carbohydrates"], usda: ["205"], decimals: 1 },
  fat_g: { key: "fat_g", unit: "g", group: "macro", off: ["fat"], usda: ["204"], decimals: 1 },
  fiber_g: { key: "fiber_g", unit: "g", group: "macro", off: ["fiber"], usda: ["291"], decimals: 1 },
  sugar_g: { key: "sugar_g", unit: "g", group: "detail", off: ["sugars"], usda: ["269", "269.3"], decimals: 1 },
  saturated_fat_g: { key: "saturated_fat_g", unit: "g", group: "detail", off: ["saturated-fat"], usda: ["606"], decimals: 1 },
  salt_g: { key: "salt_g", unit: "g", group: "detail", off: ["salt"], decimals: 2 },
  sodium_mg: { key: "sodium_mg", unit: "mg", group: "mineral", off: ["sodium"], usda: ["307"], decimals: 0 },
  potassium_mg: { key: "potassium_mg", unit: "mg", group: "mineral", off: ["potassium"], usda: ["306"], decimals: 0 },
  calcium_mg: { key: "calcium_mg", unit: "mg", group: "mineral", off: ["calcium"], usda: ["301"], decimals: 0 },
  magnesium_mg: { key: "magnesium_mg", unit: "mg", group: "mineral", off: ["magnesium"], usda: ["304"], decimals: 0 },
  iron_mg: { key: "iron_mg", unit: "mg", group: "mineral", off: ["iron"], usda: ["303"], decimals: 1 },
  zinc_mg: { key: "zinc_mg", unit: "mg", group: "mineral", off: ["zinc"], usda: ["309"], decimals: 1 },
  phosphorus_mg: { key: "phosphorus_mg", unit: "mg", group: "mineral", off: ["phosphorus"], usda: ["305"], decimals: 0 },
  vitamin_a_ug: { key: "vitamin_a_ug", unit: "µg", group: "vitamin", off: ["vitamin-a"], usda: ["320"], decimals: 0 },
  vitamin_c_mg: { key: "vitamin_c_mg", unit: "mg", group: "vitamin", off: ["vitamin-c"], usda: ["401"], decimals: 1 },
  vitamin_d_ug: { key: "vitamin_d_ug", unit: "µg", group: "vitamin", off: ["vitamin-d"], usda: ["328"], decimals: 1 },
  vitamin_e_mg: { key: "vitamin_e_mg", unit: "mg", group: "vitamin", off: ["vitamin-e"], usda: ["323"], decimals: 1 },
  vitamin_k_ug: { key: "vitamin_k_ug", unit: "µg", group: "vitamin", off: ["vitamin-k"], usda: ["430"], decimals: 1 },
  vitamin_b1_mg: { key: "vitamin_b1_mg", unit: "mg", group: "vitamin", off: ["vitamin-b1"], usda: ["404"], decimals: 2 },
  vitamin_b2_mg: { key: "vitamin_b2_mg", unit: "mg", group: "vitamin", off: ["vitamin-b2"], usda: ["405"], decimals: 2 },
  vitamin_b3_mg: { key: "vitamin_b3_mg", unit: "mg", group: "vitamin", off: ["vitamin-pp", "vitamin-b3"], usda: ["406"], decimals: 1 },
  vitamin_b6_mg: { key: "vitamin_b6_mg", unit: "mg", group: "vitamin", off: ["vitamin-b6"], usda: ["415"], decimals: 2 },
  vitamin_b12_ug: { key: "vitamin_b12_ug", unit: "µg", group: "vitamin", off: ["vitamin-b12"], usda: ["418"], decimals: 2 },
  folate_ug: { key: "folate_ug", unit: "µg", group: "vitamin", off: ["folates", "vitamin-b9"], usda: ["435", "417"], decimals: 0 },
};

/** Nutrients every food must have to be loggable. */
export const REQUIRED_NUTRIENTS: NutrientKey[] = ["energy_kcal", "protein_g", "carbs_g", "fat_g"];

/** Nutrients shown in the compact diary/dashboard summary. */
export const PRIMARY_NUTRIENTS: NutrientKey[] = ["energy_kcal", "protein_g", "carbs_g", "fat_g", "fiber_g"];

export const MICRO_NUTRIENTS: NutrientKey[] = NUTRIENT_KEYS.filter(
  (k) => NUTRIENTS[k].group === "mineral" || NUTRIENTS[k].group === "vitamin",
);

/** Multiplier to convert a value given in `from` into `to` (mass units only). */
export function unitFactor(from: string, to: NutrientUnit): number | null {
  const norm = (u: string) => {
    const s = u.trim().toLowerCase();
    if (s === "kcal") return "kcal";
    if (s === "g") return "g";
    if (s === "mg") return "mg";
    if (s === "µg" || s === "ug" || s === "mcg" || s === "μg") return "µg";
    return null;
  };
  const f = norm(from);
  if (!f) return null;
  if (f === "kcal" || to === "kcal") return f === to ? 1 : null;
  const toMicro: Record<string, number> = { g: 1_000_000, mg: 1_000, "µg": 1 };
  return toMicro[f] / toMicro[to];
}

/** Keep only known keys with finite, non-negative numeric values. */
export function sanitizeNutrients(input: unknown): NutrientMap {
  const out: NutrientMap = {};
  if (!input || typeof input !== "object") return out;
  for (const key of NUTRIENT_KEYS) {
    const v = (input as Record<string, unknown>)[key];
    const n = typeof v === "string" ? Number(v) : v;
    if (typeof n === "number" && Number.isFinite(n) && n >= 0) out[key] = n;
  }
  return out;
}

export function hasRequiredNutrients(n: NutrientMap): boolean {
  return REQUIRED_NUTRIENTS.every((k) => typeof n[k] === "number");
}
