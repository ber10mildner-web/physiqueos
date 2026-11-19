"use client";
import { useActionState, useState } from "react";
import { authenticate, type AuthState } from "./actions";
import { useI18n } from "@/lib/i18n/client";
import { Button, Field, Input, Notice } from "@/components/ui";

export function LoginForm({ initialError }: { initialError?: string }) {
  const { t } = useI18n();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [state, action, pending] = useActionState<AuthState, FormData>(authenticate, initialError ? { error: initialError } : undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="mode" value={mode} />
      <Field label={t.auth.email}>
        <Input name="email" type="email" autoComplete="email" required inputMode="email" />
      </Field>
      <Field label={t.auth.password}>
        <Input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
        />
      </Field>
      {state?.error && <Notice tone="error">{state.error}</Notice>}
      {state?.info && <Notice tone="success">{state.info}</Notice>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? t.common.loading : mode === "signin" ? t.auth.signIn : t.auth.signUp}
      </Button>
      <button
        type="button"
        onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        className="w-full text-center text-sm text-muted hover:text-text"
      >
        {mode === "signin" ? t.auth.switchToSignUp : t.auth.switchToSignIn}
      </button>
    </form>
  );
}
