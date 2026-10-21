'use strict';
/*
 * Spieler-Ticker – Server-Teil (SDK 3.0). Nur für die öffentliche Ansicht (/v/player-ticker/, Recht share:view):
 *   GET /api/x/player-ticker/pub/players[?server=<id>]
 *     → { at, servers: [{ id, kind: 'minecraft'|'game', name, game, running, players: [namen], tps, count, max }], remoteHeads }
 * Ohne Anmeldung erreichbar – deshalb nur mit eingeschalteter Einstellung „Stream-Ansicht ohne Anmeldung“ (sonst 403)
 * und nur Namen und Zahlen: keine Adressen, Ports, Pfade oder Konsolen.
 * Die Seite im Rahmen braucht den Server-Teil nicht – sie fragt Hostwerk selbst (Hostwerk.minecraft, /games-players).
 */
const { source, cached } = require('./source');
const { publicPlayers } = require('../page/lib.js');

function activate(host) {
  const src = source(host);
  const players = cached(async () => {
    const [mc, games, st] = await Promise.all([src.minecraft(), src.games(), src.settings()]);
    return { mc, games, st };
  });
  host.publicRouter.get('/pub/players', async (req, res) => {
    const { mc, games, st } = await players();
    if (!st.publicView) return res.status(403).json({ error: 'off' });
    res.setHeader('Cache-Control', 'no-store');
    res.json(publicPlayers(mc, games, { server: req.query.server ? String(req.query.server) : '', showOffline: st.showOffline !== false, remoteHeads: !!st.remoteHeads }));
  });
}

module.exports = { activate };
