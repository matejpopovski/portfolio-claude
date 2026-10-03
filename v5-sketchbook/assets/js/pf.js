/*
 * A pencil-sketched Monte Carlo localization demo.
 * Robot measures noisy ranges to 4 landmarks; particles move with the same
 * (noisy) control, get weighted by how well they explain the ranges, and are
 * resampled. A trickle of random particles lets it recover from a kidnapping.
 */
(function () {
  "use strict";

  const TAU = Math.PI * 2;
  const gauss = () => {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
  };
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

  function seeded(seed) {
    let s = seed >>> 0;
    return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  }

  // Draw a wobbly line between two points with a seeded RNG (stable shape)
  function sketchLine(ctx, x1, y1, x2, y2, R, amp = 1.4) {
    const len = Math.hypot(x2 - x1, y2 - y1);
    const n = Math.max(2, Math.round(len / 28));
    const nx = -(y2 - y1) / (len || 1), ny = (x2 - x1) / (len || 1);
    ctx.moveTo(x1 + (R() - 0.5) * amp, y1 + (R() - 0.5) * amp);
    for (let k = 1; k <= n; k++) {
      const t = k / n;
      const off = k === n ? (R() - 0.5) * amp : (R() - 0.5) * amp * 1.6;
      ctx.lineTo(x1 + (x2 - x1) * t + nx * off, y1 + (y2 - y1) * t + ny * off);
    }
  }

  function sketchCircle(ctx, cx, cy, r, R, amp = 1.2, overshoot = 0.25) {
    const steps = 28;
    const start = R() * TAU;
    for (let k = 0; k <= steps * (1 + overshoot); k++) {
      const a = start + (k / steps) * TAU;
      const rr = r + (R() - 0.5) * amp * 2 + (k / steps) * amp;
      const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
      k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
  }

  function star(ctx, x, y, r) {
    for (let k = 0; k <= 10; k++) {
      const a = -Math.PI / 2 + (k * Math.PI) / 5;
      const rr = k % 2 ? r * 0.45 : r;
      const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
      k ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
  }

  function init(canvas, ui) {
    const ctx = canvas.getContext("2d");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const N = 420;
    const SIGMA = 16; // range noise (world units)
    const INK = "#2f3238", RED = "#c8402f", BLUE = "#1f4fa8";

    let W = 900, H = 500, scale = 1, dpr = 1;
    let landmarks = [];
    let staticLayer = null;
    let robot, particles, target = null, trail = [];
    let frame = 0, running = false, visible = false, lastUser = 0, showRays = true;
    let keys = {};
    let lastZ = null;
    let est = { x: 0, y: 0, th: 0, spread: 999 };

    function layoutWorld() {
      const cssW = canvas.clientWidth || 600;
      const narrow = cssW < 560;
      const nW = narrow ? 600 : 900;
      const nH = narrow ? 600 : 480;
      const changed = nW !== W || nH !== H || !robot;
      W = nW; H = nH;
      scale = cssW / W;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.style.height = H * scale + "px";
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(H * scale * dpr);
      const m = 40;
      landmarks = narrow
        ? [ { x: 120, y: 110 }, { x: 470, y: 150 }, { x: 160, y: 470 }, { x: 500, y: 500 } ]
        : [ { x: 130, y: 110 }, { x: 560, y: 90 }, { x: 790, y: 300 }, { x: 260, y: 400 } ];
      landmarks.forEach((l, i) => (l.name = "L" + (i + 1)));
      buildStatic(m);
      if (changed) reset(true);
    }

    function inRoom(x, y) { return x > 34 && x < W - 34 && y > 34 && y < H - 34; }

    function randomParticle() {
      return { x: 40 + Math.random() * (W - 80), y: 40 + Math.random() * (H - 80), th: Math.random() * TAU, w: 1 / N };
    }

    function reset(newRobot) {
      if (newRobot || !robot) robot = { x: W * 0.62, y: H * 0.6, th: -0.6 };
      particles = Array.from({ length: N }, randomParticle);
      trail = [];
      target = null;
      estimate();
    }

    function kidnap() {
      robot = { x: 60 + Math.random() * (W - 120), y: 60 + Math.random() * (H - 120), th: Math.random() * TAU };
      trail = [];
      target = null;
      ui.toast && ui.toast("whoosh. the robot got kidnapped. watch the guesses figure it out.");
    }

    function buildStatic() {
      staticLayer = document.createElement("canvas");
      staticLayer.width = canvas.width;
      staticLayer.height = canvas.height;
      const c = staticLayer.getContext("2d");
      c.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
      const R = seeded(42);
      c.lineCap = "round"; c.lineJoin = "round";
      c.strokeStyle = INK;
      // Walls: double line with hatching between (architect style)
      const t = 16;
      c.lineWidth = 1.6;
      c.beginPath();
      [[8, 8, W - 8, 8], [W - 8, 8, W - 8, H - 8], [W - 8, H - 8, 8, H - 8], [8, H - 8, 8, 8]].forEach(([a, b, d, e]) => sketchLine(c, a, b, d, e, R));
      [[8 + t, 8 + t, W - 8 - t, 8 + t], [W - 8 - t, 8 + t, W - 8 - t, H - 8 - t], [W - 8 - t, H - 8 - t, 8 + t, H - 8 - t], [8 + t, H - 8 - t, 8 + t, 8 + t]].forEach(([a, b, d, e]) => sketchLine(c, a, b, d, e, R));
      c.stroke();
      c.lineWidth = 0.8;
      c.globalAlpha = 0.5;
      c.beginPath();
      for (let x = 12; x < W; x += 11) { sketchLine(c, x, 9, x + 12, 8 + t - 1, R, 0.6); sketchLine(c, x, H - 8 - t + 1, x + 12, H - 9, R, 0.6); }
      for (let y = 12; y < H; y += 11) { sketchLine(c, 9, y, 8 + t - 1, y + 12, R, 0.6); sketchLine(c, W - 8 - t + 1, y, W - 9, y + 12, R, 0.6); }
      c.stroke();
      c.globalAlpha = 1;
      // Door gap arc (bottom-left)
      c.save();
      c.fillStyle = "#fdfbf5";
      c.fillRect(70, H - 8 - t - 1, 60, t + 3);
      c.beginPath();
      c.lineWidth = 1.2;
      sketchLine(c, 70, H - 8 - t, 70, H - 8 - t - 56, R);
      c.stroke();
      c.setLineDash([3, 5]);
      c.beginPath();
      c.arc(70, H - 8 - t, 56, -Math.PI / 2, 0);
      c.stroke();
      c.restore();
      // Rug (dashed ellipse)
      c.save();
      c.globalAlpha = 0.35;
      c.setLineDash([6, 7]);
      c.beginPath();
      c.ellipse(W * 0.48, H * 0.55, W * 0.16, H * 0.14, -0.08, 0, TAU);
      c.stroke();
      c.restore();
      // Plant in a corner
      c.save();
      c.globalAlpha = 0.6;
      c.lineWidth = 1.2;
      const px = W - 70, py = H - 70;
      c.beginPath();
      sketchCircle(c, px, py, 18, R, 1);
      for (let k = 0; k < 7; k++) {
        const a = (k / 7) * TAU;
        c.moveTo(px, py);
        c.quadraticCurveTo(px + Math.cos(a + 0.4) * 24, py + Math.sin(a + 0.4) * 24, px + Math.cos(a) * 34, py + Math.sin(a) * 34);
      }
      c.stroke();
      c.restore();
      // Bookshelf on the top wall
      c.save();
      c.globalAlpha = 0.55;
      c.lineWidth = 1.1;
      const bx = W * 0.26, bw = 150;
      c.beginPath();
      sketchLine(c, bx, 26, bx + bw, 26, R); sketchLine(c, bx + bw, 26, bx + bw, 52, R);
      sketchLine(c, bx + bw, 52, bx, 52, R); sketchLine(c, bx, 52, bx, 26, R);
      for (let x = bx + 8; x < bx + bw - 6; x += 7 + R() * 9) sketchLine(c, x, 28, x + (R() - 0.5) * 3, 50, R, 0.5);
      c.stroke();
      c.restore();
      // Landmarks
      c.strokeStyle = BLUE;
      c.fillStyle = BLUE;
      c.lineWidth = 1.6;
      c.font = "600 20px Caveat, 'Patrick Hand', cursive";
      landmarks.forEach((l) => {
        c.beginPath();
        star(c, l.x, l.y, 12);
        c.stroke();
        c.fillText(l.name, l.x + 14, l.y - 10);
      });
    }

    function senseFrom(x, y) { return landmarks.map((l) => Math.hypot(l.x - x, l.y - y)); }

    function move(p, turn, fwd, noisy) {
      const th = p.th + turn + (noisy ? gauss() * (0.02 + Math.abs(turn) * 0.25) : 0);
      const d = fwd + (noisy ? gauss() * (0.12 * Math.abs(fwd) + 0.35) : 0);
      p.th = wrap(th);
      p.x += Math.cos(p.th) * d;
      p.y += Math.sin(p.th) * d;
      if (p.x < 26) p.x = 26; if (p.x > W - 26) p.x = W - 26;
      if (p.y < 26) p.y = 26; if (p.y > H - 26) p.y = H - 26;
    }

    function measure() {
      const z = senseFrom(robot.x, robot.y).map((d) => d + gauss() * SIGMA);
      lastZ = z;
      let maxLog = -Infinity;
      const logs = particles.map((p) => {
        let lw = 0;
        for (let k = 0; k < landmarks.length; k++) {
          const d = Math.hypot(landmarks[k].x - p.x, landmarks[k].y - p.y) - z[k];
          lw += -(d * d) / (2 * (SIGMA * 2.2) ** 2);
        }
        if (lw > maxLog) maxLog = lw;
        return lw;
      });
      let sum = 0;
      particles.forEach((p, i) => { p.w = Math.exp(logs[i] - maxLog); sum += p.w; });
      particles.forEach((p) => (p.w /= sum));
      resample();
    }

    function resample() {
      const out = [];
      const step = 1 / N;
      let r = Math.random() * step, c = particles[0].w, i = 0;
      for (let m = 0; m < N; m++) {
        const u = r + m * step;
        while (u > c && i < N - 1) { i++; c += particles[i].w; }
        const p = particles[i];
        out.push({ x: p.x + gauss() * 1.6, y: p.y + gauss() * 1.6, th: wrap(p.th + gauss() * 0.03), w: 1 / N });
      }
      // a few random guesses keep it humble (and recover from kidnapping)
      const inject = Math.round(N * 0.02);
      for (let k = 0; k < inject; k++) out[Math.floor(Math.random() * N)] = randomParticle();
      particles = out;
      estimate();
    }

    function estimate() {
      let x = 0, y = 0, sx = 0, sy = 0;
      particles.forEach((p) => { x += p.x; y += p.y; sx += Math.cos(p.th); sy += Math.sin(p.th); });
      x /= N; y /= N;
      // robust-ish: spread from the densest 90%
      const ds = particles.map((p) => Math.hypot(p.x - x, p.y - y)).sort((a, b) => a - b);
      const core = ds.slice(0, Math.floor(N * 0.9));
      const spread = Math.sqrt(core.reduce((a, d) => a + d * d, 0) / core.length);
      est = { x, y, th: Math.atan2(sy, sx), spread };
      if (ui.n) ui.n.textContent = N;
      if (ui.spread) ui.spread.textContent = Math.round(spread) + " px";
      if (ui.err) ui.err.textContent = Math.round(Math.hypot(x - robot.x, y - robot.y)) + " px";
      if (ui.state) {
        const s = spread < 22 ? "localized ✓" : spread < 90 ? "narrowing…" : "lost?";
        if (ui.state.textContent !== s) {
          ui.state.textContent = s;
          ui.state.dataset.state = spread < 22 ? "ok" : spread < 90 ? "mid" : "lost";
        }
      }
    }

    function control() {
      let turn = 0, fwd = 0;
      if (keys.ArrowLeft) turn -= 0.06;
      if (keys.ArrowRight) turn += 0.06;
      if (keys.ArrowUp) fwd += 2.6;
      if (keys.ArrowDown) fwd -= 1.6;
      if (turn || fwd) { target = null; return [turn, fwd]; }
      if (!target) return [0, 0];
      const dx = target.x - robot.x, dy = target.y - robot.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 6) { target = null; return [0, 0]; }
      const err = wrap(Math.atan2(dy, dx) - robot.th);
      turn = Math.max(-0.09, Math.min(0.09, err));
      fwd = Math.abs(err) > 0.9 ? 0.4 : Math.min(2.8, dist * 0.06 + 0.8);
      return [turn, fwd];
    }

    function step() {
      frame++;
      const [turn, fwd] = control();
      const moving = turn !== 0 || fwd !== 0;
      if (moving) {
        move(robot, turn, fwd, false);
        particles.forEach((p) => move(p, turn, fwd, true));
        if (frame % 3 === 0) { trail.push([robot.x, robot.y]); if (trail.length > 160) trail.shift(); }
      }
      if (frame % (moving ? 9 : 40) === 0) measure();
      // idle wander so the page is alive without any input
      if (!reduce && !moving && performance.now() - lastUser > 6000 && frame % 90 === 0) {
        target = { x: 60 + Math.random() * (W - 120), y: 60 + Math.random() * (H - 120), auto: true };
      }
    }

    function draw() {
      const k = scale * dpr;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (staticLayer) ctx.drawImage(staticLayer, 0, 0);
      ctx.setTransform(k, 0, 0, k, 0, 0);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      // "Boiling" lines: the jitter seed changes a few times a second
      const R = seeded(reduce ? 7 : 7 + Math.floor(frame / 8));

      // trail
      if (trail.length > 1) {
        ctx.save();
        ctx.strokeStyle = INK;
        ctx.globalAlpha = 0.35;
        ctx.setLineDash([2, 6]);
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        trail.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.lineTo(robot.x, robot.y);
        ctx.stroke();
        ctx.restore();
      }

      // sensor rays (measured length, so the noise is visible)
      if (showRays && lastZ) {
        ctx.save();
        ctx.strokeStyle = BLUE;
        ctx.globalAlpha = 0.35;
        ctx.setLineDash([5, 6]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        landmarks.forEach((l, i) => {
          const a = Math.atan2(l.y - robot.y, l.x - robot.x);
          const d = Math.max(0, lastZ[i] - 14);
          ctx.moveTo(robot.x, robot.y);
          ctx.lineTo(robot.x + Math.cos(a) * d, robot.y + Math.sin(a) * d);
        });
        ctx.stroke();
        ctx.restore();
      }

      // particles: tiny pencil ticks pointing where each guess thinks it faces
      ctx.save();
      ctx.strokeStyle = INK;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      particles.forEach((p) => {
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + Math.cos(p.th) * 5, p.y + Math.sin(p.th) * 5);
      });
      ctx.stroke();
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = INK;
      ctx.beginPath();
      particles.forEach((p) => { ctx.moveTo(p.x + 1.3, p.y); ctx.arc(p.x, p.y, 1.3, 0, TAU); });
      ctx.fill();
      ctx.restore();

      // target
      if (target && !target.auto) {
        ctx.save();
        ctx.strokeStyle = RED;
        ctx.lineWidth = 2;
        ctx.beginPath();
        sketchLine(ctx, target.x - 8, target.y - 8, target.x + 8, target.y + 8, R, 1);
        sketchLine(ctx, target.x + 8, target.y - 8, target.x - 8, target.y + 8, R, 1);
        ctx.stroke();
        ctx.restore();
      }

      // estimate: a red pen circle
      ctx.save();
      ctx.strokeStyle = RED;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      sketchCircle(ctx, est.x, est.y, Math.max(24, Math.min(est.spread * 1.6, 140)), R, 1.6);
      ctx.stroke();
      if (est.spread < 60) {
        ctx.fillStyle = RED;
        ctx.font = "600 22px Caveat, cursive";
        const lx = est.x + Math.max(24, est.spread * 1.6) * 0.75 + 4;
        const ly = est.y - Math.max(24, est.spread * 1.6) * 0.75;
        ctx.fillText("best guess", Math.min(lx, W - 110), Math.max(ly, 40));
      }
      ctx.restore();

      // robot
      ctx.save();
      ctx.translate(robot.x, robot.y);
      ctx.rotate(robot.th);
      ctx.fillStyle = "#fdfbf5";
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      sketchCircle(ctx, 0, 0, 16, R, 1.1, 0.12);
      ctx.moveTo(0, 0);
      ctx.lineTo(22, 0);
      ctx.moveTo(17, -4); ctx.lineTo(23, 0); ctx.lineTo(17, 4);
      ctx.moveTo(-8, -17); ctx.lineTo(8, -17);
      ctx.moveTo(-8, 17); ctx.lineTo(8, 17);
      ctx.stroke();
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.arc(6, -5, 1.8, 0, TAU);
      ctx.arc(6, 5, 1.8, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    function loop() {
      if (!running) return;
      step();
      draw();
      requestAnimationFrame(loop);
    }

    function start() {
      if (running) return;
      running = true;
      requestAnimationFrame(loop);
    }
    function stop() { running = false; }

    function toWorld(e) {
      const r = canvas.getBoundingClientRect();
      return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale };
    }

    canvas.addEventListener("pointerdown", (e) => {
      const p = toWorld(e);
      if (!inRoom(p.x, p.y)) return;
      target = p;
      lastUser = performance.now();
      if (!running) { start(); }
    });
    canvas.addEventListener("keydown", (e) => {
      if (e.key.startsWith("Arrow")) {
        keys[e.key] = true;
        lastUser = performance.now();
        e.preventDefault();
        if (!running) start();
      } else if (e.key === "k" || e.key === "K") kidnap();
      else if (e.key === "r" || e.key === "R") reset(false);
    });
    canvas.addEventListener("keyup", (e) => { delete keys[e.key]; });
    canvas.addEventListener("blur", () => (keys = {}));

    let rT;
    new ResizeObserver(() => {
      clearTimeout(rT);
      rT = setTimeout(() => { layoutWorld(); draw(); }, 80);
    }).observe(canvas);

    let seen = false;
    new IntersectionObserver((es) => {
      visible = es[0].isIntersecting;
      if (visible && !seen && es[0].intersectionRatio >= 0.35) {
        // first look: start lost, then go for a drive so the cloud visibly converges
        seen = true;
        reset(false);
        if (!reduce) target = { x: W * 0.3, y: H * 0.35, auto: true };
      }
      if (visible && !document.hidden) start(); else stop();
    }, { threshold: [0, 0.35] }).observe(canvas);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stop(); else if (visible) start();
    });

    layoutWorld();
    // Redraw once fonts land (landmark labels use Caveat)
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { buildStatic(); draw(); });
    if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener("loadingdone", () => { buildStatic(); draw(); });
    draw();

    return {
      kidnap: () => { lastUser = performance.now(); kidnap(); start(); },
      scatter: () => { lastUser = performance.now(); reset(false); start(); },
      toggleRays: () => { showRays = !showRays; draw(); return showRays; },
      get localized() { return est.spread < 22; },
    };
  }

  window.PF = { init };
})();
