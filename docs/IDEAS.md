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
- [x] Mahlzeit per Foto in der App: Foto, optional Rezept und Abweichungen, Gewicht; KI erkennt nur Zutaten, Werte aus der Sigma-Datenbank, Wasserverlust-Aufschlag, Kostendeckel pro Person
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
- [x] Feedback 2026-11-22 Mittag: Essen für morgen und die nächsten 14 Tage eintragen, nach links wischen zum Löschen, bessere Lebensmittel-Bilder (lieber Anfangsbuchstabe als falsches Bild), jede Mahlzeit mit eigener Farbe, Favoriten-Leiste bei vollen Mahlzeiten eingeklappt
- [x] Tipp aufs Lebensmittel-Bild im Tagebuch: kurze Nährstoff-Übersicht (kcal, Makros, Ballaststoffe mit % vom Tagesbedarf, Zucker, die 4 größten Vitamine/Mineralstoffe; „unbekannt“ statt 0) (Idee Leo, 2026-11-23)
- [ ] Dieselbe Übersicht auch in der Suche, bei Favoriten und Rezept-Zutaten
- [x] Feedback 2026-11-25: Makro/Nährstoff antippen → welche Lebensmittel heute am meisten davon brachten; Vitamine/Mineralstoffe als erreichte Menge („62 / 110 mg“) statt „12 von 15“; feste Mahlzeiten an Wochentagen (Pin an der Mahlzeit); Bilder-Check (Heidelbeeren, Grapefruit, Weißkohl, Rucola, Knoblauch u. a. korrigiert); Leitspruch beim Öffnen („Fett weg. Muskeln bleiben.“); Wassertracking nur noch optional in den Einstellungen
- [ ] Offline auch für Suche/Barcode (bräuchte eine lokale Lebensmittel-Datenbank auf dem Handy)
- [ ] Echte Fotos statt Emoji für eigene Rezepte (Foto beim Rezept speichern)
- [x] Verbrauch automatisch lernen: aus Gewichtstrend und Essen den echten Verbrauch schätzen („adaptives TDEE“, siehe unten) (2026-11-23: Kalorien-Check)

## Ideen-Runde 2026-11-23 (alle von Leo freigegeben)

- [x] Gewichtstrend als Linie durch alle Wiegungen der letzten 4 Wochen, Zielgewicht + Wunschtempo, Prognose „Ziel ca. am …“ (gestrichelt im Diagramm)
- [x] Kalorien-Check: echter Verbrauch aus Essen und Gewichtstrend, Vorschlag für ein neues Kalorienziel (max. 400 kcal pro Schritt, mit einem Tipp übernehmen)
- [x] Progressive Overload: „Heute 82,5 kg × 8 probieren“, eine Wdh. mehr, leichter bei zu schwer, Deload nach 3 Einheiten ohne Fortschritt, Übernehmen-Knopf
- [x] Vorher/Nachher: erstes und neuestes Foto automatisch, nebeneinander oder überblenden, Gewicht dazu; Kamera mit eingeblendetem letztem Foto (gleiche Pose) und Selbstauslöser
- [x] Nährstofflücken mit konkreten Mengen („25 g Kürbiskerne, +148 mg Magnesium“), Werte aus der Datenbank, direkt eintragen
- [ ] Wochentage im Kalorien-Check getrennt lernen (z. B. Cardio-Tage)
- [ ] Pose-Kamera: Erinnerung jeden Sonntag

## Ideen-Runde 2026-11-24 (Leo + Claude)

- [x] Ziel statt nur Zielgewicht: „Fett verlieren, Muskeln halten“, Recomp, Muskeln aufbauen, Halten; Trainingsstand; eigene Situation als Freitext (liest Claude mit). Kalorien und Eiweiß richten sich danach (Fettverlust ≈ 0,5 % Körpergewicht pro Woche, 2,2 g Eiweiß pro kg)
- [x] Taillenumfang als zweite Messgröße (zeigt Fettverlust ehrlicher als die Waage)
- [x] Wochen-Check-in am Sonntag: Gewichtstrend gegen geplantes Tempo, Taille, Kraft (bestes geschätztes 1RM, letzte 2 gegen die 4 Wochen davor), Eiweiß, Foto, mit Gesamturteil und Kalorien-Vorschlag
- [ ] Rezeptbereich mit Filtern („viel Eiweiß“, „Ballaststoffe“, „gut für die Haut“ mit Zink, Vitamin A/C, Omega-3 und kurzer Erklärung warum); Bioverfügbarkeit nur grob (z. B. tierisches vs. pflanzliches Eisen)
- [ ] **Andere Wearables (geparkt bis zur Store-App):** Apple Health (iPhone) bzw. Health Connect (Android) als Sammelstelle, dann geht fast jede Uhr (Garmin, Polar, Fitbit, Whoop, Oura …). Braucht eine native App-Hülle (z. B. Capacitor), weil eine reine Web-App nicht an Apple Health/Health Connect kommt. Schon jetzt ohne native App möglich: Strava (offizielle API, Aktivitäten von fast allen Uhren)
- [ ] Weitere Körpermaße (Brust, Arme, Oberschenkel) neben der Taille
- [ ] Kraft-Check im Defizit auch pro Übung anzeigen (welche Übung nachlässt)
- [x] Nährwerttabelle abfotografieren, nur als Ausweg: wenn der Barcode nichts findet oder es keinen gibt (z. B. Bäckerbrot). Werte landen im Formular zum Prüfen
- [x] Zwischenspeicher für Open Food Facts: zweiter Versuch, frühere Treffer aus dem Speicher, wenn OFF nicht antwortet
- [ ] „Wie gestern“: gibt es schon (Mahlzeit bzw. ganzen Tag von gestern kopieren)
- [ ] Pausen-Timer und Aufwärmsätze: von Leo abgelehnt (unnötig)

