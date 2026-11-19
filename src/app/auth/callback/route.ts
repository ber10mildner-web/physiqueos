import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Handles links from Supabase emails (PKCE `code` or `token_hash`).
 *
 * Supabase marks the email as confirmed before redirecting here. If the link is
 * opened in a different browser than the one used to sign up (e.g. the mail
 * app's built-in browser), the PKCE verifier cookie is missing and no session
 * can be created. The account is still confirmed, so we send the user to the
 * login page with a "confirmed, please sign in" message instead of an error.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const to = (path: string) => NextResponse.redirect(new URL(path, url.origin));

  if (url.searchParams.get("error")) return to("/login?error=confirm");

  try {
    const supabase = await createClient();
    if (tokenHash && type) {
      const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
      return to(error ? "/login?error=confirm" : "/settings");
    }
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      return to(error ? "/login?confirmed=1" : "/settings");
    }
  } catch (e) {
    console.error("auth callback failed", e);
    return to("/login?confirmed=1");
  }
  return to("/login");
}
