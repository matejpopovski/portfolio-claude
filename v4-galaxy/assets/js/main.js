/*
 * Galaxy UI: renders every piece of content from window.PORTFOLIO into HTML
 * (HUD, panels, list view), handles routing, keyboard and easter eggs, and
 * boots the three.js scene when the device can run it. If the scene can't
 * load, the list view becomes the page, so nothing is ever 3D-only.
 */
import { buildModel, findProject, KIND_COLORS, KIND_LABELS } from './model.js';

const P = window.PORTFOLIO;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad2 = (n) => String(n).padStart(2, '0');
const isExternal = (u) => /^https?:/i.test(u);
const extAttrs = (u) => (isExternal(u) ? ' target="_blank" rel="noopener"' : '');
const prettyUrl = (u) => String(u).replace(/^mailto:/, '').replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');

const mqReduced = matchMedia('(prefers-reduced-motion: reduce)');
const mqSheet = matchMedia('(max-width: 760px)');
const coarse = matchMedia('(pointer: coarse)').matches;
const params = new URLSearchParams(location.search);
let reduced = mqReduced.matches;

if (!P) throw new Error('shared/data.js did not load');

const M = buildModel(P);
const firstName = P.first ? P.first.charAt(0) + P.first.slice(1).toLowerCase() : P.name.split(' ')[0];
const body = document.body;

const state = {
  mode: 'overview', current: -1, manifest: false, galaxy: null, threeOk: false,
  returnFocus: null, introDone: false, starClicks: [], frame: 0, debug: false, t0: performance.now(),
};

/* ============================================================
   HUD
   ============================================================ */
$('#brand-name').textContent = P.name;
$('#brand-title').textContent = P.title;
$('#verb-pre').textContent = firstName;
$('#readout-sector').textContent = P.location;

function startTyper() {
  const el = $('#verb-text');
  let vi = 0, ci = 0, del = false;
  if (reduced) {
    el.textContent = P.verbs[0];
    setInterval(() => { vi = (vi + 1) % P.verbs.length; el.textContent = P.verbs[vi]; }, 4500);
    return;
  }
  const tick = () => {
    const word = P.verbs[vi];
    if (!del) {
      ci++;
      el.textContent = word.slice(0, ci);
      if (ci >= word.length) { del = true; return setTimeout(tick, 2400); }
      return setTimeout(tick, 34 + Math.random() * 46);
    }
    ci--;
    el.textContent = word.slice(0, ci);
    if (ci <= 0) { del = false; vi = (vi + 1) % P.verbs.length; return setTimeout(tick, 380); }
    setTimeout(tick, 16);
  };
  tick();
}

// Orbit legend (one row per area)
$('#legend-list').innerHTML = M.areas.map((a) =>
  `<li><button type="button" data-area="${a.index}" style="--c:${a.color}" aria-label="${esc(a.name)}: ${a.projects.length} project${a.projects.length > 1 ? 's' : ''}">` +
  `<i aria-hidden="true"></i><span>${esc(a.name)}</span><b aria-hidden="true">${a.projects.length}</b></button></li>`).join('');
$('#legend-list').addEventListener('click', (e) => {
  const b = e.target.closest('[data-area]');
  if (!b) return;
  const a = M.areas[+b.dataset.area];
  const k = a.projects.indexOf(state.current);
  openProject(a.projects[(k + 1) % a.projects.length]);
});
['pointerover', 'focusin'].forEach((ev) => $('#legend-list').addEventListener(ev, (e) => {
  const b = e.target.closest('[data-area]');
  if (b) state.galaxy?.highlightArea(+b.dataset.area);
}));
['pointerout', 'focusout'].forEach((ev) => $('#legend-list').addEventListener(ev, () => state.galaxy?.highlightArea(-1)));

/* ============================================================
   Panel renderers
   ============================================================ */
function linkLabel(url) {
  if (/github\.com/i.test(url)) return 'View source on GitHub';
  if (/github\.io/i.test(url)) return 'Open the project site';
  return 'Open project';
}

function noTelemetrySVG(p) {
  return `<svg viewBox="0 0 320 150" role="img" aria-label="No screenshot for ${esc(p.title)}">
    <defs><radialGradient id="ntg" cx="35%" cy="35%"><stop offset="0" stop-color="${p.color}" stop-opacity=".95"/><stop offset="1" stop-color="${p.color}" stop-opacity=".12"/></radialGradient></defs>
    <ellipse cx="160" cy="75" rx="130" ry="30" fill="none" stroke="${p.color}" stroke-opacity=".35" stroke-dasharray="2 5"/>
    <ellipse cx="160" cy="75" rx="82" ry="19" fill="none" stroke="${p.color}" stroke-opacity=".2"/>
    <circle cx="160" cy="75" r="26" fill="url(#ntg)"/>
    <circle cx="290" cy="75" r="3" fill="${p.color}"/>
    <text x="160" y="138" text-anchor="middle">NO VISUAL TELEMETRY · SOURCE ONLY</text>
  </svg>`;
}

