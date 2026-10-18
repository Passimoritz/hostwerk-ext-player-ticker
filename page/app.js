// Player Ticker – page. Everything visible goes through Hostwerk.html (escaped) and Hostwerk.t (German/English).
const { html, t } = Hostwerk;
let timer = null;
let pinned = null;

const head = (name) => `https://mc-heads.net/avatar/${encodeURIComponent(name)}/52`;
const stateBadge = (s) => (s.state === 'running'
  ? html`<span class="hw-badge hw-ok">${s.extra.tps != null ? t('tps', { tps: Number(s.extra.tps).toFixed(1) }) : t('running')}</span>`
  : html`<span class="hw-badge">${t('offline')}</span>`);

async function ranking(server, size) {
  if (!size || server.state !== 'running') return '';
  try {
    const st = await Hostwerk.minecraft.stats(server.id);
    const top = (st.players || []).slice().sort((a, b) => (b.playtime || 0) - (a.playtime || 0)).slice(0, size);
    if (!top.length) return '';
    return html`<ol class="ranking">${top.map((p) => html`<li><img class="hw-avatar" src="${head(p.name)}" alt=""><span class="hw-grow">${p.name}</span><span class="hw-muted hw-small">${Hostwerk.fmt.duration(p.playtime || 0)}</span></li>`)}</ol>`;
  } catch { return ''; }
}

async function load() {
  const settings = await Hostwerk.settings.get();
  let servers = await Hostwerk.minecraft.servers();
  if (!settings.showOffline) servers = servers.filter((s) => s.state === 'running');
  servers.sort((a, b) => (b.id === pinned) - (a.id === pinned) || (b.state === 'running') - (a.state === 'running') || a.name.localeCompare(b.name));
  const online = servers.reduce((n, s) => n + (s.extra.players || []).length, 0);
  document.getElementById('sub').textContent = t('summary', { players: online, servers: servers.filter((s) => s.state === 'running').length, time: Hostwerk.fmt.time(Date.now()) });
  if (!servers.length) return Hostwerk.render('#list', html`<div class="hw-card hw-empty"><b>${t('noServers')}</b>${t('noServersHint')}</div>`);
  const cards = await Promise.all(servers.map(async (s) => {
    const players = s.extra.players || [];
    return html`<div class="hw-card ${s.id === pinned ? 'pinned' : ''}">
      <div class="server-head"><span class="hw-dot ${s.state === 'running' ? 'hw-ok' : ''}"></span><b class="hw-ellipsis">${s.name}</b>${stateBadge(s)}
        <button class="hw-btn hw-sm hw-ghost pin" data-pin="${s.id}" title="${t(s.id === pinned ? 'unpin' : 'pin')}">${s.id === pinned ? '★' : '☆'}</button></div>
      <div class="players">${players.length ? players.map((n) => html`<span class="hw-pill"><img class="hw-avatar" src="${head(n)}" alt="">${n}</span>`) : html`<span class="hw-muted hw-small">${t(s.state === 'running' ? 'nobody' : 'offlineHint')}</span>`}</div>
      ${await ranking(s, Number(settings.ranking) || 0)}
    </div>`;
  }));
  Hostwerk.render('#list', html`${cards}`);
}

function schedule() {
  clearInterval(timer);
  Hostwerk.settings.get().then((s) => { timer = setInterval(() => load().catch(showError), Math.max(3, Number(s.refresh) || 10) * 1000); });
}
const showError = (e) => Hostwerk.render('#list', html`<div class="hw-card hw-empty"><b>${t('error')}</b>${e.message}</div>`);

document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-pin]');
  if (b) { pinned = pinned === b.dataset.pin ? null : b.dataset.pin; await Hostwerk.storage.set('pinned', pinned); load(); }
});

Hostwerk.ready().then(async () => {
  pinned = (await Hostwerk.storage.get('pinned').catch(() => null)) || null;
  await load().catch(showError);
  schedule();
  // Live: players join/leave, servers start/stop, settings change
  Hostwerk.on('minecraft', () => load().catch(showError));
  Hostwerk.on('service', (s) => { if (s.kind === 'minecraft') load().catch(showError); });
  Hostwerk.on('settings', () => { load().catch(showError); schedule(); });
  Hostwerk.on('lang', () => load().catch(showError));
});
