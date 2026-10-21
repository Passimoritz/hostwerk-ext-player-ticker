// Player Ticker – page. Everything visible goes through Hostwerk.html (escaped) and Hostwerk.t (German/English).
// Heads are drawn locally from the name; mc-heads.net only when the user switches it on (setting "remoteHeads").
const { html, t } = Hostwerk;
const T = Ticker;
const STATS_TTL = 60000; // ranking stats per server at most once a minute (not on every refresh tick)
let pinned = null;
let tab = 'live';
let settings = {};
let last = null; // previous state { serverId: [names] } for join/leave
let events = [];
const cache = new Map(); // server → { at, data }
let poll = null;
let allServers = []; // all servers incl. stopped (names for the join/leave list)

const head = (name, size = 52) => T.headUrl(name, { remote: !!settings.remoteHeads, size });
const avatar = (name, size) => html`<img class="hw-avatar" src="${head(name, size)}" data-name="${name}" alt="" width="20" height="20">`;
const bedrock = (name) => (T.isBedrock(name) ? html`<span class="badge" title="${t('bedrockTitle')}">${t('bedrock')}</span>` : '');
const stateBadge = (s) => (s.state === 'running'
  ? html`<span class="badge ok">${s.extra.tps != null ? t('tps', { tps: Hostwerk.fmt.number(Math.round(Number(s.extra.tps) * 10) / 10) }) : t('running')}</span>`
  : html`<span class="badge">${t('offline')}</span>`);
const clock = (ts) => Hostwerk.fmt.time(ts);

async function statsOf(id) {
  const c = cache.get(id);
  if (c && Date.now() - c.at < STATS_TTL) return c.data;
  const data = await Hostwerk.minecraft.stats(id).catch(() => null);
  cache.set(id, { at: Date.now(), data });
  return data;
}

function ranking(stats, size) {
  const top = T.topPlayers(stats, size);
  if (!top.length) return '';
  return html`<ol class="ranking" aria-label="${t('rankingTitle')}">${top.map((p) => html`<li>${avatar(p.name)}<span class="grow">${p.name}</span><span class="muted small">${Hostwerk.fmt.duration(p.playMs)}</span></li>`)}</ol>`;
}

function card(s, stats, size) {
  const players = s.extra.players || [];
  const isPinned = s.id === pinned;
  return html`<div class="card card-pad ${isPinned ? 'pinned' : ''}">
    <div class="server-head"><span class="dot ${s.state === 'running' ? 'ok' : ''}"></span><b class="ellipsis">${s.name}</b>${stateBadge(s)}
      <button type="button" class="btn sm ghost pin" data-pin="${s.id}" aria-pressed="${isPinned ? 'true' : 'false'}" aria-label="${t(isPinned ? 'unpinName' : 'pinName', { name: s.name })}" title="${t(isPinned ? 'unpin' : 'pin')}">${isPinned ? '★' : '☆'}</button></div>
    <div class="players">${players.length ? players.map((n) => html`<span class="pill">${avatar(n)}${n}${bedrock(n)}</span>`) : html`<span class="muted small">${t(s.state === 'running' ? 'nobody' : 'offlineHint')}</span>`}</div>
    ${size && s.state === 'running' ? ranking(stats, size) : ''}
  </div>`;
}

function drawEvents() {
  const names = new Map(allServers.map((s) => [s.id, s.name]));
  Hostwerk.render('#events', events.length
    ? html`<ul class="events">${events.slice(0, 30).map((e) => html`<li><span class="mono small muted">${clock(e.t)}</span>${avatar(e.name)}<b class="ellipsis">${e.name}</b><span class="small ${e.kind === 'join' ? 'c-ok' : 'muted'}">${t(e.kind === 'join' ? 'joined' : 'left')}</span><span class="tiny muted ellipsis">${names.get(e.server) || ''}</span></li>`)}</ul>`
    : html`<p class="muted small">${t('noEvents')}</p>`);
}

