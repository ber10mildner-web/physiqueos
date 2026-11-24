/**
 * Recipe insights: filter tags ("viel Protein", "gut für die Haut", …) and short
 * learning notes ("Vitamin C hilft beim Eisen") for a recipe. Pure (tested).
 *
 * Everything is derived from the ingredients' stored nutrient values and from
 * what kind of food each ingredient is. Thresholds are per 100 kcal, so they do
 * not depend on how big a portion is (a recipe may have no servings).
 *
 * Bioavailability can only be judged roughly: Sigma knows how much iron is in a
 * dish, not how much of it the body takes up. The "iron" tag and the notes use
 * well established rules of thumb (heme vs. plant iron, vitamin C, oxalate in
 * spinach, fat with carotenoids) and say so.
 */
import { normalize } from "@/lib/food-sources/basic";
import { BASIC_PREFIX } from "@/lib/food-sources/types";
import { REFERENCES } from "@/lib/nutrition/gaps";
import type { NutrientKey, NutrientMap } from "@/lib/nutrition/nutrients";
import { recipeNutrition } from "@/lib/nutrition/recipe";

export const RECIPE_TAGS = ["protein", "fiber", "light", "skin", "iron", "omega3", "calcium", "vitamin_d", "vegetarian", "vegan"] as const;
export type RecipeTag = (typeof RECIPE_TAGS)[number];

export type FoodCategory =
  | "red_meat"
  | "poultry"
  | "fatty_fish"
  | "fish"
  | "egg"
  | "dairy"
  | "honey"
  | "soy"
  | "legume"
  | "grain"
  | "omega3_seed"
  | "nut_seed"
  | "leafy_oxalate"
  | "cooked_tomato"
  | "vegetable"
  | "fruit"
  | "fat"
  | "plant_other"
  /** A product whose kind is not known (e.g. a branded food without a telling name). */
  | "unknown";

export interface InsightIngredient {
  name: string;
  source_id?: string | null;
  amount_g: number;
  nutrients_per_100g: NutrientMap;
}

/** Vitamins/minerals "rich in": at least this share of the daily reference per 100 kcal (EU "high in" rule, 2 × 6 %). */
export const RICH_PER_100KCAL = 0.12;
/** "viel Protein": at least this share of the calories from protein. */
export const PROTEIN_ENERGY_SHARE = 0.3;
/** "ballaststoffreich" (EU claim): at least 3 g fibre per 100 kcal. */
export const FIBER_PER_100KCAL = 3;
/** "light": at most this many kcal per portion (only judged when the recipe has servings). */
export const LIGHT_KCAL_PER_SERVING = 500;
/** Iron worth talking about: at least this share of the reference per 100 kcal. */
export const IRON_SOURCE_PER_100KCAL = 0.06;
/** Vitamin C that helps plant iron: ~25 mg in a meal of ~500 kcal. */
export const VITC_FOR_IRON_PER_100KCAL = 5;

const HEME: FoodCategory[] = ["red_meat", "poultry", "fatty_fish", "fish"];
const ANIMAL: FoodCategory[] = [...HEME, "egg", "dairy"];

const FATTY_FISH_IDS = new Set(["15236", "15076", "15046", "15039", "15240"]);
const OMEGA3_SEED_IDS = new Set(["12220", "12006", "12155", "12012"]);
const SOY_IDS = new Set(["16426", "16114", "16120", "11211"]);
const PEANUT_IDS = new Set(["16087", "16390", "16398"]);
const EGG_IDS = new Set(["01123", "01124", "01125", "01129"]);
const OXALATE_IDS = new Set(["11457", "11458", "11147"]);
const COOKED_TOMATO_IDS = new Set(["11546", "11547"]);

function categoryOfBasic(id: string): FoodCategory {
  if (FATTY_FISH_IDS.has(id)) return "fatty_fish";
  if (OMEGA3_SEED_IDS.has(id)) return "omega3_seed";
  if (SOY_IDS.has(id)) return "soy";
  if (PEANUT_IDS.has(id)) return "nut_seed";
  if (EGG_IDS.has(id)) return "egg";
  if (OXALATE_IDS.has(id)) return "leafy_oxalate";
  if (COOKED_TOMATO_IDS.has(id)) return "cooked_tomato";
  if (id === "19296") return "honey";
  const group = id.slice(0, 2);
  switch (group) {
    case "05":
      return "poultry";
    case "10":
    case "13":
    case "17":
    case "23":
      return "red_meat";
    case "15":
      return "fish";
    case "01":
      return "dairy";
    case "16":
      return "legume";
    case "08":
    case "20":
      return "grain";
    case "12":
      return "nut_seed";
    case "11":
      return "vegetable";
    case "09":
      return "fruit";
    case "04":
      return "fat";
    default:
      return "plant_other";
  }
}

