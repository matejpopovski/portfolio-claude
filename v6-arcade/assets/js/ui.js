/*
 * ui.js: everything that isn't the canvas. CRT dialogs, the RPG talk box,
 * the pause menu, inventory, toasts, confetti and the plain-HTML text version.
 * All words come from window.PORTFOLIO (shared/data.js).
 */
(function () {
  'use strict';
  const A = window.ARC, P = window.PORTFOLIO;
  const UI = (A.ui = {});
  const $ = (s) => document.querySelector(s);
  const reduced = () => (A.reduced ? A.reduced() : false);

  /* ---------- tiny DOM helper ---------- */
  function el(tag, attrs) {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    }
    for (let i = 2; i < arguments.length; i++) {
      const kids = [].concat(arguments[i]);
      for (const kid of kids) if (kid != null && kid !== false) e.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    }
    return e;
  }
  UI.el = el;
  const isExt = (u) => /^https?:/i.test(u);
  function link(url, label, cls, aria) {
    const a = el('a', { href: url, class: cls, target: isExt(url) ? '_blank' : null, rel: isExt(url) ? 'noopener' : null, 'aria-label': aria }, label);
    if (isExt(url) && cls !== 'shot-link') a.append(el('span', { class: 'ext', 'aria-hidden': 'true' }));
    return a;
  }
  const pad2 = (n) => String(n).padStart(2, '0');
  const pretty = (u) => u.replace(/^mailto:/, '').replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
  const emailUrl = () => { const l = (P.links || []).find((x) => /^mailto:/.test(x.url)); return l ? l.url : 'mailto:' + P.email; };
  const linkVerb = (url) => (/github\.com/i.test(url) ? 'VIEW ON GITHUB' : 'VISIT PROJECT');
  const sfx = (n) => A.sound && A.sound.sfx[n] && A.sound.sfx[n]();
  /** A pixel sprite rendered big, for portraits and item icons. */
  function bigSprite(src, scale, cls, label) {
    const c = A.canvas(src.width * scale, src.height * scale), x = c.getContext('2d');
    x.imageSmoothingEnabled = false; x.drawImage(src, 0, 0, c.width, c.height);
    c.className = cls || '';
    if (label) { c.setAttribute('role', 'img'); c.setAttribute('aria-label', label); } else c.setAttribute('aria-hidden', 'true');
    return c;
  }

  /* ---------- toast ---------- */
  // Toasts queue up so a "secret found" never gets stomped by a coin pickup.
  const toastQ = [];
  let toastBusy = false;
  UI.toast = function (msg, kind) {
    toastQ.push([msg, kind]);
    if (!toastBusy) nextToast();
  };
  function nextToast() {
    const t = $('#toast'), item = toastQ.shift();
    if (!item) { toastBusy = false; return; }
    toastBusy = true;
    t.textContent = item[0];
    t.className = 'toast on ' + (item[1] || '');
    setTimeout(() => { t.className = 'toast'; setTimeout(nextToast, 300); }, toastQ.length ? 1800 : 2800);
  }

  /* ---------- confetti (pixel squares) ---------- */
  let confRaf = 0;
  UI.confetti = function (n) {
    if (reduced()) return;
    const c = $('#fx'), x = c.getContext('2d');
    const w = (c.width = innerWidth), h = (c.height = innerHeight);
    const cols = ['#ff3d8b', '#36f9f6', '#ffd23f', '#5dff7a', '#a35dff', '#ff8a3d', '#f4f1ff'];
    const ps = [];
    for (let i = 0; i < (n || 180); i++) ps.push({ x: w / 2 + (Math.random() - 0.5) * w * 0.3, y: h * 0.45, vx: (Math.random() - 0.5) * 16, vy: -6 - Math.random() * 14, s: 5 + Math.floor(Math.random() * 3) * 2, c: cols[i % cols.length], r: Math.random() * 6 });
    cancelAnimationFrame(confRaf);
    const t0 = performance.now();
    (function step(now) {
      const e = (now - t0) / 1000;
      x.clearRect(0, 0, w, h);
      for (const p of ps) {
        p.vy += 0.42; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += 0.2;
        x.fillStyle = p.c;
        x.fillRect(Math.round(p.x), Math.round(p.y), p.s, Math.max(1, Math.round(p.s * Math.abs(Math.cos(p.r)))));
      }
      if (e < 4) confRaf = requestAnimationFrame(step); else x.clearRect(0, 0, w, h);
    })(t0);
  };

  /* ---------- modal (CRT cabinet dialog) ---------- */
  const overlay = $('#overlay'), modal = $('#modal'), mTitle = $('#modalTitle'), mKicker = $('#modalKicker'), mBody = $('#modalBody');
  let cur = null;
  const FOCUSABLE = 'button:not([disabled]), a[href], input, [tabindex]:not([tabindex="-1"])';
  UI.open = function (o) {
    if (talk) UI.talkClose(true);
    const wasOpen = !!cur;
    if (cur && cur.onClose) { try { cur.onClose(); } catch (e) { /* ignore */ } }
    cur = { onClose: o.onClose, onKey: o.onKey, nav: o.nav, prevFocus: wasOpen ? cur.prevFocus : document.activeElement };
    mKicker.textContent = o.kicker || '';
    mTitle.textContent = o.title || '';
    modal.className = 'cab-modal ' + (o.cls || '');
    mBody.replaceChildren(o.body);
    mBody.scrollTop = 0;
    if (!wasOpen) { overlay.hidden = false; void overlay.offsetWidth; overlay.classList.add('on'); sfx('open'); }
    document.body.classList.add('modal-open');
    document.body.classList.toggle('show-dpad', !!o.dpad);
    const f = o.focus || mBody.querySelector('[data-autofocus]') || mBody.querySelector(FOCUSABLE) || $('#modalClose');
    setTimeout(() => { if (f && document.contains(f)) f.focus({ preventScroll: true }); }, wasOpen ? 0 : 40);
    if (A.game) A.game.pause(true);
  };
  UI.close = function (silent) {
    if (!cur) return;
    const c = cur;
    cur = null;
    if (c.onClose) { try { c.onClose(); } catch (e) { /* ignore */ } }
    overlay.classList.remove('on');
    document.body.classList.remove('modal-open', 'show-dpad');
    setTimeout(() => { if (!cur) { overlay.hidden = true; mBody.replaceChildren(); } }, reduced() ? 0 : 200);
    if (!silent) sfx('close');
    restoreFocus(c.prevFocus);
    if (A.game && !talk) A.game.pause(false);
  };
  function restoreFocus(prev) {
    if (prev && prev !== document.body && document.contains(prev) && !prev.closest('[hidden]')) prev.focus({ preventScroll: true });
    else if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }
  UI.isModal = () => !!cur;
  UI.busy = () => !!cur || !!talk || textOpen;
  $('#modalClose').addEventListener('click', () => UI.close());
  overlay.addEventListener('pointerdown', (e) => { if (e.target === overlay) UI.close(); });

  /* ---------- RPG talk box ---------- */
  const talkEl = $('#talk'), talkName = $('#talkName'), talkText = $('#talkText'), talkFull = $('#talkFull'), talkNext = $('#talkNext'), talkPortrait = $('#talkPortrait');
  let talk = null, typeTimer = 0;
  UI.talk = function (o) {
    if (cur) UI.close(true);
    talk = { pages: o.pages, i: 0, after: o.after, prevFocus: document.activeElement, last: 0 };
    talkName.textContent = o.name;
    const px = talkPortrait.getContext('2d');
    px.imageSmoothingEnabled = false;
    px.fillStyle = o.bg || '#1a1430'; px.fillRect(0, 0, 32, 32);
    px.fillStyle = 'rgba(255,255,255,0.06)'; for (let i = 0; i < 32; i += 4) px.fillRect(0, i, 32, 1);
    if (o.portrait) {
      const s = o.portrait, sc = Math.max(1, Math.min(2, Math.floor(28 / Math.max(s.width, s.height))));
      px.drawImage(s, Math.floor((32 - s.width * sc) / 2), 32 - s.height * sc - 1, s.width * sc, s.height * sc);
    }
    talkEl.hidden = false; void talkEl.offsetWidth; talkEl.classList.add('on');
    document.body.classList.add('talking');
    showPage();
    sfx('select');
    setTimeout(() => talkNext.focus({ preventScroll: true }), 30);
    if (A.game) A.game.pause(true);
  };
  function showPage() {
    clearInterval(typeTimer);
    const txt = talk.pages[talk.i];
    talk.full = txt; talk.n = 0;
    talkFull.textContent = txt;
    talkEl.classList.remove('done');
    talkNext.querySelector('.sr-only').textContent = talk.i < talk.pages.length - 1 ? 'Next' : 'Close';
    if (reduced()) { talk.n = txt.length; talkText.textContent = txt; talkEl.classList.add('done'); return; }
    talkText.textContent = '';
    typeTimer = setInterval(() => {
      if (!talk) return clearInterval(typeTimer);
      talk.n = Math.min(talk.full.length, talk.n + 1);
      talkText.textContent = talk.full.slice(0, talk.n);
      if (talk.n % 3 === 0 && talk.full[talk.n - 1] !== ' ') sfx('tick');
      if (talk.n >= talk.full.length) { clearInterval(typeTimer); talkEl.classList.add('done'); }
    }, 22);
  }
  UI.talkAdvance = function () {
    if (!talk) return;
    const now = performance.now();
    if (now - talk.last < 140) return;
    talk.last = now;
    if (talk.n < talk.full.length) { clearInterval(typeTimer); talk.n = talk.full.length; talkText.textContent = talk.full; talkEl.classList.add('done'); return; }
    talk.i++;
    if (talk.i >= talk.pages.length) { const after = talk.after; UI.talkClose(!!after); if (after) after(); }
    else { showPage(); sfx('select'); }
  };
  UI.talkClose = function (silent) {
    if (!talk) return;
    const t = talk;
    talk = null;
    clearInterval(typeTimer);
    talkEl.classList.remove('on');
    talkEl.hidden = true;
    document.body.classList.remove('talking');
    if (!silent) sfx('close');
    restoreFocus(t.prevFocus);
    if (A.game && !cur) A.game.pause(false);
  };
  UI.isTalking = () => !!talk;
  talkNext.addEventListener('click', () => UI.talkAdvance());
  talkEl.addEventListener('click', (e) => { if (e.target !== talkNext && !talkNext.contains(e.target)) UI.talkAdvance(); });

  /* ---------- keyboard routing for overlays (runs before the game's handler) ---------- */
  document.addEventListener('keydown', (e) => {
    if (talk) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'e' || e.key === 'E') { e.preventDefault(); UI.talkAdvance(); }
      else if (e.key === 'Escape') { e.preventDefault(); UI.talkClose(); }
      else if (e.key === 'Tab') { e.preventDefault(); talkNext.focus(); }
      e.stopPropagation();
      return;
    }
    if (cur) {
      if (cur.onKey && cur.onKey(e)) { e.stopPropagation(); return; }
      if (e.key === 'Escape') { e.preventDefault(); UI.close(); }
      else if (e.key === 'Tab') trap(e, modal);
      else if (cur.nav && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        const items = [...mBody.querySelectorAll('button, a[href]')];
        const i = items.indexOf(document.activeElement);
        const n = e.key === 'ArrowDown' ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
        if (items[n]) { e.preventDefault(); items[n].focus(); sfx('select'); }
      }
      e.stopPropagation();
      return;
    }
    if (textOpen) {
      if (e.key === 'Escape') { e.preventDefault(); UI.closeText(); }
      e.stopPropagation();
    }
  });
  function trap(e, root) {
    const f = [...root.querySelectorAll(FOCUSABLE)].filter((x) => x.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === first || !root.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (document.activeElement === last || !root.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
  }

  /* ---------- project cabinets ---------- */
  let shotToken = 0;
  UI.openProject = function (i) {
    const ps = P.projects, n = ps.length;
    i = ((i % n) + n) % n;
    const p = ps[i], theme = A.themeFor(p), game = A.gameFor(p);
    if (A.game) A.game.markVisited(i);
    const token = ++shotToken;

    // Screen: the cabinet's attract loop, then the real screenshot if there is one (loaded only now).
    const shot = el('div', { class: 'shot' });
    const pc = A.canvas(64, 40);
    pc.className = 'shot-canvas';
    pc.setAttribute('aria-hidden', 'true');
    shot.append(pc);
    let raf = 0;
    const t0 = performance.now();
    const draw = (now) => { A.themes[theme](pc.getContext('2d'), 0, 0, 64, 40, (now - t0) / 1000 + 1.3); if (!reduced()) raf = requestAnimationFrame(draw); };
    draw(t0);
    if (p.image) {
      const status = el('p', { class: 'shot-status' }, 'LOADING SCREENSHOT', el('span', { class: 'load-dots', 'aria-hidden': 'true' }));
      shot.append(status);
      const img = new Image();
      img.decoding = 'async';
      img.alt = 'Screenshot of ' + p.title;
      img.onload = () => {
        if (token !== shotToken) return;
        const a = link(p.image, '', 'shot-link', 'Open the full-size screenshot of ' + p.title + ' (opens in a new tab)');
        a.append(img);
        shot.append(a);
        status.remove();
        requestAnimationFrame(() => shot.classList.add('loaded'));
        setTimeout(() => cancelAnimationFrame(raf), 600);
      };
      img.onerror = () => { if (token === shotToken) status.textContent = 'NO SIGNAL · SCREENSHOT UNAVAILABLE'; };
      img.src = p.image;
    } else {
      shot.append(el('p', { class: 'shot-status quiet' }, 'ATTRACT MODE'));
    }

    const chips = el('p', { class: 'chips' },
      [p.year, p.area].concat(String(p.tag).split(/\s*·\s*/)).filter(Boolean).map((c, k) => el('span', { class: 'chip c' + (k % 4) }, c)));
    const bullets = el('ul', { class: 'bullets' }, (p.bullets || []).map((b) => el('li', null, b)));
    const stat = p.stat ? el('div', { class: 'stat' }, el('span', { class: 'stat-k' }, 'HI-SCORE'), el('b', { class: 'stat-v' }, p.stat.value), el('span', { class: 'stat-l' }, p.stat.label)) : null;
    const actions = el('div', { class: 'actions' },
      game ? el('button', { class: 'btn play', onclick: () => UI.openGame(game, i), 'data-autofocus': true }, '▶ PLAY ' + (game === 'snake' ? 'SNAKE' : 'WORDLE')) : null,
      p.url ? link(p.url, linkVerb(p.url), 'btn ' + (game ? 'alt' : ''), linkVerb(p.url).toLowerCase() + ': ' + p.title + ' (opens in a new tab)') : null,
      el('span', { class: 'spacer' }),
      el('button', { class: 'btn ghost sm', onclick: () => { sfx('select'); UI.openProject(i - 1); }, 'aria-label': 'Previous cabinet' }, '◀'),
      el('button', { class: 'btn ghost sm', onclick: () => { sfx('select'); UI.openProject(i + 1); }, 'aria-label': 'Next cabinet' }, '▶'));
    const body = el('div', { class: 'proj' },
      el('div', { class: 'proj-grid' }, shot,
        el('div', { class: 'proj-info' }, chips, el('p', { class: 'blurb' }, p.blurb), bullets, stat)),
      actions);
    UI.open({
      kicker: 'CABINET ' + pad2(i + 1) + '/' + pad2(n), title: p.title, body, cls: 'proj-modal',
      onClose: () => { cancelAnimationFrame(raf); shotToken++; },
      onKey: (e) => {
        if (e.target && e.target.closest && e.target.closest('input')) return false;
        if (e.key === 'ArrowRight' || e.key === ']') { UI.openProject(i + 1); sfx('select'); return true; }
        if (e.key === 'ArrowLeft' || e.key === '[') { UI.openProject(i - 1); sfx('select'); return true; }
        return false;
      },
    });
  };

  UI.openGame = function (kind, i) {
    const p = P.projects[i];
    const wrap = el('div', { class: 'game-wrap' });
    const g = A.games[kind](wrap);
    wrap.append(el('div', { class: 'actions' },
      el('button', { class: 'btn ghost sm', onclick: () => UI.openProject(i) }, '◀ CABINET INFO'),
      p.url ? link(p.url, linkVerb(p.url), 'btn ghost sm') : null));
    UI.open({ kicker: 'NOW PLAYING · CABINET ' + pad2(i + 1), title: p.title, body: wrap, cls: 'game-modal ' + kind, onClose: () => g.destroy(), onKey: (e) => g.onKey(e), focus: g.focus, dpad: kind === 'snake' });
  };

  /* ---------- kiosk / phone / shelf / shop / inventory ---------- */
  UI.about = function () {
    const portrait = bigSprite(A.robot('down', 0, { gold: A.game && A.game.gold }), 6, 'sheet-portrait', 'Matej as a small pixel robot');
    const sheet = el('div', { class: 'sheet' }, portrait,
      el('dl', { class: 'sheet-dl' },
        el('dt', null, 'NAME'), el('dd', null, P.name),
        el('dt', null, 'CLASS'), el('dd', null, P.title),
        el('dt', null, 'GUILD'), el('dd', null, P.role),
        el('dt', null, 'BASE'), el('dd', null, P.location)));
    const facts = el('ul', { class: 'facts' }, (P.facts || []).map((f) => el('li', null, el('span', null, f.k), el('b', null, f.v))));
    const edu = el('ul', { class: 'edu' }, (P.education || []).map((e) => el('li', null, el('b', null, e.degree), el('span', null, e.school + ' · ' + e.years))));
    const body = el('div', { class: 'about' }, sheet,
      (P.about || []).map((t) => el('p', { class: 'para' }, t)),
      el('h3', { class: 'sub' }, 'STATS'), facts,
      el('h3', { class: 'sub' }, 'EDUCATION'), edu,
      el('div', { class: 'actions' },
        el('button', { class: 'btn', onclick: () => A.game.travel('npc', 0) }, 'HALL OF FAME ▶'),
        el('button', { class: 'btn alt', onclick: () => UI.contact() }, 'CONTACT ▶')));
    UI.open({ kicker: 'INFO KIOSK', title: 'ABOUT ' + (P.first || P.name), body, cls: 'about-modal' });
  };

  UI.contact = function () {
    const list = el('ul', { class: 'lines' }, (P.links || []).map((l, k) => el('li', null,
      link(l.url, el('span', null, el('b', null, 'LINE ' + (k + 1) + ' · ' + l.label.toUpperCase()), el('small', null, pretty(l.url))), 'line-btn c' + (k % 4),
        l.label + ': ' + pretty(l.url) + (isExt(l.url) ? ' (opens in a new tab)' : '')))));
    const copy = el('button', { class: 'btn ghost sm' }, 'COPY EMAIL');
    copy.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(P.email); copy.textContent = 'COPIED!'; sfx('coin'); }
      catch (e) { copy.textContent = P.email; }
    });
    const body = el('div', { class: 'contact' },
      el('p', { class: 'para' }, 'RING RING... You are connected to ' + P.name + ', ' + P.location + '. Pick a line:'),
      list, el('div', { class: 'actions' }, el('span', { class: 'mono' }, P.email), copy));
    UI.open({ kicker: 'PHONE BOOTH', title: 'CONTACT', body, cls: 'contact-modal' });
  };

  UI.courses = function () {
    const body = el('div', { class: 'courses' },
      el('p', { class: 'para' }, 'Dusty binders of coursework. Each one opens its repository.'),
      el('ul', { class: 'shelf-list' }, (P.courses || []).map((c, k) => el('li', null,
        link(c.url, [el('span', { class: 'spine c' + (k % 4) }, c.code), el('span', { class: 'shelf-name' }, c.name), el('span', { class: 'shelf-go' }, 'OPEN')], 'shelf-btn', c.code + ' ' + c.name + ' (opens in a new tab)')))));
    UI.open({ kicker: 'ARCHIVE', title: 'COURSEWORK', body, cls: 'courses-modal' });
  };

  function groupOf(name) {
    const n = name.toLowerCase();
    for (const g of P.stack || []) for (const it of g.items) { const m = it.toLowerCase(); if (m === n || m.startsWith(n) || n.startsWith(m)) return g.group; }
    return null;
  }
  UI.shop = function () {
    const body = el('div', { class: 'shop' },
      el('p', { class: 'para' }, 'Welcome, traveller! Everything on these shelves is already in ' + (P.first ? P.first.charAt(0) + P.first.slice(1).toLowerCase() : P.name) + "'s bag, so browsing is free."),
      (P.stack || []).map((g) => el('section', { class: 'shop-group' },
        el('h3', { class: 'sub' }, g.group.toUpperCase()),
        el('ul', { class: 'items' }, g.items.map((it) => el('li', { class: 'item' }, bigSprite(A.itemIcon(it), 4, 'item-ico'), el('span', { class: 'item-n' }, it), el('span', { class: 'item-tag' }, 'OWNED')))))),
      el('div', { class: 'actions' }, el('button', { class: 'btn', onclick: () => UI.inventory() }, 'OPEN INVENTORY (I)')));
    UI.open({ kicker: 'ITEM SHOP', title: 'SKILLS & STACK', body, cls: 'shop-modal' });
  };

  UI.inventory = function () {
    const desc = el('p', { class: 'inv-desc', 'aria-live': 'polite' }, 'Select an item to inspect it.');
    const grid = el('ul', { class: 'inv' }, (P.skills || []).map((s) => {
      const g = groupOf(s);
      const b = el('button', { class: 'slot', 'aria-label': s + (g ? ', ' + g : '') }, bigSprite(A.itemIcon(s), 4, 'item-ico'), el('span', null, s));
      const show = () => { desc.textContent = s.toUpperCase() + ' · ' + (g ? g.toUpperCase() : 'GENERAL SKILL') + ' · x1'; sfx('tick'); };
      b.addEventListener('focus', show); b.addEventListener('mouseenter', show); b.addEventListener('click', show);
      return el('li', null, b);
    }));
    const coins = A.game ? A.game.coinInfo() : { got: 0, total: 0 };
    const keyItems = el('ul', { class: 'key-items' },
      el('li', null, el('span', { class: 'coin-i', 'aria-hidden': 'true' }), 'COINS ' + pad2(coins.got) + '/' + pad2(coins.total)),
      A.game && A.game.gold ? el('li', null, '★ GOLD PLATING') : null,
      A.game && A.game.foundSecret ? el('li', null, '♥ DEV ROOM KEY') : null);
    const body = el('div', { class: 'inventory' }, grid, desc, el('h3', { class: 'sub' }, 'KEY ITEMS'), keyItems,
      el('div', { class: 'actions' }, el('button', { class: 'btn alt', onclick: () => A.game.travel('shop') }, 'VISIT ITEM SHOP ▶')));
    UI.open({ kicker: 'INVENTORY · ' + (P.skills || []).length + ' ITEMS', title: (P.first || 'MATEJ') + "'S BAG", body, cls: 'inv-modal', nav: false });
  };

  /* ---------- pause menu / quick travel ---------- */
  UI.menu = function () {
    const G = A.game;
    const visited = G ? G.visited : new Set();
    const go = (fn) => () => { sfx('select'); fn(); };
    const snd = A.sound;
    const sys = el('div', { class: 'menu-sys' },
      el('button', { class: 'btn', onclick: () => UI.close(), 'data-autofocus': true }, '▶ RESUME'),
      el('button', { class: 'btn alt', onclick: () => { UI.close(true); UI.openText(); } }, 'TEXT VERSION'),
      el('button', { class: 'btn ghost', 'aria-pressed': String(snd.on), onclick: (e) => { snd.toggle(); e.currentTarget.textContent = 'SOUND: ' + (snd.on ? 'ON' : 'OFF'); e.currentTarget.setAttribute('aria-pressed', String(snd.on)); } }, 'SOUND: ' + (snd.on ? 'ON' : 'OFF')),
      el('button', { class: 'btn ghost', 'aria-pressed': String(snd.music), onclick: (e) => { snd.setMusic(!snd.music); e.currentTarget.textContent = 'MUSIC: ' + (snd.music ? 'ON' : 'OFF'); e.currentTarget.setAttribute('aria-pressed', String(snd.music)); } }, 'MUSIC: ' + (snd.music ? 'ON' : 'OFF')));
    const cabs = el('ol', { class: 'menu-list' }, P.projects.map((p, i) => el('li', null,
      el('button', { class: 'menu-item' + (visited.has(i) ? ' seen' : ''), onclick: go(() => G.travel('cab', i)) },
        el('span', { class: 'mi-n' }, pad2(i + 1)), el('span', { class: 'mi-t' }, p.title), el('span', { class: 'mi-m' }, p.year + ' · ' + p.area + (visited.has(i) ? ' · ✓' : ''))))));
    const fame = el('ol', { class: 'menu-list' }, (P.timeline || []).map((t, i) => el('li', null,
      el('button', { class: 'menu-item', onclick: go(() => G.travel('npc', i)) },
        el('span', { class: 'mi-n' }, t.year), el('span', { class: 'mi-t' }, t.title), el('span', { class: 'mi-m' }, t.org + ' · ' + t.duration)))));
    const places = el('ol', { class: 'menu-list' },
      [['kiosk', 'INFO KIOSK', 'About ' + (P.first || '')], ['shop', 'ITEM SHOP', 'Skills & stack'], ['phone', 'PHONE BOOTH', 'Contact'], ['shelf', 'ARCHIVE', 'Coursework'], ['door', 'EXIT', 'All designs']]
        .map(([k, t, m]) => el('li', null, el('button', { class: 'menu-item', onclick: go(() => G.travel(k)) }, el('span', { class: 'mi-n' }, '▸'), el('span', { class: 'mi-t' }, t), el('span', { class: 'mi-m' }, m)))));
    const ci = G ? G.coinInfo() : { got: 0, total: 0 };
    const body = el('div', { class: 'menu' }, sys,
      el('div', { class: 'menu-cols' },
        el('section', null, el('h3', { class: 'sub' }, 'CABINETS · ' + visited.size + '/' + P.projects.length + ' VISITED'), cabs),
        el('div', null,
          el('section', null, el('h3', { class: 'sub' }, 'HALL OF FAME'), fame),
          el('section', null, el('h3', { class: 'sub' }, 'PLACES'), places))),
      el('p', { class: 'menu-foot' }, 'COINS ' + pad2(ci.got) + '/' + pad2(ci.total) + ' · ARROWS + ENTER TO PICK · ESC TO RESUME',
        el('button', { class: 'linkish', onclick: () => { UI.close(true); G.toTitle(); } }, 'BACK TO TITLE')));
    UI.open({ kicker: 'PAUSED · QUICK TRAVEL', title: 'MENU', body, cls: 'menu-modal', nav: true });
  };

  UI.hire = function () {
    const mail = emailUrl() + (emailUrl().includes('?') ? '&' : '?') + 'subject=' + encodeURIComponent('Hello from the arcade');
    const body = el('div', { class: 'hire' },
      el('p', { class: 'hire-q' }, 'HIRE ' + (P.first || P.name).toUpperCase() + '?'),
      el('div', { class: 'hire-btns' },
        el('a', { class: 'btn big', href: mail, 'data-autofocus': true }, 'YES'),
        el('a', { class: 'btn big alt', href: mail }, 'YES')),
      el('p', { class: 'para center' }, 'Every coin in the arcade, collected. There is no wrong answer.'));
    UI.open({ kicker: 'BONUS STAGE', title: 'ALL COINS COLLECTED', body, cls: 'hire-modal' });
  };

  UI.exit = function () {
    const body = el('div', { class: 'exit' },
      el('p', { class: 'para' }, 'Leaving the arcade? The door leads back to the page that lists every version of this portfolio.'),
      el('div', { class: 'actions' },
        el('button', { class: 'btn', onclick: () => UI.close(), 'data-autofocus': true }, 'KEEP PLAYING'),
        el('a', { class: 'btn alt', href: '../' }, 'ALL DESIGNS'),
        el('button', { class: 'btn ghost', onclick: () => { UI.close(true); UI.openText(); } }, 'PLAIN PAGE')));
    UI.open({ kicker: 'EXIT', title: 'GAME OVER?', body, cls: 'exit-modal' });
  };

  /* ---------- text version: the whole portfolio as a plain, accessible page ---------- */
  const textv = $('#textv');
  let textOpen = false, textPrev = null;
  UI.buildText = function () {
    const back = () => el('button', { class: 'btn', onclick: () => UI.closeText() }, '◀ BACK TO THE ARCADE');
    const links = el('ul', { class: 'tv-links' }, (P.links || []).map((l) => el('li', null, link(l.url, l.label, null, isExt(l.url) ? l.label + ' (opens in a new tab)' : null))));
    const projects = P.projects.map((p, i) => {
      const art = el('article', { class: 'tv-proj' },
        el('h4', null, el('span', { class: 'tv-n' }, pad2(i + 1)), ' ', p.title),
        el('p', { class: 'tv-meta' }, [p.year, p.area, p.tag].filter(Boolean).join(' · ')),
        el('p', null, p.blurb),
        el('ul', null, (p.bullets || []).map((b) => el('li', null, b))),
        p.stat ? el('p', { class: 'tv-stat' }, el('b', null, p.stat.value), ' ' + p.stat.label) : null,
        el('p', { class: 'tv-act' }, p.url ? link(p.url, linkVerb(p.url).toLowerCase().replace(/^./, (c) => c.toUpperCase()), null, p.title + ' (opens in a new tab)') : null));
      if (p.image) {
        const btn = el('button', { class: 'btn ghost sm' }, 'Show screenshot');
        btn.addEventListener('click', () => {
          const img = el('img', { src: p.image, alt: 'Screenshot of ' + p.title, class: 'tv-img', decoding: 'async' });
          btn.replaceWith(img);
        });
        art.querySelector('.tv-act').append(btn);
      }
      return art;
    });
    const timeline = el('ol', { class: 'tv-time' }, (P.timeline || []).map((t) => el('li', null,
      el('span', { class: 'tv-year' }, t.year),
      el('div', null, el('h4', null, t.title), el('p', { class: 'tv-meta' }, t.org + ' · ' + t.duration + ' · ' + ({ edu: 'Education', work: 'Work', origin: 'Origin' }[t.kind] || t.kind)), el('p', null, t.details)))));
    const stack = el('dl', { class: 'tv-stack' }, (P.stack || []).map((g) => [el('dt', null, g.group), el('dd', null, g.items.join(', '))]).flat());
    textv.replaceChildren(el('div', { class: 'tv-inner' },
      el('header', { class: 'tv-head' }, back(),
        el('h2', { id: 'textvTitle' }, P.name),
        el('p', { class: 'tv-lede' }, P.title + ' · ' + P.role + ' · ' + P.location),
        links),
      el('section', null, el('h3', null, 'About'), (P.about || []).map((t) => el('p', null, t)),
        el('dl', { class: 'tv-facts' }, (P.facts || []).map((f) => [el('dt', null, f.k), el('dd', null, f.v)]).flat())),
      el('section', null, el('h3', null, 'Projects'), projects),
      el('section', null, el('h3', null, 'Experience & education'), timeline),
      el('section', null, el('h3', null, 'Education'), el('ul', null, (P.education || []).map((e) => el('li', null, el('b', null, e.degree), ', ' + e.school + ' (' + e.years + ')')))),
      el('section', null, el('h3', null, 'Skills'), el('p', null, (P.skills || []).join(' · ')), stack),
      el('section', null, el('h3', null, 'Coursework'), el('ul', null, (P.courses || []).map((c) => el('li', null, link(c.url, c.code + ': ' + c.name, null, c.code + ' ' + c.name + ' (opens in a new tab)'))))),
      el('section', null, el('h3', null, 'Contact'), el('p', null, 'Email ', el('a', { href: emailUrl() }, P.email), '.'), links.cloneNode(true)),
      el('footer', { class: 'tv-foot' }, back())));
  };
  UI.openText = function () {
    if (cur) UI.close(true);
    if (talk) UI.talkClose(true);
    if (textOpen) return;
    textOpen = true;
    textPrev = document.activeElement;
    textv.hidden = false;
    textv.scrollTop = 0;
    document.body.classList.add('text-open');
    textv.focus({ preventScroll: true });
    if (A.game) A.game.pause(true);
    if (location.hash !== '#textv') history.replaceState(null, '', '#textv');
  };
  UI.closeText = function () {
    if (!textOpen) return;
    textOpen = false;
    textv.hidden = true;
    document.body.classList.remove('text-open');
    if (location.hash === '#textv') history.replaceState(null, '', location.pathname + location.search);
    restoreFocus(textPrev);
    if (A.game) A.game.pause(false);
  };
  UI.isText = () => textOpen;

  /* ---------- HUD bits ---------- */
  UI.setCoins = function (got, total) {
    $('#coinCount').textContent = pad2(got);
    $('#coinTotal').textContent = pad2(total);
    const c = $('#hudCoins');
    c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop');
  };
  UI.syncSound = function () {
    const b = $('#btnSound'), on = A.sound.on;
    b.setAttribute('aria-pressed', String(on));
    b.querySelector('.lbl').textContent = on ? 'SOUND ON' : 'SOUND OFF';
    b.setAttribute('aria-label', 'Sound ' + (on ? 'on' : 'off') + ' (M)');
  };
  document.addEventListener('arc:sound', UI.syncSound);
})();
