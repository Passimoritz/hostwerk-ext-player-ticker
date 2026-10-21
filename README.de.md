![Spieler-Ticker](banner.svg)

# Spieler-Ticker

[English](README.md) · **Deutsch**

Wer ist gerade auf deinen Minecraft-Servern? Live-Liste mit Köpfen, TPS und Spielzeit-Rangliste – schön für Streams und Discord-Bildschirme. Mit Kachel für die Übersicht.

![Ansicht](docs/player-ticker-de-dark.png)

## Funktionen

- Live-Spielerliste mit Köpfen – aktualisiert sich, sobald jemand kommt oder geht
- Köpfe werden aus dem Namen selbst gezeichnet (geht offline, kein Spielername verlässt den Rechner); echte Skin-Köpfe von mc-heads.net nur, wenn du es in den Einstellungen einschaltest – antwortet der Dienst nicht, erscheint der gezeichnete Kopf
- Reiter „Kommen und Gehen“ mit Uhrzeit – wer in den letzten 24 Stunden gegangen ist, während die Seite zu war, weiß Hostwerk auch
- Reiter „Stream-Ansicht“: durchsichtig, große Schrift – für die Fensteraufnahme in OBS
- Bedrock-Spieler (Geyser/Floodgate) bekommen ein Abzeichen
- TPS je Server, gestoppte Server wahlweise
- Spielzeit-Rangliste (Top 3/5/10, einstellbar) – höchstens einmal pro Minute geholt, nicht bei jeder Aktualisierung
- Lieblingsserver oben anheften (bleibt gespeichert)
- Kachel „Spieler online“ mit Fehlerzustand und „Erneut versuchen“
- Abfragen pausieren, solange die Seite nicht zu sehen ist; steht in der Seitenleiste unter „Server“ direkt bei Minecraft; andere Erweiterungen dürfen Reiter ergänzen
- Deutsch und Englisch, hell und dunkel

## Installieren

In Hostwerk (ab 2.11): **Apps → Erweiterungen → Marktplatz → Spieler-Ticker → Installieren** (Abzeichen *Offiziell*).
Oder von Hand: `player-ticker-<version>.zip` aus dem [neuesten Release](../../releases/latest) laden → *Apps → Erweiterungen → Datei*.

## Rechte

- `read:services`, `read:minecraft` – Server und Spieler sehen
- `storage` – angehefteten Server und Kommen und Gehen merken

Läuft in Hostwerk abgeschottet – kein Zugriff auf Anmeldungen, Einstellungen oder Dateien.

## Selbst bauen

Dieses Repository ist auch ein Beispiel für das [Hostwerk-Erweiterungs-SDK](https://github.com/Passimoritz/hostwerk-public/blob/main/sdk/README.de.md): Design-Baukasten, Übersetzungen, Einstellungen, Speicher, Ereignisse, Prüfung und Releases.

Lizenz: MIT
