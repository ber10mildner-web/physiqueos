"use client";
import { useState, useTransition } from "react";
import { NotebookPen, Pencil, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { DAY_TAGS, type DayNote, type DayTag } from "@/lib/data/types";
import { Button, Card, Notice, cx } from "@/components/ui";
import { saveDayNoteAction } from "@/app/(app)/day-note-actions";

const TAG_COLORS: Record<DayTag, string> = {
  sick: "bg-danger/15 text-danger",
  pain: "bg-danger/15 text-danger",
  poor_sleep: "bg-warn/15 text-warn",
  stress: "bg-warn/15 text-warn",
  travel: "bg-accent/15 text-accent",
  alcohol: "bg-carbs/15 text-carbs",
  eating_out: "bg-carbs/15 text-carbs",
};

export function DayTagChips({ tags, className }: { tags: DayTag[]; className?: string }) {
  const { t } = useI18n();
  if (!tags.length) return null;
  return (
    <div className={cx("flex flex-wrap gap-1.5", className)}>
      {tags.map((tag) => (
        <span key={tag} className={cx("rounded-full px-2.5 py-0.5 text-[11px] font-medium", TAG_COLORS[tag])}>
          {t.dayNote.tags[tag]}
        </span>
      ))}
    </div>
  );
}

/** Optional journal for one day: free text plus tags. Collapsed to one line while empty. */
export function DayNoteCard({ date, initial }: { date: string; initial: DayNote | null }) {
  const { t } = useI18n();
  const [saved, setSaved] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(initial?.note ?? "");
  const [tags, setTags] = useState<DayTag[]>(initial?.tags ?? []);
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();

  // another day was picked (same component instance): show that day's note
  const [shownDate, setShownDate] = useState(date);
  if (shownDate !== date) {
    setShownDate(date);
    setSaved(initial);
    setNote(initial?.note ?? "");
    setTags(initial?.tags ?? []);
    setEditing(false);
  }

  const open = () => {
    setNote(saved?.note ?? "");
    setTags(saved?.tags ?? []);
    setError(false);
    setEditing(true);
  };
  const save = () =>
    start(async () => {
      const text = note.trim() || null;
      const res = await saveDayNoteAction({ date, note: text, tags });
      if (!res.ok) return setError(true);
      setSaved(text || tags.length ? { entry_date: date, note: text, tags, source: "manual" } : null);
      setEditing(false);
    });

  if (!editing && !saved) {
    return (
      <button
        type="button"
        onClick={open}
        className="flex w-full items-center gap-3 rounded-3xl border border-dashed border-line px-4 py-3 text-left transition hover:bg-surface-2/60"
      >
        <NotebookPen className="size-4 shrink-0 text-accent" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">{t.dayNote.title}</span>
          <span className="block truncate text-xs text-muted">{t.dayNote.empty}</span>
        </span>
      </button>
    );
  }

  if (!editing && saved) {
    return (
      <Card>
        <div className="flex items-start gap-3">
          <NotebookPen className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-sm font-medium">
              {t.dayNote.title}
              {saved.source === "claude" && (
                <span className="inline-flex items-center gap-1 text-[11px] font-normal text-faint">
                  <Sparkles className="size-3" /> {t.dayNote.byClaude}
                </span>
              )}
            </div>
            <DayTagChips tags={saved.tags} className="mt-1.5" />
            {saved.note && <p className="mt-1.5 whitespace-pre-line text-sm leading-snug text-text">{saved.note}</p>}
          </div>
          <button type="button" onClick={open} aria-label={t.common.edit} className="grid size-9 shrink-0 place-items-center rounded-xl text-muted hover:bg-surface-2">
            <Pencil className="size-4" />
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="mb-3 flex items-center gap-2 text-sm font-medium">
        <NotebookPen className="size-4 text-accent" aria-hidden="true" />
        {t.dayNote.title}
      </div>
      <div className="mb-1.5 text-xs text-muted">{t.dayNote.tagsLabel}</div>
      <div className="flex flex-wrap gap-1.5">
        {DAY_TAGS.map((tag) => {
          const on = tags.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              aria-pressed={on}
              onClick={() => setTags(on ? tags.filter((x) => x !== tag) : [...tags, tag])}
              className={cx("h-8 rounded-full px-3 text-xs font-medium transition", on ? TAG_COLORS[tag] + " ring-1 ring-current" : "bg-surface-2 text-muted")}
            >
              {t.dayNote.tags[tag]}
            </button>
          );
        })}
      </div>
      <textarea
        value={note}
        maxLength={2000}
        rows={3}
        placeholder={t.dayNote.placeholder}
        onChange={(e) => setNote(e.target.value)}
        className="mt-3 w-full resize-none rounded-2xl border border-line bg-surface-2 px-4 py-3 text-[16px] leading-snug text-text outline-none transition placeholder:text-faint focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
      />
      {error && (
        <div className="mt-2">
          <Notice tone="error">{t.errors.invalidInput}</Notice>
        </div>
      )}
      <div className="mt-3 flex gap-2">
        <Button type="button" variant="secondary" size="sm" className="flex-1" onClick={() => setEditing(false)} disabled={pending}>
          {t.common.cancel}
        </Button>
        <Button type="button" size="sm" className="flex-1" onClick={save} disabled={pending}>
          {pending ? t.common.saving : t.common.save}
        </Button>
      </div>
    </Card>
  );
}
