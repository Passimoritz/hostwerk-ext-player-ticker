// Reiter „Webseite“, Teil Bestenliste (bis 1.6 Erweiterung „Spieler-Bestenliste“): die Bestenliste als eigene Seite in einen Hostwerk-Webserver legen (Hostwerk mit SDK 3.2, host.sites).
// Der Server-Teil gibt Ziele und eigene Seiten (/site), Hostwerk schreibt die Dateien und erneuert sie im Takt.
// Gezeigt werden nur Platz, Name (wahlweise gekürzt oder ausgeblendet) und Wert – keine UUIDs, Server-Adressen oder Zeiten.
(function () {
  const { html } = Hostwerk;
  const t = (k, v) => Hostwerk.t(`lb.${k}`, v); // eigene Texte (lb.…) neben denen des Tickers
  const $ = (id) => document.getElementById(`lb-${id}`);
  const METRICS = ['playMs', 'sessions', 'mined', 'deaths', 'mobKills', 'playerKills', 'distanceKm', 'crafted'];
  let state = null; // { available, targets, list, defaults }
  let edit = null; // Seite in Bearbeitung (Kopie) oder null
  let servers = [];

  const blank = () => ({ id: '', web: (state.targets[0] || {}).web || '', vhost: (state.targets[0] || {}).vhost || null, sub: Hostwerk.lang === 'en' ? 'leaderboard' : 'bestenliste', title: '', interval: 60, on: true, options: { ...state.defaults, title: '' } });
  const targetKey = (x) => `${x.web}|${x.vhost || ''}`;

  async function load() {
    const all = await Hostwerk.backend('GET', '/site');
    // Nur die Seiten der Bestenliste – die „Wer ist online?“-Seiten zeigt page/site.js
    state = { ...all, list: (all.list || []).filter((p) => p.kind === 'board'), defaults: all.defaultsBoard || all.defaults };
    const list = await Hostwerk.get('/mc/servers').catch(() => []);
    servers = (Array.isArray(list) ? list : []).map((s) => ({ id: s.id, name: s.name }));
    draw();
  }

  function draw() {
    if (!state) return;
    if (!state.available) { Hostwerk.render('#lb-site', html`<div class="empty"><h3>${t('site.oldTitle')}</h3><p class="muted small">${t('site.oldText')}</p></div>`); return; }
    if (!state.targets.length) { Hostwerk.render('#lb-site', html`<div class="empty"><h3>${t('site.noWebTitle')}</h3><p class="muted small">${t('site.noWebText')}</p><div class="empty-action"><button type="button" class="btn primary" data-nav="/web">${t('site.toWeb')}</button></div></div>`); return; }
    Hostwerk.render('#lb-site', html`
      <div class="stack">
        <div class="card"><div class="card-head"><h3>${t('site.pages')}</h3><div class="right"><button type="button" class="btn sm primary" data-new>${t('site.new')}</button></div></div>
          ${state.list.length ? state.list.map((p) => html`<div class="list-item site-row">
              <div class="grow"><div class="bold ellipsis">${p.title || t('title')}${p.on === false ? html` <span class="badge">${t('site.paused')}</span>` : ''}</div>
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
        ${field('lb-s-target', t('site.target'), html`<select class="select" id="lb-s-target">${state.targets.map((x) => html`<option value="${targetKey(x)}" ${targetKey(x) === targetKey(e) ? Hostwerk.raw('selected') : ''}>${x.label}</option>`)}</select>`)}
        ${field('lb-s-sub', t('site.sub'), html`<input class="input mono" id="lb-s-sub" value="${e.sub}" maxlength="41" pattern="[A-Za-z0-9][A-Za-z0-9_-]*">`)}
        ${field('lb-s-title', t('site.title'), html`<input class="input" id="lb-s-title" value="${o.title || ''}" maxlength="80" placeholder="${t('title')}">`)}
        ${field('lb-s-server', t('pick_server'), html`<select class="select" id="lb-s-server"><option value="">${t('allServers')}</option>${servers.map((s) => html`<option value="${s.id}" ${s.id === o.server ? Hostwerk.raw('selected') : ''}>${s.name}</option>`)}</select>`)}
        ${field('lb-s-days', t('site.period'), html`<select class="select" id="lb-s-days">${[[0, 'period.all'], [30, 'period.month'], [7, 'period.week']].map(([v, k]) => html`<option value="${v}" ${Number(o.days) === v ? Hostwerk.raw('selected') : ''}>${t(k)}</option>`)}</select>`)}
        ${field('lb-s-limit', t('site.limit'), html`<select class="select" id="lb-s-limit">${[5, 10, 20, 50].map((v) => html`<option value="${v}" ${Number(o.limit) === v ? Hostwerk.raw('selected') : ''}>${t('site.top', { n: v })}</option>`)}</select>`)}
        ${field('lb-s-names', t('site.names'), html`<select class="select" id="lb-s-names">${['full', 'short', 'hidden'].map((v) => html`<option value="${v}" ${o.names === v ? Hostwerk.raw('selected') : ''}>${t('site.names.' + v)}</option>`)}</select>`)}
        ${field('lb-s-theme', t('site.theme'), html`<select class="select" id="lb-s-theme">${['auto', 'light', 'dark'].map((v) => html`<option value="${v}" ${o.theme === v ? Hostwerk.raw('selected') : ''}>${t('site.theme.' + v)}</option>`)}</select>`)}
        ${field('lb-s-lang', t('site.lang'), html`<select class="select" id="lb-s-lang">${['de', 'en'].map((v) => html`<option value="${v}" ${(o.lang === 'auto' ? Hostwerk.lang : o.lang) === v ? Hostwerk.raw('selected') : ''}>${t('site.lang.' + v)}</option>`)}</select>`)}
        ${field('lb-s-interval', t('site.interval'), html`<select class="select" id="lb-s-interval">${[30, 60, 300, 900, 3600].map((v) => html`<option value="${v}" ${Number(e.interval) === v ? Hostwerk.raw('selected') : ''}>${t('site.every.' + v)}</option>`)}</select>`)}
        ${field('lb-s-accent', t('site.accent'), html`<input type="color" class="site-color" id="lb-s-accent" value="${o.accent || '#eab308'}">`)}
      </div>
      <fieldset class="site-metrics"><legend class="label">${t('site.metrics')}</legend>
        ${METRICS.map((m) => html`<label class="row-tight small"><input type="checkbox" name="lb-s-metric" value="${m}" ${(o.metrics || []).includes(m) ? Hostwerk.raw('checked') : ''}> ${t('metric.' + m)}</label>`)}
      </fieldset>
      <p class="tiny muted">${t('site.privacy')}</p>
      <div class="row">${e.id ? html`<button type="button" class="btn danger" data-remove="${e.id}">${t('site.remove')}</button>` : ''}${e.id ? html`<label class="row-tight small"><input type="checkbox" id="lb-s-on" ${e.on !== false ? Hostwerk.raw('checked') : ''}> ${t('site.active')}</label>` : ''}<span class="grow"></span><button type="button" class="btn" data-cancel>${t('cancel')}</button><button type="button" class="btn primary" data-save>${t('site.save')}</button></div>
    </div>`;
  }

  function read() {
    const [web, vhost] = $('s-target').value.split('|');
    const metrics = [...document.querySelectorAll('input[name="lb-s-metric"]:checked')].map((x) => x.value);
    return { id: edit.id || undefined, kind: 'board', web, vhost: vhost || null, sub: $('s-sub').value.trim(), interval: Number($('s-interval').value), on: $('s-on') ? $('s-on').checked : true,
      options: { title: $('s-title').value.trim(), server: $('s-server').value, days: Number($('s-days').value), limit: Number($('s-limit').value), names: $('s-names').value, theme: $('s-theme').value, lang: $('s-lang').value, accent: $('s-accent').value, metrics: metrics.length ? metrics : ['playMs'], refresh: Number($('s-interval').value) } };
  }
  const err = (e) => Hostwerk.toast(e.message || String(e), { kind: 'error' });

  document.addEventListener('click', async (ev) => {
    const b = ev.target.closest('#lb-site [data-new], #lb-site [data-edit], #lb-site [data-cancel], #lb-site [data-save], #lb-site [data-remove], #lb-site [data-publish], #lb-site [data-copy], #lb-site [data-nav]');
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
  window.BoardSite = {
    show: () => Live.guard(Hostwerk, '#lb-site', load),
    open: async (id) => { await Live.guard(Hostwerk, '#lb-site', load); if (!state || !state.available) return; const p = id && state.list.find((x) => x.id === id); if (!p) return; edit = JSON.parse(JSON.stringify({ ...p, options: { ...state.defaults, ...(p.options || {}) } })); draw(); }, // nur eigene Seiten – eine neue legt der Knopf an
  };
}());
