// Player Ticker – tile: how many are online, their heads (drawn locally unless the user allows mc-heads.net) and the servers.
const { html, t } = Hostwerk;
async function load() {
  const settings = await Hostwerk.settings.get().catch(() => ({}));
  // Minecraft und – mit der Erweiterung „Spiele-Server“ – laufende Spiele-Server
  const games = Ticker.fromGames(await Hostwerk.get('/games-players').catch(() => []));
  const servers = [...(await Hostwerk.minecraft.servers()), ...games].filter((s) => s.state === 'running');
  const names = servers.flatMap((s) => s.extra.players || []);
  document.getElementById('count').textContent = t('playersOnline', { n: Hostwerk.fmt.number(names.length) });
  Hostwerk.render('#heads', html`${names.slice(0, 16).map((n) => html`<img class="hw-avatar" title="${n}" src="${Ticker.headUrl(n, { remote: !!settings.remoteHeads, size: 40 })}" data-name="${n}" alt="${n}" width="20" height="20">`)}`);
  Hostwerk.render('#servers', servers.length
    ? html`${servers.map((s) => html`<div class="line"><span class="ellipsis">${s.name}</span><span class="muted">${Hostwerk.fmt.number((s.extra.players || []).length)}</span></div>`)}`
    : html`<div class="muted small">${t('noRunning')}</div>`);
}
async function reload() {
  try { await load(); } catch (e) { document.getElementById('count').textContent = '–'; Hostwerk.render('#heads', ''); Live.failed(Hostwerk, '#servers', e, reload, { compact: true }); }
}
// Remote head failed (offline, blocked) → local head instead
document.addEventListener('error', (e) => { const img = e.target; if (img && img.tagName === 'IMG' && img.dataset.name && !img.src.startsWith('data:')) img.src = Ticker.headUrl(img.dataset.name); }, true);
Hostwerk.ready().then(() => {
  reload();
  const soon = Live.throttle(reload, 2000);
  Hostwerk.on('minecraft', soon); Hostwerk.on('service', soon); Hostwerk.on('settings', reload); Hostwerk.on('lang', reload);
  Live.every(15000, reload);
});

// 2.0: die drei Ersten der Bestenliste (früher eigene Kachel der Erweiterung „Spieler-Bestenliste“) – abschaltbar (tileBoard)
(function () {
  const t2 = (k, v) => Hostwerk.t(`lb.${k}`, v);
  const MEDAL = ['🥇', '🥈', '🥉'];
  async function loadTop() {
    const box = document.getElementById('lb-top');
    const s = await Hostwerk.settings.get().catch(() => ({}));
    box.hidden = s.tileBoard === false;
    if (box.hidden) return;
    const metric = Leaderboard.METRICS.includes(s.boardMetric) ? s.boardMetric : 'playMs';
    const servers = await Hostwerk.get('/mc/servers').catch(() => []);
    const stats = {};
    await Promise.all((Array.isArray(servers) ? servers : []).map(async (x) => { try { stats[x.id] = await Hostwerk.get(`/mc/servers/${encodeURIComponent(x.id)}/stats`); } catch { stats[x.id] = { players: [] }; } }));
    const gb = await Hostwerk.backend('GET', '/games-board').catch(() => null);
    if (gb && gb.stats) Object.assign(stats, gb.stats);
    const top = Leaderboard.rank(Leaderboard.merge(stats), metric, 3);
    const val = (v) => (metric === 'playMs' ? Hostwerk.fmt.duration(v) : Hostwerk.fmt.number(v));
    Hostwerk.render(box, top.length
      ? html`<div class="tiny muted">${t2('metric.' + metric)}</div>${top.map((p, i) => html`<div class="line"><span aria-hidden="true">${MEDAL[i]}</span><span class="sr">${t2('place', { n: i + 1 })}</span><b class="grow ellipsis">${p.name}</b><span class="muted small">${val(p.value)}</span></div>`)}`
      : '');
  }
  const again = () => loadTop().catch(() => {});
  Hostwerk.ready().then(() => { again(); Live.every(120000, again); Hostwerk.on('settings', again); Hostwerk.on('lang', again); });
}());
