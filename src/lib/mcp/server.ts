import "server-only";
/**
 * MCP server for Claude. Every tool runs as the user who owns the personal
 * access token; all queries filter by that user's id.
 *
 * Rule for every write tool: nutritional values must come from a database
 * result (search_foods / lookup_barcode) or from a label/recipe the user
 * provided. Claude must never invent them.
 */
import { z } from "zod";
import type { Ctx } from "@/lib/data";
import { getDiary, getFood, getFoodByBarcode, getGoalOn, getPhotos, getProfile, getWeights, searchMyFoods } from "@/lib/data";
import { logFoodEntry, upsertWeight } from "@/lib/data/mutations";
import { addWater, getWater } from "@/lib/data/tracking";
import { getRecipe, listRecipes, logRecipeEntry, saveRecipe } from "@/lib/data/recipes";
import { ensureRoutines } from "@/lib/data/routines";
import { listCardioTemplates } from "@/lib/data/training";
import { workoutMinutes } from "@/lib/training/calc";
import { addCardio, addSet, finishWorkout, getCardio, listCardio, listExercises, listPlans, listWorkouts, rateTraining, setCardioMachine, startWorkout } from "@/lib/data/training";
import { getHealthRange, upsertHealth } from "@/lib/data/health";
import { getMedicationLogs, getSkinRange, listMedications, logMedicationByName, upsertSkin } from "@/lib/data/wellbeing";
import { withKcalEstimates } from "@/lib/cardio";
import { PHOTO_BUCKET } from "@/lib/data";
import { CARDIO_ACTIVITIES, SKIN_AREAS } from "@/lib/data/types";
import { periodSummary } from "@/lib/summary";
import { fetchOffProduct, searchOff } from "@/lib/food-sources/openfoodfacts";
import { searchUsda } from "@/lib/food-sources/usda";
import { getBasicFood, isBasicSourceId, searchBasic } from "@/lib/food-sources/basic";
import type { FoodCandidate } from "@/lib/food-sources/types";
import { BARCODE_RE } from "@/lib/food-sources/types";
import { NUTRIENT_KEYS, NUTRIENTS, sanitizeNutrients } from "@/lib/nutrition/nutrients";
import { sumItems } from "@/lib/nutrition/calc";
import { recipeNutrition } from "@/lib/nutrition/recipe";
import { addDays, isIsoDate, todayIn } from "@/lib/dates";

export const INSTRUCTIONS = `Sigma is the user's personal nutrition, body, training and wellbeing tracker (German/English).
Conventions: dates are YYYY-MM-DD in the user's time zone (Europe/Berlin unless told otherwise). Food nutrients are per 100 g; amounts in grams.
A nutrient missing from a food means "unknown", never zero. Totals report how many entries had data ("entries_with_data").

NEVER invent nutritional values. Use values from search_foods / lookup_barcode results, from the user's own library, or values the user gave you (e.g. a photographed nutrition label). If a food cannot be found, ask the user for the label values.

Recipe photos: read the ingredient list and amounts, look up each ingredient with search_foods (prefer the user's library, then "basic" for whole/unprocessed foods like fruit, vegetables, rice or eggs, then Open Food Facts for branded products, then USDA for anything else), show the user your matches and amounts, and only then call create_recipe. Ask for the cooked weight of the finished dish if the user knows it.

Weekly review: call get_period_summary for the last 7 days (and optionally the 7 days before for comparison) and list_progress_photos / get_progress_photo for visual progress. Comment on calories vs goal, protein, fibre, micronutrients with enough data, weight trend (7-day average, not single weigh-ins), training volume and records, sleep/recovery, the user's subjective workout ratings (feeling/energy/effort 1-10) and per-exercise feelings (exercise_notes in get_training), skin log and medication intake. Be concrete and honest about missing data.

Routines: the user can set up repeatable cardio (cardio_routines in get_training, e.g. an incline walk on fixed weekdays) and supplements that are logged automatically. Supplements with nutrients appear as diary entries (meal "snack") and count towards the daily totals.

Nutrition goals can differ by weekday (e.g. more calories on cardio days): get_day and get_period_summary report the target that applies to each day.

Cardio machine photos: when the user asks you to read their machine/Stairmaster photos, call list_cardio_photos, look at each with get_cardio_photo, read only values that are visible on the display (time, level, floors, steps, kcal), and save them with set_cardio_machine_data. Sigma then combines them with the Garmin data into a best calorie estimate ("kcal_estimate" in get_training).

Skin and medication: log_skin and log_medication record what the user tells you. You may point out patterns, but never give medical advice or suggest changing medication; refer to a doctor.`;

