import "server-only";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_TIME_ZONE, isValidTimeZone, todayIn } from "@/lib/dates";

/**
 * Returns the signed-in user and a Supabase client acting as that user.
 * Every data access goes through this so RLS always applies.
 */
export const requireUser = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (error || !userId) redirect("/login");
  return { supabase, userId, email: (data.claims.email as string | undefined) ?? null };
});

/** The user's time zone (reported by the browser, stored in a cookie). */
export async function getTimeZone(): Promise<string> {
  const tz = (await cookies()).get("tz")?.value;
  return isValidTimeZone(tz) ? tz : DEFAULT_TIME_ZONE;
}

export async function getToday(): Promise<string> {
  return todayIn(await getTimeZone());
}
