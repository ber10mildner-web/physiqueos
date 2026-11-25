import type { Metadata } from "next";
import { legalOperator } from "@/lib/legal";
import { H2, LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = { title: "Impressum", robots: { index: false } };

export default function ImpressumPage() {
  const { operator: o, complete } = legalOperator();
  return (
    <LegalPage title="Impressum" draft={!complete}>
      <H2>Angaben gemäß § 5 DDG</H2>
      <p>
        {o.name}
        {o.form ? ` (${o.form})` : null}
        <br />
        {o.street}
        <br />
        {o.city}
        <br />
        Deutschland
      </p>
      <H2>Kontakt</H2>
      <p>
        E-Mail: {o.email.startsWith("[") ? o.email : <a href={`mailto:${o.email}`} className="underline underline-offset-2">{o.email}</a>}
        {o.phone ? (
          <>
            <br />
            Telefon: {o.phone}
          </>
        ) : null}
      </p>
      {o.vatId ? (
        <>
          <H2>Umsatzsteuer-ID</H2>
          <p>Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG: {o.vatId}</p>
        </>
      ) : null}
      <H2>Verantwortlich für den Inhalt</H2>
      <p>{o.name}, Anschrift wie oben.</p>
      <H2>Verbraucherstreitbeilegung</H2>
      <p>Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>
      <H2>Hinweis zu Gesundheitsthemen</H2>
      <p>
        Sigma ist eine App für Ernährung, Training und Fortschritt und kein Medizinprodukt. Hinweise und Auswertungen beruhen auf deinen Einträgen und auf Schätzungen.
        Sie ersetzen keine ärztliche Beratung.
      </p>
      <H2>Lebensmitteldaten</H2>
      <p>
        Produktdaten stammen teilweise von <a href="https://world.openfoodfacts.org" className="underline underline-offset-2">Open Food Facts</a> (Open Database License)
        sowie aus der USDA FoodData Central (gemeinfrei). Für die Richtigkeit dieser Daten können wir keine Gewähr übernehmen.
      </p>
    </LegalPage>
  );
}
