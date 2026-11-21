"use client";
import { useState, useTransition } from "react";
import { Copy } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { fmt } from "@/lib/i18n";
import type { MealSlot } from "@/lib/data/types";
import { copyMeal } from "./actions";

export function CopyMealButton({ fromDate, toDate, meal }: { fromDate: string; toDate: string; meal: MealSlot }) {
  const { t } = useI18n();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-text"
        onClick={() =>
          start(async () => {
            const res = await copyMeal(fromDate, toDate, meal);
            if (!(res.ok && res.copied)) setMsg(res.ok ? t.tracking.nothingToCopy : t.common.error);
          })
        }
      >
        <Copy className="size-3.5" />
        {fmt(t.tracking.copyMealYesterday, { meal: t.meals[meal] })}
      </button>
      {msg && <span className="text-xs text-faint">{msg}</span>}
    </span>
  );
}
