"use client";
import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import type { DiaryEntry } from "@/lib/data/types";
import { scaleNutrients } from "@/lib/nutrition/calc";
import { formatNumber } from "@/lib/format";
import { Button, Input } from "@/components/ui";
import { deleteEntry, updateEntryAmount } from "./actions";

export function EntryRow({ entry }: { entry: DiaryEntry }) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(entry.amount_g));
  const [pending, start] = useTransition();
  const n = scaleNutrients(entry.nutrients_per_100g, entry.amount_g);
  const macro = (k: "protein_g" | "carbs_g" | "fat_g" | "fiber_g") => (n[k] === undefined ? "–" : formatNumber(n[k]!, locale));

  return (
    <li>
      <button type="button" className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-2/60" onClick={() => setOpen(!open)}>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px]">{entry.food_name}</div>
          <div className="num truncate text-xs text-muted">
            {formatNumber(entry.amount_g, locale)} g{entry.food_brand ? ` · ${entry.food_brand}` : ""} · {t.nutrientShort.protein_g} {macro("protein_g")} · {t.nutrientShort.carbs_g} {macro("carbs_g")} · {t.nutrientShort.fat_g} {macro("fat_g")} · {t.nutrientShort.fiber_g} {macro("fiber_g")}
          </div>
        </div>
        <span className="num text-sm">{n.energy_kcal === undefined ? "–" : formatNumber(n.energy_kcal, locale)}</span>
      </button>
      {open && (
        <form
          className="flex items-end gap-2 px-4 pb-3"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              await updateEntryAmount(entry.id, Number(amount.replace(",", ".")));
              setOpen(false);
            });
          }}
        >
          <label className="flex-1">
            <span className="mb-1 block text-xs text-muted">{t.nutrition.amount}</span>
            <Input type="number" inputMode="decimal" min={0.1} step="0.1" value={amount} onChange={(e) => setAmount(e.target.value)} className="num h-10" />
          </label>
          <Button type="submit" size="sm" className="h-10" disabled={pending}>
            {t.common.save}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="danger"
            className="h-10"
            aria-label={t.nutrition.deleteEntry}
            disabled={pending}
            onClick={() =>
              start(async () => {
                await deleteEntry(entry.id);
              })
            }
          >
            <Trash2 className="size-4" />
          </Button>
        </form>
      )}
    </li>
  );
}