/** Name keywords for foods that are not Sigma basic foods (first match wins). */
const KEYWORDS: [FoodCategory, RegExp][] = [
  // German compounds ("Wildlachs", "Vollmilch") need matches inside words, so most patterns have no leading \b.
  ["plant_other", /(hafer|mandel|soja|kokos|reis|cashew|erbsen)(milch|drink)|(oat|almond|soy|coconut|rice) (milk|drink)/],
  ["soy", /tofu|tempeh|soja|\bsoy|edamame/],
  ["fatty_fish", /lachs|salmon|makrele|mackerel|hering|herring|matjes|sardin|forelle|trout|sprotte|anchovi|sardelle/],
  ["fish", /fisch|\bfish|kabeljau|dorsch|\bcod\b|seelachs|pollock|\btuna|tilapia|zander|pangasius|garnele|shrimp|scampi|krabbe|muschel|tintenfisch/],
  ["poultry", /haehnchen|hahnchen|huhn|huehner|chicken|\bpute|truthahn|turkey|entenbrust|\bduck|gefluegel/],
  ["red_meat", /rind|\bbeef|hack|schwein|\bpork|\blamm|\blamb|\bkalb|\bveal|steak|\bwild\b|\breh\b|hirsch|schinken|speck|bacon|salami|wurst|sausage|leberkaese|doener|\bdoner|gyros|kebab/],
  ["egg", /\b(ei|eier|egg|eggs|eiklar|eigelb)\b/],
  ["honey", /honig|\bhoney/],
  ["omega3_seed", /leinsa|\bflax|\bchia|walnu|hanfsa|\bhemp/],
  ["nut_seed", /nuss|nuesse|\bnut|mandel|almond|cashew|pistazie|peanut|kerne\b|seed|sesam|kokos|coconut/],
  ["dairy", /milch|\bmilk|joghurt|jogurt|yog|quark|skyr|kaese|cheese|sahne|cream|butter|mozzarella|feta|parmesan|gouda|ricotta|\bwhey|molke|kefir/],
  ["legume", /linse|lentil|bohne|\bbean|kichererbse|chickpea|erbse|\bpeas?\b|hummus|falafel/],
  ["leafy_oxalate", /spinat|spinach|mangold|\bchard/],
  ["cooked_tomato", /passiert|tomatenmark|tomatensauce|tomatensosse|dosentomate|tomato paste|tomato sauce|pizzatomate/],
  ["grain", /hafer|\boat|\breis\b|\brice\b|vollkornreis|basmati|nudel|pasta|spaghetti|brot|bread|broetchen|mehl|flour|quinoa|bulgur|couscous|hirse|wrap|tortilla|gnocchi|spaetzle|haferflocken/],
  ["fat", /(oel|oil)\b/],
  ["fruit", /apfel|\bapple|banane|banana|beere|berry|berries|orange|kiwi|mango|ananas|traube|zitrone|lemon|limette|\blime/],
  ["vegetable", /gemuese|vegetable|tomate|tomato|paprika|pepper|zwiebel|onion|karotte|carrot|moehre|brokkoli|broccoli|zucchini|kohl|cabbage|salat|lettuce|gurke|cucumber|kartoffel|potato|pilz|champignon|mushroom|knoblauch|garlic|kuerbis/],
];

export function categorize(ing: { name: string; source_id?: string | null }): FoodCategory {
  if (ing.source_id?.startsWith(BASIC_PREFIX)) return categoryOfBasic(ing.source_id.slice(BASIC_PREFIX.length));
  const name = normalize(ing.name);
  for (const [cat, re] of KEYWORDS) if (re.test(name)) return cat;
  return "unknown";
}

