"use client";
import { useActionState } from "react";
import { Check } from "lucide-react";
import { joinWaitlist, type WaitlistState } from "./actions";
import { Button, Input, Notice } from "@/components/ui";

export function WaitlistForm({ source, contact }: { source?: string; contact?: string }) {
  const [state, action, pending] = useActionState<WaitlistState, FormData>(joinWaitlist, undefined);

  if (state?.ok) {
    return (
      <div className="animate-fade-up rounded-2xl border border-accent/40 bg-accent/10 p-5" role="status">
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-accent-ink">
            <Check className="size-5" aria-hidden="true" />
          </span>
          <p className="font-medium">Du stehst auf der Liste.</p>
        </div>
        <p className="mt-3 text-sm text-muted">
          Wir schreiben dir, sobald Sigma startet. Mehr nicht, versprochen.
          {contact ? ` Du willst doch nicht mehr? Schreib an ${contact}.` : ""}
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-3">
      {source && <input type="hidden" name="source" value={source} />}
      <div aria-hidden="true" className="absolute -left-[9999px] size-px overflow-hidden">
        <label>
          Website
          <input name="website" type="text" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <label className="sr-only" htmlFor="waitlist-email">
        E-Mail-Adresse
      </label>
      <Input id="waitlist-email" name="email" type="email" autoComplete="email" inputMode="email" placeholder="deine@email.de" required className="h-12 text-base" />
      <label className="flex items-start gap-3 text-sm text-muted">
        <input name="consent" type="checkbox" required className="mt-0.5 size-5 shrink-0 accent-[var(--accent)]" />
        <span>
          Ich bin einverstanden, dass Sigma meine E-Mail-Adresse speichert, um mich zum Start zu informieren. Ich kann das jederzeit widerrufen. Details unter{" "}
          <a href="#datenschutz" className="text-text underline underline-offset-2">
            Datenschutz
          </a>
          .
        </span>
      </label>
      {state?.error && <Notice tone="error">{state.error}</Notice>}
      <Button type="submit" className="h-12 w-full text-base" disabled={pending}>
        {pending ? "Einen Moment …" : "Auf die Warteliste"}
      </Button>
    </form>
  );
}
