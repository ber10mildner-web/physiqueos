"use server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n/server";

export type AuthState = { error?: string; info?: string } | undefined;

const schema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8),
  mode: z.enum(["signin", "signup"]),
});

export async function authenticate(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const { t, locale } = await getI18n();
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const pwIssue = parsed.error.issues.some((i) => i.path[0] === "password");
    return { error: pwIssue ? t.auth.passwordTooShort : t.errors.invalidInput };
  }
  const { email, password, mode } = parsed.data;
  const supabase = await createClient();

  if (mode === "signin") {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: t.auth.invalidCredentials };
    redirect("/");
  }

  const h = await headers();
  const origin = process.env.NEXT_PUBLIC_SITE_URL || h.get("origin") || `https://${h.get("host")}`;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${origin}/auth/callback`, data: { locale } },
  });
  if (error) return { error: error.message };
  // If email confirmation is disabled in Supabase, the user is signed in right away.
  if (data.session) redirect("/settings");
  return { info: t.auth.checkEmail };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
