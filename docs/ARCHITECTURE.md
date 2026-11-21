# Architektur & Entscheidungen

## Überblick

```
Handy (PWA)
  │  Server Components lesen, Server Actions schreiben
  ▼
Next.js auf Vercel ──────────► Open Food Facts (Barcode, Suche)
  │  Supabase-Client mit       ► USDA FoodData Central (Suche, Mikronährstoffe)
  │  Nutzer-Session (RLS)
  ▼
Supabase: Postgres + Auth + Storage (privater Bucket für Fotos)
```

```
src/
  app/
    (app)/            Seiten hinter dem Login: Übersicht, Ernährung, Körper, Profil
    api/food/         Barcode-Lookup und Suche (Server, Schlüssel bleiben dort)
    login/, auth/     Anmeldung, Bestätigungslink
  components/         UI-Bausteine (ui.tsx), Navigation, Tageszusammenfassung
  lib/
    nutrition/        Nährstoffliste, Rechenlogik, Energiebedarf (reine Funktionen, getestet)
    body/             Gewichtstrend (getestet)
    food-sources/     Open Food Facts und USDA: Abruf + Umrechnung (getestet)
    data/             Datenzugriffsschicht (alle Lesezugriffe, RLS greift immer)
    i18n/             de.ts (Quelle), en.ts, Server- und Client-Zugriff
    supabase/         Clients für Server, Browser und Proxy
  proxy.ts            Session-Refresh + Weiterleitung zum Login
supabase/migrations/  Datenbank-Schema und Storage-Regeln
tests/                Datenbank-Tests gegen das echte SQL (PGlite)
```

## Entscheidungen

**1. Mehrbenutzerfähig von Anfang an.** Jede Tabelle hat `user_id` und Row Level Security. Ein Nutzer kann fremde Zeilen weder lesen noch schreiben, auch nicht über Verknüpfungen (z. B. Tagebucheintrag auf fremdes Lebensmittel). Das wird in `tests/schema.test.ts` gegen das echte Migrations-SQL geprüft.

**2. Nährwerte als jsonb pro 100 g, „fehlt“ heißt „unbekannt“.** Eine Spalte pro Nährstoff wäre bei 26+ Nährstoffen starr. Die Schlüssel und Einheiten stehen zentral in `src/lib/nutrition/nutrients.ts`. Fehlende Werte werden nie als 0 gezählt; Summen zeigen „x von y Lebensmitteln“.

**3. Tagebucheinträge speichern einen Schnappschuss.** Name, Quelle und Nährwerte werden beim Eintragen kopiert. Wenn ein Produkt später aktualisiert wird, ändert sich die Vergangenheit nicht.

**4. Herkunft bleibt erhalten.** Jedes Lebensmittel speichert `source` (`openfoodfacts`, `usda`, `custom`), `source_id` (Barcode bzw. fdcId) und `source_url`. Ergänzt der Nutzer fehlende Werte eines Produkts, wird daraus ein eigenes Lebensmittel (`custom`), der Link zur Quelle bleibt erhalten.

**5. Eigene Lebensmittelbibliothek pro Nutzer.** Externe Produkte werden beim ersten Eintragen in die Bibliothek des Nutzers übernommen. Der nächste Scan desselben Barcodes ist dann sofort da, auch ohne Internet zur Quelle. Eine gemeinsame, nutzerübergreifende Produkt-Cache-Tabelle wäre bei vielen Nutzern effizienter und kann später ergänzt werden.

**6. Ziele mit Gültigkeitsdatum.** `nutrition_goals` speichert eine Historie (`valid_from`). So kann eine spätere Auswertung Diät- und Aufbauphasen getrennt betrachten.

**7. Cache Components ausgeschaltet.** Next.js 16 aktiviert sie im Template. Fast jede Seite ist nutzerbezogen und wird pro Anfrage gerendert, daher ist das klassische dynamische Rendering hier einfacher und weniger fehleranfällig.

**8. Eigenes, kleines i18n statt Bibliothek.** `de.ts` definiert die Struktur, `en.ts` muss typgleich sein (vom Compiler und von einem Test geprüft). Sprache liegt im Cookie und im Profil.

**9. Fotos nur über signierte URLs.** Bucket `progress-photos` ist privat; Pfad `<user_id>/<uuid>.jpg`, Storage-Regeln erlauben nur den eigenen Ordner. Bilder werden im Browser auf max. 1600 px verkleinert, dabei fallen EXIF-Daten (z. B. GPS) weg.

