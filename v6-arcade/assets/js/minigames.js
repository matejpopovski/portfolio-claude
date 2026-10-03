/*
 * minigames.js: the two cabinets you can actually play.
 *  - Snake, with a "watch the AI" mode (BFS to the food, but only when it can still
 *    reach its own tail afterwards; otherwise it chases its tail to stay alive).
 *  - Wordle, using the word list in shared/data.js.
 * Each game returns { destroy, onKey, focus } so the CRT dialog can host it.
 */
(function () {
  'use strict';
  const A = window.ARC, P = window.PORTFOLIO, el = A.ui.el;
  const G = (A.games = {});
  const sfx = (n) => A.sound.sfx[n] && A.sound.sfx[n]();
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
  };
  A.input = A.input || {};

  /* ======================= SNAKE ======================= */
  G.snake = function (root) {
    const COLS = 21, ROWS = 15, CELL = 8;
    const DIRS = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
    const cv = A.canvas(COLS * CELL, ROWS * CELL), ctx = cv.getContext('2d');
    cv.className = 'snake-cv';
    cv.setAttribute('role', 'img');
    cv.setAttribute('aria-label', 'Snake board');
    const scoreEl = el('b', null, '000'), bestEl = el('b', null, '000'), modeEl = el('span', { class: 'g-mode' }, 'PLAYER 1');
    const live = el('p', { class: 'sr-only', 'aria-live': 'polite' });
    const btnStart = el('button', { class: 'btn play' }, '▶ START');
    const btnAI = el('button', { class: 'btn alt', 'aria-pressed': 'false' }, 'WATCH AI: OFF');
    root.append(
      el('div', { class: 'g-hud' }, el('span', null, 'SCORE ', scoreEl), modeEl, el('span', null, 'HI ', bestEl)),
      el('div', { class: 'snake-frame' }, cv),
      el('div', { class: 'actions' }, btnStart, btnAI),
      el('p', { class: 'g-help' }, 'Arrows or WASD to steer, swipe or D-pad on touch. T toggles the AI, which plans a path with breadth-first search and never traps itself if it can help it.'),
      live);

    let snake, dir, queue, food, running = false, alive = true, ai = false, score = 0, acc = 0, last = performance.now(), raf = 0, flash = 0;
    let best = store.get('arc-snake-best', 0);
    bestEl.textContent = String(best).padStart(3, '0');

    function reset() {
      snake = [{ x: 6, y: 7 }, { x: 5, y: 7 }, { x: 4, y: 7 }];
      dir = { x: 1, y: 0 }; queue = []; score = 0; acc = 0; alive = true;
      scoreEl.textContent = '000';
      placeFood();
    }
    function placeFood() {
      const occ = new Set(snake.map((s) => s.x + ',' + s.y)), free = [];
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (!occ.has(x + ',' + y)) free.push({ x, y });
      food = free.length ? free[Math.floor(Math.random() * free.length)] : null;
    }
    function start() {
      reset(); running = true;
      btnStart.textContent = '↻ RESTART';
      sfx('start');
      live.textContent = ai ? 'The AI is playing.' : 'Game started.';
    }
    function setAI(on) {
      ai = on;
      btnAI.textContent = 'WATCH AI: ' + (ai ? 'ON' : 'OFF');
      btnAI.setAttribute('aria-pressed', String(ai));
      modeEl.textContent = ai ? 'AI PLAYING' : 'PLAYER 1';
      modeEl.classList.toggle('ai', ai);
      if (ai && !running) start();
    }
    function turn(d) {
      if (ai) setAI(false);
      if (!running) { start(); }
      const lastD = queue.length ? queue[queue.length - 1] : dir;
      if (d.x === -lastD.x && d.y === -lastD.y) return;
      if (d.x === lastD.x && d.y === lastD.y) return;
      if (queue.length < 3) queue.push(d);
    }

    /* --- the AI --- */
    const idx = (p) => p.y * COLS + p.x;
    const inside = (p) => p.x >= 0 && p.y >= 0 && p.x < COLS && p.y < ROWS;
    function bfs(from, to, blocked) {
      const prev = new Int32Array(COLS * ROWS).fill(-1), seen = new Uint8Array(COLS * ROWS);
      const q = [from]; seen[idx(from)] = 1;
      for (let h = 0; h < q.length; h++) {
        const c = q[h];
        if (c.x === to.x && c.y === to.y) {
          const path = []; let k = idx(c);
          while (k !== idx(from)) { path.push({ x: k % COLS, y: (k / COLS) | 0 }); k = prev[k]; }
          return path.reverse();
        }
        for (const d of DIRS) {
          const n = { x: c.x + d.x, y: c.y + d.y }, ni = idx(n);
          if (!inside(n) || seen[ni] || (blocked[ni] && !(n.x === to.x && n.y === to.y))) continue;
          seen[ni] = 1; prev[ni] = idx(c); q.push(n);
        }
      }
      return null;
    }
    function blockedOf(body) { const b = new Uint8Array(COLS * ROWS); for (const s of body) b[idx(s)] = 1; return b; }
    function flood(from, blocked) {
      const seen = new Uint8Array(COLS * ROWS), q = [from]; seen[idx(from)] = 1; let n = 0;
      for (let h = 0; h < q.length; h++) { n++; const c = q[h]; for (const d of DIRS) { const m = { x: c.x + d.x, y: c.y + d.y }; if (inside(m) && !seen[idx(m)] && !blocked[idx(m)]) { seen[idx(m)] = 1; q.push(m); } } }
      return n;
    }
    function aiDir() {
      const head = snake[0], body = snake.slice(0, -1);
      if (food) {
        const path = bfs(head, food, blockedOf(body));
        if (path) {
          const sim = path.slice().reverse().concat(snake).slice(0, snake.length + 1);
          if (bfs(sim[0], sim[sim.length - 1], blockedOf(sim.slice(0, -1)))) return { x: path[0].x - head.x, y: path[0].y - head.y };
        }
      }
      // No safe route to food: pick the move that keeps the tail reachable and the most room open.
      let bestD = dir, bestScore = -1;
      for (const d of DIRS) {
        const n = { x: head.x + d.x, y: head.y + d.y };
        if (!inside(n) || blockedOf(body)[idx(n)]) continue;
        const sim = [n].concat(snake).slice(0, snake.length);
        const blocked = blockedOf(sim.slice(0, -1));
        const tailOk = bfs(n, sim[sim.length - 1], blocked) ? 1000 : 0;
        const room = flood(n, blockedOf(sim));
        const far = food ? Math.abs(n.x - food.x) + Math.abs(n.y - food.y) : 0;
        const s = tailOk + room * 2 + far * 0.1;
        if (s > bestScore) { bestScore = s; bestD = d; }
      }
      return bestD;
    }

    function step() {
      if (ai) dir = aiDir(); else if (queue.length) dir = queue.shift();
      const h = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
      const eating = food && h.x === food.x && h.y === food.y;
      const body = eating ? snake : snake.slice(0, -1);
      if (!inside(h) || body.some((s) => s.x === h.x && s.y === h.y)) return die();
      snake.unshift(h);
      if (eating) {
        score++; flash = 1;
        scoreEl.textContent = String(score).padStart(3, '0');
        sfx('eat');
        placeFood();
        if (!food) { running = false; live.textContent = 'Board cleared!'; sfx('win'); }
      } else snake.pop();
    }
    function die() {
      running = false; alive = false;
      sfx('die');
      if (score > best && !ai) { best = score; store.set('arc-snake-best', best); bestEl.textContent = String(best).padStart(3, '0'); }
      btnStart.textContent = '▶ PLAY AGAIN';
      live.textContent = 'Game over. Score ' + score + '.';
      if (ai) setTimeout(() => { if (ai && !running) start(); }, 1400);
    }

    function draw(now) {
      ctx.fillStyle = '#03140a'; ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.fillStyle = '#062014';
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if ((x + y) % 2) ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
      if (food) {
        const fx = food.x * CELL, fy = food.y * CELL;
        ctx.fillStyle = '#ff4d4d'; ctx.fillRect(fx + 1, fy + 2, 6, 5); ctx.fillRect(fx + 2, fy + 1, 4, 7);
        ctx.fillStyle = '#ffb0b0'; ctx.fillRect(fx + 2, fy + 2, 1, 2);
        ctx.fillStyle = '#5dff7a'; ctx.fillRect(fx + 4, fy, 2, 1);
      }
      if (snake) snake.forEach((s, i) => {
        const k = 1 - i / (snake.length + 4);
        ctx.fillStyle = i === 0 ? '#d8ffe0' : 'rgb(' + Math.round(40 + 53 * k) + ',' + Math.round(140 + 115 * k) + ',' + Math.round(70 + 52 * k) + ')';
        ctx.fillRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2);
        if (i > 0) { const p = snake[i - 1]; ctx.fillRect(Math.min(s.x, p.x) * CELL + 1 + (s.x !== p.x ? 3 : 0), Math.min(s.y, p.y) * CELL + 1 + (s.y !== p.y ? 3 : 0), s.x !== p.x ? CELL : CELL - 2, s.y !== p.y ? CELL : CELL - 2); }
        if (i === 0) {
          ctx.fillStyle = '#03140a';
          const ex = s.x * CELL + 3 + dir.x * 2, ey = s.y * CELL + 3 + dir.y * 2;
          if (dir.x) { ctx.fillRect(ex, ey - 1, 1, 1); ctx.fillRect(ex, ey + 2, 1, 1); } else { ctx.fillRect(ex - 1, ey, 1, 1); ctx.fillRect(ex + 2, ey, 1, 1); }
        }
      });
      if (flash > 0) { ctx.fillStyle = 'rgba(93,255,122,' + flash * 0.15 + ')'; ctx.fillRect(0, 0, cv.width, cv.height); flash = Math.max(0, flash - 0.08); }
      if (!running) {
        ctx.fillStyle = 'rgba(3,20,10,0.72)'; ctx.fillRect(0, 44, cv.width, 34);
        const msg = alive ? 'PRESS START' : 'GAME OVER';
        A.drawText(ctx, msg, (cv.width - A.textWidth(msg, 2)) / 2, 50, alive ? '#ffd23f' : '#ff4d4d', 2);
        const sub = alive ? 'OR WATCH THE AI' : 'SCORE ' + score;
        if (Math.floor(now / 500) % 2 || A.reduced()) A.drawText(ctx, sub, (cv.width - A.textWidth(sub)) / 2, 66, '#d8ffe0');
      } else if (ai) A.drawText(ctx, 'AI', cv.width - 10, 2, Math.floor(now / 400) % 2 ? '#36f9f6' : '#13606a');
    }
    function loop(now) {
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      if (running) {
        const rate = ai ? 0.05 : Math.max(0.065, 0.13 - score * 0.003);
        acc += dt;
        while (acc >= rate && running) { acc -= rate; step(); }
      }
      draw(now);
      raf = requestAnimationFrame(loop);
    }
    reset();
    raf = requestAnimationFrame(loop);

    btnStart.addEventListener('click', () => start());
    btnAI.addEventListener('click', () => setAI(!ai));
    let sw = null;
    cv.addEventListener('pointerdown', (e) => { sw = { x: e.clientX, y: e.clientY }; });
    cv.addEventListener('pointerup', (e) => {
      if (!sw) return;
      const dx = e.clientX - sw.x, dy = e.clientY - sw.y; sw = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) { if (!running) start(); return; }
      turn(Math.abs(dx) > Math.abs(dy) ? { x: Math.sign(dx), y: 0 } : { x: 0, y: Math.sign(dy) });
    });
    A.input.dirHandler = (d) => turn(Math.abs(d.x) >= Math.abs(d.y) && d.x ? { x: d.x, y: 0 } : { x: 0, y: d.y });
    A.input.actionHandler = () => { if (!running) start(); };

    const KEYDIR = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0], W: [0, -1], S: [0, 1], A: [-1, 0], D: [1, 0] };
    return {
      focus: btnStart,
      onKey(e) {
        if (e.ctrlKey || e.metaKey || e.altKey) return false;
        const kd = KEYDIR[e.key];
        if (kd) { e.preventDefault(); turn({ x: kd[0], y: kd[1] }); return true; }
        if (e.key === 't' || e.key === 'T') { setAI(!ai); return true; }
        const onBtn = e.target && (e.target.tagName === 'BUTTON' || e.target.tagName === 'A');
        if ((e.key === ' ' || e.key === 'Enter') && !onBtn) { e.preventDefault(); if (!running) start(); return true; }
        return false;
      },
      destroy() { cancelAnimationFrame(raf); running = false; A.input.dirHandler = null; A.input.actionHandler = null; },
    };
  };

  /* ======================= WORDLE ======================= */
  G.wordle = function (root) {
    const words = (P.words || []).map((w) => String(w).toUpperCase()).filter((w) => /^[A-Z]{5}$/.test(w));
    if (!words.length) words.push('PIXEL');
    let answer = '', row = 0, col = 0, done = false, grid = [], keyState = {}, lastAnswer = '';
    const board = el('div', { class: 'wd-board', tabindex: '0', role: 'grid', 'aria-label': 'Wordle board. Type letters, Enter to guess, Backspace to delete.' });
    const rows = [];
    for (let r = 0; r < 6; r++) {
      const rowEl = el('div', { class: 'wd-row', role: 'row' });
      const tiles = [];
      for (let c = 0; c < 5; c++) { const t = el('div', { class: 'wd-tile', role: 'gridcell' }); tiles.push(t); rowEl.append(t); }
      rows.push({ el: rowEl, tiles });
      board.append(rowEl);
    }
    const msg = el('p', { class: 'wd-msg', 'aria-live': 'polite' }, 'Guess the hidden five-letter word in six tries.');
    const kb = el('div', { class: 'wd-kb' });
    const keyEls = {};
    ['QWERTYUIOP', 'ASDFGHJKL', '⏎ZXCVBNM⌫'].forEach((line) => {
      const r = el('div', { class: 'wd-kr' });
      for (const ch of line) {
        const label = ch === '⏎' ? 'ENTER' : ch === '⌫' ? 'DEL' : ch;
        const b = el('button', { class: 'wd-key' + (ch === '⏎' || ch === '⌫' ? ' wide' : ''), 'data-k': ch, 'aria-label': ch === '⏎' ? 'Enter' : ch === '⌫' ? 'Backspace' : ch }, label);
        b.addEventListener('click', () => press(ch));
        if (/[A-Z]/.test(ch)) keyEls[ch] = b;
        r.append(b);
      }
      kb.append(r);
    });
    const btnNew = el('button', { class: 'btn alt sm' }, 'NEW WORD');
    btnNew.addEventListener('click', () => { newGame(); board.focus(); });
    root.append(el('div', { class: 'wd' }, board, msg, kb, el('div', { class: 'actions' }, btnNew,
      el('span', { class: 'g-help' }, 'Green: right spot. Yellow: in the word. Grey: not in it.'))));

    function newGame() {
      do { answer = words[Math.floor(Math.random() * words.length)]; } while (words.length > 1 && answer === lastAnswer);
      lastAnswer = answer;
      row = 0; col = 0; done = false; keyState = {};
      grid = Array.from({ length: 6 }, () => Array(5).fill(''));
      rows.forEach((r) => { r.el.className = 'wd-row'; r.tiles.forEach((t) => { t.textContent = ''; t.className = 'wd-tile'; t.removeAttribute('aria-label'); }); });
      Object.values(keyEls).forEach((k) => { k.className = 'wd-key'; });
      msg.textContent = 'Guess the hidden five-letter word in six tries.';
    }
    function score(g, a) {
      const res = Array(5).fill('b'), cnt = {};
      for (let i = 0; i < 5; i++) { if (g[i] === a[i]) res[i] = 'g'; else cnt[a[i]] = (cnt[a[i]] || 0) + 1; }
      for (let i = 0; i < 5; i++) if (res[i] !== 'g' && cnt[g[i]] > 0) { res[i] = 'y'; cnt[g[i]]--; }
      return res;
    }
    function press(ch) {
      if (done) { if (ch === '⏎') newGame(); return; }
      if (ch === '⌫') {
        if (col > 0) { col--; grid[row][col] = ''; const t = rows[row].tiles[col]; t.textContent = ''; t.classList.remove('filled'); }
        return;
      }
      if (ch === '⏎') return submit();
      if (!/^[A-Z]$/.test(ch) || col >= 5) return;
      grid[row][col] = ch;
      const t = rows[row].tiles[col];
      t.textContent = ch; t.classList.add('filled');
      col++;
      sfx('tick');
    }
    function submit() {
      if (col < 5) {
        msg.textContent = 'Not enough letters.';
        const r = rows[row].el; r.classList.remove('shake'); void r.offsetWidth; r.classList.add('shake');
        sfx('error');
        return;
      }
      const guess = grid[row].join(''), res = score(guess, answer);
      const NAMES = { g: 'correct', y: 'in the word', b: 'not in the word' };
      rows[row].tiles.forEach((t, i) => {
        t.style.animationDelay = (A.reduced() ? 0 : i * 110) + 'ms';
        t.classList.add('rev', res[i]);
        t.setAttribute('aria-label', guess[i] + ', ' + NAMES[res[i]]);
        const prevS = keyState[guess[i]];
        if (res[i] === 'g' || (res[i] === 'y' && prevS !== 'g') || (res[i] === 'b' && !prevS)) keyState[guess[i]] = res[i];
      });
      setTimeout(() => { for (const k in keyState) if (keyEls[k]) keyEls[k].className = 'wd-key ' + keyState[k]; }, A.reduced() ? 0 : 600);
      sfx('select');
      if (guess === answer) {
        done = true;
        msg.textContent = ['GENIUS!', 'MAGNIFICENT!', 'IMPRESSIVE!', 'SPLENDID!', 'GREAT!', 'PHEW!'][row] + ' The word was ' + answer + '. Press Enter for another.';
        setTimeout(() => { sfx('win'); A.ui.confetti(90); }, A.reduced() ? 0 : 650);
      } else if (row === 5) {
        done = true;
        msg.textContent = 'Out of guesses. The word was ' + answer + '. Press Enter to try another.';
        setTimeout(() => sfx('die'), 600);
      } else {
        row++; col = 0;
        msg.textContent = (6 - row) + ' guesses left.';
      }
    }
    newGame();
    return {
      focus: board,
      onKey(e) {
        if (e.ctrlKey || e.metaKey || e.altKey) return false;
        if (/^[a-zA-Z]$/.test(e.key)) { e.preventDefault(); press(e.key.toUpperCase()); return true; }
        if (e.key === 'Backspace') { e.preventDefault(); press('⌫'); return true; }
        if (e.key === 'Enter') {
          const t = e.target;
          if (t && (t.tagName === 'A' || (t.tagName === 'BUTTON' && !t.classList.contains('wd-key')))) return false;
          e.preventDefault(); press('⏎'); return true;
        }
        return false;
      },
      destroy() { /* nothing running */ },
    };
  };
})();
