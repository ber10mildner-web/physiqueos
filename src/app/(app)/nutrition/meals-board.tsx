"use client";
import { useOptimistic, useTransition } from "react";
import { useI18n } from "@/lib/i18n/client";
import type { DiaryEntry, MealSlot } from "@/lib/data/types";
import type { QuickPick } from "@/lib/nutrition/quick-picks";
import { MealCard } from "./meal-card";
import { EntryDndProvider } from "./entry-dnd";
import { placeEntry } from "./actions";
import type { FixedMealInfo } from "./fixed-meal-button";

type Move = { id: string; meal: MealSlot; orderedIds: string[] };

/** Applies a drag & drop move to the day's entries right away, before the server answers. */
function applyMove(entries: DiaryEntry[], { id, meal, orderedIds }: Move): DiaryEntry[] {
  const byId = new Map(entries.map((e) => [e.id, e]));
  const moved = orderedIds.flatMap((i) => {
    const e = byId.get(i);
    return e ? [i === id ? { ...e, meal } : e] : [];
  });
  return [...entries.filter((e) => e.meal !== meal && e.id !== id), ...moved];
}

/** The day's meal cards. Entries can be dragged (long press) to re-sort them or move them to another meal. */
export function MealsBoard({
  meals,
  entries,
  date,
  favoriteIds,
  fixed = [],
}: {
  meals: { meal: MealSlot; name: string; picks: QuickPick[] }[];
  entries: DiaryEntry[];
  date: string;
  favoriteIds: string[];
  fixed?: FixedMealInfo[];
}) {
  const { t, locale } = useI18n();
  const [shown, move] = useOptimistic(entries, applyMove);
  const [, start] = useTransition();
  const favorites = new Set(favoriteIds);
  const onDrop = (id: string, meal: MealSlot, orderedIds: string[]) =>
    start(async () => {
      move({ id, meal, orderedIds });
      await placeEntry(id, meal, orderedIds);
    });
  return (
    <EntryDndProvider onDrop={onDrop}>
      {meals.map(({ meal, name, picks }) => (
        <MealCard
          key={meal}
          meal={meal}
          name={name}
          items={shown.filter((e) => e.meal === meal)}
          date={date}
          picks={picks}
          favoriteIds={favorites}
          fixed={fixed.filter((f) => f.meal === meal)}
          t={t}
          locale={locale}
        />
      ))}
    </EntryDndProvider>
  );
}
