import Link from "next/link";
import { Coffee, Cookie, Dumbbell, Moon, Pill, Plus, Sun, Zap } from "lucide-react";
import type { Dictionary } from "@/lib/i18n";
import { fmt } from "@/lib/i18n";
import type { DiaryEntry, MealSlot } from "@/lib/data/types";
import type { QuickPick } from "@/lib/nutrition/quick-picks";
import { sumItems } from "@/lib/nutrition/calc";
import { formatNumber } from "@/lib/format";
import { addDays } from "@/lib/dates";
import { Card, cx } from "@/components/ui";
import { EntryRow } from "./entry-row";
import { CopyMealButton } from "./copy-meal-button";
import { QuickAdd } from "./quick-add";

const MEAL_ICON = { breakfast: Coffee, pre_workout: Zap, lunch: Sun, post_workout: Dumbbell, dinner: Moon, snack: Cookie } as const;

/** One meal of the day: summary line, the foods with pictures, quick picks and add button. */
export function MealCard({
  meal,
  name,
  items,
  date,
  picks,
  proteinTarget,
  favoriteIds,
  t,
  locale,
}: {
  meal: MealSlot;
  /** The user's name for this meal. */
  name: string;
  items: DiaryEntry[];
  date: string;
  picks: QuickPick[];
  proteinTarget: number;
  favoriteIds: Set<string>;
  t: Dictionary;
  locale: string;
}) {
  const totals = sumItems(items);
  const Icon = meal === "snack" && /suppl|vitamin|pill|kapsel/i.test(name) ? Pill : MEAL_ICON[meal];
  const p = totals.protein_g.value;
  const main = meal !== "snack";
  return (
    <Card className="p-0">
      <div className="flex items-start gap-3 px-4 pt-4 pb-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-surface-2 text-accent">
          <Icon className="size-5" strokeWidth={1.9} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[17px] leading-tight font-semibold">{name}</h2>
          <p className="num mt-0.5 truncate text-[13px] text-muted">
            {formatNumber(totals.energy_kcal.value, locale)} kcal · {t.nutrientShort.protein_g} {formatNumber(p, locale)} · {t.nutrientShort.carbs_g} {formatNumber(totals.carbs_g.value, locale)} · {t.nutrientShort.fat_g} {formatNumber(totals.fat_g.value, locale)}
          </p>
        </div>
        {main && items.length > 0 && (
          <span
            className={cx("num shrink-0 rounded-full px-2 py-1 text-[11px] font-medium", p >= proteinTarget ? "bg-protein/15 text-protein" : "bg-surface-2 text-muted")}
            title={fmt(t.proteinMeals.badgeHint, { target: proteinTarget })}
          >
            {formatNumber(p, locale)}/{proteinTarget} g P
          </span>
        )}
      </div>
      {items.length > 0 && (
        <ul className="divide-y divide-line border-t border-line">
          {items.map((e) => (
            <EntryRow key={e.id} entry={e} favorite={Boolean(e.food_id && favoriteIds.has(e.food_id))} />
          ))}
        </ul>
      )}
      <div className="space-y-3 px-4 pt-3 pb-4">
        <QuickAdd picks={picks.filter((p) => !items.some((e) => (p.kind === "recipe" ? e.recipe_id : e.food_id) === p.id)).slice(0, 8)} meal={meal} date={date} />
        <Link
            href={`/nutrition/add?date=${date}&meal=${meal}`}
            className="flex h-11 items-center justify-center gap-1.5 rounded-2xl bg-surface-2 text-sm font-medium text-text transition hover:bg-surface-3 active:scale-[0.98]"
            aria-label={fmt(t.nutrition.addTo, { meal: name })}
          >
            <Plus className="size-4 text-accent" /> {t.quick.search}
        </Link>
        {items.length === 0 && <CopyMealButton fromDate={addDays(date, -1)} toDate={date} meal={meal} />}
      </div>
    </Card>
  );
}
