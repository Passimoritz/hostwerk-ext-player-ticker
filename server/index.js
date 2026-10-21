'use strict';
/*
 * Spieler-Ticker – Server-Teil (SDK 3.0). Für die öffentliche Ansicht (/v/player-ticker/, Recht share:view):
 *   GET /api/x/player-ticker/pub/players[?server=<id>]
 *     → { at, servers: [{ id, kind: 'minecraft'|'game', name, game, running, players: [namen], tps, count, max }], remoteHeads }
 * Ohne Anmeldung erreichbar – deshalb nur mit eingeschalteter Einstellung „Stream-Ansicht ohne Anmeldung“ (sonst 403)
 * und nur Namen und Zahlen: keine Adressen, Ports, Pfade oder Konsolen.
 * Seit 1.5 (Hostwerk mit SDK 3.2, host.sites): „Wer ist online?“ als eigene Seite in einem Webserver (server/site.js),
 *   GET/POST /site, POST /site/:id/publish, DELETE /site/:id für den Reiter „Webseite“.
 * Die Seite im Rahmen braucht den Server-Teil sonst nicht – sie fragt Hostwerk selbst (Hostwerk.minecraft, /games-players).
 */
const { source, cached } = require('./source');
const { publicPlayers } = require('../page/lib.js');
const S = require('./site');

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

  // „Als Webseite bereitstellen“ – ohne host.sites (älteres Hostwerk, abgeschottet) einfach nicht
  const sites = host.sites && typeof host.sites.register === 'function' ? host.sites : null;
  if (sites) {
    sites.register({
      id: 'online', title: { de: 'Wer ist online?', en: 'Who is online?' }, defaults: S.DEFAULTS,
      render: async (raw, { lang } = {}) => {
        const opt = S.options(raw, lang);
        const { mc, games } = await players();
        const d = S.data(publicPlayers(mc, games, { server: opt.server, showOffline: opt.showOffline }), opt);
        return { 'index.html': S.page(opt), 'data.json': JSON.stringify(d) };
      },
    });
  }
  const need = (res) => { if (sites) return true; res.status(501).json({ error: host.t('Needs a newer Hostwerk (pages in a web server, SDK 3.2).') }); return false; };
  const fail = (res, e) => res.status(e.status || 400).json({ error: e.message });
  host.router.get('/site', (req, res) => res.json(sites ? { available: true, targets: sites.targets(), list: sites.list(), defaults: S.DEFAULTS } : { available: false, targets: [], list: [], defaults: S.DEFAULTS }));
  host.router.post('/site', async (req, res) => { if (!need(res)) return; try { const b = req.body || {}; res.json(await sites.save({ id: b.id || undefined, kind: 'online', web: b.web, vhost: b.vhost || null, sub: b.sub, title: b.title, interval: b.interval, on: b.on, options: S.options(b.options, host.lang()) })); } catch (e) { fail(res, e); } });
  host.router.post('/site/:id/publish', async (req, res) => { if (!need(res)) return; try { res.json(await sites.publish(req.params.id)); } catch (e) { fail(res, e); } });
  host.router.delete('/site/:id', (req, res) => { if (!need(res)) return; try { res.json({ ok: sites.remove(req.params.id) }); } catch (e) { fail(res, e); } });
}

module.exports = { activate };
