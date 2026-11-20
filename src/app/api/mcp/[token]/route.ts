import { createMcpHandler } from "mcp-handler";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashToken, isTokenFormat } from "@/lib/api-tokens";
import { INSTRUCTIONS, registerTools } from "@/lib/mcp/server";

export const maxDuration = 60;

/**
 * MCP endpoint for Claude: https://<app>/api/mcp/<personal access token>
 * The token is part of the URL because Claude's custom connectors take a URL.
 * Only its SHA-256 hash is stored; revoked tokens are rejected.
 */
async function handle(req: Request, ctx: RouteContext<"/api/mcp/[token]">) {
  const { token } = await ctx.params;
  if (!isTokenFormat(token)) return new Response("Not found", { status: 404 });
  const admin = createAdminClient();
  if (!admin) return new Response("Server not configured (SUPABASE_SECRET_KEY missing)", { status: 503 });

  const { data: row, error } = await admin
    .from("api_tokens")
    .select("id, user_id, can_write, revoked_at, last_used_at")
    .eq("token_hash", hashToken(token))
    .maybeSingle();
  if (error || !row || row.revoked_at) return new Response("Unauthorized", { status: 401 });

  // Record usage at most every 10 minutes.
  if (!row.last_used_at || Date.now() - new Date(row.last_used_at).getTime() > 600_000) {
    await admin.from("api_tokens").update({ last_used_at: new Date().toISOString() }).eq("id", row.id);
  }

  const { data: profile } = await admin.from("profiles").select("id").eq("id", row.user_id).maybeSingle();
  if (!profile) return new Response("Unauthorized", { status: 401 });

  const handler = createMcpHandler((server) => registerTools(server, { supabase: admin, userId: row.user_id }, row.can_write), {
    serverInfo: { name: "Sigma", version: "0.3.0" },
    instructions: INSTRUCTIONS,
  });
  return handler(req);
}

export { handle as GET, handle as POST, handle as DELETE };
