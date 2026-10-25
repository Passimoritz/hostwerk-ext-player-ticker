'use strict';
/*
 * „Als Webseite bereitstellen“ (Hostwerk mit SDK 3.2, host.sites): eine eigenständige Bestenliste in einem Webserver –
 * index.html (Aussehen, Texte, Logik ohne fremde Skripte) + data.json (nur Platz, Name nach Datenschutz-Wahl, Wert).
 * Hostwerk schreibt beides in den gewählten Unterordner und erneuert data.json im eingestellten Takt.
 */
const B = require('../page/board-lib.js');

const DEFAULTS = { title: '', metrics: ['playMs'], limit: 10, days: 0, server: '', theme: 'auto', accent: '#eab308', names: 'full', lang: 'auto', refresh: 60 };
const HEX = /^#[0-9a-f]{6}$/i;

/** Einstellungen säubern – alles, was von außen kommt, wird auf erlaubte Werte gebracht. */
function options(raw, hostLang = 'de') {
  const o = { ...DEFAULTS, ...(raw && typeof raw === 'object' ? raw : {}) };
  const metrics = (Array.isArray(o.metrics) ? o.metrics : [o.metrics]).filter((m) => B.METRICS.includes(m));
  return {
    title: String(o.title || '').trim().slice(0, 80),
    metrics: metrics.length ? [...new Set(metrics)].slice(0, 4) : ['playMs'],
    limit: Math.max(3, Math.min(50, Math.round(Number(o.limit)) || 10)),
    days: [7, 30].includes(Number(o.days)) ? Number(o.days) : 0,
    server: typeof o.server === 'string' ? o.server.slice(0, 60) : '',
    theme: ['auto', 'light', 'dark'].includes(o.theme) ? o.theme : 'auto',
    accent: HEX.test(o.accent || '') ? o.accent : DEFAULTS.accent,
    names: ['full', 'short', 'hidden'].includes(o.names) ? o.names : 'full',
    lang: o.lang === 'de' || o.lang === 'en' ? o.lang : (hostLang === 'en' ? 'en' : 'de'),
    refresh: Math.max(30, Math.min(3600, Math.round(Number(o.refresh)) || 60)),
  };
}