function renderProject(i) {
  const p = M.projects[i];
  const n = M.projects.length;
  const prev = M.projects[(i - 1 + n) % n], next = M.projects[(i + 1) % n];
  const shot = p.image
    ? `<figure class="shot is-loading" data-src="${esc(p.image)}">
         <div class="shot-frame"><img alt="Screenshot of ${esc(p.title)}" decoding="async" width="1600" height="1000"></div>
         <figcaption><span>Visual telemetry</span><span class="shot-status" aria-live="polite">Downlinking…</span></figcaption>
       </figure>`
    : `<figure class="shot shot-none">${noTelemetrySVG(p)}</figure>`;
  return {
    kicker: `Planet ${pad2(i + 1)} / ${pad2(n)} · Orbit ${pad2(p.areaIndex + 1)}`,
    color: p.color,
    body: `
      <p class="eyebrow"><i class="dot" style="--c:${p.color}"></i>${esc(p.area)}<span class="sep">/</span>${esc(p.year)}</p>
      <h2 id="panel-title" tabindex="-1">${esc(p.title)}</h2>
      <p class="tagline">${esc(p.tag)}</p>
      <div class="statline"><span class="stat-v">${esc(p.stat.value)}</span><span class="stat-l">${esc(p.stat.label)}</span></div>
      ${shot}
      <p class="blurb">${esc(p.blurb)}</p>
      <h3 class="sub">Mission notes</h3>
      <ul class="bullets">${p.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>
      <a class="cta" href="${esc(p.url)}"${extAttrs(p.url)}>${linkLabel(p.url)} <span aria-hidden="true">↗</span></a>`,
    foot: `
      <button type="button" class="step" data-step="-1" aria-label="Previous project: ${esc(prev.title)}"><span aria-hidden="true">←</span> Prev</button>
      <span class="counter" aria-hidden="true"><b>${pad2(i + 1)}</b> / ${pad2(n)}</span>
      <button type="button" class="step" data-step="1" aria-label="Next project: ${esc(next.title)}">Next <span aria-hidden="true">→</span></button>`,
  };
}

function renderAbout() {
  return {
    kicker: 'The star · Core',
    color: '#ffb547',
    body: `
      <p class="eyebrow"><i class="dot" style="--c:#ffb547"></i>${esc(P.role)}</p>
      <h2 id="panel-title" tabindex="-1">${esc(P.name)}</h2>
      <p class="tagline">${esc(P.title)}</p>
      ${P.about.map((t) => `<p class="prose">${esc(t)}</p>`).join('')}
      <dl class="facts">${P.facts.map((f) => `<div><dt>${esc(f.k)}</dt><dd>${esc(f.v)}</dd></div>`).join('')}</dl>
      <h3 class="sub">Education</h3>
      <ul class="edu">${P.education.map((e) => `<li><b>${esc(e.degree)}</b><span>${esc(e.school)}</span><time>${esc(e.years)}</time></li>`).join('')}</ul>
      <h3 class="sub">Coursework in orbit</h3>
      <ul class="courses">${P.courses.map((c) => `<li><a href="${esc(c.url)}"${extAttrs(c.url)}><span class="code">${esc(c.code)}</span><span>${esc(c.name)}</span><span aria-hidden="true">↗</span></a></li>`).join('')}</ul>`,
    foot: `
      <button type="button" class="step" data-go="voyage">Voyage log <span aria-hidden="true">→</span></button>
      <button type="button" class="step" data-go="contact">Transmit <span aria-hidden="true">→</span></button>`,
  };
}

function timelineSummary() {
  const counts = {};
  P.timeline.forEach((t) => { counts[t.kind] = (counts[t.kind] || 0) + 1; });
  return Object.entries(counts).map(([k, v]) => `${v} ${(KIND_LABELS[k] || k).toLowerCase()}`).join(' · ');
}

function renderVoyage() {
  const years = P.timeline.map((t) => parseInt(t.year, 10)).filter(Boolean);
  return {
    kicker: `Voyage log · ${P.timeline.length} beacons`,
    color: '#6fd0ff',
    body: `
      <p class="eyebrow"><i class="dot" style="--c:#6fd0ff"></i>${Math.min(...years)} → ${Math.max(...years)}</p>
      <h2 id="panel-title" tabindex="-1">Voyage log</h2>
      <p class="tagline">${esc(timelineSummary())}. Each entry is a beacon in the outer belt; the comet flies them in order.</p>
      <ol class="log">${P.timeline.map((t, i) => `
        <li class="log-item" data-tl="${i}" style="--c:${KIND_COLORS[t.kind] || '#fff'}">
          <div class="log-year">${esc(t.year)}</div>
          <div class="log-body">
            <p class="log-kind">${esc(KIND_LABELS[t.kind] || t.kind)} · ${esc(t.duration)}</p>
            <h3>${esc(t.title)}</h3>
            <p class="log-org">${esc(t.org)}</p>
            <p class="log-details">${esc(t.details)}</p>
          </div>
        </li>`).join('')}
      </ol>`,
    foot: `
      <button type="button" class="step" data-go="about"><span aria-hidden="true">←</span> The star</button>
      <button type="button" class="step" data-go="skills">Skills <span aria-hidden="true">→</span></button>`,
  };
}

function constellationSVG(c, gi) {
  const lines = c.edges.map(([a, b]) => {
    const A = c.items[a], B = c.items[b];
    return `<line x1="${A.u.toFixed(4)}" y1="${(-A.v).toFixed(4)}" x2="${B.u.toFixed(4)}" y2="${(-B.v).toFixed(4)}"/>`;
  }).join('');
  const stars = c.items.map((it, k) =>
    `<circle data-g="${gi}" data-k="${k}" cx="${it.u.toFixed(4)}" cy="${(-it.v).toFixed(4)}" r="${it.bright ? 0.0075 : 0.0055}"/>`).join('');
  // frame each constellation in a 2:1 box around its own bounds
  const us = c.items.map((it) => it.u), vs = c.items.map((it) => -it.v);
  const pad = 0.022;
  const minU = Math.min(...us), maxU = Math.max(...us), minV = Math.min(...vs), maxV = Math.max(...vs);
  const w = Math.max(maxU - minU + pad * 2, (maxV - minV + pad * 2) * 2);
  const h = w / 2;
  const cx = (minU + maxU) / 2, cy = (minV + maxV) / 2;
  return `<svg class="cst-svg" viewBox="${(cx - w / 2).toFixed(4)} ${(cy - h / 2).toFixed(4)} ${w.toFixed(4)} ${h.toFixed(4)}" aria-hidden="true"><g class="cst-lines">${lines}</g><g class="cst-stars">${stars}</g></svg>`;
}

