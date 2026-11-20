"use server";
import { revalidatePath } from "next/cache";
import { getTimeZone, requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { encrypt, isGarminKeyConfigured } from "@/lib/garmin/crypto";
import { GarminError, getDisplayName, refreshTokens } from "@/lib/garmin/client";
import { parseTokens } from "@/lib/garmin/map";
import { syncUser, type SyncResult } from "@/lib/garmin/sync";

type R = { ok: true; sync: SyncResult } | { ok: false; error: string };

export async function connectGarmin(json: string): Promise<R> {
  const { userId } = await requireUser();
  const admin = createAdminClient();
  if (!admin || !isGarminKeyConfigured()) return { ok: false, error: "server" };
  let tokens = parseTokens(json);
  if (!tokens) return { ok: false, error: "format" };
  try {
    // Refresh right away: this retires the pasted refresh token and immediately
    // shows whether Garmin accepts token refreshes from our server at all.
    tokens = await refreshTokens(tokens);
    const displayName = await getDisplayName(tokens);
    const { error } = await admin.from("garmin_connections").upsert({
      user_id: userId,
      enc_tokens: encrypt(JSON.stringify(tokens)),
      display_name: displayName,
      time_zone: await getTimeZone(),
      status: "ok",
      last_error: null,
      updated_at: new Date().toISOString(),
    });
    if (error) return { ok: false, error: error.message };
  } catch (e) {
    return { ok: false, error: e instanceof GarminError || e instanceof Error ? e.message : "unknown" };
  }
  const sync = await syncUser(admin, userId, 14);
  revalidatePath("/", "layout");
  return { ok: true, sync };
}

export async function syncGarminNow(): Promise<R> {
  const { userId } = await requireUser();
  const admin = createAdminClient();
  if (!admin || !isGarminKeyConfigured()) return { ok: false, error: "server" };
  const sync = await syncUser(admin, userId, 7);
  revalidatePath("/", "layout");
  return sync.ok ? { ok: true, sync } : { ok: false, error: sync.error ?? "unknown" };
}

export async function disconnectGarmin() {
  const { supabase, userId } = await requireUser();
  await supabase.from("garmin_connections").delete().eq("user_id", userId);
  revalidatePath("/", "layout");
}
