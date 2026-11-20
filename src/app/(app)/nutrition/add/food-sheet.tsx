"use client";
/* eslint-disable @next/next/no-img-element -- small external product thumbnails */
import { useEffect, useState, useTransition } from "react";
import { ExternalLink, Star, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { fmt } from "@/lib/i18n";
import type { FoodCandidate } from "@/lib/food-sources/types";
import type { MealSlot } from "@/lib/data/types";
import { hasRequiredNutrients, MICRO_NUTRIENTS, PRIMARY_NUTRIENTS } from "@/lib/nutrition/nutrients";
import { scaleNutrients } from "@/lib/nutrition/calc";
import { formatNumber, formatNutrient } from "@/lib/format";
import { Button, Input, Notice, cx } from "@/components/ui";
import { logFood, toggleFavorite } from "../actions";

const COLORS: Record<string, string> = { protein_g: "var(--protein)", carbs_g: "var(--carbs)", fat_g: "var(--fat)", fiber_g: "var(--fiber)" };

export function FoodSheet({
  food,
  meal,
  date,
  onClose,
  onComplete,
  onLogged,
  onSubmit,
  submitLabel,
  initialAmount,
}: {
  food: FoodCandidate;
  /** Replaces the default "log to diary" action (used for recipe ingredients and recipes). */
  onSubmit?: (grams: number) => Promise<{ ok: boolean; error?: string }>;
  submitLabel?: string;
  initialAmount?: number;
  meal: MealSlot;
  date: string;
  onClose: () => void;
  onComplete: (f: FoodCandidate) => void;
  onLogged: () => void;
}) {
  const { t, locale } = useI18n();
  const [amount, setAmount] = useState(String(initialAmount ?? food.serving_size_g ?? 100));
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [favorite, setFavorite] = useState(Boolean(food.is_favorite));
  const grams = Number(amount.replace(",", "."));
  const valid = Number.isFinite(grams) && grams > 0 && grams <= 5000;
  const complete = hasRequiredNutrients(food.nutrients);
  const scaled = valid ? scaleNutrients(food.nutrients, grams) : {};
  const micros = MICRO_NUTRIENTS.filter((k) => food.nutrients[k] !== undefined);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const chips = [...new Set([food.serving_size_g, 50, 100, 150, 200, 300].filter((v): v is number => Boolean(v)))];
  const attribution =
    food.source === "openfoodfacts"
      ? t.addFood.attributionOff
      : food.source === "usda"
        ? t.addFood.attributionUsda
        : food.source === "recipe"
          ? t.recipes.attribution
          : t.addFood.attributionCustom;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true">
      <button type="button" aria-label={t.common.close} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-h-[92dvh] w-full max-w-xl animate-fade-up overflow-y-auto rounded-t-[28px] border border-line bg-surface px-5 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-surface-3" />
        <div className="flex items-start gap-3">
          {food.image_url && <img src={food.image_url} alt="" className="size-14 rounded-xl bg-white object-contain" />}
          <div className="min-w-0 flex-1">
            <h2 className="text-lg leading-tight font-semibold">{food.name}</h2>
            {food.brand && <p className="text-sm text-muted">{food.brand}</p>}
          </div>
          {food.id && food.source !== "recipe" && (
            <button
              type="button"
              aria-label={favorite ? t.tracking.removeFavorite : t.tracking.addFavorite}
              aria-pressed={favorite}
              onClick={() => {
                setFavorite(!favorite);
                start(async () => {
                  await toggleFavorite(food.id!, !favorite);
                });
              }}
              className="grid size-9 place-items-center rounded-full bg-surface-2 text-muted"
            >
              <Star className={cx("size-4", favorite && "fill-carbs text-carbs")} />
            </button>
          )}
          <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-full bg-surface-2 text-muted" aria-label={t.common.close}>
            <X className="size-4" />
          </button>
        </div>

        {!complete ? (
          <div className="mt-4 space-y-3">
            <Notice tone="warn">{t.addFood.incomplete}</Notice>
            <Button type="button" className="w-full" onClick={() => onComplete(food)}>
              {t.addFood.complete}
            </Button>
          </div>
        ) : (
          <form
            className="mt-5"
            onSubmit={(e) => {
              e.preventDefault();
              if (!valid) return;
              setError(null);
              start(async () => {
                const res = onSubmit ? await onSubmit(grams) : await logFood({ food, amount_g: grams, meal, date });
                if (res.ok) onLogged();
                else setError(res.error === "incomplete" ? t.addFood.incomplete : t.common.error);
              });
            }}
          >
            <label className="block">
              <span className="mb-1.5 block text-[13px] text-muted">{t.addFood.amount}</span>
              <div className="relative">
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0.1}
                  max={5000}
                  step="0.1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="num pr-10 text-xl font-semibold"
                  autoFocus
                />
                <span className="absolute top-1/2 right-4 -translate-y-1/2 text-muted">g</span>
              </div>
            </label>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {chips.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setAmount(String(c))}
                  className={cx("num h-8 rounded-full border px-3 text-[13px]", Number(amount) === c ? "border-accent/60 bg-accent/10 text-accent" : "border-line text-muted")}
                >
                  {c === food.serving_size_g ? fmt(t.addFood.serving, { value: formatNumber(c, locale) }) : `${c} g`}
                </button>
              ))}
            </div>

            <div className="mt-5 grid grid-cols-5 gap-2 rounded-2xl bg-surface-2 p-3 text-center">
              {PRIMARY_NUTRIENTS.map((k) => (
                <div key={k}>
                  <div className="num text-[15px] font-semibold">{scaled[k] !== undefined ? formatNumber(scaled[k]!, locale, k === "energy_kcal" ? 0 : 1) : "–"}</div>
                  <div className="mt-0.5 flex items-center justify-center gap-1 text-[10px] text-muted">
                    {COLORS[k] && <span className="size-1.5 rounded-full" style={{ background: COLORS[k] }} />}
                    {k === "energy_kcal" ? "kcal" : t.nutrients[k]}
                  </div>
                </div>
              ))}
            </div>

            {micros.length > 0 && valid && (
              <details className="mt-3 rounded-2xl bg-surface-2 px-3 py-2 text-sm">
                <summary className="cursor-pointer text-muted">
                  {t.addFood.moreValues} ({micros.length})
                </summary>
                <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                  {micros.map((k) => (
                    <li key={k} className="flex justify-between">
                      <span className="text-muted">{t.nutrients[k]}</span>
                      <span className="num">{formatNutrient(k, scaled[k]!, locale)}</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}

            {error && <div className="mt-3"><Notice tone="error">{error}</Notice></div>}
            <Button type="submit" className="mt-5 w-full" disabled={!valid || pending}>
              {pending ? t.common.saving : (submitLabel ?? `${t.addFood.log} · ${t.meals[meal]}`)}
            </Button>
            <div className="mt-3 flex items-center justify-between text-xs text-faint">
              <span>{attribution}</span>
              <span className="flex gap-3">
                {food.source !== "recipe" && (
                  <button type="button" className="hover:text-text" onClick={() => onComplete(food)}>
                    {t.common.edit}
                  </button>
                )}
                {food.source_url && (
                  <a href={food.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-text">
                    {t.addFood.viewSource} <ExternalLink className="size-3" />
                  </a>
                )}
              </span>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
