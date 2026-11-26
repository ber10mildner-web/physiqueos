"use server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { generateToken, hashToken, tokenPrefix } from "@/lib/api-tokens";
import { widgetScript } from "@/lib/widget-script";

/** Creates a widget token (opens only today's remaining kcal/macros) and returns the Scriptable script ONCE. */
export async function createWidget(): Promise<{ ok: true; script: string } | { ok: false; error: string }> {
  const { supabase, userId } = await requireUser();
  const token = generateToken();
  const { error } = await supabase
    .from("api_tokens")
    .insert({ user_id: userId, name: "Widget", token_hash: hashToken(token), token_prefix: tokenPrefix(token), can_write: false, scope: "widget" });
  if (error) return { ok: false, error: error.message };
  const h = await headers();
  const origin = process.env.NEXT_PUBLIC_SITE_URL || `https://${h.get("x-forwarded-host") ?? h.get("host")}`;
  revalidatePath("/settings/connect");
  return { ok: true, script: widgetScript(`${origin}/api/widget/${token}`) };
}
