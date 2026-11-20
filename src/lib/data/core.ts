import "server-only";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/auth";
import { sanitizeNutrients } from "@/lib/nutrition/nutrients";

/** Who is acting. Defaults to the signed-in web user; the MCP server passes its own. */
export interface Ctx {
  supabase: SupabaseClient;
  userId: string;
}

export const ctxOr = async (ctx?: Ctx): Promise<Ctx> => ctx ?? (await requireUser());

/**
 * Throws database errors. In the web app, "table does not exist" (migrations not
 * run yet) and other errors lead to a setup page that shows the error code
 * instead of an opaque server error. Other callers (MCP) get a normal exception.
 */
export function check(error: { code?: string; message?: string } | null, web = true): void {
  if (!error) return;
  if (!web) throw new Error(`database error ${error.code ?? ""}: ${error.message ?? ""}`);
  if (error.code === "PGRST205" || error.code === "42P01" || /does not exist|schema cache/i.test(error.message ?? "")) {
    redirect("/setup?reason=database");
  }
  // These messages describe the schema (e.g. "permission denied for table x"), not user data.
  console.error("database error", error);
  const params = new URLSearchParams({ reason: "database_error", code: error.code ?? "", message: (error.message ?? "").slice(0, 300) });
  redirect(`/setup?${params}`);
}

export const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));
export { sanitizeNutrients };
