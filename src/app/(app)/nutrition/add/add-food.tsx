"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";
import type { FoodCandidate } from "@/lib/food-sources/types";
import { MEALS, type MealSlot } from "@/lib/data/types";
import { Field, Input, Select, cx } from "@/components/ui";
import { FoodSearch } from "./food-search";
import { BarcodeTab } from "./barcode-tab";
import { FoodForm } from "./food-form";
import { FoodSheet } from "./food-sheet";

export type Tab = "search" | "scan" | "manual";

export function AddFood({ initialTab, initialMeal, date: initialDate, today, recent }: { initialTab: Tab; initialMeal: MealSlot; date: string; today: string; recent: FoodCandidate[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [meal, setMeal] = useState<MealSlot>(initialMeal);
  const [date, setDate] = useState(initialDate);
  const [selected, setSelected] = useState<FoodCandidate | null>(null);
  const [draft, setDraft] = useState<Partial<FoodCandidate> | null>(null);

  const tabs: { id: Tab; label: string }[] = [
    { id: "search", label: t.addFood.tabSearch },
    { id: "scan", label: t.addFood.tabScan },
    { id: "manual", label: t.addFood.tabManual },
  ];

  /** Opens the manual form prefilled (e.g. barcode not found, or incomplete data). */
  const openManual = (prefill: Partial<FoodCandidate>) => {
    setSelected(null);
    setDraft(prefill);
    setTab("manual");
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label={t.addFood.meal}>
          <Select value={meal} onChange={(e) => setMeal(e.target.value as MealSlot)}>
            {MEALS.map((m) => (
              <option key={m} value={m}>
                {t.meals[m]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t.addFood.date}>
          <Input type="date" value={date} max={today} onChange={(e) => e.target.value && setDate(e.target.value)} />
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-1 rounded-2xl bg-surface p-1" role="tablist">
        {tabs.map((x) => (
          <button
            key={x.id}
            role="tab"
            aria-selected={tab === x.id}
            type="button"
            onClick={() => setTab(x.id)}
            className={cx("h-10 rounded-xl text-sm font-medium transition", tab === x.id ? "bg-surface-3 text-text" : "text-muted")}
          >
            {x.label}
          </button>
        ))}
      </div>

      {tab === "search" && <FoodSearch recent={recent} onSelect={setSelected} />}
      {tab === "scan" && <BarcodeTab onFound={setSelected} onNotFound={(barcode) => openManual({ barcode })} />}
      {tab === "manual" && <FoodForm key={JSON.stringify(draft)} initial={draft} onSubmit={setSelected} />}

      {selected && (
        <FoodSheet
          food={selected}
          meal={meal}
          date={date}
          onClose={() => setSelected(null)}
          onComplete={(f) => openManual(f)}
          onLogged={() => router.push(`/nutrition?date=${date}`)}
        />
      )}
    </div>
  );
}