## Kommerzialisierung / für andere Leute

- [ ] **Supplement-Empfehlungen mit Affiliate-Links (Idee Leo, 2026-11-21):** Sigma erkennt aus den Ernährungsdaten, welche Nährstoffe dauerhaft fehlen (z. B. Vitamin D im Winter, Omega 3 ohne Fisch, Magnesium), und schlägt passende Supplemente vor, mit Affiliate-Codes (Sigma verdient mit). Voraussetzungen: genug Tage mit Mikronährstoff-Daten (Abdeckung anzeigen), Referenzwerte (DGE/EFSA), vorsichtige Formulierung (keine Heilversprechen, Hinweis „kein Ersatz für ärztlichen Rat“), Affiliate-Links klar als Werbung kennzeichnen (Pflicht in DE/AT), Höchstmengen beachten (z. B. Vitamin D, Zink).
- [ ] **Für andere Leute nutzbar machen.** Stand 2026-11-21: Die Grundlage ist da. Jede Tabelle hat eine Nutzer-ID und Row Level Security (jeder sieht nur seine Daten, mit Tests abgesichert), Login per E-Mail-Link, Deutsch/Englisch, Claude-Zugang pro Nutzer mit eigenem Token. Was für echte Fremdnutzer noch fehlt:
  - **Vor dem Launch ausmisten (Leo, 2026-11-24):** Was Leo selbst ein paar Wochen nicht benutzt, fliegt raus oder wandert in die Einstellungen; doppelte Funktionen zusammenlegen. Neue Nutzer sehen am Anfang nur Essen, Gewicht und Training, der Rest kommt nach und nach dazu
  - Registrierung öffnen + Onboarding (Ziel, Größe, Gewicht in 3 Schritten)
  - Datenschutzerklärung, Impressum, AGB, Daten-Export und Konto löschen (DSGVO)
  - Garmin-Abgleich ist inoffiziell und läuft über ein Skript am PC: für andere Nutzer offiziell über Strava oder die Garmin-Developer-API (nur für Firmen)
  - Gemeinsamer Produkt-Cache für Barcodes (seit 2026-11-24 gibt es einen geteilten Open-Food-Facts-Speicher; eigene Lebensmittel bleiben pro Nutzer)
  - Vercel Pro + Supabase Pro (Hobby/Free sind nicht für kommerzielle Nutzung bzw. haben Limits), Fehler-Monitoring, Backups
  - Bezahlmodell (z. B. Abo über Stripe), falls nicht nur über Affiliate verdient wird
- [ ] **ChatGPT als kritischer Zweitprüfer (Idee Leo, 2026-11-24, geparkt bis Werbung/Launch):** ChatGPT baut keinen Code, sondern prüft kritisch gegen. Claude macht Audits im Code mit echten Belegen, Leo gibt die Ergebnisse an ChatGPT weiter (Leo ist der Bote, keine direkte Verbindung möglich). ChatGPT hatte schon berechtigte Punkte: Garmins private API ist nicht für kommerzielle Nutzung, Datenschutz bei Gesundheitsdaten, Aktivitätskalorien doppelt gezählt. Einführen, wenn Werbung bzw. Launch startet.

## Ideen von Claude

- [x] Tatsächlichen Kalorienverbrauch aus Gewichtstrend + gegessenen Kalorien berechnen („adaptives TDEE“) und das Ziel nachjustieren (2026-11-23: Vorschlag, du bestätigst)
- [x] Wöchentlicher Check-in: Gewichtstrend vs. Ziel der Phase (z. B. Diät: −0,5 bis −1 % Körpergewicht pro Woche)
- [x] Mikronährstoff-Ampel gegen Referenzwerte (DGE), mit Hinweis welche Lebensmittel fehlen (2026-11-22: Nährstoff-Hinweise)
- [~] Körpermaße (Taille, Brust, Arme, Oberschenkel) mit Verlauf (2026-11-24: Taille)
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

## Rezepte & Wearables (2026-11-24)

- [x] Rezeptbereich mit Filtern (Viel Protein, Ballaststoffe, unter 500 kcal, gut für die Haut, Eisen gut verwertbar, Omega-3, Calcium, Vitamin D, vegetarisch/vegan, „Passt zu deinen Lücken“) mit kurzer Erklärung und „Gut zu wissen“ zur Aufnahme (Bioverfügbarkeit nur als grobe Faustregel); 19 Rezeptideen mit USDA-Werten zum Übernehmen
- [ ] Mehr Rezeptideen (z. B. Leos Lieblingsgerichte, Thermomix-Klassiker) und weitere Filter (z. B. „gut für den Schlaf“, „vor dem Training“)
- [ ] Andere Wearables neben Garmin (Polar, Fitbit, Whoop, Apple Watch …): am besten über Apple Health bzw. Health Connect (Android). Braucht eine native App-Hülle, eine reine Web-App kommt da nicht ran. Strava ginge schon jetzt direkt. Angehen, wenn Sigma in den App Store soll.