/** A learning note; `vars` fill the {placeholders} of the translated text. */
export interface InsightNote {
  key:
    | "iron_heme"
    | "iron_vitc"
    | "iron_tip"
    | "carotene_fat"
    | "carotene_tip"
    | "lycopene"
    | "oxalate_calcium"
    | "oxalate_iron"
    | "protein_combo"
    | "omega3_fish"
    | "omega3_plant"
    | "flax_ground"
    | "vitamin_d_winter";
  vars?: Record<string, string>;
}

export interface RecipeInsights {
  tags: RecipeTag[];
  /** Vitamins/minerals (and fibre) the dish is rich in, with share of the daily reference per 100 kcal. */
  richIn: { key: NutrientKey; perKcalShare: number }[];
  /** Which of zinc, vitamin A/C/E and omega-3 made the "skin" tag. */
  skinFrom: (NutrientKey | "omega3")[];
  notes: InsightNote[];
}

const refOf = (key: NutrientKey) => {
  const r = REFERENCES[key];
  return r ? (r.male + r.female) / 2 : null;
};

/** Name of the ingredient that contributes most of a nutrient (or null). */
function topSource(ings: InsightIngredient[], key: NutrientKey, filter?: (c: FoodCategory) => boolean): string | null {
  let best: { name: string; v: number } | null = null;
  for (const i of ings) {
    if (filter && !filter(categorize(i))) continue;
    const v = ((i.nutrients_per_100g[key] ?? 0) * i.amount_g) / 100;
    if (v > 0 && (!best || v > best.v)) best = { name: i.name, v };
  }
  return best ? shortName(best.name) : null;
}

