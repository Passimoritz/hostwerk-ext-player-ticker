'use strict';
/*
 * Spieler – Server-Teil (SDK 3.0). Seit 2.0 mit der Bestenliste (früher eigene Erweiterung „Spieler-Bestenliste“, die in
 * dieser aufgegangen ist – manifest "replaces", SDK 3.8).
 *
 * Wer ist online (öffentliche Ansicht /v/player-ticker/, Recht share:view):
 *   GET /api/x/player-ticker/pub/players[?server=<id>]
 *     → { at, servers: [{ id, kind: 'minecraft'|'game', name, game, running, players: [namen], tps, count, max }], remoteHeads }
 *   Ohne Anmeldung erreichbar – deshalb nur mit eingeschalteter Einstellung „Stream-Ansicht ohne Anmeldung“ (sonst 403)
 *   und nur Namen und Zahlen: keine Adressen, Ports, Pfade oder Konsolen.
 * Bestenliste:
 *   - zählt Spielzeit und Besuche auf Spiele-Servern (Erweiterung „Spiele-Server“, Recht read:games) – jede Minute
 *     über die Steam-Abfrage, gespeichert unter "games" (server/games.js)
 *   GET /api/x/player-ticker/games-board → { servers: [{ id: 'game:<id>', name, game }], stats: { 'game:<id>': { players } } }
 *   GET /api/x/player-ticker/pub/board?metric=&days=&server=&limit=   (öffentliche Ansicht /v/player-ticker/board-obs.html)
 *     → { metric, days, since, players: [{ rank, name, value, bedrock }] } – nur mit Einstellung „boardPublic“, sonst 403
 * Als Webseite (host.sites, SDK 3.2): Seitenarten „online“ (server/site.js) und „board“ (server/board-site.js),
 *   GET/POST /site (body.kind), POST /site/:id/publish, DELETE /site/:id für den Reiter „Webseite“.
 * Die Seite im Rahmen fragt Hostwerk sonst selbst (Hostwerk.minecraft, /games-players, /mc/servers/:id/stats).
 */
const { source, cached } = require('./source');
const { publicPlayers } = require('../page/lib.js');
const B = require('../page/board-lib.js');
const G = require('./games');
const S = require('./site');
const SB = require('./board-site');

const POLL_MS = 60000;
const OLD = 'replaced:player-leaderboard'; // was Hostwerk von der abgelösten Bestenliste übernommen hat (SDK 3.8)
/** Einstellungen der Bestenliste → Schlüssel hier (publicView hieß dort genauso wie die Stream-Ansicht des Tickers). */
const OLD_SETTINGS = { metric: 'boardMetric', limit: 'boardLimit', publicView: 'boardPublic' };

/** Daten der früheren „Spieler-Bestenliste“ einmal übernehmen – Speicher (Schnappschüsse, Spiele-Server) und Einstellungen. */
async function takeOver(host, get, set) {
  const old = await get(OLD);
  if (!old || typeof old !== 'object') return null;
  const st = old.storage && typeof old.storage === 'object' ? old.storage : {};
  for (const k of ['snapshots', 'games']) if (st[k] !== undefined && (await get(k)) == null) await set(k, st[k]);
  const s = old.settings && typeof old.settings === 'object' ? old.settings : {};
  const values = Object.fromEntries(Object.entries(OLD_SETTINGS).filter(([k]) => s[k] !== undefined).map(([k, to]) => [to, s[k]]));
  const mk = host.ctx && host.ctx.extMarket;
  if (Object.keys(values).length && mk && typeof mk.saveSettings === 'function') { try { mk.saveSettings(host.id || 'player-ticker', values); } catch (e) { if (host.log) host.log(`settings: ${e.message}`); } }
  await set(OLD, undefined);
  return { storage: Object.keys(st), settings: Object.keys(values) };
}

