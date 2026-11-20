"use server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { generateToken, hashToken, tokenPrefix } from "@/lib/api-tokens";

/** Creates a personal access token and returns the connector URL ONCE. */
export async function createConnection(name: string, canWrite: boolean): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const parsed = z.object({ name: z.string().trim().min(1).max(60), canWrite: z.boolean() }).safeParse({ name, canWrite });
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { supabase, userId } = await requireUser();
  const token = generateToken();
  const { error } = await supabase
    .from("api_tokens")
    .insert({ user_id: userId, name: parsed.data.name, token_hash: hashToken(token), token_prefix: tokenPrefix(token), can_write: parsed.data.canWrite });
  if (error) return { ok: false, error: error.message };
  const h = await headers();
  const origin = process.env.NEXT_PUBLIC_SITE_URL || `https://${h.get("x-forwarded-host") ?? h.get("host")}`;
  revalidatePath("/settings/connect");
  return { ok: true, url: `${origin}/api/mcp/${token}` };
}

export async function revokeConnection(id: string) {
  const { supabase, userId } = await requireUser();
  await supabase.from("api_tokens").update({ revoked_at: new Date().toISOString() }).eq("id", id).eq("user_id", userId);
  revalidatePath("/settings/connect");
}
