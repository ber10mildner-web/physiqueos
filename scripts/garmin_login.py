"""
Einmalige Garmin-Anmeldung für Sigma (auf deinem eigenen Computer ausführen).

    pip install garminconnect
    python garmin_login.py

Dein Passwort wird nur an Garmin geschickt und nirgends gespeichert.
Am Ende wird ein Schlüssel (JSON) angezeigt. Den kopierst du in der App unter
Profil -> Garmin verbinden. Behandle ihn wie ein Passwort.
"""
import getpass
import json

from garminconnect import Garmin

email = input("Garmin E-Mail: ").strip()
password = getpass.getpass("Garmin Passwort (wird nicht angezeigt): ")
garmin = Garmin(email, password, prompt_mfa=lambda: input("Bestätigungscode von Garmin: ").strip())
garmin.login()
tokens = json.loads(garmin.client.dumps())
if not tokens.get("di_refresh_token"):
    raise SystemExit("Anmeldung ok, aber Garmin hat keinen Erneuerungs-Schlüssel geliefert. Bitte Claude Bescheid sagen.")
print("\nFertig. Kopiere die folgende Zeile komplett in die App:\n")
print(json.dumps(tokens))
