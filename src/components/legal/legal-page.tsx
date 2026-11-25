import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";

// Shared frame for the public legal pages (German only, like the waitlist page).
export function LegalPage({ title, draft, children }: { title: string; draft: boolean; children: ReactNode }) {
  return (
    <main lang="de" className="mx-auto w-full max-w-xl px-6 pt-[max(2.5rem,env(safe-area-inset-top))] pb-[max(3rem,env(safe-area-inset-bottom))]">
      <Link href="/warteliste" className="mb-8 inline-flex items-center gap-3">
        <Logo className="size-9" />
        <span className="font-semibold tracking-tight">Sigma</span>
      </Link>
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      {draft && (
        <p className="mt-4 rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm text-muted">
          Entwurf: Die Angaben zum Betreiber werden noch ergänzt.
        </p>
      )}
      <div className="legal mt-8 space-y-4 text-[15px] leading-relaxed text-muted">{children}</div>
      <LegalLinks className="mt-12 border-t border-line pt-6" />
    </main>
  );
}

export function LegalLinks({ className }: { className?: string }) {
  return (
    <nav className={`flex gap-5 text-xs text-faint ${className ?? ""}`}>
      <Link href="/impressum" className="underline-offset-2 hover:underline">
        Impressum
      </Link>
      <Link href="/datenschutz" className="underline-offset-2 hover:underline">
        Datenschutz
      </Link>
    </nav>
  );
}

export function H2({ children }: { children: ReactNode }) {
  return <h2 className="!mt-10 text-lg font-semibold tracking-tight text-text">{children}</h2>;
}

export function H3({ children }: { children: ReactNode }) {
  return <h3 className="!mt-6 font-medium text-text">{children}</h3>;
}

export function List({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-1.5 pl-5">{children}</ul>;
}
