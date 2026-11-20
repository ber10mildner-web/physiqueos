# Einrichtung (ca. 15 Minuten, geht komplett am Handy)

Du brauchst zwei kostenlose Konten: **Supabase** (Datenbank, Login, Fotospeicher) und **Vercel** (Hosting). Beide kannst du mit deinem GitHub-Konto anlegen.

## 1. Supabase-Projekt anlegen

1. Öffne <https://supabase.com/dashboard> und melde dich mit **Continue with GitHub** an.
2. **New project** antippen.
   - Name: `physiqueos`
   - Database password: auf **Generate a password** tippen und das Passwort in deinem Passwort-Manager speichern.
   - Region: **Central EU (Frankfurt)**.
   - **Create new project**. Das dauert etwa 1–2 Minuten.

## 2. Datenbank einrichten

1. Im Projekt links auf **SQL Editor** (Symbol `>_`) und dann **New query**.
2. Den kompletten Inhalt von [`supabase/migrations/20261119000000_init.sql`](../supabase/migrations/20261119000000_init.sql) einfügen und **Run** antippen. Es muss „Success. No rows returned“ erscheinen.
3. Wieder **New query**, den Inhalt von [`supabase/migrations/20261119000100_storage.sql`](../supabase/migrations/20261119000100_storage.sql) einfügen und **Run**.
4. Und noch einmal mit [`supabase/migrations/20261120000000_grants.sql`](../supabase/migrations/20261120000000_grants.sql).
5. Und zuletzt mit [`supabase/migrations/20261120000100_recipes_training_api.sql`](../supabase/migrations/20261120000100_recipes_training_api.sql) (Rezepte, Training, Wasser, Schlaf, Claude-Zugang).
6. Für den Garmin-Abgleich: [`supabase/migrations/20261120000200_garmin.sql`](../supabase/migrations/20261120000200_garmin.sql).

Tipp am Handy: Öffne die Datei auf GitHub, tippe auf das Kopier-Symbol („Copy raw file“) und füge sie im SQL Editor ein.

## 3. Schlüssel kopieren

Am einfachsten über den Button **Connect** oben in der Projektleiste (am Handy evtl. im Menü ☰). Alternativ:

- **Project URL:** Project Settings → **Data API**. Oder selbst zusammensetzen: Die Adresse im Browser sieht so aus `supabase.com/dashboard/project/abcdefgh…`. Der Teil nach `project/` ist deine Projekt-ID, die URL ist dann `https://abcdefgh….supabase.co`.
- **Publishable key:** Project Settings → **API Keys**.

Du brauchst:

- die **Project URL** (`https://xxxx.supabase.co`)
- den **Publishable key** (`sb_publishable_…`)

Für die Claude-Anbindung brauchst du zusätzlich den **Secret key** (`sb_secret_…`, Project Settings → API Keys → Secret keys). Er kommt **nur** in Vercel als `SUPABASE_SECRET_KEY`, niemals in den Browser oder in den Code.

## 4. App auf Vercel veröffentlichen

1. Öffne <https://vercel.com/new> und melde dich mit **Continue with GitHub** an.
2. Beim Repository `physiqueos` auf **Import** tippen. Falls es nicht auftaucht: **Adjust GitHub App Permissions** und `physiqueos` freigeben.
3. Unter **Environment Variables** eintragen:
   - `NEXT_PUBLIC_SUPABASE_URL` = deine Project URL
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = dein Publishable key
   - `SUPABASE_SECRET_KEY` = dein Secret key (nur für die Claude-Anbindung)
   - `CRON_SECRET` = eine lange, zufällige Zeichenkette, die du dir ausdenkst (mind. 32 Zeichen). Damit darf nur Vercel den täglichen Garmin-Abgleich starten.
   - optional `USDA_API_KEY` (siehe unten)
4. **Deploy**. Nach etwa einer Minute bekommst du eine Adresse wie `physiqueos-xyz.vercel.app`.

## 5. Login-Weiterleitung eintragen

Zurück in Supabase: **Authentication → URL Configuration**

- **Site URL:** deine Vercel-Adresse, z. B. `https://physiqueos-xyz.vercel.app`
- **Redirect URLs:** `https://physiqueos-xyz.vercel.app/auth/callback`

## 6. Konto anlegen und App installieren

1. Öffne deine Vercel-Adresse am Handy, tippe auf **Registrieren** und bestätige die E-Mail.
2. **iPhone (Safari):** Teilen-Symbol → **Zum Home-Bildschirm**.
   **Android (Chrome):** Menü ⋮ → **App installieren**.
3. Danach als erstes unter **Profil** deine Daten und dein Ziel eintragen.

**Empfehlung:** Wenn dein Konto steht, in Supabase unter **Authentication → Sign In / Providers → Email** die Option **Allow new users to sign up** ausschalten. Dann kann sich niemand anderes registrieren.

## Optional: USDA-Schlüssel

Ohne eigenen Schlüssel nutzt die App den `DEMO_KEY`, der nur wenige Anfragen pro Stunde erlaubt. Kostenlosen Schlüssel holen: <https://fdc.nal.usda.gov/api-key-signup>, dann in Vercel unter **Settings → Environment Variables** als `USDA_API_KEY` eintragen und neu deployen.

## Claude verbinden

1. In der App: **Profil → Claude verbinden → Verbindung erstellen**. Die angezeigte Adresse kopieren (sie wird nur einmal gezeigt und ist wie ein Passwort).
2. Auf <https://claude.ai>: **Einstellungen → Konnektoren → Eigenen Konnektor hinzufügen**. Name `PhysiqueOS`, als URL die kopierte Adresse.
3. In einem Chat den Konnektor einschalten und z. B. schreiben: „Mach mir eine Wochenauswertung“ oder ein Foto einer Zutatenliste schicken: „Leg daraus ein Rezept an, gekocht 1.150 g“.

Verbindung verloren oder Adresse geteilt? In der App widerrufen und eine neue erstellen.

## Garmin verbinden (Versuch)

Garmin bietet Privatpersonen keine offizielle Schnittstelle. Seit März 2026 blockt Garmin Anmeldungen von Servern, deshalb meldest du dich **einmal auf deinem Computer** an:

1. Python installieren (<https://www.python.org/downloads/>, unter Windows „Add python.exe to PATH“ anhaken).
2. Terminal bzw. Eingabeaufforderung öffnen: `pip install garminconnect`
3. [`scripts/garmin_login.py`](../scripts/garmin_login.py) herunterladen und `python garmin_login.py` ausführen. Garmin-E-Mail, Passwort und ggf. den Bestätigungscode eingeben. Das Passwort geht nur an Garmin und wird nirgends gespeichert.
4. Die ausgegebene Zeile (beginnt mit `{"di_token"`) kopieren, z. B. per Mail an dich selbst, und in der App unter **Profil → Garmin verbinden** einfügen.

Die App erneuert den Schlüssel danach selbst und holt jeden Morgen Schlaf, HRV, Ruhepuls, Body Battery, Schritte, Stress und Cardio-Aktivitäten (Krafttraining nicht, das trägst du in der App ein). Der Schlüssel wird verschlüsselt gespeichert. Wenn die Seite einen Fehler zeigt, Schritte 3 und 4 wiederholen.

## Update auf einen neuen Stand

Wenn eine neue Datei in `supabase/migrations/` dazukommt, führe nur diese im SQL Editor aus (Schritt 2). Vercel aktualisiert die App von selbst, sobald neuer Code auf GitHub liegt.
