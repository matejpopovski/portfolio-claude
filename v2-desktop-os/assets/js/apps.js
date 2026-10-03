/* MatejOS apps: About, Projects, Project, Experience, Skills, Mail, Settings, Trash, Code, About This OS. */
(() => {
  'use strict';
  const MOS = window.MOS;
  const { h, D, esc } = MOS;
  const ui = MOS.ui;
  const A = (MOS.apps = {});
  const firstName = D.name.split(' ')[0];
  const thisYear = new Date().getFullYear();
  const ext = (url) => (/^https?:/.test(url) ? ' target="_blank" rel="noopener"' : '');

  MOS.walls = [
    { id: 'dunes', name: 'Dunes' },
    { id: 'blueprint', name: 'Blueprint' },
    { id: 'night', name: 'Night Shift' },
    { id: 'sunset', name: 'Sunset Stripes' },
  ];
  MOS.accents = [
    { name: 'Cobalt', v: '#3557ff' }, { name: 'Tomato', v: '#ff5b37' }, { name: 'Mint', v: '#14a873' },
    { name: 'Lilac', v: '#8a63ff' }, { name: 'Raspberry', v: '#e0457b' },
  ];

  /* Buttons with data-open="app[:arg]" open apps. */
  function wireOpeners(root) {
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-open]');
      if (!b || !root.contains(b)) return;
      const [app, arg] = b.dataset.open.split(':');
      MOS.wm.open(app, arg, { from: b });
    });
  }
  MOS.wireOpeners = wireOpeners;

  /* "Matej ___" typewriter that cycles through data.verbs. Returns a stop function. */
  MOS.typer = (el, verbs = D.verbs) => {
    let i = 0, alive = true, t;
    const reduced = MOS.reduced();
    if (reduced) {
      el.textContent = verbs[0];
      t = setInterval(() => { i = (i + 1) % verbs.length; el.textContent = verbs[i]; }, 3800);
      return () => clearInterval(t);
    }
    const run = async () => {
      while (alive) {
        const word = verbs[i];
        for (let c = 1; c <= word.length && alive; c++) { el.textContent = word.slice(0, c); await MOS.wait(34 + Math.random() * 40); }
        await MOS.wait(2200);
        for (let c = word.length; c >= 0 && alive; c--) { el.textContent = word.slice(0, c); await MOS.wait(16); }
        await MOS.wait(260);
        i = (i + 1) % verbs.length;
      }
    };
    run();
    return () => { alive = false; };
  };

  /* ================= About Me.txt ================= */
  A.about = {
    title: 'About Me.txt', icon: 'doc', size: [580, 640], min: [320, 280],
    // Sit between the name on the wallpaper and the icon columns when there is room.
    pos: (b, w) => { const x = Math.min(Math.round(b.w * 0.43), b.w - 230 - w); return x >= b.w * 0.34 ? { x, y: b.y + 22 } : null; },
    render(body, win) {
      const words = D.about.join(' ').split(/\s+/).length;
      body.innerHTML = `
        <div class="doc">
          <div class="doc__ruler" aria-hidden="true"><span></span></div>
          <div class="doc__scroll">
            <article class="doc__page">
              <p class="doc__path">~/Desktop/About Me.txt</p>
              <h3 class="doc__name">${esc(D.name)}</h3>
              <p class="doc__title">${esc(D.title)}</p>
              <p class="doc__meta"><span>${esc(D.role)}</span><span>${esc(D.location)}</span></p>
              <p class="doc__verb">${esc(firstName)} <span class="typer"></span><span class="caret" aria-hidden="true"></span></p>
              ${D.about.map((p) => `<p class="doc__p">${esc(p)}</p>`).join('')}
              <dl class="doc__facts">${D.facts.map((f) => `<div><dt>${esc(f.k)}</dt><dd>${esc(f.v)}</dd></div>`).join('')}</dl>
              <div class="doc__actions">
                <button class="btn btn--primary" data-open="projects">Browse projects</button>
                <button class="btn" data-open="experience">Experience</button>
                <button class="btn" data-open="mail">Say hello</button>
              </div>
              <p class="doc__sig">— ${esc(firstName)}</p>
            </article>
          </div>
          <footer class="status"><span>${words} words</span><span>Plain text · UTF-8</span></footer>
        </div>`;
      wireOpeners(body);
      win.onCleanup(MOS.typer(body.querySelector('.typer')));
    },
  };

  /* ================= Projects (file explorer) ================= */
  const cardOf = (p) => (p.rank && p.suit ? `${p.rank}${p.suit}` : '');

  A.projects = {
    title: 'Projects', icon: 'folder', size: [820, 560], min: [340, 300],
    reopen(w, area) { if (area && w.setArea) w.setArea(area); },
    render(body, win, startArea) {
      let area = startArea && MOS.areas.includes(startArea) ? startArea : '*';
      let view = MOS.store.get('fxView', 'grid');
      let q = '';
      const count = (a) => D.projects.filter((p) => a === '*' || p.area === a).length;
      body.innerHTML = `
        <div class="fx">
          <aside class="fx__side">
            <p class="fx__label" id="fxFolders-${win.el.dataset.id}">Folders</p>
            <div class="fx__folders" role="group" aria-labelledby="fxFolders-${win.el.dataset.id}">
              ${['*', ...MOS.areas].map((a) => `
                <button class="fx__folder" data-area="${esc(a)}" aria-pressed="false" style="--c:${a === '*' ? 'var(--text-3)' : MOS.areaColor(a)}">
                  <span class="fx__fdot" aria-hidden="true"></span><span class="fx__fname">${a === '*' ? 'All projects' : esc(a)}</span><span class="fx__fcount">${count(a)}</span>
                </button>`).join('')}
            </div>
            <p class="fx__label">Coursework</p>
            <ul class="fx__courses">
              ${D.courses.map((c) => `<li><a href="${esc(c.url)}"${ext(c.url)}><span class="fx__code">${esc(c.code)}</span><span>${esc(c.name)}</span>${ui('ext')}</a></li>`).join('')}
            </ul>
          </aside>
          <div class="fx__main">
            <div class="fx__bar">
              <p class="fx__crumbs" aria-live="polite"></p>
              <label class="fx__search">${ui('search')}<input type="search" placeholder="Filter" aria-label="Filter projects" /></label>
              <div class="seg" role="group" aria-label="View as">
                <button data-view="grid" aria-label="Icons">${ui('grid')}</button><button data-view="list" aria-label="List">${ui('list')}</button>
              </div>
            </div>
            <div class="fx__head" aria-hidden="true"><span>Name</span><span>Area</span><span>Year</span><span>Result</span></div>
            <div class="fx__items" role="list"></div>
            <footer class="status"><span class="fx__count"></span><span class="fx__hint">Double-click to open</span></footer>
          </div>
        </div>`;
      const $ = (s) => body.querySelector(s);
      const items = $('.fx__items');
      const fx = $('.fx');

      const draw = () => {
        const ql = q.trim().toLowerCase();
        const list = D.projects.map((p, i) => ({ p, i })).filter(({ p }) =>
          (area === '*' || p.area === area) &&
          (!ql || [p.title, p.tag, p.area, p.blurb, p.year].join(' ').toLowerCase().includes(ql)));
        fx.dataset.view = view;
        body.querySelectorAll('.fx__folder').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.area === area)));
        body.querySelectorAll('[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === view)));
        $('.fx__crumbs').innerHTML = `<span>Projects</span>${area !== '*' ? `<span class="sep">›</span><span>${esc(area)}</span>` : ''}${ql ? `<span class="sep">›</span><span>“${esc(q.trim())}”</span>` : ''}`;
        $('.fx__count').textContent = `${list.length} item${list.length === 1 ? '' : 's'}`;
        $('.fx__hint').textContent = MOS.isTouch() || MOS.isPhone() ? 'Tap to open' : 'Double-click to open';
        items.innerHTML = list.length ? '' : `<p class="fx__empty">No projects match “${esc(q)}”. Try “vision” or “Python”.</p>`;
        list.forEach(({ p, i }, n) => {
          const btn = h('button', { class: 'fx__item', 'data-i': i, style: { '--c': MOS.areaColor(p.area), '--n': n } },
            h('span', { class: 'fx__thumb', 'aria-hidden': 'true' },
              h('span', { class: 'fx__stat', text: p.stat.value }),
              h('span', { class: 'fx__card', text: cardOf(p) })),
            h('span', { class: 'fx__name', text: p.title }),
            h('span', { class: 'fx__tag', text: p.tag }),
            h('span', { class: 'fx__area', text: p.area }),
            h('span', { class: 'fx__year', text: p.year }),
            h('span', { class: 'fx__res', text: `${p.stat.value} ${p.stat.label}` }));
          btn.setAttribute('aria-label', `${p.title}. ${p.area}, ${p.year}. ${p.tag}`);
          MOS.bindOpen(btn, () => MOS.wm.open('project', i, { from: btn.querySelector('.fx__thumb') }),
            () => { items.querySelectorAll('.is-selected').forEach((x) => x.classList.remove('is-selected')); btn.classList.add('is-selected'); });
          items.append(h('div', { role: 'listitem' }, btn));
        });
      };

      body.querySelector('.fx__folders').addEventListener('click', (e) => {
        const b = e.target.closest('[data-area]'); if (!b) return;
        area = b.dataset.area; draw();
      });
      body.querySelector('.seg').addEventListener('click', (e) => {
        const b = e.target.closest('[data-view]'); if (!b) return;
        view = b.dataset.view; MOS.store.set('fxView', view); draw();
      });
      const input = $('.fx__search input');
      input.addEventListener('input', () => { q = input.value; draw(); });
      items.addEventListener('keydown', (e) => {
        const all = [...items.querySelectorAll('.fx__item')];
        const i = all.indexOf(document.activeElement);
        if (i < 0) return;
        let j = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = Math.min(all.length - 1, i + 1);
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = Math.max(0, i - 1);
        if (e.key === 'Home') j = 0;
        if (e.key === 'End') j = all.length - 1;
        if (j != null) { e.preventDefault(); all[j].focus(); }
      });
      win.setArea = (a) => { area = a; draw(); };
      draw();
    },
  };

  /* ================= Project detail ================= */
  A.project = {
    key: (i) => 'project:' + i,
    title: (i) => D.projects[i].title,
    icon: 'file',
    iconArg: (i) => MOS.areaHex(D.projects[i].area),
    back: 'Projects',
    dockAs: 'projects',
    size: [640, 680], min: [320, 300],
    render(body, win, i) { renderProject(body, win, +i); },
  };

  function renderProject(body, win, i) {
    const p = D.projects[i];
    const n = D.projects.length;
    body.innerHTML = `
      <article class="pj" style="--c:${MOS.areaColor(p.area)}">
        <figure class="pj__shot ${p.image ? 'is-loading' : 'is-art'}">
          <div class="pj__art" aria-hidden="true"><span class="pj__artv">${esc(p.stat.value)}</span><span class="pj__artl">${esc(p.stat.label)}</span></div>
          ${p.image ? `<a class="pj__imglink" href="${esc(p.image)}" target="_blank" rel="noopener" aria-label="Open the full screenshot of ${esc(p.title)} in a new tab"><img alt="Screenshot of ${esc(p.title)}" loading="lazy" decoding="async" /></a>` : ''}
          ${p.image ? '<figcaption class="pj__loading">loading screenshot…</figcaption>' : ''}
        </figure>
        <div class="pj__body">
          <p class="pj__meta"><button class="pill" data-area="${esc(p.area)}" title="Show all ${esc(p.area)} projects">${esc(p.area)}</button><span>${esc(p.year)}</span>${cardOf(p) ? `<span class="pj__card" title="Card in the deck">${esc(cardOf(p))}</span>` : ''}</p>
          <h3 class="pj__title">${esc(p.title)}</h3>
          <p class="pj__tag">${esc(p.tag)}</p>
          <p class="pj__blurb">${esc(p.blurb)}</p>
          <div class="pj__grid">
            <div class="pj__stat"><b>${esc(p.stat.value)}</b><span>${esc(p.stat.label)}</span></div>
            <ul class="pj__bullets">${p.bullets.map((b) => `<li>${ui('check')}<span>${esc(b)}</span></li>`).join('')}</ul>
          </div>
          <div class="pj__actions">
            <a class="btn btn--primary" href="${esc(p.url)}" target="_blank" rel="noopener">${MOS.linkLabel(p.url)} ${ui('ext')}</a>
            <span class="pj__nav">
              <button class="btn btn--icon" data-nav="-1" aria-label="Previous project">${ui('arrowL')}</button>
              <span class="pj__count">${i + 1} / ${n}</span>
              <button class="btn btn--icon" data-nav="1" aria-label="Next project">${ui('arrowR')}</button>
            </span>
          </div>
        </div>
      </article>`;
    const fig = body.querySelector('.pj__shot');
    const img = body.querySelector('img');
    if (img) {
      // Screenshots are big: only fetched now, when the project is actually opened.
      img.addEventListener('load', () => { fig.classList.remove('is-loading'); fig.classList.add('is-loaded'); });
      img.addEventListener('error', () => { fig.classList.remove('is-loading'); fig.classList.add('is-art'); img.parentElement.remove(); });
      img.src = p.image;
    }
    body.querySelector('.pj__nav').addEventListener('click', (e) => {
      const b = e.target.closest('[data-nav]'); if (!b) return;
      const j = (i + +b.dataset.nav + n) % n;
      const other = MOS.wm.get('project:' + j);
      if (other) { MOS.wm.focus(other); return; }
      MOS.wm.rekey(win, 'project:' + j, j);
      MOS.wm.setTitle(win, D.projects[j].title);
      win.el.querySelector('.win__ticon').innerHTML = MOS.icon('file', MOS.areaHex(D.projects[j].area));
      renderProject(body, win, j);
      body.scrollTop = 0;
      body.querySelector(`[data-nav="${b.dataset.nav}"]`).focus();
    });
    body.querySelector('.pill').addEventListener('click', () => MOS.wm.open('projects', p.area));
  }

  /* ================= Experience (activity monitor) ================= */
  const KIND = { work: 'Work', edu: 'Education', origin: 'Origin' };
  A.experience = {
    title: 'Experience', icon: 'monitor', size: [860, 600], min: [340, 320],
    reopen(w, idx) { if (idx != null && w.select) w.select(+idx); },
    render(body, win, startIdx) {
      const T = D.timeline;
      const years = T.map((t) => +t.year).filter(Boolean);
      const y0 = Math.min(...years);
      const y1 = Math.max(thisYear, ...years);
      const origin = T.find((t) => t.kind === 'origin');
      const uptime = origin ? thisYear - +origin.year : thisYear - y0;
      let sel = startIdx != null ? +startIdx : 0;
      let sortKey = 'year', sortDir = -1;
      const uid = win.el.dataset.id;
      body.innerHTML = `
        <div class="am">
          <div class="am__tabs" role="tablist" aria-label="Experience views">
            <button role="tab" id="am-t1-${uid}" aria-controls="am-p1-${uid}" aria-selected="true">Timeline</button>
            <button role="tab" id="am-t2-${uid}" aria-controls="am-p2-${uid}" aria-selected="false" tabindex="-1">Education</button>
            <button role="tab" id="am-t3-${uid}" aria-controls="am-p3-${uid}" aria-selected="false" tabindex="-1">Coursework</button>
            <span class="am__uptime"><span class="pulse" aria-hidden="true"></span>uptime ${uptime} yrs</span>
          </div>
          <div class="am__panel" role="tabpanel" id="am-p1-${uid}" aria-labelledby="am-t1-${uid}">
            <div class="am__track" aria-label="Timeline from ${y0} to ${y1}">
              <div class="am__line"></div>
              ${T.map((t, i) => `<button class="am__node am__node--${esc(t.kind)}" data-i="${i}" style="--x:${((+t.year - y0) / (y1 - y0 || 1)) * 100}%" aria-label="${esc(t.year)}: ${esc(t.title)}"><span>${esc(t.year)}</span></button>`).join('')}
              <span class="am__end am__end--a">${y0}</span><span class="am__end am__end--b">now</span>
            </div>
            <div class="am__tablewrap">
              <table class="am__table">
                <thead><tr>
                  <th scope="col"><button data-sort="title">Process</button></th>
                  <th scope="col"><button data-sort="org">Organization</button></th>
                  <th scope="col" class="am__c-kind"><button data-sort="kind">Type</button></th>
                  <th scope="col"><button data-sort="year">Since</button></th>
                  <th scope="col" class="am__c-dur">Duration</th>
                </tr></thead>
                <tbody></tbody>
              </table>
            </div>
            <div class="am__detail" aria-live="polite"></div>
            <footer class="status"><span>${T.length} processes</span><span>${T.filter((t) => t.kind === 'work').length} work · ${T.filter((t) => t.kind === 'edu').length} education</span><span>${esc(D.yearsExperience || '')} yrs experience</span></footer>
          </div>
          <div class="am__panel" role="tabpanel" id="am-p2-${uid}" aria-labelledby="am-t2-${uid}" hidden>
            <div class="am__disks">
              ${D.education.map((e) => {
                const ongoing = /now|present/i.test(e.years);
                return `<article class="disk ${ongoing ? 'disk--live' : ''}">
                  <div class="disk__icon" aria-hidden="true">${MOS.icon('chip')}</div>
                  <div class="disk__body">
                    <h3>${esc(e.degree)}</h3>
                    <p>${esc(e.school)} · ${esc(e.years)}</p>
                    <div class="disk__bar"><span></span></div>
                    <p class="disk__state">${ongoing ? 'In progress · writing to disk…' : 'Complete · verified'}</p>
                  </div>
                </article>`;
              }).join('')}
            </div>
            ${T.filter((t) => t.kind === 'edu').map((t) => `<p class="am__note"><b>${esc(t.title)}.</b> ${esc(t.details)}</p>`).join('')}
          </div>
          <div class="am__panel" role="tabpanel" id="am-p3-${uid}" aria-labelledby="am-t3-${uid}" hidden>
            <ul class="am__courses">
              ${D.courses.map((c) => `<li><a href="${esc(c.url)}"${ext(c.url)}><span class="am__code">${esc(c.code)}</span><span class="am__cname">${esc(c.name)}</span><span class="am__repo">repo ${ui('ext')}</span></a></li>`).join('')}
            </ul>
          </div>
        </div>`;
      const $ = (s) => body.querySelector(s);
      const tbody = $('tbody');
      const order = () => T.map((t, i) => ({ t, i })).sort((a, b) => {
        const va = sortKey === 'year' ? +a.t.year : String(a.t[sortKey]).toLowerCase();
        const vb = sortKey === 'year' ? +b.t.year : String(b.t[sortKey]).toLowerCase();
        return (va > vb ? 1 : va < vb ? -1 : 0) * sortDir;
      });
      const drawRows = () => {
        tbody.innerHTML = order().map(({ t, i }) => `
          <tr data-i="${i}" tabindex="${i === sel ? 0 : -1}" aria-selected="${i === sel}" class="${i === sel ? 'is-sel' : ''}">
            <td><span class="am__pid">${esc(t.year)}</span>${esc(t.title)}</td>
            <td>${esc(t.org)}</td>
            <td class="am__c-kind"><span class="kind kind--${esc(t.kind)}">${esc(KIND[t.kind] || t.kind)}</span></td>
            <td>${esc(t.year)}</td>
            <td class="am__c-dur">${esc(t.duration)}</td>
          </tr>`).join('');
        body.querySelectorAll('[data-sort]').forEach((b) => b.closest('th').setAttribute('aria-sort', b.dataset.sort === sortKey ? (sortDir > 0 ? 'ascending' : 'descending') : 'none'));
      };
      const select = (i, focusRow) => {
        sel = i;
        const t = T[i];
        $('.am__detail').innerHTML = `
          <div class="am__dhead"><span class="kind kind--${esc(t.kind)}">${esc(KIND[t.kind] || t.kind)}</span><h3>${esc(t.title)}</h3></div>
          <p class="am__dmeta">${esc(t.org)} · since ${esc(t.year)} · ${esc(t.duration)}</p>
          <p>${esc(t.details)}</p>`;
        body.querySelectorAll('.am__node').forEach((n) => n.classList.toggle('is-sel', +n.dataset.i === i));
        drawRows();
        if (focusRow) tbody.querySelector(`[data-i="${i}"]`).focus();
      };
      win.select = (i) => { tab(0); select(i); };
      tbody.addEventListener('click', (e) => { const r = e.target.closest('tr'); if (r) select(+r.dataset.i, true); });
      tbody.addEventListener('keydown', (e) => {
        const rows = [...tbody.querySelectorAll('tr')];
        const k = rows.findIndex((r) => +r.dataset.i === sel);
        if (e.key === 'ArrowDown' && k < rows.length - 1) { e.preventDefault(); select(+rows[k + 1].dataset.i, true); }
        if (e.key === 'ArrowUp' && k > 0) { e.preventDefault(); select(+rows[k - 1].dataset.i, true); }
      });
      body.querySelector('.am__track').addEventListener('click', (e) => { const n = e.target.closest('.am__node'); if (n) select(+n.dataset.i); });
      body.querySelector('thead').addEventListener('click', (e) => {
        const b = e.target.closest('[data-sort]'); if (!b) return;
        if (sortKey === b.dataset.sort) sortDir *= -1; else { sortKey = b.dataset.sort; sortDir = sortKey === 'year' ? -1 : 1; }
        drawRows();
      });
      const tabs = [...body.querySelectorAll('[role=tab]')];
      const panels = [...body.querySelectorAll('[role=tabpanel]')];
      const tab = (k, focusIt) => {
        tabs.forEach((t, j) => { t.setAttribute('aria-selected', String(j === k)); t.tabIndex = j === k ? 0 : -1; });
        panels.forEach((p, j) => { p.hidden = j !== k; });
        if (focusIt) tabs[k].focus();
      };
      tabs.forEach((t, k) => t.addEventListener('click', () => tab(k)));
      body.querySelector('.am__tabs').addEventListener('keydown', (e) => {
        const k = tabs.indexOf(document.activeElement); if (k < 0) return;
        if (e.key === 'ArrowRight') tab((k + 1) % tabs.length, true);
        if (e.key === 'ArrowLeft') tab((k + tabs.length - 1) % tabs.length, true);
      });
      select(sel);
    },
  };

  /* ================= Skills (package manager) ================= */
  const initials = (name) => {
    if (/^[A-Z+0-9]{2,4}$/.test(name) || name.length <= 3) return name;
    const parts = name.split(/[\s-]+/).filter(Boolean);
    if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name[0].toUpperCase() + name[1];
  };
  A.skills = {
    title: 'Skills', icon: 'package', size: [780, 560], min: [340, 300],
    reopen(w, q) { if (q && w.search) w.search(q); },
    render(body, win, startQ) {
      const inStack = new Set(D.stack.flatMap((g) => g.items.map((s) => s.toLowerCase())));
      const extra = D.skills.filter((s) => !inStack.has(s.toLowerCase()) && ![...inStack].some((x) => x.startsWith(s.toLowerCase())));
      const groups = [...D.stack, ...(extra.length ? [{ group: 'Also in the toolbox', items: extra }] : [])];
      const total = groups.reduce((n, g) => n + g.items.length, 0);
      const featured = new Set(D.skills.map((s) => s.toLowerCase()));
      const palette = ['var(--cobalt)', 'var(--tomato)', 'var(--mint)', 'var(--lilac)', 'var(--sun)', 'var(--sky)'];
      let cur = '*', q = startQ || '';
      body.innerHTML = `
        <div class="pk">
          <aside class="pk__side">
            <p class="fx__label">Library</p>
            <div class="pk__groups" role="group" aria-label="Package groups">
              <button data-g="*" aria-pressed="true"><span>All packages</span><b>${total}</b></button>
              ${groups.map((g, k) => `<button data-g="${k}" aria-pressed="false" style="--c:${palette[k % palette.length]}"><span>${esc(g.group)}</span><b>${g.items.length}</b></button>`).join('')}
            </div>
          </aside>
          <div class="pk__main">
            <div class="pk__bar">
              <label class="fx__search">${ui('search')}<input type="search" placeholder="Search packages" aria-label="Search skills" /></label>
              <button class="btn pk__update">Update all</button>
            </div>
            <div class="pk__progress" hidden><span></span><p></p></div>
            <div class="pk__list"></div>
            <footer class="status"><span class="pk__count"></span><span>★ = on the short list</span></footer>
          </div>
        </div>`;
      const $ = (s) => body.querySelector(s);
      const list = $('.pk__list');
      const input = $('input');
      input.value = q;
      const draw = () => {
        const ql = q.trim().toLowerCase();
        let shown = 0;
        list.innerHTML = groups.map((g, k) => {
          if (cur !== '*' && +cur !== k) return '';
          const items = g.items.filter((s) => !ql || s.toLowerCase().includes(ql) || g.group.toLowerCase().includes(ql));
          if (!items.length) return '';
          shown += items.length;
          return `<section class="pk__sec" style="--c:${palette[k % palette.length]}"><h3>${esc(g.group)}</h3><ul>${items.map((s) => `
            <li class="pkg"><span class="pkg__ico" aria-hidden="true">${esc(initials(s))}</span>
              <span class="pkg__name">${esc(s)}${featured.has(s.toLowerCase()) ? ' <span class="pkg__star" title="On the short list">★</span>' : ''}</span>
              <span class="pkg__state">${ui('check')}<span>Installed</span></span></li>`).join('')}</ul></section>`;
        }).join('') || `<p class="fx__empty">No package called “${esc(q)}”. Yet.</p>`;
        $('.pk__count').textContent = `${shown} of ${total} packages`;
        body.querySelectorAll('[data-g]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.g === String(cur))));
      };
      body.querySelector('.pk__groups').addEventListener('click', (e) => { const b = e.target.closest('[data-g]'); if (b) { cur = b.dataset.g; draw(); } });
      input.addEventListener('input', () => { q = input.value; draw(); });
      win.search = (s) => { q = s; input.value = s; cur = '*'; draw(); };
      const upd = $('.pk__update');
      upd.addEventListener('click', async () => {
        const bar = $('.pk__progress');
        upd.disabled = true; bar.hidden = false;
        const fill = bar.querySelector('span'); const msg = bar.querySelector('p');
        const all = groups.flatMap((g) => g.items);
        for (let k = 0; k <= all.length; k++) {
          fill.style.width = (k / all.length) * 100 + '%';
          msg.textContent = k < all.length ? `Checking ${all[k]}…` : 'Everything is up to date.';
          if (!win.el.isConnected) return;
          await MOS.wait(MOS.reduced() ? 0 : 55);
        }
        MOS.toast('Software Update', 'All packages are up to date. The learning never really finishes, though.', { icon: 'package' });
        await MOS.wait(1600);
        bar.hidden = true; upd.disabled = false;
      });
      draw();
    },
  };

  /* ================= Mail ================= */
  A.mail = {
    title: 'New Message', icon: 'mail', size: [720, 540], min: [320, 320], focus: 'input[name=subject]',
    reopen(w, subject) { if (subject && w.setSubject) w.setSubject(subject); },
    render(body, win, subject) {
      const gh = D.links.find((l) => /github/i.test(l.label));
      body.innerHTML = `
        <div class="mail">
          <aside class="mail__side">
            <p class="fx__label">Mailboxes</p>
            <p class="mail__box is-on">${ui('send')}<span>Drafts</span><b>1</b></p>
            <p class="fx__label">Elsewhere</p>
            <ul class="mail__links">
              ${D.links.map((l) => `<li><a href="${esc(l.url)}"${ext(l.url)}><span class="mail__lico">${MOS.icon(/github/i.test(l.label) ? 'github' : /linked/i.test(l.label) ? 'linkedin' : 'mail')}</span><span>${esc(l.label)}</span>${/^https?:/.test(l.url) ? ui('ext') : ''}</a></li>`).join('')}
            </ul>
            <p class="mail__loc">${esc(D.location)}<br><span class="mail__clock"></span> there now</p>
          </aside>
          <form class="mail__form" novalidate>
            <div class="mail__row"><span class="mail__k">To</span><span class="mail__to"><span class="mail__chip">${esc(D.name)} &lt;${esc(D.email)}&gt;</span><button type="button" class="btn btn--ghost mail__copy">${ui('copy')}<span>Copy</span></button></span></div>
            <label class="mail__row"><span class="mail__k">Subject</span><input name="subject" autocomplete="off" /></label>
            <label class="mail__msg"><span class="sr-only">Message</span><textarea name="body" rows="8" placeholder="Hi ${esc(firstName)}, …"></textarea></label>
            <div class="mail__foot">
              <a class="btn btn--primary mail__send" href="mailto:${esc(D.email)}">${ui('send')}<span>Send</span></a>
              <span class="mail__note">Opens in your own mail app.</span>
              ${gh ? `<a class="mail__alt" href="${esc(gh.url)}" target="_blank" rel="noopener">or browse GitHub ${ui('ext')}</a>` : ''}
            </div>
          </form>
        </div>`;
      const form = body.querySelector('form');
      const send = body.querySelector('.mail__send');
      const subj = form.elements.subject;
      const msg = form.elements.body;
      subj.value = subject || 'Hello from your portfolio';
      const sync = () => {
        const qs = [];
        if (subj.value) qs.push('subject=' + encodeURIComponent(subj.value));
        if (msg.value) qs.push('body=' + encodeURIComponent(msg.value));
        send.href = `mailto:${D.email}${qs.length ? '?' + qs.join('&') : ''}`;
      };
      win.setSubject = (s) => { subj.value = s; sync(); };
      form.addEventListener('input', sync);
      form.addEventListener('submit', (e) => { e.preventDefault(); send.click(); });
      send.addEventListener('click', () => {
        win.el.classList.remove('is-sent'); void win.el.offsetWidth; win.el.classList.add('is-sent');
        MOS.toast('Opening your mail app', `Addressed to ${D.email}`, { icon: 'mail' });
      });
      body.querySelector('.mail__copy').addEventListener('click', async (e) => {
        const ok = await MOS.copy(D.email);
        const b = e.currentTarget.querySelector('span') || e.target;
        MOS.toast(ok ? 'Copied' : 'Copy failed', ok ? D.email : 'Select the address and copy it manually.', { icon: 'mail' });
        if (b) { b.textContent = ok ? 'Copied' : 'Copy'; setTimeout(() => { b.textContent = 'Copy'; }, 1600); }
      });
      const clock = body.querySelector('.mail__clock');
      const tick = () => { clock.textContent = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', timeZone: MOS.homeZone }); };
      tick();
      const t = setInterval(tick, 15000);
      win.onCleanup(() => clearInterval(t));
      sync();
    },
  };

  /* ================= System Settings ================= */
  A.settings = {
    title: 'System Settings', icon: 'settings', size: [600, 600], min: [320, 300],
    render(body) {
      const theme = MOS.store.get('theme', 'auto');
      const wall = document.documentElement.dataset.wall;
      const accent = MOS.store.get('accent', MOS.accents[0].v);
      body.innerHTML = `
        <div class="set">
          <section class="set__sec"><h3>Appearance</h3>
            <div class="seg seg--text" role="radiogroup" aria-label="Appearance">
              ${['light', 'dark', 'auto'].map((t) => `<button role="radio" data-theme="${t}" aria-checked="${t === theme}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}
            </div>
          </section>
          <section class="set__sec"><h3>Wallpaper</h3>
            <div class="set__walls" role="radiogroup" aria-label="Wallpaper">
              ${MOS.walls.map((w) => `<button role="radio" class="set__wall" data-wall="${w.id}" aria-checked="${w.id === wall}"><span class="set__thumb wallthumb--${w.id}" aria-hidden="true"></span><span>${esc(w.name)}</span></button>`).join('')}
            </div>
          </section>
          <section class="set__sec"><h3>Accent colour</h3>
            <div class="set__accents" role="radiogroup" aria-label="Accent colour">
              ${MOS.accents.map((a) => `<button role="radio" data-accent="${a.v}" aria-checked="${a.v === accent}" aria-label="${a.name}" style="--sw:${a.v}"></button>`).join('')}
            </div>
          </section>
          <section class="set__sec"><h3>Accessibility</h3>
            <label class="switch"><input type="checkbox" class="set__motion" ${document.documentElement.dataset.motion === 'reduce' ? 'checked' : ''} /><span class="switch__ui" aria-hidden="true"></span><span>Reduce motion</span></label>
          </section>
          <section class="set__sec"><h3>Startup</h3>
            <div class="set__row"><button class="btn" data-act="reboot">Replay boot sequence</button><button class="btn" data-act="sticky">Show welcome note</button><button class="btn" data-act="sleep">Start screensaver</button></div>
          </section>
          <section class="set__sec set__about"><span class="set__logo">${MOS.icon('logo')}</span><div><b>MatejOS 26 “Badger”</b><p>Hand-made for ${esc(D.name)} · no frameworks were harmed.</p></div><button class="btn btn--ghost" data-open="osabout">More info</button></section>
        </div>`;
      wireOpeners(body);
      body.addEventListener('click', (e) => {
        const t = e.target.closest('[data-theme]'); const w = e.target.closest('[data-wall]');
        const a = e.target.closest('[data-accent]'); const act = e.target.closest('[data-act]');
        if (t) { MOS.setTheme(t.dataset.theme); body.querySelectorAll('[data-theme]').forEach((b) => b.setAttribute('aria-checked', String(b === t))); }
        if (w) { MOS.setWall(w.dataset.wall); body.querySelectorAll('[data-wall]').forEach((b) => b.setAttribute('aria-checked', String(b === w))); }
        if (a) { MOS.setAccent(a.dataset.accent); body.querySelectorAll('[data-accent]').forEach((b) => b.setAttribute('aria-checked', String(b === a))); }
        if (act) MOS.power(act.dataset.act);
      });
      body.querySelector('.set__motion').addEventListener('change', (e) => MOS.setMotion(e.target.checked));
      MOS.on('wall', (id) => body.querySelectorAll('[data-wall]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.wall === id))));
    },
  };

  /* ================= About This OS ================= */
  A.osabout = {
    title: 'About MatejOS', icon: 'logo', size: [440, 540], min: [300, 300],
    render(body) {
      const vision = D.projects.filter((p) => /vision/i.test(p.area)).length;
      const study = (D.facts.find((f) => /stud/i.test(f.k)) || {}).v || D.role;
      const origin = D.timeline.find((t) => t.kind === 'origin');
      const school = (D.education[0] || {}).school;
      const rows = [
        ['Owner', D.name],
        ['Chip', study],
        ['Memory', `${D.yearsExperience} years of experience`],
        ['Graphics', `${vision} computer-vision projects`],
        ['Startup disk', school],
        ['Location', D.location],
      ].filter((r) => r[1]);
      body.innerHTML = `
        <div class="osa">
          <div class="osa__logo">${MOS.icon('logo')}</div>
          <h3>MatejOS</h3>
          <p class="osa__ver">Version 26 “Badger”</p>
          <dl>${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
          <div class="osa__btns"><button class="btn btn--primary" data-open="about">More info…</button><button class="btn" data-open="terminal">Open Terminal</button></div>
          <p class="osa__legal">© ${origin ? esc(origin.year) : ''}–${thisYear} ${esc(D.name)}. All rights reserved.<br>Running since the first line of C++ in ${origin ? esc(origin.details.match(/Code::Blocks/) ? 'Code::Blocks' : origin.org) : 'school'}.</p>
        </div>`;
      wireOpeners(body);
    },
  };

  /* ================= Trash & the file inside it ================= */
  const origin = D.timeline.find((t) => t.kind === 'origin');
  A.trash = {
    title: 'Trash', icon: 'trash', iconArg: () => true, size: [520, 380], min: [300, 260],
    render(body, win) {
      body.innerHTML = `
        <div class="trash">
          <div class="trash__bar"><span>1 item</span><button class="btn btn--ghost trash__empty">Empty Trash</button></div>
          <div class="trash__items" role="list">
            <div role="listitem"><button class="trash__file">${MOS.icon('doc')}<span>hello_world.cpp</span></button></div>
          </div>
          <div class="trash__confirm" hidden role="alertdialog" aria-label="Confirm">
            <p><b>Erase “hello_world.cpp” forever?</b><br>It's where it all started${origin ? `, back in ${esc(origin.year)}` : ''}.</p>
            <div><button class="btn" data-x="keep">Keep it</button><button class="btn btn--danger" data-x="erase">Erase</button></div>
          </div>
        </div>`;
      const f = body.querySelector('.trash__file');
      MOS.bindOpen(f, () => MOS.wm.open('code', undefined, { from: f }), () => f.classList.add('is-selected'));
      const conf = body.querySelector('.trash__confirm');
      body.querySelector('.trash__empty').addEventListener('click', () => { conf.hidden = false; conf.querySelector('[data-x=keep]').focus(); });
      conf.addEventListener('click', (e) => {
        const b = e.target.closest('[data-x]'); if (!b) return;
        conf.hidden = true;
        if (b.dataset.x === 'erase') {
          win.el.classList.remove('is-shake'); void win.el.offsetWidth; win.el.classList.add('is-shake');
          MOS.toast('Couldn’t empty the Trash', '“hello_world.cpp” is marked as sentimental.', { icon: 'trash' });
        }
      });
    },
  };

  A.code = {
    title: 'hello_world.cpp', icon: 'doc', size: [560, 400], min: [300, 240],
    render(body) {
      const where = origin && /Code::Blocks/.test(origin.details) ? 'Code::Blocks' : 'an IDE';
      const yr = origin ? origin.year : '';
      const lines = [
        ['c', `// hello_world.cpp, ${yr} · ${where} · informatics class`],
        ['c', '// (a dramatic reenactment)'],
        ['', ''],
        ['p', '#include &lt;iostream&gt;'],
        ['', ''],
        ['k', '<span class="k">int</span> <span class="f">main</span>() {'],
        ['', '    std::cout &lt;&lt; <span class="s">"Hello, World!"</span> &lt;&lt; std::endl;'],
        ['', '    <span class="k">return</span> <span class="n">0</span>;'],
        ['', '}'],
        ['', ''],
        ['c', `// ${thisYear - (+yr || thisYear)} years later: robots, vision, RL. Same curiosity.`],
      ];
      body.innerHTML = `<div class="code"><ol>${lines.map(([cls, l]) => `<li class="${cls === 'c' ? 'cm' : cls === 'p' ? 'pp' : ''}">${cls === 'c' ? esc(l) : l}</li>`).join('')}</ol></div>`;
    },
  };
})();