const date = z.string().refine(isIsoDate, "YYYY-MM-DD");
const meal = z.enum(["breakfast", "lunch", "dinner", "snack"]);

type Content = { type: "text"; text: string } | { type: "image"; data: string; mimeType: string };
const json = (value: unknown): { content: Content[] } => ({ content: [{ type: "text", text: JSON.stringify(value, null, 1) }] });
const fail = (message: string) => ({ content: [{ type: "text" as const, text: message }], isError: true });

function compactFood(f: FoodCandidate) {
  return {
    food_id: f.id ?? null,
    source: f.source,
    source_id: f.source_id,
    name: f.name,
    brand: f.brand,
    barcode: f.barcode,
    serving_size_g: f.serving_size_g,
    per_100g: Object.fromEntries(Object.entries(f.nutrients).map(([k, v]) => [k, Math.round((v as number) * 100) / 100])),
  };
}

const nutrientShape = Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, z.number().min(0).optional().describe(`${NUTRIENTS[k].unit} per 100 g`)])) as Record<
  (typeof NUTRIENT_KEYS)[number],
  z.ZodOptional<z.ZodNumber>
>;
const manualFood = z.object({
  name: z.string().min(1).max(200),
  brand: z.string().max(200).optional(),
  barcode: z.string().regex(BARCODE_RE).optional(),
  per_100g: z.object(nutrientShape).describe("Values from a label or database result. energy_kcal, protein_g, carbs_g, fat_g are required."),
});

/** Resolves a food reference given by Claude to a candidate with real data. */
type FoodRef = { food_id?: string; barcode?: string; source?: "openfoodfacts" | "usda"; source_id?: string; manual?: z.infer<typeof manualFood> };
async function resolveFood(ref: FoodRef, ctx: Ctx): Promise<FoodCandidate | string> {
  if (ref.food_id) return (await getFood(ref.food_id, ctx)) ?? `food_id ${ref.food_id} not found in the user's library`;
  if (ref.barcode) {
    const own = await getFoodByBarcode(ref.barcode, ctx);
    if (own) return own;
    return (await fetchOffProduct(ref.barcode)) ?? `barcode ${ref.barcode} not found in Open Food Facts`;
  }
  if (ref.source === "openfoodfacts" && ref.source_id) return (await fetchOffProduct(ref.source_id)) ?? `Open Food Facts product ${ref.source_id} not found`;
  if (ref.source === "usda" && ref.source_id && isBasicSourceId(ref.source_id)) {
    return getBasicFood(ref.source_id) ?? `basic food ${ref.source_id} not found`;
  }
  if (ref.source === "usda" && ref.source_id) {
    const hits = await searchUsda(ref.source_id, 5);
    return hits.find((h) => h.source_id === ref.source_id) ?? `USDA food ${ref.source_id} not found – pass the food via search_foods result instead`;
  }
  if (ref.manual) {
    return {
      source: "custom",
      source_id: null,
      source_url: null,
      name: ref.manual.name,
      brand: ref.manual.brand ?? null,
      barcode: ref.manual.barcode ?? null,
      serving_size_g: null,
      image_url: null,
      nutrients: sanitizeNutrients(ref.manual.per_100g),
    };
  }
  return "Give one of food_id, barcode, source+source_id or manual";
}

const foodRef = {
  food_id: z.string().uuid().optional().describe("food_id from the user's library (search_foods → mine)"),
  barcode: z.string().regex(BARCODE_RE).optional(),
  source: z.enum(["openfoodfacts", "usda"]).optional(),
  source_id: z.string().optional().describe("source_id from a search_foods result"),
  manual: manualFood.optional().describe("Only with values from a label or the user"),
};

