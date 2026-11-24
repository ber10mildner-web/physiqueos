/**
 * Recipe ideas bundled with Sigma ("Ideen zum Ausprobieren"). Simple, everyday
 * dishes that are good examples for a filter (protein, fibre, skin, iron, …).
 *
 * Only ingredients from Sigma's basic foods (USDA SR28) are used, so every
 * nutrient value comes from a database and nothing is estimated. Where a raw
 * ingredient loses water while cooking (meat, fish) a typical cooking loss is
 * given; the dish's cooked weight is then estimated from it. Wherever possible
 * already cooked ingredients (cooked rice, cooked lentils) are listed instead,
 * so the dish weight is close to what lands on the plate.
 *
 * Shared by all users (no database rows), so it needs no migration.
 */
import { getBasicFood } from "@/lib/food-sources/basic";
import type { FoodCandidate } from "@/lib/food-sources/types";

type L = { de: string; en: string };

interface IdeaDef {
  slug: string;
  name: L;
  servings: number;
  minutes: number;
  /** [basic food NDB id, grams for the whole recipe, cooking loss 0–1] */
  ingredients: [string, number, number?][];
  steps: L[];
}

const IDEAS: IdeaDef[] = [
  {
    slug: "overnight-oats-beeren",
    name: { de: "Overnight Oats mit Joghurt & Himbeeren", en: "Overnight oats with yoghurt & raspberries" },
    servings: 1,
    minutes: 5,
    ingredients: [["08120", 60], ["01256", 150], ["01174", 100], ["09302", 100], ["12006", 10]],
    steps: [
      { de: "Haferflocken, Joghurt, Milch und Chiasamen verrühren.", en: "Stir oats, yoghurt, milk and chia seeds together." },
      { de: "Über Nacht in den Kühlschrank, morgens die Himbeeren darauf.", en: "Leave in the fridge overnight, top with raspberries in the morning." },
    ],
  },
  {
    slug: "hafer-eiklar-pancakes",
    name: { de: "Hafer-Eiklar-Pancakes mit Heidelbeeren", en: "Oat & egg white pancakes with blueberries" },
    servings: 1,
    minutes: 15,
    ingredients: [["08120", 40], ["01123", 60], ["01124", 165], ["09040", 80], ["09050", 100], ["04582", 3]],
    steps: [
      { de: "Haferflocken, Ei, Eiklar (von 5 Eiern) und Banane fein pürieren.", en: "Blend oats, egg, egg whites (from 5 eggs) and banana until smooth." },
      { de: "In wenig Öl kleine Pancakes ausbacken, mit Heidelbeeren servieren.", en: "Fry small pancakes in a little oil, serve with blueberries." },
    ],
  },
  {
    slug: "huettenkaese-kiwi-kuerbiskerne",
    name: { de: "Hüttenkäse-Bowl mit Kiwi & Kürbiskernen", en: "Cottage cheese bowl with kiwi & pumpkin seeds" },
    servings: 1,
    minutes: 3,
    ingredients: [["01016", 200], ["09148", 150], ["12014", 15], ["19296", 10]],
    steps: [{ de: "Kiwis schälen und würfeln, mit Hüttenkäse, Kürbiskernen und Honig in eine Schüssel geben.", en: "Peel and dice the kiwis, add to the cottage cheese with pumpkin seeds and honey." }],
  },
  {
    slug: "joghurt-walnuss-leinsamen",
    name: { de: "Griechischer Joghurt mit Walnüssen, Leinsamen & Heidelbeeren", en: "Greek yoghurt with walnuts, flaxseed & blueberries" },
    servings: 1,
    minutes: 3,
    ingredients: [["01256", 200], ["12155", 20], ["12220", 10], ["09050", 100]],
    steps: [{ de: "Leinsamen frisch schroten, alles in eine Schüssel geben.", en: "Grind the flaxseed fresh and put everything in a bowl." }],
  },
  {
    slug: "ruehrei-spinat-feta",
    name: { de: "Rührei mit Spinat, Tomate & Feta", en: "Scrambled eggs with spinach, tomato & feta" },
    servings: 1,
    minutes: 10,
    ingredients: [["01123", 180], ["11457", 100], ["11529", 120], ["01019", 30], ["01145", 5], ["11365", 200]],
    steps: [
      { de: "Spinat in Butter zusammenfallen lassen, Tomatenwürfel kurz mitbraten.", en: "Wilt the spinach in butter, briefly fry the diced tomato with it." },
      { de: "Eier dazu, stocken lassen, Feta darüber bröseln. Dazu Pellkartoffeln.", en: "Add the eggs, let them set, crumble feta over. Serve with boiled potatoes." },
    ],
  },
  {
    slug: "tofu-ruehrei",
    name: { de: "Tofu-Rührei mit Spinat & Paprika", en: "Tofu scramble with spinach & bell pepper" },
    servings: 1,
    minutes: 10,
    ingredients: [["16426", 200], ["11457", 100], ["11821", 100], ["11282", 50], ["04053", 5], ["02043", 2]],
    steps: [
      { de: "Zwiebel und Paprika in Öl anbraten, Tofu mit der Gabel zerdrücken und mitbraten.", en: "Fry onion and pepper in oil, crumble the tofu with a fork and fry along." },
      { de: "Kurkuma und Spinat unterrühren, bis der Spinat zusammenfällt.", en: "Stir in turmeric and spinach until the spinach wilts." },
    ],
  },
  {
    slug: "lachs-suesskartoffel-brokkoli",
    name: { de: "Lachs mit Ofen-Süßkartoffel & Brokkoli", en: "Salmon with roasted sweet potato & broccoli" },
    servings: 1,
    minutes: 30,
    ingredients: [["15236", 125, 0.2], ["11508", 250], ["11091", 200], ["04053", 5], ["09152", 15]],
    steps: [
      { de: "Süßkartoffel in Spalten mit Öl bei 200 °C ca. 25 Minuten backen, Lachs die letzten 12 Minuten mit aufs Blech.", en: "Bake sweet potato wedges with oil at 200 °C for about 25 minutes, add the salmon for the last 12 minutes." },
      { de: "Brokkoli dämpfen, alles mit Zitronensaft beträufeln.", en: "Steam the broccoli, drizzle everything with lemon juice." },
    ],
  },
  {
    slug: "makrele-kartoffeln-gurke",
    name: { de: "Makrele mit Pellkartoffeln & Gurken-Joghurt", en: "Mackerel with boiled potatoes & cucumber yoghurt" },
    servings: 1,
    minutes: 25,
    ingredients: [["15046", 125, 0.2], ["11365", 250], ["11205", 150], ["01117", 100], ["11156", 5]],
    steps: [
      { de: "Kartoffeln kochen, Makrele in der Pfanne oder im Ofen garen.", en: "Boil the potatoes, cook the mackerel in a pan or the oven." },
      { de: "Gurke raspeln, mit Joghurt und Schnittlauch verrühren.", en: "Grate the cucumber, mix with yoghurt and chives." },
    ],
  },
  {
    slug: "kabeljau-kartoffeln-erbsen",
    name: { de: "Kabeljau mit Kartoffeln, Erbsen & Zitrone", en: "Cod with potatoes, peas & lemon" },
    servings: 1,
    minutes: 25,
    ingredients: [["15015", 200, 0.2], ["11365", 250], ["11305", 150], ["01145", 10], ["11297", 10], ["09152", 15]],
    steps: [
      { de: "Kartoffeln kochen, Kabeljau in Butter braten.", en: "Boil the potatoes, fry the cod in butter." },
      { de: "Erbsen garen, alles mit Petersilie und Zitrone servieren.", en: "Cook the peas, serve everything with parsley and lemon." },
    ],
  },
  {
    slug: "garnelen-zucchini-pasta",
    name: { de: "Garnelen-Zucchini-Pasta", en: "Shrimp & courgette pasta" },
    servings: 1,
    minutes: 20,
    ingredients: [["15270", 150, 0.15], ["11477", 300], ["11529", 150], ["20125", 100], ["04053", 10], ["11215", 6], ["01033", 15]],
    steps: [
      { de: "Zucchini in dünne Streifen schneiden, Nudeln kochen.", en: "Cut the courgette into thin strips, cook the pasta." },
      { de: "Knoblauch und Garnelen in Öl braten, Zucchini und Tomate kurz mitbraten, mit den Nudeln mischen, Parmesan darüber.", en: "Fry garlic and shrimp in oil, briefly fry courgette and tomato too, mix with the pasta, top with parmesan." },
    ],
  },
  {
    slug: "rind-paprika-reis",
    name: { de: "Rinderhack-Paprika-Pfanne mit Naturreis", en: "Beef & bell pepper pan with brown rice" },
    servings: 1,
    minutes: 20,
    ingredients: [["23557", 150, 0.25], ["11821", 150], ["11282", 100], ["20037", 200], ["04582", 5], ["02028", 2]],
    steps: [
      { de: "Hack in Öl krümelig braten, Zwiebel und Paprika dazugeben.", en: "Brown the mince in oil, add onion and bell pepper." },
      { de: "Mit Paprikapulver würzen, mit dem Reis servieren.", en: "Season with paprika powder and serve with the rice." },
    ],
  },
  {
    slug: "linsen-bolognese",
    name: { de: "Linsen-Bolognese mit Paprika & Vollkornnudeln", en: "Lentil & pepper bolognese with wholewheat pasta" },
    servings: 4,
    minutes: 35,
    ingredients: [["23557", 250, 0.25], ["16070", 250], ["11547", 400], ["11546", 20], ["11282", 100], ["11124", 100], ["11821", 150], ["11215", 6], ["04053", 10], ["20125", 700]],
    steps: [
      { de: "Zwiebel, Karotte, Paprika und Knoblauch fein würfeln und in Öl anbraten, Hack dazu und krümelig braten.", en: "Finely dice onion, carrot, bell pepper and garlic, fry in oil, add the mince and brown it." },
      { de: "Tomatenmark kurz mitrösten, passierte Tomaten und Linsen dazu, 15 Minuten köcheln.", en: "Briefly roast the tomato paste, add passata and lentils, simmer for 15 minutes." },
      { de: "Mit den Nudeln servieren.", en: "Serve with the pasta." },
    ],
  },
  {
    slug: "haehnchen-quinoa-bowl",
    name: { de: "Hähnchen-Bowl mit Quinoa, Avocado & Edamame", en: "Chicken bowl with quinoa, avocado & edamame" },
    servings: 1,
    minutes: 20,
    ingredients: [["05064", 150], ["20137", 150], ["09037", 70], ["11211", 75], ["11205", 100], ["11124", 80], ["12023", 10], ["09152", 15]],
    steps: [
      { de: "Quinoa kochen, Hähnchen braten und in Streifen schneiden, Edamame kurz kochen.", en: "Cook the quinoa, fry the chicken and slice it, briefly boil the edamame." },
      { de: "Alles mit Gurke, Karotte und Avocado in eine Schüssel geben, mit Sesam und Zitrone abschließen.", en: "Arrange everything with cucumber, carrot and avocado, finish with sesame and lemon." },
    ],
  },
  {
    slug: "puten-wok-reisnudeln",
    name: { de: "Puten-Gemüse-Wok mit Reisnudeln", en: "Turkey & vegetable stir-fry with rice noodles" },
    servings: 1,
    minutes: 20,
    ingredients: [["05220", 150], ["11090", 150], ["11821", 100], ["11116", 100], ["11124", 80], ["11216", 10], ["04582", 5], ["12023", 10], ["20134", 150]],
    steps: [
      { de: "Gemüse klein schneiden, Pute in Streifen in Öl scharf anbraten.", en: "Chop the vegetables, sear the turkey strips in oil." },
      { de: "Gemüse und Ingwer dazu, 4–5 Minuten pfannenrühren, Reisnudeln unterheben, mit Sesam bestreuen.", en: "Add vegetables and ginger, stir-fry 4–5 minutes, toss in the noodles, sprinkle with sesame." },
    ],
  },
  {
    slug: "thunfisch-bohnen-salat",
    name: { de: "Thunfisch-Bohnen-Salat", en: "Tuna & white bean salad" },
    servings: 1,
    minutes: 10,
    ingredients: [["15121", 130], ["16050", 200], ["11529", 150], ["11205", 100], ["11282", 50], ["04053", 10], ["09152", 15], ["11297", 10]],
    steps: [{ de: "Gemüse würfeln, mit Bohnen und Thunfisch mischen, mit Öl, Zitrone und Petersilie anmachen.", en: "Dice the vegetables, mix with beans and tuna, dress with oil, lemon and parsley." }],
  },
  {
    slug: "kichererbsen-spinat-curry",
    name: { de: "Kichererbsen-Spinat-Curry mit Reis", en: "Chickpea & spinach curry with rice" },
    servings: 2,
    minutes: 30,
    ingredients: [["16057", 250], ["11457", 200], ["11547", 200], ["11821", 150], ["11282", 100], ["11216", 10], ["11215", 6], ["02043", 3], ["04582", 10], ["20445", 300]],
    steps: [
      { de: "Zwiebel, Ingwer und Knoblauch in Öl anschwitzen, Kurkuma und Paprikawürfel dazu.", en: "Sweat onion, ginger and garlic in oil, add turmeric and diced pepper." },
      { de: "Passierte Tomaten und Kichererbsen dazu, 15 Minuten köcheln, am Ende den Spinat unterrühren. Mit Reis servieren.", en: "Add passata and chickpeas, simmer 15 minutes, stir in the spinach at the end. Serve with rice." },
    ],
  },
  {
    slug: "suesskartoffel-bohnen-chili",
    name: { de: "Süßkartoffel-Bohnen-Chili", en: "Sweet potato & bean chili" },
    servings: 3,
    minutes: 40,
    ingredients: [["11510", 300], ["16033", 250], ["16015", 250], ["11547", 400], ["11821", 150], ["11282", 100], ["11168", 150], ["04053", 10], ["02028", 5], ["11215", 6]],
    steps: [
      { de: "Zwiebel und Knoblauch in Öl anbraten, Süßkartoffelwürfel und Paprika dazu.", en: "Fry onion and garlic in oil, add diced sweet potato and pepper." },
      { de: "Passierte Tomaten, Bohnen, Mais und Paprikapulver dazu, 25 Minuten köcheln.", en: "Add passata, beans, corn and paprika powder, simmer for 25 minutes." },
    ],
  },
  {
    slug: "ofengemuese-feta-kichererbsen",
    name: { de: "Ofengemüse mit Kichererbsen & Feta", en: "Roast vegetables with chickpeas & feta" },
    servings: 1,
    minutes: 35,
    ingredients: [["11477", 200], ["11821", 150], ["11209", 100], ["16057", 150], ["01019", 50], ["04053", 10]],
    steps: [{ de: "Gemüse und Kichererbsen mit Öl auf ein Blech, 25 Minuten bei 200 °C backen, Feta darüber bröseln und 5 Minuten weiterbacken.", en: "Spread vegetables and chickpeas with oil on a tray, bake 25 minutes at 200 °C, crumble feta over and bake 5 more minutes." }],
  },
  {
    slug: "linsensalat-paprika",
    name: { de: "Linsensalat mit Paprika, Rucola & Kürbiskernen", en: "Lentil salad with pepper, rocket & pumpkin seeds" },
    servings: 1,
    minutes: 15,
    ingredients: [["16070", 200], ["11821", 150], ["11959", 40], ["11291", 30], ["12014", 15], ["04053", 10], ["09152", 15]],
    steps: [{ de: "Linsen abkühlen lassen, mit Paprika, Frühlingszwiebel und Rucola mischen, mit Öl und Zitrone anmachen, Kürbiskerne darüber.", en: "Let the lentils cool, mix with pepper, spring onion and rocket, dress with oil and lemon, top with pumpkin seeds." }],
  },
];

