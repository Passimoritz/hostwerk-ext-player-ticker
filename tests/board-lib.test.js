const test = require('node:test');
const assert = require('node:assert');
const B = require('../page/board-lib.js');
const NOW = Date.UTC(2026, 9, 18);
const stats = {
  freunde: { players: [{ name: 'Alex', playMs: 3600000, sessions: 3, last: NOW - 86400000, world: { mined: 100, deaths: 2 } }, { name: 'Sam', playMs: 7200000, sessions: 1, last: NOW - 30 * 86400000 }] },
  kreativ: { players: [{ name: 'alex', playMs: 5400000, sessions: 2, last: NOW - 3600000, world: { mined: 5, deaths: 0 } }, { name: 'Kim', playMs: 0, sessions: 0 }] },
};

test('gleicher Name auf mehreren Servern = eine Person, Werte addiert', () => {
  const all = B.merge(stats);
  const alex = all.find((p) => p.name.toLowerCase() === 'alex');
  assert.strictEqual(all.length, 3);
  assert.strictEqual(alex.playMs, 9000000); assert.strictEqual(alex.sessions, 5); assert.strictEqual(alex.world.mined, 105);
  assert.deepStrictEqual(alex.servers, ['freunde', 'kreativ']);
  assert.strictEqual(alex.last, NOW - 3600000);
});
test('Rangliste je Kennzahl, Nullen fallen raus', () => {
  // Ohne UUID zählt der Name; angezeigt wird die Schreibweise vom letzten Besuch (hier „alex“ auf „kreativ“)
  const all = B.merge(stats);
  assert.deepStrictEqual(B.rank(all, 'playMs').map((p) => [p.rank, p.name]), [[1, 'alex'], [2, 'Sam']]);
  assert.deepStrictEqual(B.rank(all, 'deaths').map((p) => p.name), ['alex']);
  assert.strictEqual(B.rank(all, 'unbekannt')[0].name, 'alex', 'unbekannte Kennzahl = Spielzeit');
});
test('aktiv in den letzten 7 Tagen', () => { assert.strictEqual(B.activeWeek(B.merge(stats), NOW), 1); });
test('leere Daten', () => { assert.deepStrictEqual(B.merge({}), []); assert.deepStrictEqual(B.rank([], 'playMs'), []); });

test('gleiche UUID = gleiche Person, auch nach Namenswechsel; neuester Name gewinnt', () => {
  const st = {
    a: { players: [{ name: 'AlterName', playMs: 1000, last: NOW - 5 * 86400000, world: { uuid: 'aaaa-bbbb', mined: 1 } }] },
    b: { players: [{ name: 'NeuerName', playMs: 2000, last: NOW - 3600000, world: { uuid: 'AAAABBBB', mined: 2 } }, { name: 'NeuerName', sessions: 4, playMs: 0, last: NOW }] },
  };
  const all = B.merge(st);
  assert.strictEqual(all.length, 1, JSON.stringify(all));
  assert.strictEqual(all[0].name, 'NeuerName');
  assert.strictEqual(all[0].playMs, 3000); assert.strictEqual(all[0].sessions, 4); assert.strictEqual(all[0].world.mined, 3);
  assert.deepStrictEqual(all[0].servers.sort(), ['a', 'b']);
});
test('verschiedene UUIDs mit gleichem Namen bleiben getrennt', () => {
  const all = B.merge({ a: { players: [{ name: 'Sam', playMs: 1, world: { uuid: 'x1' } }] }, b: { players: [{ name: 'Sam', playMs: 2, world: { uuid: 'x2' } }] } });
  assert.strictEqual(all.length, 2);
});
test('weitere Kennzahlen aus der Welt-Statistik', () => {
  const all = B.merge({ a: { players: [{ name: 'A', world: { uuid: '1', mobKills: 7, playerKills: 1, distanceKm: 1.25, crafted: 3 } }, { name: 'B', world: { uuid: '2', mobKills: 9, distanceKm: 0.3 } }] } });
  assert.deepStrictEqual(B.rank(all, 'mobKills').map((p) => [p.name, p.value]), [['B', 9], ['A', 7]]);
  assert.deepStrictEqual(B.rank(all, 'playerKills').map((p) => p.name), ['A']);
  assert.strictEqual(B.rank(all, 'distanceKm')[0].value, 1.3);
  assert.ok(B.METRICS.includes('crafted'));
});
test('Schnappschüsse: einer je Tag, alte fallen raus, Zeitraum = Stand minus Schnappschuss', () => {
  const D = 86400000;
  const p0 = B.merge({ a: { players: [{ name: 'Alex', playMs: 1000, sessions: 1, world: { uuid: 'u1', mined: 10 } }] } });
  let snaps = B.addSnapshot([], p0, NOW - 8 * D);
  snaps = B.addSnapshot(snaps, p0, NOW - 8 * D + 1000); // gleicher Tag → ersetzt
  assert.strictEqual(snaps.length, 1);
  const p1 = B.merge({ a: { players: [{ name: 'Alex', playMs: 5000, sessions: 3, world: { uuid: 'u1', mined: 25 } }, { name: 'Neu', playMs: 700, world: { uuid: 'u2' } }] } });
  snaps = B.addSnapshot(snaps, p1, NOW);
  assert.strictEqual(snaps.length, 2);
  const week = B.period(p1, snaps, 7, NOW);
  assert.strictEqual(week.since, B.dayKey(NOW - 8 * D));
  const alex = week.players.find((p) => p.name === 'Alex');
  assert.strictEqual(alex.playMs, 4000); assert.strictEqual(alex.sessions, 2); assert.strictEqual(alex.world.mined, 15);
  assert.strictEqual(week.players.find((p) => p.name === 'Neu').playMs, 700, 'neu seit dem Schnappschuss: alles zählt');
  assert.strictEqual(B.addSnapshot(snaps, p1, NOW + 60 * D).length, 1, 'älter als 40 Tage fällt raus');
  assert.deepStrictEqual(B.period(p1, snaps, 0, NOW).players, p1, 'gesamt = unverändert');
  assert.deepStrictEqual(B.period(p1, [], 7, NOW).players, [], 'ohne Schnappschuss noch nichts');
});
test('Schnappschüsse passen in den Speicher', () => {
  const many = Array.from({ length: 300 }, (_, i) => ({ key: `u:${i}`, name: `p${i}`, playMs: i * 1000, sessions: i, last: i, world: { mined: i } }));
  let snaps = [];
  for (let d = 0; d < 40; d++) snaps = B.addSnapshot(snaps, many, NOW - (40 - d) * 86400000, 60);
  assert.ok(Object.keys(snaps[0].v).length <= 150, 'höchstens 150 Spieler je Schnappschuss');
  const fitted = B.fit(snaps, 50 * 1024);
  assert.ok(JSON.stringify(fitted).length <= 50 * 1024 && fitted.length >= 1);
  assert.strictEqual(fitted[fitted.length - 1].day, snaps[snaps.length - 1].day, 'der neueste bleibt');
});
test('Bedrock-Spieler erkennen (Floodgate-Vorsilbe oder -UUID)', () => {
  assert.ok(B.isBedrock({ name: '.Handyheld' }));
  assert.ok(B.isBedrock({ name: 'x', world: { uuid: '00000000-0000-0000-0009-01f2a3b4c5d6' } }));
  assert.ok(!B.isBedrock({ name: 'Steve', world: { uuid: '069a79f4-44e9-4726-a5be-fca90e38aaf5' } }));
});
