// Spieler – Teil „Bestenliste“ (bis 1.6 eigene Erweiterung „Spieler-Bestenliste“): Spielzeit, Besuche, Abgebautes, Tode und
// mehr über alle (oder einen) Minecraft-Server, gesamt oder für die letzte Woche/den letzten Monat (Schnappschüsse im
// Speicher der Erweiterung). Spiele-Server: Spielzeit und Besuche zählt der Server-Teil über die Steam-Abfrage.
// Läuft gekapselt neben dem Ticker auf derselben Seite (Reiter „Bestenliste“) und allein als Abschnitt im Reiter „Spieler“
// eines Minecraft-Servers (page/section-board.html). Eigene Element-Kennungen (lb-…) und Texte (lb.…), damit sich die
// beiden Teile nie in die Quere kommen.
(function () {
  const { html } = Hostwerk;
  const t = (k, v) => Hostwerk.t(`lb.${k}`, v);
  const B = Leaderboard;
  const MEDAL = ['🥇', '🥈', '🥉'];
  const STATS_TTL = 30000; // Statistik je Server höchstens alle 30 s neu holen
  let metric = null; let server = ''; let days = 0; let query = ''; let profile = null; // profile = key des geöffneten Spielers
  let active = false;
  const inSection = () => Hostwerk.embed === 'section';
  let lastMerged = [];
  let servers = [];
  let snaps = [];
  let snapsLoaded = false;
  const cache = new Map(); // Server → { at, data }

  const fmtValue = (m, v) => (m === 'playMs' ? Hostwerk.fmt.duration(v) : m === 'distanceKm' ? t('km', { n: Hostwerk.fmt.number(v) }) : Hostwerk.fmt.number(v));
  const $ = (id) => document.getElementById(`lb-${id}`);

  async function settings() { try { return await Hostwerk.settings.get(); } catch { return {}; } }
  async function statsOf(id, force) {
    const c = cache.get(id);
    if (c && !force && Date.now() - c.at < STATS_TTL) return c.data;
    let data;
    try { data = await Hostwerk.get(`/mc/servers/${encodeURIComponent(id)}/stats`); } catch { data = { players: [] }; }
    cache.set(id, { at: Date.now(), data });
    return data;
  }

  function drawPicker() {
    const sel = $('server');
    if (!sel) return;
    if (!servers.some((s) => s.id === server)) server = '';
    Hostwerk.render(sel, html`<option value="">${t('allServers')}</option>${servers.map((s) => html`<option value="${s.id}" ${s.id === server ? Hostwerk.raw('selected') : ''}>${s.name}</option>`)}`);
    sel.setAttribute('aria-label', t('pick_server'));
  }
  function drawSeg(id, attr, cur) { for (const b of document.querySelectorAll(`#lb-${id} button[${attr}]`)) { const on = b.getAttribute(attr) === String(cur); b.classList.toggle('primary', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); } }

  function entry(p) {
    // Medaille nur als Bild, der Platz als Text für Bildschirmleser
    const place = html`<span class="place"><span aria-hidden="true">${p.rank <= 3 ? MEDAL[p.rank - 1] : p.rank}</span><span class="sr">${t('place', { n: p.rank })}</span></span>`;
    const name = html`<button type="button" class="grow ellipsis entry-name" data-lb-profile="${p.key}" aria-expanded="${profile === p.key ? 'true' : 'false'}" title="${t('profileOpen')}">${p.name}</button>`;
    return html`<div class="entry ${p.rank <= 3 ? 'top' : ''}">${place}${name}${B.isBedrock(p) ? html`<span class="badge" title="${t('bedrockTitle')}">${t('bedrock')}</span>` : ''}${p.servers.length > 1 ? html`<span class="badge">${t('servers', { n: p.servers.length })}</span>` : ''}<span class="value">${fmtValue(metric, p.value)}</span></div>`;
  }

  /** Profilkarte: alle Werte, Abzeichen und der Verlauf der gewählten Kennzahl (aus den täglichen Schnappschüssen). */
  function profileCard(p) {
    if (!p) return '';
    const hist = B.history(snaps, p.key || p.name, metric);
    const vals = B.METRICS.map((m) => html`<div class="kv"><span class="muted small">${t('metric.' + m)}</span><b>${fmtValue(m, m === 'playMs' ? p.playMs : m === 'sessions' ? p.sessions : (p.world || {})[m] || 0)}</b></div>`);
    const badges = B.badges(p);
    return html`<div class="card card-pad stack profile" role="region" aria-label="${t('profileOf', { name: p.name })}">
      <div class="row"><b class="grow">${p.name}</b>${B.isBedrock(p) ? html`<span class="badge">${t('bedrock')}</span>` : ''}<button type="button" class="btn sm ghost" data-lb-profile-close>${t('close')}</button></div>
      <div class="tiny muted">${t('lastSeen', { when: p.last ? new Date(p.last).toLocaleString(Hostwerk.lang === 'en' ? 'en-GB' : 'de-DE') : '–' })} · ${t('servers', { n: (p.servers || []).length })}</div>
      <div class="kvs">${vals}</div>
      ${badges.length ? html`<div class="badges" role="list" aria-label="${t('badges')}">${badges.map((b) => html`<span role="listitem" class="${`badge lvl${b.level}`}" title="${t('badge.' + b.id + '.hint')}">${t('badge.' + b.id)} ${'★'.repeat(b.level)}</span>`)}</div>` : html`<div class="tiny muted">${t('noBadges')}</div>`}
      ${hist.length > 1 ? html`<div class="stack"><span class="small muted">${t('historyOf', { metric: t('metric.' + metric) })}</span>${spark(hist)}</div>` : html`<div class="tiny muted">${t('historySoon')}</div>`}
    </div>`;
  }
  /** Kleines Verlaufsdiagramm (SVG, ohne Bibliothek), mit Text-Alternative. */
  function spark(hist) {
    const W = 320; const H = 64; const max = Math.max(1, ...hist.map((x) => x.value)); const min = Math.min(...hist.map((x) => x.value));
    const pts = hist.map((x, i) => `${Math.round((i / (hist.length - 1)) * W)},${Math.round(H - 4 - ((x.value - min) / Math.max(1, max - min)) * (H - 8))}`).join(' ');
    const first = hist[0]; const last = hist[hist.length - 1];
    const label = t('historyAlt', { from: first.day, to: last.day, a: fmtValue(metric, first.value), b: fmtValue(metric, last.value) });
    return html`<svg class="spark" viewBox="${`0 0 ${W} ${H}`}" role="img" aria-label="${label}"><polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"></polyline></svg>`;
  }

  async function load(force = false) {
    const st = await settings();
    if (inSection() && Hostwerk.context && Hostwerk.context.kind === 'minecraft') server = Hostwerk.context.id; // Abschnitt: dieser Server
    if (!metric) metric = B.METRICS.includes(st.boardMetric) ? st.boardMetric : 'playMs';
    const limit = inSection() ? 10 : Math.max(3, Math.min(100, Number(st.boardLimit) || 20));
    const list = await Hostwerk.get('/mc/servers').catch(() => []);
    const mc = (Array.isArray(list) ? list : []).map((s) => ({ id: s.id, name: s.name }));
    // Ohne Spiele-Server (oder ältere Hostwerk-Fassung) einfach keine
    const gb = await Hostwerk.backend('GET', '/games-board').catch(() => null);
    const games = (gb && Array.isArray(gb.servers) ? gb.servers : []).map((s) => ({ id: s.id, name: s.game && s.game !== s.name ? `${s.name} · ${s.game}` : s.name }));
    servers = [...mc, ...games];
    drawPicker(); drawSeg('metrics', 'data-m', metric); drawSeg('periods', 'data-d', days);
    if (!servers.length) { if ($('sub')) $('sub').textContent = ''; Hostwerk.render('#lb-list', html`<div class="empty"><h3>${t('noServers')}</h3><p class="muted small">${t('noServersHint')}</p></div>`); return; }
    // Gesamtwerte aller Server (für Schnappschüsse immer alle), angezeigt wird der gewählte
    const all = {};
    await Promise.all(mc.map(async (s) => { all[s.id] = await statsOf(s.id, force); }));
    if (gb && gb.stats) Object.assign(all, gb.stats);
    if (!snapsLoaded) { try { snaps = (await Hostwerk.storage.get('snapshots')) || []; } catch { snaps = []; } snapsLoaded = true; }
    const merged = B.merge(all);
    const next = B.fit(B.addSnapshot(snaps, merged));
    if (JSON.stringify(next[next.length - 1]) !== JSON.stringify(snaps[snaps.length - 1])) { snaps = next; Hostwerk.storage.set('snapshots', snaps).catch(() => {}); }
    lastMerged = merged;
    const chosen = server ? B.merge({ [server]: all[server] }) : merged;
    const per = B.period(chosen, snaps, days);
    if ($('sub')) $('sub').textContent = t('summary', { n: Hostwerk.fmt.number(merged.length), week: Hostwerk.fmt.number(B.activeWeek(merged)) });
    Hostwerk.render('#lb-since', days && per.since ? html`<span class="tiny muted">${t('since', { date: new Date(`${per.since}T12:00:00`).toLocaleDateString(Hostwerk.lang === 'de' ? 'de-DE' : 'en-US', { day: 'numeric', month: 'long' }) })}</span>` : '');
    // Suche: Platz bleibt der aus der ganzen Liste (nicht neu durchgezählt)
    const ranked = B.search(B.rank(per.players, metric, query ? 1000 : limit), query).slice(0, limit);
    Hostwerk.render('#lb-list', ranked.length
      ? html`<div class="stack" role="list" aria-label="${t('metric.' + metric)}">${ranked.map((p) => html`<div role="listitem">${entry(p)}</div>`)}</div>`
      : html`<div class="empty"><h3>${t(query ? 'noMatch' : days ? 'noDataPeriod' : 'noData')}</h3>${days && !query ? html`<p class="muted small">${t('noDataPeriodHint')}</p>` : ''}</div>`);
    drawProfile();
  }
  function drawProfile() {
    const box = $('profile'); if (!box) return;
    const p = profile && lastMerged.find((x) => x.key === profile);
    Hostwerk.render(box, p ? profileCard(p) : '');
  }
  const reload = (force) => (active ? Live.guard(Hostwerk, '#lb-list', () => load(force)) : Promise.resolve());

  document.addEventListener('click', (e) => {
    if (!active) return;
    const pb = e.target.closest('[data-lb-profile]');
    if (pb) { profile = profile === pb.dataset.lbProfile ? null : pb.dataset.lbProfile; drawProfile(); reload(); }
    if (e.target.closest('[data-lb-profile-close]')) { profile = null; drawProfile(); reload(); }
    if (e.target.closest('[data-lb-open-page]')) Hostwerk.navigate('/ext/player-ticker').catch(() => {});
    const m = e.target.closest('#lb-metrics button[data-m]');
    if (m) { metric = m.dataset.m; reload(); }
    const d = e.target.closest('#lb-periods button[data-d]');
    if (d) { days = Number(d.dataset.d) || 0; reload(); }
  });
  if ($('server')) $('server').addEventListener('change', (e) => { server = e.target.value; reload(); });
  if ($('search')) $('search').addEventListener('input', Live.throttle((e) => { query = e.target.value; reload(); }, 300));

  /** Für die Seite: Reiter „Bestenliste“ zeigen bzw. ruhen lassen (der Ticker ruft das beim Reiterwechsel). */
  window.Board = {
    show() { active = true; return reload(); },
    hide() { active = false; },
  };

  Hostwerk.ready().then(() => {
    if ($('search')) $('search').setAttribute('aria-label', t('searchPlayer'));
    if (inSection()) window.Board.show(); // Abschnitt im Reiter „Spieler“: immer an
    // Kam oder ging jemand, nur diesen Server neu holen – und höchstens alle 10 s neu zeichnen
    const changed = Live.throttle(() => reload(), 10000);
    Hostwerk.on('minecraft', (s) => { if (s && s.id) cache.delete(s.id); changed(); });
    Hostwerk.on('settings', () => { metric = null; reload(); });
    Hostwerk.on('lang', () => reload());
    Live.every(60000, () => reload(true));
  });
}());
