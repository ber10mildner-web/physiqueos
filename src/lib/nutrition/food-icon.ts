/**
 * Picks a small picture (emoji) for a food from its name, German or English.
 * Rules are checked in order, so more specific words come first
 * ("Erdnussbutter" before "Butter", "Reiswaffel" before "Reis").
 */
// "Not preceded by a letter" (German letters included), because \b treats ä/ö/ü/ß
// as non-letters: "Weißkohl" must not count as "Ei".
const W = "(?<![a-zäöüß])";

const RULES: [RegExp, string | null][] = [
  // specific ingredients first, so "Burger Gurken" (pickles) is not a burger
  [/gurke|cucumber|pickle|cornichon/, "🥒"],
  [/elektrolyt|electrolyte|isotonic|isoton/, "💧"],
  [/dattel|\bdates?\b/, "🌴"],
  [/rosine|raisin|sultanin/, "🍇"],
  [/flohsamen|psyllium|inulin|ballaststoff/, "🌾"],
  [/protein ?pulver|eiwei(ß|ss) ?pulver|whey|casein|protein ?shake|eiwei(ß|ss) ?shake|isolat/, "🥤"],
  [/protein ?riegel|protein ?bar|riegel|\bbar\b/, "🍫"],
  [/erdnuss|erdnüsse|peanut|nussmus|mandelmus|cashewmus/, "🥜"],
  [/reiswaffel|rice cake|knäckebrot|cracker/, "🍘"],
  // plant drinks before oats/rice ("Haferdrink" is a drink, not oats)
  [/(soja|hafer|mandel|reis|erbsen|cashew)(drink|milch)|(soy|oat|almond|rice) ?(milk|drink)/, "🥛"],
  [/haferflocken|\bhafer|\boat|porridge|müsli|muesli|granola|cornflakes|cereal|quinoa|bulgur|couscous|hirse|millet|buchweizen|buckwheat|graupen|barley|amaranth|mehl\b|flour|grieß|semolina|dinkel/, "🌾"],
  [/käsekuchen|cheesecake/, "🍰"],
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
  [/erdbeer|strawberr/, "🍓"],
  [/heidelbeer|blaubeer|blueberr|brombeer|blackberr|schwarze johannisbeer|blackcurrant|aronia|acai|beerenmisch|mixed berr|waldbeer/, "🫐"],
  // other red berries: no own picture, a strawberry is the closest
  [/himbeer|raspberr|johannisbeer|currant|preiselbeer|lingonberr|cranberr|stachelbeer|gooseberr|goji/, "🍓"],
  [/beere|berry|berries/, "🫐"],
  [/reis|rice|risotto/, "🍚"],
  [/kürbiskern|pumpkin seed/, "🌱"],
  [/kürbis|pumpkin|butternut|squash/, "🎃"],
  [/süßkartoffel|sweet potato|kartoffel|potato/, "🥔"],
  [new RegExp(`${W}(ei|eier|eiklar|eiweiß|eigelb|eidotter)(?![a-zäöüß])|\\begg|omelett|rührei|spiegelei`), "🥚"],
  [/hähnchen|huhn|chicken|pute|truthahn|turkey|geflügel/, "🍗"],
  [/lachs|salmon|thunfisch|tuna|fisch|fish|forelle|trout|kabeljau|\bcod\b|dorsch|makrele|mackerel|hering|herring|sardine|tilapia|dorade|zander|garnel|shrimp|scampi/, "🐟"],
  [/hack|rind|beef|steak|schwein|pork|wurst|salami|schinken|\bham\b|speck|bacon|lamm|leberkäs|(?<!frucht)fleisch|meat/, "🥩"],
  [/tofu|tempeh|seitan/, "🫘"],
  [/linsen|lentil|bohne|bean|kichererbse|chickpea|erbse|\bpeas?\b|hummus|edamame/, "🫘"],
  [/skyr|joghurt|yogurt|yoghurt|quark|pudding/, "🥣"],
  [/milch|milk|kefir|buttermilch/, "🥛"],
  [/käse|cheese|mozzarella|feta|parmesan|gouda|cheddar|ricotta|hüttenkäse|cottage/, "🧀"],
  [/kokos(?!öl)|coconut(?! oil)/, "🥥"],
  [/butter(?!nut)|margarine/, "🧈"],
  [/öl\b|\boil\b|olivenöl/, "🫒"],
  [/wassermelone|watermelon/, "🍉"],
  [/melone|melon/, "🍈"],
  [/honig|honey|marmelade|konfitüre|jam\b|sirup|syrup/, "🍯"],
  [/schoko|chocolate|kakao|cocoa|nutella/, "🍫"],
  [/keks|cookie|kuchen|cake|muffin|waffel|waffle|pfannkuchen|pancake|donut|krapfen|schnecke/, "🍪"],
  [/fruchtgummi|gummibär|gummy|bonbon|candy|süßigkeit/, "🍬"],
  [/eis\b|ice cream|gelato/, "🍨"],
  [/sahne|schmand|crème fraîche|creme fraiche|\bcream\b/, "🥛"],
  [/chips|crisps|popcorn/, "🍿"],
  [/walnuss|walnüss|mandel|almond|nuss|nüsse|\bnuts?\b|cashew|pistazie|pistachio|pecan|macadamia/, "🌰"],
  [/samen|seed|chia|leinsamen|flax|sesam|sonnenblumenkern|kerne\b/, "🌱"],
  [/kaffee|coffee|espresso|cappuccino|latte/, "☕"],
  [/tee\b|tea\b/, "🍵"],
  // spices after dishes and meat, so "Pfeffersalami" or "Haferflocken mit Zimt" keep their picture
  [/zimt|cinnamon|gewürz|spice|pfeffer(?!minz)|paprikapulver|paprika \(spice\)|kurkuma|turmeric|curry ?pulver|muskat|^salz\b|^salt\b|speisesalz|meersalz/, "🧂"],
  // fruits without a fitting picture: a letter instead of a wrong apple or palm
  [/granatapfel|pomegranate|maracuja|passionsfrucht|passion fruit|feige|\bfigs?\b|pflaume|\bplums?\b|prune/, null],
  [/apfel|apple/, "🍎"],
  [/banane|banana/, "🍌"],
  [/traube|grape(?!fruit)/, "🍇"],
  [/orange|mandarine|clementine|zitrone|lemon|limette|\blime|grapefruit|pampelmuse/, "🍊"],
  [/kiwi/, "🥝"],
  [/ananas|pineapple/, "🍍"],
  [/mango(?!ld)/, "🥭"],
  [/birne|pear\b/, "🍐"],
  [/pfirsich|peach|nektarine|nectarine|aprikose|apricot/, "🍑"],
  [/kirsche|cherr/, "🍒"],
  [/avocado/, "🥑"],
  [/obstsalat|fruit salad|\bobst\b/, "🍎"],
  [/tomate|tomato/, "🍅"],
  [/karotte|möhre|carrot/, "🥕"],
  [/aubergine|eggplant/, "🍆"],
  [/spinat|spinach|mangold|chard|pak ?choi|bok choy|rucola|arugula|wirsing|grünkohl|kale\b|(?<![a-zäöüß])lauch|porree|leek|kresse|cress/, "🥬"],
  [/brokkoli|broccoli|zucchini|kohl|cabbage|rosenkohl|sprout/, "🥦"],
  [/chili|jalape|peperoni/, "🌶️"],
  [/paprika|bell pepper/, "🫑"],
  [/mais|corn/, "🌽"],
  [/zwiebel|onion|knoblauch|garlic|schalotte|shallot/, "🧅"],
  [/pilz|champignon|mushroom|shiitake|pfifferling/, "🍄"],
  [/basilikum|basil|oregano|petersilie|parsley|schnittlauch|chives|dill\b|koriander|cilantro|minze|\bmint|kräuter|herb/, "🌿"],
  [/gemüse|vegetable/, "🥦"],
  [/saft|juice|smoothie|limo|\bcola|soda|drink|getränk/, "🧃"],
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
  for (const [re, icon] of RULES) if (re.test(n)) return icon ?? (kind === "recipe" ? "🥘" : null);
  return kind === "recipe" ? "🥘" : null;
}

/** First letter for the neutral fallback tile. */
export function foodInitial(name: string): string {
  return (name.trim().match(/\p{L}|\p{N}/u)?.[0] ?? "?").toUpperCase();
}
