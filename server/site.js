'use strict';
/*
 * „Als Webseite bereitstellen“ (Hostwerk mit SDK 3.2, host.sites): „Wer ist online?“ als eigenständige Seite in einem
 * Webserver – index.html (Aussehen, Texte, Logik ohne fremde Skripte) + data.json (Servernamen, Zahlen und – je nach
 * Datenschutz-Wahl – Spielernamen, gekürzt oder gar keine). Hostwerk erneuert data.json im eingestellten Takt.
 */
const DEFAULTS = { title: '', server: '', showOffline: true, names: 'full', theme: 'auto', accent: '#23964a', lang: 'auto', refresh: 60 };
const HEX = /^#[0-9a-f]{6}$/i;

function options(raw, hostLang = 'de') {
  const o = { ...DEFAULTS, ...(raw && typeof raw === 'object' ? raw : {}) };
  return {
    title: String(o.title || '').trim().slice(0, 80),
    server: typeof o.server === 'string' ? o.server.slice(0, 60) : '',
    showOffline: o.showOffline !== false,
    names: ['full', 'short', 'count'].includes(o.names) ? o.names : 'full',
    theme: ['auto', 'light', 'dark'].includes(o.theme) ? o.theme : 'auto',
    accent: HEX.test(o.accent || '') ? o.accent : DEFAULTS.accent,
    lang: o.lang === 'de' || o.lang === 'en' ? o.lang : (hostLang === 'en' ? 'en' : 'de'),
    refresh: Math.max(30, Math.min(3600, Math.round(Number(o.refresh)) || 60)),
  };
}
/** Name für die öffentliche Seite: voll, gekürzt (erste zwei Zeichen, ohne Bedrock-Punkt) – bei „count“ gar keiner. */
const shortName = (n) => { const c = String(n || '?').replace(/^[.*]/, ''); return `${c.slice(0, 2)}…`; };

/** Öffentliche Daten aus publicPlayers() (page/lib.js): nur Namen der Server, Zahlen und ggf. Spielernamen. */
function data(pub, opt) {
  const servers = ((pub && pub.servers) || []).map((s) => ({
    name: s.name, game: s.game || null, running: !!s.running, count: (s.players || []).length, max: s.max != null ? s.max : null,
    players: opt.names === 'count' ? [] : (s.players || []).map((n) => (opt.names === 'short' ? shortName(n) : String(n))).sort((a, b) => a.localeCompare(b)),
  }));
  return { at: (pub && pub.at) || Date.now(), total: servers.reduce((n, s) => n + s.count, 0), names: opt.names !== 'count', servers };
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const TEXT = {
  de: { title: 'Wer ist online?', online: '{n} online', total: '{n} Spieler online', off: 'aus', nobody: 'Gerade niemand da.', updated: 'Stand', error: 'Daten gerade nicht erreichbar – neuer Versuch gleich.', empty: 'Keine Server.' },
  en: { title: 'Who is online?', online: '{n} online', total: '{n} players online', off: 'off', nobody: 'Nobody here right now.', updated: 'Updated', error: 'Data not reachable right now – trying again shortly.', empty: 'No servers.' },
};

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
<meta name="generator" content="Hostwerk – Spieler-Ticker">
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
.total { font-size: 1.25rem; font-weight: 700; margin: 0 0 16px; }
.servers { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }
section { background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 16px; }
h2 { margin: 0 0 8px; font-size: 1.05rem; display: flex; gap: 8px; align-items: center; }
.dot { width: 10px; height: 10px; border-radius: 50%; background: var(--accent); flex: none; }
.dot.off { background: transparent; box-shadow: inset 0 0 0 2px var(--muted); }
.count { margin-left: auto; color: var(--muted); font-weight: 600; font-size: .9rem; font-variant-numeric: tabular-nums; }
ul { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 6px; }
li { padding: 2px 10px; border-radius: 999px; background: color-mix(in srgb, var(--accent) 18%, transparent); font-weight: 600; }
.note { color: var(--muted); font-size: .9rem; margin: 0; }
</style>
</head>
<body>
<main>
<h1>${esc(title)}</h1>
<p class="sub" id="sub" aria-live="polite"></p>
<p class="total" id="total"></p>
<div class="servers" id="servers"></div>
</main>
<script>
(function () {
  var C = ${cfg};
  var T = C.text;
  var loc = C.lang === 'en' ? 'en-GB' : 'de-DE';
  function fill(s, n) { return s.replace('{n}', Number(n).toLocaleString(loc)); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function draw(d) {
    document.getElementById('total').textContent = fill(T.total, d.total);
    var box = document.getElementById('servers');
    var list = (d.servers || []).map(function (s) {
      var sec = el('section'); var h = el('h2'); var dot = el('span', s.running ? 'dot' : 'dot off'); dot.setAttribute('aria-hidden', 'true');
      h.appendChild(dot); h.appendChild(el('span', '', s.name + (s.game ? ' · ' + s.game : '')));
      h.appendChild(el('span', 'count', s.running ? (s.max ? s.count + ' / ' + s.max : fill(T.online, s.count)) : T.off));
      sec.appendChild(h);
      if (d.names && s.players.length) { var ul = el('ul'); s.players.forEach(function (n) { ul.appendChild(el('li', '', n)); }); sec.appendChild(ul); }
      else if (s.running && !s.count) sec.appendChild(el('p', 'note', T.nobody));
      return sec;
    });
    if (!list.length) list = [el('p', 'note', T.empty)];
    box.replaceChildren.apply(box, list);
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

module.exports = { DEFAULTS, options, data, page, shortName };
