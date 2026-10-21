const test = require('node:test');
const assert = require('node:assert');
const T = require('../page/lib.js');

test('Spielzeit aus playMs (aktuell) und playtime (alt)', () => {
  assert.strictEqual(T.playMs({ playMs: 5 }), 5); assert.strictEqual(T.playMs({ playtime: 7 }), 7); assert.strictEqual(T.playMs({}), 0);
});
test('Top-Spieler: meiste Spielzeit zuerst, ohne Nullen, begrenzt', () => {
  const st = { players: [{ name: 'A', playMs: 10 }, { name: 'B', playMs: 30 }, { name: 'C', playMs: 0 }, { name: 'D', playtime: 20 }] };
  assert.deepStrictEqual(T.topPlayers(st, 2).map((p) => p.name), ['B', 'D']);
  assert.deepStrictEqual(T.topPlayers(null, 3), []);
});
test('Server: angeheftet, dann laufend, dann Name', () => {
  const s = [{ id: 'a', name: 'Zoo', state: 'running' }, { id: 'b', name: 'Alpha', state: 'stopped' }, { id: 'c', name: 'Beta', state: 'running' }];
  assert.deepStrictEqual(T.sortServers(s, 'b').map((x) => x.id), ['b', 'c', 'a']);
  assert.deepStrictEqual(T.sortServers(s, null).map((x) => x.id), ['c', 'a', 'b']);
});
test('Spieler online', () => { assert.strictEqual(T.onlineCount([{ extra: { players: ['a', 'b'] } }, { extra: {} }]), 2); });
test('Köpfe: ohne Zustimmung nur lokal (data-URL), gleicher Name = gleicher Kopf', () => {
  const a = T.headUrl('Steve');
  assert.ok(a.startsWith('data:image/svg+xml'), 'kein fremder Dienst');
  assert.strictEqual(a, T.headUrl('steve'), 'Groß-/Kleinschreibung egal');
  assert.notStrictEqual(a, T.headUrl('Alex'));
  assert.strictEqual((T.headSvg('x').match(/<rect /g) || []).length, 64, '8×8 Pixel');
  assert.match(T.headUrl('Steve', { remote: true }), /^https:\/\/mc-heads\.net\/avatar\/Steve\/52$/);
  assert.ok(T.headUrl('<script>', { remote: true }).startsWith('data:'), 'seltsame Namen nie nach außen');
});
test('Bedrock-Spieler erkennen (Floodgate-Vorsilbe oder -UUID)', () => {
  assert.ok(T.isBedrock('.Handyheld')); assert.ok(T.isBedrock('x', '00000000-0000-0000-0009-01f2a3b4c5d6'));
  assert.ok(!T.isBedrock('Steve', '069a79f4-44e9-4726-a5be-fca90e38aaf5'));
});
test('Kommen und Gehen: Unterschied zweier Stände, erstes Laden zählt nicht', () => {
  const s1 = T.snapshot([{ id: 'a', state: 'running', extra: { players: ['Alex', 'Sam'] } }, { id: 'b', state: 'stopped', extra: {} }]);
  assert.deepStrictEqual(T.diff(null, s1), []);
  const s2 = T.snapshot([{ id: 'a', state: 'running', extra: { players: ['Sam', 'Kim'] } }, { id: 'b', state: 'stopped', extra: {} }, { id: 'c', state: 'running', extra: { players: ['Neu'] } }]);
  const d = T.diff(s1, s2, 1000);
  assert.deepStrictEqual(d.map((e) => `${e.kind}:${e.name}`).sort(), ['join:Kim', 'leave:Alex'], 'neuer Server c meldet nichts');
  assert.ok(d.every((e) => e.t === 1000 && e.server === 'a'));
});
test('Abgänge aus „zuletzt gesehen“ und Zusammenführen ohne Doppelte', () => {
  const NOW = 10 * 3600000;
  const st = { players: [{ name: 'Alex', last: NOW - 3600000 }, { name: 'Sam', online: true, last: NOW }, { name: 'Alt', last: NOW - 30 * 3600000 }] };
  const l = T.leavesFromStats('a', st, NOW);
  assert.deepStrictEqual(l.map((e) => e.name), ['Alex']);
  const j = T.journal([{ t: NOW - 3600000 + 30000, server: 'a', name: 'Alex', kind: 'leave' }], l);
  assert.strictEqual(j.length, 1, 'gleicher Abgang nur einmal');
  const many = T.journal([], Array.from({ length: 80 }, (_, i) => ({ t: i + 1, server: 'a', name: `p${i}`, kind: 'join' })));
  assert.strictEqual(many.length, 60); assert.strictEqual(many[0].name, 'p79', 'neueste zuerst');
});
