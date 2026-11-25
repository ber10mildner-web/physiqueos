import type { Metadata } from "next";
import { legalOperator, PRIVACY_VERSION_DATE } from "@/lib/legal";
import { H2, H3, LegalPage, List } from "@/components/legal/legal-page";

export const metadata: Metadata = { title: "Datenschutzerklärung", robots: { index: false } };

// Written from the real data flows in the code (see docs/LEGAL.md). Update PRIVACY_VERSION_DATE with every change.
export default function DatenschutzPage() {
  const { operator: o, complete } = legalOperator();
  return (
    <LegalPage title="Datenschutzerklärung" draft={!complete}>
      <p>Stand: {PRIVACY_VERSION_DATE}</p>
      <p>
        Sigma hilft dir, Ernährung, Körper, Training und Erholung an einem Ort zu verfolgen. Dabei geht es um sehr persönliche Daten, auch um Gesundheitsdaten. Hier
        steht, welche Daten wir verarbeiten, wozu, wo sie liegen und welche Rechte du hast.
      </p>

      <H2>1. Verantwortlicher</H2>
      <p>
        {o.name}
        <br />
        {o.street}, {o.city}, Deutschland
        <br />
        E-Mail: {o.email}
      </p>
      <p>Ein Datenschutzbeauftragter ist nicht benannt, weil die gesetzlichen Voraussetzungen dafür nicht vorliegen. Wende dich mit allen Fragen an die Adresse oben.</p>

      <H2>2. Kurz gesagt</H2>
      <List>
        <li>Deine Daten liegen in einer Datenbank in Frankfurt am Main. Jeder Nutzer sieht nur seine eigenen Daten.</li>
        <li>Wir verkaufen keine Daten, zeigen keine Werbung und nutzen keine Analyse- oder Tracking-Dienste.</li>
        <li>Gesundheitsdaten verarbeiten wir nur mit deiner ausdrücklichen Einwilligung. Du kannst sie jederzeit widerrufen.</li>
        <li>Fotos gehen nur an eine KI, wenn du selbst ein Foto auswerten lässt.</li>
      </List>

      <H2>3. Hosting und Speicherung</H2>
      <p>
        <strong className="text-text">Vercel Inc.</strong> (USA) betreibt die Server, auf denen Sigma läuft. Die Server-Funktionen laufen in der Region Frankfurt am Main.
        Beim Aufruf einer Seite verarbeitet Vercel technisch notwendige Daten wie IP-Adresse, Zeitpunkt und aufgerufene Adresse in Server-Protokollen.
      </p>
      <p>
        <strong className="text-text">Supabase Inc.</strong> (USA) stellt die Datenbank, die Anmeldung und den Speicher für Fotos bereit. Die Daten liegen in einem
        Rechenzentrum in Frankfurt am Main.
      </p>
      <p>
        Mit beiden Anbietern bestehen Verträge zur Auftragsverarbeitung nach Art. 28 DSGVO. Da beide Unternehmen ihren Sitz in den USA haben, ist ein Zugriff aus den
        USA nicht ausgeschlossen; er ist über Standardvertragsklauseln der EU-Kommission abgesichert. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Bereitstellung der
        App) bzw. lit. f (sicherer Betrieb).
      </p>

      <H2>4. Dein Konto</H2>
      <p>
        Für ein Konto speichern wir deine E-Mail-Adresse und dein Passwort (nur verschlüsselt als Hash). Im Profil kannst du Geschlecht, Geburtsdatum, Größe,
        Aktivitätsniveau, Sprache und Zeitzone angeben, damit Sigma deinen Bedarf schätzen kann. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.
      </p>

      <H2>5. Was du in Sigma einträgst</H2>
      <H3>Ernährung und Training</H3>
      <p>
        Ernährungstagebuch, eigene Lebensmittel und Rezepte, Wasser, Ziele, Trainingspläne, Sätze, Cardio-Einheiten und deine Bewertungen dazu. Rechtsgrundlage ist Art. 6
        Abs. 1 lit. b DSGVO. Soweit sich daraus Rückschlüsse auf deine Gesundheit ziehen lassen, gilt zusätzlich Abschnitt 5.2.
      </p>
      <H3>Gesundheitsdaten</H3>
      <p>
        Gewicht, Taillenumfang, Fortschrittsfotos, Schlaf, Ruhepuls, Herzfrequenzvariabilität, Body Battery, Hautzustand, Medikamente und Nahrungsergänzung, deine
        Beschreibung deiner Situation sowie Hinweise auf Nährstofflücken sind Gesundheitsdaten im Sinne von Art. 9 DSGVO. Wir verarbeiten sie nur auf Grundlage deiner
        ausdrücklichen Einwilligung (Art. 9 Abs. 2 lit. a DSGVO) und nur, um sie dir anzuzeigen und für dich auszuwerten. Du kannst die Einwilligung jederzeit
        widerrufen; dann löschen wir diese Daten. Die Verarbeitung bis zum Widerruf bleibt rechtmäßig.
      </p>
      <H3>Fotos</H3>
      <p>
        Fortschrittsfotos und Fotos von Cardio-Geräten liegen in einem privaten Speicher, den nur du über zeitlich begrenzte Links abrufen kannst. Bilder werden vor
        dem Hochladen auf deinem Gerät verkleinert; dabei fallen eingebettete Zusatzdaten wie der Aufnahmeort (GPS) weg.
      </p>

      <H2>6. KI-Auswertung von Fotos</H2>
      <p>
        Wenn du ein Foto einer Mahlzeit, einer Nährwerttabelle oder eines Cardio-Displays auswerten lässt, senden wir das verkleinerte Foto und gegebenenfalls deinen
        Hinweistext an <strong className="text-text">Anthropic PBC</strong> (USA). Die KI erkennt darauf Lebensmittel und Mengen bzw. Werte; die Nährwerte kommen danach
        aus der Sigma-Datenbank. Fotos von Mahlzeiten und Nährwerttabellen speichern wir nicht. Anthropic verarbeitet die Daten als Auftragsverarbeiter nach seinen
        kommerziellen Bedingungen, die einen Vertrag zur Auftragsverarbeitung mit Standardvertragsklauseln enthalten, und verwendet sie nicht zum Training seiner
        Modelle. Diese Funktion ist freiwillig; Rechtsgrundlage ist deine Einwilligung (Art. 6 Abs. 1 lit. a und Art. 9 Abs. 2 lit. a DSGVO). Für jede Auswertung
        speichern wir nur Datum, Funktion und Kosten, nicht das Foto.
      </p>

      <H2>7. Lebensmitteldatenbanken</H2>
      <p>
        Wenn du einen Barcode scannst oder nach Lebensmitteln suchst, fragt unser Server bei <strong className="text-text">Open Food Facts</strong> (Frankreich) und
        der <strong className="text-text">USDA FoodData Central</strong> (USA) nach. Dabei wird nur der Barcode bzw. der Suchbegriff übertragen, keine Daten über dich.
        Produktbilder von Open Food Facts lädt dein Gerät direkt von deren Servern; dabei erhält Open Food Facts deine IP-Adresse (Art. 6 Abs. 1 lit. f DSGVO,
        Interesse: Produkte erkennbar anzeigen).
      </p>

      <H2>8. Verbindungen, die du selbst einrichtest</H2>
      <H3>Garmin</H3>
      <p>
        Verbindest du dein Garmin-Konto, ruft Sigma täglich deine Tageswerte (z. B. Schritte, Kalorien, Schlaf, Ruhepuls, Body Battery) und Aktivitäten ab. Die
        Zugangsdaten speichern wir verschlüsselt. Rechtsgrundlage ist deine Einwilligung (Art. 9 Abs. 2 lit. a DSGVO). Du kannst die Verbindung jederzeit trennen.
      </p>
      <H3>Claude</H3>
      <p>
        Du kannst in den Einstellungen einen persönlichen Zugangsschlüssel erstellen und damit dein eigenes Claude-Konto (Anthropic) mit Sigma verbinden. Claude kann
        dann in deinem Auftrag deine Daten lesen und Einträge machen. Diese Verarbeitung findet in deinem Claude-Konto statt und richtet sich nach deinem Vertrag mit
        Anthropic. Den Schlüssel speichern wir nur als Prüfsumme; du kannst ihn jederzeit widerrufen.
      </p>

      <H2>9. Warteliste</H2>
      <p>
        Trägst du dich auf der Warteliste ein, speichern wir deine E-Mail-Adresse, den Zeitpunkt deiner Einwilligung und gegebenenfalls, über welchen Link du gekommen
        bist. Wir nutzen sie nur, um dich über den Start von Sigma zu informieren (Art. 6 Abs. 1 lit. a DSGVO). Nach dem Start löschen wir die Warteliste.
      </p>

      <H2>10. Cookies und Speicher auf deinem Gerät</H2>
      <p>
        Sigma setzt nur technisch notwendige Cookies: für die Anmeldung und für die gewählte Sprache. Damit die App ohne Netz funktioniert, speichert sie besuchte
        Seiten und noch nicht gesendete Einträge (z. B. Wasser, Gewicht) auf deinem Gerät, bis sie übertragen sind. Es gibt keine Tracking- oder Werbe-Cookies
        (§ 25 Abs. 2 TDDDG).
      </p>

      <H2>11. Wie lange wir Daten speichern</H2>
      <p>
        Deine Daten speichern wir, solange du dein Konto hast. Löschst du dein Konto, löschen wir alle Einträge, Fotos und Verbindungen. Server-Protokolle der
        Hosting-Anbieter werden nach deren Fristen automatisch gelöscht. Gesetzliche Aufbewahrungspflichten (z. B. für Rechnungen) bleiben unberührt.
      </p>

      <H2>12. Deine Rechte</H2>
      <List>
        <li>Auskunft über deine Daten (Art. 15 DSGVO)</li>
        <li>Berichtigung (Art. 16) und Löschung (Art. 17)</li>
        <li>Einschränkung der Verarbeitung (Art. 18)</li>
        <li>Datenübertragbarkeit, also eine Kopie deiner Daten in einem gängigen Format (Art. 20)</li>
        <li>Widerspruch gegen Verarbeitungen auf Grundlage berechtigter Interessen (Art. 21)</li>
        <li>Widerruf erteilter Einwilligungen mit Wirkung für die Zukunft (Art. 7 Abs. 3)</li>
        <li>Beschwerde bei einer Datenschutz-Aufsichtsbehörde (Art. 77), z. B. der Behörde deines Bundeslands</li>
      </List>
      <p>Schreib uns dafür an die Adresse in Abschnitt 1.</p>

      <H2>13. Kein Medizinprodukt</H2>
      <p>
        Sigma trifft keine Entscheidungen über dich und stellt keine Diagnosen. Kalorien- und Nährstoffhinweise sind Schätzungen auf Basis deiner Einträge und
        ersetzen keine ärztliche Beratung.
      </p>
    </LegalPage>
  );
}
