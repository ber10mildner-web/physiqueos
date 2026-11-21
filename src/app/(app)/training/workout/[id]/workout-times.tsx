"use client";
import { useState, useTransition } from "react";
import { Clock } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { fmt } from "@/lib/i18n";
import { workoutMinutes } from "@/lib/training/calc";
import { Card } from "@/components/ui";
import { setWorkoutTimesAction } from "../../actions";

/** HH:MM of an ISO time in the given time zone (same on server and phone, no hydration mismatch). */
function hhmm(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone }).format(new Date(iso));
}

/** ISO time for a local date + HH:MM on this phone. */
function toIso(date: string, time: string, plusDays = 0) {
  const d = new Date(`${date}T${time}:00`);
  d.setDate(d.getDate() + plusDays);
  return d.toISOString();
}

/** Start and end of a workout. Saves as soon as both are valid. */
export function WorkoutTimes({ id, date, startedAt, finishedAt, timeZone }: { id: string; date: string; startedAt: string; finishedAt: string | null; timeZone: string }) {
  const { t } = useI18n();
  const [start, setStart] = useState(hhmm(startedAt, timeZone));
  const [end, setEnd] = useState(finishedAt ? hhmm(finishedAt, timeZone) : "");
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const build = (s: string, e: string) => {
    if (!s) return null;
    const started_at = toIso(date, s);
    if (!e) return { started_at, finished_at: null };
    // an end before the start means the workout went past midnight
    const finished_at = toIso(date, e, e <= s ? 1 : 0);
    return { started_at, finished_at };
  };
  const current = build(start, end);
  const minutes = current?.finished_at ? workoutMinutes(current.started_at, current.finished_at) : null;

  const save = (s: string, e: string) => {
    const v = build(s, e);
    if (!v) return;
    if (v.finished_at && workoutMinutes(v.started_at, v.finished_at) === null) return setError(true);
    // keep a running workout running when only the start time changes
    if (!v.finished_at && finishedAt) return;
    setError(false);
    startTransition(async () => {
      const res = await setWorkoutTimesAction(id, v);
      if (!res.ok) return setError(true);
      setSaved(true);
    });
  };

  return (
    <Card>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="inline-flex items-center gap-2 font-semibold">
          <Clock className="size-4 text-accent" /> {t.workoutTimes.title}
        </h3>
        <span className="num text-sm text-muted">
          {pending ? t.common.saving : minutes !== null ? fmt(t.workoutTimes.duration, { min: minutes }) : saved ? `✓ ${t.common.saved}` : ""}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label>
          <span className="mb-1 block text-xs text-muted">{t.workoutTimes.start}</span>
          <input
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            onBlur={() => save(start, end)}
            className="num h-11 w-full rounded-xl border border-line bg-surface-2 px-3 text-[16px] outline-none focus:border-accent/60"
          />
        </label>
        <label>
          <span className="mb-1 block text-xs text-muted">{t.workoutTimes.end}</span>
          <input
            type="time"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            onBlur={() => save(start, end)}
            className="num h-11 w-full rounded-xl border border-line bg-surface-2 px-3 text-[16px] outline-none focus:border-accent/60"
          />
        </label>
      </div>
      <p className={error ? "mt-2 text-xs text-danger" : "mt-2 text-xs text-faint"}>{error ? t.workoutTimes.invalid : t.workoutTimes.hint}</p>
    </Card>
  );
}
