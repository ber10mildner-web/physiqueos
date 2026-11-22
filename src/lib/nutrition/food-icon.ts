/**
 * Picks a small picture (emoji) for a food from its name, German or English.
 * Rules are checked in order, so more specific words come first
 * ("Erdnussbutter" before "Butter", "Reiswaffel" before "Reis").
 */
const RULES: [RegExp, string][] = [
  // specific ingredients first, so "Burger Gurken" (pickles) is not a burger
  [/gurke|cucumber|pickle|cornichon/, "🥒"],
  [/elektrolyt|electrolyte|isotonic|isoton/, "💧"],
  [/zimt|cinnamon|gewürz|spice|pfeffer|paprikapulver|kurkuma|turmeric|curry ?pulver|muskat|oregano|basilikum|kräuter|herb|\bsalz\b|\bsalt\b/, "🧂"],
  [/dattel|\bdates?\b|feige|\bfigs?\b|rosine|raisin|trockenobst|dried fruit|pflaume|prune/, "🌴"],
  [/flohsamen|psyllium|inulin|ballaststoff/, "🌾"],
  [/protein ?pulver|whey|casein|protein ?shake|isolat/, "🥤"],
  [/protein ?riegel|protein ?bar|riegel|\bbar\b|müsliriegel/, "🍫"],
  [/erdnussbutter|peanut butter|nussmus|mandelmus/, "🥜"],
  [/reiswaffel|rice cake|knäckebrot|cracker/, "🍘"],
  [/haferflocken|\bhafer|\boat|porridge|müsli|muesli|granola|cornflakes|cereal/, "🌾"],
  [/pizza/, "🍕"],
  [/burger/, "🍔"],
  [/pommes|fries/, "🍟"],
  [/döner|wrap|burrito|tortilla|kebab/, "🌯"],
  [/sushi/, "🍣"],
  [/suppe|soup|eintopf|brühe|stew|chili con|curry|gulasch/, "🍲"],
  [/salat\b|salad|bowl/, "🥗"],
  [/sandwich|toast|brötchen|semmel|baguette|brot|bread|bagel/, "🍞"],
  [/croissant/, "🥐"],
  [/nudel|pasta|spaghetti|penne|fusilli|lasagne|gnocchi|noodle/, "🍝"],
  [/beere|berry|berries|erdbeer|strawberr|himbeer|blaubeer|heidelbeer/, "🍓"],
  [/reis|rice|risotto/, "🍚"],
  [/kartoffel|potato|süßkartoffel|sweet potato/, "🥔"],
  [/ei\b|eier|\begg|omelett|rührei/, "🥚"],
  [/hähnchen|huhn|chicken|pute|truthahn|turkey|geflügel/, "🍗"],
  [/lachs|salmon|thunfisch|tuna|fisch|fish|forelle|kabeljau|garnel|shrimp/, "🐟"],
  [/hack|rind|beef|steak|schwein|pork|wurst|salami|schinken|\bham\b|speck|bacon|lamm|fleisch|meat/, "🥩"],
  [/tofu|tempeh|seitan/, "🧈"],
  [/linsen|lentil|bohne|bean|kichererbse|chickpea|erbse|pea\b|hummus|edamame/, "🫘"],
  [/skyr|joghurt|yogurt|yoghurt|quark|pudding/, "🥣"],
  [/milch|milk|kefir|buttermilch/, "🥛"],
  [/käse|cheese|mozzarella|feta|parmesan|gouda|hüttenkäse|cottage/, "🧀"],
  [/butter|margarine/, "🧈"],
  [/öl\b|oil|olivenöl/, "🫒"],
  [/honig|honey|marmelade|jam|sirup|syrup/, "🍯"],
  [/schokolade|chocolate|kakao|cocoa|nutella/, "🍫"],
  [/keks|cookie|kuchen|cake|muffin|waffel|waffle|pfannkuchen|pancake/, "🍪"],
  [/eis\b|ice cream|gelato/, "🍨"],
  [/chips|crisps|popcorn/, "🍿"],
  [/walnuss|walnüss|mandel|almond|nuss|nüsse|nut|cashew|pistazie|haselnuss/, "🌰"],
  [/samen|seed|chia|leinsamen|flax/, "🌱"],
  [/apfel|apple/, "🍎"],
  [/banane|banana/, "🍌"],
  [/traube|grape/, "🍇"],
  [/orange|mandarine|clementine|zitrone|lemon|limette|lime|grapefruit/, "🍊"],
  [/kiwi/, "🥝"],
  [/ananas|pineapple/, "🍍"],
  [/mango/, "🥭"],
  [/birne|pear/, "🍐"],
  [/pfirsich|peach|nektarine|aprikose|apricot/, "🍑"],
  [/kirsche|cherr/, "🍒"],
  [/melone|melon/, "🍉"],
  [/avocado/, "🥑"],
  [/obst|fruit|frucht/, "🍎"],
  [/tomate|tomato/, "🍅"],
  [/gurke|cucumber/, "🥒"],
  [/karotte|möhre|carrot/, "🥕"],
  [/brokkoli|broccoli|spinat|spinach|grünkohl|kale|zucchini|kohl|cabbage/, "🥦"],
  [/paprika|pepper|chili/, "🫑"],
  [/mais|corn/, "🌽"],
  [/zwiebel|onion|knoblauch|garlic/, "🧅"],
  [/pilz|champignon|mushroom/, "🍄"],
  [/gemüse|vegetable/, "🥦"],
  [/kaffee|coffee|espresso|cappuccino|latte/, "☕"],
  [/tee\b|tea\b/, "🍵"],
  [/saft|juice|smoothie|limo|cola|soda|drink|getränk/, "🧃"],
  [/bier|beer/, "🍺"],
  [/wein|wine/, "🍷"],
  [/omega|kapsel|capsule|vitamin|supplement|magnesium|zink|kreatin|creatine/, "💊"],
];

/**
 * The picture for a food, or null when nothing fits. A neutral letter is better
 * than a misleading picture, so unknown foods get their initial (see FoodIcon).
 */
export function foodIcon(name: string, kind?: "recipe" | "food" | string | null): string | null {
  const n = name.toLowerCase();
  for (const [re, icon] of RULES) if (re.test(n)) return icon;
  return kind === "recipe" ? "🥘" : null;
}

/** First letter for the neutral fallback tile. */
export function foodInitial(name: string): string {
  return (name.trim().match(/\p{L}|\p{N}/u)?.[0] ?? "?").toUpperCase();
}
