/* Snake.app: a nod to the deep Q-learning Snake project. */
(() => {
  'use strict';
  const MOS = window.MOS;
  const { D, esc } = MOS;
  const N = 17;
  const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const KEYS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right' };
  MOS.snakeRainbow = false;

  MOS.apps.snake = {
    title: 'Snake.app', icon: 'snake', size: [500, 660], min: [320, 440],
    pos: (b, w, h) => ({ x: Math.round(b.w - w - 150), y: b.y + 30 }),
    render(body, win) {
      const proj = D.projects.find((p) => /snake/i.test(p.title));
      body.innerHTML = `
        <div class="snk">
          <div class="snk__hud">
            <div class="snk__score"><span>Score</span><b class="snk__s">0</b></div>
            <div class="snk__score"><span>Best</span><b class="snk__b">0</b></div>
            <button class="btn btn--ghost snk__auto" aria-pressed="false" title="Let a simple path-finding bot drive">${MOS.ui('bot')}<span>Autopilot</span></button>
            <button class="btn btn--icon snk__pp" aria-label="Start">${MOS.ui('play')}</button>
          </div>
          <div class="snk__stage">
            <canvas class="snk__cv" tabindex="0" role="img" aria-label="Snake board. Arrow keys or WASD steer, Space starts and pauses."></canvas>
            <div class="snk__msg" aria-live="polite"></div>
          </div>
          <div class="snk__pad" aria-label="Direction pad">
            <button data-d="up" aria-label="Up">▲</button><button data-d="left" aria-label="Left">◀</button><button data-d="down" aria-label="Down">▼</button><button data-d="right" aria-label="Right">▶</button>
          </div>
          ${proj ? `<p class="snk__note">The autopilot here is a plain path-finder. The real one, <b>${esc(proj.title)}</b>, is a DQN that learns from scratch: ${esc(proj.stat.value)} ${esc(proj.stat.label)}. <a href="${esc(proj.url)}" target="_blank" rel="noopener">See it on GitHub ${MOS.ui('ext')}</a></p>` : ''}
        </div>`;

      const $ = (s) => body.querySelector(s);
      const cv = $('.snk__cv');
      const ctx = cv.getContext('2d');
      const stage = $('.snk__stage');
      const msg = $('.snk__msg');
      const pp = $('.snk__pp');
      const autoBtn = $('.snk__auto');
      let best = MOS.store.get('snakeBest', 0);
      $('.snk__b').textContent = best;

      let snake, dir, queue, food, score, state, tickMs, acc, last, raf, auto = false, cell = 20, colors = {};

      const readColors = () => {
        const cs = getComputedStyle(win.el);
        const g = (v, d) => (cs.getPropertyValue(v).trim() || d);
        colors = { bg: g('--win-2', '#f5efe4'), grid: g('--line-soft', 'rgba(0,0,0,.06)'), ink: g('--text', '#1c1b19'), food: g('--tomato', '#ff5b37'), head: g('--text', '#1c1b19'), mint: g('--mint', '#2fc58a') };
      };

      const reset = () => {
        const m = Math.floor(N / 2);
        snake = [{ x: m, y: m }, { x: m - 1, y: m }, { x: m - 2, y: m }];
        dir = 'right'; queue = []; score = 0; tickMs = 125; acc = 0;
        placeFood();
        $('.snk__s').textContent = '0';
      };
      const occupied = (x, y, upto = snake.length) => { for (let i = 0; i < upto; i++) if (snake[i].x === x && snake[i].y === y) return true; return false; };
      const placeFood = () => {
        const free = [];
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!occupied(x, y)) free.push({ x, y });
        food = free[Math.floor(Math.random() * free.length)];
      };

      const setState = (s) => {
        state = s;
        MOS.busy = s === 'run';
        pp.innerHTML = MOS.ui(s === 'run' ? 'pause' : 'play');
        pp.setAttribute('aria-label', s === 'run' ? 'Pause' : 'Play');
        const tap = MOS.isTouch() || MOS.isPhone();
        msg.innerHTML =
          s === 'idle' ? `<b>Snake</b><span>${tap ? 'Tap to start, swipe to steer' : 'Press Space to start · arrows / WASD to steer'}</span>` :
          s === 'pause' ? '<b>Paused</b><span>Space to resume</span>' :
          s === 'over' ? `<b>Game over</b><span>Score ${score}${score && score >= best ? ' · new best!' : ''} · ${tap ? 'tap' : 'Space'} to retry</span>` : '';
        msg.hidden = s === 'run';
      };

      const turn = (d) => {
        const lastDir = queue.length ? queue[queue.length - 1] : dir;
        const [ax, ay] = DIRS[lastDir]; const [bx, by] = DIRS[d];
        if (ax + bx === 0 && ay + by === 0) return;
        if (d === lastDir) return;
        if (queue.length < 3) queue.push(d);
        if (state === 'idle' || state === 'over') start();
      };

      /* --- Autopilot: BFS to the food, fall back to the move with the most room. --- */
      const inside = (x, y) => x >= 0 && y >= 0 && x < N && y < N;
      const flood = (sx, sy, blocked) => {
        const seen = new Set([sx + ',' + sy]); const st = [[sx, sy]]; let n = 0;
        while (st.length && n < N * N) {
          const [x, y] = st.pop(); n++;
          for (const [dx, dy] of Object.values(DIRS)) {
            const nx = x + dx, ny = y + dy, k = nx + ',' + ny;
            if (inside(nx, ny) && !seen.has(k) && !blocked.has(k)) { seen.add(k); st.push([nx, ny]); }
          }
        }
        return n;
      };
      const think = () => {
        const head = snake[0];
        const blocked = new Set(snake.slice(0, -1).map((s) => s.x + ',' + s.y));
        const prev = new Map(); const q = [[head.x, head.y]]; const seen = new Set([head.x + ',' + head.y]);
        let found = null;
        while (q.length) {
          const [x, y] = q.shift();
          if (x === food.x && y === food.y) { found = [x, y]; break; }
          for (const [name, [dx, dy]] of Object.entries(DIRS)) {
            const nx = x + dx, ny = y + dy, k = nx + ',' + ny;
            if (inside(nx, ny) && !seen.has(k) && !blocked.has(k)) { seen.add(k); prev.set(k, [x, y, name]); q.push([nx, ny]); }
          }
        }
        let move = null;
        if (found) {
          let k = found[0] + ',' + found[1], step;
          while (prev.has(k)) { step = prev.get(k); if (step[0] === head.x && step[1] === head.y) break; k = step[0] + ',' + step[1]; }
          move = step && step[2];
          if (move) {
            const [dx, dy] = DIRS[move];
            if (flood(head.x + dx, head.y + dy, blocked) < snake.length) move = null;
          }
        }
        if (!move) {
          let bestN = -1;
          for (const [name, [dx, dy]] of Object.entries(DIRS)) {
            const nx = head.x + dx, ny = head.y + dy;
            if (!inside(nx, ny) || blocked.has(nx + ',' + ny)) continue;
            const n = flood(nx, ny, blocked);
            if (n > bestN) { bestN = n; move = name; }
          }
        }
        if (move) { const [ax, ay] = DIRS[dir], [bx, by] = DIRS[move]; if (!(ax + bx === 0 && ay + by === 0)) dir = move; }
      };

      const step = () => {
        if (auto) think(); else if (queue.length) dir = queue.shift();
        const [dx, dy] = DIRS[dir];
        const head = { x: snake[0].x + dx, y: snake[0].y + dy };
        const eating = head.x === food.x && head.y === food.y;
        if (!inside(head.x, head.y) || occupied(head.x, head.y, eating ? snake.length : snake.length - 1)) {
          if (score > best) { best = score; MOS.store.set('snakeBest', best); $('.snk__b').textContent = best; }
          setState('over');
          win.el.classList.remove('is-shake'); void win.el.offsetWidth; if (!MOS.reduced()) win.el.classList.add('is-shake');
          return;
        }
        snake.unshift(head);
        if (eating) {
          score++; $('.snk__s').textContent = score;
          tickMs = Math.max(62, tickMs - 3);
          if (snake.length >= N * N) { setState('over'); return; }
          placeFood();
        } else snake.pop();
      };

      const size = () => {
        // clientWidth/Height ignore the window's open animation transform.
        const side = Math.max(120, Math.floor(Math.min(stage.clientWidth, stage.clientHeight) - 8));
        cell = Math.floor(side / N);
        const px = cell * N;
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        cv.width = px * dpr; cv.height = px * dpr;
        cv.style.width = px + 'px'; cv.style.height = px + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        readColors();
        draw();
      };

      const rr = (x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); ctx.fill(); };
      const draw = () => {
        if (!snake) return;
        const px = cell * N;
        ctx.fillStyle = colors.bg; ctx.fillRect(0, 0, px, px);
        ctx.fillStyle = colors.grid;
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if ((x + y) % 2 === 0) ctx.fillRect(x * cell, y * cell, cell, cell);
        // food: a little pixel apple
        const fx = food.x * cell, fy = food.y * cell, pad = cell * 0.16;
        ctx.fillStyle = colors.food; rr(fx + pad, fy + pad * 1.4, cell - pad * 2, cell - pad * 2.2, cell * 0.22);
        ctx.fillStyle = colors.mint; rr(fx + cell * 0.5, fy + pad * 0.2, cell * 0.22, cell * 0.2, 2);
        snake.forEach((s, i) => {
          const p = i === 0 ? cell * 0.06 : cell * 0.12;
          ctx.fillStyle = MOS.snakeRainbow ? `hsl(${(i * 18 + performance.now() / 12) % 360} 85% 55%)` : (i === 0 ? colors.head : colors.ink);
          if (!MOS.snakeRainbow && i > 0) ctx.globalAlpha = Math.max(0.55, 1 - i * 0.02);
          rr(s.x * cell + p, s.y * cell + p, cell - p * 2, cell - p * 2, cell * 0.24);
          ctx.globalAlpha = 1;
        });
        // eyes
        const hd = snake[0]; const [dx, dy] = DIRS[dir];
        ctx.fillStyle = colors.bg;
        const cx = hd.x * cell + cell / 2, cy = hd.y * cell + cell / 2, e = cell * 0.18;
        const ox = dy !== 0 ? e : 0, oy = dx !== 0 ? e : 0;
        ctx.beginPath(); ctx.arc(cx + dx * e + ox, cy + dy * e + oy, cell * 0.09, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + dx * e - ox, cy + dy * e - oy, cell * 0.09, 0, Math.PI * 2); ctx.fill();
      };

      const loop = (t) => {
        raf = requestAnimationFrame(loop);
        if (state !== 'run') { if (MOS.snakeRainbow) draw(); last = t; return; }
        if (win.minimized || document.hidden) { setState('pause'); return; }
        acc += t - (last || t); last = t;
        const speed = auto ? Math.max(45, tickMs * 0.6) : tickMs;
        let n = 0;
        while (acc >= speed && n++ < 4) { acc -= speed; step(); if (state !== 'run') break; }
        draw();
      };

      const start = () => {
        if (state === 'over' || state === 'idle') reset();
        acc = 0; last = undefined;
        setState('run');
        cv.focus({ preventScroll: true });
      };
      const toggle = () => { if (state === 'run') setState('pause'); else start(); };

      pp.addEventListener('click', toggle);
      autoBtn.addEventListener('click', () => {
        auto = !auto;
        autoBtn.setAttribute('aria-pressed', String(auto));
        autoBtn.classList.toggle('is-on', auto);
        if (auto && state !== 'run') start();
      });
      stage.addEventListener('click', () => { if (state !== 'run') start(); });
      body.querySelector('.snk__pad').addEventListener('click', (e) => { const b = e.target.closest('[data-d]'); if (b) turn(b.dataset.d); });
      win.el.addEventListener('keydown', (e) => {
        if (e.target.closest('a, .btn, .light, .win__back') && (e.key === ' ' || e.key === 'Enter')) return;
        if (KEYS[e.key]) { e.preventDefault(); if (state === 'pause') start(); turn(KEYS[e.key]); }
        else if (e.key === ' ') { e.preventDefault(); toggle(); }
      });
      // swipe to steer
      let sw = null;
      stage.addEventListener('pointerdown', (e) => { sw = { x: e.clientX, y: e.clientY }; });
      stage.addEventListener('pointerup', (e) => {
        if (!sw) return;
        const dx = e.clientX - sw.x, dy = e.clientY - sw.y; sw = null;
        if (Math.hypot(dx, dy) < 24) return;
        turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
      });
      stage.style.touchAction = 'none';

      const ro = new ResizeObserver(() => size());
      ro.observe(stage);
      const onTheme = () => { readColors(); draw(); };
      MOS.on('theme', onTheme);
      win.onCleanup(() => { cancelAnimationFrame(raf); ro.disconnect(); MOS.busy = false; });

      reset();
      setState('idle');
      size();
      raf = requestAnimationFrame(loop);
      win.startSnake = start;
    },
  };
})();
