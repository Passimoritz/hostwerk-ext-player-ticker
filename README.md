![Player Ticker](banner.svg)

# Player Ticker

**English** · [Deutsch](README.de.md)

Who is on your Minecraft servers right now? A live list with player heads, TPS and a playtime ranking – great for streams and Discord screens. Includes a dashboard tile.

| Dark | Light |
|---|---|
| ![dark](docs/player-ticker-en-dark.png) | ![light](docs/player-ticker-en-light.png) |

## Features

- Live player list with heads, updates the moment someone joins or leaves
- Heads are drawn locally from the name (works offline, no player name leaves your computer); real skin heads from mc-heads.net only if you switch it on in the settings – if that service does not answer, the local head shows instead
- “Joins and leaves” tab with the time of day – Hostwerk also knows who left in the last 24 hours while the page was closed
- “Stream view” tab: transparent, large text – for OBS window capture
- Bedrock players (Geyser/Floodgate) get a badge
- TPS per server, stopped servers optional
- Playtime ranking (top 3/5/10, configurable) – fetched at most once a minute, not on every refresh
- Pin your favourite server to the top (kept across restarts)
- Dashboard tile “Players online” with an error state and “Try again”
- Polling pauses while the page is hidden; sits in the sidebar under “Servers” right next to Minecraft; other extensions may add tabs
- German and English, light and dark mode

## Install

In Hostwerk (2.11 or newer): **Apps → Extensions → Marketplace → Player Ticker → Install** (badge *Official*).
Or manually: download `player-ticker-<version>.zip` from the [latest release](../../releases/latest) → *Apps → Extensions → File*.

## Permissions

- `read:services`, `read:minecraft` – see servers and players
- `storage` – remember the pinned server and the joins and leaves

Runs sandboxed in Hostwerk – no access to logins, settings or files.

## Build your own

This repository is also an example for the [Hostwerk extension SDK](https://github.com/Passimoritz/hostwerk-public/blob/main/sdk/README.md): design kit, translations, settings, storage, events, check and releases.

License: MIT