async function load() {
  settings = await Hostwerk.settings.get().catch(() => ({}));
  let servers = await Hostwerk.minecraft.servers();
  // Join/leave: compare with the previous state (also covers stopped servers)
  const now = T.snapshot(servers);
  const fresh = T.diff(last, now);
  last = now;
  if (fresh.length) { events = T.journal(events, fresh); Hostwerk.storage.set('events', events).catch(() => {}); }
  allServers = servers;
  if (!settings.showOffline) servers = servers.filter((s) => s.state === 'running');
  servers = T.sortServers(servers, pinned);
  const size = Number(settings.ranking) || 0;
  const stats = {};
  await Promise.all(servers.filter((s) => s.state === 'running').map(async (s) => { stats[s.id] = await statsOf(s.id); }));
  // Leaves while the page was closed come from Hostwerk's "last seen"
  const seen = Object.entries(stats).flatMap(([id, st]) => T.leavesFromStats(id, st));
  if (seen.length) { const merged = T.journal(events, seen); if (merged.length !== events.length) { events = merged; Hostwerk.storage.set('events', events).catch(() => {}); } }
  const online = T.onlineCount(servers);
  document.getElementById('sub').textContent = t('summary', { players: Hostwerk.fmt.number(online), servers: Hostwerk.fmt.number(servers.filter((s) => s.state === 'running').length), time: clock(Date.now()) });
  if (tab === 'stream') return drawStream(servers);
  if (tab === 'events') return drawEvents();
  if (!servers.length) return Hostwerk.render('#list', html`<div class="card card-pad empty"><h3>${t('noServers')}</h3><p class="muted small">${t('noServersHint')}</p></div>`);
  Hostwerk.render('#list', html`${servers.map((s) => card(s, stats[s.id], size))}`);
  return undefined;
}

/** Stream view: only who is online, large text, transparent – for OBS window capture. */
function drawStream(servers) {
  const names = servers.filter((s) => s.state === 'running').flatMap((s) => (s.extra.players || []).map((n) => ({ n, s: s.name })));
  Hostwerk.render('#stream', html`<div class="stream-count">${t('playersOnline', { n: Hostwerk.fmt.number(names.length) })}</div>
    <div class="stream-list">${names.map((x) => html`<div class="stream-player"><img src="${head(x.n, 64)}" data-name="${x.n}" alt="" width="40" height="40"><span>${x.n}</span></div>`)}</div>`);
}

const target = () => (tab === 'stream' ? '#stream' : tab === 'events' ? '#events' : '#list');
const reload = () => Live.guard(Hostwerk, target(), load);

function showTab(id) {
  tab = ['stream', 'events'].includes(id) ? id : 'live';
  for (const el of document.querySelectorAll('[data-tab]')) el.hidden = el.dataset.tab !== tab;
  document.body.classList.toggle('stream', tab === 'stream');
  reload();
}

function schedule() {
  const ms = Math.max(3, Number(settings.refresh) || 10) * 1000;
  if (poll) poll.every(ms); else poll = Live.every(ms, reload);
}

document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-pin]');
  if (b) { pinned = pinned === b.dataset.pin ? null : b.dataset.pin; try { await Hostwerk.storage.set('pinned', pinned); } catch (er) { Hostwerk.toast(er.message, { kind: 'error' }); } reload(); }
});
// Remote head failed to load (offline, blocked) → local head instead
document.addEventListener('error', (e) => {
  const img = e.target;
  if (img && img.tagName === 'IMG' && img.dataset.name && !img.src.startsWith('data:')) img.src = T.headUrl(img.dataset.name);
}, true);

Hostwerk.ready().then(async (info) => {
  pinned = (await Hostwerk.storage.get('pinned').catch(() => null)) || null;
  events = (await Hostwerk.storage.get('events').catch(() => null)) || [];
  settings = await Hostwerk.settings.get().catch(() => ({}));
  showTab(info.tab);
  schedule();
  Hostwerk.on('tab', showTab);
  // Live: players join/leave, servers start/stop, settings change – bundled, at most every 2 s
  const soon = Live.throttle(reload, 2000);
  Hostwerk.on('minecraft', (s) => { if (s && s.id) cache.delete(s.id); soon(); });
  Hostwerk.on('service', (s) => { if (s.kind === 'minecraft') soon(); });
  Hostwerk.on('settings', () => { reload().then(schedule); });
  Hostwerk.on('lang', reload);
});