function renderSkills() {
  return {
    kicker: `Sky chart · ${M.constellations.length} constellations`,
    color: '#c393ff',
    body: `
      <p class="eyebrow"><i class="dot" style="--c:#c393ff"></i>${P.skills.length} core skills · ${P.stack.reduce((a, g) => a + g.items.length, 0)} stars charted</p>
      <h2 id="panel-title" tabindex="-1">Skills</h2>
      <p class="tagline">Every skill group is a constellation above the system. Hover a star (or a chip) to find it in the sky.</p>
      <div class="cst-grid">${M.constellations.map((c, gi) => `
        <section class="cst" data-g="${gi}">
          ${constellationSVG(c, gi)}
          <h3>${esc(c.group)}</h3>
          <ul class="chips">${c.items.map((it, k) => `<li><button type="button" class="chip${it.bright ? ' is-bright' : ''}" data-g="${gi}" data-k="${k}">${esc(it.name)}</button></li>`).join('')}</ul>
        </section>`).join('')}
      </div>
      <h3 class="sub">Core toolkit</h3>
      <ul class="chips chips-core">${P.skills.map((s) => `<li><span class="chip is-static">${esc(s)}</span></li>`).join('')}</ul>`,
    foot: `
      <button type="button" class="step" data-go="voyage"><span aria-hidden="true">←</span> Voyage log</button>
      <button type="button" class="step" data-go="contact">Transmit <span aria-hidden="true">→</span></button>`,
  };
}

function renderContact() {
  return {
    kicker: 'Transmit signal · Channel open',
    color: '#ffb547',
    body: `
      <p class="eyebrow"><i class="dot pulse" style="--c:#ffb547"></i>Receiving from ${esc(P.location)}</p>
      <h2 id="panel-title" tabindex="-1">Open a channel</h2>
      <p class="tagline">${esc(P.title)} · ${esc(P.role)}</p>
      <a class="email-big" href="mailto:${esc(P.email)}">${esc(P.email)}</a>
      <div class="btn-row">
        <button type="button" class="btn" id="copy-email">Copy address</button>
        <a class="btn btn-accent" href="mailto:${esc(P.email)}">Transmit <span aria-hidden="true">↗</span></a>
      </div>
      <svg class="wave" viewBox="0 0 400 60" preserveAspectRatio="none" aria-hidden="true"><path d=""/></svg>
      <ul class="links">${P.links.map((l, i) => `
        <li><a href="${esc(l.url)}"${extAttrs(l.url)}><span class="k">${pad2(i + 1)}</span><span class="n">${esc(l.label)}</span><span class="v">${esc(prettyUrl(l.url))}</span><span aria-hidden="true">↗</span></a></li>`).join('')}
      </ul>`,
    foot: `
      <button type="button" class="step" data-go="skills"><span aria-hidden="true">←</span> Skills</button>
      <button type="button" class="step" data-go="">Back to orbit <span aria-hidden="true">↺</span></button>`,
  };
}

/* ============================================================
   Panel mechanics
   ============================================================ */
const panel = $('#panel');
const panelBody = $('#panel-body');
const panelFoot = $('#panel-foot');

function showPanel(kind, r) {
  const wasOpen = panel.classList.contains('is-open');
  if (!wasOpen) state.returnFocus = document.activeElement;
  panel.dataset.kind = kind;
  panel.style.setProperty('--pc', r.color || '#ffb547');
  $('#panel-kicker').textContent = r.kicker;
  panelBody.innerHTML = r.body;
  panelBody.scrollTop = 0;
  panelFoot.innerHTML = r.foot || '';
  panelFoot.hidden = !r.foot;
  panel.classList.remove('swap');
  void panel.offsetWidth;
  panel.classList.add('swap', 'is-open');
  panel.inert = false;
  panel.removeAttribute('aria-hidden');
  body.classList.add('has-panel');
  requestAnimationFrame(updateInset);
  $('#panel-title')?.focus({ preventScroll: true });
}

function hidePanel() {
  if (!panel.classList.contains('is-open')) return;
  panel.classList.remove('is-open');
  panel.inert = true;
  panel.setAttribute('aria-hidden', 'true');
  body.classList.remove('has-panel');
  updateInset();
  const rf = state.returnFocus;
  state.returnFocus = null;
  if (rf && rf !== body && document.contains(rf) && !rf.closest('[inert]') && getComputedStyle(rf).visibility !== 'hidden') rf.focus({ preventScroll: true });
}

function updateInset() {
  if (!state.galaxy) return;
  if (!panel.classList.contains('is-open')) return state.galaxy.setInset({});
  // centre the subject in the space between the top HUD and the sheet
  // (offsetTop ignores the slide-in transform, so this is the sheet's resting edge)
  if (mqSheet.matches) state.galaxy.setInset({ bottom: Math.max(0, innerHeight - panel.offsetTop - 90) });
  else state.galaxy.setInset({ right: panel.offsetWidth + 28 });
}
window.addEventListener('resize', updateInset);

panel.addEventListener('click', (e) => {
  const step = e.target.closest('[data-step]');
  if (step) return stepProject(+step.dataset.step);
  const g = e.target.closest('[data-go]');
  if (g) return go(g.dataset.go);
  if (e.target.closest('.panel-close')) return go('');
  const chip = e.target.closest('.chip[data-g]');
  if (chip) {
    state.galaxy?.highlightSkill(+chip.dataset.g, +chip.dataset.k);
    markChip(+chip.dataset.g, +chip.dataset.k);
  }
  if (e.target.closest('#copy-email')) copyEmail();
});
['pointerover', 'focusin'].forEach((ev) => panel.addEventListener(ev, (e) => {
  const chip = e.target.closest('[data-g][data-k]');
  if (chip) { state.galaxy?.highlightSkill(+chip.dataset.g, +chip.dataset.k); markChip(+chip.dataset.g, +chip.dataset.k); }
  const tl = e.target.closest('[data-tl]');
  if (tl) state.galaxy?.highlightBeacon(+tl.dataset.tl);
}));
['pointerout', 'focusout'].forEach((ev) => panel.addEventListener(ev, (e) => {
  if (e.target.closest('[data-g][data-k]')) { state.galaxy?.highlightSkill(null); markChip(-1, -1); }
  if (e.target.closest('[data-tl]')) state.galaxy?.highlightBeacon(-1);
}));

