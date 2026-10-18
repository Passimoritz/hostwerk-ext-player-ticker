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
