![Player Ticker](banner.svg)

# Player Ticker

**English** · [Deutsch](README.de.md)

Who is on your Minecraft and game servers right now? A live list with player heads, TPS and a playtime ranking – great for streams and Discord screens. Includes a dashboard tile.

| Dark | Light |
|---|---|
| ![dark](docs/player-ticker-en-dark.png) | ![light](docs/player-ticker-en-light.png) |

## Features

- **Where:** Minecraft server → Players (section) and the dashboard tile – no own sidebar entry since 1.5.1; the full page stays under Extensions → Open
- **Right where you need it:** a section in the “Players” tab of every Minecraft server (Hostwerk with SDK 3.2) – who is on that server, today’s peak and the latest joins and leaves, without its own tab
- **Player search**, **today’s peak** per server, joins and leaves **filtered by server**
- **Provide as a web page** (tab “Web page”, Hostwerk with SDK 3.2): Hostwerk writes an own “Who is online?” page (HTML + JSON) into a subfolder of one of your web servers and renews it at the chosen interval – heading, accent colour, light/dark/system, language, all or one server, stopped servers yes/no and **player names as in the game, shortened or only numbers**. No addresses or IDs; no Hostwerk sign-in needed for visitors. Web servers show these pages under “Pages from extensions”.
- Live player list with heads, updates the moment someone joins or leaves
- Heads are drawn locally from the name (works offline, no player name leaves your computer); real skin heads from mc-heads.net only if you switch it on in the settings – if that service does not answer, the local head shows instead
- “Joins and leaves” tab with the time of day – Hostwerk also knows who left in the last 24 hours while the page was closed
- “Stream view” tab: transparent, large text – for OBS window capture
- Own address for OBS without sign-in (`/v/player-ticker/`): transparent, without Hostwerk around it, for a “Browser” source – only after you switch on “Share the stream view without sign-in”; shows only player and server names. Options: `?theme=light`, `?size=20` (font size), `?servers=1` (server names), `?count=0` (no counter), `?server=<id>`, `?lang=de`
- Game servers from the extension “Game servers” next to Minecraft – players through the Steam query
- Bedrock players (Geyser/Floodgate) get a badge
- TPS per server, stopped servers optional
- Playtime ranking (top 3/5/10, configurable) – fetched at most once a minute, not on every refresh
- Pin your favourite server to the top (kept across restarts)
- Dashboard tile “Players online” with an error state and “Try again”
- Polling pauses while the page is hidden; sits in the sidebar under “Servers” right next to Minecraft; other extensions may add tabs
- German and English, light and dark mode

## Install

In Hostwerk (3.0 or newer): **Apps → Extensions → Marketplace → Player Ticker → Install** (badge *Official*).
Or manually: download `player-ticker-<version>.zip` from the [latest release](../../releases/latest) → *Apps → Extensions → File*.

## Permissions

- `read:services`, `read:minecraft` – see servers and players
- `read:games` – game servers and their players (extension “Game servers”)
- `share:view` – the public view for OBS (`/v/player-ticker/`, off until you share it)
- `native` – a small server part that answers the public view (only names and numbers)
- `storage` – remember the pinned server and the joins and leaves

The page runs sandboxed in Hostwerk – no access to logins, settings or files.

## Build your own

This repository is also an example for the [Hostwerk extension SDK](https://github.com/Passimoritz/hostwerk-public/blob/main/sdk/README.md): design kit, translations, settings, storage, events, check and releases.

License: MIT
