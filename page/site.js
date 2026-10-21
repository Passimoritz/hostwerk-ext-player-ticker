// Reiter „Webseite“: „Wer ist online?“ als eigene Seite in einen Hostwerk-Webserver legen (Hostwerk mit SDK 3.2, host.sites).
// Der Server-Teil gibt Ziele und eigene Seiten (/site), Hostwerk schreibt die Dateien und erneuert sie im Takt.
// Gezeigt werden nur Servernamen, Zahlen und – je nach Wahl – Spielernamen (gekürzt oder gar keine), keine Adressen.
(function () {
  const { html, t } = Hostwerk;
  const $ = (id) => document.getElementById(id);
  let state = null; // { available, targets, list, defaults }
  let edit = null; // Seite in Bearbeitung (Kopie) oder null
  let servers = [];

  const blank = () => ({ id: '', web: (state.targets[0] || {}).web || '', vhost: (state.targets[0] || {}).vhost || null, sub: 'online', title: '', interval: 60, on: true, options: { ...state.defaults, title: '' } });
  const targetKey = (x) => `${x.web}|${x.vhost || ''}`;

  async function load() {
    state = await Hostwerk.backend('GET', '/site');
    const list = await Hostwerk.get('/mc/servers').catch(() => []);
    const games = await Hostwerk.get('/games-players').catch(() => []);
    servers = [...(Array.isArray(list) ? list : []).map((s) => ({ id: s.id, name: s.name })), ...(Array.isArray(games) ? games : []).map((g) => ({ id: `game:${g.id}`, name: g.name || g.id }))];
    draw();
  }

  function draw() {
    if (!state) return;
    if (!state.available) { Hostwerk.render('#site', html`<div class="empty"><h3>${t('site.oldTitle')}</h3><p class="muted small">${t('site.oldText')}</p></div>`); return; }
    if (!state.targets.length) { Hostwerk.render('#site', html`<div class="empty"><h3>${t('site.noWebTitle')}</h3><p class="muted small">${t('site.noWebText')}</p><div class="empty-action"><button type="button" class="btn primary" data-nav="/web">${t('site.toWeb')}</button></div></div>`); return; }
    Hostwerk.render('#site', html`
      <div class="stack">
        <div class="card"><div class="card-head"><h3>${t('site.pages')}</h3><div class="right"><button type="button" class="btn sm primary" data-new>${t('site.new')}</button></div></div>
          ${state.list.length ? state.list.map((p) => html`<div class="list-item site-row">
              <div class="grow"><div class="bold ellipsis">${p.title || t('site.defaultTitle')}${p.on === false ? html` <span class="badge">${t('site.paused')}</span>` : ''}</div>
                <div class="tiny muted ellipsis">${p.url || p.sub} · ${p.writtenAt ? t('site.written', { when: new Date(p.writtenAt).toLocaleString(Hostwerk.lang === 'en' ? 'en-GB' : 'de-DE') }) : t('site.notYet')}</div>
                ${p.error ? html`<div class="tiny c-err">${p.error}</div>` : ''}</div>
              ${p.url ? html`<button type="button" class="btn sm ghost" data-copy="${p.url}">${t('copyLink')}</button>` : ''}
              <button type="button" class="btn sm ghost" data-publish="${p.id}">${t('site.renew')}</button>
              <button type="button" class="btn sm" data-edit="${p.id}">${t('settings')}</button>
            </div>`) : html`<div class="card-body muted small">${t('site.none')}</div>`}
        </div>
        ${edit ? form() : ''}
      </div>`);
  }

  function form() {
    const e = edit; const o = e.options;
    const field = (id, label, input) => html`<div class="field"><label class="label" for="${id}">${label}</label>${input}</div>`;
    return html`<div class="card card-pad stack site-form">
      <b>${e.id ? t('site.edit') : t('site.new')}</b>
      <div class="grid grid-2">
        ${field('s-target', t('site.target'), html`<select class="select" id="s-target">${state.targets.map((x) => html`<option value="${targetKey(x)}" ${targetKey(x) === targetKey(e) ? Hostwerk.raw('selected') : ''}>${x.label}</option>`)}</select>`)}
        ${field('s-sub', t('site.sub'), html`<input class="input mono" id="s-sub" value="${e.sub}" maxlength="41" pattern="[A-Za-z0-9][A-Za-z0-9_-]*">`)}
        ${field('s-title', t('site.title'), html`<input class="input" id="s-title" value="${o.title || ''}" maxlength="80" placeholder="${t('site.defaultTitle')}">`)}
        ${field('s-server', t('site.server'), html`<select class="select" id="s-server"><option value="">${t('site.allServers')}</option>${servers.map((s) => html`<option value="${s.id}" ${s.id === o.server ? Hostwerk.raw('selected') : ''}>${s.name}</option>`)}</select>`)}
        ${field('s-names', t('site.names'), html`<select class="select" id="s-names">${['full', 'short', 'count'].map((v) => html`<option value="${v}" ${o.names === v ? Hostwerk.raw('selected') : ''}>${t('site.names.' + v)}</option>`)}</select>`)}
        ${field('s-theme', t('site.theme'), html`<select class="select" id="s-theme">${['auto', 'light', 'dark'].map((v) => html`<option value="${v}" ${o.theme === v ? Hostwerk.raw('selected') : ''}>${t('site.theme.' + v)}</option>`)}</select>`)}
        ${field('s-lang', t('site.lang'), html`<select class="select" id="s-lang">${['de', 'en'].map((v) => html`<option value="${v}" ${(o.lang === 'auto' ? Hostwerk.lang : o.lang) === v ? Hostwerk.raw('selected') : ''}>${t('site.lang.' + v)}</option>`)}</select>`)}
        ${field('s-interval', t('site.interval'), html`<select class="select" id="s-interval">${[30, 60, 300, 900, 3600].map((v) => html`<option value="${v}" ${Number(e.interval) === v ? Hostwerk.raw('selected') : ''}>${t('site.every.' + v)}</option>`)}</select>`)}
        ${field('s-accent', t('site.accent'), html`<input type="color" class="site-color" id="s-accent" value="${o.accent || '#23964a'}">`)}
      </div>
      <label class="row-tight small"><input type="checkbox" id="s-offline" ${o.showOffline !== false ? Hostwerk.raw('checked') : ''}> ${t('site.showOffline')}</label>
      <p class="tiny muted">${t('site.privacy')}</p>
      <div class="row">${e.id ? html`<button type="button" class="btn danger" data-remove="${e.id}">${t('site.remove')}</button>` : ''}${e.id ? html`<label class="row-tight small"><input type="checkbox" id="s-on" ${e.on !== false ? Hostwerk.raw('checked') : ''}> ${t('site.active')}</label>` : ''}<span class="grow"></span><button type="button" class="btn" data-cancel>${t('cancel')}</button><button type="button" class="btn primary" data-save>${t('site.save')}</button></div>
    </div>`;
  }

  function read() {
    const [web, vhost] = $('s-target').value.split('|');
    return { id: edit.id || undefined, web, vhost: vhost || null, sub: $('s-sub').value.trim(), interval: Number($('s-interval').value), on: $('s-on') ? $('s-on').checked : true,
      options: { title: $('s-title').value.trim(), server: $('s-server').value, showOffline: $('s-offline').checked, names: $('s-names').value, theme: $('s-theme').value, lang: $('s-lang').value, accent: $('s-accent').value, refresh: Number($('s-interval').value) } };
  }
  const err = (e) => Hostwerk.toast(e.message || String(e), { kind: 'error' });

  document.addEventListener('click', async (ev) => {
    const b = ev.target.closest('#site [data-new], #site [data-edit], #site [data-cancel], #site [data-save], #site [data-remove], #site [data-publish], #site [data-copy], #site [data-nav]');
    if (!b) return;
    if (b.dataset.nav) { Hostwerk.navigate(b.dataset.nav).catch(() => {}); return; }
    if (b.dataset.copy) { Hostwerk.copy(b.dataset.copy).catch(err); return; }
    if (b.hasAttribute('data-new')) { edit = blank(); draw(); return; }
    if (b.dataset.edit) { const p = state.list.find((x) => x.id === b.dataset.edit); if (p) { edit = JSON.parse(JSON.stringify({ ...p, options: { ...state.defaults, ...(p.options || {}) } })); draw(); } return; }
    if (b.hasAttribute('data-cancel')) { edit = null; draw(); return; }
    if (b.dataset.publish) { try { await Hostwerk.backend('POST', `/site/${encodeURIComponent(b.dataset.publish)}/publish`); Hostwerk.toast(t('site.renewed'), { kind: 'success' }); await load(); } catch (e) { err(e); } return; }
    if (b.dataset.remove) {
      try { await Hostwerk.backend('DELETE', `/site/${encodeURIComponent(b.dataset.remove)}`); edit = null; Hostwerk.toast(t('site.removed'), { kind: 'success' }); await load(); } catch (e) { err(e); }
      return;
    }
    if (b.hasAttribute('data-save')) {
      b.disabled = true;
      try { const p = await Hostwerk.backend('POST', '/site', read()); edit = null; Hostwerk.toast(p && p.error ? p.error : t('site.saved'), { kind: p && p.error ? 'error' : 'success' }); await load(); } catch (e) { err(e); } finally { b.disabled = false; }
    }
  });

  /** Aufruf von außen (Webserver → „Seiten von Erweiterungen“): ?action=site&target=<seiten-id> öffnet sie zum Bearbeiten. */
  window.TickerSite = {
    show: () => Live.guard(Hostwerk, '#site', load),
    open: async (id) => { await Live.guard(Hostwerk, '#site', load); if (!state || !state.available) return; const p = id && state.list.find((x) => x.id === id); edit = p ? JSON.parse(JSON.stringify({ ...p, options: { ...state.defaults, ...(p.options || {}) } })) : (state.targets.length ? blank() : null); draw(); },
  };
}());