function markChip(g, k) {
  $$('.chip.is-on, .cst-stars circle.is-on', panel).forEach((x) => x.classList.remove('is-on'));
  if (g < 0) return;
  $$(`[data-g="${g}"][data-k="${k}"]`, panel).forEach((x) => x.classList.add('is-on'));
}

function loadShot() {
  const fig = $('.shot[data-src]', panel);
  if (!fig) return;
  const img = $('img', fig);
  const status = $('.shot-status', fig);
  img.addEventListener('load', () => { fig.classList.remove('is-loading'); fig.classList.add('is-loaded'); status.textContent = 'Signal received'; }, { once: true });
  img.addEventListener('error', () => { fig.classList.remove('is-loading'); fig.classList.add('is-error'); status.textContent = 'Signal lost'; }, { once: true });
  img.src = fig.dataset.src; // fetched only now, when this project is opened
}

let waveRAF = 0;
function animateWave() {
  cancelAnimationFrame(waveRAF);
  const path = $('.wave path', panel);
  if (!path) return;
  const draw = (t) => {
    if (!document.contains(path)) return;
    let d = 'M0 30';
    for (let x = 0; x <= 400; x += 4) {
      const env = Math.sin((x / 400) * Math.PI);
      const y = 30 + Math.sin(x * 0.09 + t * 0.006) * 14 * env * Math.sin(x * 0.013 + t * 0.002) + Math.sin(x * 0.31 - t * 0.011) * 3 * env;
      d += ` L${x} ${y.toFixed(1)}`;
    }
    path.setAttribute('d', d);
    if (!reduced) waveRAF = requestAnimationFrame(draw);
  };
  draw(performance.now());
}

async function copyEmail() {
  try {
    await navigator.clipboard.writeText(P.email);
    toast('Address copied. Signal locked on ' + P.email);
  } catch {
    const a = $('.email-big', panel);
    const range = document.createRange();
    range.selectNodeContents(a);
    const sel = getSelection(); sel.removeAllRanges(); sel.addRange(range);
    toast('Address selected. Press Ctrl/Cmd + C to copy');
  }
  state.galaxy?.pulse('#ffb547');
}

/* ============================================================
   Navigation + routing
   ============================================================ */
const SECTIONS = { about: renderAbout, voyage: renderVoyage, skills: renderSkills, contact: renderContact };

function setHash(route) {
  const url = route ? '#/' + route : location.pathname + location.search;
  try { history.replaceState(null, '', url); } catch { /* file:// or sandboxed */ }
}

function setNavActive(name) {
  $$('#nav [data-go]').forEach((b) => {
    const on = b.dataset.go === name;
    b.classList.toggle('is-active', on);
    if (on) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
  });
}

function setTarget(text) { $('#readout-target').textContent = text || '—'; }

function openProject(i, opts = {}) {
  const n = M.projects.length;
  i = ((i % n) + n) % n;
  state.mode = 'project';
  state.current = i;
  showPanel('project', renderProject(i));
  loadShot();
  state.galaxy?.setMode('project', { index: i, warp: !!opts.warp });
  setNavActive(null);
  setHash('p/' + M.projects[i].slug);
  setTarget(M.projects[i].title);
}

function openSection(name, opts = {}) {
  state.mode = name;
  state.current = -1;
  showPanel(name, SECTIONS[name]());
  state.galaxy?.setMode(name);
  setNavActive(name);
  setHash(name);
  setTarget(name === 'about' ? P.name : name === 'voyage' ? 'Outer belt' : name === 'skills' ? 'Sky chart' : 'Open channel');
  if (name === 'contact') animateWave();
  if (opts.beacon != null) {
    const li = $(`[data-tl="${opts.beacon}"]`, panel);
    if (li) {
      li.classList.add('is-flash');
      li.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
      state.galaxy?.highlightBeacon(opts.beacon);
      setTimeout(() => { li.classList.remove('is-flash'); state.galaxy?.highlightBeacon(-1); }, 2400);
    }
  }
}

function home() {
  state.mode = 'overview';
  state.current = -1;
  hidePanel();
  state.galaxy?.setMode('overview');
  setNavActive(null);
  setHash('');
  setTarget('');
}

