# Ideen & Backlog

Gesammelte Ideen von Leo und Claude. Erledigtes wird abgehakt, nichts wird gelöscht.

## In Arbeit / beschlossen (2026-11-20)

- [x] Schnell-Tracking: Mahlzeit vom Vortag kopieren, Favoriten, Wasser
- [x] Rezepte: Zutaten (Suche, Barcode, manuell) + Gesamtgewicht nach dem Kochen, danach „300 g davon“ eintragen
- [x] Claude-Anbindung (MCP-Server): Claude liest Ernährung, Gewicht, Fotos; trägt Rezepte und Mahlzeiten ein; Rezeptfotos kostenlos über das Claude-Abo auslesen
- [x] Wöchentliche Auswertung durch Claude (Kalorien, Makros, Ballaststoffe, Mikronährstoffe, Gewichtstrend, Fotos, Training)
- [x] Training: Übungsbibliothek, eigene Übungen, Pläne, Sätze/Wiederholungen/Gewicht, Bestleistungen, Kraftverlauf, Cardio
- [~] Garmin (Versuch gebaut 2026-11-20: einmalige Anmeldung am Computer, danach täglicher Abgleich; muss sich im Alltag bewähren): Schlaf-Score, HRV, Ruhepuls, Aktivitäten (offizielle API nur für Firmen; privat inoffiziell oder über Strava)

## Sigma-Ausbau (2026-11-20)

- [x] Name „Sigma“
- [x] Subjektive Trainingsbewertung (Gefühl, Energie, Anstrengung, Notiz)
- [x] Haut (Pickel) und Medikamente als Tagesprotokoll
- [x] Stairmaster-/Gerätefoto mit Garmin verrechnen (genauere Kalorien)
- [x] Tageszitat
- [x] Kalorienziel pro Wochentag (z. B. Cardio-Tage Di/Do mehr)
- [x] Claude-Auswertung aus der App heraus (öffnet die Claude-App, kostenlos über den Konnektor)
- [x] Grundnahrungsmittel in der Suche (Apfel, Kiwi, Zwiebel, Reis …): ca. 260 Lebensmittel mit deutschen Namen, Ballaststoffen und Vitaminen, erscheinen vor Open Food Facts (2026-11-21)
- [ ] Grundnahrungsmittel erweitern: fehlende Lebensmittel einfach melden (z. B. Quark, Skyr, Brotsorten sind Markenprodukte und kommen weiter über Open Food Facts)

## Ideen von Claude

- Tatsächlichen Kalorienverbrauch aus Gewichtstrend + gegessenen Kalorien berechnen („adaptives TDEE“) und das Ziel automatisch nachjustieren
- Wöchentlicher Check-in: Gewichtstrend vs. Ziel der Phase (z. B. Diät: −0,5 bis −1 % Körpergewicht pro Woche)
- Mikronährstoff-Ampel gegen Referenzwerte (DGE), mit Hinweis welche Lebensmittel fehlen
- Körpermaße (Taille, Brust, Arme, Oberschenkel) mit Verlauf
- Foto-Erinnerung (z. B. jeden Sonntag morgens, gleiche Pose)
- Portionsgrößen pro Lebensmittel merken („meine Portion Haferflocken = 80 g“)
- Mahlzeiten-Vorlagen (z. B. „Frühstück Standard“ mit einem Tipp eintragen)
- Proteinverteilung über den Tag anzeigen
- Offline-Modus (Einträge zwischenspeichern, später synchronisieren)
- Export als CSV
- Heller Modus
- [x] Trainingsplan-Empfehlungen (progressive Überlastung: wann Gewicht erhöhen)
- Cardio-Zonen aus Garmin-Herzfrequenz
- Schlaf vs. Trainingsleistung vs. Kalorien in der Analyse vergleichen
- Pausen-Timer zwischen Sätzen
- Garmin-Kalorienverbrauch (aktive kcal) nutzen, um das Kalorienziel an Trainingstagen anzupassen
- Übersicht/Dashboard: Schlaf, Body Battery und Schritte von heute als Kacheln
- Hinweis in der App, wenn der Garmin-Abgleich mehrere Tage fehlschlägt
- Automatische Wochenauswertung von Claude jeden Sonntag (geplanter Chat)
- Kraftverlauf als Diagramm pro Übung
- Strava als Umweg für Garmin-Aktivitäten (offizielle API)
- Gemeinsamer Produkt-Cache für alle Nutzer (wichtig, falls die App verkauft wird)
- Hautverlauf neben Ernährung/Schlaf als Diagramm (Muster sichtbar machen)
- Erinnerung für Medikamente (Push-Benachrichtigung)
- Gerätefoto auch für Laufband/Rad (Werte vom Display mit Garmin vergleichen)
- Bezahlmodell/Abos erst, wenn verkauft werden soll (Vercel Pro nötig, Hobby ist nur nicht-kommerziell)

## Ideen von Leo

- (hier landet alles, was du beim Testen schreibst)
- Kalender verknüpfen, z. B. geplante Trainings und Cardio-Tage im Handykalender (später)
- Trading Journal verknüpfen. Vorschlag: als eigene kleine App, damit Sigma bei Körper und Gesundheit bleibt; Claude kann beide später gemeinsam auswerten
- Eigener Claude-Chat direkt in Sigma (kostet API-Guthaben, ca. 2–10 Cent pro Frage). Entschieden 2026-11-20: vorerst kostenlos über die Claude-App
