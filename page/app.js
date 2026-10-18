// Player Ticker – page. Everything visible goes through Hostwerk.html (escaped) and Hostwerk.t (German/English).
const { html, t } = Hostwerk;
let timer = null;
let pinned = null;

const head = (name) => `https://mc-heads.net/avatar/${encodeURIComponent(name)}/52`;
const stateBadge = (s) => (s.state === 'running'
  ? html`<span class="badge ok">${s.extra.tps != null ? t('tps', { tps: Number(s.extra.tps).toFixed(1) }) : t('running')}</span>`
  : html`<span class="badge">${t('offline')}</span>`);

async function ranking(server, size) {
  if (!size || server.state !== 'running') return '';
  try {
    const st = await Hostwerk.minecraft.stats(server.id);
    const top = Ticker.topPlayers(st, size);
    if (!top.length) return '';
    return html`<ol class="ranking">${top.map((p) => html`<li><img class="hw-avatar" src="${head(p.name)}" alt=""><span class="grow">${p.name}</span><span class="muted small">${Hostwerk.fmt.duration(p.playMs)}</span></li>`)}</ol>`;
  } catch { return ''; }
}

async function load() {
  const settings = await Hostwerk.settings.get();
  let servers = await Hostwerk.minecraft.servers();
  if (!settings.showOffline) servers = servers.filter((s) => s.state === 'running');
  servers = Ticker.sortServers(servers, pinned);
  const online = Ticker.onlineCount(servers);
  document.getElementById('sub').textContent = t('summary', { players: online, servers: servers.filter((s) => s.state === 'running').length, time: Hostwerk.fmt.time(Date.now()) });
  if (!servers.length) return Hostwerk.render('#list', html`<div class="card card-pad empty"><b>${t('noServers')}</b>${t('noServersHint')}</div>`);
  const cards = await Promise.all(servers.map(async (s) => {
    const players = s.extra.players || [];
    return html`<div class="card card-pad ${s.id === pinned ? 'pinned' : ''}">
      <div class="server-head"><span class="dot ${s.state === 'running' ? 'ok' : ''}"></span><b class="ellipsis">${s.name}</b>${stateBadge(s)}
        <button class="btn sm ghost pin" data-pin="${s.id}" title="${t(s.id === pinned ? 'unpin' : 'pin')}">${s.id === pinned ? '★' : '☆'}</button></div>
      <div class="players">${players.length ? players.map((n) => html`<span class="pill"><img class="hw-avatar" src="${head(n)}" alt="">${n}</span>`) : html`<span class="muted small">${t(s.state === 'running' ? 'nobody' : 'offlineHint')}</span>`}</div>
      ${await ranking(s, Number(settings.ranking) || 0)}
    </div>`;
  }));
  Hostwerk.render('#list', html`${cards}`);
}

function schedule() {
  clearInterval(timer);
  Hostwerk.settings.get().then((s) => { timer = setInterval(() => load().catch(showError), Math.max(3, Number(s.refresh) || 10) * 1000); });
}
const showError = (e) => Hostwerk.render('#list', html`<div class="card card-pad empty"><b>${t('error')}</b>${e.message}</div>`);

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
