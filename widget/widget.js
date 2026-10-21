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
