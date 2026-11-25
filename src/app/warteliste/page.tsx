import type { Metadata } from "next";
import { Activity, Barcode, Camera, ChefHat, Leaf, Sparkles, type LucideIcon } from "lucide-react";
import { Logo } from "@/components/logo";
import { WaitlistForm } from "./waitlist-form";
import { LegalLinks } from "@/components/legal/legal-page";

// Public page, no login. German only on purpose: it is the launch page for German social media.

const title = "Sigma – Die Fitness-App, die wirklich alles zählt";
const description =
  "Kalorien, Ballaststoffe, Vitamine, Training, Schlaf und Fortschrittsfotos in einer App, mit einem KI-Coach, der alles davon sieht. Jetzt auf die Warteliste.";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  openGraph: { title, description, type: "website", locale: "de_DE", siteName: "Sigma" },
  twitter: { card: "summary_large_image", title, description },
};

const features: { icon: LucideIcon; title: string; text: string; color: string }[] = [
  {
    icon: Leaf,
    title: "Ballaststoffe und Vitamine",
    text: "Nicht nur Kalorien und Makros: 26 Nährstoffe, von Ballaststoffen bis Vitamin D. Fehlt ein Wert, zeigt Sigma das ehrlich an, statt mit 0 zu rechnen.",
    color: "var(--fiber)",
  },
  {
    icon: ChefHat,
    title: "Rezepte wie zu Hause",
    text: "Zutatenliste oder Rezept abfotografieren, Abweichungen anpassen, deine Portion wiegen. Fertig, auch wenn jemand anderes gekocht hat.",
    color: "var(--carbs)",
  },
  {
    icon: Camera,
    title: "Foto statt Tippen",
    text: "Teller fotografieren, die KI schlägt Lebensmittel und Mengen vor, du bestätigst nur noch.",
    color: "var(--fat)",
  },
  {
    icon: Barcode,
    title: "Barcode in Sekunden",
    text: "Scannen und eintragen, mit Millionen Produkten aus Open Food Facts.",
    color: "var(--protein)",
  },
  {
    icon: Activity,
    title: "Training, Cardio und Erholung",
    text: "Sätze mit Vorschlag fürs nächste Gewicht, Cardio, Schlaf und Body Battery von deiner Garmin-Uhr.",
    color: "var(--warn)",
  },
  {
    icon: Sparkles,
    title: "Ein KI-Coach, der alles sieht",
    text: "Essen, Gewichtsverlauf, Fortschrittsfotos, Training und Schlaf in einer ehrlichen Wochenauswertung.",
    color: "var(--accent)",
  },
];

function cleanSource(ref: string | string[] | undefined) {
  const v = (Array.isArray(ref) ? ref[0] : ref)?.trim().toLowerCase();
  return v && /^[a-z0-9_-]{1,40}$/.test(v) ? v : undefined;
}

export default async function WaitlistPage({ searchParams }: PageProps<"/warteliste">) {
  const { ref } = await searchParams;
  const source = cleanSource(ref);
  const contact = process.env.NEXT_PUBLIC_WAITLIST_CONTACT || undefined;

  return (
    <main lang="de" className="mx-auto w-full max-w-md px-6 pt-[max(3rem,env(safe-area-inset-top))] pb-[max(3rem,env(safe-area-inset-bottom))]">
      <section className="animate-fade-up">
        <div className="mb-8 flex items-center gap-3">
          <Logo className="size-11" />
          <span className="text-lg font-semibold tracking-tight">Sigma</span>
          <span className="ml-auto rounded-full border border-line px-3 py-1 text-xs text-muted">Bald verfügbar</span>
        </div>
        <h1 className="text-[2.1rem] leading-[1.1] font-semibold tracking-tight">
          Die Fitness-App, die <span className="text-accent">wirklich alles</span> zählt.
        </h1>
        <p className="mt-4 text-[17px] leading-relaxed text-muted">
          Kalorien, Ballaststoffe, Vitamine, Training, Schlaf und Fortschrittsfotos in einer App. Dazu ein KI-Coach, der alles davon sieht und dir sagt, was
          wirklich zählt.
        </p>
      </section>

      <section className="mt-8 rounded-3xl border border-line bg-surface p-5" aria-labelledby="join">
        <h2 id="join" className="font-semibold">
          Sei beim Start dabei
        </h2>
        <p className="mt-1 mb-4 text-sm text-muted">Trag dich ein und bekomm als eine der ersten Personen Zugang.</p>
        <WaitlistForm source={source} contact={contact} />
      </section>

      <section className="mt-12" aria-labelledby="features">
        <h2 id="features" className="mb-4 text-sm font-medium tracking-wide text-muted uppercase">
          Was Sigma anders macht
        </h2>
        <ul className="space-y-3">
          {features.map(({ icon: Icon, title, text, color }) => (
            <li key={title} className="flex gap-4 rounded-2xl border border-line bg-surface p-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl" style={{ background: `color-mix(in srgb, ${color} 16%, transparent)`, color }}>
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <div>
                <h3 className="font-medium">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section id="datenschutz" className="mt-12 scroll-mt-6 border-t border-line pt-6 text-xs leading-relaxed text-faint">
        <h2 className="mb-2 text-sm font-medium text-muted">Datenschutz</h2>
        <p>
          Wir speichern nur deine E-Mail-Adresse, den Zeitpunkt deiner Einwilligung und, falls vorhanden, über welchen Link du gekommen bist. Wir nutzen die Adresse
          ausschließlich, um dich über den Start von Sigma zu informieren, und geben sie nicht weiter. Gespeichert wird bei Supabase auf Servern in Frankfurt, die
          Seite läuft bei Vercel. Du kannst deine Einwilligung jederzeit widerrufen, dann löschen wir deine Adresse
          {contact ? (
            <>
              . Schreib dazu einfach an{" "}
              <a href={`mailto:${contact}`} className="underline underline-offset-2">
                {contact}
              </a>
              .
            </>
          ) : (
            <>. Eine kurze Antwort auf unsere E-Mail genügt.</>
          )}{" "}
          Nach dem Start löschen wir die Warteliste.
        </p>
        <LegalLinks className="mt-4" />
      </section>
    </main>
  );
}
