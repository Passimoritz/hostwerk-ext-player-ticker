![Spieler](banner.svg)

# Spieler

[English](README.md) · **Deutsch**

Offizielle [Hostwerk](https://github.com/Passimoritz/hostwerk-public)-Erweiterung (läuft abgeschottet, ab Hostwerk mit SDK 3.8)

Wer gerade auf deinen Minecraft- und Spiele-Servern ist und wer am meisten spielt: Live-Liste mit Köpfen, TPS und Kommen und Gehen, dazu die Bestenliste mit Spielzeit, Abgebautem, Toden und mehr. Schön für Streams und Discord-Bildschirme, mit Kachel für die Übersicht.

> **Seit 2.0 steckt hier auch die frühere Erweiterung „Spieler-Bestenliste“.** Wer sie installiert hatte, bekommt diese
> Erweiterung automatisch: Hostwerk übernimmt Tages-Schnappschüsse, Spielzeit auf Spiele-Servern, Einstellungen und
> veröffentlichte Webseiten und entfernt die alte. Alte OBS-Adressen (`/v/player-leaderboard/…`) leitet Hostwerk weiter.

![Ansicht](docs/player-ticker-de-dark.png)

## Was sie kann

- **Wo:** Minecraft-Server → Spieler (zwei Abschnitte: „Gerade online“ und „Bestenliste“, jeder in den Einstellungen abwählbar) und Übersichtskachel – ohne eigenen Seitenleisten-Eintrag; die ganze Seite mit allen Servern bleibt unter Erweiterungen → Öffnen
- **Reiter der Seite:** Live · Kommen und Gehen · Bestenliste · Stream-Ansicht · Webseite

### Wer ist online

- Live-Spielerliste mit Köpfen – aktualisiert sich, sobald jemand kommt oder geht; **Spielersuche**, **Höchststand heute** je Server
- Köpfe werden aus dem Namen selbst gezeichnet (geht offline, kein Spielername verlässt den Rechner); echte Skin-Köpfe von mc-heads.net nur, wenn du es in den Einstellungen einschaltest – antwortet der Dienst nicht, erscheint der gezeichnete Kopf
- „Kommen und Gehen“ mit Uhrzeit, **nach Server gefiltert** – wer in den letzten 24 Stunden gegangen ist, während die Seite zu war, weiß Hostwerk auch
- Spiele-Server aus der Erweiterung „Spiele-Server“ neben Minecraft – Spieler über die Steam-Abfrage; Bedrock-Spieler (Geyser/Floodgate) bekommen ein Abzeichen
- TPS je Server, gestoppte Server wahlweise, Spielzeit-Rangliste (Top 3/5/10) auf jeder Karte, Lieblingsserver oben anheften

### Bestenliste

- Rangliste nach Spielzeit, Besuchen, abgebauten Blöcken, Toden, besiegten Monstern und Spielern, Strecke oder Hergestelltem
- Zeiträume: gesamt, letzte 30 Tage, letzte 7 Tage – die Erweiterung merkt sich einmal am Tag den Stand (im eigenen Speicher, höchstens 40 Tage)
- Alle Server zusammen oder ein Server; eine Person wird über ihre UUID erkannt – auch nach einem Namenswechsel
- **Profilkarte** mit allen Werten, letztem Besuch, Servern, **Abzeichen** (Stammspieler, Bergarbeiter, Jäger, Wanderer, Handwerker, Überlebenskünstler … in drei Stufen, nur aus dem, was Minecraft und Hostwerk ohnehin zählen) und einem **Verlaufsdiagramm**
- Spiele-Server: Spielzeit und Besuche, jede Minute über die Steam-Abfrage gezählt

### Stream und Webseite

- Reiter „Stream-Ansicht“: durchsichtig, große Schrift – für die Fensteraufnahme in OBS
- Eigene Adressen für OBS ohne Anmeldung, als „Browser“-Quelle – jede erst, wenn du sie in den Einstellungen freigibst:
  - **Wer ist online:** `/v/player-ticker/` – zeigt nur Spieler- und Servernamen. Zusätze: `?theme=light`, `?size=20` (Schriftgröße), `?servers=1` (Servernamen), `?count=0` (ohne Zähler), `?server=<id>`, `?lang=de`
  - **Bestenliste:** `/v/player-ticker/board-obs.html` – Zusätze: `?metric=`, `?days=7|30`, `?server=`, `?limit=`, `?theme=light`, `?size=`, `?title=0`, `?lang=de`
- **Als Webseite bereitstellen** (Reiter „Webseite“): Hostwerk legt „Wer ist online?“ oder die Bestenliste als eigene Seite (HTML + JSON) in einen Unterordner eines deiner Webserver und erneuert sie im gewählten Takt – Überschrift, Akzentfarbe, hell/dunkel/wie das System, Sprache, Server und **Spielernamen wie im Spiel, gekürzt oder ausgeblendet**. Keine Adressen oder IDs; Besucher brauchen keine Hostwerk-Anmeldung. Webserver zeigen diese Seiten unter „Seiten von Erweiterungen“.

### Sonst

- Kachel „Spieler“: wie viele online sind, ihre Köpfe und die Server – darunter die drei Ersten der Bestenliste (abschaltbar)
- Fehlerzustand mit „Erneut versuchen“; Abfragen pausieren, solange die Seite nicht zu sehen ist; Statistiken je Server zwischengespeichert
- Deutsch und Englisch, hell und dunkel; andere Erweiterungen dürfen Reiter ergänzen

## Installieren

In Hostwerk: **Apps → Erweiterungen → Marktplatz → Spieler → Installieren** (Abzeichen *Offiziell*).
Oder von Hand: `player-ticker-<version>.zip` aus dem [neuesten Release](../../releases/latest) laden → *Apps → Erweiterungen → Datei*.

## Rechte

- `read:services`, `read:minecraft` – Server, Spieler und Statistiken sehen
- `read:games` – Spiele-Server und ihre Spieler (Erweiterung „Spiele-Server“)
- `share:view` – die öffentlichen Ansichten für OBS (aus, bis du sie freigibst)
- `native` – ein kleiner Server-Teil für die öffentlichen Ansichten, die Webseiten und die Spielzeit auf Spiele-Servern (nur Namen und Zahlen)
- `storage` – angehefteten Server, Kommen und Gehen, Tages-Schnappschüsse und Spielzeit auf Spiele-Servern merken

Die Seite läuft in Hostwerk abgeschottet – kein Zugriff auf Anmeldungen, Einstellungen oder Dateien.

## Entwickeln

Dieses Repository ist auch ein Beispiel für das [Hostwerk-Erweiterungs-SDK](https://github.com/Passimoritz/hostwerk-public/blob/main/sdk/README.de.md): Design-Baukasten, Übersetzungen, Einstellungen, Speicher, Ereignisse, Prüfung und Releases – und seit 2.0 für das Zusammenlegen zweier Erweiterungen (`"replaces"`, SDK 3.8).

```bash
node --test tests/*.test.js
```

## Lizenz

MIT
