import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays, todayIn } from "@/lib/dates";
import { addCardio } from "@/lib/data/training";
import { upsertHealth } from "@/lib/data/health";
import { decrypt, encrypt } from "./crypto";
import { GarminError, getActivities, getDay, getDisplayName, needsRefresh, refreshTokens } from "./client";
import { mapActivity, mapHealth, parseTokens, type GarminTokens } from "./map";

export interface SyncResult {
  ok: boolean;
  days: number;
  activities: number;
  error?: string;
}

/**
 * Syncs one user's Garmin data with the admin client (RLS bypassed, every
 * write scoped to `userId`). Rotated tokens are saved before anything else.
 */
export async function syncUser(admin: SupabaseClient, userId: string, days = 3): Promise<SyncResult> {
  const { data: row, error } = await admin.from("garmin_connections").select("enc_tokens, display_name, time_zone").eq("user_id", userId).maybeSingle();
  if (error || !row) return { ok: false, days: 0, activities: 0, error: "not_connected" };

  const fail = async (msg: string) => {
    await admin.from("garmin_connections").update({ status: "error", last_error: msg.slice(0, 300), updated_at: new Date().toISOString() }).eq("user_id", userId);
    return { ok: false, days: 0, activities: 0, error: msg };
  };

  let tokens: GarminTokens | null;
  try {
    tokens = parseTokens(decrypt(row.enc_tokens));
  } catch {
    tokens = null;
  }
  if (!tokens) return fail("Gespeicherter Schlüssel ist ungültig. Bitte neu verbinden.");

  try {
    if (needsRefresh(tokens)) {
      tokens = await refreshTokens(tokens);
      const { error: se } = await admin
        .from("garmin_connections")
        .update({ enc_tokens: encrypt(JSON.stringify(tokens)), updated_at: new Date().toISOString() })
        .eq("user_id", userId);
      if (se) return fail(`Neuer Schlüssel konnte nicht gespeichert werden: ${se.message}`);
    }

    let displayName = row.display_name as string | null;
    if (!displayName) {
      displayName = await getDisplayName(tokens);
      await admin.from("garmin_connections").update({ display_name: displayName }).eq("user_id", userId);
    }

    const ctx = { supabase: admin, userId };
    const today = todayIn(row.time_zone);
    let written = 0;
    let writeError: string | null = null;
    for (let i = 0; i < days; i++) {
      const date = addDays(today, -i);
      const day = await getDay(tokens, displayName, date);
      const values = mapHealth(day.sleep, day.hrv, day.summary);
      if (Object.keys(values).length === 0) continue;
      const res = await upsertHealth({ date, ...values, source: "garmin" }, ctx);
      if (res.ok) written++;
      else writeError ??= res.error;
    }

    let acts = 0;
    for (const a of await getActivities(tokens, addDays(today, -(days - 1)), today)) {
      const mapped = mapActivity(a);
      if (!mapped) continue;
      const res = await addCardio(mapped, ctx);
      if (res.ok) acts++;
      else writeError ??= res.error;
    }
    if (writeError) return fail(`Speichern fehlgeschlagen: ${writeError}`);

    await admin
      .from("garmin_connections")
      .update({ status: "ok", last_error: null, last_sync_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("user_id", userId);
    return { ok: true, days: written, activities: acts };
  } catch (e) {
    const msg = e instanceof GarminError ? (e.auth ? `${e.message}. Bitte neu verbinden.` : e.message) : e instanceof Error ? e.message : "Unbekannter Fehler";
    return fail(msg);
  }
}
