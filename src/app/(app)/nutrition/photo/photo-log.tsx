"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, ChevronDown, ImagePlus, Plus, Sparkles, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { fmt } from "@/lib/i18n";
import type { FoodCandidate } from "@/lib/food-sources/types";
import type { MealSlot } from "@/lib/data/types";
import { useMeals } from "@/components/meals-context";
import { visibleMeals } from "@/lib/nutrition/meal-slots";
import { recipeNutrition } from "@/lib/nutrition/recipe";
import { cookedWeight, rawWeight } from "@/lib/nutrition/cooking";
import { hasRequiredNutrients, PRIMARY_NUTRIENTS } from "@/lib/nutrition/nutrients";
import type { PhotoAnalysis } from "@/lib/nutrition/photo-types";
import { formatNumber } from "@/lib/format";
import { Button, Card, Field, Input, Notice, SectionTitle, Select, cx } from "@/components/ui";
import { resizeImage } from "../../body/photos/resize";
import { FoodSearch } from "../add/food-search";
import { BarcodeTab } from "../add/barcode-tab";
import { FoodForm } from "../add/food-form";
import { FoodSheet } from "../add/food-sheet";
import { logPhotoMealAction } from "./actions";

interface Shot {
  blob: Blob;
  url: string;
}
interface Row {
  key: string;
  label: string;
  search: string;
  amount_g: number;
  cooks: boolean;
  from: "recipe" | "deviation" | "photo" | "user";
  food: FoodCandidate | null;
  alternatives: FoodCandidate[];
}
type ErrorKey = keyof ReturnType<typeof useI18n>["t"]["photoMeal"]["errors"];

let counter = 0;
const nextKey = () => `p${++counter}`;
const textareaClass = "w-full rounded-2xl border border-line bg-surface-2 p-3 text-[15px] outline-none focus:border-accent/60";

async function shrink(file: File, max: number): Promise<Shot> {
  const { blob } = await resizeImage(file, max, 0.82);
  return { blob, url: URL.createObjectURL(blob) };
}

/** Hidden file input + two buttons (camera only on the camera input, see PR #4). */
function PhotoButtons({ onFiles, multiple = false }: { onFiles: (files: File[]) => void; multiple?: boolean }) {
  const { t } = useI18n();
  const cam = useRef<HTMLInputElement>(null);
  const gal = useRef<HTMLInputElement>(null);
  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length) onFiles(files);
  };
  return (
    <div className="grid grid-cols-2 gap-2">
      <input ref={cam} type="file" accept="image/*" capture="environment" className="hidden" onChange={pick} />
      <input ref={gal} type="file" accept="image/*" multiple={multiple} className="hidden" onChange={pick} />
      <Button type="button" variant="secondary" onClick={() => cam.current?.click()}>
        <Camera className="size-4" /> {t.photoMeal.camera}
      </Button>
      <Button type="button" variant="secondary" onClick={() => gal.current?.click()}>
        <ImagePlus className="size-4" /> {t.photoMeal.gallery}
      </Button>
    </div>
  );
}

function Thumb({ shot, onRemove, big = false }: { shot: Shot; onRemove: () => void; big?: boolean }) {
  const { t } = useI18n();
  return (
    <div className={cx("relative overflow-hidden rounded-2xl bg-surface-2", big ? "aspect-[4/3] w-full" : "size-20")}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={shot.url} alt="" className="size-full object-cover" />
      <button type="button" onClick={onRemove} aria-label={t.photoMeal.remove} className="absolute top-1.5 right-1.5 grid size-7 place-items-center rounded-full bg-black/60 text-white">
        <X className="size-4" />
      </button>
    </div>
  );
}