/** "Paprika, rot, roh" → "Paprika"; "Hüttenkäse (körniger Frischkäse), fettarm" → "Hüttenkäse". */
export function shortName(name: string): string {
  return name.split(/[,(]/)[0].trim();
}

function shareFrom(ings: InsightIngredient[], key: NutrientKey, pred: (c: FoodCategory) => boolean): number {
  let all = 0;
  let part = 0;
  for (const i of ings) {
    const v = ((i.nutrients_per_100g[key] ?? 0) * i.amount_g) / 100;
    all += v;
    if (pred(categorize(i))) part += v;
  }
  return all > 0 ? part / all : 0;
}

export function recipeInsights(ingredients: InsightIngredient[], cookedWeightG?: number | null, servings?: number | null): RecipeInsights {
  const out: RecipeInsights = { tags: [], richIn: [], skinFrom: [], notes: [] };
  if (!ingredients.length) return out;
  const n = recipeNutrition(ingredients, cookedWeightG);
  const cats = ingredients.map(categorize);
  const has = (...c: FoodCategory[]) => cats.some((x) => c.includes(x));
  const weightOf = (...c: FoodCategory[]) => ingredients.reduce((s, ing, i) => s + (c.includes(cats[i]) ? ing.amount_g : 0), 0);
  const raw = n.rawWeightG || 1;

  // Diet tags: only when every ingredient's kind is known.
  if (!cats.includes("unknown")) {
    if (!has(...HEME)) out.tags.push("vegetarian");
    if (!has(...ANIMAL, "honey")) out.tags.push("vegan");
  }

  const omega3Fish = weightOf("fatty_fish") / raw >= 0.08;
  const omega3Plant = weightOf("omega3_seed") / raw >= 0.02;
  const omega3 = omega3Fish || omega3Plant;

  const kcal = n.total.energy_kcal;
  if (kcal && kcal > 0) {
    const per100kcal = (key: NutrientKey) => (n.total[key] === undefined ? null : (n.total[key]! / kcal) * 100);
    const protein = n.total.protein_g;
    if (protein !== undefined && (protein * 4) / kcal >= PROTEIN_ENERGY_SHARE) out.tags.push("protein");
    const fib = per100kcal("fiber_g");
    if (fib !== null && fib >= FIBER_PER_100KCAL) out.tags.push("fiber");
    if (servings && servings > 0 && kcal / servings <= LIGHT_KCAL_PER_SERVING) out.tags.push("light");

    // Fibre has its own tag; the list is for vitamins and minerals.
    for (const key of Object.keys(REFERENCES) as NutrientKey[]) {
      if (key === "fiber_g") continue;
      const v = per100kcal(key);
      if (v === null) continue;
      const share = v / refOf(key)!;
      if (share >= RICH_PER_100KCAL) out.richIn.push({ key, perKcalShare: share });
    }
    out.richIn.sort((a, b) => b.perKcalShare - a.perKcalShare);
    const isRich = (k: NutrientKey) => out.richIn.some((r) => r.key === k);

    const skin: RecipeInsights["skinFrom"] = (["zinc_mg", "vitamin_a_ug", "vitamin_c_mg", "vitamin_e_mg"] as NutrientKey[]).filter(isRich);
    if (omega3) skin.push("omega3");
    if (skin.length >= 2) {
      out.tags.push("skin");
      out.skinFrom = skin;
    }

    // Iron: a real amount AND a form/combination the body takes up well.
    const iron = per100kcal("iron_mg");
    const ironRef = refOf("iron_mg")!;
    if (iron !== null && iron / ironRef >= IRON_SOURCE_PER_100KCAL) {
      const hemeShare = shareFrom(ingredients, "iron_mg", (c) => HEME.includes(c));
      const oxalateShare = shareFrom(ingredients, "iron_mg", (c) => c === "leafy_oxalate");
      const vitc = per100kcal("vitamin_c_mg") ?? 0;
      if (hemeShare >= 0.3) {
        out.tags.push("iron");
        out.notes.push({ key: "iron_heme", vars: { source: topSource(ingredients, "iron_mg", (c) => HEME.includes(c)) ?? "" } });
      } else if (oxalateShare >= 0.5) {
        // Spinach/chard iron is bound by oxalate: lots on paper, little taken up.
        out.notes.push({ key: "oxalate_iron", vars: { source: topSource(ingredients, "iron_mg") ?? "" } });
      } else if (vitc >= VITC_FOR_IRON_PER_100KCAL) {
        out.tags.push("iron");
        out.notes.push({ key: "iron_vitc", vars: { iron: topSource(ingredients, "iron_mg") ?? "", vitc: topSource(ingredients, "vitamin_c_mg") ?? "" } });
      } else {
        out.notes.push({ key: "iron_tip", vars: { iron: topSource(ingredients, "iron_mg") ?? "" } });
      }
    }

    if (omega3) out.tags.push("omega3");
    if (isRich("calcium_mg")) out.tags.push("calcium");
    if (isRich("vitamin_d_ug")) out.tags.push("vitamin_d");

    // Carotenoids (plant vitamin A) need some fat.
    if (isRich("vitamin_a_ug") && shareFrom(ingredients, "vitamin_a_ug", (c) => ["vegetable", "fruit", "leafy_oxalate", "cooked_tomato"].includes(c)) >= 0.5) {
      const fatEnergy = ((n.total.fat_g ?? 0) * 9) / kcal;
      const source = topSource(ingredients, "vitamin_a_ug") ?? "";
      out.notes.push({ key: fatEnergy >= 0.1 ? "carotene_fat" : "carotene_tip", vars: { source } });
    }
    if (isRich("calcium_mg") && shareFrom(ingredients, "calcium_mg", (c) => c === "leafy_oxalate") >= 0.4) out.notes.push({ key: "oxalate_calcium" });
    if (isRich("vitamin_d_ug")) out.notes.push({ key: "vitamin_d_winter" });
  }

  if (has("cooked_tomato") && has("fat")) out.notes.push({ key: "lycopene" });
  if (has("legume") && has("grain") && !has(...ANIMAL, "soy")) out.notes.push({ key: "protein_combo" });
  if (omega3Fish) out.notes.push({ key: "omega3_fish", vars: { source: shortName(ingredients[cats.indexOf("fatty_fish")].name) } });
  else if (omega3Plant) out.notes.push({ key: "omega3_plant", vars: { source: shortName(ingredients[cats.indexOf("omega3_seed")].name) } });
  if (ingredients.some((i) => /leinsa|flax/.test(normalize(i.name)))) out.notes.push({ key: "flax_ground" });

  out.tags.sort((a, b) => RECIPE_TAGS.indexOf(a) - RECIPE_TAGS.indexOf(b));
  return out;
}

/** True when the recipe matches every selected tag; "gaps" matches when it is rich in one of the gap nutrients. */
export function matchesFilters(ins: RecipeInsights, filters: string[], gapKeys: NutrientKey[] = []): boolean {
  return filters.every((f) => {
    if (f === "gaps") return ins.richIn.some((r) => gapKeys.includes(r.key));
    return (ins.tags as string[]).includes(f);
  });
}
