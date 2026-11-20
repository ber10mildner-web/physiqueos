/**
 * Smoke test of the MCP server definition: the handler starts, lists the tools
 * with valid JSON schemas, and hides write tools for read-only tokens.
 * (Data access is covered by the RLS and unit tests.)
 */
import { describe, expect, it } from "vitest";
import { createMcpHandler } from "mcp-handler";
import { INSTRUCTIONS, registerTools } from "@/lib/mcp/server";
import type { Ctx } from "@/lib/data";

const ctx = { supabase: {} as Ctx["supabase"], userId: "11111111-1111-1111-1111-111111111111" };

async function rpc(canWrite: boolean, method: string, params: object = {}) {
  const handler = createMcpHandler((server) => registerTools(server, ctx, canWrite), { serverInfo: { name: "PhysiqueOS", version: "test" }, instructions: INSTRUCTIONS });
  const headers = { "content-type": "application/json", accept: "application/json, text/event-stream", "mcp-protocol-version": "2025-06-18" };
  await handler(
    new Request("http://localhost/api/mcp/x", {
      method: "POST",
      headers,
      body: JSON.stringify({ jsonrpc: "2.0", id: 0, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "t", version: "1" } } }),
    }),
  );
  const res = await handler(new Request("http://localhost/api/mcp/x", { method: "POST", headers, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) }));
  const text = await res.text();
  const payload = text.startsWith("{") ? text : text.split("\n").find((l) => l.startsWith("data:"))!.slice(5);
  return JSON.parse(payload);
}

describe("MCP server", () => {
  it("lists read and write tools for a read/write token", async () => {
    const r = await rpc(true, "tools/list");
    const names = r.result.tools.map((t: { name: string }) => t.name);
    expect(names).toEqual(expect.arrayContaining(["get_day", "get_period_summary", "search_foods", "create_recipe", "log_food", "log_weight", "get_progress_photo"]));
    for (const t of r.result.tools) expect(t.inputSchema.type).toBe("object");
  });

  it("hides write tools for read-only tokens", async () => {
    const r = await rpc(false, "tools/list");
    const names = r.result.tools.map((t: { name: string }) => t.name);
    expect(names).toContain("get_day");
    expect(names).not.toContain("log_food");
    expect(names).not.toContain("create_recipe");
  });

  it("rejects invalid arguments", async () => {
    const r = await rpc(true, "tools/call", { name: "get_period_summary", arguments: { from: "2026-13-01", to: "2026-11-20" } });
    expect(r.result?.isError ?? Boolean(r.error)).toBe(true);
  });
});