function go(route = '', opts = {}) {
  const [kind, arg] = route.replace(/^#?\/?/, '').split('/');
  if (kind === 'p') {
    const i = M.projects.findIndex((p) => p.slug === arg);
    return i >= 0 ? openProject(i, opts) : home();
  }
  if (SECTIONS[kind]) return openSection(kind, opts);
  return home();
}

function stepProject(d) {
  if (state.mode === 'project') openProject(state.current + d);
  else openProject(d > 0 ? 0 : M.projects.length - 1);
}

function warp() {
  if (!state.threeOk) return;
  const n = M.projects.length;
  let i = Math.floor(Math.random() * n);
  if (i === state.current) i = (i + 1 + Math.floor(Math.random() * (n - 1))) % n;
  openProject(i, { warp: true });
  toast(`Hyperspace jump → ${M.projects[i].title}`);
}

$('#nav').addEventListener('click', (e) => {
  const b = e.target.closest('[data-go]');
  if (b) { e.preventDefault(); return state.mode === b.dataset.go ? go('') : go(b.dataset.go); }
  if (e.target.closest('[data-action=list]')) toggleManifest();
});
$('#warp-btn').addEventListener('click', warp);
$('#warp-btn-m').addEventListener('click', warp);
$('#help-btn').addEventListener('click', openHelp);
$('#home-btn').addEventListener('click', () => go(''));
window.addEventListener('hashchange', () => go(location.hash));

/* ============================================================
   Scene hooks
   ============================================================ */
const hooks = {
  onPick(pick) {
    if (pick.kind === 'planet') openProject(pick.index);
    else if (pick.kind === 'star') { openSection('about'); countStarClick(); }
    else if (pick.kind === 'beacon') openSection('voyage', { beacon: pick.index });
    else if (pick.kind === 'skill') {
      if (state.mode !== 'skills') openSection('skills');
      markChip(pick.group, pick.index);
      $(`.chip[data-g="${pick.group}"][data-k="${pick.index}"]`, panel)?.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
    }
  },
  onHover(pick) {
    if (!pick) return setTarget(state.mode === 'project' ? M.projects[state.current].title : '');
    if (pick.kind === 'planet') setTarget(M.projects[pick.index].title);
    else if (pick.kind === 'star') setTarget(P.name);
    else if (pick.kind === 'beacon') setTarget(`${P.timeline[pick.index].year} · ${P.timeline[pick.index].title}`);
    else if (pick.kind === 'skill') { setTarget(M.constellations[pick.group].items[pick.index].name); markChip(pick.group, pick.index); }
  },
  onWarp() {
    body.classList.remove('warping');
    void body.offsetWidth;
    body.classList.add('warping');
    setTimeout(() => body.classList.remove('warping'), 1600);
  },
  onFrame(g) {
    state.frame++;
    if (state.frame % 2 === 0) drawRadar(g.snapshot());
  },
};

/* ============================================================
   Radar + readouts
   ============================================================ */
const radar = $('#radar');
const rctx = radar.getContext('2d');
let radarScale = 1, radarSize = 0, lastSnap = null;
function sizeRadar() {
  const s = radar.clientWidth;
  if (!s) return;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  radar.width = radar.height = Math.round(s * dpr);
  rctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  radarSize = s;
}
window.addEventListener('resize', sizeRadar);

function drawRadar(s) {
  lastSnap = s;
  if (!radarSize) sizeRadar();
  if (!radarSize || radar.offsetParent === null) return;
  const S = radarSize, c = S / 2;
  radarScale = (c - 8) / (s.beltR + 4);
  const k = radarScale;
  rctx.clearRect(0, 0, S, S);
  // sweep
  if (!reduced && rctx.createConicGradient) {
    const a = (s.t * 1.2) % (Math.PI * 2);
    const g = rctx.createConicGradient(a - 0.9, c, c);
    g.addColorStop(0, 'rgba(255,181,71,0)');
    g.addColorStop(0.14, 'rgba(255,181,71,0.22)');
    g.addColorStop(0.145, 'rgba(255,181,71,0)');
    rctx.fillStyle = g;
    rctx.beginPath(); rctx.arc(c, c, c - 4, 0, Math.PI * 2); rctx.fill();
  }
  rctx.lineWidth = 1;
  for (const o of s.orbits) {
    rctx.strokeStyle = o.color + '40';
    rctx.beginPath(); rctx.arc(c, c, o.r * k, 0, Math.PI * 2); rctx.stroke();
  }
  rctx.setLineDash([1.5, 3]);
  rctx.strokeStyle = 'rgba(200,190,170,0.35)';
  rctx.beginPath(); rctx.arc(c, c, s.beltR * k, 0, Math.PI * 2); rctx.stroke();
  rctx.setLineDash([]);
  // crosshair
  rctx.strokeStyle = 'rgba(170,200,255,0.12)';
  rctx.beginPath(); rctx.moveTo(c, 6); rctx.lineTo(c, S - 6); rctx.moveTo(6, c); rctx.lineTo(S - 6, c); rctx.stroke();
  // star
  const sg = rctx.createRadialGradient(c, c, 0, c, c, 7);
  sg.addColorStop(0, '#fff3d6'); sg.addColorStop(0.4, '#ffb547'); sg.addColorStop(1, 'rgba(255,122,69,0)');
  rctx.fillStyle = sg; rctx.beginPath(); rctx.arc(c, c, 7, 0, Math.PI * 2); rctx.fill();
  for (const b of s.beacons) {
    rctx.fillStyle = b.color;
    rctx.fillRect(c + b.x * k - 1.5, c + b.z * k - 1.5, 3, 3);
  }
  rctx.fillStyle = '#e8f6ff';
  rctx.beginPath(); rctx.arc(c + s.comet.x * k, c + s.comet.z * k, 1.6, 0, Math.PI * 2); rctx.fill();
  for (const p of s.planets) {
    const x = c + p.x * k, y = c + p.z * k;
    rctx.fillStyle = p.color;
    rctx.beginPath(); rctx.arc(x, y, p.i === s.index ? 3.6 : 2.6, 0, Math.PI * 2); rctx.fill();
    if (p.i === s.index) {
      rctx.strokeStyle = p.color; rctx.beginPath(); rctx.arc(x, y, 7, 0, Math.PI * 2); rctx.stroke();
    }
  }
  // camera wedge
  let cx = c + s.cam.x * k, cz = c + s.cam.z * k;
  const dx = cx - c, dz = cz - c, dl = Math.hypot(dx, dz), maxL = c - 6;
  if (dl > maxL) { cx = c + (dx / dl) * maxL; cz = c + (dz / dl) * maxL; }
  const ang = Math.atan2((c + s.target.z * k) - cz, (c + s.target.x * k) - cx);
  rctx.save();
  rctx.translate(cx, cz); rctx.rotate(ang);
  rctx.fillStyle = 'rgba(255,181,71,0.16)';
  rctx.beginPath(); rctx.moveTo(0, 0); rctx.arc(0, 0, 26, -0.42, 0.42); rctx.closePath(); rctx.fill();
  rctx.fillStyle = '#ffb547';
  rctx.beginPath(); rctx.moveTo(5, 0); rctx.lineTo(-4, -3.5); rctx.lineTo(-4, 3.5); rctx.closePath(); rctx.fill();
  rctx.restore();
}

radar.addEventListener('click', (e) => {
  if (!lastSnap) return;
  const r = radar.getBoundingClientRect();
  const x = e.clientX - r.left, y = e.clientY - r.top, c = radarSize / 2;
  let best = -1, bd = 14;
  for (const p of lastSnap.planets) {
    const d = Math.hypot(c + p.x * radarScale - x, c + p.z * radarScale - y);
    if (d < bd) { bd = d; best = p.i; }
  }
  if (best >= 0) openProject(best);
  else if (Math.hypot(x - c, y - c) < 10) openSection('about');
});

setInterval(() => { if (!document.hidden) updateReadouts(state.galaxy); }, 250);
const fmt = (v) => (v < 0 ? '−' : '+') + Math.abs(v).toFixed(1).padStart(5, '0');
function updateReadouts(g) {
  const s = lastSnap;
  if (s) $('#readout-cam').textContent = `${fmt(s.cam.x)} ${fmt(s.cam.y)} ${fmt(s.cam.z)}`;
  const secs = Math.floor((performance.now() - state.t0) / 1000);
  $('#readout-clock').textContent = `T+ ${pad2(Math.floor(secs / 3600))}:${pad2(Math.floor(secs / 60) % 60)}:${pad2(secs % 60)}`;
  if (state.debug && g) {
    const st = g.stats();
    $('#stats').textContent = `FPS ${st.fps.toFixed(0)} · CALLS ${st.calls} · TRIS ${(st.tris / 1000).toFixed(0)}k · DPR ${st.pr}`;
  }
}

/* ============================================================
   List view (the flight manifest) — also the no-WebGL fallback
   ============================================================ */
function renderManifest() {
  const proj = M.projects.map((p) => `
    <li class="m-proj" style="--c:${p.color}">
      <div class="m-proj-head">
        <span class="m-idx">${pad2(p.index + 1)}</span>
        <h4><a href="${esc(p.url)}"${extAttrs(p.url)}>${esc(p.title)} <span aria-hidden="true">↗</span></a></h4>
        <span class="m-meta">${esc(p.area)} · ${esc(p.year)}</span>
      </div>
      <p class="m-tag">${esc(p.tag)}</p>
      <p>${esc(p.blurb)}</p>
      <ul class="m-bullets">${p.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>
      <p class="m-stat"><b>${esc(p.stat.value)}</b> ${esc(p.stat.label)}</p>
      ${p.image ? `<details class="m-shot"><summary>Show screenshot</summary><img data-src="${esc(p.image)}" alt="Screenshot of ${esc(p.title)}" decoding="async"></details>` : ''}
      ${state.threeOk ? `<button type="button" class="m-fly" data-fly="${p.index}">Fly to planet <span aria-hidden="true">→</span></button>` : ''}
    </li>`).join('');
  $('#manifest-body').innerHTML = `
    <header class="m-hero">
      <p class="m-kicker">${esc(P.role)} · ${esc(P.location)}</p>
      <h2 id="manifest-title" tabindex="-1">${esc(P.name)}</h2>
      <p class="m-title">${esc(P.title)}</p>
      <ul class="m-verbs">${P.verbs.map((v) => `<li>${esc(firstName)} ${esc(v)}</li>`).join('')}</ul>
    </header>
    <section aria-labelledby="m-about"><h3 id="m-about">About</h3>
      ${P.about.map((t) => `<p>${esc(t)}</p>`).join('')}
      <dl class="facts">${P.facts.map((f) => `<div><dt>${esc(f.k)}</dt><dd>${esc(f.v)}</dd></div>`).join('')}</dl>
    </section>
    <section aria-labelledby="m-work"><h3 id="m-work">Projects <span>${M.projects.length}</span></h3><ol class="m-projects">${proj}</ol></section>
    <section aria-labelledby="m-log"><h3 id="m-log">Voyage log</h3>
      <ol class="log">${P.timeline.map((t) => `
        <li class="log-item" style="--c:${KIND_COLORS[t.kind] || '#fff'}"><div class="log-year">${esc(t.year)}</div>
        <div class="log-body"><p class="log-kind">${esc(KIND_LABELS[t.kind] || t.kind)} · ${esc(t.duration)}</p><h4>${esc(t.title)}</h4><p class="log-org">${esc(t.org)}</p><p class="log-details">${esc(t.details)}</p></div></li>`).join('')}
      </ol>
    </section>
    <section aria-labelledby="m-edu"><h3 id="m-edu">Education</h3>
      <ul class="edu">${P.education.map((e) => `<li><b>${esc(e.degree)}</b><span>${esc(e.school)}</span><time>${esc(e.years)}</time></li>`).join('')}</ul>
    </section>
    <section aria-labelledby="m-skills"><h3 id="m-skills">Skills</h3>
      <ul class="chips chips-core">${P.skills.map((s) => `<li><span class="chip is-static">${esc(s)}</span></li>`).join('')}</ul>
      <div class="m-stack">${P.stack.map((g) => `<div><h4>${esc(g.group)}</h4><p>${g.items.map(esc).join(' · ')}</p></div>`).join('')}</div>
    </section>
    <section aria-labelledby="m-courses"><h3 id="m-courses">Coursework</h3>
      <ul class="courses">${P.courses.map((c) => `<li><a href="${esc(c.url)}"${extAttrs(c.url)}><span class="code">${esc(c.code)}</span><span>${esc(c.name)}</span><span aria-hidden="true">↗</span></a></li>`).join('')}</ul>
    </section>
    <section aria-labelledby="m-contact"><h3 id="m-contact">Contact</h3>
      <a class="email-big" href="mailto:${esc(P.email)}">${esc(P.email)}</a>
      <ul class="links">${P.links.map((l, i) => `<li><a href="${esc(l.url)}"${extAttrs(l.url)}><span class="k">${pad2(i + 1)}</span><span class="n">${esc(l.label)}</span><span class="v">${esc(prettyUrl(l.url))}</span><span aria-hidden="true">↗</span></a></li>`).join('')}</ul>
    </section>
    <footer class="m-foot">Rendered from shared/data.js · ${esc(P.name)}</footer>`;
}

const manifest = $('#manifest');
manifest.addEventListener('toggle', (e) => {
  const d = e.target;
  if (d.matches?.('details.m-shot') && d.open) { const img = $('img', d); if (!img.src) img.src = img.dataset.src; }
}, true);
manifest.addEventListener('click', (e) => {
  const f = e.target.closest('[data-fly]');
  if (f) { closeManifest(); openProject(+f.dataset.fly); }
});
$('#manifest-close').addEventListener('click', () => closeManifest());
$('#skip-link').addEventListener('click', (e) => { e.preventDefault(); openManifest(); });

function openManifest() {
  if (state.manifest) return;
  state.manifest = true;
  renderManifest();
  manifest.hidden = false;
  body.classList.add('manifest-open');
  $$('[data-hud]').forEach((el) => { el.inert = true; });
  panel.inert = true;
  state.galaxy?.setPaused(true);
  $('#nav [data-action=list]').setAttribute('aria-pressed', 'true');
  $('#manifest-title').focus({ preventScroll: true });
}
function closeManifest() {
  if (!state.manifest || !state.threeOk) return;
  state.manifest = false;
  manifest.hidden = true;
  body.classList.remove('manifest-open');
  $$('[data-hud]').forEach((el) => { el.inert = false; });
  panel.inert = !panel.classList.contains('is-open');
  state.galaxy?.setPaused(false);
  $('#nav [data-action=list]').setAttribute('aria-pressed', 'false');
  $('#nav [data-action=list]').focus({ preventScroll: true });
}
function toggleManifest() { state.manifest ? closeManifest() : openManifest(); }

/* ============================================================
   Toast, help, comms console
   ============================================================ */
let toastTimer = 0;
function toast(msg, ms = 2800) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('on'), ms);
}

