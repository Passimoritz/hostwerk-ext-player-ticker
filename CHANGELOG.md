## 1.5.1

- Lives where it belongs: Minecraft server → Players (section) and the dashboard tile – no own sidebar entry any more (Hostwerk 3.0+); the full page stays under Extensions → Open and can be pinned in the sidebar settings. / Steckt jetzt dort, wo sie hingehört: Minecraft-Server → Spieler (Abschnitt) und Übersichtskachel – kein eigener Seitenleisten-Eintrag mehr (Hostwerk 3.0+); die ganze Seite bleibt unter Erweiterungen → Öffnen und lässt sich in den Seitenleisten-Einstellungen anheften.

## 1.5.0

- Section in the “Players” tab of every Minecraft server (Hostwerk with SDK 3.2): who is on that server, today’s peak, latest joins and leaves. / Abschnitt im Reiter „Spieler“ jedes Minecraft-Servers: wer da ist, Höchststand heute, letztes Kommen und Gehen.
- Player search, today’s peak per server, joins and leaves filtered by server. / Spielersuche, Höchststand heute je Server, Kommen und Gehen nach Server.
- Provide as a web page: “Who is online?” in a subfolder of a web server, renewed at an interval, with player names as in the game, shortened or only numbers (Hostwerk with SDK 3.2, `host.sites`). / Als Webseite bereitstellen – mit Datenschutz-Wahl für Spielernamen.

## 1.4.0

- Game servers too: with the extension “Game servers” its running servers appear next to Minecraft – players through the Steam query (permission `read:games`), in the live list, in joins and leaves, in the stream view and on the tile. / Auch Spiele-Server: Mit der Erweiterung „Spiele-Server“ stehen ihre laufenden Server neben Minecraft – Spieler über die Steam-Abfrage (Recht `read:games`), in der Live-Liste, bei Kommen und Gehen, in der Stream-Ansicht und auf der Kachel.
- Real OBS view: the stream view now has its own address without sign-in (`/v/player-ticker/`, permission `share:view`) – transparent, without Hostwerk around it, for an OBS “Browser” source. Off until you switch on “Share the stream view without sign-in”; it only shows player and server names. Options: `?theme=light`, `?size=20`, `?servers=1`, `?count=0`, `?server=<id>`, `?lang=de`. / Echte OBS-Ansicht: Die Stream-Ansicht hat jetzt eine eigene Adresse ohne Anmeldung (`/v/player-ticker/`, Recht `share:view`) – durchsichtig, ohne Hostwerk drumherum, für eine OBS-„Browser“-Quelle. Aus, bis du „Stream-Ansicht ohne Anmeldung freigeben“ einschaltest; sie zeigt nur Spieler- und Servernamen.
- Needs Hostwerk 3.0 (SDK 3.0). / Braucht Hostwerk 3.0 (SDK 3.0).

## 1.3.0

- Heads no longer come from a third-party service: a small pixel face is drawn from the name (offline, no player name leaves the computer). Real skin heads from mc-heads.net only after switching on the new setting – with the local head as fallback. / Köpfe kommen nicht mehr von einem fremden Dienst: ein kleines Pixel-Gesicht entsteht aus dem Namen (offline, kein Spielername verlässt den Rechner). Echte Skin-Köpfe von mc-heads.net nur nach Einschalten der neuen Einstellung – mit dem gezeichneten Kopf als Ersatz.
- New tab “Joins and leaves” with the time; leaves while the page was closed come from Hostwerk’s “last seen”. / Neuer Reiter „Kommen und Gehen“ mit Uhrzeit; Abgänge, während die Seite zu war, kommen aus Hostwerks „zuletzt gesehen“.
- New tab “Stream view”: transparent, large text, for OBS window capture. / Neuer Reiter „Stream-Ansicht“: durchsichtig, große Schrift, für die Fensteraufnahme in OBS.
- Bedrock players (Geyser/Floodgate) get a badge. / Bedrock-Spieler (Geyser/Floodgate) bekommen ein Abzeichen.
- The ranking stats are fetched at most once a minute per server instead of on every refresh tick; events are bundled. / Die Statistik für die Rangliste wird je Server höchstens einmal pro Minute geholt statt bei jedem Takt; Ereignisse werden gebündelt.
- Pin button with a name and aria-pressed; error state with “Try again” on page and tile. / Anheft-Knopf mit Namen und aria-pressed; Fehlerzustand mit „Erneut versuchen“ auf Seite und Kachel.
- Polling pauses while the page is hidden; numbers in Hostwerk’s language; sizes from the design scale; the page sits next to Minecraft in the sidebar and its settings under Settings → Extensions; other extensions may add tabs. The release packs everything except the repository tooling. Needs Hostwerk 2.11. / Abfragen pausieren bei verstecktem Reiter; Zahlen in Hostwerks Sprache; Größen aus der Design-Skala; die Seite steht in der Seitenleiste bei Minecraft, ihre Einstellungen unter Einstellungen → Erweiterungen; andere Erweiterungen dürfen Reiter ergänzen. Das Release packt alles außer dem Repo-Werkzeug. Braucht Hostwerk 2.11.

## 1.2.0

- New animated icon and a banner for Hostwerk's new extension page, category “games”. / Neues bewegtes Symbol und ein Banner für die neue Erweiterungsseite, Kategorie „games“.

## 1.1.0

- Looks exactly like Hostwerk's own pages: uses Hostwerk's design classes (card, btn, badge …) from the SDK 2.2 design kit; Hostwerk draws the page header. / Sieht aus wie Hostwerks eigene Seiten: Hostwerks Design-Klassen aus dem Baukasten (SDK 2.2), Kopf zeichnet Hostwerk.

## 1.0.1

- Settings button removed from the page (Hostwerk shows it in the header), clearer summary line, reacts to language changes.
- Einstellungen-Knopf aus der Seite entfernt (Hostwerk zeigt ihn oben), klarere Zusammenfassung, reagiert auf Sprachwechsel.

## 1.0.0

- First release for Hostwerk SDK 2: page, dashboard tile, settings, German and English.
- Erste Version für das Hostwerk-SDK 2: Seite, Übersichts-Kachel, Einstellungen, Deutsch und Englisch.
