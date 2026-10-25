// Players – leaderboard view for OBS (/v/player-ticker/board-obs.html, permission share:view; until 1.6 the own extension
// “Player leaderboard” at /v/player-leaderboard/ – Hostwerk forwards old addresses). Runs WITHOUT Hostwerk around it: no SDK,
// data only from the extension's own public server part (/api/x/player-ticker/pub/board), texts built in.
// Address options: ?metric=playMs|sessions|mined|deaths|mobKills|playerKills|distanceKm|crafted · ?days=7|30 · ?server=<id>
//                  · ?limit=10 · ?theme=light · ?lang=de · ?size=20 (font size in px) · ?title=0 (no heading)
(function () {
  const q = new URLSearchParams(location.search);
  const lang = (q.get('lang') || navigator.language || 'en').slice(0, 2) === 'de' ? 'de' : 'en';
  const TEXT = {
    de: { metric: { playMs: 'Spielzeit', sessions: 'Besuche', mined: 'Abgebaut', deaths: 'Tode', mobKills: 'Monster besiegt', playerKills: 'Spieler besiegt', distanceKm: 'Strecke', crafted: 'Hergestellt' }, days: { 7: '7 Tage', 30: '30 Tage' }, empty: 'Noch keine Werte.', off: 'Die Stream-Ansicht ist in Hostwerk nicht freigegeben (Einstellungen → Erweiterungen → Spieler → „Bestenliste ohne Anmeldung freigeben“).', error: 'Hostwerk antwortet gerade nicht – neuer Versuch gleich.' },
    en: { metric: { playMs: 'Playtime', sessions: 'Visits', mined: 'Mined', deaths: 'Deaths', mobKills: 'Mobs killed', playerKills: 'Players killed', distanceKm: 'Distance', crafted: 'Crafted' }, days: { 7: '7 days', 30: '30 days' }, empty: 'No values yet.', off: 'The stream view is not shared in Hostwerk (Settings → Extensions → Players → “Share the leaderboard without login”).', error: 'Hostwerk does not answer right now – trying again shortly.' },
  }[lang];
  document.documentElement.lang = lang;
  if (q.get('theme') === 'light') document.documentElement.dataset.theme = 'light';
  const size = Number(q.get('size'));
  if (size >= 10 && size <= 120) document.documentElement.style.setProperty('--size', `${size}px`);
  const params = new URLSearchParams();
  for (const k of ['metric', 'days', 'server', 'limit']) if (q.get(k)) params.set(k, q.get(k));
  const api = `/api/x/player-ticker/pub/board${params.toString() ? `?${params}` : ''}`;
  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const num = (n) => Number(n).toLocaleString(lang === 'de' ? 'de-DE' : 'en-US');
  /** Spielzeit wie in Hostwerk: 3 h 12 min / 45 min */
  const duration = (ms) => { const m = Math.round(ms / 60000); const h = Math.floor(m / 60); return h ? `${num(h)} h ${m % 60} min` : `${m} min`; };
  const value = (metric, v) => (metric === 'playMs' ? duration(v) : metric === 'distanceKm' ? `${num(v)} km` : num(v));

  function note(text) { $('note').hidden = !text; $('note').textContent = text || ''; }
  function draw(data) {
    const title = $('title');
    title.replaceChildren();
    if (q.get('title') !== '0') { title.append(document.createTextNode(TEXT.metric[data.metric] || data.metric)); if (data.days) title.append(el('small', '', TEXT.days[data.days])); }
    $('list').replaceChildren(...(data.players || []).map((p) => {
      const li = el('li', p.rank <= 3 ? 'top' : '');
      li.append(el('span', 'place', String(p.rank)), el('span', 'name', p.name), el('span', 'value', value(data.metric, p.value)));
      return li;
    }));
    note((data.players || []).length ? '' : TEXT.empty);
  }
  async function tick() {
    try {
      const r = await fetch(api, { cache: 'no-store' });
      if (r.status === 403) { $('title').replaceChildren(); $('list').replaceChildren(); note(TEXT.off); return; }
      if (!r.ok) throw new Error(String(r.status));
      draw(await r.json());
    } catch { note(TEXT.error); }
  }
  tick();
  setInterval(tick, 30000);
}());
