/**
 * When a medication / supplement is due. Pure (tested).
 *
 * Rhythm: either on fixed ISO weekdays (1 = Monday) or every N days counted from
 * `start` (e.g. every 2nd day). On top, an optional cycle: take it for `on` days,
 * then pause for `off` days, repeating from `start` (e.g. 3 weeks on / 1 week off).
 * `start` is the first day of the rhythm and the cycle; it only changes when the
 * user changes it, so editing a name or dose never shifts the rhythm.
 */
import { isoWeekday } from "@/lib/nutrition/goal-days";

export interface MedicationSchedule {
  /** ISO weekdays; used when every_days is null. Empty = no automatic intake. */
  auto_days: number[];
  /** Every N days from `start` (2 = every second day). Null = weekdays. */
  every_days: number | null;
  /** Cycle: days on, then days off, from `start`. Both null = no cycle. */
  cycle_on_days: number | null;
  cycle_off_days: number | null;
  /** First day of the rhythm / cycle (YYYY-MM-DD). */
  schedule_start: string | null;
}

const DAY = 86_400_000;
/** Whole days from a to b (b - a), both YYYY-MM-DD. */
export function daysFrom(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY);
}

const mod = (n: number, m: number) => ((n % m) + m) % m;

export function hasSchedule(s: MedicationSchedule): boolean {
  return s.every_days != null ? s.every_days >= 1 : s.auto_days.length > 0;
}

/** In the pause of a cycle on this day (only meaningful with a cycle). */
export function inCyclePause(s: MedicationSchedule, date: string): boolean {
  if (!s.cycle_on_days || !s.cycle_off_days) return false;
  const since = daysFrom(s.schedule_start ?? date, date);
  return mod(since, s.cycle_on_days + s.cycle_off_days) >= s.cycle_on_days;
}

/** Is it due on this day? (Before `start` nothing is due.) */
export function isDue(s: MedicationSchedule, date: string): boolean {
  if (!hasSchedule(s)) return false;
  const start = s.schedule_start ?? date;
  if (date < start) return false;
  if (inCyclePause(s, date)) return false;
  if (s.every_days != null) return mod(daysFrom(start, date), s.every_days) === 0;
  return s.auto_days.includes(isoWeekday(date));
}

/** Days left in the current phase of the cycle, incl. today (for "Pause noch 4 Tage"). */
export function cyclePhase(s: MedicationSchedule, date: string): { pause: boolean; daysLeft: number } | null {
  if (!s.cycle_on_days || !s.cycle_off_days) return null;
  const pos = mod(daysFrom(s.schedule_start ?? date, date), s.cycle_on_days + s.cycle_off_days);
  return pos < s.cycle_on_days ? { pause: false, daysLeft: s.cycle_on_days - pos } : { pause: true, daysLeft: s.cycle_on_days + s.cycle_off_days - pos };
}
