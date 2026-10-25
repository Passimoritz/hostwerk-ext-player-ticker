![Players](banner.svg)

# Players

**English** · [Deutsch](README.de.md)

Official [Hostwerk](https://github.com/Passimoritz/hostwerk-public) extension (runs sandboxed, needs Hostwerk with SDK 3.8)

Who is on your Minecraft and game servers right now and who plays the most: a live list with heads, TPS and joins and leaves, plus the leaderboard with playtime, mined blocks, deaths and more. Nice for streams and Discord screens, with a dashboard tile.

> **Since 2.0 this also contains the former extension “Player leaderboard”.** Anyone who had it installed gets this
> extension automatically: Hostwerk takes over the daily snapshots, playtime on game servers, settings and published web
> pages and removes the old one. Old OBS addresses (`/v/player-leaderboard/…`) are forwarded by Hostwerk.

![View](docs/player-ticker-en-dark.png)

## What it does

- **Where:** Minecraft server → Players (two sections: “Online now” and “Leaderboard”, each can be switched off in the settings) and the dashboard tile – no own sidebar entry; the full page with all servers stays under Extensions → Open
- **Tabs of the page:** Live · Joins and leaves · Leaderboard · Stream view · Web page

### Who is online

- Live player list with heads – updates as soon as someone joins or leaves; **player search**, **today’s peak** per server
- Heads are drawn from the name itself (works offline, no player name leaves the computer); real skin heads from mc-heads.net only if you switch it on in the settings – if the service does not answer, the drawn head appears
- “Joins and leaves” with the time, **filtered by server** – Hostwerk also knows who left in the last 24 hours while the page was closed
- Game servers from the “Game servers” extension next to Minecraft – players through the Steam query; Bedrock players (Geyser/Floodgate) get a badge
- TPS per server, stopped servers optional, a playtime ranking (top 3/5/10) on every card, pin your favourite server to the top

### Leaderboard

- Ranking by playtime, visits, mined blocks, deaths, mobs and players killed, distance or crafted items
- Periods: all time, last 30 days, last 7 days – the extension remembers the state once a day (in its own storage, at most 40 days)
- All servers together or one server; a person is recognised by their UUID – also after a name change
- **Profile card** with every value, last visit, servers, **badges** (regular, miner, hunter, wanderer, crafter, survivor … in three levels, only from what Minecraft and Hostwerk count anyway) and a **history chart**
- Game servers: playtime and visits, counted every minute through the Steam query

### Stream and web page

- Tab “Stream view”: transparent, large text – for window capture in OBS
- Own addresses for OBS without login, as a “browser” source – each only once you share it in the settings:
  - **Who is online:** `/v/player-ticker/` – shows only player and server names. Options: `?theme=light`, `?size=20` (font size), `?servers=1` (server names), `?count=0` (no counter), `?server=<id>`, `?lang=de`
  - **Leaderboard:** `/v/player-ticker/board-obs.html` – options: `?metric=`, `?days=7|30`, `?server=`, `?limit=`, `?theme=light`, `?size=`, `?title=0`, `?lang=de`
- **Publish as a web page** (tab “Web page”): Hostwerk puts “Who is online?” or the leaderboard as an own page (HTML + JSON) into a subfolder of one of your web servers and renews it at the chosen interval – heading, accent colour, light/dark/like the system, language, server and **player names as in the game, shortened or hidden**. No addresses or IDs; visitors need no Hostwerk login. Web servers list these pages under “Pages of extensions”.

### Also

- Tile “Players”: how many are online, their heads and the servers – below it the top three of the leaderboard (can be switched off)
- Error state with “Try again”; requests pause while the page is not visible; statistics cached per server
- German and English, light and dark; other extensions may add tabs

## Install

In Hostwerk: **Apps → Extensions → Marketplace → Players → Install** (badge *Official*).
Or by hand: download `player-ticker-<version>.zip` from the [latest release](../../releases/latest) → *Apps → Extensions → File*.

## Permissions

- `read:services`, `read:minecraft` – see servers, players and statistics
- `read:games` – game servers and their players (“Game servers” extension)
- `share:view` – the public views for OBS (off until you share them)
- `native` – a small server part for the public views, the web pages and the playtime on game servers (only names and numbers)
- `storage` – remember the pinned server, joins and leaves, daily snapshots and playtime on game servers

The page runs sandboxed in Hostwerk – no access to logins, settings or files.

## Develop

This repository is also an example for the [Hostwerk extension SDK](https://github.com/Passimoritz/hostwerk-public/blob/main/sdk/README.md): design kit, translations, settings, storage, events, checks and releases – and since 2.0 for merging two extensions (`"replaces"`, SDK 3.8).

```bash
node --test tests/*.test.js
```

## License

MIT
