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

  /* ---------- Köpfe ohne fremden Dienst: ein kleines Pixel-Gesicht aus dem Namen ---------- */
  function hash(s) { let h = 2166136261; for (const c of String(s || '')) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  /**
   * Ersatz-Kopf als SVG (8×8 wie Minecraft-Köpfe): Haar- und Hautfarbe aus dem Namen, immer gleich für denselben Namen.
   * Läuft offline, kein Spielername verlässt den Rechner.
   */
  function headSvg(name) {
    const h = hash(String(name || '').toLowerCase());
    const hue = h % 360; const skin = [28, 30, 24, 20, 34][(h >>> 9) % 5]; const light = 52 + ((h >>> 12) % 26);
    const hair = `hsl(${hue} 45% ${22 + ((h >>> 5) % 18)}%)`; const face = `hsl(${skin} 45% ${light}%)`; const eye = `hsl(${(hue + 180) % 360} 55% 35%)`;
    const fringe = 2 + ((h >>> 16) % 2);
    const px = [];
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      let c = face;
      if (y < fringe || ((x === 0 || x === 7) && y < 5)) c = hair;
      if (y === 4 && (x === 1 || x === 5)) c = '#ffffff';
      if (y === 4 && (x === 2 || x === 6)) c = eye;
      if (y === 6 && x >= 3 && x <= 4) c = `hsl(${skin} 40% ${light - 18}%)`;
      px.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${c}"/>`);
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8" shape-rendering="crispEdges">${px.join('')}</svg>`;
  }
  /** Adresse für <img src>: data-URL des Ersatz-Kopfs – oder (nur wenn der Nutzer es einschaltet) mc-heads.net. */
  function headUrl(name, { remote = false, size = 52 } = {}) {
    if (remote && /^[A-Za-z0-9_.*-]{1,32}$/.test(String(name || ''))) return `https://mc-heads.net/avatar/${encodeURIComponent(name)}/${size}`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(headSvg(name))}`;
  }
  /** Bedrock-Spieler über Geyser/Floodgate: Name mit Vorsilbe (Standard „.“) oder Floodgate-UUID (beginnt mit Nullen). */
  function isBedrock(name, uuid) {
    if (/^[.*]/.test(String(name || ''))) return true;
    return /^0{8}-?0{4}-?0{4}-/.test(String(uuid || ''));
  }

  /* ---------- Kommen und Gehen ---------- */
  /**
   * Unterschied zweier Stände { serverId: [namen] } → Ereignisse [{ t, server, name, kind: 'join'|'leave' }].
   * Server, die im alten Stand fehlen, liefern nichts (erstes Laden ist kein „alle kamen gerade“).
   */
  function diff(before, after, now = Date.now()) {
    const out = [];
    if (!before) return out;
    for (const [server, names] of Object.entries(after || {})) {
      if (!(server in before)) continue;
      const old = new Set(before[server] || []); const cur = new Set(names || []);
      for (const n of cur) if (!old.has(n)) out.push({ t: now, server, name: n, kind: 'join' });
      for (const n of old) if (!cur.has(n)) out.push({ t: now, server, name: n, kind: 'leave' });
    }
    return out;
  }
  /** Stand aus der Serverliste: { serverId: [namen] } (gestoppte Server = niemand). */
  function snapshot(servers) { return Object.fromEntries((servers || []).map((s) => [s.id, s.state === 'running' ? [...((s.extra && s.extra.players) || [])] : []])); }
  /**
   * Abgänge aus der Statistik (Hostwerk merkt sich „zuletzt gesehen“) für die Zeit, in der die Seite zu war:
   * Spieler offline, letzter Besuch in den letzten hours Stunden → Ereignis „leave“.
   */
  function leavesFromStats(server, stats, now = Date.now(), hours = 24) {
    return ((stats && stats.players) || []).filter((p) => p && !p.online && p.last && now - p.last < hours * 3600000).map((p) => ({ t: p.last, server, name: p.name, kind: 'leave' }));
  }
  /** Ereignisse zusammenführen: ohne Doppelte (gleicher Spieler, Server, Art innerhalb von 2 Minuten), neueste zuerst, höchstens max. */
  function journal(list, add, max = 60) {
    const all = [...(add || []), ...(list || [])].filter((e) => e && e.name && e.t).sort((a, b) => b.t - a.t);
    const out = [];
    for (const e of all) if (!out.some((x) => x.name === e.name && x.server === e.server && x.kind === e.kind && Math.abs(x.t - e.t) < 120000)) out.push(e);
    return out.slice(0, max);
  }
  return { playMs, sortServers, onlineCount, topPlayers, headSvg, headUrl, isBedrock, diff, snapshot, leavesFromStats, journal };
}));
