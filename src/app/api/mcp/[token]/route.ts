import { createMcpHandler } from "mcp-handler";
import { resolveToken } from "@/lib/token-auth";
import { INSTRUCTIONS, registerTools } from "@/lib/mcp/server";

export const maxDuration = 60;

/**
 * MCP endpoint for Claude: https://<app>/api/mcp/<personal access token>
 * The token is part of the URL because Claude's custom connectors take a URL.
 * Only its SHA-256 hash is stored; revoked tokens and widget tokens are rejected.
 */
async function handle(req: Request, ctx: RouteContext<"/api/mcp/[token]">) {
  const { token } = await ctx.params;
  const auth = await resolveToken(token, "mcp");
  if (!auth.ok) return auth.response;

  const handler = createMcpHandler((server) => registerTools(server, { supabase: auth.admin, userId: auth.userId }, auth.canWrite), {
    serverInfo: { name: "Sigma", version: "0.3.0" },
    instructions: INSTRUCTIONS,
  });
  return handler(req);
}

export { handle as GET, handle as POST, handle as DELETE };
