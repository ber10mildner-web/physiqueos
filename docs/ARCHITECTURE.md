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

## Externe Dienste, Kosten, Grenzen

| Dienst | Zweck | Kosten | Grenzen / Lizenz |
| --- | --- | --- | --- |
| Supabase Free | DB, Auth, Fotos | 0 € | 500 MB DB, 1 GB Storage; Projekt pausiert nach 7 Tagen ohne Aktivität |
| Vercel Hobby | Hosting | 0 € | nur nicht-kommerziell; bei Verkauf Pro-Plan nötig |
| Open Food Facts | Barcode, Produkte | 0 € | ODbL, Namensnennung; ca. 100 Produktabrufe/min, 10 Suchen/min |
| USDA FoodData Central | generische Lebensmittel, Vitamine | 0 € | CC0; 1.000 Anfragen/h mit eigenem Schlüssel |

Gut zu wissen: Fotos werden auf ca. 200–400 KB verkleinert, 1 GB reicht damit für mehrere tausend Fotos.

## Roadmap

1. **Meilenstein 1 (dieser Stand):** Profil & Ziele, Gewicht, Fotos, Tagebuch mit Barcode/Suche/manuell, Ballaststoffe und Mikronährstoffe.
2. **Rezepte:** Rezept aus Zutatenliste anlegen (Foto der Zutatenliste → Zutaten + Mengen, korrigierbar), Gesamtgewicht nach dem Kochen, dann „300 g davon“ eintragen. Neue Tabellen `recipes` und `recipe_ingredients`, Quelle `recipe`.
3. **Claude-Anbindung (MCP-Server):** Route `/api/mcp` mit persönlichen Zugriffstokens (gehasht gespeichert). Werkzeuge: Tagebuch, Gewicht, Ziele, Fotos lesen; Rezepte und Einträge schreiben. Damit kann Claude Rezeptfotos kostenlos über das Claude-Abo auslesen und wöchentliche Auswertungen erstellen. Die Datenzugriffsschicht in `src/lib/data` ist dafür vorbereitet.
4. **Training:** Übungsbibliothek, Pläne, Sätze/Wiederholungen/Gewicht, Bestleistungen, Cardio.
5. **Garmin:** Schlaf, HRV, Ruhepuls, Aktivitäten. Offizielle API nur für Firmen; privat über eine inoffizielle Garmin-Connect-Anbindung (kann bei Änderungen durch Garmin brechen).
6. **Analytics:** Phasenvergleich, Kalorien vs. Gewichtstrend (tatsächlicher Verbrauch), Trainingsvolumen.

## Bekannte Lücken in Meilenstein 1

- Kein Offline-Modus (die App braucht Internet).
- Die Abfragen an Open Food Facts und USDA konnten in der Entwicklungsumgebung nicht live getestet werden (Netzwerk gesperrt). Die Umrechnung ist gegen die dokumentierten Antwortformate getestet; der erste echte Test passiert nach dem Deployment.
- Körpermaße (Taille, Brust …) sind noch nicht enthalten.
- Bei Getränken liefert Open Food Facts Werte pro 100 ml; die App behandelt 1 ml ≈ 1 g.