/** Öffentliche Daten: je Kennzahl die Bestenliste – nur Platz, (geschützter) Name, Wert, Bedrock. */
function data(statsByServer, snaps, opt, now = Date.now()) {
  const boards = opt.metrics.map((metric) => {
    const b = B.board(statsByServer, { snaps, metric, days: opt.days, server: opt.server, limit: opt.limit, now });
    return { metric: b.metric, days: b.days, since: b.since, players: b.players.map((p) => ({ rank: p.rank, name: B.publicName(p.name, opt.names, p.rank, opt.lang), value: p.value, bedrock: opt.names === 'full' ? p.bedrock : false })) };
  });
  return { at: now, boards };
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const TEXT = {
  de: { title: 'Bestenliste', metric: { playMs: 'Spielzeit', sessions: 'Besuche', mined: 'Abgebaut', deaths: 'Tode', mobKills: 'Monster besiegt', playerKills: 'Spieler besiegt', distanceKm: 'Strecke', crafted: 'Hergestellt' }, days: { 7: 'letzte 7 Tage', 30: 'letzte 30 Tage' }, empty: 'Noch keine Werte.', updated: 'Stand', error: 'Daten gerade nicht erreichbar – neuer Versuch gleich.', place: 'Platz' },
  en: { title: 'Leaderboard', metric: { playMs: 'Playtime', sessions: 'Visits', mined: 'Mined', deaths: 'Deaths', mobKills: 'Mobs killed', playerKills: 'Players killed', distanceKm: 'Distance', crafted: 'Crafted' }, days: { 7: 'last 7 days', 30: 'last 30 days' }, empty: 'No values yet.', updated: 'Updated', error: 'Data not reachable right now – trying again shortly.', place: 'Place' },
};

/** Eigenständige Seite: liest data.json im Takt neu, Hell/Dunkel nach Wahl oder System, Akzentfarbe, Sprache. */
function page(opt) {
  const L = TEXT[opt.lang] || TEXT.de;
  const title = opt.title || L.title;
  const themeAttr = opt.theme === 'auto' ? '' : ` data-theme="${opt.theme}"`;
  const cfg = JSON.stringify({ lang: opt.lang, refresh: opt.refresh, text: L }).replace(/</g, '\\u003c');
  return `<!doctype html>
<html lang="${opt.lang}"${themeAttr}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="generator" content="Hostwerk – Spieler-Bestenliste">
<title>${esc(title)}</title>
<style>
:root { --bg: #f7f7f8; --card: #ffffff; --fg: #18181b; --muted: #52525b; --line: #e4e4e7; --accent: ${opt.accent}; color-scheme: light dark; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg: #111113; --card: #1b1b1f; --fg: #f4f4f5; --muted: #a1a1aa; --line: #2e2e33; } }
:root[data-theme="dark"] { --bg: #111113; --card: #1b1b1f; --fg: #f4f4f5; --muted: #a1a1aa; --line: #2e2e33; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--fg); font: 16px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
main { max-width: 960px; margin: 0 auto; padding: 24px 16px 48px; }
h1 { margin: 0 0 4px; font-size: 1.75rem; }
.sub { color: var(--muted); margin: 0 0 20px; font-size: .9rem; }
.boards { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }
section { background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 16px; }
h2 { margin: 0 0 8px; font-size: 1.1rem; border-left: 4px solid var(--accent); padding-left: 8px; }
h2 small { color: var(--muted); font-weight: 500; font-size: .8rem; margin-left: 6px; }
ol { list-style: none; margin: 0; padding: 0; }
li { display: flex; gap: 10px; align-items: center; padding: 6px 0; border-top: 1px solid var(--line); }
li:first-child { border-top: 0; }
.place { width: 2em; text-align: center; font-weight: 700; color: var(--muted); }
li.top .place { color: var(--fg); background: color-mix(in srgb, var(--accent) 30%, transparent); border-radius: 999px; }
.name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; }
.value { font-variant-numeric: tabular-nums; font-weight: 700; }
.note { color: var(--muted); font-size: .9rem; }
</style>
</head>
<body>
<main>
<h1>${esc(title)}</h1>
<p class="sub" id="sub" aria-live="polite"></p>
<div class="boards" id="boards"></div>
</main>
<script>
(function () {
  var C = ${cfg};
  var T = C.text;
  var loc = C.lang === 'en' ? 'en-GB' : 'de-DE';
  function num(n) { return Number(n).toLocaleString(loc); }
  function dur(ms) { var m = Math.round(ms / 60000); var h = Math.floor(m / 60); return h ? num(h) + ' h ' + (m % 60) + ' min' : m + ' min'; }
  function val(metric, v) { return metric === 'playMs' ? dur(v) : metric === 'distanceKm' ? num(v) + ' km' : num(v); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function draw(d) {
    var box = document.getElementById('boards');
    box.replaceChildren.apply(box, (d.boards || []).map(function (b) {
      var s = el('section'); var h = el('h2', '', T.metric[b.metric] || b.metric);
      if (b.days) h.appendChild(el('small', '', T.days[b.days]));
      s.appendChild(h);
      if (!b.players.length) { s.appendChild(el('p', 'note', T.empty)); return s; }
      var ol = el('ol');
      b.players.forEach(function (p) {
        var li = el('li', p.rank <= 3 ? 'top' : '');
        var pl = el('span', 'place', String(p.rank)); pl.setAttribute('aria-label', T.place + ' ' + p.rank);
        li.appendChild(pl); li.appendChild(el('span', 'name', p.name)); li.appendChild(el('span', 'value', val(b.metric, p.value)));
        ol.appendChild(li);
      });
      s.appendChild(ol); return s;
    }));
    document.getElementById('sub').textContent = T.updated + ': ' + new Date(d.at).toLocaleString(loc, { dateStyle: 'medium', timeStyle: 'short' });
  }
  function tick() {
    fetch('data.json?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(draw).catch(function () { document.getElementById('sub').textContent = T.error; });
  }
  tick();
  setInterval(tick, Math.max(30, C.refresh) * 1000);
}());
</script>
</body>
</html>
`;
}

module.exports = { DEFAULTS, options, data, page };
