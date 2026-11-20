import { createAdminClient } from "@/lib/supabase/admin";
import { isGarminKeyConfigured } from "@/lib/garmin/crypto";
import { syncUser } from "@/lib/garmin/sync";

export const maxDuration = 60;

/** Daily Vercel cron (see vercel.json). Vercel sends `Authorization: Bearer $CRON_SECRET`. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });
  const admin = createAdminClient();
  if (!admin || !isGarminKeyConfigured()) return new Response("Not configured", { status: 503 });
  const { data, error } = await admin.from("garmin_connections").select("user_id").limit(100);
  if (error) return new Response(error.message, { status: 500 });
  const results = [];
  for (const { user_id } of data ?? []) results.push((await syncUser(admin, user_id)).ok);
  return Response.json({ users: results.length, ok: results.filter(Boolean).length });
}
