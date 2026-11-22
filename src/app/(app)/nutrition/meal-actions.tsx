"use client";
import { useState } from "react";
import Link from "next/link";
import { Plus, Sparkles, Star } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import type { MealSlot } from "@/lib/data/types";
import type { QuickPick } from "@/lib/nutrition/quick-picks";
import { cx } from "@/components/ui";
import { claudeLink } from "@/lib/claude-link";
import { claudeLogPrompt } from "@/lib/nutrition/claude-log-prompt";
import { QuickAdd } from "./quick-add";

/**
 * Bottom of a meal card: add button and the one-tap picks. When the meal
 * already has food the picks fold away behind a star button to keep the day tidy.
 * The Claude button opens claude.ai with a ready prompt to log a recipe photo or
 * a dish from a restaurant through the Sigma connector (free, no in-app AI).
 */
export function MealActions({ meal, mealName, date, picks, color, label, startOpen }: { meal: MealSlot; mealName: string; date: string; picks: QuickPick[]; color: string; label: string; startOpen: boolean }) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(startOpen);
  return (
    <div className="space-y-3">
      {open && <QuickAdd picks={picks} meal={meal} date={date} />}
      <div className="flex gap-2">
        <Link
          href={`/nutrition/add?date=${date}&meal=${meal}`}
          className="flex h-11 min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-2xl bg-surface-2 text-sm font-medium text-text transition hover:bg-surface-3 active:scale-[0.98]"
          aria-label={label}
        >
          <Plus className="size-4" style={{ color }} /> {t.quick.search}
        </Link>
        <a
          href={claudeLink(claudeLogPrompt({ date, meal, mealName, locale }))}
          target="_blank"
          rel="noreferrer"
          aria-label={t.quick.withClaudeHint}
          title={t.quick.withClaudeHint}
          className="flex h-11 shrink-0 items-center gap-1.5 rounded-2xl bg-surface-2 px-3.5 text-sm font-medium text-text transition hover:bg-surface-3 active:scale-[0.98]"
        >
          <Sparkles className="size-4 text-[#d97757]" /> {t.quick.withClaude}
        </a>
        {picks.length > 0 && !startOpen && (
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-label={t.quick.title}
            className={cx("grid h-11 w-12 shrink-0 place-items-center rounded-2xl transition active:scale-[0.97]", open ? "bg-surface-3" : "bg-surface-2")}
          >
            <Star className={cx("size-4", open ? "fill-carbs text-carbs" : "text-muted")} />
          </button>
        )}
      </div>
    </div>
  );
}
