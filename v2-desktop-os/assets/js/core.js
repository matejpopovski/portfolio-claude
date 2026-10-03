/* MatejOS core: tiny helpers shared by every other module. */
(() => {
  'use strict';
  const D = window.PORTFOLIO;
  const MOS = (window.MOS = { D });

  MOS.$ = (s, r = document) => r.querySelector(s);
  MOS.$$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* Hyperscript-ish element builder. */
  MOS.h = function h(tag, props, ...kids) {
    const el = document.createElement(tag);
    if (props) {
      for (const [k, v] of Object.entries(props)) {
        if (v == null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'html') el.innerHTML = v;
        else if (k === 'text') el.textContent = v;
        else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else if (k === 'style' && typeof v === 'object') for (const [sk, sv] of Object.entries(v)) el.style.setProperty(sk.startsWith('--') ? sk : sk.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase()), sv);
        else if (k === 'dataset') Object.assign(el.dataset, v);
        else el.setAttribute(k, v === true ? '' : v);
      }
    }
    for (const kid of kids.flat(Infinity)) {
      if (kid == null || kid === false) continue;
      el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    }
    return el;
  };

  MOS.esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const mqReduce = matchMedia('(prefers-reduced-motion: reduce)');
  MOS.reduced = () => mqReduce.matches || document.documentElement.dataset.motion === 'reduce';
  MOS.mqPhone = matchMedia('(max-width: 699px)');
  MOS.isPhone = () => MOS.mqPhone.matches;

  const mkStore = (getter) => ({
    get(k, d) { try { const v = getter().getItem('mos:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { getter().setItem('mos:' + k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } },
  });
  MOS.store = mkStore(() => localStorage);
  MOS.session = mkStore(() => sessionStorage);

  MOS.isGitHub = (url) => /github\.com/.test(url);
  MOS.linkLabel = (url) => (MOS.isGitHub(url) ? 'View on GitHub' : 'Open project site');
  MOS.slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  /* Event bus */
  const bus = new EventTarget();
  MOS.on = (t, fn) => bus.addEventListener(t, (e) => fn(e.detail));
  MOS.emit = (t, detail) => bus.dispatchEvent(new CustomEvent(t, { detail }));

  /* Remember what kind of pointer was used last so a tap opens, a click selects. */
  let lastPointer = 'mouse';
  addEventListener('pointerdown', (e) => { lastPointer = e.pointerType || 'mouse'; }, true);
  MOS.isTouch = () => lastPointer !== 'mouse';

  /* Double-click to open with a mouse, single tap on touch, Enter/Space from the keyboard. */
  MOS.bindOpen = (el, open, select) => {
    el.addEventListener('click', (e) => {
      if (e.detail === 0 || MOS.isTouch() || MOS.isPhone()) open(e);
      else if (select) select(e);
    });
    el.addEventListener('dblclick', (e) => { if (!MOS.isTouch() && !MOS.isPhone()) open(e); });
  };

  /* Area colours, shared by explorer, project windows and spotlight. */
  const areaPalette = ['cobalt', 'tomato', 'mint', 'lilac', 'sun', 'sky', 'pink', 'orange'];
  MOS.areas = [...new Set(D.projects.map((p) => p.area))];
  const areaName = (area) => areaPalette[Math.max(0, MOS.areas.indexOf(area)) % areaPalette.length];
  MOS.areaColor = (area) => `var(--${areaName(area)})`;
  MOS.areaHex = (area) => (MOS.iconColors || {})[areaName(area)] || '#3557ff';

  /* Toast notifications */
  MOS.toast = (title, body = '', { icon = 'logo', timeout = 4200 } = {}) => {
    const box = MOS.$('#toasts');
    const t = MOS.h('div', { class: 'toast', role: 'status' },
      MOS.h('span', { class: 'toast__icon', html: MOS.icon ? MOS.icon(icon) : '' }),
      MOS.h('div', { class: 'toast__text' }, MOS.h('b', { text: title }), body ? MOS.h('span', { text: body }) : null),
      MOS.h('button', { class: 'toast__x', 'aria-label': 'Dismiss notification', text: '×', onclick: () => kill() })
    );
    box.append(t);
    while (box.children.length > 3) box.firstElementChild.remove();
    let killed = false;
    const kill = () => {
      if (killed) return; killed = true;
      t.classList.add('is-out');
      setTimeout(() => t.remove(), MOS.reduced() ? 0 : 260);
    };
    if (timeout) setTimeout(kill, timeout);
    return t;
  };

  MOS.copy = async (text) => {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) {
      const ta = MOS.h('textarea', { style: { position: 'fixed', opacity: '0' } }); ta.value = text;
      document.body.append(ta); ta.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
      ta.remove(); return ok;
    }
  };

  MOS.wait = (ms) => new Promise((r) => setTimeout(r, ms));
  MOS.clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* Madison local time: the location in data.js is in the US Central time zone. */
  MOS.homeZone = /madison|wisconsin|chicago/i.test(D.location) ? 'America/Chicago' : undefined;
})();
