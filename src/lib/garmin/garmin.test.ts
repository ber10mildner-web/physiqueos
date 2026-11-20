import { afterEach, describe, expect, it, vi } from "vitest";
import { jwtExp, mapActivity, mapHealth, parseTokens } from "./map";
import { decrypt, encrypt } from "./crypto";
import { needsRefresh, refreshTokens } from "./client";

const jwt = (payload: object) => `${Buffer.from('{"alg":"RS256"}').toString("base64url")}.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.sig`;
const tokens = { di_token: jwt({ exp: 2_000_000_000, client_id: "GARMIN_CONNECT_MOBILE_ANDROID_DI_2025Q2" }), di_refresh_token: "r1", di_client_id: "GARMIN_CONNECT_MOBILE_ANDROID_DI_2025Q2" };

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("garmin tokens", () => {
  it("parses the JSON printed by the login script and rejects anything else", () => {
    expect(parseTokens(JSON.stringify(tokens))).toEqual(tokens);
    expect(parseTokens("  " + JSON.stringify(tokens) + "\n")).toEqual(tokens);
    expect(parseTokens("hello")).toBeNull();
    expect(parseTokens(JSON.stringify({ ...tokens, di_refresh_token: null }))).toBeNull();
    expect(parseTokens(JSON.stringify({ ...tokens, di_token: "notajwt" }))).toBeNull();
  });

  it("reads the expiry and decides when to refresh", () => {
    expect(jwtExp(tokens.di_token)).toBe(2_000_000_000);
    expect(needsRefresh(tokens, 12 * 3600, 2_000_000_000_000 - 13 * 3600_000)).toBe(false);
    expect(needsRefresh(tokens, 12 * 3600, 2_000_000_000_000 - 11 * 3600_000)).toBe(true);
    expect(needsRefresh({ ...tokens, di_token: "a.b.c" })).toBe(true);
  });

  it("encrypts and decrypts, and detects tampering", () => {
    vi.stubEnv("GARMIN_TOKEN_KEY", Buffer.alloc(32, 7).toString("base64"));
    const blob = encrypt("geheim");
    expect(blob).not.toContain("geheim");
    expect(decrypt(blob)).toBe("geheim");
    const parts = blob.split(".");
    parts[3] = Buffer.from("x").toString("base64url");
    expect(() => decrypt(parts.join("."))).toThrow();
  });

  it("derives the key from the Supabase secret key when no dedicated key is set", () => {
    vi.stubEnv("GARMIN_TOKEN_KEY", "");
    vi.stubEnv("SUPABASE_SECRET_KEY", "sb_secret_test");
    expect(decrypt(encrypt("x"))).toBe("x");
  });

  it("refreshes with the documented DI OAuth2 request and keeps the rotated token", async () => {
    const fetchMock = vi.fn(async () => Response.json({ access_token: jwt({ exp: 1 }), refresh_token: "r2", expires_in: 89604 }));
    vi.stubGlobal("fetch", fetchMock);
    const next = await refreshTokens(tokens);
    expect(next.di_refresh_token).toBe("r2");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://diauth.garmin.com/di-oauth2-service/oauth/token");
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Basic " + Buffer.from("GARMIN_CONNECT_MOBILE_ANDROID_DI_2025Q2:").toString("base64"));
    expect(String(init.body)).toBe("grant_type=refresh_token&client_id=GARMIN_CONNECT_MOBILE_ANDROID_DI_2025Q2&refresh_token=r1");
  });

  it("marks a refused refresh as an auth error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("no", { status: 401 })));
    await expect(refreshTokens(tokens)).rejects.toMatchObject({ auth: true, status: 401 });
  });
});

describe("garmin mapping", () => {
  it("maps sleep, HRV and daily summary, dropping missing and 'no data' values", () => {
    const v = mapHealth(
      { dailySleepDTO: { sleepTimeSeconds: 27_000, sleepScores: { overall: { value: 82 } } } },
      { hrvSummary: { lastNightAvg: 48.4 } },
      { restingHeartRate: 52, totalSteps: 9_876, averageStressLevel: -1, bodyBatteryHighestValue: 91 },
    );
    expect(v).toEqual({ sleep_score: 82, sleep_minutes: 450, hrv_ms: 48, resting_hr: 52, steps: 9876, body_battery: 91 });
    expect(mapHealth(null, null, null)).toEqual({});
    expect(mapHealth({ dailySleepDTO: { sleepTimeSeconds: null } }, {}, { bodyBatteryAtWakeTime: 70, bodyBatteryHighestValue: 95 })).toEqual({ body_battery: 70 });
  });

  it("maps cardio activities and skips strength sessions", () => {
    expect(
      mapActivity({ activityId: 123, activityName: "Morgenlauf", startTimeLocal: "2026-11-19 07:12:33", activityType: { typeKey: "treadmill_running" }, duration: 1830, distance: 5012.4, averageHR: 151.6, calories: 402 }),
    ).toEqual({ date: "2026-11-19", activity: "run", duration_min: 30.5, distance_km: 5.01, avg_hr: 152, kcal: 402, notes: "Morgenlauf", source: "garmin", source_id: "123" });
    expect(mapActivity({ activityId: 1, startTimeLocal: "2026-11-19 18:00:00", activityType: { typeKey: "strength_training" }, duration: 3600 })).toBeNull();
    expect(mapActivity({ activityId: 2, startTimeLocal: "2026-11-19 18:00:00", activityType: { typeKey: "hiking" }, duration: 600, distance: 0 })?.activity).toBe("hike");
    expect(mapActivity({ activityId: 3, startTimeLocal: "2026-11-19 18:00:00", activityType: { typeKey: "padel" }, duration: 600 })?.activity).toBe("other");
    expect(mapActivity({ activityName: "x" })).toBeNull();
  });
});
