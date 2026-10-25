'use strict';
/*
 * 1.5: Abzeichen, Verlauf, Suche, Namen für öffentliche Seiten – und „Als Webseite bereitstellen“ (server/site.js):
 * Einstellungen werden gesäubert, data.json enthält nur Platz/Name/Wert, die Seite escaped alles und lädt nichts Fremdes,
 * der Server-Teil meldet die Seitenart bei host.sites an und reicht nur eigene Seiten weiter.
 */
process.env.HW_TEST = '1';
const test = require('node:test');
const assert = require('node:assert');
const B = require('../page/board-lib.js');
const S = require('../server/board-site.js');
const { activate } = require('../server/index.js');

const H = 3600000;
const stats = { s: { players: [
  { name: 'Alex', uuid: 'a', playMs: 120 * H, sessions: 60, world: { mined: 12000, deaths: 2, mobKills: 50, distanceKm: 120, crafted: 10 } },
  { name: '.Bedrock', uuid: '00000000000000000000000000000001', playMs: 2 * H, sessions: 3, world: { mined: 5 } },
  { name: 'Steve', uuid: 's', playMs: 30 * H, sessions: 12 },
] } };

test('Abzeichen: Stufen aus den Gesamtwerten, Überlebenskünstler erst ab 10 Stunden', () => {
  const [alex] = B.merge(stats).filter((p) => p.name === 'Alex');
  assert.deepStrictEqual(B.badges(alex), [{ id: 'playtime', level: 2 }, { id: 'regular', level: 2 }, { id: 'miner', level: 2 }, { id: 'wanderer', level: 2 }, { id: 'survivor', level: 2 }]);
  assert.deepStrictEqual(B.badges({ playMs: 2 * H }), []);
  assert.deepStrictEqual(B.badges(null), []);
});

test('Verlauf aus Schnappschüssen, Suche ohne Groß/Klein', () => {
  const snaps = [{ day: '2026-10-01', v: { k: [10, 1, 0, 0, 0, 0, 0, 0] } }, { day: '2026-10-02', v: { x: [1] } }, { day: '2026-10-03', v: { k: [30, 2, 5, 0, 0, 0, 0, 0] } }];
  assert.deepStrictEqual(B.history(snaps, 'k', 'playMs'), [{ day: '2026-10-01', value: 10 }, { day: '2026-10-03', value: 30 }]);
  assert.deepStrictEqual(B.history(snaps, 'k', 'mined').map((x) => x.value), [0, 5]);
  assert.deepStrictEqual(B.history(snaps, 'k', 'nope'), []);
  assert.deepStrictEqual(B.search([{ name: 'Alex' }, { name: 'steve' }], 'STE').map((p) => p.name), ['steve']);
  assert.strictEqual(B.search([{ name: 'A' }], '  ').length, 1);
});

test('Namen für öffentliche Seiten: voll, gekürzt (ohne Bedrock-Punkt), ausgeblendet', () => {
  assert.strictEqual(B.publicName('Alexander', 'full', 1), 'Alexander');
  assert.strictEqual(B.publicName('Alexander', 'short', 1), 'Al…');
  assert.strictEqual(B.publicName('.Bedrock', 'short', 1), 'Be…');
  assert.strictEqual(B.publicName('Alex', 'hidden', 3, 'en'), 'Player 3');
  assert.strictEqual(B.publicName('Alex', 'hidden', 3, 'de'), 'Spieler 3');
});

test('Webseite: Einstellungen gesäubert, Daten nur Platz/Name/Wert', () => {
  const o = S.options({ metrics: ['mined', 'evil', 'mined'], limit: 999, days: 5, theme: 'x', accent: 'red;}', names: 'short', lang: 'xx', refresh: 1, title: 'x'.repeat(200) }, 'en');
  assert.deepStrictEqual([o.metrics, o.limit, o.days, o.theme, o.accent, o.names, o.lang, o.refresh, o.title.length], [['mined'], 50, 0, 'auto', '#eab308', 'short', 'en', 30, 80]);
  const d = S.data(stats, [], S.options({ metrics: ['playMs', 'mined'], names: 'short' }), 1000);
  assert.strictEqual(d.at, 1000);
  assert.deepStrictEqual(d.boards.map((b) => b.metric), ['playMs', 'mined']);
  assert.deepStrictEqual(d.boards[0].players.map((p) => p.name), ['Al…', 'St…', 'Be…']);
  assert.deepStrictEqual(Object.keys(d.boards[0].players[0]).sort(), ['bedrock', 'name', 'rank', 'value']);
  assert.ok(d.boards[0].players.every((p) => p.bedrock === false), 'gekürzt: Bedrock-Kennzeichen verrät nichts');
});

