/*
 * Sketchbook: renders the notebook from window.PORTFOLIO and wires the
 * core interactions (hero handwriting, verbs, sticky notes, entries, logbook).
 */
(function () {
  "use strict";

  const P = window.PORTFOLIO;
  if (!P) {
    document.body.insertAdjacentHTML("afterbegin", '<p class="noscript">Could not load shared/data.js.</p>');
    return;
  }

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode: fine */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } },
  };

  // ---------- toast (a little handwritten note at the bottom) ----------
  const toastEl = $("#toast");
  let toastT;
  function toast(msg, ms = 3200) {
    toastEl.textContent = msg;
    toastEl.classList.add("is-on");
    clearTimeout(toastT);
    toastT = setTimeout(() => toastEl.classList.remove("is-on"), ms);
  }

  // ---------- simple binds ----------
  const firstName = (P.first || P.name.split(" ")[0]).toLowerCase().replace(/^./, (c) => c.toUpperCase());
  $$("[data-bind]").forEach((el) => {
    const k = el.dataset.bind;
    el.textContent = k === "firstName" ? firstName : P[k] || "";
  });
  // keep "UW–Madison" & co. from breaking mid-phrase
  $$('[data-bind="role"]').forEach((el) => {
    const parts = String(P.role || "").split(" · ");
    el.innerHTML = parts.map((x, i) => `<span class="nb">${esc(x)}${i < parts.length - 1 ? " ·" : ""}</span>`).join(" ");
  });
  $$("[data-bind-email]").forEach((a) => { a.href = "mailto:" + P.email; a.textContent = P.email; });
  $("#year").textContent = new Date().getFullYear();

  // ---------- draw-when-visible observer ----------
  const drawIO = "IntersectionObserver" in window
    ? new IntersectionObserver((es) => es.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("is-drawn"); drawIO.unobserve(e.target); }
      }), { threshold: 0.25, rootMargin: "0px 0px -8% 0px" })
    : null;
  function observeDraw(el) { if (drawIO) drawIO.observe(el); else el.classList.add("is-drawn"); }

  // Sketchy underline for every section heading
  $$(".h-sketch").forEach((h, i) => {
    const paths = [
      "M4 12 C 60 5, 120 17, 180 9 S 270 13, 296 7",
      "M3 10 C 70 14, 140 4, 210 11 S 280 8, 297 12 M20 16 C 90 12, 170 18, 260 13",
      "M5 9 C 80 16, 150 6, 220 12 S 285 7, 295 10",
    ];
    h.insertAdjacentHTML("beforeend", `<svg class="h-sketch__u" viewBox="0 0 300 20" preserveAspectRatio="none" aria-hidden="true"><path class="d" pathLength="1" d="${paths[i % 3]}"/></svg>`);
    observeDraw(h);
  });
  $$(".anno, .turn, .circled, .hero__title").forEach(observeDraw);

  // ---------- hero: the name, written letter by letter ----------
  const nameSvg = $(".name-svg");
  const NS = "http://www.w3.org/2000/svg";
  function writeName() {
    const name = P.name;
    nameSvg.innerHTML = "";
    const text = document.createElementNS(NS, "text");
    text.setAttribute("x", "0");
    text.setAttribute("y", "120");
    text.setAttribute("class", "name-text");
    nameSvg.appendChild(text);
    let delay = 0.15;
    const per = reduce ? 0 : 0.11;
    const timeline = [];
    [...name].forEach((ch, i) => {
      const t = document.createElementNS(NS, "tspan");
      t.textContent = ch;
      if (ch === " ") { delay += per * 1.5; text.appendChild(t); return; }
      t.setAttribute("class", "ltr");
      t.style.setProperty("--d", delay + "s");
      text.appendChild(t);
      timeline.push([delay, i]);
      delay += per;
    });
    const u = document.createElementNS(NS, "path");
    u.setAttribute("class", "name-under");
    u.setAttribute("pathLength", "1");
    u.style.setProperty("--d", delay + 0.2 + "s");
    nameSvg.appendChild(u);

    // Fit the viewBox to the text (again once the real font is in)
    function fit() {
      const box = text.getBBox();
      if (!box.width) return;
      const pad = 12;
      const vw = box.width + pad * 2, vh = box.height + pad * 2 + 14;
      nameSvg.setAttribute("viewBox", `${box.x - pad} ${box.y - pad} ${vw} ${vh}`);
      nameSvg.style.aspectRatio = `${vw} / ${vh}`;
      const y0 = box.y + box.height + 4;
      u.setAttribute("d", `M${box.x + 6} ${y0} C ${box.x + box.width * 0.3} ${y0 + 10}, ${box.x + box.width * 0.6} ${y0 - 6}, ${box.x + box.width - 4} ${y0 + 4}`);
    }
    fit();
    if (document.fonts) {
      if (document.fonts.ready) document.fonts.ready.then(fit);
      document.fonts.addEventListener && document.fonts.addEventListener("loadingdone", fit);
    }
    window.addEventListener("resize", fit);

    if (reduce) return;
    // a pencil that follows the writing
    const pencil = document.createElementNS(NS, "g");
    pencil.setAttribute("class", "name-pencil");
    pencil.innerHTML = '<g transform="rotate(-38) scale(1.4)"><path d="M0 0 L8 -4 L56 -4 L56 4 L8 4 Z" fill="#f2c14e" stroke="#2f3238" stroke-width="1.6"/><path d="M0 0 L8 -4 L8 4 Z" fill="#e8c9a0" stroke="#2f3238" stroke-width="1.4"/><path d="M0 0 L3 -1.5 L3 1.5Z" fill="#2f3238"/><rect x="56" y="-4" width="10" height="8" fill="#e98a9a" stroke="#2f3238" stroke-width="1.6"/></g>';
    nameSvg.appendChild(pencil);
    pencil.style.transform = "translate(0px, 110px)";
    const endX = (i) => { try { return text.getEndPositionOfChar(i).x; } catch (e) { return 0; } };
    timeline.forEach(([d, i]) => setTimeout(() => (pencil.style.transform = `translate(${endX(i)}px, ${96 + Math.random() * 18}px)`), d * 1000 + 350));
    setTimeout(() => pencil.classList.add("is-done"), (delay + 0.9) * 1000);
  }
  let wrote = false;
  const doWrite = () => { if (!wrote) { wrote = true; writeName(); } };
  if (document.fonts && document.fonts.load) {
    document.fonts.load("700 120px Caveat").then(doWrite, doWrite);
    setTimeout(doWrite, 1800);
  } else doWrite();

  // ---------- hero: Matej ___ (scribbled out and rewritten) ----------
  const verbs = P.verbs && P.verbs.length ? P.verbs : [P.title];
  const verbEl = $(".verb");
  const verbText = $(".verb__text");
  let vi = 0;
  verbText.textContent = verbs[0];
  function nextVerb() {
    if (verbEl.classList.contains("is-scratch")) return;
    vi = (vi + 1) % verbs.length;
    if (reduce) { verbText.textContent = verbs[vi]; return; }
    verbEl.classList.add("is-scratch");
    setTimeout(() => {
      verbEl.classList.remove("is-scratch");
      verbEl.classList.add("is-writing");
      verbText.textContent = verbs[vi];
      void verbText.offsetWidth;
      verbEl.classList.remove("is-writing");
    }, 650);
  }
  verbEl.setAttribute("role", "button");
  verbEl.setAttribute("tabindex", "0");
  verbEl.setAttribute("title", "click for another one");
  verbEl.addEventListener("click", nextVerb);
  verbEl.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); nextVerb(); } });
  let heroVisible = true;
  new IntersectionObserver((es) => (heroVisible = es[0].isIntersecting)).observe($("#top"));
  if (!reduce) setInterval(() => { if (heroVisible && !document.hidden) nextVerb(); }, 3800);

  // ---------- sticky notes ----------
  const notesEl = $("#notes");
  const noteColors = ["#fff07a", "#ffc9d9", "#bff0cf", "#c5e4ff", "#ffd8a8"];
  const saved = store.get("mp5-notes", {});
  (P.facts || []).forEach((f, i) => {
    const n = document.createElement("div");
    n.className = "note";
    n.tabIndex = 0;
    n.setAttribute("role", "group");
    n.setAttribute("aria-roledescription", "draggable sticky note");
    n.setAttribute("aria-label", `${f.k}: ${f.v}. Drag, or use arrow keys to move.`);
    n.style.setProperty("--bg", noteColors[i % noteColors.length]);
    n.style.setProperty("--rot", [-4, 3, -2, 5, -3][i % 5] + "deg");
    n.innerHTML = `<span class="note__k">${esc(f.k)}</span><span class="note__v">${esc(f.v)}</span>`;
    const off = saved[i] || [0, 0];
    n.dataset.dx = off[0];
    n.dataset.dy = off[1];
    place(n);
    notesEl.appendChild(n);
  });
  const tidyBtn = $("#tidyNotes");
  function place(n) { n.style.translate = `${n.dataset.dx}px ${n.dataset.dy}px`; }
  function anyMoved() { return $$(".note").some((n) => +n.dataset.dx || +n.dataset.dy); }
  function saveNotes() {
    const o = {};
    $$(".note").forEach((n, i) => (o[i] = [+n.dataset.dx, +n.dataset.dy]));
    store.set("mp5-notes", o);
    tidyBtn.hidden = !anyMoved();
  }
  function clampNote(n) {
    const book = $("#notebook").getBoundingClientRect();
    const r = n.getBoundingClientRect();
    let dx = +n.dataset.dx, dy = +n.dataset.dy;
    if (r.left < book.left + 6) dx += book.left + 6 - r.left;
    if (r.right > book.right - 6) dx -= r.right - (book.right - 6);
    if (r.top + window.scrollY < book.top + window.scrollY + 6) dy += book.top + 6 - r.top;
    n.dataset.dx = Math.round(dx);
    n.dataset.dy = Math.round(dy);
    place(n);
  }
  let zTop = 5;
  $$(".note").forEach((n) => {
    let sx, sy, ox, oy, dragging = false;
    n.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || document.body.classList.contains("is-drawing")) return;
      e.preventDefault(); // no accidental text selection while dragging
      dragging = true;
      sx = e.clientX; sy = e.clientY; ox = +n.dataset.dx; oy = +n.dataset.dy;
      n.setPointerCapture(e.pointerId);
      n.classList.add("is-lifted");
      n.style.zIndex = ++zTop;
    });
    n.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      n.dataset.dx = ox + e.clientX - sx;
      n.dataset.dy = oy + e.clientY - sy;
      place(n);
    });
    const end = () => {
      if (!dragging) return;
      dragging = false;
      n.classList.remove("is-lifted");
      clampNote(n);
      saveNotes();
    };
    n.addEventListener("pointerup", end);
    n.addEventListener("pointercancel", end);
    n.addEventListener("keydown", (e) => {
      const step = e.shiftKey ? 40 : 10;
      const m = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
      if (!m) return;
      e.preventDefault();
      n.dataset.dx = +n.dataset.dx + m[0];
      n.dataset.dy = +n.dataset.dy + m[1];
      n.style.zIndex = ++zTop;
      place(n);
      clampNote(n);
      saveNotes();
    });
  });
  tidyBtn.hidden = !anyMoved();
  tidyBtn.addEventListener("click", () => {
    $$(".note").forEach((n) => { n.dataset.dx = 0; n.dataset.dy = 0; n.classList.add("is-tidy"); place(n); setTimeout(() => n.classList.remove("is-tidy"), 600); });
    store.del("mp5-notes");
    tidyBtn.hidden = true;
    toast("notes tidied. very organised of you.");
  });
  window.addEventListener("resize", () => $$(".note").forEach(clampNote));

  // ---------- about ----------
  const highlights = [/Master&#39;s in Computer Science/, /double major/, /\d\+ years of experience/, /Labcorp/, /Continental Properties/];
  $("#aboutText").innerHTML = (P.about || [])
    .map((para) => {
      let h = esc(para);
      highlights.forEach((re) => (h = h.replace(re, (m) => `<mark class="hl">${m}</mark>`)));
      return `<p>${h}</p>`;
    })
    .join("");
  $$("#aboutText .hl").forEach(observeDraw);
  $("#eduList").innerHTML = (P.education || [])
    .map((e) => `<li><span class="edu__years type-label">${esc(e.years)}</span><strong>${esc(e.degree)}</strong><span>${esc(e.school)}</span></li>`)
    .join("");

  // ---------- particle filter ----------
  const pfCanvas = $("#pf");
  if (pfCanvas && window.PF) {
    const pf = window.PF.init(pfCanvas, { n: $("#pfN"), spread: $("#pfSpread"), err: $("#pfErr"), state: $("#pfState"), toast });
    $("#pfKidnap").addEventListener("click", pf.kidnap);
    $("#pfScatter").addEventListener("click", () => { pf.scatter(); toast("guesses scattered. lost again, on purpose."); });
    $("#pfRays").addEventListener("click", (e) => e.currentTarget.setAttribute("aria-pressed", pf.toggleRays()));
  }

  // ---------- projects ----------
  const projects = P.projects || [];
  projects.forEach((p) => (p.slug = slug(p.title)));
  const entriesEl = $("#entries");
  const decor = ["tape", "clip", "tape-2", "pin", "tape", "clip-r"];
  entriesEl.innerHTML = projects
    .map((p, i) => {
      const n = String(i + 1).padStart(2, "0");
      const rot = [-1.4, 1.1, -0.6, 1.6, -1.8, 0.8, -1, 1.3, -0.5, 1.7, -1.2, 0.6][i % 12];
      const host = /github\.com/.test(p.url) ? "code" : "site";
      return `<li class="ecard" data-area="${esc(p.area || "")}" style="--rot:${rot}deg">
        <article class="ecard__in" aria-labelledby="et-${p.slug}">
          <span class="ecard__decor ecard__decor--${decor[i % decor.length]}" aria-hidden="true"></span>
          <p class="ecard__meta type-label"><span>Entry ${n} · ${esc(p.area || "")}</span><span>${esc(p.year || "")}</span></p>
          <h3 class="ecard__title" id="et-${p.slug}"><button type="button" class="ecard__open" data-i="${i}" aria-haspopup="dialog">${esc(p.title)}</button></h3>
          <div class="ecard__sketch">${window.DOODLES.svg(p)}</div>
          <p class="ecard__tag">${esc(p.tag || "")}</p>
          <p class="ecard__blurb">${esc(p.blurb || "")}</p>
          <div class="ecard__foot">
            ${p.stat ? `<p class="ecard__stat"><span class="ecard__statv">${esc(p.stat.value)}</span> <span>${esc(p.stat.label)}</span></p>` : ""}
            <a class="ecard__ext" href="${esc(p.url)}" target="_blank" rel="noopener" aria-label="${esc(p.title)}: open the ${host} (opens in a new tab)">${host} ↗</a>
          </div>
        </article>
      </li>`;
    })
    .join("");
  $$(".ecard").forEach((c) => observeDraw(c));

  // filters
  const areas = ["All", ...new Set(projects.map((p) => p.area).filter(Boolean))];
  const filtersEl = $("#filters");
  filtersEl.innerHTML = areas
    .map((a, i) => `<button type="button" class="filter" aria-pressed="${i === 0}" data-area="${esc(a)}"><span>${esc(a)}</span><svg viewBox="0 0 120 50" preserveAspectRatio="none" aria-hidden="true"><path pathLength="1" d="M70 6 C 100 4, 118 16, 114 28 C 110 42, 70 47, 40 44 C 14 41, 2 32, 6 20 C 10 9, 40 4, 78 7"/></svg></button>`)
    .join("");
  filtersEl.addEventListener("click", (e) => {
    const b = e.target.closest(".filter");
    if (!b) return;
    $$(".filter", filtersEl).forEach((x) => x.setAttribute("aria-pressed", x === b));
    const a = b.dataset.area;
    $$(".ecard").forEach((c) => {
      const show = a === "All" || c.dataset.area === a;
      c.classList.toggle("is-hidden", !show);
      if (show) c.classList.add("is-drawn");
    });
  });

  // ---------- full page entry (dialog) ----------
  const dlg = $("#entry");
  let cur = -1;
  let lastFocus = null;
  function openEntry(i, fromHash) {
    cur = (i + projects.length) % projects.length;
    const p = projects[cur];
    $("#entryMeta").textContent = `Entry ${String(cur + 1).padStart(2, "0")} · ${p.year || ""} · ${p.area || ""}`;
    $("#entryTitle").textContent = p.title;
    $("#entryTag").textContent = p.tag || "";
    $("#entryBlurb").textContent = p.blurb || "";
    $("#entryBullets").innerHTML = (p.bullets || [])
      .map((b, k) => `<li style="--i:${k}"><svg viewBox="0 0 24 24" aria-hidden="true"><path class="box" d="M3 4 L20 3 L21 20 L4 21 Z"/><path class="tick" pathLength="1" d="M6 12 L10 17 L22 2"/></svg><span>${esc(b)}</span></li>`)
      .join("");
    $("#entryStat").innerHTML = p.stat ? `<span class="entry__statv">${esc(p.stat.value)}</span><span>${esc(p.stat.label)}</span>` : "";
    const link = $("#entryLink");
    link.href = p.url;
    link.textContent = /github\.com/.test(p.url) ? "read the code on GitHub ↗" : "visit the project page ↗";
    const dd = $("#entryDoodle");
    dd.innerHTML = window.DOODLES.svg(p, "doodle--big");
    dd.classList.remove("is-drawn");
    const shot = $("#entryShot");
    const img = $("#entryImg");
    img.onload = img.onerror = null;
    if (p.image) {
      shot.hidden = false;
      shot.classList.add("is-loading");
      shot.classList.remove("is-error");
      $("#entryCap").textContent = `${p.title}, ${p.year || ""}`;
      img.alt = `Screenshot of ${p.title}`;
      img.onload = () => shot.classList.remove("is-loading");
      img.onerror = () => { shot.classList.remove("is-loading"); shot.classList.add("is-error"); };
      img.src = p.image; // fetched only now, on demand
    } else {
      shot.hidden = true;
      img.removeAttribute("src");
    }
    $("#entryNoPhoto").hidden = !!p.image;
    $("#entryCount").textContent = `${cur + 1} / ${projects.length}`;
    if (!dlg.open) {
      lastFocus = fromHash ? null : document.activeElement;
      dlg.showModal();
      document.documentElement.classList.add("has-modal");
    }
    $(".entry__spread", dlg).scrollTop = 0;
    dlg.scrollTop = 0;
    dlg.classList.remove("is-flip");
    void dlg.offsetWidth;
    dlg.classList.add("is-flip");
    requestAnimationFrame(() => requestAnimationFrame(() => { dd.classList.add("is-drawn"); $("#entryBullets").classList.add("is-drawn"); }));
    try { history.replaceState(null, "", "#entry-" + p.slug); } catch (e) { /* file:// */ }
  }
  function closeEntry() { if (dlg.open) dlg.close(); }
  dlg.addEventListener("close", () => {
    document.documentElement.classList.remove("has-modal");
    $("#entryBullets").classList.remove("is-drawn");
    try { history.replaceState(null, "", "#work"); } catch (e) { /* ignore */ }
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    else { const b = $(`.ecard__open[data-i="${cur}"]`); if (b) b.focus({ preventScroll: false }); }
  });
  dlg.addEventListener("click", (e) => { if (e.target === dlg) closeEntry(); });
  dlg.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight" && !e.target.closest("a,button")) openEntry(cur + 1);
    if (e.key === "ArrowLeft" && !e.target.closest("a,button")) openEntry(cur - 1);
  });
  $("#entryClose").addEventListener("click", closeEntry);
  $("#entryPrev").addEventListener("click", () => openEntry(cur - 1));
  $("#entryNext").addEventListener("click", () => openEntry(cur + 1));
  entriesEl.addEventListener("click", (e) => {
    const b = e.target.closest(".ecard__open");
    if (b) { openEntry(+b.dataset.i); return; }
    // clicking anywhere on the card (but not its link) opens it too
    const card = e.target.closest(".ecard");
    if (card && !e.target.closest("a")) openEntry(+$(".ecard__open", card).dataset.i);
  });
  document.addEventListener("click", (e) => {
    const a = e.target.closest("[data-open-entry]");
    if (!a) return;
    const i = projects.findIndex((p) => p.slug === a.dataset.openEntry);
    if (i >= 0) { e.preventDefault(); openEntry(i); }
  });
  function fromHash() {
    const m = location.hash.match(/^#entry-(.+)$/);
    if (!m) return;
    const i = projects.findIndex((p) => p.slug === m[1]);
    if (i >= 0) {
      const w = $("#work");
      if (w) w.scrollIntoView();
      openEntry(i, true);
    }
  }
  window.addEventListener("hashchange", fromHash);
  fromHash();

  // ---------- logbook ----------
  const kindLabel = { edu: "study", work: "work", origin: "origin" };
  $("#logList").innerHTML = (P.timeline || [])
    .map((t, i) => `<li class="logi logi--${esc(t.kind)}" style="--rot:${i % 2 ? 0.6 : -0.5}deg">
        <p class="logi__year" aria-hidden="true">${esc(t.year)}</p>
        <span class="logi__dot" aria-hidden="true"></span>
        <div class="logi__body">
          <div class="logi__icon">${window.DOODLES.icons[t.kind] || window.DOODLES.icons.work}</div>
          <p class="logi__meta type-label"><span class="sr-only">${esc(t.year)}, </span>${esc(kindLabel[t.kind] || t.kind)} · ${esc(t.duration || "")}</p>
          <h3 class="logi__title">${esc(t.title)} <span class="logi__org">@ ${esc(t.org)}</span></h3>
          <p class="logi__details">${esc(t.details || "")}</p>
        </div>
      </li>`)
    .join("");
  $$(".logi").forEach(observeDraw);
  $("#courses").innerHTML = (P.courses || [])
    .map((c) => `<li><a class="ticket" href="${esc(c.url)}" target="_blank" rel="noopener"><span class="ticket__code type-label">${esc(c.code)}</span><span class="ticket__name">${esc(c.name)}</span><span class="ticket__go" aria-hidden="true">↗</span></a></li>`)
    .join("");

  // the logbook's vertical line, wobbly, drawn as you scroll
  const logWrap = $(".log");
  const logSvg = $(".log__line");
  const logPath = $(".log__path");
  function buildLogLine() {
    const h = $("#logList").offsetHeight;
    logSvg.setAttribute("viewBox", `0 0 20 ${h}`);
    logSvg.style.height = h + "px";
    let d = "M10 0";
    for (let y = 40; y < h; y += 40) d += ` Q ${10 + (y % 80 ? 4 : -4)} ${y - 20}, 10 ${y}`;
    d += ` L10 ${h}`;
    logPath.setAttribute("d", d);
    logPath.setAttribute("pathLength", "1");
  }
  function updateLogLine() {
    const r = logWrap.getBoundingClientRect();
    const vh = window.innerHeight;
    const prog = reduce ? 1 : Math.max(0, Math.min(1, (vh * 0.75 - r.top) / r.height));
    logPath.style.strokeDashoffset = String(1 - prog);
  }

  // ---------- toolbox & stickers ----------
  $("#stack").innerHTML = (P.stack || [])
    .map((g) => `<div class="tb"><h3 class="tb__h">${esc(g.group)}</h3><ul class="checklist">${g.items
      .map((it, k) => `<li style="--i:${k}"><svg viewBox="0 0 24 24" aria-hidden="true"><path class="box" d="M3 4 L20 3 L21 20 L4 21 Z"/><path class="tick" pathLength="1" d="M6 12 L10 17 L22 2"/></svg><span>${esc(it)}</span></li>`)
      .join("")}</ul></div>`)
    .join("");
  $$("#stack .checklist").forEach(observeDraw);
  const stickerColors = ["#ffe066", "#ffb3c7", "#a8e6cf", "#a9d6ff", "#ffcc99", "#d7c4ff", "#c8f08f"];
  const shapes = ["round", "pill", "star", "pill", "round", "pill", "tag"];
  $("#stickers").innerHTML = `<ul>${(P.skills || [])
    .map((s, i) => `<li><button type="button" class="sticker sticker--${shapes[i % shapes.length]}" aria-pressed="false" style="--bg:${stickerColors[i % stickerColors.length]};--rot:${((i * 37) % 13) - 6}deg">${esc(s)}</button></li>`)
    .join("")}</ul>`;
  let peeled = 0;
  $("#stickers").addEventListener("click", (e) => {
    const b = e.target.closest(".sticker");
    if (!b) return;
    const on = b.getAttribute("aria-pressed") !== "true";
    b.setAttribute("aria-pressed", on);
    peeled += on ? 1 : -1;
    if (on && peeled === (P.skills || []).length) toast("you peeled every sticker. the sheet is bare. respect.");
  });

  // ---------- contact ----------
  const linkIcons = {
    github: '<path d="M8 20 L3 14 L8 8 M24 8 L29 14 L24 20 M19 5 L13 23"/>',
    linkedin: '<path d="M5 4 H27 V26 H5 Z M10 12 V21 M10 8 V8.5 M15 21 V12 M15 15 C 17 11, 22 11, 22 15 V21"/>',
    email: '<path d="M3 7 H29 V25 H3 Z M3 7 L16 17 L29 7"/>',
  };
  $("#links").innerHTML = (P.links || [])
    .map((l) => {
      const k = l.label.toLowerCase();
      const ext = !/^mailto:/.test(l.url);
      const shown = l.url.replace(/^mailto:/, "").replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
      return `<li><a class="clink" href="${esc(l.url)}" ${ext ? 'target="_blank" rel="noopener"' : ""}>
        <svg class="clink__icon" viewBox="0 0 32 30" aria-hidden="true">${linkIcons[k] || linkIcons.email}</svg>
        <span class="clink__label">${esc(l.label)}${ext ? ' <span aria-hidden="true">↗</span>' : ""}</span>
        <span class="clink__url type-label">${esc(shown)}</span>
        <svg class="clink__u" viewBox="0 0 200 12" preserveAspectRatio="none" aria-hidden="true"><path pathLength="1" d="M2 8 C 50 3, 100 11, 150 6 S 190 7, 198 5"/></svg>
      </a></li>`;
    })
    .join("");
  const planeBtn = $("#planeBtn");
  planeBtn.href = "mailto:" + P.email;
  planeBtn.setAttribute("aria-label", `Email ${P.name} at ${P.email}`);
  planeBtn.addEventListener("click", (e) => {
    const torn = $("#torn");
    if (reduce || !torn.animate) return; // plain mailto
    e.preventDefault();
    if (torn.dataset.busy) return;
    torn.dataset.busy = "1";
    const r = torn.getBoundingClientRect();
    // 1. the page crumples into a fold
    const crumple = torn.animate(
      [
        { transform: "rotate(-1.6deg)", opacity: 1 },
        { transform: "rotate(-4deg) scale(0.92, 0.55)", opacity: 1, offset: 0.45 },
        { transform: "rotate(-14deg) scale(0.2, 0.16)", opacity: 0 },
      ],
      { duration: 520, easing: "cubic-bezier(.5,0,.6,1)", fill: "forwards" }
    );
    // 2. a paper airplane takes off from where it was
    const fly = document.createElement("div");
    fly.className = "flyer";
    fly.setAttribute("aria-hidden", "true");
    fly.innerHTML = '<svg viewBox="0 0 64 48"><path d="M2 22 L62 2 L40 46 L28 30 Z"/><path d="M62 2 L28 30 L26 44 L34 36"/></svg>';
    const x0 = r.left + r.width / 2 - 45, y0 = r.top + r.height / 2 - 33;
    fly.style.left = x0 + "px";
    fly.style.top = y0 + "px";
    document.body.appendChild(fly);
    const dx = window.innerWidth - x0 + 120, dy = -y0 - 160;
    fly.animate(
      [
        { transform: "translate(0,0) rotate(0deg) scale(.4)", opacity: 0 },
        { transform: "translate(0,0) rotate(-6deg) scale(1)", opacity: 1, offset: 0.18 },
        { transform: `translate(${dx * 0.25}px, ${40}px) rotate(8deg) scale(1)`, offset: 0.42 },
        { transform: `translate(${dx * 0.55}px, ${dy * 0.35}px) rotate(-22deg) scale(.85)`, offset: 0.7 },
        { transform: `translate(${dx}px, ${dy}px) rotate(-30deg) scale(.5)`, opacity: 1 },
      ],
      { duration: 1500, delay: 380, easing: "cubic-bezier(.4,0,.6,1)", fill: "both" }
    ).finished.then(() => {
      fly.remove();
      window.location.href = planeBtn.href;
      crumple.cancel();
      torn.classList.add("is-back");
      toast("note sent to your mail app. (here's a fresh page.)", 3600);
      setTimeout(() => { torn.classList.remove("is-back"); delete torn.dataset.busy; }, 900);
    });
  });

  // ---------- nav tabs (scrollspy) ----------
  const tabs = $$(".tabs a");
  const ids = tabs.map((a) => a.dataset.tab);
  const spy = new IntersectionObserver((es) => {
    es.forEach((e) => {
      if (!e.isIntersecting) return;
      tabs.forEach((a) => {
        const on = a.dataset.tab === e.target.id;
        a.classList.toggle("is-active", on);
        if (on) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
      });
    });
  }, { rootMargin: "-40% 0px -55% 0px" });
  ids.forEach((id) => { const s = document.getElementById(id); if (s) spy.observe(s); });

  // ---------- progress pencil + scroll-linked bits ----------
  const prog = $(".progress");
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      const p = h > 0 ? window.scrollY / h : 0;
      prog.style.setProperty("--p", p.toFixed(4));
      updateLogLine();
      ticking = false;
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", () => { buildLogLine(); onScroll(); });
  buildLogLine();
  onScroll();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { buildLogLine(); onScroll(); });
  if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener("loadingdone", () => { buildLogLine(); onScroll(); });

  // expose a few helpers for extras.js
  window.SKETCH = { toast, store, reduce, $, $$, esc };

  // a note for anyone who opens the console
  console.log("%c✎ hi! you found the margins of the margins.\n  type 'robot' anywhere on the page, or try ↑↑↓↓←→←→BA.", "font: 16px Caveat, cursive; color: #c8402f");
})();
