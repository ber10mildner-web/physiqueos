"use client";
import { createBrowserClient } from "@supabase/ssr";

/** Browser client – only used where data must go straight from the device to Supabase (photo uploads). */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
