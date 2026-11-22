"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, Plus, Star, Trash2, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { fmt } from "@/lib/i18n";
import type { FoodCandidate } from "@/lib/food-sources/types";
import type { MealSlot, Recipe } from "@/lib/data/types";
import { useMeals } from "@/components/meals-context";
import { recipeNutrition, parseIngredientLine } from "@/lib/nutrition/recipe";
import { hasRequiredNutrients, PRIMARY_NUTRIENTS } from "@/lib/nutrition/nutrients";
import { formatNumber } from "@/lib/format";
import { Button, Card, Field, Input, Notice, SectionTitle, Select, cx } from "@/components/ui";
import { FoodSearch } from "../../add/food-search";
import { BarcodeTab } from "../../add/barcode-tab";
import { FoodForm } from "../../add/food-form";
import { FoodSheet } from "../../add/food-sheet";
import { deleteRecipeAction, logRecipe, saveRecipeAction, setRecipeFlags } from "../actions";

interface Item {
  key: string;
  food: FoodCandidate;
  amount_g: number;
}
interface Pending {
  key: string;
  name: string;
  amount_g: number | null;
}
type PickerTab = "search" | "scan" | "manual";

let counter = 0;
const nextKey = () => `k${++counter}`;

function ingredientToCandidate(i: Recipe["ingredients"][number]): FoodCandidate {
  return {
    id: i.food_id ?? undefined,
    source: i.source === "recipe" ? "custom" : i.source,
    source_id: i.source_id,
    source_url: null,
    name: i.name,
    brand: i.brand,
    barcode: null,
    serving_size_g: null,
    image_url: null,
    nutrients: i.nutrients_per_100g,
  };
}

