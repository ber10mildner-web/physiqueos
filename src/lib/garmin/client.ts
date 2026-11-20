import "server-only";
import { jwtExp, type GarminTokens } from "./map";

/**
 * Minimal unofficial Garmin Connect client, mirroring python-garminconnect 0.3.20
 * (native Android app identity, DI OAuth2 bearer tokens). Garmin offers no
 * official API for individuals; this can break whenever Garmin changes things.
 */
const DI_TOKEN_URL = "https://diauth.garmin.com/di-oauth2-service/oauth/token";
const API = "https://connectapi.garmin.com";

const NATIVE_HEADERS: Record<string, string> = {
  "User-Agent": "GCM-Android-5.23",
  "X-Garmin-User-Agent": "com.garmin.android.apps.connectmobile/5.23; ; Google/sdk_gphone64_arm64/google; Android/33; Dalvik/2.1.0",
  "X-Garmin-Paired-App-Version": "10861",
  "X-Garmin-Client-Platform": "Android",
  "X-App-Ver": "10861",
  "X-Lang": "en",
  "X-GCExperience": "GC5",
  "Accept-Language": "en-US,en;q=0.9",
};

export class GarminError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
    readonly auth = false,
  ) {
    super(message);
  }
}

/** True if the access token expires within `withinS` seconds (or its expiry is unknown). */
export function needsRefresh(tokens: GarminTokens, withinS = 12 * 3600, now = Date.now()): boolean {
  const exp = jwtExp(tokens.di_token);
  return exp === null || exp * 1000 - now < withinS * 1000;
}

/** Refresh token rotates: the caller MUST persist the result before doing anything else. */
export async function refreshTokens(tokens: GarminTokens): Promise<GarminTokens> {
  const res = await fetch(DI_TOKEN_URL, {
    method: "POST",
    headers: {
      ...NATIVE_HEADERS,
      Authorization: "Basic " + Buffer.from(`${tokens.di_client_id}:`).toString("base64"),
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      "Cache-Control": "no-cache",
    },
    body: new URLSearchParams({ grant_type: "refresh_token", client_id: tokens.di_client_id, refresh_token: tokens.di_refresh_token }),
    cache: "no-store",
  });
  if (!res.ok) throw new GarminError(`Token-Erneuerung fehlgeschlagen (HTTP ${res.status})`, res.status, res.status === 400 || res.status === 401);
  const data = (await res.json()) as { access_token?: string; refresh_token?: string };
  if (!data.access_token) throw new GarminError("Token-Erneuerung: keine Antwort", res.status, true);
  return { di_token: data.access_token, di_refresh_token: data.refresh_token ?? tokens.di_refresh_token, di_client_id: tokens.di_client_id };
}

export async function garminGet(tokens: GarminTokens, path: string, params?: Record<string, string>): Promise<unknown> {
  const url = new URL(API + path);
  for (const [k, v] of Object.entries(params ?? {})) url.searchParams.set(k, v);
  const res = await fetch(url, { headers: { ...NATIVE_HEADERS, Authorization: `Bearer ${tokens.di_token}`, Accept: "application/json" }, cache: "no-store" });
  if (res.status === 204) return null;
  if (!res.ok) {
    const hint = res.status === 403 ? " (Garmin blockiert evtl. den Server)" : res.status === 429 ? " (zu viele Anfragen)" : "";
    throw new GarminError(`Garmin ${path.split("/")[1]}: HTTP ${res.status}${hint}`, res.status, res.status === 401);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export async function getDisplayName(tokens: GarminTokens): Promise<string> {
  const prof = (await garminGet(tokens, "/userprofile-service/socialProfile")) as { displayName?: unknown } | null;
  if (!prof || typeof prof.displayName !== "string" || !prof.displayName.trim()) throw new GarminError("Garmin-Profil nicht lesbar", null, true);
  return prof.displayName;
}

export async function getDay(tokens: GarminTokens, displayName: string, date: string) {
  const dn = encodeURIComponent(displayName);
  // Each call is independent; one missing dataset should not lose the others.
  const errors: string[] = [];
  const safe = (name: string, p: Promise<unknown>) =>
    p.catch((e) => {
      if (e instanceof GarminError && e.auth) throw e;
      errors.push(`${name}: ${e instanceof Error ? e.message : "?"}`);
      return null;
    });
  const [sleep, hrv, summary] = await Promise.all([
    safe("sleep", garminGet(tokens, `/wellness-service/wellness/dailySleepData/${dn}`, { date, nonSleepBufferMinutes: "60" })),
    safe("hrv", garminGet(tokens, `/hrv-service/hrv/${date}`)),
    safe("summary", garminGet(tokens, `/usersummary-service/usersummary/daily/${dn}`, { calendarDate: date })),
  ]);
  return { sleep, hrv, summary, errors };
}

export async function getActivities(tokens: GarminTokens, from: string, to: string): Promise<unknown[]> {
  const data = await garminGet(tokens, "/activitylist-service/activities/search/activities", { startDate: from, endDate: to, start: "0", limit: "50" });
  return Array.isArray(data) ? data : [];
}
