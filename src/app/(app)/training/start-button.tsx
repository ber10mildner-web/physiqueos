"use client";
import { useTransition } from "react";
import { Play } from "lucide-react";
import { cx } from "@/components/ui";
import { startWorkoutAction } from "./actions";

export function StartButton({ planId, label, sub, disabled }: { planId: string | null; label: string; sub?: string; disabled?: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={disabled || pending}
      onClick={() => start(async () => void (await startWorkoutAction(planId)))}
      className={cx(
        "flex min-h-12 flex-1 items-center gap-3 rounded-2xl px-4 py-2 text-left transition active:scale-[0.99] disabled:opacity-50",
        planId ? "bg-surface-2" : "border border-dashed border-line",
      )}
    >
      <Play className={cx("size-4 shrink-0", planId ? "text-accent" : "text-muted")} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{label}</span>
        {sub && <span className="block text-xs text-muted">{sub}</span>}
      </span>
    </button>
  );
}
