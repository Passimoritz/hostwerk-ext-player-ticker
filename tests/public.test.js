'use strict';
/*
 * Spiele-Server und öffentliche Ansicht: Spiele-Server in Kartenform, Antwort für OBS (nur Namen und Zahlen),
 * Server-Teil mit Einstellung „freigeben“ (sonst 403) – im Hostwerk-Prozess (ctx) und abgeschottet (host.api).
 */
const test = require('node:test');
const assert = require('node:assert');
const T = require('../page/lib.js');
const { activate } = require('../server/index.js');
const { source } = require('../server/source.js');

const GAMES = [{ id: 'valheim', name: 'Valheim', game: 'Valheim', players: [{ name: 'Odin', seconds: 120, score: 0 }, { name: '', seconds: 1 }], count: 2, max: 10 }];
const OVERVIEW = { minecraft: [
  { id: 'survival', name: 'Survival', port: 25565, dir: 'C:/secret', proc: { state: 'running', extra: { players: ['Steve', 'Alex'], tps: 19.97 } } },
  { id: 'creative', name: 'Creative', proc: { state: 'stopped', extra: {} } },
], web: [{ id: 'w', name: 'Web' }] };

test('fromGames: game servers look like Minecraft servers (own id space, only named players)', () => {
  const g = T.fromGames(GAMES);
  assert.deepStrictEqual(g, [{ id: 'game:valheim', kind: 'game', name: 'Valheim', game: 'Valheim', state: 'running', extra: { players: ['Odin'], max: 10 } }]);
  assert.strictEqual(T.onlineCount(g), 1);
  assert.deepStrictEqual(T.diff(T.snapshot(g), T.snapshot([])), [], 'a game server that stops is no mass leave');
  assert.deepStrictEqual(T.fromGames(null), []);
});

test('publicPlayers: names and numbers only, running first, filter by server, stopped ones on request', () => {
  const mc = [{ id: 'survival', name: 'Survival', running: true, players: ['Steve', 'Alex'], tps: 19.97 }, { id: 'creative', name: 'Creative', running: false, players: ['ghost'], tps: null }];
  const games = [{ id: 'valheim', name: 'Valheim', game: 'Valheim', players: ['Odin'], max: 10 }];
  const r = T.publicPlayers(mc, games, { now: 5, remoteHeads: true });
  assert.deepStrictEqual(r.servers.map((s) => [s.id, s.players.length, s.running]), [['survival', 2, true], ['game:valheim', 1, true], ['creative', 0, false]]);
  assert.strictEqual(r.total, 3); assert.strictEqual(r.at, 5); assert.strictEqual(r.remoteHeads, true); assert.strictEqual(r.servers[0].tps, 20);
  assert.deepStrictEqual(Object.keys(r.servers[0]).sort(), ['game', 'id', 'kind', 'max', 'name', 'players', 'running', 'tps']);
  assert.deepStrictEqual(T.publicPlayers(mc, games, { server: 'game:valheim' }).servers.map((s) => s.id), ['game:valheim']);
  assert.deepStrictEqual(T.publicPlayers(mc, games, { showOffline: false }).servers.map((s) => s.id), ['survival', 'game:valheim']);
  assert.deepStrictEqual(T.onlineList(r).map((p) => `${p.server}/${p.name}`), ['Survival/Alex', 'Survival/Steve', 'Valheim/Odin']);
});

function fakeHost({ sandboxed = false, settings = {} } = {}) {
  const routes = {};
  const seen = [];
  const answer = (p) => { seen.push(p); if (p === '/overview') return OVERVIEW; if (p === '/games-players') return GAMES; throw new Error('404'); };
  const host = {
    sandboxed,
    id: 'player-ticker',
    publicRouter: { get: (p, fn) => { routes[p] = fn; } },
    router: { get() {}, post() {} },
  };
  if (sandboxed) { host.api = async (m, p) => answer(p); host.settings = async () => settings; } else {
    host.ctx = { audit: { selfCall: async (m, p) => answer(p) }, games: { allPlayers: async () => { seen.push('ctx.games'); return GAMES; } }, extMarket: { settingsFor: () => settings } };
  }
  return { host, routes, seen };
}
const call = async (fn, query = {}) => { let status = 200; let body = null; const res = { status(s) { status = s; return res; }, json(b) { body = b; return res; }, setHeader() {} }; await fn({ query }, res); return { status, body }; };

test('public route: 403 until the setting is on', async () => {
  const { host, routes } = fakeHost({ settings: { publicView: false } });
  activate(host);
  const r = await call(routes['/pub/players']);
  assert.strictEqual(r.status, 403); assert.deepStrictEqual(r.body, { error: 'off' });
});

test('public route in Hostwerk’s process: Minecraft from the overview, games through ctx.games, no paths or ports', async () => {
  const { host, routes, seen } = fakeHost({ settings: { publicView: true, showOffline: true } });
  activate(host);
  const r = await call(routes['/pub/players']);
  assert.strictEqual(r.status, 200);
  assert.deepStrictEqual(r.body.servers.map((s) => s.id), ['survival', 'game:valheim', 'creative']);
  assert.ok(seen.includes('ctx.games') && !seen.includes('/games-players'));
  assert.doesNotMatch(JSON.stringify(r.body), /secret|25565/);
});

test('sandboxed: everything through host.api with the package’s permissions', async () => {
  const { host, routes, seen } = fakeHost({ sandboxed: true, settings: { publicView: true, showOffline: false } });
  activate(host);
  const r = await call(routes['/pub/players'], { server: 'survival' });
  assert.deepStrictEqual(r.body.servers.map((s) => s.id), ['survival']);
  assert.deepStrictEqual([...new Set(seen)].sort(), ['/games-players', '/overview']);
});

test('source: missing game server extension or Hostwerk still starting → empty lists', async () => {
  const s = source({ sandboxed: true, api: async () => { throw new Error('404'); } });
  assert.deepStrictEqual(await s.games(), []); assert.deepStrictEqual(await s.minecraft(), []);
  const early = source({ sandboxed: false, ctx: { audit: {} } });
  assert.deepStrictEqual(await early.minecraft(), []);
});
