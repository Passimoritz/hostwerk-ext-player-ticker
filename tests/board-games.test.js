'use strict';
/*
 * Spiele-Server in der Bestenliste: Spielzeit und Besuche aus der Steam-Abfrage, Größe im Speicher, Form wie die
 * Minecraft-Statistik – und die öffentliche Ansicht (Server-Teil) mit Freigabe.
 */
process.env.HW_TEST = '1';
const test = require('node:test');
const assert = require('node:assert');
const G = require('../server/games');
const B = require('../page/board-lib.js');
const { activate } = require('../server/index.js');

const MIN = 60000;
const g = (players, seconds) => [{ id: 'valheim', name: 'Valheim', game: 'Valheim', players, seconds }];

test('track: new players bring their seconds, connected ones grow by the delta, reconnect = new visit', () => {
  let st = G.track(null, g(['Odin'], { Odin: 300 }), 0);
  assert.deepStrictEqual(st.servers.valheim.players.Odin, { playMs: 300000, sessions: 1, last: 0 });
  st = G.track(st, g(['Odin', 'Thor'], { Odin: 360, Thor: 30 }), MIN);
  assert.strictEqual(st.servers.valheim.players.Odin.playMs, 360000);
  assert.strictEqual(st.servers.valheim.players.Odin.sessions, 1);
  assert.strictEqual(st.servers.valheim.players.Thor.playMs, 30000);
  // A2S-Sekunden springen unplausibel weit: höchstens die Zeit zwischen den Abfragen (+10 s)
  st = G.track(st, g(['Odin'], { Odin: 5000 }), 2 * MIN);
  assert.strictEqual(st.servers.valheim.players.Odin.playMs, 360000 + MIN + 10000);
  // neu verbunden (Sekunden fangen wieder klein an) → neuer Besuch
  st = G.track(st, g(['Odin'], { Odin: 20 }), 3 * MIN);
  assert.strictEqual(st.servers.valheim.players.Odin.sessions, 2);
  // Pause länger als 5 Minuten → neuer Besuch
  st = G.track(st, [], 4 * MIN);
  st = G.track(st, g(['Odin'], { Odin: 60 }), 20 * MIN);
  assert.strictEqual(st.servers.valheim.players.Odin.sessions, 3);
  assert.deepStrictEqual(Object.keys(st.online.valheim), ['Odin']);
});

test('track: games without seconds count the time between polls; first sighting capped at 12 h', () => {
  let st = G.track(null, g(['Ann'], {}), 0);
  st = G.track(st, g(['Ann'], {}), MIN);
  assert.strictEqual(st.servers.valheim.players.Ann.playMs, MIN);
  const big = G.track(null, g(['Bob'], { Bob: 99 * 3600 }), 0);
  assert.strictEqual(big.servers.valheim.players.Bob.playMs, 12 * 3600000);
});

test('trim: stays small, drops the least playtime first, never someone online', () => {
  const players = {};
  for (let i = 0; i < 2000; i++) players[`p${i}`] = { playMs: i, sessions: 1, last: i };
  const st = G.trim({ v: 1, servers: { a: { name: 'A', players } }, online: { a: { p0: { s: 0, at: 0 } } } }, 20000);
  assert.ok(JSON.stringify(st).length <= 20000);
  assert.ok(st.servers.a.players.p0, 'online player stays');
  assert.ok(st.servers.a.players.p1999 && !st.servers.a.players.p1);
});

test('asStats/servers: same shape as Minecraft stats, players kept apart per game server', () => {
  const st = G.track(null, g(['Steve'], { Steve: 60 }), 1000);
  assert.deepStrictEqual(G.servers(st), [{ id: 'game:valheim', name: 'Valheim', game: 'Valheim' }]);
  const stats = { survival: { players: [{ name: 'Steve', uuid: '1234', playMs: 1000, sessions: 1, last: 5 }] }, ...G.asStats(st) };
  const merged = B.merge(stats);
  assert.strictEqual(merged.length, 2, 'Minecraft-Steve and Valheim-Steve are not one person');
  assert.deepStrictEqual(B.rank(merged, 'playMs').map((p) => p.playMs), [60000, 1000]);
});