**10. Kalorienbedarf ist eine Schätzung.** Mifflin-St Jeor × Aktivitätsfaktor, Diät −20 %, Lean Bulk +10 %, Protein 1,8–2,2 g/kg, Fett 25 % der Energie, Ballaststoffe ≥ 30 g bzw. 14 g/1000 kcal. Alles bleibt manuell überschreibbar.

**11. Wiederkehrende Einträge ohne Hintergrund-Job.** Cardio-Vorlagen und Supplemente können an festen Wochentagen (`auto_days`, ISO 1 = Montag) von selbst eingetragen werden. Statt eines Crons pro Nutzer ruft jede Hauptseite und jede Claude-Anfrage `ensureRoutines()` auf (`src/lib/data/routines.ts`): Es füllt fällige Tage der letzten 7 Tage auf, aber nie vor `auto_from` (dem Tag, an dem die Regel gespeichert wurde). Jeder automatische Eintrag wird zuerst in `routine_runs` „reserviert“ (Primärschlüssel pro Tag); was dort schon steht, wird nie wieder angelegt. So bleibt ein gelöschter Eintrag gelöscht, und zwei gleichzeitige Anfragen erzeugen keine Duplikate.

**12. Supplemente zählen als Tagebucheintrag.** Ein Supplement mit Nährwerten (pro Dosis, `medications.nutrients`) erzeugt bei jeder Einnahme einen normalen Tagebucheintrag (Mahlzeit „Snack“, `medication_log_id`). Damit rechnen Übersicht, Ernährungsseite, Wochenauswertung und Claude ohne Sonderfall mit. Wird die Einnahme entfernt, verschwindet der Eintrag per `on delete cascade`.

**13. Vercel-Region Frankfurt.** `vercel.json` setzt `regions: ["fra1"]`, damit die Server-Funktionen neben der Supabase-Datenbank (Frankfurt) laufen. Vorher liefen sie in den USA, und jede Seite brauchte mehrere Atlantik-Rundreisen.

## Externe Dienste, Kosten, Grenzen

| Dienst | Zweck | Kosten | Grenzen / Lizenz |
| --- | --- | --- | --- |
| Supabase Free | DB, Auth, Fotos | 0 € | 500 MB DB, 1 GB Storage; Projekt pausiert nach 7 Tagen ohne Aktivität |
| Vercel Hobby | Hosting | 0 € | nur nicht-kommerziell; bei Verkauf Pro-Plan nötig |
| Open Food Facts | Barcode, Produkte | 0 € | ODbL, Namensnennung; ca. 100 Produktabrufe/min, 10 Suchen/min |
| USDA FoodData Central | generische Lebensmittel, Vitamine | 0 € | CC0; 1.000 Anfragen/h mit eigenem Schlüssel |

Gut zu wissen: Fotos werden auf ca. 200–400 KB verkleinert, 1 GB reicht damit für mehrere tausend Fotos.

## Roadmap

1. **Meilenstein 1 (fertig):** Profil & Ziele, Gewicht, Fotos, Tagebuch mit Barcode/Suche/manuell, Ballaststoffe und Mikronährstoffe.
2. **Meilenstein 2 (fertig, 2026-11-20): Rezepte, Schnell-Tracking, Claude-Anbindung, Training, Schlaf.** Ursprünglicher Plan für Rezepte: Rezept aus Zutatenliste anlegen (Foto der Zutatenliste → Zutaten + Mengen, korrigierbar), Gesamtgewicht nach dem Kochen, dann „300 g davon“ eintragen. Neue Tabellen `recipes` und `recipe_ingredients`, Quelle `recipe`.
3. **Claude-Anbindung (MCP-Server):** Route `/api/mcp` mit persönlichen Zugriffstokens (gehasht gespeichert). Werkzeuge: Tagebuch, Gewicht, Ziele, Fotos lesen; Rezepte und Einträge schreiben. Damit kann Claude Rezeptfotos kostenlos über das Claude-Abo auslesen und wöchentliche Auswertungen erstellen. Die Datenzugriffsschicht in `src/lib/data` ist dafür vorbereitet.
4. **Training:** Übungsbibliothek, Pläne, Sätze/Wiederholungen/Gewicht, Bestleistungen, Cardio.
5. **Garmin:** Schlaf, HRV, Ruhepuls, Aktivitäten. Offizielle API nur für Firmen; privat über eine inoffizielle Garmin-Connect-Anbindung (kann bei Änderungen durch Garmin brechen).
6. **Analytics:** Phasenvergleich, Kalorien vs. Gewichtstrend (tatsächlicher Verbrauch), Trainingsvolumen.

