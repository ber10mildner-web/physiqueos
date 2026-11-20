"use client";
import { useI18n } from "@/lib/i18n/client";
import type { TrainingRating } from "@/lib/data/types";
import { cx } from "@/components/ui";

const SCALE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export const emptyRating: TrainingRating = { feeling: null, energy: null, effort: null, rating_note: null };

export const isRated = (r: Partial<TrainingRating>) => r.feeling != null || r.energy != null || r.effort != null || Boolean(r.rating_note);

/** Three 1–10 scales plus a note. Controlled: the parent decides how to save. */
export function RatingFields({ value, onChange }: { value: TrainingRating; onChange: (v: TrainingRating) => void }) {
  const { t } = useI18n();
  const rows = [
    { key: "feeling", label: t.rating.feeling, hint: t.rating.feelingHint },
    { key: "energy", label: t.rating.energy, hint: t.rating.energyHint },
    { key: "effort", label: t.rating.effort, hint: t.rating.effortHint },
  ] as const;
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.key}>
          <div className="mb-1 flex items-baseline justify-between">
            <span className="text-sm font-medium">{r.label}</span>
            <span className="text-xs text-faint">{r.hint}</span>
          </div>
          <div className="grid grid-cols-10 gap-1" role="radiogroup" aria-label={r.label}>
            {SCALE.map((n) => {
              const active = value[r.key] === n;
              return (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => onChange({ ...value, [r.key]: active ? null : n })}
                  className={cx(
                    "num h-9 rounded-lg text-sm font-medium transition",
                    active ? "bg-accent text-accent-ink" : "bg-surface-2 text-muted hover:text-text",
                  )}
                >
                  {n}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <label className="block">
        <span className="mb-1 block text-sm font-medium">{t.rating.note}</span>
        <textarea
          value={value.rating_note ?? ""}
          onChange={(e) => onChange({ ...value, rating_note: e.target.value || null })}
          maxLength={1000}
          rows={2}
          placeholder={t.rating.notePlaceholder}
          className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-[16px] outline-none focus:border-accent/60"
        />
      </label>
    </div>
  );
}

export function RatingSummary({ value }: { value: TrainingRating }) {
  const { t } = useI18n();
  const dash = (n: number | null) => (n === null ? "–" : String(n));
  return (
    <div className="text-sm">
      <div className="num text-muted">{t.rating.summary.replace("{feeling}", dash(value.feeling)).replace("{energy}", dash(value.energy)).replace("{effort}", dash(value.effort))}</div>
      {value.rating_note && <p className="mt-1 whitespace-pre-line text-text">{value.rating_note}</p>}
    </div>
  );
}