const help = $('#help');
function openHelp() { if (!help.open) help.showModal(); }
help.addEventListener('click', (e) => {
  if (e.target === help || e.target.closest('[data-close]')) help.close();
  if (e.target.closest('[data-comms]')) { help.close(); openComms(); }
});

const comms = $('#comms');
const commsInput = $('#comms-input');
const commsLog = $('#comms-log');
function log(line, cls = '') {
  const p = document.createElement('p');
  if (cls) p.className = cls;
  p.textContent = line;
  commsLog.appendChild(p);
  while (commsLog.children.length > 7) commsLog.firstChild.remove();
}
function openComms() {
  comms.hidden = false;
  body.classList.add('comms-open');
  if (!commsLog.children.length) log('Channel open. Type "help". Esc to close.', 'dim');
  commsInput.focus();
}
function closeComms() {
  comms.hidden = true;
  body.classList.remove('comms-open');
  commsInput.blur();
}
comms.addEventListener('submit', (e) => {
  e.preventDefault();
  const raw = commsInput.value.trim();
  commsInput.value = '';
  if (raw) runCommand(raw);
});
commsInput.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); closeComms(); } });

function runCommand(raw) {
  log('> ' + raw, 'cmd');
  const [cmd0, ...rest] = raw.split(/\s+/);
  const cmd = cmd0.toLowerCase();
  const arg = rest.join(' ');
  const need3D = () => { if (!state.threeOk) { log('3D link offline. Try "list".'); return false; } return true; };
  switch (cmd) {
    case 'help': case '?':
      log('ls · goto <name|n> · warp · home · about · log · skills · contact · list');
      log('time · ping · supernova · whoami · debug · clear');
      return;
    case 'ls': case 'planets':
      M.projects.forEach((p) => log(`${pad2(p.index + 1)}  ${p.title}`, 'dim'));
      return;
    case 'goto': case 'fly': case 'open': case 'cd': {
      const i = findProject(M, arg);
      if (i < 0) return log(`No planet matches "${arg}".`);
      log(`Plotting course → ${M.projects[i].title}`);
      return openProject(i);
    }
    case 'warp': case 'jump': if (need3D()) { warp(); log('Engaging hyperdrive.'); } return;
    case 'home': case 'orbit': case 'overview': go(''); return log('Returning to orbit.');
    case 'about': case 'star': case 'matej': go('about'); return log(P.title + ' · ' + P.role);
    case 'whoami': return log(`${P.name} · ${P.title} · ${P.location}`);
    case 'log': case 'voyage': case 'experience': case 'timeline': go('voyage'); return log('Opening voyage log.');
    case 'skills': case 'sky': case 'stack': go('skills'); return log('Pointing the telescope up.');
    case 'contact': case 'transmit': case 'email': case 'mail': go('contact'); return log('Channel to ' + P.email);
    case 'list': case 'manifest': closeComms(); return openManifest();
    case 'ping': if (need3D()) state.galaxy.pulse('#6fd0ff'); return log('Ping sent. Echo from the outer belt.');
    case 'supernova': case 'nova': return supernova();
    case 'time': case 'turbo': return toggleTurbo(log);
    case 'debug': case 'stats': return toggleDebug(log);
    case 'clear': commsLog.innerHTML = ''; return;
    case 'sudo': return log('Permission denied: you are a guest in this galaxy.');
    case 'exit': case 'quit': return closeComms();
    default: {
      const word = raw.toUpperCase();
      const i = findProject(M, raw);
      if (i >= 0) { log(`Signal "${word}" traced to ${M.projects[i].title}.`); return openProject(i); }
      if (P.words.includes(word)) { state.galaxy?.pulse('#c393ff'); return log(`Signal "${word}" received. Five letters, no planet. Yet.`); }
      log(`Unknown command "${cmd}". Type help.`);
    }
  }
}