test('board: rank, metric, server and limit for the public view', () => {
  const stats = { s: { players: [{ name: 'A', playMs: 5, sessions: 3 }, { name: '.Bedrock', playMs: 9, sessions: 1 }, { name: 'C', playMs: 1, sessions: 9 }] }, t: { players: [{ name: 'D', playMs: 100, sessions: 1 }] } };
  const all = B.board(stats, { limit: 2 });
  assert.deepStrictEqual(all.players, [{ rank: 1, name: 'D', value: 100, bedrock: false }, { rank: 2, name: '.Bedrock', value: 9, bedrock: true }]);
  assert.deepStrictEqual(B.board(stats, { metric: 'sessions', server: 's' }).players.map((p) => p.name), ['C', 'A', '.Bedrock']);
  assert.strictEqual(B.board(stats, { metric: 'nope', days: 3 }).metric, 'playMs');
  assert.strictEqual(B.board(stats, { days: 3 }).days, 0);
});

function fakeHost(settings) {
  const routes = {}; const pub = {};
  const store = { games: G.track(null, g(['Odin'], { Odin: 120 }), 1000) };
  const host = {
    id: 'player-leaderboard', sandboxed: true,
    router: { get: (p, fn) => { routes[p] = fn; }, post: (p, fn) => { routes[`POST ${p}`] = fn; }, delete: (p, fn) => { routes[`DELETE ${p}`] = fn; } },
    publicRouter: { get: (p, fn) => { pub[p] = fn; } },
    storage: { get: async (k) => store[k], set: async (k, v) => { store[k] = v; } },
    settings: async () => settings,
    api: async (m, p) => { if (p === '/mc/servers') return [{ id: 'survival', name: 'Survival' }]; if (p === '/mc/servers/survival/stats') return { players: [{ name: 'Steve', uuid: 'u1', playMs: 60000, sessions: 2 }] }; if (p === '/games-players') return [{ id: 'valheim', name: 'Valheim', game: 'Valheim', players: [{ name: 'Odin', seconds: 180 }, { name: 'Thor', seconds: 10 }], count: 2, max: 10 }]; throw new Error('404'); },
    log() {}, on() {},
  };
  return { host, routes, pub, store };
}
const call = async (fn, query = {}) => { let status = 200; let body = null; const res = { status(s) { status = s; return res; }, json(b) { body = b; return res; }, setHeader() {} }; await fn({ query }, res); return { status, body }; };

test('server part: games board for the page, poll counts game players, public board only when shared', async () => {
  const off = fakeHost({ boardPublic: false });
  activate(off.host);
  assert.strictEqual((await call(off.pub['/pub/board'])).status, 403);
  const { host, routes, pub, store } = fakeHost({ boardPublic: true });
  const api = activate(host);
  const gb = (await call(routes['/games-board'])).body;
  assert.deepStrictEqual(gb.servers.map((s) => s.id), ['game:valheim']);
  assert.strictEqual(gb.stats['game:valheim'].players[0].name, 'Odin');
  await api.poll();
  assert.ok(store.games.servers.valheim.players.Thor, 'poll took the new player in');
  const r = await call(pub['/pub/board'], { limit: '5' });
  assert.strictEqual(r.status, 200);
  assert.deepStrictEqual(r.body.players.map((p) => p.name).sort(), ['Odin', 'Steve', 'Thor']);
  assert.deepStrictEqual(Object.keys(r.body).sort(), ['days', 'metric', 'players', 'since']);
});

test('2.0: takes over the data of the former “Player leaderboard” once (snapshots, game servers, settings)', async () => {
  const { takeOver } = require('../server/index.js');
  const store = { 'replaced:player-leaderboard': { storage: { snapshots: [{ day: '2026-10-20', players: {} }], games: { servers: {}, online: {} } }, settings: { metric: 'deaths', limit: 10, publicView: true }, at: 1 }, snapshots: undefined };
  const get = async (k) => store[k]; const set = async (k, v) => { if (v === undefined) delete store[k]; else store[k] = v; };
  const saved = [];
  const host = { id: 'player-ticker', ctx: { extMarket: { saveSettings: (id, v) => saved.push([id, v]) } } };
  const r = await takeOver(host, get, set);
  assert.deepStrictEqual(r, { storage: ['snapshots', 'games'], settings: ['boardMetric', 'boardLimit', 'boardPublic'] });
  assert.strictEqual(store.snapshots[0].day, '2026-10-20');
  assert.deepStrictEqual(saved, [['player-ticker', { boardMetric: 'deaths', boardLimit: 10, boardPublic: true }]]);
  assert.ok(!('replaced:player-leaderboard' in store), 'only once');
  assert.strictEqual(await takeOver(host, get, set), null);
  // Already own snapshots: never overwritten
  store['replaced:player-leaderboard'] = { storage: { snapshots: [{ day: 'old' }] }, settings: {} };
  await takeOver(host, get, set);
  assert.strictEqual(store.snapshots[0].day, '2026-10-20');
});
