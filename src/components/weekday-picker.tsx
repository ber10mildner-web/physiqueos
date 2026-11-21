"use client";
import { useI18n } from "@/lib/i18n/client";
import { cx } from "./ui";

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7];

export function WeekdayPicker({ value, onChange }: { value: number[]; onChange: (v: number[]) => void }) {
  const { t } = useI18n();
  return (
    <div className="grid grid-cols-7 gap-1">
      {WEEKDAYS.map((d) => {
        const on = value.includes(d);
        return (
          <button
            key={d}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((x) => x !== d) : [...value, d].sort())}
            className={cx("h-9 rounded-lg text-xs font-medium transition", on ? "bg-accent text-accent-ink" : "bg-surface-2 text-muted")}
          >
            {t.routines.weekdaysShort[d - 1]}
          </button>
        );
      })}
    </div>
  );
}

export function weekdayLabel(days: number[], t: ReturnType<typeof useI18n>["t"]) {
  if (days.length === 7) return t.routines.everyDay;
  return days.map((d) => t.routines.weekdaysShort[d - 1]).join(" ");
}
