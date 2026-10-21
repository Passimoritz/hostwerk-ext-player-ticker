'use strict';
/*
 * 1.5: Suche, Filter für Kommen und Gehen, Höchststand des Tages – und „Als Webseite bereitstellen“ (server/site.js):
 * Einstellungen gesäubert, Spielernamen nach Datenschutz-Wahl, Seite escaped und lädt nichts Fremdes, Server-Teil meldet
 * die Seitenart bei host.sites an.
 */
process.env.HW_TEST = '1';
const test = require('node:test');
const assert = require('node:assert');
const T = require('../page/lib.js');
const S = require('../server/site.js');
const { activate } = require('../server/index.js');

test('Suche und Filter', () => {
  assert.deepStrictEqual(T.filterNames(['Alex', 'steve', '.Bedrock'], 'E'), ['Alex', 'steve', '.Bedrock']);
  assert.deepStrictEqual(T.filterNames(['Alex', 'steve'], 'ste'), ['steve']);
  const ev = [{ name: 'Alex', server: 'a' }, { name: 'Steve', server: 'b' }, { name: 'Alexa', server: 'b' }];
  assert.deepStrictEqual(T.filterEvents(ev, { server: 'b' }).map((e) => e.name), ['Steve', 'Alexa']);
  assert.deepStrictEqual(T.filterEvents(ev, { server: 'b', query: 'alex' }).map((e) => e.name), ['Alexa']);
  assert.strictEqual(T.filterEvents(ev).length, 3);
});

test('Höchststand heute: steigt nur, neuer Tag fängt neu an, unverändert = dasselbe Objekt', () => {
  const day1 = Date.UTC(2026, 9, 21, 12);
  const sv = (n) => [{ id: 'a', extra: { players: Array.from({ length: n }, (_, i) => `p${i}`) } }];
  const p1 = T.peaks(null, sv(3), day1);
  assert.deepStrictEqual(p1, { day: '2026-10-21', max: { a: 3 } });
  assert.strictEqual(T.peaks(p1, sv(2), day1), p1, 'weniger → nichts zu speichern');
  assert.strictEqual(T.peaks(p1, sv(5), day1).max.a, 5);
  assert.deepStrictEqual(T.peaks(p1, sv(1), day1 + 86400000), { day: '2026-10-22', max: { a: 1 } });
});

const pub = { at: 5, servers: [{ id: 'a', name: 'Survival', running: true, players: ['Steve', '.Bedrock'], max: null }, { id: 'game:v', name: 'Valheim', game: 'Valheim', running: true, players: [], max: 10 }] };

test('Webseite: Einstellungen gesäubert, Namen voll/gekürzt/keine', () => {
  const o = S.options({ names: 'evil', theme: 'x', accent: 'url(x)', lang: 'fr', refresh: 99999, title: 'y'.repeat(100) }, 'en');
  assert.deepStrictEqual([o.names, o.theme, o.accent, o.lang, o.refresh, o.title.length], ['full', 'auto', '#23964a', 'en', 3600, 80]);
  assert.deepStrictEqual(S.data(pub, S.options({})).servers[0].players, ['.Bedrock', 'Steve']);
  assert.deepStrictEqual(S.data(pub, S.options({ names: 'short' })).servers[0].players, ['Be…', 'St…']);
  const c = S.data(pub, S.options({ names: 'count' }));
  assert.deepStrictEqual([c.names, c.total, c.servers[0].players, c.servers[0].count], [false, 2, [], 2]);
  assert.deepStrictEqual(Object.keys(c.servers[1]).sort(), ['count', 'game', 'max', 'name', 'players', 'running']);
});

test('Webseite: Überschrift escaped, nichts von außen', () => {
  const html = S.page(S.options({ title: '"><img src=x onerror=alert(1)>', theme: 'light', lang: 'en' }));
  assert.ok(!html.includes('<img src=x'));
  assert.ok(html.includes('data-theme="light"'));
  assert.ok(!/src="https?:/.test(html));
  assert.ok(html.includes("fetch('data.json"));
});

function fakeHost(withSites) {
  const routes = {}; const registered = [];
  const host = {
    id: 'player-ticker', sandboxed: true,
    router: { get: (p, fn) => { routes[`GET ${p}`] = fn; }, post: (p, fn) => { routes[`POST ${p}`] = fn; }, delete: (p, fn) => { routes[`DELETE ${p}`] = fn; } },
    publicRouter: { get() {} },
    settings: async () => ({}),
    api: async (m, p) => { if (p === '/overview') return { minecraft: [{ id: 'a', name: 'Survival', proc: { state: 'running', extra: { players: ['Steve'] } } }] }; if (p === '/games-players') return []; throw new Error('404'); },
    log() {}, on() {}, lang: () => 'de', t: (s) => s,
    sites: withSites ? { register: (def) => { registered.push(def); return () => {}; }, targets: () => [], list: () => [], save: async (b) => b, remove: () => true, publish: async () => null } : undefined,
  };
  return { host, routes, registered };
}
const call = async (fn, body = {}) => { let status = 200; let out = null; const res = { status(s) { status = s; return res; }, json(b) { out = b; return res; }, setHeader() {} }; await fn({ query: {}, body, params: {} }, res); return { status, body: out }; };

test('Server-Teil: „Wer ist online?“ bei host.sites, ohne host.sites ehrlich nicht verfügbar', async () => {
  const old = fakeHost(false);
  activate(old.host);
  assert.strictEqual((await call(old.routes['GET /site'])).body.available, false);
  assert.strictEqual((await call(old.routes['POST /site'])).status, 501);
  const { host, routes, registered } = fakeHost(true);
  activate(host);
  const files = await registered[0].render({ names: 'short' }, { lang: 'de' });
  const d = JSON.parse(files['data.json']);
  assert.deepStrictEqual([d.total, d.servers[0].players], [1, ['St…']]);
  const r = await call(routes['POST /site'], { web: 'w', sub: 'online', options: { names: 'bad' } });
  assert.deepStrictEqual([r.body.kind, r.body.options.names], ['online', 'full']);
});