/** Cardio session for Claude: without storage paths, with Sigma's calorie estimate. */
function cardioOut(c: Awaited<ReturnType<typeof withKcalEstimates>>[number]) {
  const { machine_photo_path, estimate, ...rest } = c;
  return { ...rest, has_display_photo: Boolean(machine_photo_path), kcal_estimate: estimate?.kcal ?? null, kcal_estimate_sources: estimate?.sources ?? [] };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function registerTools(server: any, ctx: Ctx, canWrite: boolean, timeZone = "Europe/Berlin") {
  const today = () => todayIn(timeZone);
  // Automatic routine entries (cardio templates, daily supplements) are filled in once per request.
  let routines: Promise<number> | null = null;
  const tool = (name: string, description: string, inputSchema: z.ZodObject, handler: (args: never) => Promise<unknown>, write = false) => {
    if (write && !canWrite) return;
    server.registerTool(name, { title: name, description, inputSchema }, async (args: never) => {
      try {
        await (routines ??= ensureRoutines(today(), ctx));
        return await handler(args);
      } catch (e) {
        return fail(`Error: ${(e as Error).message}`);
      }
    });
  };

  // ---------- read ----------
  tool("get_overview", "Profile, current nutrition goal, latest weight and today's date.", z.object({}), async () => {
    const [profile, goal, weights] = await Promise.all([getProfile(ctx), getGoalOn(today(), ctx), getWeights(addDays(today(), -30), ctx)]);
    return json({ today: today(), profile, current_goal: goal, recent_weights: weights.slice(-10) });
  });

  tool("get_day", "All diary entries of one day with totals (per nutrient incl. data coverage), goal and water.", z.object({ date: date.optional() }), async ({ date: d }: { date?: string }) => {
    const day = d ?? today();
    const [entries, goal, water] = await Promise.all([getDiary(day, ctx), getGoalOn(day, ctx), getWater(day, ctx)]);
    const totals = sumItems(entries);
    return json({
      date: day,
      goal,
      water_ml: water,
      totals: Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, { value: Math.round(totals[k].value * 10) / 10, unit: NUTRIENTS[k].unit, entries_with_data: `${totals[k].known}/${totals[k].of}` }])),
      entries: entries.map((e) => ({ id: e.id, meal: e.meal, name: e.food_name, brand: e.food_brand, amount_g: e.amount_g, source: e.source, kcal: e.nutrients_per_100g.energy_kcal !== undefined ? Math.round((e.nutrients_per_100g.energy_kcal * e.amount_g) / 100) : null })),
    });
  });

  tool(
    "get_period_summary",
    "Summary for a date range (max 92 days): daily calories/macros/fibre/water, nutrient averages with data coverage, goals, weight with 7-day average, workouts with sets and estimated 1RM, cardio, sleep/HRV. Use for weekly reviews.",
    z.object({ from: date, to: date }),
    async ({ from, to }: { from: string; to: string }) => {
      if (from > to) return fail("from must be <= to");
      if (addDays(from, 92) < to) return fail("range too long (max 92 days)");
      return json(await periodSummary(from, to, ctx));
    },
  );

  tool("get_weights", "Weight entries (kg) in a range.", z.object({ from: date.optional() }), async ({ from }: { from?: string }) => json(await getWeights(from, ctx)));

  tool("list_progress_photos", "Progress photo metadata (date, pose). Use get_progress_photo to view one.", z.object({}), async () => {
    const photos = await getPhotos(ctx);
    return json(photos.map((p) => ({ id: p.id, taken_on: p.taken_on, pose: p.pose, note: p.note })));
  });

  tool("get_progress_photo", "Returns one progress photo as an image.", z.object({ id: z.string().uuid() }), async ({ id }: { id: string }) => {
    const { data, error } = await ctx.supabase.from("progress_photos").select("storage_path, taken_on, pose").eq("user_id", ctx.userId).eq("id", id).maybeSingle();
    if (error || !data) return fail("photo not found");
    const file = await ctx.supabase.storage.from(PHOTO_BUCKET).download(data.storage_path);
    if (file.error || !file.data) return fail("could not load photo");
    const buf = Buffer.from(await file.data.arrayBuffer());
    return { content: [{ type: "text", text: `Photo ${data.taken_on} (${data.pose})` }, { type: "image", data: buf.toString("base64"), mimeType: file.data.type || "image/jpeg" }] };
  });

  tool(
    "search_foods",
    "Search the user's library, Sigma's basic foods (whole/unprocessed foods with German names, USDA SR28 values incl. fibre and vitamins; source \"usda\", source_id \"sr28-…\"), Open Food Facts (branded products, German names) and USDA (generic foods, English names, detailed micronutrients). Values per 100 g.",
    z.object({ query: z.string().min(2).max(100), sources: z.array(z.enum(["mine", "basic", "openfoodfacts", "usda"])).optional() }),
    async ({ query, sources }: { query: string; sources?: string[] }) => {
      const want = (s: string) => !sources || sources.includes(s);
      const [mine, off, usda] = await Promise.allSettled([
        want("mine") ? searchMyFoods(query, 10, ctx) : Promise.resolve([]),
        want("openfoodfacts") ? searchOff(query, "de", 8) : Promise.resolve([]),
        want("usda") ? searchUsda(query, 6) : Promise.resolve([]),
      ]);
      const v = (r: PromiseSettledResult<FoodCandidate[]>) => (r.status === "fulfilled" ? r.value.map(compactFood) : `unavailable: ${(r.reason as Error)?.message}`);
      const basic = want("basic") ? searchBasic(query, "de", 6).map(compactFood) : [];
      return json({ mine: v(mine), basic, openfoodfacts: v(off), usda: v(usda) });
    },
  );

  tool("lookup_barcode", "Look up a product by EAN/UPC barcode (library first, then Open Food Facts).", z.object({ barcode: z.string().regex(BARCODE_RE) }), async ({ barcode }: { barcode: string }) => {
    const own = await getFoodByBarcode(barcode, ctx);
    const f = own ?? (await fetchOffProduct(barcode));
    return f ? json(compactFood(f)) : fail("not found");
  });

  tool("list_recipes", "The user's recipes with nutrition per 100 g of the finished dish.", z.object({}), async () => {
    const recipes = await listRecipes({}, ctx);
    return json(
      recipes.map((r) => {
        const n = recipeNutrition(r.ingredients, r.cooked_weight_g);
        return { recipe_id: r.id, name: r.name, ingredients: r.ingredients.map((i) => `${i.amount_g} g ${i.name}`), total_weight_g: n.totalWeightG, per_100g: n.per100g, unknown_nutrients: n.unknown };
      }),
    );
  });

  tool("get_training", "Workouts (with sets) and cardio in a range, plus the exercise library and plans.", z.object({ from: date, to: date }), async ({ from, to }: { from: string; to: string }) => {
    const [workouts, rawCardio, exercises, plans, templates] = await Promise.all([
      listWorkouts({ from, to }, ctx),
      listCardio({ from, to }, ctx),
      listExercises(ctx),
      listPlans(ctx),
      listCardioTemplates(ctx),
    ]);
    const cardio = await withKcalEstimates(rawCardio, ctx);
    const name = new Map(exercises.map((e) => [e.id, e.name_de]));
    return json({
      workouts: workouts.map((w) => ({
        ...w,
        duration_min: workoutMinutes(w.started_at, w.finished_at),
        sets: w.sets.map((s) => ({ exercise: name.get(s.exercise_id), reps: s.reps, weight_kg: s.weight_kg, rpe: s.rpe, warmup: s.is_warmup })),
        exercise_notes: w.exercise_notes.map((n) => ({ exercise: name.get(n.exercise_id), feeling: n.feeling, note: n.note })),
      })),
      cardio: cardio.map(cardioOut),
      cardio_routines: templates.map((t) => ({ name: t.name, activity: t.activity, duration_min: t.duration_min, incline_pct: t.incline_pct, speed_kmh: t.speed_kmh, avg_hr: t.avg_hr, kcal: t.kcal, effort: t.effort, auto_weekdays_iso: t.auto_days })),
      plans: plans.map((p) => ({ name: p.name, exercises: p.exercises.map((e) => ({ exercise: name.get(e.exercise_id), sets: e.target_sets, reps: `${e.rep_min}-${e.rep_max}` })) })),
      exercise_library: exercises.map((e) => ({ exercise_id: e.id, name: e.name_de, name_en: e.name_en, muscle_group: e.muscle_group, equipment: e.equipment })),
    });
  });

  tool(
    "get_health",
    "Daily sleep score, sleep minutes, resting HR, HRV, body battery, steps, stress; skin log (score 0 = clear … 4 = severe, areas, note); medication/supplement intake and the user's medication list.",
    z.object({ from: date, to: date }),
    async ({ from, to }: { from: string; to: string }) => {
      const [health, skin, meds, medLogs] = await Promise.all([getHealthRange(from, to, ctx), getSkinRange(from, to, ctx), listMedications(ctx), getMedicationLogs(from, to, ctx)]);
      return json({
        daily: health,
        skin,
        medication_list: meds.map((m) => ({ name: m.name, dose: m.dose, kind: m.kind })),
        medication_taken: medLogs.map((l) => ({ date: l.entry_date, name: l.name, dose: l.dose })),
      });
    },
  );

  tool("list_cardio_photos", "Cardio sessions that have a photo of the machine display, newest first, and whether values were already read.", z.object({ only_unread: z.boolean().default(true) }), async ({ only_unread }: { only_unread: boolean }) => {
    const sessions = (await listCardio({}, ctx)).filter((c) => c.machine_photo_path);
    return json(
      sessions
        .map((c) => ({ cardio_id: c.id, date: c.session_date, activity: c.activity, duration_min: c.duration_min, read: [c.machine_minutes, c.machine_level, c.machine_floors, c.machine_steps, c.machine_kcal].some((v) => v !== null) }))
        .filter((c) => !only_unread || !c.read),
    );
  });

  tool("get_cardio_photo", "Returns the machine display photo of a cardio session as an image.", z.object({ cardio_id: z.string().uuid() }), async ({ cardio_id }: { cardio_id: string }) => {
    const c = await getCardio(cardio_id, ctx);
    if (!c?.machine_photo_path) return fail("no photo for this session");
    const file = await ctx.supabase.storage.from(PHOTO_BUCKET).download(c.machine_photo_path);
    if (file.error || !file.data) return fail("could not load photo");
    const buf = Buffer.from(await file.data.arrayBuffer());
    return { content: [{ type: "text", text: `Machine display, ${c.session_date}, ${c.activity}, ${c.duration_min} min` }, { type: "image", data: buf.toString("base64"), mimeType: "image/jpeg" }] };
  });

  // ---------- write ----------
  tool(
    "log_food",
    "Log an amount of a food to the diary. Reference the food by food_id, barcode, source+source_id (from search_foods), or manual label values.",
    z.object({ ...foodRef, amount_g: z.number().positive().max(5000), meal, date: date.optional() }),
    async (a: FoodRef & { amount_g: number; meal: string; date?: string }) => {
      const food = await resolveFood(a, ctx);
      if (typeof food === "string") return fail(food);
      const res = await logFoodEntry({ food, amount_g: a.amount_g, meal: a.meal, date: a.date ?? today() }, ctx);
      return res.ok ? json({ ok: true, logged: `${a.amount_g} g ${food.name}`, kcal: food.nutrients.energy_kcal !== undefined ? Math.round((food.nutrients.energy_kcal * a.amount_g) / 100) : null }) : fail(res.error === "incomplete" ? "Food lacks energy/protein/carbs/fat values – ask the user for the label." : res.error);
    },
    true,
  );

  tool(
    "create_recipe",
    "Create a recipe from ingredients (raw amounts). Each ingredient references a food like log_food. Optionally the weight of the finished dish. Returns the recipe's nutrition.",
    z.object({
      name: z.string().min(1).max(200),
      notes: z.string().max(2000).optional(),
      cooked_weight_g: z.number().positive().optional(),
      servings: z.number().positive().optional(),
      ingredients: z.array(z.object({ ...foodRef, amount_g: z.number().positive().max(20000) })).min(1).max(60),
    }),
    async (a: { name: string; notes?: string; cooked_weight_g?: number; servings?: number; ingredients: (FoodRef & { amount_g: number })[] }) => {
      const resolved = [];
      for (const ing of a.ingredients) {
        const food = await resolveFood(ing, ctx);
        if (typeof food === "string") return fail(`Ingredient: ${food}`);
        if (food.source === "recipe") return fail("Recipes cannot contain recipes");
        resolved.push({ food: { ...food, source: food.source as "openfoodfacts" | "usda" | "custom" }, amount_g: ing.amount_g });
      }
      const res = await saveRecipe({ name: a.name, notes: a.notes, cooked_weight_g: a.cooked_weight_g, servings: a.servings, ingredients: resolved }, ctx);
      if (!res.ok) return fail(res.error.startsWith("incomplete:") ? `Ingredient "${res.error.slice(11)}" lacks energy/macros – ask for label values.` : res.error);
      const recipe = await getRecipe(res.id, ctx);
      const n = recipeNutrition(recipe!.ingredients, recipe!.cooked_weight_g);
      return json({ ok: true, recipe_id: res.id, total_weight_g: n.totalWeightG, per_100g: n.per100g, unknown_nutrients: n.unknown });
    },
    true,
  );

  tool("log_recipe", "Log an amount (grams of the finished dish) of a saved recipe.", z.object({ recipe_id: z.string().uuid(), amount_g: z.number().positive().max(5000), meal, date: date.optional() }), async (a: { recipe_id: string; amount_g: number; meal: string; date?: string }) => {
    const res = await logRecipeEntry({ recipeId: a.recipe_id, amount_g: a.amount_g, meal: a.meal, date: a.date ?? today() }, ctx);
    return res.ok ? json({ ok: true }) : fail(res.error);
  }, true);

  tool("log_weight", "Log body weight (kg) for a day (replaces that day's value).", z.object({ weight_kg: z.number().min(20).max(400), date: date.optional() }), async (a: { weight_kg: number; date?: string }) => {
    const res = await upsertWeight({ date: a.date ?? today(), weight_kg: a.weight_kg }, ctx);
    return res.ok ? json({ ok: true }) : fail(res.error);
  }, true);

  tool("log_water", "Add water in ml (negative to correct).", z.object({ amount_ml: z.number().int().min(-5000).max(5000), date: date.optional() }), async (a: { amount_ml: number; date?: string }) => {
    const res = await addWater(a.date ?? today(), a.amount_ml, ctx);
    return res.ok ? json({ ok: true, total_ml: res.total }) : fail(res.error);
  }, true);

  tool(
    "log_cardio",
    "Log a cardio session. Use source 'strava'/'garmin' with source_id when importing so repeated imports don't duplicate.",
    z.object({
      date,
      activity: z.enum(CARDIO_ACTIVITIES),
      duration_min: z.number().positive(),
      distance_km: z.number().min(0).optional(),
      avg_hr: z.number().int().optional(),
      kcal: z.number().int().optional(),
      notes: z.string().max(1000).optional(),
      source: z.enum(["claude", "strava", "garmin"]).default("claude"),
      source_id: z.string().max(100).optional(),
    }),
    async (a: Parameters<typeof addCardio>[0]) => {
      const res = await addCardio(a, ctx);
      return res.ok ? json({ ok: true }) : fail(res.error);
    },
    true,
  );

  tool(
    "log_health",
    "Log daily health values (e.g. from Garmin Connect screenshots the user sends): sleep_score, sleep_minutes, resting_hr, hrv_ms, body_battery, steps, stress. Only given fields are changed.",
    z.object({
      date,
      sleep_score: z.number().int().min(0).max(100).optional(),
      sleep_minutes: z.number().int().min(0).max(1440).optional(),
      resting_hr: z.number().int().min(20).max(200).optional(),
      hrv_ms: z.number().int().min(0).max(300).optional(),
      body_battery: z.number().int().min(0).max(100).optional(),
      steps: z.number().int().min(0).max(200000).optional(),
      stress: z.number().int().min(0).max(100).optional(),
      source: z.enum(["claude", "garmin"]).default("claude"),
    }),
    async (a: Parameters<typeof upsertHealth>[0]) => {
      const res = await upsertHealth(a, ctx);
      return res.ok ? json({ ok: true }) : fail(res.error);
    },
    true,
  );

  tool(
    "set_cardio_machine_data",
    "Save values read from a machine display photo (only values visible on the display). Omitted fields stay unchanged.",
    z.object({
      cardio_id: z.string().uuid(),
      minutes: z.number().positive().max(1440).optional(),
      level: z.number().min(0).max(30).optional(),
      floors: z.number().int().min(0).max(5000).optional(),
      steps: z.number().int().min(0).max(100000).optional(),
      kcal: z.number().int().min(0).max(10000).optional(),
    }),
    async (a: { cardio_id: string; minutes?: number; level?: number; floors?: number; steps?: number; kcal?: number }) => {
      const values = { machine_minutes: a.minutes, machine_level: a.level, machine_floors: a.floors, machine_steps: a.steps, machine_kcal: a.kcal };
      const res = await setCardioMachine(a.cardio_id, Object.fromEntries(Object.entries(values).filter(([, v]) => v !== undefined)), ctx);
      if (!res.ok) return fail(res.error);
      const c = await getCardio(a.cardio_id, ctx);
      const [withEst] = await withKcalEstimates(c ? [c] : [], ctx);
      return json({ ok: true, kcal_estimate: withEst?.estimate ?? null });
    },
    true,
  );

  tool(
    "rate_training",
    "Save the user's subjective rating of a workout or cardio session: feeling, energy, effort (1-10 each) and a note. Pass workout_id or cardio_id (from get_training).",
    z.object({
      workout_id: z.string().uuid().optional(),
      cardio_id: z.string().uuid().optional(),
      feeling: z.number().int().min(1).max(10).optional(),
      energy: z.number().int().min(1).max(10).optional(),
      effort: z.number().int().min(1).max(10).optional(),
      note: z.string().max(1000).optional(),
    }),
    async (a: { workout_id?: string; cardio_id?: string; feeling?: number; energy?: number; effort?: number; note?: string }) => {
      if (!a.workout_id === !a.cardio_id) return fail("Pass exactly one of workout_id or cardio_id");
      const res = await rateTraining(a.workout_id ? "workout" : "cardio", (a.workout_id ?? a.cardio_id)!, { feeling: a.feeling ?? null, energy: a.energy ?? null, effort: a.effort ?? null, rating_note: a.note ?? null }, ctx);
      return res.ok ? json({ ok: true }) : fail(res.error);
    },
    true,
  );

  tool(
    "log_skin",
    "Log the skin condition for a day (replaces that day's entry). score: 0 clear, 1 a few, 2 some, 3 many, 4 severe.",
    z.object({ date: date.optional(), score: z.number().int().min(0).max(4), areas: z.array(z.enum(SKIN_AREAS)).optional(), note: z.string().max(1000).optional() }),
    async (a: { date?: string; score: number; areas?: (typeof SKIN_AREAS)[number][]; note?: string }) => {
      const res = await upsertSkin({ date: a.date ?? today(), score: a.score, areas: a.areas ?? [], note: a.note ?? null, source: "claude" }, ctx);
      return res.ok ? json({ ok: true }) : fail(res.error);
    },
    true,
  );

  tool(
    "log_medication",
    "Record that the user took a medication, supplement or skin-care product (matched to their list by name if possible).",
    z.object({ name: z.string().min(1).max(100), dose: z.string().max(100).optional(), date: date.optional() }),
    async (a: { name: string; dose?: string; date?: string }) => {
      const res = await logMedicationByName({ name: a.name, dose: a.dose ?? null, date: a.date ?? today(), source: "claude" }, ctx);
      return res.ok ? json({ ok: true }) : fail(res.error);
    },
    true,
  );

  tool(
    "log_workout",
    "Log a completed strength workout. Exercises by exercise_id from get_training's exercise_library.",
    z.object({
      date,
      name: z.string().min(1).max(100),
      sets: z.array(z.object({ exercise_id: z.string().uuid(), reps: z.number().int().min(0).max(200), weight_kg: z.number().min(0).max(1000), rpe: z.number().min(1).max(10).optional(), warmup: z.boolean().optional() })).min(1).max(200),
    }),
    async (a: { date: string; name: string; sets: { exercise_id: string; reps: number; weight_kg: number; rpe?: number; warmup?: boolean }[] }) => {
      const w = await startWorkout({ planId: null, date: a.date, name: a.name }, ctx);
      if (!w.ok) return fail(w.error);
      for (const s of a.sets) {
        const r = await addSet({ workoutId: w.id, exerciseId: s.exercise_id, reps: s.reps, weight_kg: s.weight_kg, rpe: s.rpe, is_warmup: s.warmup }, ctx);
        if (!r.ok) return fail(`set failed: ${r.error}`);
      }
      await finishWorkout(w.id, ctx);
      return json({ ok: true, workout_id: w.id });
    },
    true,
  );
}
