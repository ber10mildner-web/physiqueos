"use server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type WaitlistState = { ok?: true; error?: string } | undefined;

const schema = z.object({
  email: z.string().trim().toLowerCase().max(254).email(),
  consent: z.literal("on"),
  source: z.string().optional(),
  // Honeypot: hidden from people, bots tend to fill it in.
  website: z.string().max(0).optional(),
});

/** Adds an address to the public launch waitlist. Never reveals whether it was already on the list. */
export async function joinWaitlist(_prev: WaitlistState, formData: FormData): Promise<WaitlistState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const issue = parsed.error.issues[0]?.path[0];
    if (issue === "website") return { ok: true };
    if (issue === "consent") return { error: "Bitte bestätige kurz, dass wir dir schreiben dürfen." };
    return { error: "Das sieht nicht nach einer gültigen E-Mail-Adresse aus." };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("join_waitlist", { p_email: parsed.data.email, p_source: parsed.data.source || null });
  if (error) {
    console.error("join_waitlist failed", error.message);
    return { error: "Das hat gerade nicht geklappt. Versuch es bitte gleich noch einmal." };
  }
  return { ok: true };
}
