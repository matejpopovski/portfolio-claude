/* ==========================================================================
   Matej Popovski — portfolio interactions
   No frameworks, no build step. Content comes from data.js.
   ========================================================================== */
(() => {
  "use strict";

  const D = window.PORTFOLIO;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const isMobile = () => matchMedia("(max-width: 760px)").matches;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const DPR = Math.min(window.devicePixelRatio || 1, 2);

  const mouse = { x: innerWidth / 2, y: innerHeight / 2, down: false };

  /* ------------------------------------------------------------------ */
  /* Content                                                            */
  /* ------------------------------------------------------------------ */
  function renderContent() {
    if (!finePointer) $(".hero__hint").innerHTML = "<span>drag through the name</span><span class=\"dot\">·</span><span>tap to scatter</span>";
    $("#role").textContent = D.role;
    $("#year").textContent = new Date().getFullYear();

    $("#aboutText").innerHTML = D.about.map((p) => `<p>${esc(p)}</p>`).join("");
    $("#facts").innerHTML = D.facts.map((f) => `<div><dt>${esc(f.k)}</dt><dd>${esc(f.v)}</dd></div>`).join("");

    const big = "I like code that leaves the screen and does something: robots that map a room, cards that fly across a table, models that learn a third faster.";
    const hl = new Set(["robots", "cards", "models"]);
    $("#aboutBig").innerHTML = big
      .split(" ")
      .map((w) => `<span class="w${hl.has(w.replace(/\W/g, "")) ? " hl" : ""}">${esc(w)}</span>`)
      .join(" ");

    const suits = ["♠", "♥", "♦", "♣"];
    const items = D.skills.map((s, i) => `<span class="marquee__item">${esc(s)}<i>${suits[i % 4]}</i></span>`).join("");
    const half = Math.ceil(D.skills.length / 2);
    const items2 = [...D.skills.slice(half), ...D.skills.slice(0, half)]
      .map((s, i) => `<span class="marquee__item">${esc(s)}<i>${suits[(i + 2) % 4]}</i></span>`).join("");
    $("#mq1").innerHTML = items + items;
    $("#mq2").innerHTML = items2 + items2;

    $("#links").innerHTML = D.links
      .map((l) => `<li><a href="${esc(l.url)}" target="_blank" rel="noopener" data-cursor="open"><span>${esc(l.label)}</span><span>↗</span></a></li>`)
      .join("");
  }

  /* ------------------------------------------------------------------ */
  /* Loader                                                             */
  /* ------------------------------------------------------------------ */
  function runLoader(done) {
    const el = $("#loaderCount");
    const start = performance.now();
    const dur = reduced ? 200 : 1300;
    const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
    let fontsOk = false;
    fontsReady.then(() => (fontsOk = true));
    setTimeout(() => (fontsOk = true), 2500);
    (function tick(now) {
      const t = clamp((now - start) / dur, 0, 1);
      const e = 1 - Math.pow(1 - t, 3);
      el.textContent = String(Math.round(e * 100)).padStart(2, "0");
      if (t < 1 || !fontsOk) return requestAnimationFrame(tick);
      $(".loader").classList.add("is-done");
      document.body.classList.remove("is-loading");
      done();
    })(start);
  }

  /* ------------------------------------------------------------------ */
  /* Cursor, glow, hover labels                                         */
  /* ------------------------------------------------------------------ */
  function initCursor() {
    const cur = $(".cursor"), dot = $(".cursor__dot"), ring = $(".cursor__ring"), label = $(".cursor__label");
    const glow = $(".glow");
    let rx = mouse.x, ry = mouse.y, gx = mouse.x, gy = mouse.y;
    if (finePointer) document.body.classList.add("has-cursor");

    addEventListener("pointermove", (e) => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
    addEventListener("pointerdown", () => { mouse.down = true; cur.classList.add("is-down"); });
    addEventListener("pointerup", () => { mouse.down = false; cur.classList.remove("is-down"); });

    document.addEventListener("pointerover", (e) => {
      const t = e.target.closest("[data-cursor]");
      if (t) { label.textContent = t.dataset.cursor; cur.classList.add("is-hover"); }
      else if (e.target.closest("a, button")) { label.textContent = ""; cur.classList.add("is-hover"); }
      else cur.classList.remove("is-hover");
    });

    (function loop() {
      rx = lerp(rx, mouse.x, 0.18); ry = lerp(ry, mouse.y, 0.18);
      gx = lerp(gx, mouse.x, 0.05); gy = lerp(gy, mouse.y, 0.05);
      dot.style.transform = `translate(${mouse.x}px, ${mouse.y}px)`;
      ring.style.transform = `translate(${rx}px, ${ry}px)`;
      glow.style.transform = `translate(${gx}px, ${gy}px)`;
      requestAnimationFrame(loop);
    })();
  }

  /* ------------------------------------------------------------------ */
  /* Hero: the name as a field of particles                             */
  /* ------------------------------------------------------------------ */
  function initHero() {
    const hero = $("#hero");
    const cv = $("#heroCanvas");
    const ctx = cv.getContext("2d");
    let W = 0, H = 0, parts = [], visible = true, t = 0;
    const pointer = { x: -9999, y: -9999, active: false };

    function build() {
      W = hero.clientWidth; H = hero.clientHeight;
      cv.width = W * DPR; cv.height = H * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

      const off = document.createElement("canvas");
      off.width = W; off.height = H;
      const o = off.getContext("2d");
      const lines = [D.first, D.last];
      const family = '"Instrument Serif", serif';
      o.font = `400 100px ${family}`;
      const widest = Math.max(...lines.map((l) => o.measureText(l).width));
      let size = Math.min((W * (W < 600 ? 0.9 : 0.86)) / widest * 100, H * 0.3);
      o.font = `400 ${size}px ${family}`;
      o.fillStyle = "#fff";
      o.textAlign = "center";
      o.textBaseline = "middle";
      const lh = size * 0.88;
      const cy = H * 0.44;
      o.fillText(lines[0], W / 2, cy - lh / 2);
      o.font = `italic 400 ${size}px ${family}`;
      o.fillText(lines[1], W / 2, cy + lh / 2);

      const data = o.getImageData(0, 0, W, H).data;
      let gap = Math.max(W < 600 ? 2 : 3, Math.round(size / 40));
      const count = (g) => { let n = 0; for (let y = 0; y < H; y += g) for (let x = 0; x < W; x += g) if (data[(y * W + x) * 4 + 3] > 128) n++; return n; };
      while (count(gap) > 5200) gap++;

      const old = parts;
      parts = [];
      for (let y = 0; y < H; y += gap) {
        for (let x = 0; x < W; x += gap) {
          if (data[(y * W + x) * 4 + 3] > 128) {
            const prev = old[parts.length];
            parts.push({
              hx: x, hy: y,
              x: prev ? prev.x : rand(0, W), y: prev ? prev.y : rand(0, H),
              vx: 0, vy: 0,
              s: rand(Math.max(1.1, gap * 0.45), gap * 0.8),
              ph: rand(0, Math.PI * 2),
              hot: 0,
            });
          }
        }
      }
    }

    function explode(px, py, power = 26) {
      for (const p of parts) {
        const dx = p.x - px, dy = p.y - py;
        const d = Math.hypot(dx, dy) || 1;
        const f = power * Math.max(0, 1 - d / 520);
        p.vx += (dx / d) * f * rand(0.6, 1.4);
        p.vy += (dy / d) * f * rand(0.6, 1.4);
      }
    }

    hero.addEventListener("pointermove", (e) => {
      const r = cv.getBoundingClientRect();
      pointer.x = e.clientX - r.left; pointer.y = e.clientY - r.top; pointer.active = true;
    });
    hero.addEventListener("pointerleave", () => { pointer.active = false; pointer.x = pointer.y = -9999; });
    hero.addEventListener("click", (e) => {
      if (e.target.closest("a")) return;
      const r = cv.getBoundingClientRect();
      explode(e.clientX - r.left, e.clientY - r.top);
      FX.burst(e.clientX, e.clientY, 14);
    });

    new IntersectionObserver(([en]) => (visible = en.isIntersecting)).observe(hero);

    let resizeT;
    addEventListener("resize", () => { clearTimeout(resizeT); resizeT = setTimeout(build, 150); });

    function frame() {
      requestAnimationFrame(frame);
      if (!visible) return;
      t += 0.016;
      ctx.clearRect(0, 0, W, H);
      const R = Math.max(90, Math.min(W, H) * 0.14);
      const R2 = R * R;
      const cold = [], hot = [];
      for (const p of parts) {
        const tx = p.hx + Math.sin(t * 1.3 + p.ph) * 0.8;
        const ty = p.hy + Math.cos(t * 1.1 + p.ph) * 0.8;
        p.vx += (tx - p.x) * 0.045;
        p.vy += (ty - p.y) * 0.045;
        if (pointer.active) {
          const dx = p.x - pointer.x, dy = p.y - pointer.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < R2) {
            const d = Math.sqrt(d2) || 1;
            const f = (1 - d / R) * 6;
            p.vx += (dx / d) * f; p.vy += (dy / d) * f;
          }
        }
        p.vx *= 0.84; p.vy *= 0.84;
        p.x += p.vx; p.y += p.vy;
        const sp = Math.abs(p.vx) + Math.abs(p.vy);
        p.hot = Math.max(p.hot * 0.94, clamp(sp / 6, 0, 1));
        (p.hot > 0.25 ? hot : cold).push(p);
      }
      ctx.fillStyle = "#f2ede2";
      for (const p of cold) ctx.fillRect(p.x, p.y, p.s, p.s);
      ctx.fillStyle = "#ff4d2e";
      for (const p of hot) ctx.fillRect(p.x, p.y, p.s * 1.15, p.s * 1.15);
    }

    build();
    frame();
    return { build };
  }

  /* ------------------------------------------------------------------ */
  /* Hero typewriter + clock                                            */
  /* ------------------------------------------------------------------ */
  function initTypewriter() {
    const el = $("#verb");
    let i = 0;
    const type = async () => {
      const word = D.verbs[i % D.verbs.length];
      for (let c = 1; c <= word.length; c++) { el.textContent = word.slice(0, c); await wait(reduced ? 0 : 38 + Math.random() * 40); }
      await wait(2000);
      for (let c = word.length; c >= 0; c--) { el.textContent = word.slice(0, c); await wait(reduced ? 0 : 18); }
      await wait(250);
      i++;
      type();
    };
    type();
  }
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  function initClock() {
    const el = $("#clock");
    const fmt = new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
    const tick = () => (el.textContent = fmt.format(new Date()));
    tick(); setInterval(tick, 1000);
  }

  /* ------------------------------------------------------------------ */
  /* Marquee reacting to scroll velocity                                */
  /* ------------------------------------------------------------------ */
  function initMarquee() {
    const rows = $$(".marquee__row").map((r) => ({ el: r.firstElementChild, dir: +r.dataset.dir, x: 0 }));
    let lastY = scrollY, vel = 0;
    (function loop() {
      const dy = scrollY - lastY; lastY = scrollY;
      vel = lerp(vel, dy, 0.1);
      for (const r of rows) {
        const half = r.el.scrollWidth / 2;
        const boost = 1 + Math.min(Math.abs(vel) * 0.25, 8);
        const sign = vel < -0.5 ? -1 : 1;
        r.x -= (reduced ? 0 : 0.5) * r.dir * boost * sign;
        if (r.x <= -half) r.x += half;
        if (r.x > 0) r.x -= half;
        r.el.style.transform = `translate3d(${r.x}px,0,0) skewX(${clamp(-vel * 0.3, -8, 8)}deg)`;
      }
      requestAnimationFrame(loop);
    })();
  }

  /* ------------------------------------------------------------------ */
  /* Reveals, split headings, scroll-scrubbed about text                */
  /* ------------------------------------------------------------------ */
  function initReveals() {
    $$("[data-split]").forEach((el) => {
      let i = 0;
      const walk = (node) => {
        [...node.childNodes].forEach((n) => {
          if (n.nodeType === 3) {
            const frag = document.createDocumentFragment();
            n.textContent.split(/(\s+)/).forEach((w) => {
              if (!w) return;
              if (/^\s+$/.test(w)) return frag.append(" ");
              const outer = document.createElement("span");
              outer.className = "split-word";
              const inner = document.createElement("span");
              inner.style.setProperty("--i", i++);
              inner.textContent = w;
              outer.append(inner);
              frag.append(outer);
            });
            n.replaceWith(frag);
          } else walk(n);
        });
      };
      walk(el);
    });

    const io = new IntersectionObserver((ens) => {
      ens.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } });
    }, { threshold: 0.15 });
    $$("[data-reveal], [data-split]").forEach((el) => io.observe(el));

    const big = $("#aboutBig");
    const words = $$(".w", big);
    const onScroll = () => {
      const r = big.getBoundingClientRect();
      const p = clamp((innerHeight * 0.85 - r.top) / (r.height + innerHeight * 0.35), 0, 1);
      const n = Math.round(p * words.length);
      words.forEach((w, i) => w.classList.toggle("on", i < n));
    };
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ------------------------------------------------------------------ */
  /* Work: a hand of playing cards                                      */
  /* ------------------------------------------------------------------ */
  const Cards = (() => {
    const hand = $("#hand");
    let order = D.projects.map((_, i) => i);
    let els = [];
    let hover = -1;
    let dealt = false;
    let busy = false;

    const isRed = (s) => s === "♥" || s === "♦";

    function cardHTML(p) {
      return `
        <div class="card__inner">
          <div class="card__face card__front">
            <div class="card__corner">${esc(p.rank)}<small>${p.suit}</small></div>
            <div class="card__pip">${p.suit}</div>
            <div class="card__title">${esc(p.title)}</div>
            <div class="card__tag">${esc(p.tag)}</div>
            <div class="card__corner card__corner--br">${esc(p.rank)}<small>${p.suit}</small></div>
            <div class="card__shine"></div>
          </div>
          <div class="card__face card__back"></div>
        </div>`;
    }

    function build() {
      hand.innerHTML = "";
      els = D.projects.map((p, i) => {
        const el = document.createElement("button");
        el.className = `card${isRed(p.suit) ? " is-red" : ""}${isMobile() ? "" : " is-down"}`;
        el.dataset.cursor = "flip";
        el.dataset.idx = i;
        el.setAttribute("aria-label", `${p.title}: open details`);
        el.innerHTML = cardHTML(p);
        hand.append(el);

        el.addEventListener("pointerenter", () => { hover = order.indexOf(i); layout(); });
        el.addEventListener("pointerleave", () => {
          hover = -1; layout();
          el.classList.remove("is-tilting");
          el.style.setProperty("--tx", "0deg"); el.style.setProperty("--ty", "0deg");
        });
        el.addEventListener("pointermove", (e) => {
          if (!finePointer || busy) return;
          const r = el.getBoundingClientRect();
          const mx = (e.clientX - r.left) / r.width, my = (e.clientY - r.top) / r.height;
          el.classList.add("is-tilting");
          el.style.setProperty("--mx", mx * 100 + "%");
          el.style.setProperty("--my", my * 100 + "%");
          el.style.setProperty("--tx", (0.5 - my) * 18 + "deg");
          el.style.setProperty("--ty", (mx - 0.5) * 18 + "deg");
        });
        el.addEventListener("click", (e) => {
          if (busy) return;
          FX.burst(e.clientX, e.clientY, 8);
          Spotlight.open(i, el);
        });
        return el;
      });
      if (isMobile()) dealt = true;
      layout();
    }

    function stacked() {
      els.forEach((el, i) => {
        el.style.transform = `translate(${i * 0.6}px, ${-i * 0.6}px) rotate(${rand(-3, 3)}deg)`;
        el.style.zIndex = i;
      });
    }

    function layout() {
      if (isMobile()) {
        order.forEach((idx, pos) => (els[idx].style.order = pos));
        return;
      }
      if (!dealt) return stacked();
      const n = order.length;
      const w = els[0].offsetWidth;
      const avail = hand.clientWidth;
      const spacing = Math.min(w * 0.6, (avail - w - 80) / (n - 1));
      const spread = Math.min(30, 6 * n);
      order.forEach((idx, pos) => {
        const el = els[idx];
        const c = pos - (n - 1) / 2;
        let x = c * spacing;
        let a = (c / ((n - 1) / 2)) * (spread / 2);
        let y = Math.abs(c) ** 2 * 5;
        let s = 1;
        if (hover >= 0) {
          const d = pos - hover;
          if (d === 0) { y -= 60; a *= 0.3; s = 1.08; }
          else { x += Math.sign(d) * (36 / Math.abs(d)); }
        }
        el.style.transform = `translate(${x}px, ${y}px) rotate(${a}deg) scale(${s})`;
        el.style.zIndex = pos === hover ? 50 : pos;
      });
    }

    async function deal() {
      if (dealt || isMobile()) return;
      busy = true;
      dealt = true;
      layout();
      await wait(650);
      for (const idx of order) { els[idx].classList.remove("is-down"); await wait(110); }
      busy = false;
    }

    async function shuffle() {
      if (busy) return;
      busy = true;
      if (isMobile()) {
        order.sort(() => Math.random() - 0.5);
        hand.animate([{ opacity: 1 }, { opacity: 0.2 }, { opacity: 1 }], { duration: 500 });
        await wait(250); layout(); busy = false; return;
      }
      hover = -1;
      els.forEach((el) => el.classList.add("is-down"));
      await wait(500);
      dealt = false; stacked();
      await wait(600);
      // riffle
      for (let k = 0; k < 3; k++) {
        els.forEach((el, i) => {
          const side = i % 2 ? 1 : -1;
          el.style.transform = `translate(${side * rand(60, 110)}px, ${rand(-10, 10)}px) rotate(${side * rand(4, 12)}deg)`;
        });
        await wait(260);
        stacked();
        await wait(260);
      }
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }
      busy = false;
      await deal();
    }

    function init() {
      build();
      new IntersectionObserver(([en], obs) => {
        if (en.isIntersecting) { deal(); obs.disconnect(); }
      }, { threshold: 0.35 }).observe(hand);
      $("#shuffle").addEventListener("click", shuffle);
      let lastMobile = isMobile();
      addEventListener("resize", () => {
        if (isMobile() !== lastMobile) { lastMobile = isMobile(); build(); if (!lastMobile) { dealt = false; deal(); } }
        else layout();
      });
    }

    return { init, shuffle, els: () => els };
  })();

  const Spotlight = (() => {
    const wrap = $("#spotlight"), holder = $("#spotCard");
    let src = null;
    function open(i, el) {
      const p = D.projects[i];
      const red = p.suit === "♥" || p.suit === "♦";
      holder.innerHTML = `
        <div class="spot">
          <div class="spot__side spot__front${red ? " is-red" : ""}">
            <div class="spot__top"><span class="spot__suit">${esc(p.rank)}${p.suit}</span><span class="spot__tag">${esc(p.tag)}</span></div>
            <h3 class="spot__title">${esc(p.title)}</h3>
            <p class="spot__blurb">${esc(p.blurb)}</p>
            <ul class="spot__list">${p.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>
            <a class="spot__link" href="${esc(p.url)}" target="_blank" rel="noopener" data-cursor="code"><span>View on GitHub</span><span>↗</span></a>
          </div>
          <div class="spot__side spot__back card__face card__back"></div>
        </div>`;
      src = el;
      if (src) src.classList.add("is-out");
      wrap.setAttribute("aria-hidden", "false");
      requestAnimationFrame(() => requestAnimationFrame(() => wrap.classList.add("is-open")));
    }
    function close() {
      if (!wrap.classList.contains("is-open")) return;
      wrap.classList.remove("is-open");
      wrap.setAttribute("aria-hidden", "true");
      if (src) src.classList.remove("is-out");
      src = null;
    }
    wrap.addEventListener("click", (e) => { if (!e.target.closest(".spot__link")) close(); });
    addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
    return { open, close };
  })();

  /* ------------------------------------------------------------------ */
  /* Lab 01: a robot that maps a room (lidar + occupancy grid + A*)     */
  /* ------------------------------------------------------------------ */
  function initRobot() {
    const wrapEl = $(".robot-wrap");
    const cv = $("#robotCanvas");
    const ctx = cv.getContext("2d");
    const mappedEl = $("#mapped"), modeEl = $("#robotMode");
    const UNKNOWN = 0, FREE = 1, WALL = 2;
    let W, H, cs, cols, rows, ox, oy;
    let world, known, bot, path, goal, target, mode, trail, rays, visible = false, sweep = 0, doneAt = 0, denom = 1, lastPlan = 0;

    const idx = (x, y) => y * cols + x;
    const inb = (x, y) => x >= 0 && y >= 0 && x < cols && y < rows;

    function size() {
      W = wrapEl.clientWidth; H = wrapEl.clientHeight;
      cv.width = W * DPR; cv.height = H * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }

    function generate() {
      size();
      cs = clamp(Math.round(Math.min(W, H) / 22), 12, 20);
      cols = Math.floor(W / cs); rows = Math.floor(H / cs);
      ox = (W - cols * cs) / 2; oy = (H - rows * cs) / 2;
      world = new Uint8Array(cols * rows);
      known = new Uint8Array(cols * rows);
      for (let x = 0; x < cols; x++) { world[idx(x, 0)] = 1; world[idx(x, rows - 1)] = 1; }
      for (let y = 0; y < rows; y++) { world[idx(0, y)] = 1; world[idx(cols - 1, y)] = 1; }
      // interior walls with doorways
      const vx = Math.floor(cols * rand(0.35, 0.6));
      const hy = Math.floor(rows * rand(0.4, 0.6));
      for (let y = 1; y < rows - 1; y++) world[idx(vx, y)] = 1;
      for (let x = 1; x < vx; x++) world[idx(x, hy)] = 1;
      const hy2 = Math.floor(rows * rand(0.3, 0.7));
      for (let x = vx + 1; x < cols - 1; x++) world[idx(x, hy2)] = 1;
      const door = (cells) => { const s = Math.floor(rand(1, cells.length - 4)); for (let k = 0; k < 3; k++) { const [x, y] = cells[s + k]; world[idx(x, y)] = 0; } };
      door([...Array(hy - 1)].map((_, k) => [vx, k + 1]));
      door([...Array(rows - hy - 2)].map((_, k) => [vx, hy + 1 + k]));
      door([...Array(vx - 1)].map((_, k) => [k + 1, hy]));
      door([...Array(cols - vx - 2)].map((_, k) => [vx + 1 + k, hy2]));
      // furniture
      const nBlocks = Math.floor((cols * rows) / 70);
      for (let b = 0; b < nBlocks; b++) {
        const w = Math.floor(rand(1, 4)), h = Math.floor(rand(1, 3));
        const x = Math.floor(rand(2, cols - w - 2)), y = Math.floor(rand(2, rows - h - 2));
        for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) world[idx(x + i, y + j)] = 1;
      }
      // start
      let sx = Math.max(2, Math.floor(vx / 2)), sy = Math.max(2, Math.floor(hy / 2));
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) world[idx(sx + i, sy + j)] = 0;
      bot = { x: sx + 0.5, y: sy + 0.5, a: -Math.PI / 2 };
      // reachable area for the "% mapped" denominator
      const seen = new Uint8Array(cols * rows);
      const q = [[sx, sy]]; seen[idx(sx, sy)] = 1; denom = 0;
      while (q.length) {
        const [x, y] = q.pop(); denom++;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy;
          if (!inb(nx, ny) || seen[idx(nx, ny)]) continue;
          seen[idx(nx, ny)] = 1;
          if (world[idx(nx, ny)]) denom++; else q.push([nx, ny]);
        }
      }
      path = []; goal = null; target = null; mode = "explore"; trail = []; rays = []; doneAt = 0;
      scan();
    }

    function scan() {
      rays = [];
      const N = 90, range = 7.5;
      sweep += 0.07;
      for (let k = 0; k < N; k++) {
        const ang = (k / N) * Math.PI * 2 + sweep;
        const dx = Math.cos(ang), dy = Math.sin(ang);
        let hx = bot.x + dx * range, hy = bot.y + dy * range, hit = false;
        for (let d = 0; d < range; d += 0.2) {
          const px = bot.x + dx * d, py = bot.y + dy * d;
          const cx = Math.floor(px), cy = Math.floor(py);
          if (!inb(cx, cy)) break;
          if (world[idx(cx, cy)]) { known[idx(cx, cy)] = WALL; hx = px; hy = py; hit = true; break; }
          if (known[idx(cx, cy)] === UNKNOWN) known[idx(cx, cy)] = FREE;
        }
        rays.push([hx, hy, hit]);
      }
    }

    function astar(sx, sy, gx, gy) {
      const n = cols * rows;
      const g = new Float32Array(n).fill(Infinity);
      const from = new Int32Array(n).fill(-1);
      const closed = new Uint8Array(n);
      const open = [[0, idx(sx, sy)]];
      g[idx(sx, sy)] = 0;
      const h = (i) => { const x = i % cols, y = (i / cols) | 0; const dx = Math.abs(x - gx), dy = Math.abs(y - gy); return Math.max(dx, dy) + 0.414 * Math.min(dx, dy); };
      const goalI = idx(gx, gy);
      const dirs = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
      while (open.length) {
        let bi = 0;
        for (let k = 1; k < open.length; k++) if (open[k][0] < open[bi][0]) bi = k;
        const [, cur] = open.splice(bi, 1)[0];
        if (cur === goalI) break;
        if (closed[cur]) continue;
        closed[cur] = 1;
        const x = cur % cols, y = (cur / cols) | 0;
        for (const [dx, dy, c] of dirs) {
          const nx = x + dx, ny = y + dy;
          if (!inb(nx, ny)) continue;
          const ni = idx(nx, ny);
          if (known[ni] === WALL) continue;
          if (dx && dy && (known[idx(x + dx, y)] === WALL || known[idx(x, y + dy)] === WALL)) continue;
          // stay a little away from known walls
          let pen = 0;
          for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (inb(nx + ax, ny + ay) && known[idx(nx + ax, ny + ay)] === WALL) pen += 0.6;
          const ng = g[cur] + c + pen + (known[ni] === UNKNOWN ? 0.2 : 0);
          if (ng < g[ni]) { g[ni] = ng; from[ni] = cur; open.push([ng + h(ni), ni]); }
        }
      }
      if (from[goalI] < 0 && goalI !== idx(sx, sy)) return null;
      const out = [];
      for (let c = goalI; c !== -1 && c !== idx(sx, sy); c = from[c]) out.push([c % cols + 0.5, ((c / cols) | 0) + 0.5]);
      return out.reverse();
    }

    function isFrontier(x, y) {
      if (known[idx(x, y)] !== FREE) return false;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (inb(x + dx, y + dy) && known[idx(x + dx, y + dy)] === UNKNOWN) return true;
      return false;
    }

    function pickFrontier() {
      const sx = Math.floor(bot.x), sy = Math.floor(bot.y);
      const seen = new Uint8Array(cols * rows);
      const q = [[sx, sy, 0]]; seen[idx(sx, sy)] = 1;
      let best = null;
      for (let h = 0; h < q.length; h++) {
        const [x, y, d] = q[h];
        if (d > 2 && isFrontier(x, y)) { best = [x, y]; break; }
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy;
          if (!inb(nx, ny) || seen[idx(nx, ny)] || known[idx(nx, ny)] !== FREE) continue;
          seen[idx(nx, ny)] = 1; q.push([nx, ny, d + 1]);
        }
      }
      return best;
    }

    function plan() {
      lastPlan = performance.now();
      const sx = Math.floor(bot.x), sy = Math.floor(bot.y);
      if (mode === "goal" && goal) {
        target = goal;
      } else if (!target || !isFrontier(target[0], target[1])) {
        target = pickFrontier();
      }
      if (!target) { path = []; if (mode !== "done") { mode = "done"; doneAt = performance.now(); } return; }
      const p = astar(sx, sy, target[0], target[1]);
      if (!p) {
        if (mode === "goal") { mode = "explore"; goal = null; }
        target = null; path = [];
        return;
      }
      path = p;
    }

    function pathBlocked() {
      return path.some(([x, y]) => known[idx(Math.floor(x), Math.floor(y))] === WALL);
    }

    function step(dt) {
      scan();
      if (mode === "done") {
        if (performance.now() - doneAt > 3500) generate();
        return;
      }
      if (!path.length || pathBlocked() || performance.now() - lastPlan > 700) plan();
      if (!path.length) return;
      const [tx, ty] = path[0];
      const dx = tx - bot.x, dy = ty - bot.y;
      const d = Math.hypot(dx, dy);
      const want = Math.atan2(dy, dx);
      let da = want - bot.a;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      bot.a += da * Math.min(1, dt * 10);
      const speed = 5.2 * dt * (1 - Math.min(Math.abs(da), 1.2) / 2);
      if (d <= speed) { bot.x = tx; bot.y = ty; path.shift(); }
      else { bot.x += (dx / d) * speed; bot.y += (dy / d) * speed; }
      trail.push([bot.x, bot.y]);
      if (trail.length > 500) trail.shift();
      if (!path.length && mode === "goal") { mode = "explore"; goal = null; target = null; }
    }

    function draw(time) {
      ctx.clearRect(0, 0, W, H);
      const X = (x) => ox + x * cs, Y = (y) => oy + y * cs;
      let k = 0;
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        const v = known[idx(x, y)];
        if (v === FREE) { ctx.fillStyle = "rgba(242,237,226,0.045)"; ctx.fillRect(X(x) + 0.5, Y(y) + 0.5, cs - 1, cs - 1); k++; }
        else if (v === WALL) { ctx.fillStyle = "#f2ede2"; ctx.fillRect(X(x) + 1, Y(y) + 1, cs - 2, cs - 2); k++; }
      }
      mappedEl.textContent = Math.min(100, Math.round((k / denom) * 100)) + "%";
      modeEl.textContent = mode;

      // trail
      if (trail.length > 1) {
        ctx.beginPath();
        trail.forEach(([x, y], i) => (i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y))));
        ctx.strokeStyle = "rgba(242,237,226,0.12)"; ctx.lineWidth = 2; ctx.stroke();
      }
      // lidar
      ctx.lineWidth = 1;
      for (const [hx, hy, hit] of rays) {
        ctx.beginPath(); ctx.moveTo(X(bot.x), Y(bot.y)); ctx.lineTo(X(hx), Y(hy));
        ctx.strokeStyle = "rgba(255,77,46,0.10)"; ctx.stroke();
        if (hit) { ctx.fillStyle = "#ff4d2e"; ctx.fillRect(X(hx) - 1.5, Y(hy) - 1.5, 3, 3); }
      }
      // path
      if (path.length) {
        ctx.beginPath(); ctx.moveTo(X(bot.x), Y(bot.y));
        path.forEach(([x, y]) => ctx.lineTo(X(x), Y(y)));
        ctx.setLineDash([4, 5]); ctx.strokeStyle = "#d4ff4f"; ctx.lineWidth = 1.5; ctx.stroke(); ctx.setLineDash([]);
      }
      // target
      if (target) {
        const pulse = 1 + Math.sin(time / 200) * 0.25;
        const cx = X(target[0] + 0.5), cy = Y(target[1] + 0.5);
        ctx.strokeStyle = mode === "goal" ? "#d4ff4f" : "rgba(212,255,79,0.5)";
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(cx, cy, cs * 0.45 * pulse, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - cs * 0.8, cy); ctx.lineTo(cx + cs * 0.8, cy); ctx.moveTo(cx, cy - cs * 0.8); ctx.lineTo(cx, cy + cs * 0.8); ctx.stroke();
      }
      // robot with eyes
      const rx = X(bot.x), ry = Y(bot.y), r = cs * 0.62;
      ctx.fillStyle = "rgba(255,77,46,0.18)";
      ctx.beginPath(); ctx.arc(rx, ry, r * 2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#f2ede2";
      ctx.beginPath(); ctx.arc(rx, ry, r, 0, Math.PI * 2); ctx.fill();
      const ca = Math.cos(bot.a), sa = Math.sin(bot.a);
      const blink = Math.sin(time / 900) > 0.97 ? 0.15 : 1;
      for (const s of [-1, 1]) {
        const ex = rx + ca * r * 0.35 - sa * r * 0.38 * s;
        const ey = ry + sa * r * 0.35 + ca * r * 0.38 * s;
        ctx.fillStyle = "#0d0c0b";
        ctx.beginPath(); ctx.ellipse(ex, ey, r * 0.16, r * 0.16 * blink, bot.a, 0, Math.PI * 2); ctx.fill();
      }
      ctx.strokeStyle = "#ff4d2e"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(rx, ry, r, bot.a - 0.6, bot.a + 0.6); ctx.stroke();
    }

    cv.addEventListener("click", (e) => {
      const r = cv.getBoundingClientRect();
      const gx = Math.floor((e.clientX - r.left - ox) / cs), gy = Math.floor((e.clientY - r.top - oy) / cs);
      if (!inb(gx, gy) || known[idx(gx, gy)] === WALL) return;
      goal = [gx, gy]; mode = "goal"; target = null; plan();
      FX.burst(e.clientX, e.clientY, 6);
    });
    $("#robotReset").addEventListener("click", generate);
    new IntersectionObserver(([en]) => (visible = en.isIntersecting)).observe(wrapEl);
    let rt; addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(generate, 200); });

    generate();
    let last = performance.now();
    (function loop(now) {
      requestAnimationFrame(loop);
      const dt = Math.min((now - last) / 1000, 0.05); last = now;
      if (!visible) return;
      step(dt);
      draw(now);
    })(last);

    return { reset: generate };
  }

  /* ------------------------------------------------------------------ */
  /* Lab 02: Wordle                                                     */
  /* ------------------------------------------------------------------ */
  const Wordle = (() => {
    const board = $("#wordle"), msg = $("#wordleMsg"), keysEl = $("#keys"), panel = $("#wordlePanel");
    let answer = "", row = 0, col = 0, grid = [], over = false, active = false, lock = false;
    const keyState = {};

    function newGame() {
      let w;
      do { w = D.words[Math.floor(Math.random() * D.words.length)]; } while (w === answer && D.words.length > 1);
      answer = w.toUpperCase(); row = 0; col = 0; over = false; lock = false;
      grid = [...Array(6)].map(() => Array(5).fill(""));
      for (const k in keyState) delete keyState[k];
      board.className = "wordle";
      board.innerHTML = grid.map(() => `<div class="wordle__row">${'<div class="tile"></div>'.repeat(5)}</div>`).join("");
      $$(".wordle__row", board).forEach((r) => $$(".tile", r).forEach((t, i) => t.style.setProperty("--i", i)));
      buildKeys();
      say("Click the board and start typing. Hint: it's on theme.");
    }

    function buildKeys() {
      const rowsK = ["QWERTYUIOP", "ASDFGHJKL", "⏎ZXCVBNM⌫"];
      keysEl.innerHTML = rowsK.map((r) => `<div class="keys__row">${[...r].map((k) => {
        const wide = k === "⏎" || k === "⌫";
        return `<button class="key${wide ? " key--wide" : ""}" data-k="${k}" aria-label="${k === "⏎" ? "Enter" : k === "⌫" ? "Backspace" : k}">${k === "⏎" ? "enter" : k}</button>`;
      }).join("")}</div>`).join("");
    }

    const say = (t) => (msg.textContent = t);
    const tile = (r, c) => board.children[r].children[c];

    function input(k) {
      if (over || lock) return;
      if (k === "⌫") { if (col > 0) { col--; grid[row][col] = ""; const t = tile(row, col); t.textContent = ""; t.classList.remove("filled"); } return; }
      if (k === "⏎") return submit();
      if (/^[A-Z]$/.test(k) && col < 5) {
        grid[row][col] = k; const t = tile(row, col); t.textContent = k; t.classList.add("filled"); col++;
      }
    }

    function score(guess) {
      const res = Array(5).fill("miss");
      const pool = {};
      for (let i = 0; i < 5; i++) { if (guess[i] === answer[i]) res[i] = "hit"; else pool[answer[i]] = (pool[answer[i]] || 0) + 1; }
      for (let i = 0; i < 5; i++) if (res[i] !== "hit" && pool[guess[i]]) { res[i] = "near"; pool[guess[i]]--; }
      return res;
    }

    async function submit() {
      if (col < 5) {
        const r = board.children[row]; r.classList.remove("shake"); void r.offsetWidth; r.classList.add("shake");
        return say("Five letters, please.");
      }
      lock = true;
      const guess = grid[row].join("");
      const res = score(guess);
      const rank = { miss: 1, near: 2, hit: 3 };
      res.forEach((s, i) => {
        const t = tile(row, i);
        t.classList.add("flip");
        setTimeout(() => t.classList.add(s), i * 120 + 300);
      });
      await wait(5 * 120 + 400);
      res.forEach((s, i) => { const l = guess[i]; if (!keyState[l] || rank[s] > rank[keyState[l]]) keyState[l] = s; });
      $$(".key", keysEl).forEach((b) => { const s = keyState[b.dataset.k]; b.classList.remove("hit", "near", "miss"); if (s) b.classList.add(s); });
      lock = false;
      if (guess === answer) {
        over = true;
        board.children[row].classList.add("win");
        board.classList.add("won");
        const lines = ["Genius.", "Magnificent.", "Impressive.", "Splendid.", "Great.", "Phew."];
        say(`${lines[row]} The word was ${answer}. Hit "new word" to go again.`);
        const r = board.getBoundingClientRect();
        FX.burst(r.left + r.width / 2, r.top + r.height / 2, 40);
        return;
      }
      row++; col = 0;
      if (row === 6) { over = true; say(`Out of tries. It was ${answer}.`); return; }
      say(`${6 - row} ${6 - row === 1 ? "try" : "tries"} left.`);
    }

    function init() {
      newGame();
      keysEl.addEventListener("click", (e) => { const b = e.target.closest(".key"); if (b) { input(b.dataset.k); active = true; } });
      $("#wordleNew").addEventListener("click", newGame);
      document.addEventListener("pointerdown", (e) => { active = !!e.target.closest("#wordlePanel"); });
      board.addEventListener("focus", () => (active = true));
      addEventListener("keydown", (e) => {
        if (!active || Terminal.isOpen() || e.metaKey || e.ctrlKey || e.altKey) return;
        if (e.target.tagName === "INPUT") return;
        const k = e.key;
        if (k === "Enter") { e.preventDefault(); input("⏎"); }
        else if (k === "Backspace") { e.preventDefault(); input("⌫"); }
        else if (/^[a-zA-Z]$/.test(k)) input(k.toUpperCase());
      });
    }
    return { init, focus: () => { active = true; board.focus({ preventScroll: true }); } };
  })();

  /* ------------------------------------------------------------------ */
  /* Lab 03: CPU vs GPU training race                                   */
  /* ------------------------------------------------------------------ */
  const Race = (() => {
    const btn = $("#raceGo"), verdict = $("#raceVerdict"), cv = $("#lossCanvas"), ctx = cv.getContext("2d");
    const lanes = { cpu: $("#laneCpu"), gpu: $("#laneGpu") };
    const EPOCHS = 10, SIM = 8.4; // seconds of "real" training per animated second
    let running = false;

    const acc = (p) => 98.9 - 8.4 * Math.exp(-p * 3.2);
    const loss = (p, j) => 0.04 + 2.26 * Math.exp(-p * 4.4) + j;

    function sizeCanvas() {
      const r = cv.getBoundingClientRect();
      cv.width = r.width * DPR; cv.height = r.height * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      return r;
    }

    function setLane(el, p, t) {
      const e = Math.min(EPOCHS, Math.floor(p * EPOCHS + 1e-6));
      el.querySelector(".lane__fill").style.width = p * 100 + "%";
      const bs = el.querySelectorAll(".lane__stat b");
      bs[0].textContent = e;
      bs[1].textContent = (p === 0 ? 0 : acc(p)).toFixed(1) + "%";
      el.querySelector(".lane__time").textContent = (t * SIM).toFixed(2) + "s";
    }

    function drawCurves(series, tMax) {
      const r = sizeCanvas();
      const w = r.width, h = r.height, pad = 10;
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = "rgba(242,237,226,0.06)"; ctx.lineWidth = 1;
      for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(0, (h / 4) * i); ctx.lineTo(w, (h / 4) * i); ctx.stroke(); }
      ctx.font = "10px JetBrains Mono, monospace"; ctx.fillStyle = "rgba(242,237,226,0.35)";
      ctx.fillText("loss", 8, 14);
      for (const s of series) {
        if (s.pts.length < 2) continue;
        ctx.beginPath();
        s.pts.forEach(([t, l], i) => {
          const x = pad + (t / tMax) * (w - pad * 2);
          const y = pad + (1 - l / 2.4) * (h - pad * 2);
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        });
        ctx.strokeStyle = s.color; ctx.lineWidth = 2; ctx.stroke();
      }
    }

    async function go() {
      if (running) return;
      running = true; btn.disabled = true;
      verdict.innerHTML = "Training on <em>MNIST</em>…";
      const cpuEpoch = 0.52 * rand(0.96, 1.04), gpuEpoch = cpuEpoch * rand(0.64, 0.7);
      const tCpu = cpuEpoch * EPOCHS, tGpu = gpuEpoch * EPOCHS;
      const tMax = tCpu * 1.04;
      const series = [{ color: "#f2ede2", pts: [] }, { color: "#ff4d2e", pts: [] }];
      const start = performance.now();
      let gpuDone = false;
      await new Promise((res) => {
        (function tick(now) {
          const t = (now - start) / 1000;
          const pc = clamp(t / tCpu, 0, 1), pg = clamp(t / tGpu, 0, 1);
          setLane(lanes.cpu, pc, Math.min(t, tCpu));
          setLane(lanes.gpu, pg, Math.min(t, tGpu));
          if (pc < 1) series[0].pts.push([t, loss(pc, rand(-0.04, 0.04) * (1 - pc))]);
          if (pg < 1) series[1].pts.push([t, loss(pg, rand(-0.04, 0.04) * (1 - pg))]);
          drawCurves(series, tMax);
          if (pg >= 1 && !gpuDone) {
            gpuDone = true;
            const r = lanes.gpu.getBoundingClientRect();
            FX.burst(r.right - 20, r.top + 20, 18);
          }
          if (pc >= 1) return res();
          requestAnimationFrame(tick);
        })(start);
      });
      const pct = Math.round((1 - tGpu / tCpu) * 100);
      verdict.innerHTML = `GPU finished in <em>${(tGpu * SIM).toFixed(1)}s</em> vs ${(tCpu * SIM).toFixed(1)}s. That's ${pct}% faster, same ${acc(1).toFixed(1)}% accuracy.`;
      running = false; btn.disabled = false; btn.textContent = "again";
    }

    function init() {
      btn.addEventListener("click", go);
      setLane(lanes.cpu, 0, 0); setLane(lanes.gpu, 0, 0);
      drawCurves([], 1);
      addEventListener("resize", () => { if (!running) drawCurves([], 1); });
    }
    return { init, go };
  })();

  /* ------------------------------------------------------------------ */
  /* Terminal                                                           */
  /* ------------------------------------------------------------------ */
  const Terminal = (() => {
    const el = $("#term"), body = $("#termBody"), form = $("#termForm"), input = $("#termInput");
    const hist = []; let hi = 0, booted = false;

    const print = (html, cls = "") => { const d = document.createElement("div"); if (cls) d.className = cls; d.innerHTML = html; body.append(d); body.scrollTop = body.scrollHeight; };
    const go = (sel) => { close(); setTimeout(() => $(sel).scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" }), 250); };

    const cmds = {
      help: () => print(
`<span class="l">available commands</span>
  <span class="c">whoami</span>        who is this guy
  <span class="c">about</span>         the longer version
  <span class="c">projects</span>      list everything in the deck
  <span class="c">open</span> &lt;n&gt;      open project n on GitHub
  <span class="c">skills</span>        the stack
  <span class="c">contact</span>       where to find me
  <span class="c">wordle</span>        play a round
  <span class="c">robot</span>         watch the robot map a room
  <span class="c">train</span>         race the CPU against the GPU
  <span class="c">shuffle</span>       shuffle the deck
  <span class="c">party</span>         you'll see
  <span class="c">clear</span> / <span class="c">exit</span>`),
      whoami: () => print(`<span class="l">${esc(D.name)}</span>\n${esc(D.role)}\n${esc(D.location)}`),
      about: () => print(D.about.map(esc).join("\n\n")),
      projects: () => print(D.projects.map((p, i) => `  <span class="c">${i + 1}</span>  ${esc(p.rank + p.suit).padEnd(4)} ${esc(p.title).padEnd(22)} <span class="m">${esc(p.tag)}</span>`).join("\n") + `\n\n<span class="m">type "open 1" to view one</span>`),
      ls: () => cmds.projects(),
      open: (a) => {
        const q = a.join(" ").toLowerCase();
        const n = parseInt(q, 10);
        const p = !isNaN(n) ? D.projects[n - 1] : D.projects.find((x) => x.title.toLowerCase().includes(q));
        if (!p) return print(`<span class="c">no such card.</span> try "projects"`);
        print(`opening <a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.url)}</a>`);
        window.open(p.url, "_blank", "noopener");
      },
      skills: () => print(D.skills.map((s) => `<span class="l">●</span> ${esc(s)}`).join("   ")),
      contact: () => print(D.links.map((l) => `${esc(l.label.padEnd(9))}<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.url)}</a>`).join("\n")),
      links: () => cmds.contact(),
      github: () => { print("opening GitHub…"); window.open("https://github.com/matejpopovski", "_blank", "noopener"); },
      wordle: () => { go("#wordlePanel"); setTimeout(Wordle.focus, 700); },
      robot: () => go("#lab"),
      train: () => { go("#lab"); setTimeout(Race.go, 900); },
      race: () => cmds.train(),
      shuffle: () => { go("#work"); setTimeout(Cards.shuffle, 900); },
      party: () => { FX.rain(); print("♠ ♥ ♦ ♣"); },
      confetti: () => cmds.party(),
      hire: () => { FX.rain(); print(`<span class="l">excellent choice.</span> offer letter queued. ♠`); },
      sudo: (a) => {
        if (/hire/.test(a.join(" "))) return cmds.hire();
        print(`<span class="c">[sudo]</span> password for visitor: ********\n<span class="m">nice try. this incident will be reported to the dealer.</span>`);
      },
      date: () => print(new Date().toString()),
      echo: (a) => print(esc(a.join(" "))),
      coffee: () => print(`brewing… <span class="c">error 418</span>: I'm a teapot`),
      ping: () => print("pong 🏓"),
      rm: () => print(`<span class="c">rm:</span> the deck is protected by a very small robot.`),
      vim: () => print(`you are now trapped in vim. just kidding. type <span class="c">exit</span>.`),
      history: () => print(hist.map((h, i) => `  ${i + 1}  ${esc(h)}`).join("\n")),
      clear: () => (body.innerHTML = ""),
      exit: () => close(),
    };

    function run(line) {
      const raw = line.trim();
      print(`<span class="c">❯</span> ${esc(raw)}`);
      if (!raw) return;
      hist.push(raw); hi = hist.length;
      const [c, ...args] = raw.split(/\s+/);
      const fn = cmds[c.toLowerCase()];
      if (fn) fn(args);
      else print(`command not found: ${esc(c)}. type <span class="c">help</span>`, "m");
    }

    function open() {
      el.classList.add("is-open"); el.setAttribute("aria-hidden", "false");
      if (!booted) {
        booted = true;
        print(`<span class="l">matej-os</span> v2026.10 <span class="m">(${new Date().toDateString()})</span>\nWelcome. Type <span class="c">help</span> to see what this thing can do.\n`);
      }
      setTimeout(() => input.focus(), 50);
    }
    function close() { el.classList.remove("is-open"); el.setAttribute("aria-hidden", "true"); input.blur(); }
    const isOpen = () => el.classList.contains("is-open");

    function init() {
      form.addEventListener("submit", (e) => { e.preventDefault(); run(input.value); input.value = ""; });
      input.addEventListener("keydown", (e) => {
        if (e.key === "ArrowUp") { e.preventDefault(); hi = Math.max(0, hi - 1); input.value = hist[hi] || ""; }
        else if (e.key === "ArrowDown") { e.preventDefault(); hi = Math.min(hist.length, hi + 1); input.value = hist[hi] || ""; }
        else if (e.key === "Tab") {
          e.preventDefault();
          const m = Object.keys(cmds).filter((k) => k.startsWith(input.value.toLowerCase()));
          if (m.length === 1) input.value = m[0] + " ";
          else if (m.length > 1) print(m.join("  "), "m");
        } else if (e.key === "`") { e.preventDefault(); close(); }
      });
      $("#termOpen").addEventListener("click", open);
      $("#termClose").addEventListener("click", close);
      el.addEventListener("click", (e) => { if (e.target === el) close(); });
      addEventListener("keydown", (e) => {
        if (e.key === "Escape" && isOpen()) close();
        if (e.key === "`" && !isOpen() && e.target.tagName !== "INPUT") { e.preventDefault(); open(); }
      });
    }
    return { init, open, close, isOpen };
  })();

  /* ------------------------------------------------------------------ */
  /* FX: bursts and rain of card suits                                  */
  /* ------------------------------------------------------------------ */
  const FX = (() => {
    const cv = $("#fx"), ctx = cv.getContext("2d");
    let parts = [], running = false;
    const suits = ["♠", "♥", "♦", "♣"];
    const colors = ["#f2ede2", "#ff4d2e", "#d4ff4f"];

    function size() { cv.width = innerWidth * DPR; cv.height = innerHeight * DPR; ctx.setTransform(DPR, 0, 0, DPR, 0, 0); }
    addEventListener("resize", size); size();

    function add(p) { parts.push(p); if (!running) { running = true; requestAnimationFrame(loop); } }

    function burst(x, y, n = 20) {
      if (reduced) return;
      for (let i = 0; i < n; i++) {
        const a = rand(0, Math.PI * 2), s = rand(2, 9);
        add({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 3, r: rand(0, 6), vr: rand(-0.2, 0.2), size: rand(10, 22), ch: suits[i % 4], c: colors[i % 3], life: 1, decay: rand(0.012, 0.022), g: 0.25 });
      }
    }
    function rain() {
      const n = reduced ? 0 : 140;
      for (let i = 0; i < n; i++) {
        add({ x: rand(0, innerWidth), y: rand(-innerHeight, -20), vx: rand(-1, 1), vy: rand(2, 6), r: rand(0, 6), vr: rand(-0.08, 0.08), size: rand(14, 40), ch: suits[i % 4], c: colors[i % 3], life: 1, decay: 0.002, g: 0.06 });
      }
    }

    function loop() {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      parts = parts.filter((p) => p.life > 0 && p.y < innerHeight + 60);
      for (const p of parts) {
        p.vy += p.g; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life -= p.decay;
        ctx.save();
        ctx.globalAlpha = clamp(p.life, 0, 1);
        ctx.translate(p.x, p.y); ctx.rotate(p.r);
        ctx.fillStyle = p.c; ctx.font = `${p.size}px "Instrument Serif", serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(p.ch, 0, 0);
        ctx.restore();
      }
      if (parts.length) requestAnimationFrame(loop); else { running = false; ctx.clearRect(0, 0, innerWidth, innerHeight); }
    }
    return { burst, rain };
  })();

  function initKonami() {
    const seq = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
    let i = 0;
    addEventListener("keydown", (e) => {
      if (Terminal.isOpen()) return;
      i = e.key.toLowerCase() === seq[i].toLowerCase() ? i + 1 : (e.key === seq[0] ? 1 : 0);
      if (i === seq.length) { i = 0; FX.rain(); }
    });
    $(".footer__konami").addEventListener("click", () => FX.rain());
  }

  /* ------------------------------------------------------------------ */
  /* Magnetic button                                                    */
  /* ------------------------------------------------------------------ */
  function initMagnet() {
    if (!finePointer) return;
    $$(".magnet").forEach((m) => {
      const inner = $(".magnet__inner", m);
      addEventListener("pointermove", (e) => {
        const r = m.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const dx = e.clientX - cx, dy = e.clientY - cy;
        const d = Math.hypot(dx, dy);
        if (d < r.width * 1.1) {
          m.style.transform = `translate(${dx * 0.35}px, ${dy * 0.35}px)`;
          inner.style.transform = `translate(${dx * 0.15}px, ${dy * 0.15}px)`;
        } else { m.style.transform = ""; inner.style.transform = ""; }
      }, { passive: true });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Boot                                                               */
  /* ------------------------------------------------------------------ */
  renderContent();
  initCursor();
  initClock();
  initMarquee();
  initReveals();
  Cards.init();
  Wordle.init();
  Race.init();
  Terminal.init();
  initKonami();
  initMagnet();
  runLoader(() => {
    initHero();
    initTypewriter();
    initRobot();
    // a playful nudge for the curious
    console.log("%c♠ hey, you opened the console. press ` on the page for a real terminal.", "font: 14px serif; color: #ff4d2e");
  });
})();