function activate(host) {
  const src = source(host);
  const log = (m) => { if (typeof host.log === 'function') host.log(m); };
  const storeGet = async (k) => { try { return host.storage ? await host.storage.get(k) : null; } catch { return null; } };
  const storeSet = async (k, v) => { try { if (host.storage) await host.storage.set(k, v); } catch (e) { log(`storage: ${e.message}`); } };
  const ready = takeOver(host, storeGet, storeSet).catch((e) => { log(`take over: ${e.message}`); return null; });

  /* ---------------- Wer ist online ---------------- */
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

  /* ---------------- Bestenliste ---------------- */
  // Spiele-Server: jede Minute nachsehen, wer spielt (nur wenn es welche gibt – ohne Erweiterung bleibt die Liste leer)
  let busy = false;
  const poll = async () => {
    if (busy) return; busy = true;
    try {
      await ready;
      const list = await src.games();
      const before = (await storeGet('games')) || G.empty();
      if (!list.length && !Object.keys(before.online || {}).length) return;
      await storeSet('games', G.track(before, list));
    } catch (e) { log(`games: ${e.message}`); } finally { busy = false; }
  };
  if (!process.env.HW_TEST) {
    const timer = setInterval(poll, POLL_MS);
    if (timer.unref) timer.unref();
    setTimeout(poll, 5000).unref?.();
    if (typeof host.on === 'function') host.on('shutdown', () => clearInterval(timer));
  }
  host.router.get('/games-board', async (req, res) => {
    await ready;
    const st = (await storeGet('games')) || G.empty();
    res.json({ servers: G.servers(st), stats: G.asStats(st) });
  });
  // Öffentlich: Minecraft-Statistik je Server höchstens alle 30 s, Spiele-Server aus dem eigenen Speicher
  const allStats = cached(async () => {
    const list = await src.api('/mc/servers').catch(() => []);
    const stats = {};
    await Promise.all((Array.isArray(list) ? list : []).map(async (s) => { stats[s.id] = await src.mcStats(s.id); }));
    Object.assign(stats, G.asStats((await storeGet('games')) || G.empty()));
    return stats;
  }, 30000);
  host.publicRouter.get('/pub/board', async (req, res) => {
    const st = await src.settings();
    if (!st.boardPublic) return res.status(403).json({ error: 'off' });
    const q = req.query || {};
    const snaps = (await storeGet('snapshots')) || [];
    res.setHeader('Cache-Control', 'no-store');
    res.json(B.board(await allStats(), { snaps, metric: String(q.metric || st.boardMetric || 'playMs'), days: Number(q.days) || 0, server: q.server ? String(q.server) : '', limit: Number(q.limit) || 10 }));
  });

  /* ---------------- Als Webseite bereitstellen ---------------- */
  // Ohne host.sites (älteres Hostwerk, abgeschottet) einfach nicht
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
    sites.register({
      id: 'board', title: { de: 'Bestenliste', en: 'Leaderboard' }, defaults: SB.DEFAULTS,
      render: async (raw, { lang } = {}) => {
        const opt = SB.options(raw, lang);
        const d = SB.data(await allStats(), (await storeGet('snapshots')) || [], opt);
        return { 'index.html': SB.page(opt), 'data.json': JSON.stringify(d) };
      },
    });
  }
  const lang = () => (typeof host.lang === 'function' ? host.lang() : 'de');
  const kindOf = (k) => (k === 'board' ? 'board' : 'online');
  const optionsOf = (kind, o) => (kind === 'board' ? SB.options(o, lang()) : S.options(o, lang()));
  const need = (res) => { if (sites) return true; res.status(501).json({ error: (typeof host.t === 'function' ? host.t : (s) => s)('Needs a newer Hostwerk (pages in a web server, SDK 3.2).') }); return false; };
  const fail = (res, e) => res.status(e.status || 400).json({ error: e.message });
  host.router.get('/site', (req, res) => res.json(sites
    ? { available: true, targets: sites.targets(), list: sites.list(), defaults: S.DEFAULTS, defaultsBoard: SB.DEFAULTS }
    : { available: false, targets: [], list: [], defaults: S.DEFAULTS, defaultsBoard: SB.DEFAULTS }));
  host.router.post('/site', async (req, res) => {
    if (!need(res)) return;
    try {
      const b = req.body || {};
      const kind = kindOf(b.kind);
      res.json(await sites.save({ id: b.id || undefined, kind, web: b.web, vhost: b.vhost || null, sub: b.sub, title: b.title, interval: b.interval, on: b.on, options: optionsOf(kind, b.options) }));
    } catch (e) { fail(res, e); }
  });
  host.router.post('/site/:id/publish', async (req, res) => { if (!need(res)) return; try { res.json(await sites.publish(req.params.id)); } catch (e) { fail(res, e); } });
  host.router.delete('/site/:id', (req, res) => { if (!need(res)) return; try { res.json({ ok: sites.remove(req.params.id) }); } catch (e) { fail(res, e); } });

  return { poll, ready };
}

module.exports = { activate, takeOver };