## Meilenstein 2: wie es gebaut ist

- **Rezepte** (`recipes`, `recipe_ingredients`): Zutaten sind normale Lebensmittel. Nährwerte pro 100 g = Summe der Zutaten / Gewicht nach dem Kochen (ohne Angabe: Rohgewicht). Ein Nährstoff gilt nur als bekannt, wenn er bei allen Zutaten bekannt ist. Tagebucheinträge speichern einen Schnappschuss (`source = recipe`, `recipe_id`).
- **Schnell-Tracking:** `foods.is_favorite`, Mahlzeit von einem anderen Tag kopieren, `water_logs` + `profiles.water_target_ml`.
- **Claude (MCP):** `/api/mcp/<token>`, Streamable HTTP über `mcp-handler`. Tokens (`pos_…`) werden nur als SHA-256-Hash gespeichert und einmal angezeigt; widerrufbar, optional nur lesend. Die Route sucht den Token mit dem Secret key (`SUPABASE_SECRET_KEY`, nur serverseitig) und arbeitet danach ausschließlich mit Abfragen, die auf `user_id` des Token-Besitzers eingeschränkt sind. Werkzeuge in `src/lib/mcp/server.ts`; Claude darf keine Nährwerte erfinden (nur Datenbank-Treffer oder Werte vom Etikett/Foto).
- **Training:** eingebaute Übungen (`exercises.user_id is null`) + eigene, Pläne mit Satz- und Wiederholungsbereich, Sätze pro Training. Vorschlag nach doppelter Progression: Wenn alle Arbeitssätze das obere Ende des Bereichs erreichen, Gewicht um eine Stufe erhöhen (2,5 kg, Kurzhantel/Kettlebell 2 kg), sonst gleiches Gewicht und mehr Wiederholungen. Geschätztes 1RM nach Epley, nur bis 12 Wiederholungen.
- **Schlaf & Erholung** (`daily_health`): ein Datensatz pro Tag, manuell oder über Claude. Garmin bietet Privatpersonen keine offizielle Schnittstelle.
- **Garmin-Abgleich (Versuch, 2026-11-20):** Seit März 2026 blockt Garmin SSO-Logins von Servern (429), garth ist eingestellt. Deshalb: einmalige Anmeldung auf Leos Computer mit python-garminconnect (`scripts/garmin_login.py`), die DI-OAuth2-Tokens werden in der App eingefügt. Gespeichert AES-256-GCM-verschlüsselt in `garmin_connections` (Schlüssel `GARMIN_TOKEN_KEY` oder per HKDF aus `SUPABASE_SECRET_KEY`; der Browser darf die Token-Spalte per Spalten-Grant nicht lesen). Beim Verbinden wird sofort erneuert (`diauth.garmin.com/di-oauth2-service/oauth/token`, Refresh-Token rotiert, wird vor allem anderen gespeichert). Täglicher Vercel-Cron `/api/garmin/sync` (geschützt mit `CRON_SECRET`) holt die letzten 3 Tage: `dailySleepData`, `hrv`, `usersummary/daily`, Aktivitäten (ohne Krafttraining) als `cardio_sessions` mit `source_id`. Endpunkte und Header gespiegelt von python-garminconnect 0.3.20. Ob Garmin Token-Erneuerungen von Vercel-IPs annimmt, ist ungetestet.

## Bekannte Lücken in Meilenstein 1

- Kein Offline-Modus (die App braucht Internet).
- Die Abfragen an Open Food Facts und USDA konnten in der Entwicklungsumgebung nicht live getestet werden (Netzwerk gesperrt). Die Umrechnung ist gegen die dokumentierten Antwortformate getestet; der erste echte Test passiert nach dem Deployment.
- Körpermaße (Taille, Brust …) sind noch nicht enthalten.
- Bei Getränken liefert Open Food Facts Werte pro 100 ml; die App behandelt 1 ml ≈ 1 g.
