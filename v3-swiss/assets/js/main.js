/*
 * Swiss Kinetic — behaviour.
 * All content comes from window.PORTFOLIO (shared/data.js).
 */
(function () {
  'use strict';

  var D = window.PORTFOLIO;
  if (!D) {
    document.body.insertAdjacentHTML('afterbegin', '<p class="noscript">Content could not be loaded (shared/data.js).</p>');
    return;
  }
  document.documentElement.classList.add('js');

  // ---------- helpers ----------
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var RM = window.matchMedia('(prefers-reduced-motion: reduce)');
  var FINE = window.matchMedia('(hover: hover) and (pointer: fine)');
  var reduced = function () { return RM.matches; };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var pad2 = function (n) { return String(n).padStart(2, '0'); };
  var slug = function (s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var isExt = function (u) { return /^https?:/i.test(u); };
  var EASE = 'cubic-bezier(.16,1,.3,1)';
  var year = new Date().getFullYear();

  var toastTimer;
  function toast(msg) {
    var t = $('#toast');
    t.textContent = msg;
    t.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('on'); }, 2600);
  }

  // ---------- simple fills ----------
  $$('[data-f]').forEach(function (el) { el.textContent = D[el.dataset.f] || ''; });
  var firstName = (D.name || '').split(' ')[0];
  $('#markTxt').textContent = D.name;
  $('#heroYear').textContent = year;
  $('#who').textContent = firstName;
  $('#cueCount').textContent = D.projects.length;
  $('#footName').textContent = D.name;
  $('#footYear').textContent = '© ' + year;
  $('#profileNote').textContent = D.role + '. ' + D.yearsExperience + ' years across software and data.';

  /* =========================================================
     Hero name — variable letters that react to pointer + scroll
     ========================================================= */
  var nameEl = $('#heroName');
  var hero = $('#top');
  var lines = [D.first || firstName.toUpperCase(), D.last || (D.name.split(' ').slice(1).join(' ')).toUpperCase()];
  nameEl.setAttribute('aria-label', D.name);
  nameEl.innerHTML = lines.map(function (ln) {
    return '<span class="ln" aria-hidden="true">' + Array.from(ln).map(function (c) {
      return '<span class="ch">' + esc(c) + '</span>';
    }).join('') + '</span>';
  }).join('');
  var lineEls = $$('.ln', nameEl);
  var chars = $$('.ch', nameEl).map(function (el, i) {
    return { el: el, i: i, cx: 0, cy: 0, w: 900, wd: 100, sk: 0, k: 0.08 + ((i * 7919) % 13) / 13 * 0.55, last: '' };
  });
  var nameFs = 100, baseWd = 100, baseW = 900;

  function fitName() {
    baseWd = window.innerWidth / window.innerHeight < 0.85 || window.innerWidth < 640 ? 64 : 100;
    nameEl.style.setProperty('--base-wdth', baseWd);
    nameEl.style.setProperty('--name-fs', '100px');
    chars.forEach(function (c) {
      c.w = baseW; c.wd = baseWd; c.sk = 0; c.last = '';
      c.el.style.fontVariationSettings = '"wght" ' + baseW + ', "wdth" ' + baseWd;
      c.el.style.transform = '';
    });
    lineEls.forEach(function (l) { l.style.transform = ''; });
    var avail = nameEl.clientWidth;
    var widest = Math.max.apply(null, lineEls.map(function (l) { return l.getBoundingClientRect().width; }));
    nameFs = Math.max(24, 100 * avail / widest * 0.995);
    // keep the name (two lines) inside the first screen on wide, short windows
    var chrome = $('.hero__meta').offsetHeight + $('.hero__foot').offsetHeight + 150;
    var maxByHeight = (window.innerHeight - chrome) / 1.7;
    if (window.innerWidth > 640 && nameFs > maxByHeight) nameFs = Math.max(64, maxByHeight);
    nameEl.style.setProperty('--name-fs', nameFs.toFixed(2) + 'px');
    var nr = nameEl.getBoundingClientRect();
    chars.forEach(function (c) {
      var r = c.el.getBoundingClientRect();
      c.cx = r.left - nr.left + r.width / 2;
      c.cy = r.top - nr.top + r.height / 2;
    });
  }

  var pointer = { x: -9999, y: -9999, t: 0, type: 'mouse' };
  window.addEventListener('pointermove', function (e) {
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.t = performance.now(); pointer.type = e.pointerType;
  }, { passive: true });
  window.addEventListener('touchmove', function (e) {
    var t = e.touches[0]; if (!t) return;
    pointer.x = t.clientX; pointer.y = t.clientY; pointer.t = performance.now(); pointer.type = 'touch';
  }, { passive: true });

  // Disc: a draggable red circle that springs home.
  var disc = $('#disc'), square = $('.hero__bar');
  var drag = { on: false, x: 0, y: 0, vx: 0, vy: 0, sx: 0, sy: 0, ox: 0, oy: 0 };
  disc.addEventListener('pointerdown', function (e) {
    drag.on = true; drag.sx = e.clientX; drag.sy = e.clientY; drag.ox = drag.x; drag.oy = drag.y;
    disc.setPointerCapture(e.pointerId);
  });
  disc.addEventListener('pointermove', function (e) {
    if (!drag.on) return;
    drag.x = drag.ox + e.clientX - drag.sx; drag.y = drag.oy + e.clientY - drag.sy;
  });
  var endDrag = function () { if (drag.on) { drag.on = false; drag.vx = 0; drag.vy = 0; } };
  disc.addEventListener('pointerup', endDrag);
  disc.addEventListener('pointercancel', endDrag);

  // Click a letter: it flips.
  nameEl.addEventListener('click', function (e) {
    var ch = e.target.closest('.ch');
    if (!ch || reduced()) return;
    ch.animate([{ rotate: 'x 0deg' }, { rotate: 'x 360deg' }], { duration: 800, easing: EASE });
  });

  function wave() {
    if (reduced()) return;
    chars.forEach(function (c, i) {
      c.el.animate([{ translate: '0 0' }, { translate: '0 -.22em' }, { translate: '0 0' }],
        { duration: 700, delay: i * 55, easing: 'cubic-bezier(.3,0,.3,1)' });
    });
  }

  var heroVisible = true, scrollP = 0;
  new IntersectionObserver(function (es) { heroVisible = es[0].isIntersecting; }).observe(hero);

  function heroFrame(now) {
    if (!heroVisible) return;
    var nr = nameEl.getBoundingClientRect();
    var recent = now - pointer.t < 2600;
    var tx, ty, strength;
    if (recent) {
      tx = pointer.x - nr.left; ty = pointer.y - nr.top; strength = 1;
    } else if (!reduced()) {
      var s = now / 1000;
      tx = nr.width * (0.5 + 0.48 * Math.sin(s * 0.45));
      ty = nr.height * (0.5 + 0.38 * Math.sin(s * 0.9 + 1));
      strength = 0.75;
    } else { tx = -9999; ty = -9999; strength = 0; }
    var R = nameFs * 1.15;
    var rm = reduced();
    chars.forEach(function (c) {
      var dx = tx - c.cx, dy = (ty - c.cy) * 1.15;
      var d = Math.sqrt(dx * dx + dy * dy) / R;
      var t = Math.max(0, 1 - d); t = t * t * (3 - 2 * t) * strength;
      var tw = baseW - 760 * t;
      var twd = baseWd - (baseWd - 62) * t;
      var tsk = clamp(dx / R, -1, 1) * -9 * t;
      c.w += (tw - c.w) * 0.16; c.wd += (twd - c.wd) * 0.16; c.sk += (tsk - c.sk) * 0.16;
      var drift = rm ? 0 : scrollP * nameFs * c.k * 1.1;
      var fvs = '"wght" ' + c.w.toFixed(0) + ', "wdth" ' + c.wd.toFixed(1);
      var tf = 'translateY(' + drift.toFixed(1) + 'px) skewX(' + c.sk.toFixed(2) + 'deg)';
      var key = fvs + tf;
      if (key !== c.last) { c.el.style.fontVariationSettings = fvs; c.el.style.transform = tf; c.last = key; }
    });
    if (!rm) {
      lineEls[0].style.transform = 'translateX(' + (-scrollP * 9).toFixed(2) + 'vw)';
      if (lineEls[1]) lineEls[1].style.transform = 'translateX(' + (scrollP * 6).toFixed(2) + 'vw)';
    }
    // disc spring
    if (!drag.on) {
      drag.vx += -drag.x * 0.07; drag.vy += -drag.y * 0.07;
      drag.vx *= 0.82; drag.vy *= 0.82;
      drag.x += drag.vx; drag.y += drag.vy;
    }
    var follow = (recent && FINE.matches && !rm) ? { x: (pointer.x / window.innerWidth - 0.5) * 24, y: (pointer.y / window.innerHeight - 0.5) * 24 } : { x: 0, y: 0 };
    var par = rm ? 0 : scrollP * window.innerHeight * 0.35;
    disc.style.transform = 'translate3d(' + (drag.x + follow.x).toFixed(1) + 'px,' + (drag.y + follow.y + par).toFixed(1) + 'px,0)';
    square.style.transform = 'translate3d(' + (-follow.x * 1.6).toFixed(1) + 'px,' + (-follow.y * 1.6 - par * 0.6).toFixed(1) + 'px,0) rotate(' + (rm ? 0 : scrollP * 135).toFixed(1) + 'deg)';
  }

  /* =========================================================
     Rotating verbs, set letter by letter
     ========================================================= */
  var verbEl = $('#verb');
  var vi = 0;
  $('#verbsSr').textContent = D.verbs.join(', ') + '.';
  function verbHTML(text) {
    return text.split(' ').map(function (w) {
      return '<span class="w">' + Array.from(w).map(function (ch) { return '<span class="l">' + esc(ch) + '</span>'; }).join('') + '</span>';
    }).join(' ');
  }
  function setVerb(text, animate) {
    if (!animate || reduced() || !verbEl.animate) { verbEl.innerHTML = verbHTML(text); return; }
    var old = $$('.l', verbEl);
    var outs = old.map(function (l, i) {
      return l.animate([{ transform: 'none' }, { transform: 'translateY(-115%)' }], { duration: 340, delay: i * 8, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' }).finished;
    });
    Promise.all(outs).then(function () {
      verbEl.innerHTML = verbHTML(text);
      $$('.l', verbEl).forEach(function (l, i) {
        l.animate([{ transform: 'translateY(115%)' }, { transform: 'none' }], { duration: 760, delay: i * 14, easing: EASE, fill: 'backwards' });
      });
    }).catch(function () { verbEl.innerHTML = verbHTML(text); });
  }
  setVerb(D.verbs[0], false);
  setInterval(function () {
    if (document.hidden || !heroVisible) return;
    vi = (vi + 1) % D.verbs.length;
    setVerb(D.verbs[vi], true);
  }, 3400);

  /* =========================================================
     Clocks — Madison local time, plus a station clock
     ========================================================= */
  var TZ = 'America/Chicago';
  var fmt, tzName = '';
  try {
    fmt = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    var tzp = new Intl.DateTimeFormat('en-US', { timeZone: TZ, timeZoneName: 'short' }).formatToParts(new Date());
    tzp.forEach(function (p) { if (p.type === 'timeZoneName') tzName = p.value; });
  } catch (e) { fmt = null; }
  function madison(d) {
    if (!fmt) return { h: d.getHours(), m: d.getMinutes(), s: d.getSeconds() };
    var o = {};
    fmt.formatToParts(d).forEach(function (p) { o[p.type] = +p.value; });
    return { h: (o.hour || 0) % 24, m: o.minute || 0, s: o.second || 0 };
  }
  function textClock() {
    var t = madison(new Date());
    var str = pad2(t.h) + ':' + pad2(t.m) + ':' + pad2(t.s);
    $('#barClock').textContent = str;
    $('#heroClock').textContent = str + ' ' + tzName;
    $('#clockTxt').textContent = str + ' ' + tzName;
  }
  textClock();
  setInterval(textClock, 1000);

  var sclock = $('#sclock');
  (function buildClock() {
    var s = '<circle r="97" fill="#fff" stroke="var(--ink)" stroke-width="3"/>';
    for (var i = 0; i < 60; i++) {
      var hour = i % 5 === 0;
      s += '<rect x="' + (hour ? -3.4 : -1.1) + '" y="-91" width="' + (hour ? 6.8 : 2.2) + '" height="' + (hour ? 24 : 7) + '" fill="var(--ink)" transform="rotate(' + (i * 6) + ')"/>';
    }
    s += '<g class="hand hand--h"><polygon points="-6,18 6,18 4.6,-58 -4.6,-58" fill="var(--ink)"/></g>';
    s += '<g class="hand hand--m"><polygon points="-5,22 5,22 3.4,-86 -3.4,-86" fill="var(--ink)"/></g>';
    s += '<g class="hand hand--s"><rect x="-1.3" y="-60" width="2.6" height="92" fill="var(--red)"/><circle cy="-60" r="9.5" fill="var(--red)"/></g>';
    s += '<circle r="2.4" fill="var(--ink)"/>';
    sclock.innerHTML = s;
  })();
  var hH = $('.hand--h', sclock), hM = $('.hand--m', sclock), hS = $('.hand--s', sclock);
  var clockVisible = false, lastMin = -1;
  new IntersectionObserver(function (es) { clockVisible = es[0].isIntersecting; }).observe(sclock);
  function clockFrame() {
    if (!clockVisible) return;
    var now = new Date(), t = madison(now);
    var sec = t.s + now.getMilliseconds() / 1000;
    // The second hand sweeps the dial in 58.5s, then waits at twelve for the minute to jump.
    var sa = reduced() ? t.s * 6 : Math.min(sec / 58.5, 1) * 360;
    hS.style.transform = 'rotate(' + sa + 'deg)';
    if (t.m !== lastMin) {
      lastMin = t.m;
      hM.style.transform = 'rotate(' + (t.m * 6) + 'deg)';
      hH.style.transform = 'rotate(' + ((t.h % 12) * 30 + t.m * 0.5) + 'deg)';
    }
  }

  /* =========================================================
     Section heads, reveals, nav state, rail, progress
     ========================================================= */
  $$('.sec__title').forEach(function (h) {
    var txt = h.textContent;
    h.setAttribute('aria-label', txt);
    h.innerHTML = Array.from(txt).map(function (c, i) { return '<span class="tc" aria-hidden="true" style="--i:' + i + '">' + esc(c) + '</span>'; }).join('');
  });

  var revealIO = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('in'); revealIO.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  function observeReveal(el) { revealIO.observe(el); }

  var sections = $$('main > section[data-n]');
  var navLinks = $$('.nav a');
  var railNum = $('#railNum'), railLabel = $('#railLabel');
  var activeId = '';
  function setActive(sec) {
    if (!sec || sec.id === activeId) return;
    activeId = sec.id;
    navLinks.forEach(function (a) {
      if (a.dataset.sec === sec.id) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
    railNum.textContent = sec.dataset.n; railLabel.textContent = sec.dataset.label;
    railNum.classList.remove('tick'); void railNum.offsetWidth; railNum.classList.add('tick');
  }
  var secIO = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) setActive(e.target); });
  }, { rootMargin: '-45% 0px -54% 0px' });
  sections.forEach(function (s) { secIO.observe(s); });

  var progressBar = $('#progressBar'), railDot = $('#railDot'), railPct = $('#railPct');
  var lastY = window.scrollY, lastT = performance.now(), vel = 0;
  function scrollFrame(now) {
    var y = window.scrollY;
    var max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    var p = clamp(y / max, 0, 1);
    progressBar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    if (railDot) railDot.style.top = (p * 100).toFixed(2) + '%';
    if (railPct) railPct.textContent = String(Math.round(p * 100)).padStart(3, '0') + '%';
    scrollP = clamp(y / Math.max(1, hero.offsetHeight), 0, 1);
    var dt = Math.max(1, now - lastT);
    var v = (y - lastY) / dt; // px per ms
    vel += (v - vel) * 0.2;
    lastY = y; lastT = now;
  }

  /* =========================================================
     Profile
     ========================================================= */
  $('#about').innerHTML = D.about.map(function (p, i) { return '<p data-reveal style="--d:' + (i * 120) + '">' + esc(p) + '</p>'; }).join('');
  $('#facts').innerHTML = D.facts.map(function (f, i) {
    return '<div class="fact" data-reveal style="--d:' + (i * 90) + '"><dt>' + esc(f.k) + '</dt><dd>' + esc(f.v) + '</dd></div>';
  }).join('');

  /* =========================================================
     Work — posters, filters, index, detail
     ========================================================= */
  var P = D.projects, N = P.length;
  var salts = P.map(function () { return 0; });
  var postersEl = $('#posters'), plistEl = $('#plist');

  postersEl.innerHTML = P.map(function (p, i) {
    return '<li class="poster-card" data-area="' + esc(p.area) + '" data-i="' + i + '">' +
      '<a class="poster-link" href="#poster-' + slug(p.title) + '" data-open="' + i + '">' +
      '<div class="frame">' + SwissPoster.make(p, i, N, 0) + '</div>' +
      '<div class="cap"><span class="cap__n">' + pad2(i + 1) + '</span><span class="cap__t">' + esc(p.title) + '</span>' +
      '<span class="cap__m">' + esc(p.area) + ' · ' + esc(p.year) + '</span><span class="cap__open">Open poster →</span></div>' +
      '</a></li>';
  }).join('');
  plistEl.innerHTML = P.map(function (p, i) {
    return '<li data-area="' + esc(p.area) + '"><a class="prow" href="#poster-' + slug(p.title) + '" data-open="' + i + '">' +
      '<span class="prow__n">' + pad2(i + 1) + '</span><span class="prow__t">' + esc(p.title) + '</span>' +
      '<span class="prow__a">' + esc(p.area) + '</span><span class="prow__y">' + esc(p.year) + '</span>' +
      '<span class="prow__s"><b>' + esc(p.stat.value) + '</b>' + esc(p.stat.label) + '</span><span class="prow__go" aria-hidden="true">→</span></a></li>';
  }).join('');
  var cards = $$('.poster-card', postersEl);
  cards.forEach(observeReveal);

  // Filters
  var areas = [];
  P.forEach(function (p) { if (areas.indexOf(p.area) < 0) areas.push(p.area); });
  var filtersEl = $('#filters');
  filtersEl.innerHTML = [['all', 'All', N]].concat(areas.map(function (a) {
    return [a, a, P.filter(function (p) { return p.area === a; }).length];
  })).map(function (f, i) {
    return '<button type="button" class="chip" data-area="' + esc(f[0]) + '" aria-pressed="' + (i === 0) + '">' + esc(f[1]) + '<sup>' + f[2] + '</sup></button>';
  }).join('');
  var curArea = 'all';
  function applyFilter(area) {
    curArea = area;
    $$('.chip', filtersEl).forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.area === area)); });
    var first = new Map();
    cards.forEach(function (c) { first.set(c, c.hidden ? null : c.getBoundingClientRect()); });
    var shown = 0;
    cards.forEach(function (c) { var ok = area === 'all' || c.dataset.area === area; c.hidden = !ok; if (ok) shown++; });
    $$('li', plistEl).forEach(function (li) { li.hidden = !(area === 'all' || li.dataset.area === area); });
    if (!reduced()) {
      cards.forEach(function (c) {
        if (c.hidden) return;
        var f = first.get(c), l = c.getBoundingClientRect();
        c.classList.add('in');
        if (!f) { c.animate([{ opacity: 0, transform: 'translateY(30px) scale(.94)' }, { opacity: 1, transform: 'none' }], { duration: 600, easing: EASE }); return; }
        var dx = f.left - l.left, dy = f.top - l.top;
        if (dx || dy) c.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'none' }], { duration: 700, easing: EASE });
      });
    }
    $('#filterStatus').textContent = area === 'all' ? 'Showing all ' + N + ' projects.' : 'Showing ' + shown + ' of ' + N + ' · ' + area + '.';
  }
  filtersEl.addEventListener('click', function (e) {
    var b = e.target.closest('.chip'); if (b) applyFilter(b.dataset.area);
  });

  // View toggle
  $$('.view-btn[data-view]').forEach(function (b) {
    b.addEventListener('click', function () {
      var v = b.dataset.view;
      $$('.view-btn[data-view]').forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
      postersEl.hidden = v !== 'posters';
      plistEl.hidden = v !== 'index';
      var list = v === 'index' ? plistEl : postersEl;
      var off = $('.bar').offsetHeight + $('#tools').offsetHeight + 12;
      var top = list.getBoundingClientRect().top;
      if (top < off) window.scrollTo({ top: window.scrollY + top - off, behavior: 'auto' });
      if (v === 'index' && !reduced()) {
        $$('li:not([hidden]) .prow', plistEl).forEach(function (r, i) {
          r.animate([{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], { duration: 500, delay: i * 35, easing: EASE, fill: 'backwards' });
        });
      }
    });
  });

  // Hover peek for the index view
  var peek = $('#peek'), peekI = -1;
  plistEl.addEventListener('pointerover', function (e) {
    if (!FINE.matches) return;
    var a = e.target.closest('.prow'); if (!a) return;
    var i = +a.dataset.open;
    if (i !== peekI) { peekI = i; peek.innerHTML = SwissPoster.make(P[i], i, N, salts[i]); }
    peek.classList.add('on');
  });
  plistEl.addEventListener('pointerleave', function () { peek.classList.remove('on'); peekI = -1; });
  plistEl.addEventListener('pointermove', function (e) {
    peek.style.left = e.clientX + 'px'; peek.style.top = e.clientY + 'px';
  });

  // Remix
  function refreshCard(i) {
    var c = cards[i];
    $('.frame', c).innerHTML = SwissPoster.make(P[i], i, N, salts[i]);
    if (reduced()) return;
    c.classList.remove('in');
    void c.offsetWidth;
    requestAnimationFrame(function () { c.classList.add('in'); });
  }
  function remixAll() {
    P.forEach(function (_, i) { salts[i]++; refreshCard(i); });
    var seed = (SwissPoster.hash('remix' + salts[0]) & 0xffff).toString(16).toUpperCase().padStart(4, '0');
    toast('Posters remixed · print run ' + seed + '.');
  }
  $('#remixAll').addEventListener('click', remixAll);

  // Detail dialog
  var detail = $('#detail'), cur = -1, lastFocus = null;
  var dPoster = $('#dPoster'), dInfo = $('.detail__info');

  function renderDetailPoster() {
    dPoster.innerHTML = SwissPoster.make(P[cur], cur, N, salts[cur]);
    dPoster.classList.remove('in');
    if (reduced()) { dPoster.classList.add('in'); return; }
    void dPoster.offsetWidth;
    requestAnimationFrame(function () { requestAnimationFrame(function () { dPoster.classList.add('in'); }); });
  }

  function fillDetail(i, dir) {
    cur = (i + N) % N;
    var p = P[cur];
    $('#dCrumb').textContent = 'Nº ' + pad2(cur + 1) + ' / ' + pad2(N) + ' — ' + p.area + ' — ' + p.year;
    $('#dNum').textContent = 'Nº ' + pad2(cur + 1) + ' · ' + p.area + ' · ' + p.year;
    $('#dTitle').textContent = p.title;
    $('#dTag').textContent = p.tag;
    $('#dBlurb').textContent = p.blurb;
    $('#dBullets').innerHTML = (p.bullets || []).map(function (b) { return '<li>' + esc(b) + '</li>'; }).join('');
    $('#dStatV').textContent = p.stat ? p.stat.value : '';
    $('#dStatL').textContent = p.stat ? p.stat.label : '';
    var link = $('#dLink');
    link.href = p.url;
    link.textContent = (/github\.com/.test(p.url) ? 'View on GitHub' : 'Visit project') + ' ↗';
    var shot = $('#dShot');
    if (p.image) {
      // Screenshots can be several MB: only requested now, when this poster is opened.
      shot.hidden = false;
      shot.innerHTML = '<div class="shot__box"><span class="shot__ph">Loading screenshot…</span>' +
        '<img loading="lazy" decoding="async" alt="Screenshot of ' + esc(p.title) + '" src="' + esc(p.image) + '"></div>' +
        '<figcaption>Fig. ' + pad2(cur + 1) + ' — ' + esc(p.title) + ', screenshot</figcaption>';
      var img = $('img', shot), box = $('.shot__box', shot);
      img.addEventListener('load', function () { box.classList.add('ok'); });
      img.addEventListener('error', function () { $('.shot__ph', shot).textContent = 'Screenshot unavailable offline.'; img.remove(); });
    } else {
      shot.hidden = true; shot.innerHTML = '';
    }
    renderDetailPoster();
    if (dir && !reduced()) {
      dInfo.animate([{ opacity: 0, transform: 'translateX(' + (dir * 40) + 'px)' }, { opacity: 1, transform: 'none' }], { duration: 520, easing: EASE });
    }
    detail.scrollTop = 0;
    try { history.replaceState(null, '', '#poster-' + slug(p.title)); } catch (e) { /* file:// */ }
  }
  function openDetail(i) {
    if (!detail.open) lastFocus = document.activeElement;
    fillDetail(i, 0);
    if (!detail.open) {
      detail.showModal();
      document.documentElement.classList.add('modal-open');
      $('#dClose').focus();
    }
  }
  detail.addEventListener('close', function () {
    document.documentElement.classList.remove('modal-open');
    try { history.replaceState(null, '', '#work'); } catch (e) { /* noop */ }
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  });
  detail.addEventListener('click', function (e) { if (e.target === detail) detail.close(); });
  $('#dClose').addEventListener('click', function () { detail.close(); });
  $('#dPrev').addEventListener('click', function () { fillDetail(cur - 1, -1); });
  $('#dNext').addEventListener('click', function () { fillDetail(cur + 1, 1); });
  $('#dRemix').addEventListener('click', function () {
    salts[cur]++; renderDetailPoster(); refreshCard(cur); toast('New print of Nº ' + pad2(cur + 1) + '.');
  });
  $('#dSave').addEventListener('click', function () {
    var svg = SwissPoster.toFile(SwissPoster.make(P[cur], cur, N, salts[cur]));
    var url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    var a = document.createElement('a');
    a.href = url; a.download = slug(P[cur].title) + '-poster.svg';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
    toast('Poster saved as SVG.');
  });
  $('#dPrint').addEventListener('click', function () {
    $('#printSheet').innerHTML = SwissPoster.make(P[cur], cur, N, salts[cur]);
    document.body.classList.add('print-poster');
    window.print();
  });
  window.addEventListener('afterprint', function () { document.body.classList.remove('print-poster'); });

  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-open]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button > 0) return;
    e.preventDefault();
    openDetail(+a.dataset.open);
  });
  function openFromHash() {
    var h = decodeURIComponent(location.hash || '');
    if (h.indexOf('#poster-') !== 0) return;
    var s = h.slice(8);
    var i = P.findIndex(function (p) { return slug(p.title) === s; });
    if (i >= 0) openDetail(i);
  }
  window.addEventListener('hashchange', openFromHash);

  /* =========================================================
     Schedule — departure board, education, courses
     ========================================================= */
  var KIND = { work: 'Work', edu: 'Education', origin: 'Origin' };
  $('#boardBody').innerHTML = D.timeline.map(function (t) {
    return '<tr data-kind="' + esc(t.kind) + '">' +
      '<td class="y"><span class="sr-only">' + esc(t.year) + '</span><span class="flaps" aria-hidden="true" data-final="' + esc(t.year) + '">' +
      Array.from(String(t.year)).map(function (c) { return '<span class="flap">' + esc(c) + '</span>'; }).join('') + '</span></td>' +
      '<td class="kind"><span class="k k--' + esc(t.kind) + '">' + esc(KIND[t.kind] || t.kind) + '</span></td>' +
      '<td class="pos"><span class="pos__t">' + esc(t.title) + '</span><p class="pos__d">' + esc(t.details) + '</p></td>' +
      '<td class="org">' + esc(t.org) + '</td>' +
      '<td class="dur">' + (t.duration === 'ongoing' ? '<span class="dot" aria-hidden="true"></span>' : '') + esc(t.duration) + '</td></tr>';
  }).join('');

  var DIG = '0123456789';
  function flip(row) {
    if (reduced() || row.dataset.flipping) return;
    var flaps = $('.flaps', row), finalStr = Array.from(flaps.dataset.final), left = finalStr.length;
    row.dataset.flipping = '1';
    $$('.flap', row).forEach(function (f, j) {
      var n = 5 + j * 3, k = 0;
      var iv = setInterval(function () {
        k++;
        f.classList.remove('f'); void f.offsetWidth; f.classList.add('f');
        if (k >= n) {
          f.textContent = finalStr[j]; clearInterval(iv);
          if (--left === 0) delete row.dataset.flipping;
          return;
        }
        f.textContent = DIG[(Math.random() * 10) | 0];
      }, 55);
    });
  }
  var boardIO = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      boardIO.unobserve(e.target);
      setTimeout(function () { flip(e.target); }, +e.target.dataset.d || 0);
    });
  }, { threshold: 0.4 });
  $$('#boardBody tr').forEach(function (r, i) { r.dataset.d = (i % 3) * 90; boardIO.observe(r); });
  $$('#boardBody tr').forEach(function (r) { r.addEventListener('mouseenter', function () { if (FINE.matches) flip(r); }); });

  $('#eduList').innerHTML = D.education.map(function (e, i) {
    return '<li data-reveal style="--d:' + (i * 100) + '"><span class="edu__y">' + esc(e.years) + '</span><span><span class="edu__d">' + esc(e.degree) + '</span><span class="edu__s">' + esc(e.school) + '</span></span></li>';
  }).join('');
  $('#courses').innerHTML = D.courses.map(function (c, i) {
    return '<li data-reveal style="--d:' + (i * 80) + '"><a href="' + esc(c.url) + '"' + (isExt(c.url) ? ' target="_blank" rel="noopener"' : '') + '>' +
      '<span class="courses__code">' + esc(c.code) + '</span><span class="courses__name">' + esc(c.name) + '</span><span class="courses__go" aria-hidden="true">↗</span></a></li>';
  }).join('');

  /* =========================================================
     Specimen — marquee, type tester, stack
     ========================================================= */
  var mq = $('#marquee');
  function mqRow(items, off) {
    return items.map(function (s, i) { return '<span class="sk sk--' + ((i + off) % 4) + '">' + esc(s) + '</span><span class="sep"></span>'; }).join('');
  }
  mq.innerHTML = [0, 1].map(function (r) {
    var items = r ? D.skills.slice().reverse() : D.skills;
    var html = mqRow(items, r * 2);
    return '<div class="mq__row" data-dir="' + (r ? 1 : -1) + '"><div class="mq__seg">' + html + '</div><div class="mq__seg mq__dup">' + html + '</div></div>';
  }).join('');
  $('#skillsSr').innerHTML = D.skills.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('');
  var rows = $$('.mq__row', mq).map(function (el) { return { el: el, seg: $('.mq__seg', el), dir: +el.dataset.dir, x: 0, w: 1 }; });
  function measureMq() { rows.forEach(function (r) { r.w = r.seg.getBoundingClientRect().width || 1; if (r.dir > 0) r.x = -r.w * 0.5; }); }
  var mqVisible = false, mqHover = false, mqSpeed = 1;
  new IntersectionObserver(function (es) { mqVisible = es[0].isIntersecting; }).observe(mq);
  mq.addEventListener('pointerenter', function () { mqHover = true; });
  mq.addEventListener('pointerleave', function () { mqHover = false; });
  var lastMq = performance.now();
  function mqFrame(now) {
    var dt = Math.min(64, now - lastMq); lastMq = now;
    if (!mqVisible || reduced()) return;
    var target = (mqHover ? 0.15 : 1) + Math.min(14, Math.abs(vel) * 3.5);
    mqSpeed += (target - mqSpeed) * 0.08;
    var skew = clamp(-vel * 9, -14, 14);
    rows.forEach(function (r) {
      r.x += r.dir * mqSpeed * 0.06 * dt * (vel < -0.05 ? -1 : 1);
      if (r.x <= -r.w) r.x += r.w;
      if (r.x > 0) r.x -= r.w;
      r.el.style.transform = 'translate3d(' + r.x.toFixed(1) + 'px,0,0) skewX(' + skew.toFixed(2) + 'deg)';
    });
  }

  // Type tester
  var pad = $('#pad'), padWord = $('#padWord'), padRead = $('#padRead');
  var rW = $('#rWght'), rWd = $('#rWdth');
  var si = 0, ax = { w: 800, wd: 100 }, padTouched = 0, padVisible = false;
  if (!FINE.matches) $('#padHint').textContent = 'Tap the pad to set weight and width, or use the sliders.';
  function renderPad(fromInput) {
    var w = Math.round(ax.w), wd = Math.round(ax.wd);
    padWord.style.fontVariationSettings = '"wght" ' + w + ', "wdth" ' + wd;
    pad.style.setProperty('--px', ((wd - 62) / 63 * 100).toFixed(2) + '%');
    pad.style.setProperty('--py', ((1 - (w - 100) / 800) * 100).toFixed(2) + '%');
    if (!fromInput) { rW.value = w; rWd.value = wd; }
    padRead.innerHTML = '<b>' + esc(D.skills[si]) + '</b>wght ' + String(w).padStart(3, '0') + ' · wdth ' + String(wd).padStart(3, '0') + ' · ' + pad2(si + 1) + '/' + pad2(D.skills.length);
    padWord.style.transform = 'translate(-50%,-50%)';
    var k = Math.min(1, (pad.clientWidth * 0.9) / Math.max(1, padWord.offsetWidth));
    padWord.style.transform = 'translate(-50%,-50%) scale(' + k.toFixed(3) + ')';
  }
  function setSkill(n) {
    si = (n + D.skills.length) % D.skills.length;
    padWord.textContent = D.skills[si];
    if (!reduced()) padWord.animate([{ opacity: 0, filter: 'blur(6px)' }, { opacity: 1, filter: 'none' }], { duration: 400, easing: EASE });
    renderPad();
  }
  function padAt(e) {
    var r = pad.getBoundingClientRect();
    ax.wd = 62 + clamp((e.clientX - r.left) / r.width, 0, 1) * 63;
    ax.w = 900 - clamp((e.clientY - r.top) / r.height, 0, 1) * 800;
    padTouched = performance.now();
    renderPad();
  }
  pad.addEventListener('pointermove', function (e) { if (e.pointerType === 'mouse') padAt(e); });
  pad.addEventListener('pointerup', function (e) {
    if (e.pointerType === 'mouse') setSkill(si + 1); else padAt(e);
  });
  rW.addEventListener('input', function () { ax.w = +rW.value; padTouched = performance.now(); renderPad(true); });
  rWd.addEventListener('input', function () { ax.wd = +rWd.value; padTouched = performance.now(); renderPad(true); });
  $('#padPrev').addEventListener('click', function () { setSkill(si - 1); });
  $('#padNext').addEventListener('click', function () { setSkill(si + 1); });
  new IntersectionObserver(function (es) { padVisible = es[0].isIntersecting; }).observe(pad);
  var lastPadIdle = 0;
  function padFrame(now) {
    // When nobody is touching it, the specimen breathes through its own axes.
    if (!padVisible || reduced() || now - padTouched < 5000 || now - lastPadIdle < 33) return;
    lastPadIdle = now;
    var s = now / 1000;
    ax.w = 500 + 400 * Math.sin(s * 0.9);
    ax.wd = 93.5 + 31.5 * Math.sin(s * 0.55 + 1.2);
    renderPad();
  }
  setSkill(0);

  $('#stack').innerHTML = D.stack.map(function (g, i) {
    return '<li data-reveal style="--d:' + (i * 80) + '"><span class="stack__n">' + pad2(i + 1) + '</span><span class="stack__g">' + esc(g.group) + '</span><ul>' +
      g.items.map(function (it) { return '<li>' + esc(it) + '</li>'; }).join('') + '</ul></li>';
  }).join('');

  /* =========================================================
     Contact
     ========================================================= */
  var mail = $('#mailBig');
  var parts = String(D.email).split('@');
  var ci = 0;
  var letters = function (s) {
    return Array.from(s).map(function (c) { return '<span class="c' + (c === '@' ? ' c--at' : '') + '" style="--i:' + (ci++) + '">' + esc(c) + '</span>'; }).join('');
  };
  mail.href = 'mailto:' + D.email;
  mail.setAttribute('aria-label', 'Email ' + D.email);
  mail.innerHTML = '<span class="mail__in" aria-hidden="true"><span class="ln">' + letters(parts[0]) + '</span><span class="ln">' + letters('@' + (parts[1] || '')) + '</span></span>';
  var mailIn = $('.mail__in', mail);
  function fitMail() {
    mail.classList.toggle('one', mail.clientWidth >= 860);
    mailIn.style.setProperty('--mail-fs', '100px');
    var w = mailIn.getBoundingClientRect().width;
    var fs = 100 * mail.clientWidth / Math.max(1, w) * 0.985;
    mailIn.style.setProperty('--mail-fs', fs.toFixed(2) + 'px');
  }

  $('#links').innerHTML = D.links.map(function (l) {
    var handle = /^mailto:/i.test(l.url) ? l.url.replace(/^mailto:/i, '') : l.url.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
    var ext = isExt(l.url);
    return '<li><a href="' + esc(l.url) + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + '>' +
      '<span class="cl__l">' + esc(l.label) + '</span><span class="cl__h">' + esc(handle) + '</span><span class="cl__go" aria-hidden="true">' + (ext ? '↗' : '→') + '</span></a></li>';
  }).join('');

  $('#copyMail').addEventListener('click', function () {
    var done = function () { toast('Copied ' + D.email + ' to the clipboard.'); };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(D.email).then(done, function () { toast('Copy failed. The address is ' + D.email + '.'); });
    } else {
      var ta = document.createElement('textarea');
      ta.value = D.email; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { toast('The address is ' + D.email + '.'); }
      ta.remove();
    }
  });

  /* =========================================================
     Grid overlay, keys, easter eggs
     ========================================================= */
  $('.grid-overlay__cols').innerHTML = Array.from({ length: 12 }, function (_, i) { return '<div style="--i:' + i + '"><span>' + pad2(i + 1) + '</span></div>'; }).join('');
  function toggleGrid() {
    var on = document.documentElement.classList.toggle('show-grid');
    toast(on ? 'Grid on: ' + getComputedStyle(document.documentElement).getPropertyValue('--cols').trim() + ' columns, 8px baseline. G to hide.' : 'Grid off.');
  }
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-grid-toggle]')) toggleGrid();
    else if (e.target.closest('[data-remix]')) remixAll();
    else if (e.target.closest('[data-keys]')) $('#keys').showModal();
  });

  if (!FINE.matches) $('.hero__cue .hint').innerHTML = 'Touch and drag across the name. Tap <button type="button" class="kbd-btn" data-grid-toggle aria-label="Toggle the grid overlay">G</button> for the grid.';
  var keysDlg = $('#keys');
  $('#keysBtn').addEventListener('click', function () { keysDlg.showModal(); });

  var typed = '';
  var stamp = $('#stamp'), stampT;
  document.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;

    if (detail.open) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); fillDetail(cur - 1, -1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); fillDetail(cur + 1, 1); }
      return;
    }
    if (keysDlg.open) return;

    var k = e.key.length === 1 ? e.key.toLowerCase() : '';
    if (k) {
      typed = (typed + k).slice(-12);
      if (/swiss$/.test(typed)) {
        stamp.classList.add('on');
        toast('Grüezi. Neutral on tabs vs. spaces, strict about grids.');
        clearTimeout(stampT); stampT = setTimeout(function () { stamp.classList.remove('on'); }, 3200);
        typed = ''; return;
      }
      if (/helvetica$/.test(typed)) { toast('Close. It is Archivo, but the spirit is the same.'); typed = ''; return; }
      var nm = firstName.toLowerCase();
      if (nm && typed.slice(-nm.length) === nm) { wave(); toast('Hi.'); typed = ''; return; }
    }
    if (k === 'g') toggleGrid();
    else if (k === 'r') remixAll();
    else if (e.key === '?') { e.preventDefault(); keysDlg.showModal(); }
    else if (/^[1-5]$/.test(e.key)) {
      var target = sections[+e.key];
      if (target) target.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth' });
    }
  });

  /* =========================================================
     Main loop + layout
     ========================================================= */
  function loop(now) {
    scrollFrame(now);
    heroFrame(now);
    clockFrame();
    mqFrame(now);
    padFrame(now);
    requestAnimationFrame(loop);
  }

  function layout() {
    fitName();
    fitMail();
    measureMq();
    renderPad();
  }
  var rT;
  window.addEventListener('resize', function () {
    cancelAnimationFrame(rT);
    rT = requestAnimationFrame(layout);
  });

  $$('.sec__head, [data-reveal]').forEach(observeReveal);
  layout();
  $('#filterStatus').textContent = 'Showing all ' + N + ' projects.';
  requestAnimationFrame(loop);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(layout);
    if (document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', layout);
  }
  openFromHash();

  try {
    console.log('%c MP %c Swiss Kinetic. Press G for the grid, R to remix, or type “swiss”.',
      'background:#e4321b;color:#fff;font-weight:900;padding:2px 6px', 'color:#121211');
  } catch (e) { /* noop */ }
})();