export interface RecipeIdea {
  slug: string;
  name: string;
  servings: number;
  minutes: number;
  steps: string[];
  ingredients: { food: FoodCandidate; amount_g: number; loss: number }[];
  /** Estimated weight of the finished dish when ingredients lose water while cooking; null = raw weight. */
  cookedWeightG: number | null;
}

function build(def: IdeaDef, locale: "de" | "en"): RecipeIdea {
  const ingredients = def.ingredients.map(([id, amount, loss]) => {
    const food = getBasicFood(`sr28-${id}`, locale);
    if (!food) throw new Error(`recipe idea ${def.slug}: unknown basic food ${id}`);
    return { food, amount_g: amount, loss: loss ?? 0 };
  });
  const lossG = ingredients.reduce((s, i) => s + i.amount_g * i.loss, 0);
  const raw = ingredients.reduce((s, i) => s + i.amount_g, 0);
  return {
    slug: def.slug,
    name: def.name[locale],
    servings: def.servings,
    minutes: def.minutes,
    steps: def.steps.map((s) => s[locale]),
    ingredients,
    cookedWeightG: lossG > 0 ? Math.round(raw - lossG) : null,
  };
}

export function listRecipeIdeas(locale: "de" | "en" = "de"): RecipeIdea[] {
  return IDEAS.map((d) => build(d, locale));
}

export function getRecipeIdea(slug: string, locale: "de" | "en" = "de"): RecipeIdea | null {
  const def = IDEAS.find((d) => d.slug === slug);
  return def ? build(def, locale) : null;
}

/** Ingredients in the shape recipe nutrition / insights expect. */
export function ideaIngredients(idea: RecipeIdea) {
  return idea.ingredients.map((i) => ({ name: i.food.name, source_id: i.food.source_id, amount_g: i.amount_g, nutrients_per_100g: i.food.nutrients }));
}