export function PhotoLog({
  enabled,
  claudeHref,
  initialMeal,
  date,
  recent,
  favorites,
}: {
  enabled: boolean;
  claudeHref: string;
  initialMeal: MealSlot;
  date: string;
  recent: FoodCandidate[];
  favorites: FoodCandidate[];
}) {
  const { t, locale } = useI18n();
  const p = t.photoMeal;
  const router = useRouter();
  const meals = useMeals();
  const [meal, setMeal] = useState<MealSlot>(initialMeal);

  // Step 1: input
  const [food, setFood] = useState<Shot | null>(null);
  const [recipeShots, setRecipeShots] = useState<Shot[]>([]);
  const [recipeText, setRecipeText] = useState("");
  const [showText, setShowText] = useState(false);
  const [notes, setNotes] = useState("");
  const [eaten, setEaten] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 2: review
  const [result, setResult] = useState<PhotoAnalysis | null>(null);
  const [name, setName] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loss, setLoss] = useState("0");
  const [keep, setKeep] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [picker, setPicker] = useState<{ tab: "search" | "scan" | "manual"; rowKey?: string; query?: string; amount?: number; draft?: Partial<FoodCandidate> } | null>(null);
  const [selected, setSelected] = useState<FoodCandidate | null>(null);
  const [pending, start] = useTransition();

  const eatenG = Number(eaten.replace(",", "."));
  const lossPct = Number(loss.replace(",", ".")) || 0;
  const matched = rows.filter((r): r is Row & { food: FoodCandidate } => r.food !== null);
  const raw = rawWeight(rows);
  const cooked = cookedWeight(rows, lossPct);
  const nutrition = recipeNutrition(matched.map((r) => ({ amount_g: r.amount_g, nutrients_per_100g: r.food.nutrients })), cooked);
  const unmatched = rows.length - matched.length;

  if (!enabled) {
    return (
      <Card className="space-y-3">
        <p className="text-sm text-muted">{p.disabled}</p>
        <a href={claudeHref} target="_blank" rel="noreferrer" className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-surface-2 font-medium">
          <Sparkles className="size-4 text-[#d97757]" /> {p.useClaude}
        </a>
      </Card>
    );
  }

  async function analyse() {
    setError(null);
    if (!food && recipeShots.length === 0 && !recipeText.trim()) return setError(p.needInput);
    if (!(eatenG > 0)) return setError(p.needEaten);
    setBusy(true);
    try {
      const form = new FormData();
      if (food) form.append("food", food.blob, "food.jpg");
      recipeShots.forEach((s, i) => form.append("recipe", s.blob, `recipe-${i}.jpg`));
      form.append("recipeText", recipeText);
      form.append("notes", notes);
      form.append("eatenG", String(eatenG));
      const res = await fetch("/api/food/photo", { method: "POST", body: form });
      const body = await res.json().catch(() => ({ error: "api" }));
      if (!res.ok) {
        const key = (body.error in p.errors ? body.error : "api") as ErrorKey;
        setError(p.errors[key]);
        return;
      }
      const a = body as PhotoAnalysis;
      setResult(a);
      setName(a.dish_name);
      setLoss(String(a.loss_pct));
      setKeep(a.basis === "recipe");
      setRows(a.ingredients.map((i) => ({ key: nextKey(), label: i.name, search: i.search, amount_g: i.amount_g, cooks: i.cooks, from: i.from, food: i.match, alternatives: i.alternatives })));
      window.scrollTo({ top: 0 });
    } catch {
      setError(p.errors.api);
    } finally {
      setBusy(false);
    }
  }

  const update = (key: string, patch: Partial<Row>) => setRows((s) => s.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  function choose(f: FoodCandidate, grams?: number) {
    if (picker?.rowKey) {
      const row = rows.find((r) => r.key === picker.rowKey);
      update(picker.rowKey, { food: f, alternatives: row?.food ? [row.food, ...row.alternatives.filter((a) => a !== f)] : row?.alternatives ?? [], ...(grams ? { amount_g: grams } : {}) });
    } else {
      setRows((s) => [...s, { key: nextKey(), label: f.name, search: f.name, amount_g: grams ?? 100, cooks: true, from: "user", food: f, alternatives: [] }]);
    }
    setSelected(null);
    setPicker(null);
    setOpen(null);
  }

  function submit() {
    setError(null);
    if (unmatched > 0) return setError(p.noMatch);
    if (!(eatenG > 0)) return setError(p.needEaten);
    if (!hasRequiredNutrients(nutrition.per100g)) return setError(t.addFood.incomplete);
    const noteLines = [
      notes.trim() ? `${p.notes}: ${notes.trim()}` : null,
      `${result?.basis === "recipe" ? p.basisRecipe : p.basisPortion} · ${p.loss} ${formatNumber(lossPct, locale)} %`,
      ...(result?.assumptions ?? []),
    ].filter(Boolean);
    start(async () => {
      const res = await logPhotoMealAction({
        recipe: {
          name: name.trim() || p.title,
          notes: noteLines.join("\n").slice(0, 2000),
          cooked_weight_g: cooked > 0 ? cooked : null,
          ingredients: matched.map((r) => ({ food: { ...r.food, source: r.food.source === "recipe" ? "custom" : r.food.source }, amount_g: r.amount_g })),
        },
        keep,
        eaten_g: eatenG,
        meal,
        date,
      });
      if (!res.ok) {
        const incomplete = "error" in res && res.error.startsWith("incomplete:") ? res.error.slice(11) : null;
        setError(incomplete ? fmt(t.recipes.incompleteIngredient, { name: incomplete }) : t.common.error);
        return;
      }
      router.push(`/nutrition?date=${date}`);
    });
  }

  const mealSelect = (
    <Field label={t.addFood.meal}>
      <Select value={meal} onChange={(e) => setMeal(e.target.value as MealSlot)}>
        {visibleMeals(meals.slots, [initialMeal]).map((m) => (
          <option key={m} value={m}>
            {meals.name(m)}
          </option>
        ))}
      </Select>
    </Field>
  );
  const eatenField = (
    <Field label={p.eaten}>
      <Input type="number" inputMode="decimal" min={1} max={5000} value={eaten} onChange={(e) => setEaten(e.target.value)} className="num" placeholder="350" />
    </Field>
  );

  // ---------------- Step 1 ----------------
  if (!result) {
    return (
      <div className="space-y-4">
        <Card className="space-y-3">
          <SectionTitle>{p.foodPhoto}</SectionTitle>
          {food ? <Thumb big shot={food} onRemove={() => setFood(null)} /> : <p className="-mt-1 text-xs text-faint">{p.foodPhotoHint}</p>}
          {!food && <PhotoButtons onFiles={async ([f]) => setFood(await shrink(f, 1280))} />}
        </Card>

        <Card className="space-y-3">
          <SectionTitle>
            {p.recipe} <span className="font-normal text-faint">({t.common.optional})</span>
          </SectionTitle>
          <p className="-mt-1 text-xs text-faint">{p.recipeHint}</p>
          {recipeShots.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {recipeShots.map((s, i) => (
                <Thumb key={s.url} shot={s} onRemove={() => setRecipeShots((x) => x.filter((_, j) => j !== i))} />
              ))}
            </div>
          )}
          {recipeShots.length < 3 && <PhotoButtons multiple onFiles={async (files) => {
            const shots = await Promise.all(files.slice(0, 3 - recipeShots.length).map((f) => shrink(f, 1568)));
            setRecipeShots((x) => [...x, ...shots].slice(0, 3));
          }} />}
          {showText ? (
            <textarea value={recipeText} onChange={(e) => setRecipeText(e.target.value)} rows={5} maxLength={4000} className={textareaClass} placeholder={p.recipePlaceholder} />
          ) : (
            <button type="button" className="text-sm text-muted underline-offset-2 hover:underline" onClick={() => setShowText(true)}>
              {p.recipeText}
            </button>
          )}
        </Card>

        <Card>
          <Field label={`${p.notes} (${t.common.optional})`}>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={1000} className={textareaClass} placeholder={p.notesPlaceholder} />
          </Field>
        </Card>

        <Card className="space-y-2">
          <div className="grid grid-cols-2 gap-3">
            {eatenField}
            {mealSelect}
          </div>
          <p className="text-xs text-faint">{p.eatenHint}</p>
        </Card>

        {error && <Notice tone="error">{error}</Notice>}
        <Button type="button" className="w-full" disabled={busy} onClick={analyse}>
          <Sparkles className="size-4" /> {busy ? p.analysing : p.analyse}
        </Button>
      </div>
    );
  }

  // ---------------- Step 2 ----------------
  const portion = (k: (typeof PRIMARY_NUTRIENTS)[number]) => {
    const v = nutrition.per100g[k];
    return v === undefined || !(eatenG > 0) ? "–" : formatNumber((v * eatenG) / 100, locale, k === "energy_kcal" ? 0 : 1);
  };

  return (
    <div className="space-y-4">
      <Card className="space-y-2">
        <h2 className="text-lg font-semibold">{p.reviewTitle}</h2>
        <p className="text-sm text-muted">{p.reviewHint}</p>
        <Field label={t.recipes.name}>
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={200} />
        </Field>
        {result.assumptions.length > 0 && (
          <div className="rounded-2xl bg-surface-2 p-3 text-sm">
            <div className="mb-1 text-xs font-medium text-muted">{p.assumptions}</div>
            <ul className="list-disc space-y-0.5 pl-4 text-muted">
              {result.assumptions.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      <Card className="p-0">
        <div className="px-4 pt-4">
          <SectionTitle>
            {t.recipes.ingredients} <span className="font-normal text-faint">· {result.basis === "recipe" ? p.basisRecipe : p.basisPortion}</span>
          </SectionTitle>
        </div>
        <ul className="divide-y divide-line border-t border-line">
          {rows.map((r) => (
            <li key={r.key} className={cx("px-4 py-2.5", !r.food && "bg-warn/5")}>
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                <button type="button" className="block w-full min-w-0 text-left" onClick={() => setOpen(open === r.key ? null : r.key)} aria-expanded={open === r.key}>
                  <div className="flex items-center gap-1 truncate text-[15px]">
                    <span className="truncate">{r.food ? r.food.name : r.label}</span>
                    <ChevronDown className={cx("size-3.5 shrink-0 text-faint transition", open === r.key && "rotate-180")} />
                  </div>
                  <div className="num truncate text-xs text-muted">
                    {r.food ? (
                      <>
                        {r.label !== r.food.name && `${r.label} · `}
                        {r.food.nutrients.energy_kcal !== undefined ? `${formatNumber((r.food.nutrients.energy_kcal * r.amount_g) / 100, locale)} kcal` : "–"}
                        {r.from === "deviation" && ` · ${p.fromDeviation}`}
                        {r.from === "photo" && ` · ${p.fromPhoto}`}
                      </>
                    ) : (
                      <span className="text-warn">{p.noMatch}</span>
                    )}
                  </div>
                </button>
                <button
                  type="button"
                  title={p.cooksHint}
                  aria-pressed={r.cooks}
                  onClick={() => update(r.key, { cooks: !r.cooks })}
                  className={cx("mt-1 h-6 rounded-full px-2 text-[11px] font-medium", r.cooks ? "bg-accent/15 text-accent" : "bg-surface-2 text-faint line-through")}
                >
                  {p.cooks}
                </button>
                </div>
                <div className="relative w-20 shrink-0">
                  <Input
                    type="number"
                    inputMode="decimal"
                    min={1}
                    value={r.amount_g}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      if (v > 0) update(r.key, { amount_g: v });
                    }}
                    className="num h-10 pr-6 text-right"
                  />
                  <span className="absolute top-1/2 right-2.5 -translate-y-1/2 text-xs text-muted">g</span>
                </div>
                <button type="button" aria-label={t.common.delete} onClick={() => setRows((s) => s.filter((x) => x.key !== r.key))} className="grid size-8 shrink-0 place-items-center rounded-lg text-faint hover:text-danger">
                  <X className="size-4" />
                </button>
              </div>
              {(open === r.key || !r.food) && (
                <div className="mt-2 space-y-1">
                  {r.alternatives.length > 0 && <div className="text-xs text-faint">{p.alternatives}</div>}
                  {r.alternatives.map((f) => (
                    <button
                      key={`${f.source}:${f.source_id ?? f.id ?? f.name}`}
                      type="button"
                      onClick={() => update(r.key, { food: f, alternatives: [...(r.food ? [r.food] : []), ...r.alternatives.filter((x) => x !== f)] })}
                      className="flex w-full items-center justify-between gap-2 rounded-xl bg-surface-2 px-3 py-2 text-left text-sm"
                    >
                      <span className="truncate">
                        {f.name}
                        {f.brand && <span className="text-muted"> · {f.brand}</span>}
                      </span>
                      <span className="num shrink-0 text-xs text-muted">{f.nutrients.energy_kcal !== undefined ? `${formatNumber(f.nutrients.energy_kcal, locale)} kcal/100 g` : ""}</span>
                    </button>
                  ))}
                  <Button type="button" size="sm" variant="secondary" onClick={() => setPicker({ tab: "search", rowKey: r.key, query: r.search, amount: r.amount_g })}>
                    {p.searchOther}
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
        <div className="p-4">
          <Button type="button" variant="secondary" className="w-full" onClick={() => setPicker({ tab: "search" })}>
            <Plus className="size-4" /> {t.recipes.addIngredient}
          </Button>
        </div>
      </Card>

      <Card className="space-y-2">
        <div className="flex items-end gap-3">
          <Field label={p.loss} className="flex-1">
            <div className="relative">
              <Input type="number" inputMode="decimal" min={0} max={60} value={loss} onChange={(e) => setLoss(e.target.value)} className="num pr-8" />
              <span className="absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted">%</span>
            </div>
          </Field>
        </div>
        <p className="num text-sm">{fmt(p.cookedEstimate, { value: formatNumber(cooked, locale), raw: formatNumber(raw, locale) })}</p>
        <p className="text-xs text-faint">{p.lossHint}</p>
      </Card>

      <Card className="space-y-3">
        <SectionTitle>{p.portion}</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          {eatenField}
          {mealSelect}
        </div>
        <div className="grid grid-cols-5 gap-2 rounded-2xl bg-surface-2 p-3 text-center">
          {PRIMARY_NUTRIENTS.map((k) => (
            <div key={k}>
              <div className="num text-[15px] font-semibold">{portion(k)}</div>
              <div className="mt-0.5 text-[10px] text-muted">{k === "energy_kcal" ? "kcal" : t.nutrients[k]}</div>
            </div>
          ))}
        </div>
        {nutrition.partial.length > 0 && (
          <p className="text-xs text-faint">
            {fmt(t.recipes.partialNutrients, { list: nutrition.partial.slice(0, 6).map((x) => `${t.nutrients[x.key]} ${Math.round(x.knownShare * 100)} %`).join(", ") })}
          </p>
        )}
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" checked={keep} onChange={(e) => setKeep(e.target.checked)} className="mt-0.5 size-5 accent-[var(--accent)]" />
          <span>
            {p.keep}
            <span className="block text-xs text-faint">{p.keepHint}</span>
          </span>
        </label>
      </Card>

      {error && <Notice tone="error">{error}</Notice>}
      <Button type="button" className="w-full" disabled={pending || unmatched > 0 || matched.length === 0} onClick={submit}>
        {pending ? t.common.saving : p.log}
      </Button>
      <p className="num text-center text-xs text-faint">
        {fmt(p.cost, {
          cost: `${formatNumber(result.cost_eur * 100, locale, 1)} ct`,
          month: `${formatNumber(result.month_eur, locale, 2)} €`,
          budget: `${formatNumber(result.budget_eur, locale, 2)} €`,
        })}
      </p>

      {picker && !selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true">
          <button type="button" aria-label={t.common.close} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setPicker(null)} />
          <div className="relative max-h-[92dvh] w-full max-w-xl animate-fade-up overflow-y-auto rounded-t-[28px] border border-line bg-bg px-4 pt-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{picker.rowKey ? p.change : t.recipes.addIngredient}</h2>
              <button type="button" onClick={() => setPicker(null)} className="grid size-9 place-items-center rounded-full bg-surface-2 text-muted" aria-label={t.common.close}>
                <X className="size-4" />
              </button>
            </div>
            <div className="mb-4 grid grid-cols-3 gap-1 rounded-2xl bg-surface p-1">
              {(["search", "scan", "manual"] as const).map((x) => (
                <button key={x} type="button" onClick={() => setPicker({ ...picker, tab: x })} className={cx("h-10 rounded-xl text-sm font-medium", picker.tab === x ? "bg-surface-3 text-text" : "text-muted")}>
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
          meal={meal}
          date={date}
          initialAmount={picker?.amount}
          submitLabel={t.recipes.addToRecipe}
          onClose={() => setSelected(null)}
          onComplete={(f) => {
            setSelected(null);
            setPicker({ ...(picker ?? { tab: "manual" }), tab: "manual", draft: f });
          }}
          onLogged={() => undefined}
          onSubmit={async (g) => {
            choose(selected, g);
            return { ok: true };
          }}
        />
      )}
    </div>
  );
}
