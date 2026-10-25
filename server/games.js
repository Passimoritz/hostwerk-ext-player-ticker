'use strict';
/*
 * Spiele-Server in der Bestenliste: Spiele-Server merken sich keine Spielzeit – die Steam-Abfrage (A2S) sagt nur, wer
 * gerade da ist und seit wie vielen Sekunden. Der Server-Teil fragt deshalb jede Minute nach und zählt selbst:
 *   Spielzeit  – Zuwachs der A2S-Sekunden zwischen zwei Abfragen (höchstens die Zeit dazwischen); wer neu auftaucht,
 *                bringt seine bisherigen Sekunden mit (höchstens 12 Stunden)
 *   Besuche    – jedes neue Auftauchen (oder wenn die Sekunden wieder bei null anfangen = neu verbunden)
 * Gespeichert im Speicher der Erweiterung unter "games" – klein gehalten (MAX_BYTES), damit neben den Schnappschüssen
 * der Seite Platz bleibt; zuerst fallen die mit der wenigsten Spielzeit weg.
 *   { v: 1, servers: { <id>: { name, game, players: { <name>: { playMs, sessions, last } } } }, online: { <id>: { <name>: { s, at } } } }
 */
const MAX_BYTES = 40 * 1024;
const MAX_FIRST_MS = 12 * 3600000;

const empty = () => ({ v: 1, servers: {}, online: {} });

/**
 * Eine Abfrage einrechnen. list = /games-players (nur laufende Server) bzw. source.games(): [{ id, name, game, players, seconds }]
 * → neuer Stand (das Original bleibt unverändert)
 */
function track(state, list, now = Date.now()) {
  const st = state && state.v === 1 ? JSON.parse(JSON.stringify(state)) : empty();
  const online = {};
  for (const g of Array.isArray(list) ? list : []) {
    if (!g || !g.id) continue;
    const sv = st.servers[g.id] || (st.servers[g.id] = { name: g.name || g.id, game: g.game || null, players: {} });
    sv.name = g.name || sv.name; sv.game = g.game || sv.game;
    const before = st.online[g.id] || {};
    online[g.id] = {};
    for (const name of g.players || []) {
      const secs = Math.max(0, Number((g.seconds || {})[name]) || 0);
      const p = sv.players[name] || (sv.players[name] = { playMs: 0, sessions: 0, last: 0 });
      const prev = before[name];
      let add;
      if (prev && now - prev.at < 5 * 60000 && secs >= prev.s) {
        // weiter verbunden: Zuwachs, höchstens die Zeit seit der letzten Abfrage (+ etwas Spiel)
        add = Math.min((secs - prev.s) * 1000, now - prev.at + 10000);
        if (!secs && !prev.s) add = Math.min(now - prev.at, 120000); // Spiele ohne Sekunden: Zeit zwischen den Abfragen
      } else {
        p.sessions += 1;
        add = Math.min(secs * 1000, MAX_FIRST_MS);
      }
      p.playMs += Math.max(0, Math.round(add));
      p.last = now;
      online[g.id][name] = { s: secs, at: now };
    }
  }
  st.online = online;
  return trim(st);
}

/** Unter MAX_BYTES bleiben: Spieler mit der wenigsten Spielzeit (über alle Server) zuerst weglassen. */
function trim(st, max = MAX_BYTES) {
  if (JSON.stringify(st).length <= max) return st;
  const all = Object.entries(st.servers).flatMap(([id, sv]) => Object.entries(sv.players).map(([name, p]) => ({ id, name, p })));
  all.sort((a, b) => a.p.playMs - b.p.playMs || a.p.last - b.p.last);
  for (const x of all) {
    if (JSON.stringify(st).length <= max) break;
    if (st.online[x.id] && st.online[x.id][x.name]) continue; // wer gerade spielt, bleibt
    delete st.servers[x.id].players[x.name];
  }
  return st;
}

/**
 * In der Form von /mc/servers/:id/stats, damit Leaderboard.merge() sie wie Minecraft-Server behandelt:
 * { 'game:<id>': { players: [{ name, uuid, playMs, sessions, last }] } }. Die uuid hält Spiele-Spieler je Server
 * auseinander (ein „Steve“ im Spiel ist nicht der Minecraft-Steve).
 */
function asStats(st) {
  const out = {};
  for (const [id, sv] of Object.entries((st && st.servers) || {})) {
    out[`game:${id}`] = { players: Object.entries(sv.players).map(([name, p]) => ({ name, uuid: `game:${id}:${name.toLowerCase()}`, playMs: p.playMs, sessions: p.sessions, last: p.last })) };
  }
  return out;
}
/** Auswahl-Liste: [{ id: 'game:<id>', name, game }] */
function servers(st) { return Object.entries((st && st.servers) || {}).map(([id, sv]) => ({ id: `game:${id}`, name: sv.name, game: sv.game || null })); }

module.exports = { track, trim, asStats, servers, empty, MAX_BYTES };
