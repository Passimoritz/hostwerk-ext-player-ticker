/* Ticker – pure logic without DOM, tested in tests/lib.test.js (node --test). */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api; else root.Ticker = api;
}(typeof self !== 'undefined' ? self : this, () => {
  /** Spielzeit eines Eintrags aus /mc/servers/:id/stats (Hostwerk liefert playMs; ältere Fassungen playtime). */
  const playMs = (p) => Number(p.playMs ?? p.playtime ?? 0) || 0;
  /** Angehefteter Server zuerst, dann laufende, dann alphabetisch. */
  function sortServers(servers, pinned) {
    return [...(servers || [])].sort((a, b) => (b.id === pinned) - (a.id === pinned) || (b.state === 'running') - (a.state === 'running') || String(a.name).localeCompare(String(b.name)));
  }
  /** Spieler online über alle Server. */
  function onlineCount(servers) { return (servers || []).reduce((n, s) => n + ((s.extra && s.extra.players) || []).length, 0); }
  /** Die N mit der meisten Spielzeit (ohne Nullen). */
  function topPlayers(stats, size) {
    return ((stats && stats.players) || []).filter((p) => playMs(p) > 0).sort((a, b) => playMs(b) - playMs(a)).slice(0, Math.max(0, size || 0)).map((p) => ({ name: p.name, playMs: playMs(p) }));
  }
  return { playMs, sortServers, onlineCount, topPlayers };
}));