test('Webseite: Überschrift escaped, keine fremden Skripte, data.json relativ', () => {
  const html = S.page(S.options({ title: '<script>alert(1)</script>', theme: 'dark', lang: 'de' }));
  assert.ok(!html.includes('<script>alert(1)'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('data-theme="dark"'));
  assert.ok(!/src="https?:/.test(html) && !/href="https?:/.test(html), 'nichts von außen');
  assert.ok(html.includes("fetch('data.json"));
});

function fakeHost(withSites) {
  const routes = {}; const registered = []; const saved = [];
  const host = {
    id: 'player-ticker', sandboxed: true,
    router: { get: (p, fn) => { routes[`GET ${p}`] = fn; }, post: (p, fn) => { routes[`POST ${p}`] = fn; }, delete: (p, fn) => { routes[`DELETE ${p}`] = fn; } },
    publicRouter: { get() {} },
    storage: { get: async () => null, set: async () => {} },
    settings: async () => ({}),
    api: async (m, p) => { if (p === '/mc/servers') return [{ id: 's', name: 'S' }]; if (p === '/mc/servers/s/stats') return stats.s; if (p === '/games-players') return []; throw new Error('404'); },
    log() {}, on() {}, lang: () => 'de', t: (s) => s,
    sites: withSites ? {
      register: (def) => { registered.push(def); return () => {}; },
      targets: () => [{ id: 'apache', web: 'apache', vhost: null, label: 'Apache', base: 'http://localhost/' }],
      list: () => saved,
      save: async (b) => { saved.push(b); return { ...b, id: 'p1' }; },
      remove: () => true,
      publish: async (id) => ({ id }),
    } : undefined,
  };
  return { host, routes, registered, saved };
}
const call = async (fn, { body = {}, params = {} } = {}) => { let status = 200; let out = null; const res = { status(s) { status = s; return res; }, json(b) { out = b; return res; }, setHeader() {} }; await fn({ query: {}, body, params }, res); return { status, body: out }; };

test('Server-Teil: Seitenart bei host.sites, eigene Routen, ohne host.sites ehrlich „nicht verfügbar“', async () => {
  const old = fakeHost(false);
  activate(old.host);
  assert.deepStrictEqual((await call(old.routes['GET /site'])).body.available, false);
  assert.strictEqual((await call(old.routes['POST /site'], { body: {} })).status, 501);
  const { host, routes, registered, saved } = fakeHost(true);
  activate(host);
  assert.deepStrictEqual(registered.map((r) => r.id), ['online', 'board']);
  const files = await registered.find((r) => r.id === 'board').render({ metrics: ['playMs'], names: 'hidden' }, { lang: 'de' });
  assert.deepStrictEqual(Object.keys(files).sort(), ['data.json', 'index.html']);
  assert.deepStrictEqual(JSON.parse(files['data.json']).boards[0].players.map((p) => p.name), ['Spieler 1', 'Spieler 2', 'Spieler 3']);
  const g = (await call(routes['GET /site'])).body;
  assert.strictEqual(g.available, true); assert.strictEqual(g.targets.length, 1);
  const r = await call(routes['POST /site'], { body: { kind: 'board', web: 'apache', sub: 'top', options: { limit: 7, metrics: ['bad'] } } });
  assert.strictEqual(r.body.id, 'p1');
  assert.strictEqual(saved[0].kind, 'board');
  assert.deepStrictEqual(saved[0].options.metrics, ['playMs'], 'Optionen gesäubert, bevor sie gespeichert werden');
});
