"use client";
import { useRef, useState, useTransition } from "react";
import { Star, Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import type { DiaryEntry } from "@/lib/data/types";
import { scaleNutrients } from "@/lib/nutrition/calc";
import { formatNumber } from "@/lib/format";
import { FoodIcon } from "@/components/food-icon";
import { Button, Input, cx } from "@/components/ui";
import { useMeals } from "@/components/meals-context";
import { MEAL_COLORS } from "@/lib/meal-colors";
import { deleteEntry, moveEntry, toggleFavorite, updateEntryAmount } from "./actions";

/** Width of the red delete button revealed by swiping left. */
const REVEAL = 88;
/** Holding a row this long (without moving) opens "move to". */
const LONG_PRESS_MS = 450;

export function EntryRow({
  entry,
  favorite: initialFavorite = false,
}: {
  entry: DiaryEntry;
  favorite?: boolean;
}) {
  const { t, locale } = useI18n();
  const meals = useMeals();
  const [open, setOpen] = useState(false);
  const [moving, setMoving] = useState(false);
  const [amount, setAmount] = useState(String(entry.amount_g));
  const [favorite, setFavorite] = useState(initialFavorite);
  const [pending, start] = useTransition();
  const n = scaleNutrients(entry.nutrients_per_100g, entry.amount_g);
  const macro = (k: "protein_g" | "carbs_g" | "fat_g") =>
    n[k] === undefined ? "–" : formatNumber(n[k]!, locale);

  // swipe left to reveal "delete"
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [removed, setRemoved] = useState(false);
  const drag = useRef<{
    x: number;
    y: number;
    base: number;
    active: boolean;
  } | null>(null);
  /** Time of the last swipe or long press: the click that may follow it must not open the row. */
  const swipedAt = useRef(0);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = null;
  };
  const remove = () => {
    setRemoved(true);
    start(async () => {
      const res = await deleteEntry(entry.id);
      if (!res.ok) {
        setRemoved(false);
        setDx(0);
      }
    });
  };
  const move = (meal: DiaryEntry["meal"]) => {
    setRemoved(true);
    start(async () => {
      const res = await moveEntry(entry.id, meal);
      if (!res.ok) setRemoved(false);
    });
  };
  if (removed) return null;

  return (
    <li>
      {/* Only the row itself slides; the edit form below stays out of the swipe area. */}
      <div className="relative overflow-hidden">
        {dx < 0 && (
          <button
            type="button"
            onClick={remove}
            className="absolute inset-y-0 right-0 flex flex-col items-center justify-center gap-0.5 bg-danger text-xs font-medium text-white"
            style={{ width: Math.max(REVEAL, -dx) }}
          >
            <Trash2 className="size-5" />
            {t.common.delete}
          </button>
        )}
        <div
          className={cx(
            "relative bg-surface select-none",
            !dragging && "transition-transform duration-200 ease-out",
          )}
          style={{
            transform: `translateX(${dx}px)`,
            touchAction: "pan-y",
            WebkitTouchCallout: "none",
          }}
          onPointerDown={(e) => {
            if (e.pointerType === "mouse" && e.button !== 0) return;
            drag.current = {
              x: e.clientX,
              y: e.clientY,
              base: dx,
              active: false,
            };
            cancelPress();
            if (dx === 0 && meals.slots.length > 1)
              pressTimer.current = setTimeout(() => {
                pressTimer.current = null;
                drag.current = null;
                swipedAt.current = Date.now();
                navigator.vibrate?.(15);
                setOpen(false);
                setMoving(true);
              }, LONG_PRESS_MS);
          }}
          onContextMenu={(e) => e.preventDefault()}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d) return;
            const mx = e.clientX - d.x;
            const my = e.clientY - d.y;
            if (Math.abs(mx) > 8 || Math.abs(my) > 8) cancelPress();
            if (!d.active) {
              if (Math.abs(my) > 10 && Math.abs(my) > Math.abs(mx))
                return void (drag.current = null);
              if (Math.abs(mx) < 10) return;
              d.active = true;
              setDragging(true);
              e.currentTarget.setPointerCapture(e.pointerId);
            }
            setDx(Math.max(-REVEAL * 1.8, Math.min(0, d.base + mx)));
          }}
          onPointerUp={() => {
            cancelPress();
            const d = drag.current;
            drag.current = null;
            if (!d?.active) return;
            swipedAt.current = Date.now();
            setDragging(false);
            if (dx < -REVEAL * 1.5) remove();
            else setDx(dx < -REVEAL / 2 ? -REVEAL : 0);
          }}
          onPointerCancel={() => {
            cancelPress();
            drag.current = null;
            setDragging(false);
            setDx(0);
          }}
        >
          <button
            type="button"
            className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-surface-2/60"
            onClick={() => {
              if (Date.now() - swipedAt.current < 400) return;
              if (dx !== 0) return setDx(0);
              if (moving) return setMoving(false);
              setOpen(!open);
            }}
            aria-expanded={open}
          >
            <FoodIcon name={entry.food_name} kind={entry.source} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px] leading-snug">
                {entry.food_name}
              </div>
              <div className="num truncate text-xs text-muted">
                {entry.food_brand ? `${entry.food_brand} · ` : ""}
                {t.nutrientShort.protein_g} {macro("protein_g")} ·{" "}
                {t.nutrientShort.carbs_g} {macro("carbs_g")} ·{" "}
                {t.nutrientShort.fat_g} {macro("fat_g")}
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="num text-[15px]">
                {formatNumber(entry.amount_g, locale)} g
              </div>
              <div className="num text-xs text-muted">
                {n.energy_kcal === undefined
                  ? "–"
                  : formatNumber(n.energy_kcal, locale)}{" "}
                kcal
              </div>
            </div>
          </button>
        </div>
      </div>
      {open && (
        <form
          className="flex items-end gap-2 px-4 pb-3"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              await updateEntryAmount(
                entry.id,
                Number(amount.replace(",", ".")),
              );
              setOpen(false);
            });
          }}
        >
          <label className="flex-1">
            <span className="mb-1 block text-xs text-muted">
              {t.nutrition.amount}
            </span>
            <Input
              type="number"
              inputMode="decimal"
              min={0.1}
              step="0.1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="num h-10"
            />
          </label>
          <Button type="submit" size="sm" className="h-10" disabled={pending}>
            {t.common.save}
          </Button>
          {entry.food_id && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-10"
              aria-pressed={favorite}
              aria-label={
                favorite ? t.tracking.removeFavorite : t.tracking.addFavorite
              }
              disabled={pending}
              onClick={() => {
                setFavorite(!favorite);
                start(async () => {
                  await toggleFavorite(entry.food_id!, !favorite);
                });
              }}
            >
              <Star
                className={cx("size-4", favorite && "fill-carbs text-carbs")}
              />
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="danger"
            className="h-10"
            aria-label={t.nutrition.deleteEntry}
            disabled={pending}
            onClick={remove}
          >
            <Trash2 className="size-4" />
          </Button>
        </form>
      )}
      {open && meals.slots.length > 1 && (
        <p className="-mt-1 px-4 pb-3 text-xs text-muted">{t.nutrition.moveHint}</p>
      )}
      {moving && meals.slots.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5 px-4 pb-3">
          <span className="mr-1 text-xs text-muted">{t.nutrition.moveTo}</span>
          {meals.slots
            .filter((s) => s.key !== entry.meal)
            .map((s) => (
              <button
                key={s.key}
                type="button"
                disabled={pending}
                onClick={() => move(s.key)}
                className="flex h-8 items-center gap-1.5 rounded-full bg-surface-2 px-3 text-xs font-medium text-text transition hover:bg-surface-3 active:scale-[0.97]"
              >
                <span className="size-2 rounded-full" style={{ background: MEAL_COLORS[s.key] }} />
                {meals.name(s.key)}
              </button>
            ))}
        </div>
      )}
    </li>
  );
}
