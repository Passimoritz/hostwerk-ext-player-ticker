// Player Ticker – public view for OBS (/v/player-ticker/, permission share:view). Runs WITHOUT Hostwerk around it:
// no SDK, data only from the extension's own public server part (/api/x/player-ticker/pub/players), texts built in.
// Address options: ?server=<id or game:id> · ?theme=light · ?lang=de · ?size=20 (font size in px) · ?count=0 (no counter) · ?servers=1 (server names)
(function () {
  const q = new URLSearchParams(location.search);
  const lang = (q.get('lang') || navigator.language || 'en').slice(0, 2) === 'de' ? 'de' : 'en';
  const TEXT = {
    de: { online: (n) => `${n} online`, nobody: 'Gerade niemand online', off: 'Die Stream-Ansicht ist in Hostwerk nicht freigegeben (Einstellungen → Erweiterungen → Spieler-Ticker).', error: 'Hostwerk antwortet gerade nicht – neuer Versuch gleich.' },
    en: { online: (n) => `${n} online`, nobody: 'Nobody online right now', off: 'The stream view is not shared in Hostwerk (Settings → Extensions → Player Ticker).', error: 'Hostwerk does not answer right now – trying again shortly.' },
  }[lang];
  document.documentElement.lang = lang;
  if (q.get('theme') === 'light') document.documentElement.dataset.theme = 'light';
  const size = Number(q.get('size'));
  if (size >= 10 && size <= 120) document.documentElement.style.setProperty('--size', `${size}px`);
  const showCount = q.get('count') !== '0';
  const showServer = q.get('servers') === '1';
  const api = `/api/x/player-ticker/pub/players${q.get('server') ? `?server=${encodeURIComponent(q.get('server'))}` : ''}`;
  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  function note(text) { $('note').hidden = !text; $('note').textContent = text || ''; }
  function draw(data) {
    const list = Ticker.onlineList(data);
    const count = $('count');
    count.replaceChildren();
    if (showCount) { count.append(el('span', 'dot'), document.createTextNode(TEXT.online(list.length))); }
    $('list').replaceChildren(...list.map((p) => {
      const chip = el('span', 'player');
      const img = el('img'); img.alt = ''; img.width = 20; img.height = 20;
      img.src = Ticker.headUrl(p.name, { remote: !!data.remoteHeads, size: 64 });
      img.addEventListener('error', () => { img.src = Ticker.headUrl(p.name); }, { once: true });
      chip.append(img, el('span', '', p.name));
      if (showServer) chip.append(el('span', 'server', p.server));
      return chip;
    }));
    note(list.length ? '' : TEXT.nobody);
  }
  async function tick() {
    try {
      const r = await fetch(api, { cache: 'no-store' });
      if (r.status === 403) { $('count').replaceChildren(); $('list').replaceChildren(); note(TEXT.off); return; }
      if (!r.ok) throw new Error(String(r.status));
      draw(await r.json());
    } catch { note(TEXT.error); }
  }
  tick();
  setInterval(tick, 5000);
}());
