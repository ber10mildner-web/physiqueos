"use client";
import { useState, useTransition } from "react";
import { Check, CloudOff, Star } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import type { MealSlot } from "@/lib/data/types";
import type { QuickPick } from "@/lib/nutrition/quick-picks";
import { formatNumber } from "@/lib/format";
import { runOrQueue } from "@/lib/offline/queue";
import { FoodIcon } from "@/components/food-icon";
import { cx } from "@/components/ui";

/**
 * One-tap logging: favourites and foods usually eaten in this meal, each with
 * the amount used last time. Works offline (the entry is sent later).
 */
export function QuickAdd({ picks, meal, date }: { picks: QuickPick[]; meal: MealSlot; date: string }) {
  const { t, locale } = useI18n();
  const [, start] = useTransition();
  const [state, setState] = useState<Record<string, "busy" | "done" | "queued" | "error">>({});
  if (picks.length === 0) return null;

  const log = (p: QuickPick) => {
    const key = `${p.kind}:${p.id}`;
    setState((s) => ({ ...s, [key]: "busy" }));
    start(async () => {
      const res = await runOrQueue("quickLog", { kind: p.kind, id: p.id, amount_g: p.amount_g, meal, date, name: p.name });
      setState((s) => ({ ...s, [key]: res.ok ? (res.queued ? "queued" : "done") : "error" }));
      setTimeout(() => setState((s) => ({ ...s, [key]: undefined as never })), 2500);
    });
  };

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none]" aria-label={t.quick.title}>
      <ul className="flex w-max gap-2">
        {picks.map((p) => {
          const key = `${p.kind}:${p.id}`;
          const s = state[key];
          const kcal = p.nutrients.energy_kcal !== undefined ? Math.round((p.nutrients.energy_kcal * p.amount_g) / 100) : null;
          return (
            <li key={key}>
              <button
                type="button"
                disabled={s === "busy"}
                onClick={() => log(p)}
                aria-label={`${p.name}, ${formatNumber(p.amount_g, locale)} g ${t.quick.logNow}`}
                className={cx(
                  "flex h-14 max-w-[13rem] items-center gap-2 rounded-2xl border py-2 pr-3 pl-2 text-left transition active:scale-[0.97]",
                  s === "done" || s === "queued" ? "border-accent/50 bg-accent/10" : s === "error" ? "border-danger/40 bg-danger/10" : "border-line bg-surface-2",
                )}
              >
                {s === "done" ? (
                  <span className="grid size-9 place-items-center rounded-xl bg-accent text-accent-ink">
                    <Check className="size-4" />
                  </span>
                ) : s === "queued" ? (
                  <span className="grid size-9 place-items-center rounded-xl bg-surface-3 text-accent">
                    <CloudOff className="size-4" />
                  </span>
                ) : (
                  <FoodIcon name={p.name} kind={p.kind} className="size-9" />
                )}
                <span className="min-w-0">
                  <span className="flex items-center gap-1 truncate text-[13px] leading-tight font-medium">
                    {p.favorite && <Star className="size-3 shrink-0 fill-carbs text-carbs" />}
                    <span className="truncate">{p.name}</span>
                  </span>
                  <span className="num block truncate text-[11px] text-muted">
                    {s === "queued" ? t.offline.queuedShort : `${formatNumber(p.amount_g, locale)} g${kcal !== null ? ` · ${formatNumber(kcal, locale)} kcal` : ""}`}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
