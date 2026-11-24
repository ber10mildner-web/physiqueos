import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Server-only client with the Supabase secret key. It bypasses Row Level
 * Security, so it is ONLY used by the MCP endpoint after a personal access
 * token has been verified (every query filters by that token's user id), and
 * for the shared Open Food Facts cache (public product data, no user data).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export const isAdminConfigured = () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
