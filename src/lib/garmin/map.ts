/** Pure mapping of Garmin Connect JSON (field names as in python-garminconnect 0.3.20) to PhysiqueOS rows. */
import type { CardioActivity } from "@/lib/data/types";

type J = Record<string, unknown>;
const obj = (v: unknown): J | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as J) : null);
const n = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const int = (v: number | null, min: number, max: number) => (v === null ? null : Math.round(v) >= min && Math.round(v) <= max ? Math.round(v) : null);

export interface GarminTokens {
  di_token: string;
  di_refresh_token: string;
  di_client_id: string;
}

/** Accepts the JSON printed by python-garminconnect (`client.dumps()`), or the garmin_tokens.json file content. */
export function parseTokens(input: string): GarminTokens | null {
  try {
    const d = obj(JSON.parse(input.trim()));
    if (!d) return null;
    const t = { di_token: d.di_token, di_refresh_token: d.di_refresh_token, di_client_id: d.di_client_id };
    if (typeof t.di_token !== "string" || typeof t.di_refresh_token !== "string" || typeof t.di_client_id !== "string") return null;
    if (t.di_token.split(".").length < 2 || !t.di_refresh_token || !/^[A-Z0-9_]+$/.test(t.di_client_id)) return null;
    return t as GarminTokens;
  } catch {
    return null;
  }
}

/** exp claim (seconds) of an unverified JWT, or null. */
export function jwtExp(token: string): number | null {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
    return n(payload?.exp);
  } catch {
    return null;
  }
}

export interface HealthValues {
  sleep_score?: number;
  sleep_minutes?: number;
  resting_hr?: number;
  hrv_ms?: number;
  body_battery?: number;
  steps?: number;
  stress?: number;
}

/** Only values Garmin actually reported are returned; missing or negative "no data" markers are dropped. */
export function mapHealth(sleep: unknown, hrv: unknown, summary: unknown): HealthValues {
  const dto = obj(obj(sleep)?.dailySleepDTO);
  const scores = obj(dto?.sleepScores);
  const s = obj(summary);
  const out: HealthValues = {};
  const set = (k: keyof HealthValues, v: number | null) => {
    if (v !== null) out[k] = v;
  };
  set("sleep_score", int(n(obj(scores?.overall)?.value), 0, 100));
  const secs = n(dto?.sleepTimeSeconds);
  set("sleep_minutes", secs !== null && secs > 0 ? int(secs / 60, 1, 1440) : null);
  set("hrv_ms", int(n(obj(obj(hrv)?.hrvSummary)?.lastNightAvg), 1, 300));
  set("resting_hr", int(n(s?.restingHeartRate), 20, 200));
  set("steps", int(n(s?.totalSteps), 0, 200000));
  set("stress", int(n(s?.averageStressLevel), 0, 100));
  set("body_battery", int(n(s?.bodyBatteryAtWakeTime) ?? n(s?.bodyBatteryHighestValue), 0, 100));
  return out;
}

const ACTIVITY_MAP: [RegExp, CardioActivity][] = [
  [/run/, "run"],
  [/cycl|bik|ride/, "bike"],
  [/hik/, "hike"],
  [/walk/, "walk"],
  [/row/, "row"],
  [/swim/, "swim"],
  [/elliptical/, "elliptical"],
  [/stair|step/, "stairs"],
];
/** Strength sessions are logged in the app's own training log, so they are skipped. */
const SKIP = /strength|yoga|pilates|breath|meditation/;

export interface CardioRow {
  date: string;
  activity: CardioActivity;
  duration_min: number;
  distance_km: number | null;
  avg_hr: number | null;
  kcal: number | null;
  notes: string | null;
  source: "garmin";
  source_id: string;
}

export function mapActivity(a: unknown): CardioRow | null {
  const o = obj(a);
  if (!o) return null;
  const id = n(o.activityId);
  const start = typeof o.startTimeLocal === "string" ? o.startTimeLocal.slice(0, 10) : null;
  const dur = n(o.duration);
  const type = String(obj(o.activityType)?.typeKey ?? "other").toLowerCase();
  if (id === null || !start || !/^\d{4}-\d{2}-\d{2}$/.test(start) || dur === null || dur <= 0 || SKIP.test(type)) return null;
  const dist = n(o.distance);
  const hr = n(o.averageHR);
  const kcal = n(o.calories);
  return {
    date: start,
    activity: ACTIVITY_MAP.find(([re]) => re.test(type))?.[1] ?? "other",
    duration_min: Math.round((dur / 60) * 10) / 10,
    distance_km: dist !== null && dist > 0 ? Math.round(dist / 10) / 100 : null,
    avg_hr: hr !== null ? int(hr, 30, 250) : null,
    kcal: kcal !== null ? int(kcal, 0, 10000) : null,
    notes: typeof o.activityName === "string" ? o.activityName.slice(0, 200) : null,
    source: "garmin",
    source_id: String(id),
  };
}
