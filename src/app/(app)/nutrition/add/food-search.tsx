"use client";
import { useState } from "react";
import { Search } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { fmt } from "@/lib/i18n";
import type { FoodCandidate, FoodSource } from "@/lib/food-sources/types";
import { Card, EmptyState, Input, Notice, SectionTitle } from "@/components/ui";
import { FoodRow } from "./food-row";

interface Results {
  mine: FoodCandidate[];
  openfoodfacts: FoodCandidate[];
  usda: FoodCandidate[];
  unavailable: FoodSource[];
}

const SOURCE_NAMES: Record<FoodSource, string> = { openfoodfacts: "Open Food Facts", usda: "USDA FoodData Central", custom: "PhysiqueOS" };

export function FoodSearch({ recent, onSelect }: { recent: FoodCandidate[]; onSelect: (f: FoodCandidate) => void }) {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Results | null>(null);
  const [error, setError] = useState(false);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim().length < 2) return;
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/food/search?q=${encodeURIComponent(q.trim())}`);
      if (!res.ok) throw new Error(String(res.status));
      setResults(await res.json());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  const section = (title: string, items: FoodCandidate[], hint?: string) =>
    items.length > 0 && (
      <Card className="p-0">
        <div className="px-4 pt-4">
          <SectionTitle>{title}</SectionTitle>
          {hint && <p className="-mt-1 mb-2 text-xs text-faint">{hint}</p>}
        </div>
        <ul className="divide-y divide-line border-t border-line">
          {items.map((f) => (
            <FoodRow key={`${f.source}-${f.id ?? f.source_id}`} food={f} onSelect={onSelect} />
          ))}
        </ul>
      </Card>
    );

  const empty = results && results.mine.length + results.openfoodfacts.length + results.usda.length === 0;

  return (
    <div className="space-y-4">
      <form onSubmit={run} className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-faint" />
        <Input
          type="search"
          enterKeyHint="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t.addFood.searchPlaceholder}
          className="pl-12"
          autoFocus
        />
      </form>
      {loading && <p className="text-center text-sm text-muted">{t.common.loading}</p>}
      {error && <Notice tone="error">{t.common.error}</Notice>}
      {results?.unavailable.map((s) => (
        <Notice key={s} tone="warn">
          {fmt(t.addFood.sourceUnavailable, { source: SOURCE_NAMES[s] })}
        </Notice>
      ))}
      {results ? (
        <>
          {section(t.addFood.myFoods, results.mine)}
          {section("Open Food Facts", results.openfoodfacts)}
          {section("USDA FoodData Central", results.usda, t.addFood.usdaHint)}
          {empty && <EmptyState>{t.addFood.noResults}</EmptyState>}
        </>
      ) : (
        section(t.addFood.recent, recent)
      )}
    </div>
  );
}
