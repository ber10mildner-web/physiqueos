# Rechtsseiten: Impressum und Datenschutz

Öffentliche Seiten (ohne Login): `/impressum` und `/datenschutz`. Verlinkt auf der Warteliste, beim Login und unten in den Einstellungen. Deutsch, wie die Warteliste.

## Betreiberangaben (Vercel → Settings → Environment Variables)

Die persönliche Anschrift steht bewusst nicht im Code. Solange die ersten vier fehlen, zeigen beide Seiten Platzhalter und den Hinweis „Entwurf“.

| Variable | Beispiel | Pflicht |
| --- | --- | --- |
| `LEGAL_NAME` | Max Mustermann | ja |
| `LEGAL_STREET` | Musterstraße 1 | ja (ladungsfähige Anschrift, kein Postfach) |
| `LEGAL_CITY` | 12345 Musterstadt | ja |
| `LEGAL_EMAIL` | kontakt@… | ja |
| `LEGAL_PHONE` | +49 … | nein (zweiter schneller Kontaktweg; sonst z. B. Kontaktformular) |
| `LEGAL_FORM` | Einzelunternehmen | nein, nach der Gewerbeanmeldung |
| `LEGAL_VAT_ID` | DE… | nein, nur falls vorhanden |

Nach dem Setzen neu deployen (Vercel → Deployments → Redeploy).

## Was die Datenschutzerklärung verspricht und was dafür noch fehlt

Die Erklärung beschreibt die echten Datenflüsse (Stand 25.11.2026). Bevor fremde Nutzer Sigma nutzen, müssen diese Punkte erledigt sein, sonst stimmt sie nicht:

- [ ] Einwilligung für Gesundheitsdaten beim Registrieren (eigenes Häkchen), Widerruf in den Einstellungen
- [ ] Einwilligung vor der ersten KI-Fotoauswertung
- [ ] Konto löschen (inkl. Fotos im Storage, Garmin-Verbindung, Tokens) und Daten-Export
- [ ] Auftragsverarbeitungsvertrag mit Supabase abschließen (im Supabase-Dashboard anfordern); bei Vercel und Anthropic sind sie Teil der Bedingungen: prüfen und ablegen
- [ ] Anthropic-Bedingungen prüfen (Auftragsverarbeitung, Standardvertragsklauseln, Speicherdauer, kein Training)
- [ ] Inoffiziellen Garmin-Abgleich für Fremdnutzer abschalten
- [ ] Optional: Produktbilder von Open Food Facts über den eigenen Server laden, dann entfällt Abschnitt 7 Satz 3
- [ ] Prüfung durch eine Fachperson (Gesundheitsdaten)

Bei jeder inhaltlichen Änderung `PRIVACY_VERSION_DATE` in `src/lib/legal.ts` anpassen.
