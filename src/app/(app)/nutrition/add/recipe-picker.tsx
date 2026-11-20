"use client";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import type { FoodCandidate } from "@/lib/food-sources/types";
import { Card, EmptyState, buttonClass, cx } from "@/components/ui";
import { FoodRow } from "./food-row";

export function RecipePicker({ recipes, onSelect }: { recipes: FoodCandidate[]; onSelect: (f: FoodCandidate) => void }) {
  const { t } = useI18n();
  return (
    <div className="space-y-4">
      {recipes.length === 0 ? (
        <EmptyState>{t.recipes.empty}</EmptyState>
      ) : (
        <Card className="p-0">
          <ul className="divide-y divide-line">
            {recipes.map((r) => (
              <FoodRow key={r.id} food={r} onSelect={onSelect} />
            ))}
          </ul>
        </Card>
      )}
      <Link href="/nutrition/recipes/new" className={cx(buttonClass("secondary"), "w-full")}>
        <Plus className="size-4" /> {t.recipes.new}
      </Link>
    </div>
  );
}
