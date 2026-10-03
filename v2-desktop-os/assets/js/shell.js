/* MatejOS shell: boot, desktop, dock, menu bar, spotlight, wallpapers, power states, easter eggs. */
(() => {
  'use strict';
  const MOS = window.MOS;
  const { $, $$, h, D, esc } = MOS;
  const root = document.documentElement;
  const desktop = $('#desktop');
  const linkOf = (re) => D.links.find((l) => re.test(l.label));

  const APP_NAME = {
    about: 'Notes', projects: 'Files', project: 'Files', experience: 'Activity Monitor', skills: 'Packages', mail: 'Mail',
    terminal: 'Terminal', snake: 'Snake', settings: 'System Settings', osabout: 'MatejOS', trash: 'Files', code: 'Code',
  };

  /* ---------------- Appearance ---------------- */
  const metaTheme = $('meta[name="theme-color"]');
  MOS.setTheme = (t, save = true) => {
    if (save) MOS.store.set('theme', t);
    const eff = t === 'auto' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : t;
    root.dataset.theme = eff;
    metaTheme.content = eff === 'dark' ? '#16151a' : '#f3ede2';
    $('#themeBtn').innerHTML = MOS.ui(eff === 'dark' ? 'sun' : 'moon');
    $('#themeBtn').setAttribute('aria-label', eff === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    MOS.emit('theme', eff);
  };
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (MOS.store.get('theme', 'auto') === 'auto') MOS.setTheme('auto', false); });

  MOS.setWall = (id, save = true) => {
    if (!MOS.walls.some((w) => w.id === id)) id = 'dunes';
    root.dataset.wall = id;
    if (save) MOS.store.set('wall', id);
    $('.wall__art').innerHTML = WALL_ART[id] ? WALL_ART[id]() : '';
    MOS.emit('wall', id);
  };
  MOS.nextWall = () => {
    const i = MOS.walls.findIndex((w) => w.id === root.dataset.wall);
    return MOS.walls[(i + 1) % MOS.walls.length].id;
  };
  MOS.setAccent = (v) => { root.style.setProperty('--accent', v); MOS.store.set('accent', v); };
  MOS.setMotion = (reduce) => {
    if (reduce) root.dataset.motion = 'reduce'; else delete root.dataset.motion;
    MOS.store.set('motion', reduce ? 'reduce' : null);
  };

  /* Wallpaper art, generated so each one is crisp at any size. */
  const rnd = (seed) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const WALL_ART = {
    dunes() {
      const ring = (cx, cy, k, sx, phase) => {
        const r = 40 + k * 46;
        let d = '';
        for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.06) {
          const rr = r * (1 + 0.13 * Math.sin(3 * a + k * 0.32 + phase) + 0.06 * Math.sin(5 * a - k * 0.5));
          d += (d ? 'L' : 'M') + (cx + rr * Math.cos(a) * sx).toFixed(1) + ' ' + (cy + rr * Math.sin(a)).toFixed(1);
        }
        return `<path d="${d}Z"/>`;
      };
      let p = '';
      for (let k = 0; k < 16; k++) p += ring(1180, 700, k, 1.35, 0);
      for (let k = 0; k < 7; k++) p += ring(180, 120, k, 1.2, 2);
      return `<svg viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice"><circle class="w-sun" cx="1260" cy="250" r="110"/><g class="w-lines" fill="none" stroke-width="1.6">${p}</g></svg>`;
    },
    blueprint() {
      const r = rnd(7);
      const g = () => { let s = 0; for (let i = 0; i < 6; i++) s += r(); return s / 6 - 0.5; };
      let dots = '';
      for (let i = 0; i < 260; i++) {
        const near = i < 170;
        const x = near ? 1150 + g() * 360 : r() * 1600;
        const y = near ? 560 + g() * 300 : r() * 1000;
        dots += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${near ? 2.4 : 1.8}"/>`;
      }
      return `<svg viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">
        <g class="w-bp" fill="none" stroke-width="1.4">
          <circle cx="1150" cy="560" r="220" stroke-dasharray="6 8"/><circle cx="1150" cy="560" r="120"/>
          <path d="M1150 300v520M890 560h520"/><path d="M930 860h440M930 850v20M1370 850v20"/>
          <rect x="1126" y="536" width="48" height="48" rx="10"/><path d="M1150 560l60-34"/>
        </g>
        <g class="w-dots">${dots}</g>
        <text x="932" y="900" class="w-label">fig. 1: particles converging on the robot's true pose</text>
      </svg>`;
    },
    night() {
      const r = rnd(42);
      let s = '';
      for (let i = 0; i < 170; i++) s += `<circle cx="${(r() * 1600).toFixed(0)}" cy="${(r() * 760).toFixed(0)}" r="${(0.5 + r() * 1.5).toFixed(2)}" ${i % 9 === 0 ? 'class="tw" style="animation-delay:' + (r() * 4).toFixed(2) + 's"' : ''}/>`;
      return `<svg viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice"><g class="w-stars">${s}</g>
        <defs><mask id="mcres"><rect width="1600" height="1000" fill="#fff"/><circle cx="1354" cy="172" r="50" fill="#000"/></mask></defs><circle class="w-moon" cx="1330" cy="190" r="56" mask="url(#mcres)"/>
        <path class="w-hill w-hill--1" d="M0 860C260 780 520 820 760 860s520 70 840-40V1000H0Z"/>
        <path class="w-hill w-hill--2" d="M0 930c300-60 640-30 900 10s460 20 700-30V1000H0Z"/></svg>`;
    },
    sunset() {
      const cols = ['var(--tomato)', 'var(--orange)', 'var(--sun)', 'var(--pink)'];
      let rings = '';
      [560, 470, 380, 290].forEach((rad, i) => { rings += `<circle cx="1220" cy="1000" r="${rad}" fill="${cols[i]}"/>`; });
      let gaps = '';
      for (let i = 0; i < 9; i++) gaps += `<rect class="w-gap" x="560" y="${640 + i * 40 + i * i * 1.2}" width="1400" height="${3 + i * 2.2}"/>`;
      return `<svg viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice"><g>${rings}</g>${gaps}</svg>`;
    },
  };

  /* ---------------- Desktop icons & dock ---------------- */
  const gh = linkOf(/github/i);
  const li = linkOf(/linked/i);
  const ICONS = [
    { app: 'about', label: 'About Me.txt', icon: 'doc', dockPhone: true },
    { app: 'projects', label: 'Projects', icon: 'folder', dockPhone: true },
    { app: 'experience', label: 'Experience', icon: 'monitor' },
    { app: 'skills', label: 'Skills', icon: 'package' },
    { app: 'mail', label: 'Mail', icon: 'mail', dockPhone: true },
    { app: 'terminal', label: 'Terminal', icon: 'terminal', dockPhone: true },
    { app: 'snake', label: 'Snake.app', icon: 'snake' },
    gh && { href: gh.url, label: 'GitHub', icon: 'github' },
    li && { href: li.url, label: 'LinkedIn', icon: 'linkedin' },
    { app: 'settings', label: 'Settings', icon: 'settings', phoneOnly: true },
    { app: 'trash', label: 'Trash', icon: 'trash', phoneOnly: true },
  ].filter(Boolean);
  const DOCK = ['about', 'projects', 'experience', 'skills', 'mail', 'terminal', 'snake', 'settings', '|', 'trash'];
  const DOCK_LABEL = { about: 'About Me', projects: 'Projects', experience: 'Experience', skills: 'Skills', mail: 'Mail', terminal: 'Terminal', snake: 'Snake', settings: 'System Settings', trash: 'Trash' };
  const DOCK_ICON = { about: 'doc', projects: 'folder', experience: 'monitor', skills: 'package', mail: 'mail', terminal: 'terminal', snake: 'snake', settings: 'settings', trash: 'trash' };
  const PHONE_DOCK = ['about', 'projects', 'mail', 'terminal'];

  function buildIcons() {
    const box = $('#icons');
    ICONS.forEach((it) => {
      const cls = `icon${it.phoneOnly ? ' icon--phone' : ''}${it.dockPhone ? ' icon--dockphone' : ''}`;
      const inner = [h('span', { class: 'icon__img', html: MOS.icon(it.icon) }), h('span', { class: 'icon__label', text: it.label })];
      let el;
      if (it.href) {
        el = h('a', { class: cls + ' icon--link', href: it.href, target: '_blank', rel: 'noopener', 'aria-label': `${it.label} (opens in a new tab)` }, inner, h('span', { class: 'icon__alias', 'aria-hidden': 'true', html: MOS.ui('ext') }));
        el.addEventListener('click', (e) => {
          // On a mouse, first click selects like any other icon; double-click or Enter follows the link.
          if (e.detail === 1 && !MOS.isTouch() && !MOS.isPhone()) { e.preventDefault(); selectIcon(el); }
        });
        el.addEventListener('dblclick', () => { if (!MOS.isTouch() && !MOS.isPhone()) window.open(it.href, '_blank', 'noopener'); });
      } else {
        el = h('button', { class: cls, 'data-app': it.app }, inner);
        MOS.bindOpen(el, () => { selectIcon(null); launch(it.app, el.querySelector('.icon__img')); }, () => selectIcon(el));
      }
      box.append(h('div', { role: 'listitem', class: 'icon-wrap' + (it.phoneOnly ? ' icon-wrap--phone' : '') + (it.dockPhone ? ' icon-wrap--dockphone' : '') }, el));
    });
    box.addEventListener('keydown', (e) => {
      const all = $$('.icon', box).filter((x) => x.offsetParent);
      const i = all.indexOf(document.activeElement);
      if (i < 0) return;
      const cols = MOS.isPhone() ? 4 : 1;
      const map = MOS.isPhone() ? { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols } : { ArrowDown: 1, ArrowUp: -1, ArrowRight: 7, ArrowLeft: -7 };
      if (map[e.key] != null) { e.preventDefault(); const j = MOS.clamp(i + map[e.key], 0, all.length - 1); all[j].focus(); selectIcon(all[j]); }
      if (e.key === 'Delete' || e.key === 'Backspace') { MOS.toast('Nice try', 'Desktop items are glued down. Matej’s work stays.', { icon: 'trash' }); }
    });
  }
  function selectIcon(el) {
    $$('.icon.is-selected').forEach((x) => { if (x !== el) x.classList.remove('is-selected'); });
    if (el) el.classList.add('is-selected');
  }

  function launch(app, from) {
    const existed = MOS.wm.list().some((w) => w.appId === app);
    const w = MOS.wm.open(app, undefined, { from });
    if (!existed) bounce(app);
    return w;
  }
  function bounce(app) {
    const it = $(`#dockList [data-app="${app}"]`);
    if (!it || MOS.reduced()) return;
    it.classList.remove('is-bounce'); void it.offsetWidth; it.classList.add('is-bounce');
  }

  function buildDock() {
    const ul = $('#dockList');
    DOCK.forEach((app) => {
      if (app === '|') { ul.append(h('li', { class: 'dock__sep', 'aria-hidden': 'true' })); return; }
      const btn = h('button', { class: 'dock__btn', 'aria-label': DOCK_LABEL[app] },
        h('span', { class: 'dock__icon', html: MOS.icon(DOCK_ICON[app]) }),
        h('span', { class: 'dock__tip', 'aria-hidden': 'true', text: DOCK_LABEL[app] }),
        h('span', { class: 'dock__dot', 'aria-hidden': 'true' }));
      btn.addEventListener('click', () => {
        const mine = MOS.wm.list().filter((w) => (w.app.dockAs || w.appId) === app);
        const min = mine.find((w) => w.minimized);
        if (min) { MOS.wm.restore(min); return; }
        launch(app, btn.querySelector('.dock__icon'));
      });
      ul.append(h('li', { 'data-app': app, class: PHONE_DOCK.includes(app) ? 'is-phone' : '' }, btn));
    });
    // Magnification
    const dock = $('#dock');
    dock.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse' || MOS.reduced() || MOS.isPhone()) return;
      $$('.dock__btn', ul).forEach((b) => {
        const r = b.getBoundingClientRect();
        const d = Math.abs(e.clientX - (r.left + r.width / 2));
        b.style.setProperty('--mag', Math.max(0, 1 - d / 150).toFixed(3));
      });
    });
    dock.addEventListener('pointerleave', () => $$('.dock__btn', ul).forEach((b) => b.style.setProperty('--mag', 0)));
  }

  function syncDock() {
    const open = new Set(MOS.wm.list().map((w) => w.app.dockAs || w.appId));
    $$('#dockList li[data-app]').forEach((li2) => {
      const on = open.has(li2.dataset.app);
      li2.classList.toggle('is-running', on);
      li2.querySelector('.dock__btn').setAttribute('aria-label', DOCK_LABEL[li2.dataset.app] + (on ? ' (open)' : ''));
    });
    document.body.classList.toggle('has-app', MOS.wm.list().some((w) => !w.minimized));
    const trash = $('#dockList li[data-app="trash"] .dock__icon');
    if (trash && !trash.dataset.full) { trash.innerHTML = MOS.icon('trash', true); trash.dataset.full = '1'; }
  }

  /* ---------------- Hero + sticky note ---------------- */
  function buildHero() {
    const [firstN, ...rest] = D.name.split(' ');
    $('#heroName').innerHTML = `<span>${esc(firstN)}</span><span>${esc(rest.join(' '))}</span>`;
    $('#heroTitle').textContent = D.title;
    $('#heroRole').textContent = `${D.role}`;
    $('.hero__who').textContent = firstN;
    MOS.typer($('#heroVerb'));
    const facts = h('ul', { class: 'hero__facts' }, D.facts.map((f) => h('li', null, h('span', { text: f.k }), h('b', { text: f.v }))));
    $('.hero').append(facts);
  }
  function buildSticky() {
    const st = $('#sticky');
    if (MOS.store.get('stickyGone', false)) st.hidden = true;
    st.querySelector('.sticky__close').addEventListener('click', () => { st.hidden = true; MOS.store.set('stickyGone', true); });
    let drag = null;
    st.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button') || MOS.isPhone() || e.button !== 0) return;
      const r = st.getBoundingClientRect();
      drag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
      st.setPointerCapture(e.pointerId);
      st.classList.add('is-dragging');
    });
    st.addEventListener('pointermove', (e) => {
      if (!drag) return;
      st.style.left = MOS.clamp(e.clientX - drag.dx, 0, innerWidth - st.offsetWidth) + 'px';
      st.style.top = MOS.clamp(e.clientY - drag.dy, 30, innerHeight - st.offsetHeight) + 'px';
      st.style.right = 'auto'; st.style.bottom = 'auto';
    });
    const end = () => { drag = null; st.classList.remove('is-dragging'); };
    st.addEventListener('pointerup', end);
    st.addEventListener('pointercancel', end);
  }
  MOS.showSticky = () => { const st = $('#sticky'); st.hidden = false; MOS.store.set('stickyGone', false); };

  /* ---------------- Menu bar ---------------- */
  const menus = $('#menus');
  let openMenu = null;

  function menuItems(kind) {
    const w = MOS.wm.active();
    const sep = { sep: true };
    if (kind === 'logo') return [
      { label: 'About MatejOS', run: () => MOS.wm.open('osabout') },
      { label: 'System Settings…', run: () => MOS.wm.open('settings') },
      sep,
      { label: 'Sleep', run: () => MOS.power('sleep') },
      { label: 'Restart…', run: () => MOS.power('reboot') },
      { label: 'Shut Down…', run: () => MOS.power('shutdown') },
    ];
    if (kind === 'app') return [
      { label: w ? `About ${APP_NAME[w.appId] || w.title}` : 'About MatejOS', run: () => (w && w.appId === 'about' ? null : MOS.wm.open(w ? (['project', 'projects', 'trash'].includes(w.appId) ? 'about' : 'osabout') : 'osabout')) },
      sep,
      { label: 'Minimize', kbd: '', disabled: !w, run: () => w && MOS.wm.minimize(w) },
      { label: 'Zoom', disabled: !w, run: () => w && MOS.wm.toggleMax(w) },
      { label: 'Close Window', kbd: 'esc', disabled: !w, run: () => w && MOS.wm.requestClose(w) },
    ];
    if (kind === 'go') return [
      ...['about', 'projects', 'experience', 'skills', 'mail', 'terminal', 'snake'].map((a) => ({ label: DOCK_LABEL[a], icon: DOCK_ICON[a], run: () => launch(a) })),
      sep,
      ...D.links.filter((l) => /^https?:/.test(l.url)).map((l) => ({ label: l.label, href: l.url, icon: /github/i.test(l.label) ? 'github' : 'linkedin' })),
    ];
    if (kind === 'window') {
      const list = MOS.wm.list();
      return [
        { label: 'Minimize All', disabled: !list.length, run: () => list.forEach((x) => MOS.wm.minimize(x)) },
        { label: 'Close All', disabled: !list.length, run: () => MOS.wm.closeAll() },
        ...(list.length ? [sep] : []),
        ...list.map((x) => ({ label: x.title, check: x === w, run: () => (x.minimized ? MOS.wm.restore(x) : MOS.wm.focus(x)) })),
      ];
    }
    if (kind === 'help') return [
      { label: 'Search MatejOS…', kbd: 'Ctrl K', run: () => openSpotlight() },
      { label: 'Open Terminal', kbd: '`', run: () => launch('terminal') },
      { label: 'Show Welcome Note', run: () => MOS.showSticky() },
      sep,
      { label: 'Keyboard Shortcuts', run: () => MOS.toast('Shortcuts', 'Ctrl/⌘ K search · ` terminal · Esc close window · arrows move between icons', { timeout: 7000 }) },
    ];
    return [];
  }

  function showMenu(kind, btn) {
    closeMenu();
    const m = h('div', { class: 'menu', role: 'menu', id: 'menu-' + kind, 'aria-label': btn.textContent.trim() || 'MatejOS' });
    menuItems(kind).forEach((it) => {
      if (it.sep) { m.append(h('div', { class: 'menu__sep', role: 'separator' })); return; }
      const inner = [
        h('span', { class: 'menu__check', 'aria-hidden': 'true', text: it.check ? '✓' : '' }),
        it.icon ? h('span', { class: 'menu__ico', html: MOS.icon(it.icon) }) : null,
        h('span', { class: 'menu__label', text: it.label }),
        it.kbd ? h('kbd', { text: it.kbd }) : null,
        it.href ? h('span', { class: 'menu__ext', html: MOS.ui('ext') }) : null,
      ];
      const el = it.href
        ? h('a', { class: 'menu__item', role: 'menuitem', href: it.href, target: '_blank', rel: 'noopener', tabindex: '-1' }, inner)
        : h('button', { class: 'menu__item', role: 'menuitem', tabindex: '-1', disabled: it.disabled }, inner);
      el.addEventListener('click', () => { closeMenu(); if (it.run) it.run(); });
      m.append(el);
    });
    menus.append(m);
    const r = btn.getBoundingClientRect();
    m.style.left = Math.min(r.left, innerWidth - m.offsetWidth - 6) + 'px';
    m.style.top = r.bottom + 4 + 'px';
    btn.setAttribute('aria-expanded', 'true');
    btn.classList.add('is-open');
    openMenu = { m, btn, kind };
    m.addEventListener('keydown', menuKeys);
    const firstItem = m.querySelector('.menu__item:not([disabled])');
    if (firstItem) firstItem.focus({ preventScroll: true });
  }
  function menuKeys(e) {
    const items = $$('.menu__item:not([disabled])', e.currentTarget);
    const i = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
    if (e.key === 'Home') { e.preventDefault(); items[0].focus(); }
    if (e.key === 'End') { e.preventDefault(); items[items.length - 1].focus(); }
    if (e.key === 'Tab') { closeMenu(true); }
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      const bar = $$('.menubar__left .mb-btn[aria-haspopup]').filter((b) => b.offsetParent);
      const k = bar.indexOf(openMenu.btn);
      const next = bar[(k + (e.key === 'ArrowRight' ? 1 : -1) + bar.length) % bar.length];
      e.preventDefault();
      openFromBtn(next);
    }
  }
  function closeMenu(refocus) {
    if (!openMenu) return;
    const { m, btn } = openMenu;
    m.remove();
    btn.setAttribute('aria-expanded', 'false');
    btn.classList.remove('is-open');
    if (refocus === true) btn.focus({ preventScroll: true });
    openMenu = null;
  }
  function openFromBtn(btn) {
    const kind = btn.id === 'logoBtn' ? 'logo' : btn.id === 'appBtn' ? 'app' : btn.id === 'clockBtn' ? 'clock' : btn.dataset.menu;
    if (kind === 'clock') return showClock(btn);
    showMenu(kind, btn);
  }

  function buildMenubar() {
    $('#logoBtn').innerHTML = MOS.ui('m');
    $('#searchBtn').innerHTML = MOS.ui('search');
    $('.sb-glyphs').innerHTML = MOS.ui('signal') + MOS.ui('battery');
    $$('.menubar .mb-btn[aria-haspopup]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (openMenu && openMenu.btn === btn) { closeMenu(); return; }
        openFromBtn(btn);
      });
      btn.addEventListener('pointerenter', () => { if (openMenu && openMenu.btn !== btn && btn.id !== 'clockBtn' && openMenu.kind !== 'clock') openFromBtn(btn); });
      btn.addEventListener('keydown', (e) => { if (e.key === 'ArrowDown') { e.preventDefault(); openFromBtn(btn); } });
    });
    $('#searchBtn').addEventListener('click', () => openSpotlight());
    $('#themeBtn').addEventListener('click', () => MOS.setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark'));
    document.addEventListener('pointerdown', (e) => {
      if (openMenu && !e.target.closest('.menu, .popover') && !e.target.closest('.mb-btn')) closeMenu();
      if (ctx && !e.target.closest('.ctx')) closeCtx();
    });
    MOS.on('focus', (w) => { $('#appBtn').textContent = w ? APP_NAME[w.appId] || w.title : 'Desktop'; });
    $('#appBtn').textContent = 'Desktop';
    tickClock();
    setInterval(tickClock, 1000 * 10);
  }

  function tickClock() {
    const now = new Date();
    const phone = MOS.isPhone();
    $('#clock').textContent = phone
      ? now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      : now.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' }) + '  ' + now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    $('.sb-time').textContent = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).replace(/\s?[AP]M/i, '');
    $('#clockBtn').setAttribute('aria-label', 'Clock: ' + now.toLocaleString([], { dateStyle: 'full', timeStyle: 'short' }));
  }

  function showClock(btn) {
    closeMenu();
    const now = new Date();
    const y = now.getFullYear(), mth = now.getMonth();
    const firstDay = (new Date(y, mth, 1).getDay() + 6) % 7;
    const days = new Date(y, mth + 1, 0).getDate();
    let cells = '';
    for (let i = 0; i < firstDay; i++) cells += '<span></span>';
    for (let d = 1; d <= days; d++) cells += `<span class="${d === now.getDate() ? 'is-today' : ''}">${d}</span>`;
    const home = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', timeZone: MOS.homeZone });
    const pop = h('div', { class: 'menu popover', role: 'dialog', 'aria-label': 'Calendar', tabindex: '-1' });
    pop.innerHTML = `
      <p class="pop__time">${esc(now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }))}</p>
      <p class="pop__date">${esc(now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }))}</p>
      <div class="pop__cal"><b>${esc(now.toLocaleDateString([], { month: 'long' }))}</b><div class="pop__grid">${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d) => `<i>${d}</i>`).join('')}${cells}</div></div>
      <p class="pop__home"><span class="dot"></span> In ${esc(D.location.split(',')[0])}, it's <b>${esc(home)}</b></p>`;
    menus.append(pop);
    const r = btn.getBoundingClientRect();
    pop.style.left = Math.max(6, Math.min(r.right - pop.offsetWidth, innerWidth - pop.offsetWidth - 6)) + 'px';
    pop.style.top = r.bottom + 4 + 'px';
    btn.setAttribute('aria-expanded', 'true');
    btn.classList.add('is-open');
    openMenu = { m: pop, btn, kind: 'clock' };
    pop.focus({ preventScroll: true });
  }

  /* ---------------- Context menu ---------------- */
  let ctx = null;
  function closeCtx() { if (ctx) { ctx.remove(); ctx = null; } }
  function showCtx(x, y) {
    closeCtx(); closeMenu();
    const dark = root.dataset.theme === 'dark';
    const nextName = MOS.walls.find((w) => w.id === MOS.nextWall()).name;
    const items = [
      { label: `Next Wallpaper: ${nextName}`, run: () => { MOS.setWall(MOS.nextWall()); } },
      { label: dark ? 'Use Light Appearance' : 'Use Dark Appearance', run: () => MOS.setTheme(dark ? 'light' : 'dark') },
      { label: 'Clean Up', run: () => cleanUp() },
      { sep: true },
      { label: 'New Terminal Window', run: () => launch('terminal') },
      { label: 'Search…', kbd: 'Ctrl K', run: () => openSpotlight() },
      { label: 'Change Desktop Background…', run: () => MOS.wm.open('settings') },
      { sep: true },
      { label: 'About MatejOS', run: () => MOS.wm.open('osabout') },
    ];
    ctx = h('div', { class: 'menu ctx', role: 'menu', 'aria-label': 'Desktop' });
    items.forEach((it) => {
      if (it.sep) { ctx.append(h('div', { class: 'menu__sep', role: 'separator' })); return; }
      const b = h('button', { class: 'menu__item', role: 'menuitem', tabindex: '-1' }, h('span', { class: 'menu__check' }), h('span', { class: 'menu__label', text: it.label }), it.kbd ? h('kbd', { text: it.kbd }) : null);
      b.addEventListener('click', () => { closeCtx(); it.run(); });
      ctx.append(b);
    });
    menus.append(ctx);
    ctx.style.left = Math.min(x, innerWidth - ctx.offsetWidth - 6) + 'px';
    ctx.style.top = Math.min(y, innerHeight - ctx.offsetHeight - 6) + 'px';
    ctx.addEventListener('keydown', (e) => {
      const its = $$('.menu__item', ctx); const i = its.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); its[(i + 1) % its.length].focus(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); its[(i - 1 + its.length) % its.length].focus(); }
      if (e.key === 'Tab') closeCtx();
    });
    ctx.querySelector('.menu__item').focus({ preventScroll: true });
  }
  function cleanUp() {
    selectIcon(null);
    $$('.icon-wrap').forEach((w, i) => {
      if (MOS.reduced()) return;
      w.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-14px)' }, { transform: 'translateY(0)' }], { duration: 420, delay: i * 40, easing: 'cubic-bezier(.3,1.6,.5,1)' });
    });
  }

  function bindDesktop() {
    desktop.addEventListener('contextmenu', (e) => {
      if (MOS.isPhone() || e.target.closest('.icon, .sticky, a')) return;
      e.preventDefault();
      showCtx(e.clientX, e.clientY);
    });
    desktop.addEventListener('keydown', (e) => {
      if ((e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) && !MOS.isPhone()) {
        e.preventDefault();
        const r = (document.activeElement || desktop).getBoundingClientRect();
        showCtx(r.left + 20, r.top + 20);
      }
    });
    // Rubber-band selection
    const band = $('#band');
    desktop.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || e.pointerType !== 'mouse' || MOS.isPhone()) return;
      if (e.target.closest('.icon, .sticky, .hero a, button, a')) return;
      selectIcon(null);
      const sx = e.clientX, sy = e.clientY;
      let on = false;
      const move = (ev) => {
        const x = Math.min(sx, ev.clientX), y = Math.min(sy, ev.clientY);
        const w = Math.abs(ev.clientX - sx), hh = Math.abs(ev.clientY - sy);
        if (!on && w + hh < 6) return;
        on = true; band.hidden = false;
        Object.assign(band.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: hh + 'px' });
        $$('.icon').forEach((ic) => {
          if (!ic.offsetParent) return;
          const r = ic.getBoundingClientRect();
          ic.classList.toggle('is-selected', r.right > x && r.left < x + w && r.bottom > y && r.top < y + hh);
        });
      };
      const up = () => { band.hidden = true; removeEventListener('pointermove', move); removeEventListener('pointerup', up); };
      addEventListener('pointermove', move);
      addEventListener('pointerup', up);
    });
  }

  /* ---------------- Spotlight ---------------- */
  const spot = $('#spotlight');
  const sInput = $('#spotInput');
  const sList = $('#spotList');
  let sItems = [], sSel = 0, sReturn = null;

  const INDEX = (() => {
    const idx = [];
    ['about', 'projects', 'experience', 'skills', 'mail', 'terminal', 'snake', 'settings', 'trash'].forEach((a) =>
      idx.push({ group: 'Apps', label: DOCK_LABEL[a], sub: APP_NAME[a], icon: DOCK_ICON[a], run: () => launch(a) }));
    idx.push({ group: 'Apps', label: 'About MatejOS', sub: 'System', icon: 'logo', run: () => MOS.wm.open('osabout') });
    D.projects.forEach((p, i) => idx.push({ group: 'Projects', label: p.title, sub: `${p.area} · ${p.tag}`, extra: p.blurb + ' ' + p.bullets.join(' '), icon: 'file', iconArg: MOS.areaHex(p.area), run: () => MOS.wm.open('project', i) }));
    D.timeline.forEach((t, i) => idx.push({ group: 'Experience', label: t.title, sub: `${t.org} · ${t.year}`, extra: t.details, icon: 'monitor', run: () => MOS.wm.open('experience', i) }));
    const seen = new Set();
    [...D.skills, ...D.stack.flatMap((g) => g.items)].forEach((s) => {
      if (seen.has(s.toLowerCase())) return; seen.add(s.toLowerCase());
      idx.push({ group: 'Skills', label: s, sub: (D.stack.find((g) => g.items.includes(s)) || {}).group || 'Skill', icon: 'package', run: () => MOS.wm.open('skills', s) });
    });
    D.courses.forEach((c) => idx.push({ group: 'Coursework', label: `${c.code} ${c.name}`, sub: 'GitHub repo', icon: 'github', href: c.url }));
    D.links.forEach((l) => idx.push({ group: 'Links', label: l.label, sub: l.url.replace(/^mailto:|^https?:\/\/(www\.)?/, ''), icon: /github/i.test(l.label) ? 'github' : /linked/i.test(l.label) ? 'linkedin' : 'mail', href: l.url }));
    [
      ['Toggle Dark Mode', () => MOS.setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark')],
      ['Next Wallpaper', () => MOS.setWall(MOS.nextWall())],
      ['Sleep', () => MOS.power('sleep')],
      ['Restart', () => MOS.power('reboot')],
      ['Shut Down', () => MOS.power('shutdown')],
    ].forEach(([label, run]) => idx.push({ group: 'Actions', label, sub: 'System', icon: 'settings', run }));
    return idx;
  })();

  function searchIndex(q) {
    q = q.trim().toLowerCase();
    if (!q) return [...INDEX.filter((x) => x.group === 'Apps').slice(0, 5), ...INDEX.filter((x) => x.group === 'Projects').slice(0, 4)];
    return INDEX.map((x) => {
      const l = x.label.toLowerCase();
      let s = 0;
      if (l === q) s = 10; else if (l.startsWith(q)) s = 6; else if (l.split(/\s+/).some((w) => w.startsWith(q))) s = 4; else if (l.includes(q)) s = 3;
      else if ((x.sub || '').toLowerCase().includes(q)) s = 2; else if ((x.extra || '').toLowerCase().includes(q)) s = 1;
      return { x, s };
    }).filter((r) => r.s).sort((a, b) => b.s - a.s).slice(0, 12).map((r) => r.x);
  }

  function drawSpot() {
    sItems = searchIndex(sInput.value);
    sSel = Math.min(sSel, Math.max(0, sItems.length - 1));
    sList.innerHTML = '';
    let lastGroup = '';
    if (!sItems.length) sList.append(h('li', { class: 'spot__empty', role: 'presentation', text: `No results for “${sInput.value}”. Try “robot”, “Python” or “snake”.` }));
    sItems.forEach((it, i) => {
      if (it.group !== lastGroup) { sList.append(h('li', { class: 'spot__group', role: 'presentation', text: it.group })); lastGroup = it.group; }
      const li2 = h('li', { class: 'spot__item' + (i === sSel ? ' is-sel' : ''), role: 'option', id: 'spot-' + i, 'aria-selected': String(i === sSel) },
        h('span', { class: 'spot__ico', html: MOS.icon(it.icon, it.iconArg) }),
        h('span', { class: 'spot__text' }, h('b', { text: it.label }), h('span', { text: it.sub || '' })),
        it.href ? h('span', { class: 'spot__ext', html: MOS.ui('ext') }) : h('kbd', { class: 'spot__enter', text: '↵' }));
      li2.addEventListener('pointermove', () => { if (sSel !== i) { sSel = i; markSpot(); } });
      li2.addEventListener('click', () => runSpot(i));
      sList.append(li2);
    });
    sInput.setAttribute('aria-activedescendant', sItems.length ? 'spot-' + sSel : '');
  }
  function markSpot() {
    $$('.spot__item', sList).forEach((el, i) => { el.classList.toggle('is-sel', i === sSel); el.setAttribute('aria-selected', String(i === sSel)); });
    sInput.setAttribute('aria-activedescendant', 'spot-' + sSel);
    const el = $('#spot-' + sSel); if (el) el.scrollIntoView({ block: 'nearest' });
  }
  function runSpot(i) {
    const it = sItems[i]; if (!it) return;
    closeSpotlight(false);
    if (it.href) window.open(it.href, /^mailto:/.test(it.href) ? '_self' : '_blank', 'noopener');
    else it.run();
  }
  function openSpotlight() {
    closeMenu(); closeCtx();
    sReturn = document.activeElement;
    spot.hidden = false;
    sInput.value = ''; sSel = 0;
    drawSpot();
    sInput.focus();
  }
  function closeSpotlight(refocus = true) {
    if (spot.hidden) return;
    spot.hidden = true;
    if (refocus && sReturn && sReturn.focus) sReturn.focus({ preventScroll: true });
  }
  MOS.openSpotlight = openSpotlight;
  sInput.addEventListener('input', () => { sSel = 0; drawSpot(); });
  sInput.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); sSel = Math.min(sItems.length - 1, sSel + 1); markSpot(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sSel = Math.max(0, sSel - 1); markSpot(); }
    else if (e.key === 'Enter') { e.preventDefault(); runSpot(sSel); }
    else if (e.key === 'Escape') { e.preventDefault(); closeSpotlight(); }
    else if (e.key === 'Tab') { e.preventDefault(); }
  });
  spot.addEventListener('pointerdown', (e) => { if (e.target === spot) closeSpotlight(); });

  /* ---------------- Boot / power states ---------------- */
  const boot = $('#boot');
  const overlay = $('#overlay');

  async function runBoot() {
    root.classList.add('is-booting');
    boot.setAttribute('aria-hidden', 'false');
    const log = boot.querySelector('.boot__log');
    const bar = boot.querySelector('.boot__bar span');
    boot.querySelector('.boot__logo').innerHTML = MOS.icon('logo');
    log.textContent = '';
    boot.classList.remove('is-splash', 'is-done');
    bar.style.width = '0%';
    let skip = false;
    const doSkip = (e) => { if (e && e.type === 'keydown' && ['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return; skip = true; };
    addEventListener('keydown', doSkip);
    boot.addEventListener('pointerdown', doSkip);
    const wait = async (ms) => { const end = performance.now() + ms; while (!skip && performance.now() < end) await MOS.wait(16); };
    const dots = (s, n = MOS.isPhone() ? 40 : 54) => s + ' ' + '.'.repeat(Math.max(2, n - s.length)) + ' ';
    const line = async (s, ok = 'ok', ms = 120) => {
      if (skip) return;
      const row = document.createElement('div');
      row.innerHTML = esc(dots(s)) + `<span class="ok">${esc(ok)}</span>`;
      row.lastChild.style.visibility = 'hidden';
      log.append(row);
      await wait(ms);
      row.lastChild.style.visibility = 'visible';
    };
    const edu = [...D.education].reverse();
    const topLangs = (D.stack.find((g) => /lang/i.test(g.group)) || { items: D.skills }).items.slice(0, MOS.isPhone() ? 3 : 6);
    log.innerHTML = `<div class="boot__hd">MatejOS BIOS v26.${String(new Date().getMonth() + 1).padStart(2, '0')}  ·  (c) ${esc(D.name)}</div><div class="dim">Press any key to skip</div><div>&nbsp;</div>`;
    await wait(260);
    await line(`CPU0: ${D.title}`);
    await line(`RAM:  ${D.yearsExperience} years experience`, 'ok');
    await line(`LOC:  ${D.location}`);
    await line('Mounting /education');
    for (const e of edu) await line(`  Loading ${e.degree.replace('Computer Science', 'CS')}`, /now/i.test(e.years) ? 'live' : 'ok', 140);
    await line(`Loading drivers: ${topLangs.join(' ')}`, 'ok', 160);
    await line(`Indexing ${D.projects.length} projects`, 'ok', 160);
    await line(`Calibrating particle filter`, 'ok', 120);
    await line('Starting window server', 'ok', 180);
    if (!skip) {
      boot.classList.add('is-splash');
      for (let p = 0; p <= 100 && !skip; p += 4) { bar.style.width = p + '%'; await wait(22); }
      await wait(200);
    }
    removeEventListener('keydown', doSkip);
    boot.removeEventListener('pointerdown', doSkip);
    boot.classList.add('is-done');
    MOS.session.set('booted', true);
    await MOS.wait(MOS.reduced() ? 0 : 420);
    root.classList.remove('is-booting');
    boot.setAttribute('aria-hidden', 'true');
  }

  let saverRaf = null;
  function sleepMode() {
    if (overlay.dataset.mode) return;
    overlay.hidden = false;
    overlay.dataset.mode = 'saver';
    overlay.innerHTML = `<div class="saver"><div class="saver__logo">${MOS.icon('logo')}<span>MatejOS</span></div><p class="saver__hits">corner hits: <b>0</b></p><p class="saver__hint">move the mouse or press a key to wake</p></div>`;
    const logo = overlay.querySelector('.saver__logo');
    const hitsEl = overlay.querySelector('.saver__hits b');
    let x = 80, y = 80, vx = 2.2, vy = 1.7, hits = 0, hue = 0;
    const started = performance.now();
    const tick = () => {
      const W = innerWidth - logo.offsetWidth, H = innerHeight - logo.offsetHeight;
      if (!MOS.reduced()) {
        x += vx; y += vy;
        let bx = false, by = false;
        if (x <= 0 || x >= W) { vx *= -1; x = MOS.clamp(x, 0, W); bx = true; }
        if (y <= 0 || y >= H) { vy *= -1; y = MOS.clamp(y, 0, H); by = true; }
        if (bx || by) { hue = (hue + 67) % 360; logo.style.filter = `hue-rotate(${hue}deg)`; }
        if (bx && by) { hits++; hitsEl.textContent = hits; logo.classList.remove('is-hit'); void logo.offsetWidth; logo.classList.add('is-hit'); }
      } else { x = W / 2; y = H / 2; }
      logo.style.transform = `translate(${x}px, ${y}px)`;
      saverRaf = requestAnimationFrame(tick);
    };
    tick();
    const wake = () => {
      if (performance.now() - started < 600) return;
      cancelAnimationFrame(saverRaf);
      overlay.hidden = true; overlay.innerHTML = ''; delete overlay.dataset.mode;
      removeEventListener('pointermove', wake); removeEventListener('keydown', wake); removeEventListener('pointerdown', wake);
    };
    addEventListener('pointermove', wake); addEventListener('keydown', wake); addEventListener('pointerdown', wake);
  }

  async function shutdown(rebootAfter) {
    closeMenu(); closeSpotlight(false);
    overlay.hidden = false;
    overlay.dataset.mode = 'off';
    overlay.innerHTML = `<div class="off"><div class="off__spin" aria-hidden="true"></div><p>${rebootAfter ? 'Restarting' : 'Shutting down'}…</p></div>`;
    overlay.setAttribute('role', 'status');
    for (const w of MOS.wm.list()) { MOS.wm.close(w); await MOS.wait(MOS.reduced() ? 0 : 90); }
    await MOS.wait(MOS.reduced() ? 100 : 900);
    if (rebootAfter) { overlay.hidden = true; overlay.innerHTML = ''; delete overlay.dataset.mode; await runBoot(); afterBoot(); return; }
    overlay.innerHTML = `<div class="off off--safe"><p class="off__safe">It's now safe to turn off<br>your computer.</p><button class="off__power">${MOS.ui('m')}<span>Press any key or click to start MatejOS</span></button></div>`;
    const btn = overlay.querySelector('.off__power');
    btn.focus();
    const wake = async (e) => {
      if (e.type === 'keydown' && ['Shift', 'Control', 'Alt', 'Meta', 'Tab'].includes(e.key)) return;
      removeEventListener('keydown', wake); overlay.removeEventListener('click', wake);
      overlay.hidden = true; overlay.innerHTML = ''; delete overlay.dataset.mode;
      await runBoot(); afterBoot();
    };
    setTimeout(() => { addEventListener('keydown', wake); overlay.addEventListener('click', wake); }, 400);
  }

  async function bsod() {
    closeMenu(); closeSpotlight(false);
    overlay.hidden = false;
    overlay.dataset.mode = 'bsod';
    overlay.innerHTML = `<div class="bsod"><p class="bsod__face">:(</p>
      <p class="bsod__msg">MatejOS ran into a problem: someone tried <code>rm -rf /</code> on a portfolio. We're putting everything back where it was.</p>
      <p class="bsod__pct"><b>0</b>% complete</p>
      <div class="bsod__foot"><div class="bsod__qr" aria-hidden="true"></div><p>For more information, don't search online.<br>Stop code: <b>MATEJ_IS_STILL_HERE</b></p></div></div>`;
    const qr = overlay.querySelector('.bsod__qr');
    const r = rnd(99);
    let cells = '';
    for (let i = 0; i < 121; i++) {
      const x = i % 11, y = Math.floor(i / 11);
      const finder = (x < 3 && y < 3) || (x > 7 && y < 3) || (x < 3 && y > 7);
      cells += `<i style="opacity:${finder || r() > 0.5 ? 1 : 0}"></i>`;
    }
    qr.innerHTML = cells;
    const pct = overlay.querySelector('.bsod__pct b');
    for (let p = 0; p <= 100; p += Math.ceil(Math.random() * 9)) { pct.textContent = Math.min(100, p); await MOS.wait(MOS.reduced() ? 20 : 120); }
    pct.textContent = 100;
    await MOS.wait(700);
    MOS.wm.closeAll();
    overlay.hidden = true; overlay.innerHTML = ''; delete overlay.dataset.mode;
    await runBoot(); afterBoot();
    MOS.toast('MatejOS recovered', 'Everything is right where it was. Maybe try sudo hire matej instead?', { icon: 'terminal', timeout: 7000 });
  }

  MOS.power = (what) => {
    if (what === 'sleep') sleepMode();
    else if (what === 'shutdown') shutdown(false);
    else if (what === 'reboot') shutdown(true);
    else if (what === 'bsod') bsod();
    else if (what === 'sticky') MOS.showSticky();
  };

  /* Idle screensaver (desktop only). */
  let idleT;
  const IDLE = 180000;
  const resetIdle = () => {
    clearTimeout(idleT);
    idleT = setTimeout(() => { if (!MOS.isPhone() && !MOS.busy && !MOS.reduced() && !document.hidden && !overlay.dataset.mode && !root.classList.contains('is-booting')) sleepMode(); else resetIdle(); }, IDLE);
  };
  ['pointermove', 'keydown', 'pointerdown', 'wheel'].forEach((t) => addEventListener(t, resetIdle, { passive: true }));

  /* ---------------- Global keys & easter eggs ---------------- */
  const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let kpos = 0;
  addEventListener('keydown', (e) => {
    kpos = e.key === KONAMI[kpos] || e.key.toLowerCase() === KONAMI[kpos] ? kpos + 1 : (e.key === KONAMI[0] ? 1 : 0);
    if (kpos === KONAMI.length) {
      kpos = 0;
      MOS.snakeRainbow = !MOS.snakeRainbow;
      MOS.toast(MOS.snakeRainbow ? 'Rainbow snake unlocked' : 'Rainbow snake off', 'Konami code accepted. Snake.app will never be the same.', { icon: 'snake', timeout: 6000 });
      if (MOS.snakeRainbow) MOS.wm.open('snake');
    }
    if (root.classList.contains('is-booting') || overlay.dataset.mode) return;
    const typing = e.target.closest && e.target.closest('input, textarea, [contenteditable]');
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); spot.hidden ? openSpotlight() : closeSpotlight(); return; }
    if (e.key === 'Escape') {
      if (ctx) { closeCtx(); return; }
      if (openMenu) { closeMenu(true); return; }
      if (!spot.hidden) { closeSpotlight(); return; }
      const w = MOS.wm.active();
      const a = document.activeElement;
      const inWin = a && a.closest ? a.closest('.win') : null;
      // Don't throw away a half-written message.
      if (a && a.matches && a.matches('textarea, .mail__form input') && a.value) return;
      if (w && (!inWin || inWin === w.el)) { e.preventDefault(); MOS.wm.requestClose(w); }
      return;
    }
    if (typing) return;
    if (e.key === '/' && spot.hidden && !e.target.closest('.win--snake')) { e.preventDefault(); openSpotlight(); }
    if (e.key === '`') { e.preventDefault(); launch('terminal'); }
  });

  /* ---------------- Start up ---------------- */
  let firstRun = true;
  function afterBoot() {
    if (!MOS.isPhone()) {
      if (!MOS.wm.get('about')) MOS.wm.open('about');
      if (firstRun) {
        setTimeout(() => MOS.toast('Welcome to MatejOS', `${D.name}'s portfolio. Double-click an icon, or press Ctrl K to search.`, { timeout: 6500 }), 500);
      }
    }
    firstRun = false;
    resetIdle();
  }

  function init() {
    buildMenubar();
    buildHero();
    buildSticky();
    buildIcons();
    buildDock();
    bindDesktop();
    MOS.setTheme(MOS.store.get('theme', 'auto'), false);
    MOS.setWall(root.dataset.wall, false);
    MOS.on('wins', syncDock);
    syncDock();
    MOS.mqPhone.addEventListener('change', () => { tickClock(); });
    if (root.classList.contains('is-booting')) runBoot().then(afterBoot);
    else afterBoot();
  }
  init();
})();
