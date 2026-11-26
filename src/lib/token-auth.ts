import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashToken, isTokenFormat } from "@/lib/api-tokens";

export type TokenScope = "mcp" | "widget";

/**
 * Checks a personal access token from a URL (Claude connector or widget) and
 * returns the user it belongs to. A token only opens the endpoint of its own
 * scope: a widget token never reaches the Claude connector and the reverse.
 */
export async function resolveToken(
  token: string,
  scope: TokenScope,
): Promise<{ ok: true; admin: SupabaseClient; userId: string; canWrite: boolean; timeZone: string } | { ok: false; response: Response }> {
  if (!isTokenFormat(token)) return { ok: false, response: new Response("Not found", { status: 404 }) };
  const admin = createAdminClient();
  if (!admin) return { ok: false, response: new Response("Server not configured (SUPABASE_SECRET_KEY missing)", { status: 503 }) };

  const { data: row, error } = await admin
    .from("api_tokens")
    // "*" so the Claude connector keeps working even before the scope column exists
    .select("*")
    .eq("token_hash", hashToken(token))
    .maybeSingle();
  // tokens made before the scope column existed count as "mcp"
  if (error || !row || row.revoked_at || (row.scope ?? "mcp") !== scope) return { ok: false, response: new Response("Unauthorized", { status: 401 }) };

  // Record usage at most every 10 minutes.
  if (!row.last_used_at || Date.now() - new Date(row.last_used_at).getTime() > 600_000) {
    await admin.from("api_tokens").update({ last_used_at: new Date().toISOString() }).eq("id", row.id);
  }

  const { data: profile } = await admin.from("profiles").select("id, time_zone").eq("id", row.user_id).maybeSingle();
  if (!profile) return { ok: false, response: new Response("Unauthorized", { status: 401 }) };
  return { ok: true, admin, userId: row.user_id, canWrite: row.can_write && scope === "mcp", timeZone: profile.time_zone || "Europe/Berlin" };
}
