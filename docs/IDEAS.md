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

## Feedback nach dem ersten Test (2026-11-21)

- [x] Gym ohne Uhr-Aufzeichnung: Beginn/Ende eintragen (Dauer), Gefühl 1–10 + Notiz pro Übung
- [x] Wiederholbares Cardio als Vorlage (z. B. Incline Walk 30 min, Steigung 6, Tempo 5): an festen Wochentagen automatisch eintragen oder mit einem Tipp, inkl. Intensität, Puls und kcal
- [x] Supplemente (z. B. Omega 3) mit kcal/Makros/Vitaminen pro Dosis, zählen in die Tagesernährung, auf Wunsch automatisch an festen Tagen
- [x] „Gewicht eintragen“: Datumsfeld auf dem iPhone ausgerichtet, Schnellzugriff-Beschriftungen zentriert
- [x] Flüssiger: Server in Frankfurt (wie die Datenbank), sofortige Ladeanzeige beim Tab-Wechsel, kein doppeltes Neuladen nach dem Speichern
- [ ] Vorlagen auch für Krafttraining-Einheiten (heute: Trainingspläne)
- [x] Gym-Kalorien ohne Uhr schätzen (aus Dauer und Gewicht, MET 4,5; zählt in den Tagesverbrauch, 2026-11-22)

## Ideen-Runde 2026-11-22 (Leo + Claude)

- [x] Favoriten und häufig Gegessenes mit einem Tipp eintragen (Leiste in jeder Mahlzeit, mit der zuletzt gegessenen Menge), Favorit direkt im Tagebuch setzen, ganzen Tag von gestern kopieren
- [x] Startseite: Training heute und morgen (Trainingstage pro Plan + wiederkehrendes Cardio), mit Start-Knopf
- [x] Gesamter Kalorienverbrauch pro Tag (Grundumsatz + Schritte/Garmin + Cardio + Krafttraining + Verdauung) und Bilanz zum Gegessenen
- [x] Wochenrückblick als eigene Seite (Kalorien pro Tag, Bilanz, Eiweiß, Ballaststoffe, Wasser, Gewicht, Training, Schlaf, Nährstoff-Hinweise, Knopf für Claude)
- [x] Offline: installierte App zeigt besuchte Seiten ohne Netz; Wasser, Favoriten-Tipps und Gewicht werden gespeichert und später gesendet
- [x] Visuell: Bilder (Emoji-Icons) für Lebensmittel, Mahlzeit-Karten mit Makros, Wochenleiste oben (eigener Sigma-Stil, nicht Fitia nachgebaut)
- [x] Wasser mit einem Tipp auf der Startseite (Gläser)
- [x] Hinweis bei fehlenden Nährstoffen (Vergleich mit DGE-Referenzwerten, nur wenn genug Daten da sind)
- [x] Eiweiß pro Mahlzeit (Ziel ≈ 0,4 g/kg pro Mahlzeit)
- [ ] Offline auch für Suche/Barcode (bräuchte eine lokale Lebensmittel-Datenbank auf dem Handy)
- [ ] Echte Fotos statt Emoji für eigene Rezepte (Foto beim Rezept speichern)
- [ ] Verbrauch automatisch lernen: aus Gewichtstrend und Essen den echten Verbrauch schätzen („adaptives TDEE“, siehe unten)

## Kommerzialisierung / für andere Leute

- [ ] **Supplement-Empfehlungen mit Affiliate-Links (Idee Leo, 2026-11-21):** Sigma erkennt aus den Ernährungsdaten, welche Nährstoffe dauerhaft fehlen (z. B. Vitamin D im Winter, Omega 3 ohne Fisch, Magnesium), und schlägt passende Supplemente vor, mit Affiliate-Codes (Sigma verdient mit). Voraussetzungen: genug Tage mit Mikronährstoff-Daten (Abdeckung anzeigen), Referenzwerte (DGE/EFSA), vorsichtige Formulierung (keine Heilversprechen, Hinweis „kein Ersatz für ärztlichen Rat“), Affiliate-Links klar als Werbung kennzeichnen (Pflicht in DE/AT), Höchstmengen beachten (z. B. Vitamin D, Zink).
- [ ] **Für andere Leute nutzbar machen.** Stand 2026-11-21: Die Grundlage ist da. Jede Tabelle hat eine Nutzer-ID und Row Level Security (jeder sieht nur seine Daten, mit Tests abgesichert), Login per E-Mail-Link, Deutsch/Englisch, Claude-Zugang pro Nutzer mit eigenem Token. Was für echte Fremdnutzer noch fehlt:
  - Registrierung öffnen + Onboarding (Ziel, Größe, Gewicht in 3 Schritten)
  - Datenschutzerklärung, Impressum, AGB, Daten-Export und Konto löschen (DSGVO)
  - Garmin-Abgleich ist inoffiziell und läuft über ein Skript am PC: für andere Nutzer offiziell über Strava oder die Garmin-Developer-API (nur für Firmen)
  - Gemeinsamer Produkt-Cache für Barcodes (heute speichert jeder Nutzer seine eigene Kopie)
  - Vercel Pro + Supabase Pro (Hobby/Free sind nicht für kommerzielle Nutzung bzw. haben Limits), Fehler-Monitoring, Backups
  - Bezahlmodell (z. B. Abo über Stripe), falls nicht nur über Affiliate verdient wird

## Ideen von Claude

- Tatsächlichen Kalorienverbrauch aus Gewichtstrend + gegessenen Kalorien berechnen („adaptives TDEE“) und das Ziel automatisch nachjustieren
- Wöchentlicher Check-in: Gewichtstrend vs. Ziel der Phase (z. B. Diät: −0,5 bis −1 % Körpergewicht pro Woche)
- [x] Mikronährstoff-Ampel gegen Referenzwerte (DGE), mit Hinweis welche Lebensmittel fehlen (2026-11-22: Nährstoff-Hinweise)
- Körpermaße (Taille, Brust, Arme, Oberschenkel) mit Verlauf
- Foto-Erinnerung (z. B. jeden Sonntag morgens, gleiche Pose)
- Portionsgrößen pro Lebensmittel merken („meine Portion Haferflocken = 80 g“)
- Mahlzeiten-Vorlagen (z. B. „Frühstück Standard“ mit einem Tipp eintragen)
- [x] Proteinverteilung über den Tag anzeigen (2026-11-22)
- [x] Offline-Modus (Einträge zwischenspeichern, später synchronisieren) (2026-11-22, für Schnell-Einträge)
- Export als CSV
- Heller Modus
- [x] Trainingsplan-Empfehlungen (progressive Überlastung: wann Gewicht erhöhen)
- Cardio-Zonen aus Garmin-Herzfrequenz
- Schlaf vs. Trainingsleistung vs. Kalorien in der Analyse vergleichen
- Pausen-Timer zwischen Sätzen
- [~] Garmin-Kalorienverbrauch (aktive kcal) nutzen, um das Kalorienziel an Trainingstagen anzupassen (2026-11-22: aktive kcal fließen in den Tagesverbrauch; Ziel passt sich noch nicht automatisch an)
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
