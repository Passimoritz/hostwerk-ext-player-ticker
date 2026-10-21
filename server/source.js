'use strict';
/*
 * Daten für den Server-Teil: Minecraft-Server mit Spielern, Spiele-Server mit Spielern (Steam-Abfrage/A2S der
 * Erweiterung „Spiele-Server“), Statistik und die Einstellungen der Erweiterung.
 * Offizielles Paket → läuft im Hostwerk-Prozess: Hostwerks API über ctx.audit.selfCall, Spiele direkt über ctx.games.
 * Abgeschottet (z. B. Entwickler-Modus) → host.api mit den Rechten aus dem Manifest (read:minecraft, read:games …).
 * Fehlt etwas (keine Spiele-Server-Erweiterung, Hostwerk startet noch), kommt eine leere Liste statt eines Fehlers.
 */

function source(host) {
  const inProc = !host.sandboxed && host.ctx;
  const api = (p) => {
    if (typeof host.api === 'function') return host.api('GET', p);
    const a = host.ctx && host.ctx.audit;
    if (!a || typeof a.selfCall !== 'function') return Promise.reject(new Error('Hostwerk is still starting'));
    return a.selfCall('GET', p);
  };
  return {
    api,
    /** Einstellungen der Erweiterung (manifest.settings mit Standardwerten) */
    async settings() {
      try {
        if (typeof host.settings === 'function') return (await host.settings()) || {};
        return (host.ctx.extMarket && host.ctx.extMarket.settingsFor(host.id)) || {};
      } catch { return {}; }
    },
    /** [{ id, kind: 'minecraft', name, running, players: [namen], tps }] */
    async minecraft() {
      const o = await api('/overview').catch(() => ({}));
      return ((o && o.minecraft) || []).map((s) => {
        const ex = (s.proc && s.proc.extra) || {};
        return { id: String(s.id), kind: 'minecraft', name: String(s.name || s.id), running: !!(s.proc && s.proc.state === 'running'), players: (Array.isArray(ex.players) ? ex.players : []).map(String), tps: ex.tps != null ? Number(ex.tps) : null };
      });
    },
    /** Spiele-Server: [{ id, kind: 'game', name, game, running: true, players: [namen], seconds: { name: s }, count, max }] – nur laufende */
    async games() {
      let list = [];
      try {
        list = inProc && host.ctx.games && typeof host.ctx.games.allPlayers === 'function' ? await host.ctx.games.allPlayers() : await api('/games-players');
      } catch { list = []; }
      return (Array.isArray(list) ? list : []).map((g) => ({
        id: String(g.id), kind: 'game', name: String(g.name || g.id), game: g.game || null, running: true,
        players: (g.players || []).map((p) => String(p.name)).filter(Boolean),
        seconds: Object.fromEntries((g.players || []).filter((p) => p && p.name).map((p) => [String(p.name), Number(p.seconds) || 0])),
        count: Number(g.count) || (g.players || []).length, max: g.max != null ? Number(g.max) : null,
      }));
    },
    /** Statistik eines Minecraft-Servers (/mc/servers/:id/stats) */
    async mcStats(id) { try { return await api(`/mc/servers/${encodeURIComponent(id)}/stats`); } catch { return { players: [] }; } },
  };
}

/** Kurzer Zwischenspeicher – eine OBS-Ansicht fragt alle paar Sekunden, Hostwerk soll das kaum merken. */
function cached(fn, ms = 3000) {
  const memo = new Map();
  return async (key = '') => {
    const hit = memo.get(key);
    if (hit && Date.now() - hit.at < ms) return hit.value;
    const value = await fn(key);
    memo.set(key, { at: Date.now(), value });
    if (memo.size > 50) memo.delete(memo.keys().next().value);
    return value;
  };
}

module.exports = { source, cached };
