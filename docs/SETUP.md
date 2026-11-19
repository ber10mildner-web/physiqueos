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

Tipp am Handy: Öffne die Datei auf GitHub, tippe auf das Kopier-Symbol („Copy raw file“) und füge sie im SQL Editor ein.

## 3. Schlüssel kopieren

**Project Settings → API Keys** (bzw. **Connect**). Du brauchst:

- die **Project URL** (`https://xxxx.supabase.co`)
- den **Publishable key** (`sb_publishable_…`)

Den *secret key* brauchst du nicht und solltest ihn nirgends eintragen.

## 4. App auf Vercel veröffentlichen

1. Öffne <https://vercel.com/new> und melde dich mit **Continue with GitHub** an.
2. Beim Repository `physiqueos` auf **Import** tippen. Falls es nicht auftaucht: **Adjust GitHub App Permissions** und `physiqueos` freigeben.
3. Unter **Environment Variables** eintragen:
   - `NEXT_PUBLIC_SUPABASE_URL` = deine Project URL
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = dein Publishable key
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
