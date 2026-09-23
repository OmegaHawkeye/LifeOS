# 0.13.8

- Geschützte Passkey-API-Aufrufe liefern bei fehlender Sitzung korrekt JSON statt eines 500-Fehlers.

# 0.13.7

- Die Passkey-Verwaltungsseite wird im lokalen HTTPS-Proxy korrekt als React-SPA ausgeliefert.

# 0.13.6

- Mobile-Passkey-Login startet die WebAuthn-Abfrage nach der sicheren Vorbereitung automatisch.
- Der manuelle Passkey-Button bleibt als Fallback verfügbar.

# 0.13.5

- Der native Splash Screen blockiert die iOS-App nicht mehr nach dem Bundle-Start.
- Die Mobile-Root-Ansicht verwendet wieder eine stabile native Flex-Größe.

# 0.13.4

- Der native iOS-Dev-Client lädt das Mobile-Bundle zuverlässig über Expo Metro.
- Lange weiße Startansichten auf iOS wurden behoben.

# 0.13.3

- Mobile-Ansichten kollabieren auf kleinen Displays nicht mehr auf eine leere Fläche.
- Der native Splash Screen bleibt bis zum Abschluss der Session-Wiederherstellung sichtbar.

# 0.13.2

- Tailscale-MagicDNS-Hosts werden jetzt für lokale HTTPS-Entwicklung akzeptiert.

# 0.13.1

- Der lokale Vite-Server akzeptiert jetzt Bonjour-Hosts für HTTPS-Tests.

# 0.13.0

- Lokales HTTPS-Setup für WebAuthn- und Passkey-Tests dokumentiert.
- Caddy-Entwicklungsproxy für Mac und iPhone ergänzt.

# 0.12.0

- Passkey-Anmeldung kann pro Konto aktiviert oder deaktiviert werden.
- LifeOS zeigt die konfigurierte WebAuthn-URL und warnt bei fehlendem HTTPS.
- Self-hosted HTTPS- und Passkey-Anforderungen sind dokumentiert.

# 0.11.0

- Passkeys funktionieren in Web und iOS mit Apple, 1Password und kompatiblen Passwortmanagern.

# 0.10.0

- Die iOS-App unterstützt die sichere Einrichtung, Bestätigung und Verwaltung von Zwei-Faktor-Authentifizierung.

# 0.9.0

- Die native Nutrition-Ansicht zeigt Mahlzeiten und Tagesziele und kann Mahlzeiten direkt erfassen.

# 0.8.0

- Die native Finance-Ansicht erstellt Konten und speichert Einnahmen sowie Ausgaben mit Monatsübersicht.

# 0.7.0

- Web- und Mobile-Navigation zeigen jetzt passende, einheitliche Icons.

# 0.6.0

- Die Fitness-App zeigt Trainings- und Körperfortschritt und speichert neue Messwerte auf dem LifeOS-Server.

# 0.5.0

- Das Today-Dashboard zeigt tägliche Finance-, Fitness-, Nutrition- und Routine-Zusammenfassungen.
- Web und Mobile teilen UI-Bausteine und Tailwind-Design-Tokens.

# 0.4.1

- Der mobile Login fragt den Authenticator-Code erst nach erfolgreicher Passwortprüfung ab.

# 0.4.0

- Ausgewählte Apple-Health-Daten lassen sich jetzt privat aus der iOS-App mit dem LifeOS-Server synchronisieren.

# 0.3.0

- Verschlüsselte lokale Backups laufen automatisch und lassen sich wiederherstellen.
- Mobile Sitzungen nutzen kurzlebige Zugriffstoken und rotierende, widerrufbare Refresh-Tokens.
- Die iPhone- und iPad-App bietet sichere Anmeldung und native Navigation.

# 0.2.0

- LifeOS-Daten können nun als ZIP-Archiv exportiert werden.
- Das Konto und persönliche Daten lassen sich mit Passwort- und E-Mail-Bestätigung dauerhaft löschen.
- Vermögenswerte können erfasst und in einer Nettovermögensübersicht verfolgt werden.

# 0.1.0

- Modulgrenzen-Fehler zwischen Fitness, Nutrition und Foundation wurden behoben.
