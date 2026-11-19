# PhysiqueOS

Persönliche Fitness-App für Ernährung, Körpergewicht und Fortschrittsfotos. Mobile-first PWA, Deutsch und Englisch.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Supabase (Postgres, Auth, Storage) · Recharts · Vercel

## Was Meilenstein 1 kann

- **Konto & Profil:** Anmeldung per E-Mail und Passwort, Profil (Geschlecht, Alter, Größe, Aktivität).
- **Ziele:** Diät, Erhaltung, Lean Bulk oder eigenes Ziel. Bedarfsschätzung nach Mifflin-St Jeor, alles manuell anpassbar. Ziele haben ein Startdatum, damit spätere Auswertungen Phasen vergleichen können.
- **Ernährungstagebuch:** Barcode-Scanner (Kamera), Suche in Open Food Facts, USDA und den eigenen Lebensmitteln, manuelle Lebensmittel, Mengen ändern und löschen.
- **Ballaststoffe, Vitamine, Mineralstoffe:** 26 Nährstoffe. Fehlende Werte gelten als *unbekannt* und nicht als 0; die App zeigt an, für wie viele Lebensmittel ein Wert vorliegt.
- **Körpergewicht:** ein Eintrag pro Tag, 7-Tage-Schnitt, Verlauf als Diagramm.
- **Fortschrittsfotos:** privater Speicher, Bilder werden vor dem Upload verkleinert (Metadaten wie GPS werden dabei entfernt), Vergleich vorher/nachher.

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
