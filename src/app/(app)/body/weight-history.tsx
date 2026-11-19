"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { formatDate } from "@/lib/dates";
import { formatNumber } from "@/lib/format";
import { deleteWeight } from "./actions";

export function WeightHistory({ entries }: { entries: { id: string; date: string; weight: number; average: number }[] }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <ul className="divide-y divide-line">
      {entries.map((e) => (
        <li key={e.id} className="flex items-center gap-3 py-2.5">
          <span className="flex-1 text-sm text-muted">{formatDate(e.date, locale, { weekday: "short", day: "numeric", month: "short" })}</span>
          <span className="num w-20 text-right font-medium">{formatNumber(e.weight, locale, 2)} kg</span>
          <span className="num w-16 text-right text-xs text-faint">Ø {formatNumber(e.average, locale, 1)}</span>
          <button
            type="button"
            aria-label={t.common.delete}
            disabled={pending}
            className="grid size-8 place-items-center rounded-lg text-faint hover:bg-surface-2 hover:text-danger"
            onClick={() => {
              if (!confirm(t.common.confirmDelete)) return;
              start(async () => {
                await deleteWeight(e.id);
                router.refresh();
              });
            }}
          >
            <Trash2 className="size-4" />
          </button>
        </li>
      ))}
    </ul>
  );
}
