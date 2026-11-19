"use client";
import { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n/client";
import { fmt } from "@/lib/i18n";
import type { FoodCandidate } from "@/lib/food-sources/types";
import { BARCODE_RE } from "@/lib/food-sources/types";
import { MICRO_NUTRIENTS, NUTRIENTS, REQUIRED_NUTRIENTS, type NutrientKey, type NutrientMap } from "@/lib/nutrition/nutrients";
import { checkPlausibility, energyFromMacros } from "@/lib/nutrition/calc";
import { formatNumber } from "@/lib/format";
import { Button, Card, Field, Input, Notice, SectionTitle } from "@/components/ui";

const MAIN: NutrientKey[] = ["energy_kcal", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "saturated_fat_g", "salt_g"];

const toStr = (v: number | undefined) => (v === undefined ? "" : String(Math.round(v * 1000) / 1000));
const parse = (s: string) => {
  if (s.trim() === "") return undefined;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : NaN;
};

/** Manual food entry (values per 100 g). Empty fields are stored as unknown, never as 0. */
export function FoodForm({ initial, onSubmit }: { initial: Partial<FoodCandidate> | null; onSubmit: (f: FoodCandidate) => void }) {
  const { t, locale } = useI18n();
  const [name, setName] = useState(initial?.name ?? "");
  const [brand, setBrand] = useState(initial?.brand ?? "");
  const [barcode, setBarcode] = useState(initial?.barcode ?? "");
  const [serving, setServing] = useState(initial?.serving_size_g ? String(initial.serving_size_g) : "");
  const [values, setValues] = useState<Partial<Record<NutrientKey, string>>>(() =>
    Object.fromEntries(Object.entries(initial?.nutrients ?? {}).map(([k, v]) => [k, toStr(v as number)])),
  );
  const [error, setError] = useState<string | null>(null);

  const nutrients = useMemo(() => {
    const out: NutrientMap = {};
    for (const [k, s] of Object.entries(values)) {
      const v = parse(s ?? "");
      if (v !== undefined && !Number.isNaN(v)) out[k as NutrientKey] = v;
    }
    return out;
  }, [values]);
  const issues = checkPlausibility(nutrients);
  const expected = energyFromMacros(nutrients);

  const input = (k: NutrientKey) => (
    <Field key={k} label={`${t.nutrients[k]} (${NUTRIENTS[k].unit})${REQUIRED_NUTRIENTS.includes(k) ? " *" : ""}`}>
      <Input
        type="text"
        inputMode="decimal"
        value={values[k] ?? ""}
        onChange={(e) => setValues((s) => ({ ...s, [k]: e.target.value }))}
        aria-invalid={Number.isNaN(parse(values[k] ?? ""))}
        className="num"
      />
    </Field>
  );

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const bad = Object.values(values).some((s) => Number.isNaN(parse(s ?? "")));
        const servingG = serving ? Number(serving.replace(",", ".")) : null;
        if (!name.trim() || bad || REQUIRED_NUTRIENTS.some((k) => nutrients[k] === undefined) || (barcode && !BARCODE_RE.test(barcode)) || (servingG !== null && !(servingG > 0))) {
          setError(t.errors.invalidInput);
          return;
        }
        onSubmit({
          source: "custom",
          source_id: null,
          source_url: initial?.source_url ?? null,
          name: name.trim(),
          brand: brand.trim() || null,
          barcode: barcode || null,
          serving_size_g: servingG,
          image_url: initial?.image_url ?? null,
          nutrients,
        });
      }}
    >
      <Card className="space-y-3">
        <SectionTitle>{t.foodForm.title}</SectionTitle>
        <Field label={`${t.foodForm.name} *`}>
          <Input value={name} onChange={(e) => setName(e.target.value)} required maxLength={200} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t.foodForm.brand}>
            <Input value={brand} onChange={(e) => setBrand(e.target.value)} maxLength={200} />
          </Field>
          <Field label={t.foodForm.servingSize}>
            <Input value={serving} onChange={(e) => setServing(e.target.value)} inputMode="decimal" className="num" />
          </Field>
        </div>
        <Field label={t.foodForm.barcode}>
          <Input value={barcode} onChange={(e) => setBarcode(e.target.value.replace(/\D/g, ""))} inputMode="numeric" className="num" />
        </Field>
      </Card>

      <Card className="space-y-3">
        <SectionTitle>{t.foodForm.per100Title}</SectionTitle>
        <p className="-mt-2 text-xs text-faint">{t.foodForm.per100Hint}</p>
        <div className="grid grid-cols-2 gap-3">{MAIN.map(input)}</div>
        <details className="pt-1">
          <summary className="cursor-pointer text-sm text-muted">{t.foodForm.moreNutrients}</summary>
          <div className="mt-3 grid grid-cols-2 gap-3">{MICRO_NUTRIENTS.map(input)}</div>
        </details>
      </Card>

      {issues.map((i) => (
        <Notice key={i} tone="warn">
          {fmt(t.foodForm.warnings[i], { expected: expected !== null ? formatNumber(expected, locale) : "?" })}
        </Notice>
      ))}
      {error && <Notice tone="error">{error}</Notice>}
      <Button type="submit" className="w-full">
        {t.foodForm.saveAndLog}
      </Button>
    </form>
  );
}
