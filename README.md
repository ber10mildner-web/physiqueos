# Sigma

Persönliche Lifestyle-App für Ernährung, Training, Körper, Erholung und Gesundheit. Mobile-first PWA, Deutsch und Englisch.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Supabase (Postgres, Auth, Storage) · Recharts · Vercel

## Was Meilenstein 1 kann

- **Konto & Profil:** Anmeldung per E-Mail und Passwort, Profil (Geschlecht, Alter, Größe, Aktivität).
- **Ziele:** Diät, Erhaltung, Lean Bulk oder eigenes Ziel. Bedarfsschätzung nach Mifflin-St Jeor, alles manuell anpassbar. Ziele haben ein Startdatum, damit spätere Auswertungen Phasen vergleichen können.
- **Ernährungstagebuch:** Barcode-Scanner (Kamera), Suche in Open Food Facts, USDA und den eigenen Lebensmitteln, manuelle Lebensmittel, Mengen ändern und löschen.
- **Ballaststoffe, Vitamine, Mineralstoffe:** 26 Nährstoffe. Fehlende Werte gelten als *unbekannt* und nicht als 0; die App zeigt an, für wie viele Lebensmittel ein Wert vorliegt.
- **Körpergewicht:** ein Eintrag pro Tag, 7-Tage-Schnitt, Verlauf als Diagramm.
- **Fortschrittsfotos:** privater Speicher, Bilder werden vor dem Upload verkleinert (Metadaten wie GPS werden dabei entfernt), Vergleich vorher/nachher.

## Neu in Meilenstein 2

- **Rezepte:** Zutaten suchen, scannen oder als Liste einfügen, Gewicht nach dem Kochen, dann „300 g davon“ eintragen.
- **Schnell-Tracking:** Favoriten, Mahlzeit von gestern kopieren, Wasser.
- **Training:** Übungsbibliothek und eigene Übungen, Pläne, Sätze mit Vorschlag fürs nächste Gewicht, Bestleistungen, Cardio.
- **Schlaf & Erholung:** Schlaf-Score, HRV, Ruhepuls, Body Battery, Schritte.
- **Claude-Anbindung (MCP):** Claude liest deine Daten, trägt Rezepte und Mahlzeiten ein und schreibt Wochenauswertungen. Einrichtung in [docs/SETUP.md](docs/SETUP.md#claude-verbinden).

## Neu in Sigma (Meilenstein 3)

- **Neuer Name:** PhysiqueOS heißt jetzt Sigma.
- **Trainingsbewertung:** nach jedem Krafttraining und jeder Cardio-Einheit Gefühl, Energie und Anstrengung (1–10) plus Notiz.
- **Gerätefoto & Kalorien-Abgleich:** Foto vom Stairmaster-Display (Zeit, Stufe, Stockwerke, Schritte, kcal). Sigma verrechnet geleistete Arbeit (ACSM-Formel mit Körpergewicht), Garmin-Kalorien und Gerätewert gewichtet zu einer Schätzung. Auslesen kostenlos über Claude oder optional per API in der App.
- **Haut & Medikamente:** Hautzustand pro Tag (0–4, Stellen, Notiz) und eine Abhakliste für Medikamente, Nahrungsergänzung und Hautpflege.
- **Ziele pro Wochentag:** z. B. an Cardio-Tagen mehr Kalorien.
- **Gedanke des Tages** und Knöpfe, die Claude mit einer passenden Auswertungsfrage öffnen.

## Lokale Entwicklung

```bash
npm install
cp .env.example .env.local   # Supabase-URL und Key eintragen
npm run dev
```

| Befehl | Zweck |
| --- | --- |
| `npm test` | Unit-Tests und Datenbank-Tests (RLS) |
| `npm run typecheck` | TypeScript prüfen |
| `npm run lint` | ESLint |
| `npm run build` | Produktions-Build |

Einrichtung von Supabase und Vercel Schritt für Schritt: [docs/SETUP.md](docs/SETUP.md).
Architektur, Entscheidungen und Roadmap: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Datenquellen

- [Open Food Facts](https://world.openfoodfacts.org) – Daten unter der Open Database License (ODbL).
- [USDA FoodData Central](https://fdc.nal.usda.gov) – gemeinfrei (CC0).