export function RecipeEditor({ recipe, recent, favorites, today }: { recipe: Recipe | null; recent: FoodCandidate[]; favorites: FoodCandidate[]; today: string }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState(recipe?.name ?? "");
  const [notes, setNotes] = useState(recipe?.notes ?? "");
  const [cooked, setCooked] = useState(recipe?.cooked_weight_g ? String(recipe.cooked_weight_g) : "");
  const [servings, setServings] = useState(recipe?.servings ? String(recipe.servings) : "");
  const [favorite, setFavorite] = useState(recipe?.is_favorite ?? false);
  const [items, setItems] = useState<Item[]>(() => (recipe?.ingredients ?? []).map((i) => ({ key: nextKey(), food: ingredientToCandidate(i), amount_g: i.amount_g })));
  const [lines, setLines] = useState<Pending[]>([]);
  const [paste, setPaste] = useState<string | null>(null);
  const [picker, setPicker] = useState<{ tab: PickerTab; query?: string; pendingKey?: string; amount?: number; draft?: Partial<FoodCandidate> } | null>(null);
  const [selected, setSelected] = useState<FoodCandidate | null>(null);
  const [status, setStatus] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [logging, setLogging] = useState(false);
  const meals = useMeals();
  const [meal, setMeal] = useState<MealSlot>(meals.slots.some((s) => s.key === "lunch") ? "lunch" : meals.slots[0].key);
  const [dirty, setDirty] = useState(false);

  const cookedG = Number(cooked.replace(",", "."));
  const nutrition = useMemo(
    () => recipeNutrition(items.map((i) => ({ amount_g: i.amount_g, nutrients_per_100g: i.food.nutrients })), cookedG > 0 ? cookedG : null),
    [items, cookedG],
  );
  const touch = () => setDirty(true);

  const addItem = (food: FoodCandidate, grams: number) => {
    setItems((s) => [...s, { key: nextKey(), food, amount_g: grams }]);
    if (picker?.pendingKey) setLines((s) => s.filter((l) => l.key !== picker.pendingKey));
    setSelected(null);
    setPicker(null);
    touch();
  };

  async function save(): Promise<string | null> {
    setStatus(null);
    if (!name.trim()) {
      setStatus({ tone: "error", text: t.errors.invalidInput });
      return null;
    }
    if (items.length === 0) {
      setStatus({ tone: "error", text: t.recipes.needIngredients });
      return null;
    }
    const res = await saveRecipeAction({
      id: recipe?.id,
      name: name.trim(),
      notes: notes.trim() || null,
      cooked_weight_g: cookedG > 0 ? cookedG : null,
      servings: Number(servings) > 0 ? Number(servings.replace(",", ".")) : null,
      ingredients: items.map((i) => ({ food: { ...i.food, source: i.food.source === "recipe" ? "custom" : i.food.source }, amount_g: i.amount_g })),
    });
    if (!res.ok) {
      const incomplete = res.error.startsWith("incomplete:") ? res.error.slice(11) : null;
      setStatus({ tone: "error", text: incomplete ? fmt(t.recipes.incompleteIngredient, { name: incomplete }) : t.common.error });
      return null;
    }
    if (favorite !== (recipe?.is_favorite ?? false)) await setRecipeFlags(res.id, { is_favorite: favorite });
    setStatus({ tone: "success", text: t.recipes.saved });
    setDirty(false);
    if (!recipe) router.replace(`/nutrition/recipes/${res.id}`);
    return res.id;
  }

  const recipeCandidate: FoodCandidate | null = recipe
    ? {
        id: recipe.id,
        source: "recipe",
        source_id: recipe.id,
        source_url: null,
        name: name || recipe.name,
        brand: null,
        barcode: null,
        serving_size_g: Number(servings) > 0 && nutrition.totalWeightG > 0 ? Math.round(nutrition.totalWeightG / Number(servings)) : null,
        image_url: null,
        nutrients: nutrition.per100g,
      }
    : null;

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <div className="flex items-end gap-2">
          <Field label={t.recipes.name} className="flex-1">
            <Input value={name} onChange={(e) => (setName(e.target.value), touch())} placeholder={t.recipes.namePlaceholder} maxLength={200} />
          </Field>
          <button
            type="button"
            aria-pressed={favorite}
            aria-label={t.recipes.favorite}
            onClick={() => (setFavorite(!favorite), touch())}
            className="grid size-12 place-items-center rounded-2xl border border-line bg-surface-2"
          >
            <Star className={cx("size-5", favorite ? "fill-carbs text-carbs" : "text-muted")} />
          </button>
        </div>
      </Card>

      <Card className="p-0">
        <div className="px-4 pt-4">
          <SectionTitle
            action={
              <button type="button" className="inline-flex items-center gap-1 text-sm text-muted hover:text-text" onClick={() => setPaste(paste === null ? "" : null)}>
                <ClipboardList className="size-4" /> {t.recipes.pasteList}
              </button>
            }
          >
            {t.recipes.ingredients}
          </SectionTitle>
        </div>

        {paste !== null && (
          <div className="space-y-2 px-4 pb-4">
            <p className="text-xs text-faint">{t.recipes.pasteHint}</p>
            <textarea
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
              rows={6}
              className="w-full rounded-2xl border border-line bg-surface-2 p-3 text-[15px] outline-none focus:border-accent/60"
              placeholder={"200 g Reis\n500 g Hackfleisch\n1 Dose Kidneybohnen 400 g"}
            />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                const parsed = paste
                  .split("\n")
                  .map(parseIngredientLine)
                  .filter((l): l is { name: string; amount_g: number | null } => l !== null);
                setLines((s) => [...s, ...parsed.map((p) => ({ key: nextKey(), ...p }))]);
                setPaste(null);
              }}
            >
              {t.recipes.parse}
            </Button>
          </div>
        )}

        <ul className="divide-y divide-line border-t border-line">
          {items.map((i) => (
            <li key={i.key} className="flex items-center gap-2 px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px]">{i.food.name}</div>
                <div className="num truncate text-xs text-muted">
                  {i.food.brand ? `${i.food.brand} · ` : ""}
                  {i.food.nutrients.energy_kcal !== undefined ? `${formatNumber((i.food.nutrients.energy_kcal * i.amount_g) / 100, locale)} kcal` : "–"}
                </div>
              </div>
              <div className="relative w-24">
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0.1}
                  step="0.1"
                  value={i.amount_g}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setItems((s) => s.map((x) => (x.key === i.key ? { ...x, amount_g: v > 0 ? v : x.amount_g } : x)));
                    touch();
                  }}
                  className="num h-10 pr-7 text-right"
                />
                <span className="absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted">g</span>
              </div>
              <button
                type="button"
                aria-label={t.common.delete}
                onClick={() => (setItems((s) => s.filter((x) => x.key !== i.key)), touch())}
                className="grid size-9 place-items-center rounded-lg text-faint hover:text-danger"
              >
                <X className="size-4" />
              </button>
            </li>
          ))}
          {lines.map((l) => (
            <li key={l.key} className="flex items-center gap-2 bg-warn/5 px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px]">{l.name}</div>
                <div className="num text-xs text-warn">
                  {l.amount_g !== null ? `${formatNumber(l.amount_g, locale)} g · ` : ""}
                  {t.recipes.unmatched}
                </div>
              </div>
              <Button type="button" size="sm" variant="secondary" onClick={() => setPicker({ tab: "search", query: l.name, pendingKey: l.key, amount: l.amount_g ?? undefined })}>
                {t.recipes.match}
              </Button>
              <button type="button" aria-label={t.common.delete} onClick={() => setLines((s) => s.filter((x) => x.key !== l.key))} className="grid size-9 place-items-center rounded-lg text-faint hover:text-danger">
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
        <div className="p-4">
          <Button type="button" variant="secondary" className="w-full" onClick={() => setPicker({ tab: "search" })}>
            <Plus className="size-4" /> {t.recipes.addIngredient}
          </Button>
        </div>
      </Card>

      <Card className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted">{t.recipes.rawWeight}</span>
          <span className="num">{formatNumber(nutrition.rawWeightG, locale)} g</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t.recipes.cookedWeight}>
            <Input type="number" inputMode="decimal" min={1} value={cooked} onChange={(e) => (setCooked(e.target.value), touch())} className="num" />
          </Field>
          <Field label={`${t.recipes.servings} (${t.common.optional})`}>
            <Input type="number" inputMode="decimal" min={1} value={servings} onChange={(e) => (setServings(e.target.value), touch())} className="num" />
          </Field>
        </div>
        <p className="text-xs text-faint">{t.recipes.cookedHint}</p>
      </Card>

      {items.length > 0 && (
        <Card>
          <SectionTitle>{t.recipes.per100}</SectionTitle>
          <div className="grid grid-cols-5 gap-2 rounded-2xl bg-surface-2 p-3 text-center">
            {PRIMARY_NUTRIENTS.map((k) => (
              <div key={k}>
                <div className="num text-[15px] font-semibold">{nutrition.per100g[k] !== undefined ? formatNumber(nutrition.per100g[k]!, locale, k === "energy_kcal" ? 0 : 1) : "–"}</div>
                <div className="mt-0.5 text-[10px] text-muted">{k === "energy_kcal" ? "kcal" : t.nutrients[k]}</div>
              </div>
            ))}
          </div>
          <div className="num mt-3 text-sm text-muted">
            {t.recipes.total}: {nutrition.total.energy_kcal !== undefined ? `${formatNumber(nutrition.total.energy_kcal, locale)} kcal` : "–"}
            {nutrition.total.protein_g !== undefined && ` · ${t.nutrients.protein_g} ${formatNumber(nutrition.total.protein_g, locale)} g`}
          </div>
          {nutrition.unknown.length > 0 && (
            <p className="mt-2 text-xs text-faint">
              {fmt(t.recipes.unknownNutrients, { list: nutrition.unknown.slice(0, 8).map((k) => t.nutrients[k]).join(", ") + (nutrition.unknown.length > 8 ? " …" : "") })}
            </p>
          )}
        </Card>
      )}

      <Card>
        <Field label={`${t.recipes.notes} (${t.common.optional})`}>
          <textarea
            value={notes}
            onChange={(e) => (setNotes(e.target.value), touch())}
            rows={3}
            maxLength={2000}
            className="w-full rounded-2xl border border-line bg-surface-2 p-3 text-[15px] outline-none focus:border-accent/60"
          />
        </Field>
      </Card>

      {status && <Notice tone={status.tone}>{status.text}</Notice>}
      {!recipe && <p className="text-center text-xs text-faint">{t.recipes.viaClaude}</p>}

      <div className="grid gap-2">
        <Button type="button" disabled={pending} onClick={() => start(async () => void (await save()))}>
          {pending ? t.common.saving : t.recipes.save}
        </Button>
        {recipe && (
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <Select value={meal} onChange={(e) => setMeal(e.target.value as MealSlot)}>
              {meals.slots.map(({ key: m }) => (
                <option key={m} value={m}>
                  {meals.name(m)}
                </option>
              ))}
            </Select>
            <Button
              type="button"
              variant="secondary"
              disabled={pending || !hasRequiredNutrients(nutrition.per100g)}
              onClick={() =>
                start(async () => {
                  if (dirty && !(await save())) return;
                  setLogging(true);
                })
              }
            >
              {t.recipes.log}
            </Button>
          </div>
        )}
        {recipe && (
          <Button
            type="button"
            variant="ghost"
            className="text-danger"
            disabled={pending}
            onClick={() => {
              if (!confirm(t.common.confirmDelete)) return;
              start(async () => {
                await deleteRecipeAction(recipe.id);
                router.replace("/nutrition/recipes");
              });
            }}
          >
            <Trash2 className="size-4" /> {t.recipes.delete}
          </Button>
        )}
      </div>

      {picker && !selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true">
          <button type="button" aria-label={t.common.close} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setPicker(null)} />
          <div className="relative max-h-[92dvh] w-full max-w-xl animate-fade-up overflow-y-auto rounded-t-[28px] border border-line bg-bg px-4 pt-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{t.recipes.addIngredient}</h2>
              <button type="button" onClick={() => setPicker(null)} className="grid size-9 place-items-center rounded-full bg-surface-2 text-muted" aria-label={t.common.close}>
                <X className="size-4" />
              </button>
            </div>
            <div className="mb-4 grid grid-cols-3 gap-1 rounded-2xl bg-surface p-1">
              {(["search", "scan", "manual"] as const).map((x) => (
                <button
                  key={x}
                  type="button"
                  onClick={() => setPicker({ ...picker, tab: x })}
                  className={cx("h-10 rounded-xl text-sm font-medium", picker.tab === x ? "bg-surface-3 text-text" : "text-muted")}
                >
                  {{ search: t.addFood.tabSearch, scan: t.addFood.tabScan, manual: t.addFood.tabManual }[x]}
                </button>
              ))}
            </div>
            {picker.tab === "search" && <FoodSearch recent={recent} favorites={favorites} onSelect={setSelected} initialQuery={picker.query} />}
            {picker.tab === "scan" && <BarcodeTab onFound={setSelected} onNotFound={(barcode) => setPicker({ ...picker, tab: "manual", draft: { barcode } })} />}
            {picker.tab === "manual" && <FoodForm key={JSON.stringify(picker.draft ?? {})} initial={picker.draft ?? (picker.query ? { name: picker.query } : null)} onSubmit={setSelected} />}
          </div>
        </div>
      )}

      {selected && (
        <FoodSheet
          food={selected}
          meal="lunch"
          date={today}
          initialAmount={picker?.amount}
          submitLabel={t.recipes.addToRecipe}
          onClose={() => setSelected(null)}
          onComplete={(f) => {
            setSelected(null);
            setPicker({ ...(picker ?? {}), tab: "manual", draft: f });
          }}
          onLogged={() => undefined}
          onSubmit={async (g) => {
            addItem(selected, g);
            return { ok: true };
          }}
        />
      )}

      {logging && recipeCandidate && (
        <FoodSheet
          food={recipeCandidate}
          meal={meal}
          date={today}
          onClose={() => setLogging(false)}
          onComplete={() => setLogging(false)}
          onLogged={() => router.push(`/nutrition?date=${today}`)}
          onSubmit={(g) => logRecipe(recipeCandidate.id!, g, meal, today)}
        />
      )}
    </div>
  );
}
