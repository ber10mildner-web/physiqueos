import { Coffee, Cookie, Dumbbell, Moon, Pill, Sun, Zap } from "lucide-react";
import { MEAL_COLORS, tint } from "@/lib/meal-colors";
import type { Dictionary } from "@/lib/i18n";
import { fmt } from "@/lib/i18n";
import type { DiaryEntry, MealSlot } from "@/lib/data/types";
import type { QuickPick } from "@/lib/nutrition/quick-picks";
import { sumItems } from "@/lib/nutrition/calc";
import { formatNumber } from "@/lib/format";
import { addDays } from "@/lib/dates";
import { Card } from "@/components/ui";
import { EntryRow } from "./entry-row";
import { CopyMealButton } from "./copy-meal-button";
import { MealActions } from "./meal-actions";
import { FixedMealButton, type FixedMealInfo } from "./fixed-meal-button";

const MEAL_ICON = { breakfast: Coffee, pre_workout: Zap, lunch: Sun, post_workout: Dumbbell, dinner: Moon, snack: Cookie } as const;

/** One meal of the day: summary line, the foods with pictures, quick picks and add button. */
export function MealCard({
  meal,
  name,
  items,
  date,
  picks,
  favoriteIds,
  fixed = [],
  t,
  locale,
}: {
  meal: MealSlot;
  /** The user's name for this meal. */
  name: string;
  items: DiaryEntry[];
  date: string;
  picks: QuickPick[];
  favoriteIds: Set<string>;
  fixed?: FixedMealInfo[];
  t: Dictionary;
  locale: string;
}) {
  const totals = sumItems(items);
  const Icon = meal === "snack" && /suppl|vitamin|pill|kapsel/i.test(name) ? Pill : MEAL_ICON[meal];
  const p = totals.protein_g.value;
  const color = MEAL_COLORS[meal];
  const open = picks.filter((p) => !items.some((e) => (p.kind === "recipe" ? e.recipe_id : e.food_id) === p.id)).slice(0, 8);
  return (
    <div data-drop-meal={meal}>
      <Card className="overflow-hidden !p-0" style={{ borderColor: tint(color, 30) }}>
        <div data-drop-anchor className="flex items-start gap-3 border-b px-4 pt-4 pb-3" style={{ background: tint(color, 9), borderColor: tint(color, 25) }}>
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl" style={{ background: tint(color, 20), color }}>
            <Icon className="size-5" strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[17px] leading-tight font-semibold">{name}</h2>
            <p className="num mt-0.5 truncate text-[13px] text-muted">
              {formatNumber(totals.energy_kcal.value, locale)} kcal · {t.nutrientShort.protein_g} {formatNumber(p, locale)} · {t.nutrientShort.carbs_g} {formatNumber(totals.carbs_g.value, locale)} · {t.nutrientShort.fat_g} {formatNumber(totals.fat_g.value, locale)}
            </p>
          </div>
          <FixedMealButton meal={meal} mealName={name} date={date} hasItems={items.length > 0} fixed={fixed} color={color} />
        </div>
        {items.length > 0 && (
          <ul className="divide-y divide-line">
            {items.map((e) => (
              <EntryRow key={e.id} entry={e} favorite={Boolean(e.food_id && favoriteIds.has(e.food_id))} />
            ))}
          </ul>
        )}
        <div className="space-y-3 px-4 pt-3 pb-4">
          <MealActions meal={meal} mealName={name} date={date} picks={open} color={color} label={fmt(t.nutrition.addTo, { meal: name })} startOpen={items.length === 0} />
          {items.length === 0 && <CopyMealButton fromDate={addDays(date, -1)} toDate={date} meal={meal} />}
        </div>
      </Card>
    </div>
  );
}