/* ============================================================
   Easter eggs
   ============================================================ */
function supernova() {
  if (!state.threeOk) return toast('Supernova needs the 3D view');
  if (state.mode !== 'overview' && state.mode !== 'about') go('');
  state.galaxy.supernova();
  body.classList.add('nova');
  setTimeout(() => body.classList.remove('nova'), 2400);
  toast('☼ Supernova. You found the core’s secret.', 3600);
  log?.('Core temperature: off the charts.');
}
function countStarClick() {
  const now = performance.now();
  state.starClicks = state.starClicks.filter((t) => now - t < 2500);
  state.starClicks.push(now);
  if (state.starClicks.length === 3) toast('The star is getting warm…', 1600);
  if (state.starClicks.length >= 5) { state.starClicks = []; supernova(); }
}
function toggleTurbo(out) {
  if (!state.threeOk) return;
  const on = !state.galaxy.turbo;
  state.galaxy.setTurbo(on);
  const msg = on ? 'Time dilation ×14. Press T to restore.' : 'Time restored.';
  toast(msg);
  if (typeof out === 'function') out(msg);
}
function toggleDebug(out) {
  state.debug = !state.debug;
  $('#stats').hidden = !state.debug;
  const msg = state.debug ? 'Telemetry overlay on.' : 'Telemetry overlay off.';
  if (typeof out === 'function') out(msg); else toast(msg);
}

