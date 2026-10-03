/* MatejOS window manager: open, focus, drag, snap, resize, minimize, zoom, close. */
(() => {
  'use strict';
  const MOS = window.MOS;
  const { $, h } = MOS;
  const layer = $('#windows');
  const ghost = $('#snapGhost');
  const wins = new Map();
  let zTop = 20;
  let cascadeN = 0;
  let uid = 0;
  let active = null;

  const MIN_W = 300;
  const MIN_H = 200;

  function bounds() {
    const top = $('#menubar').offsetHeight;
    if (MOS.isPhone()) return { x: 0, y: top, w: innerWidth, h: innerHeight - top };
    const dockTop = $('#dock').getBoundingClientRect().top;
    const bottom = Math.min(innerHeight, dockTop - 8);
    return { x: 0, y: top, w: innerWidth, h: Math.max(220, bottom - top) };
  }

  const LIGHTS =
    '<div class="win__lights">' +
    '<button class="light light--close" data-act="close" aria-label="Close window"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3.5 3.5l5 5m0-5-5 5"/></svg></button>' +
    '<button class="light light--min" data-act="min" aria-label="Minimize window"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 6h6"/></svg></button>' +
    '<button class="light light--zoom" data-act="zoom" aria-label="Zoom window"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 3v6M3 6h6"/></svg></button>' +
    '</div>';

  function open(appId, arg, opts = {}) {
    const app = MOS.apps[appId];
    if (!app) return null;
    const id = app.key ? app.key(arg) : appId;
    const existing = wins.get(id);
    if (existing) {
      if (existing.minimized) restore(existing);
      focus(existing);
      existing.el.focus({ preventScroll: true });
      if (app.reopen) app.reopen(existing, arg);
      return existing;
    }
    return create(appId, app, id, arg, opts);
  }

  function create(appId, app, id, arg, opts) {
    const title = typeof app.title === 'function' ? app.title(arg) : app.title;
    const iconName = typeof app.icon === 'function' ? app.icon(arg) : app.icon;
    const tid = 'wt-' + ++uid;
    const el = h('section', { class: `win win--${appId}`, role: 'dialog', 'aria-labelledby': tid, tabindex: '-1', 'data-id': id });
    const back = (typeof app.back === 'function' ? app.back(arg) : app.back) || 'Home';
    el.innerHTML =
      `<header class="win__bar">${LIGHTS}` +
      `<button class="win__back" data-act="close">${MOS.ui('back')}<span>${MOS.esc(back)}</span></button>` +
      `<h2 class="win__title" id="${tid}"><span class="win__ticon">${MOS.icon(iconName, app.iconArg ? app.iconArg(arg) : undefined)}</span><span class="win__tname"></span></h2>` +
      '<div class="win__tools"></div></header>' +
      '<div class="win__body"></div>' +
      '<div class="win__rz win__rz--e" aria-hidden="true"></div><div class="win__rz win__rz--s" aria-hidden="true"></div><div class="win__rz win__rz--se" aria-hidden="true"></div>';
    el.querySelector('.win__tname').textContent = title;
    const w = {
      id, appId, app, arg, el, title,
      body: el.querySelector('.win__body'),
      tools: el.querySelector('.win__tools'),
      minimized: false, max: false, rect: null, prev: null, cleanup: [],
      onCleanup(fn) { this.cleanup.push(fn); },
    };

    const b = bounds();
    let [ww, wh] = app.size || [620, 460];
    ww = Math.min(ww, b.w - 24);
    wh = Math.min(wh, b.h - 16);
    let pos = app.pos ? app.pos(b, ww, wh) : null;
    if (!pos) {
      const n = cascadeN++ % 7;
      pos = { x: Math.round((b.w - ww) / 2 - 90 + n * 30), y: Math.round(b.y + Math.max(12, (b.h - wh) / 2 - 60) + n * 26) };
    }
    w.rect = clampRect({ x: pos.x, y: pos.y, w: ww, h: wh });
    apply(w);
    wins.set(id, w);
    layer.append(el);
    app.render(w.body, w, arg);
    bind(w);
    focus(w, true);
    animateIn(w, opts.from);
    if (MOS.isPhone()) {
      try { history.pushState({ mos: id }, ''); w.hasState = true; } catch (e) { /* sandboxed */ }
    }
    const target = app.focus ? el.querySelector(app.focus) : null;
    (target || el).focus({ preventScroll: true });
    MOS.emit('wins');
    return w;
  }

  function clampRect(r) {
    const b = bounds();
    const w = Math.max(Math.min(r.w, b.w), Math.min(MIN_W, b.w));
    const hh = Math.max(Math.min(r.h, b.h), Math.min(MIN_H, b.h));
    const x = MOS.clamp(r.x, Math.min(8, b.w - w), Math.max(8, b.w - w - 8));
    const y = MOS.clamp(r.y, b.y + 6, Math.max(b.y + 6, b.y + b.h - hh));
    return { x, y, w, h: hh };
  }

  function apply(w) {
    const s = w.el.style;
    s.left = w.rect.x + 'px';
    s.top = w.rect.y + 'px';
    s.width = w.rect.w + 'px';
    s.height = w.rect.h + 'px';
  }

  function animateIn(w, from) {
    if (MOS.reduced()) return;
    const el = w.el;
    if (from && from.getBoundingClientRect) {
      const fr = from.getBoundingClientRect();
      const wr = el.getBoundingClientRect();
      if (fr.width && wr.width) {
        const t = `translate(${fr.left - wr.left}px, ${fr.top - wr.top}px) scale(${fr.width / wr.width}, ${fr.height / wr.height})`;
        el.animate([{ transform: t, opacity: 0.3, borderRadius: '30%' }, { transform: 'none', opacity: 1 }],
          { duration: MOS.isPhone() ? 380 : 320, easing: 'cubic-bezier(.2,.85,.25,1)' });
        return;
      }
    }
    el.classList.add('is-opening');
    el.addEventListener('animationend', () => el.classList.remove('is-opening'), { once: true });
  }

  function bind(w) {
    const { el } = w;
    el.addEventListener('pointerdown', () => { if (active !== w) focus(w); }, true);
    el.addEventListener('focusin', () => { if (active !== w) focus(w); });
    el.querySelector('.win__bar').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      const act = btn.dataset.act;
      if (act === 'close') requestClose(w);
      else if (act === 'min') minimize(w);
      else if (act === 'zoom') toggleMax(w);
    });
    el.querySelector('.win__bar').addEventListener('dblclick', (e) => {
      if (e.target.closest('button, a, input')) return;
      if (!MOS.isPhone()) toggleMax(w);
    });
    dragify(w);
    el.querySelectorAll('.win__rz').forEach((g) => resizify(w, g));
  }

  /* ---- Dragging with edge snapping ---- */
  function snapZone(x, y) {
    const b = bounds();
    if (y <= b.y + 2) return { x: 8, y: b.y + 6, w: b.w - 16, h: b.h - 12, max: true };
    if (x <= 4) return { x: 8, y: b.y + 6, w: Math.round(b.w / 2) - 12, h: b.h - 12 };
    if (x >= innerWidth - 5) return { x: Math.round(b.w / 2) + 4, y: b.y + 6, w: Math.round(b.w / 2) - 12, h: b.h - 12 };
    return null;
  }

  function dragify(w) {
    const bar = w.el.querySelector('.win__bar');
    bar.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || MOS.isPhone() || e.target.closest('button, a, input, select, textarea')) return;
      e.preventDefault();
      const start = { px: e.clientX, py: e.clientY, x: w.rect.x, y: w.rect.y };
      let moved = false;
      let zone = null;
      bar.setPointerCapture(e.pointerId);
      const move = (ev) => {
        const dx = ev.clientX - start.px;
        const dy = ev.clientY - start.py;
        if (!moved && Math.hypot(dx, dy) < 4) return;
        if (!moved) {
          moved = true;
          w.el.classList.add('is-dragging');
          document.body.classList.add('is-dragging-win');
          if (w.max) {
            // Pull a maximized window off the top: restore its size under the pointer.
            const ratio = (start.px - w.rect.x) / w.rect.w;
            w.max = false; w.el.classList.remove('is-max');
            w.rect = { ...w.prev };
            start.x = start.px - w.rect.w * ratio;
            start.y = start.py - 16;
            setZoomLabel(w);
          }
        }
        const b = bounds();
        w.rect.x = MOS.clamp(start.x + dx, -w.rect.w + 120, innerWidth - 120);
        w.rect.y = MOS.clamp(start.y + dy, b.y, innerHeight - 60);
        apply(w);
        zone = snapZone(ev.clientX, ev.clientY);
        if (zone) {
          Object.assign(ghost.style, { left: zone.x + 'px', top: zone.y + 'px', width: zone.w + 'px', height: zone.h + 'px' });
          ghost.hidden = false;
        } else ghost.hidden = true;
      };
      const up = () => {
        bar.removeEventListener('pointermove', move);
        bar.removeEventListener('pointerup', up);
        bar.removeEventListener('pointercancel', up);
        w.el.classList.remove('is-dragging');
        document.body.classList.remove('is-dragging-win');
        ghost.hidden = true;
        if (moved && zone) {
          if (zone.max) { toggleMax(w); return; }
          w.prev = { ...w.rect };
          tween(w, () => { w.rect = { x: zone.x, y: zone.y, w: zone.w, h: zone.h }; apply(w); });
        }
      };
      bar.addEventListener('pointermove', move);
      bar.addEventListener('pointerup', up);
      bar.addEventListener('pointercancel', up);
    });
  }

  function resizify(w, grip) {
    const dir = grip.className.match(/--(\w+)/)[1];
    grip.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || MOS.isPhone()) return;
      e.preventDefault();
      grip.setPointerCapture(e.pointerId);
      const s = { px: e.clientX, py: e.clientY, w: w.rect.w, h: w.rect.h };
      const min = w.app.min || [MIN_W, MIN_H];
      w.el.classList.add('is-resizing');
      const move = (ev) => {
        const b = bounds();
        if (dir.includes('e')) w.rect.w = MOS.clamp(s.w + ev.clientX - s.px, min[0], innerWidth - w.rect.x - 4);
        if (dir.includes('s')) w.rect.h = MOS.clamp(s.h + ev.clientY - s.py, min[1], b.y + b.h - w.rect.y + 40);
        if (w.max) { w.max = false; w.el.classList.remove('is-max'); setZoomLabel(w); }
        apply(w);
      };
      const up = () => {
        grip.removeEventListener('pointermove', move);
        grip.removeEventListener('pointerup', up);
        w.el.classList.remove('is-resizing');
      };
      grip.addEventListener('pointermove', move);
      grip.addEventListener('pointerup', up);
    });
  }

  function tween(w, fn) {
    if (MOS.reduced()) { fn(); return; }
    w.el.classList.add('is-tween');
    fn();
    clearTimeout(w.tweenT);
    w.tweenT = setTimeout(() => w.el.classList.remove('is-tween'), 280);
  }

  function setZoomLabel(w) {
    const z = w.el.querySelector('.light--zoom');
    if (z) z.setAttribute('aria-label', w.max ? 'Restore window size' : 'Zoom window');
  }

  function toggleMax(w) {
    if (MOS.isPhone()) return;
    tween(w, () => {
      if (!w.max) {
        w.prev = { ...w.rect };
        const b = bounds();
        w.rect = { x: 8, y: b.y + 6, w: b.w - 16, h: b.h - 12 };
        w.max = true;
      } else {
        w.rect = clampRect(w.prev || w.rect);
        w.max = false;
      }
      w.el.classList.toggle('is-max', w.max);
      apply(w);
      setZoomLabel(w);
    });
  }

  /* ---- Focus & z-order ---- */
  function focus(w, silent) {
    if (!w || !wins.has(w.id)) return;
    w.el.style.zIndex = ++zTop;
    wins.forEach((o) => o.el.classList.toggle('is-active', o === w));
    active = w;
    MOS.emit('focus', w);
    if (!silent) MOS.emit('wins');
  }

  function visible() {
    return [...wins.values()].filter((w) => !w.minimized).sort((a, b) => (+b.el.style.zIndex || 0) - (+a.el.style.zIndex || 0));
  }

  function focusTop() {
    const top = visible()[0];
    if (top) { focus(top); top.el.focus({ preventScroll: true }); }
    else {
      active = null;
      wins.forEach((o) => o.el.classList.remove('is-active'));
      MOS.emit('focus', null);
      const d = $('#desktop');
      d && d.focus({ preventScroll: true });
    }
  }

  /* ---- Minimize / restore (genie-ish zoom into the dock) ---- */
  function dockTarget(w) {
    const key = w.app.dockAs || w.appId;
    return $(`#dockList [data-app="${key}"] .dock__icon`) || $('#dock');
  }

  function minimize(w) {
    if (w.minimized || MOS.isPhone()) return;
    w.minimized = true;
    const done = () => { w.el.classList.add('is-min'); };
    if (MOS.reduced()) done();
    else {
      const wr = w.el.getBoundingClientRect();
      const tr = dockTarget(w).getBoundingClientRect();
      const t = `translate(${tr.left - wr.left}px, ${tr.top - wr.top}px) scale(${tr.width / wr.width}, ${tr.height / wr.height})`;
      const a = w.el.animate([{ transform: 'none', opacity: 1 }, { transform: t, opacity: 0.2 }], { duration: 340, easing: 'cubic-bezier(.55,0,.7,.2)' });
      a.onfinish = done;
    }
    if (active === w) { active = null; setTimeout(focusTop, MOS.reduced() ? 0 : 60); }
    MOS.emit('wins');
  }

  function restore(w) {
    if (!w.minimized) return;
    w.minimized = false;
    w.el.classList.remove('is-min');
    if (!MOS.reduced()) {
      const wr = w.el.getBoundingClientRect();
      const tr = dockTarget(w).getBoundingClientRect();
      const t = `translate(${tr.left - wr.left}px, ${tr.top - wr.top}px) scale(${tr.width / wr.width}, ${tr.height / wr.height})`;
      w.el.animate([{ transform: t, opacity: 0.2 }, { transform: 'none', opacity: 1 }], { duration: 320, easing: 'cubic-bezier(.2,.8,.3,1)' });
    }
    focus(w);
    w.el.focus({ preventScroll: true });
  }

  /* ---- Close ---- */
  function close(w) {
    if (!w || !wins.has(w.id)) return;
    wins.delete(w.id);
    w.cleanup.forEach((fn) => { try { fn(); } catch (e) { /* ignore */ } });
    const el = w.el;
    let removed = false;
    const done = () => { if (!removed) { removed = true; el.remove(); } };
    if (MOS.reduced() || w.minimized) done();
    else {
      el.classList.add('is-closing');
      el.addEventListener('animationend', done, { once: true });
      setTimeout(done, 450);
    }
    if (active === w || !active) { active = null; focusTop(); }
    MOS.emit('wins');
  }

  /* On phones a close goes through history so the system back gesture works too. */
  function requestClose(w) {
    if (MOS.isPhone() && w.hasState && history.state && history.state.mos === w.id) history.back();
    else close(w);
  }
  addEventListener('popstate', () => {
    if (!MOS.isPhone()) return;
    const top = visible()[0];
    if (top) close(top);
  });

  function closeAll() { [...wins.values()].forEach((w) => close(w)); }

  function setTitle(w, title) {
    w.title = title;
    w.el.querySelector('.win__tname').textContent = title;
    MOS.emit('wins');
  }

  /* Change a window's identity (e.g. project prev/next re-renders in place). */
  function rekey(w, newId, arg) {
    wins.delete(w.id);
    w.id = newId; w.arg = arg;
    w.el.dataset.id = newId;
    wins.set(newId, w);
    if (w.hasState) { try { history.replaceState({ mos: newId }, ''); } catch (e) { /* ignore */ } }
  }

  addEventListener('resize', () => {
    wins.forEach((w) => {
      if (w.max) { const b = bounds(); w.rect = { x: 8, y: b.y + 6, w: b.w - 16, h: b.h - 12 }; }
      else w.rect = clampRect(w.rect);
      apply(w);
    });
  });

  MOS.wm = {
    open, close, requestClose, minimize, restore, focus, toggleMax, closeAll, setTitle, rekey, bounds,
    list: () => [...wins.values()],
    get: (id) => wins.get(id),
    active: () => active,
    top: () => visible()[0] || null,
  };
})();