const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
let kpos = 0;
function konami(e) {
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  kpos = k === KONAMI[kpos] ? kpos + 1 : k === KONAMI[0] ? 1 : 0;
  if (kpos === KONAMI.length) { kpos = 0; supernova(); return true; }
  return false;
}

/* ============================================================
   Keyboard
   ============================================================ */
document.addEventListener('keydown', (e) => {
  if (!state.introDone) endIntro();
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const typing = e.target.closest?.('input, textarea, select, [contenteditable="true"]');
  if (typing) return;
  if (help.open) return;
  if (konami(e)) return;
  if (state.manifest) {
    if (e.key === 'Escape' || e.key === 'l' || e.key === 'L') { if (state.threeOk) { e.preventDefault(); closeManifest(); } }
    return;
  }
  const onControl = e.target.closest?.('button, a, summary');
  switch (e.key) {
    case 'Escape':
      if (!comms.hidden) closeComms();
      else if (state.mode !== 'overview') go('');
      break;
    case 'ArrowRight': e.preventDefault(); stepProject(1); break;
    case 'ArrowLeft': e.preventDefault(); stepProject(-1); break;
    case 'w': case 'W': warp(); break;
    case 'l': case 'L': openManifest(); break;
    case '?': openHelp(); break;
    case '/': case '`': e.preventDefault(); openComms(); break;
    case 't': case 'T': toggleTurbo(); break;
    case '0': case 'h': case 'H': go(''); break;
    case '1': go('about'); break;
    case '2': go('voyage'); break;
    case '3': go('skills'); break;
    case '4': go('contact'); break;
    case 'Enter': if (!onControl && state.mode === 'overview') openProject(0); break;
    default: break;
  }
});

/* ============================================================
   Intro
   ============================================================ */
let introTimer = 0;
function typeInto(el, text, speed) {
  if (reduced) { el.textContent = text; return; }
  let i = 0;
  const t = setInterval(() => { el.textContent = text.slice(0, ++i); if (i >= text.length) clearInterval(t); }, speed);
}
function runIntro() {
  const intro = $('#intro');
  const first = P.first || P.name.split(' ')[0].toUpperCase();
  const last = P.last || P.name.split(' ').slice(1).join(' ').toUpperCase();
  let n = 0;
  $('#intro-name').innerHTML = [first, last].map((w) =>
    `<span class="w">${[...w].map((ch) => `<span class="ch" style="--i:${n++}">${esc(ch)}</span>`).join('')}</span>`).join(' ');
  $('#intro-title').textContent = P.title;
  if (reduced || location.hash.length > 2 || params.has('nointro')) { endIntro(true); return; }
  body.classList.add('intro-on');
  typeInto($('#intro-kicker'), `Establishing link · ${P.location}`, 24);
  introTimer = setTimeout(() => endIntro(), 4100);
  intro.addEventListener('pointerdown', () => endIntro(), { once: true });
}
function endIntro(instant) {
  if (state.introDone) return;
  state.introDone = true;
  clearTimeout(introTimer);
  const intro = $('#intro');
  body.classList.remove('intro-on');
  body.classList.add('ready');
  if (instant) intro.remove();
  else { intro.classList.add('out'); setTimeout(() => intro.remove(), 1000); }
  startTyper();
}

/* ============================================================
   Boot the 3D scene (or fall back to the list view)
   ============================================================ */
function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch { return false; }
}

function fallback(reason) {
  body.classList.add('no-3d');
  $('#fallback-note').textContent = `3D view unavailable (${reason}). Here is everything as a list.`;
  $('#fallback-note').hidden = false;
  endIntro(true);
  openManifest();
}

async function boot3D() {
  if (params.has('list')) { /* still boot 3D; just open the list */ }
  if (!hasWebGL()) return fallback('WebGL is not supported here');
  try {
    const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('three.js took too long to load')), 15000));
    const mod = await Promise.race([import('./scene.js'), timeout]);
    const g = mod.createGalaxy({
      canvas: $('#scene'), labelsEl: $('#labels'), reticleEl: $('#reticle'),
      model: M, hooks, reduced, mobile: mqSheet.matches || coarse,
      quality: params.get('quality') || 'auto',
    });
    state.galaxy = g;
    state.threeOk = true;
    body.classList.add('has-3d');
    if (location.hash.length > 2) go(location.hash);
    else if (!reduced) g.intro(state.introDone ? 2.2 : 4.0);
    if (params.has('list')) openManifest();
  } catch (err) {
    console.warn('[galaxy] 3D disabled:', err);
    fallback('the 3D engine could not load');
  }
}

mqReduced.addEventListener?.('change', (e) => {
  reduced = e.matches;
  state.galaxy?.setReduced(reduced);
  body.classList.toggle('reduced', reduced);
});
body.classList.toggle('reduced', reduced);
mqSheet.addEventListener?.('change', updateInset);

runIntro();
boot3D();

// A note for the curious.
console.log('%c◉ MATEJ POPOVSKI · GALAXY', 'font: 600 13px monospace; color: #ffb547; letter-spacing: .15em');
console.log('%cPress / for the comms console, W to warp, T to bend time. Konami code works too.', 'font: 12px monospace; color: #9fb4d8');
