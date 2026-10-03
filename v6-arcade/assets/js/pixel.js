/*
 * pixel.js: the arcade's tiny graphics kit.
 * A 3x5 bitmap font, sprite builders (sprites are strings of palette letters),
 * procedural props (cabinets, kiosk, phone booth...) and the little attract-mode
 * loops that play on each cabinet's screen.
 */
(function () {
  'use strict';
  const A = (window.ARC = window.ARC || {});

  const PAL = (A.PAL = {
    void: '#07040f', ink: '#120a24', night: '#0b0618', outline: '#0a0614',
    pink: '#ff3d8b', cyan: '#36f9f6', yellow: '#ffd23f', orange: '#ff8a3d',
    green: '#5dff7a', purple: '#a35dff', blue: '#3a7bff', red: '#ff4d4d',
    white: '#f4f1ff', grey: '#8f97b8',
  });

  /* ---------- helpers ---------- */
  const cv = (A.canvas = function (w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    return c;
  });

  function hexToRgb(h) {
    h = h.replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  /** Lighten (amt > 0) or darken (amt < 0) a hex color. */
  const shade = (A.shade = function (hex, amt) {
    const [r, g, b] = hexToRgb(hex);
    const t = amt < 0 ? 0 : 255, p = Math.abs(amt);
    const f = (v) => Math.round(v + (t - v) * p);
    return 'rgb(' + f(r) + ',' + f(g) + ',' + f(b) + ')';
  });
  A.rgba = function (hex, a) {
    const [r, g, b] = hexToRgb(hex);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  };

  /** Small deterministic PRNG so props look hand-placed but never change. */
  const rng = (A.rng = function (seed) {
    let s = seed >>> 0;
    return function () {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  });
  A.hash = function (str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  };

  /* ---------- 3x5 bitmap font ---------- */
  const GLYPHS = {
    A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110',
    E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101',
    I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
    M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100',
    Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
    U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101',
    Y: '101101010010010', Z: '111001010100111',
    0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110',
    4: '101101111001001', 5: '111100110001110', 6: '011100111101111', 7: '111001010010010',
    8: '111101111101111', 9: '111101111001110',
    ' ': '000000000000000', '.': '000000000000010', ',': '000000000010100', '!': '010010010000010',
    '?': '110001010000010', '-': '000000111000000', '+': '000010111010000', ':': '000010000010000',
    '/': '001001010100100', "'": '010010000000000', '&': '010101010101011', '(': '010100100100010',
    ')': '010001001001010', '#': '101111101111101', '%': '101001010100101', '·': '000000010000000',
    '=': '000111000111000', '>': '100010001010100', '<': '001010100010001', '*': '000101010101000',
    '_': '000000000000111', '^': '010101000000000', '♥': '101111111010000', '"': '101101000000000',
    '@': '111101111100011',
  };
  const norm = (A.norm = function (s) {
    return String(s).toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[–—]/g, '-').replace(/[’‘]/g, "'").replace(/[“”]/g, '"');
  });
  A.textWidth = function (s, sc) { const n = norm(s).length; return n ? (n * 4 - 1) * (sc || 1) : 0; };
  A.drawText = function (ctx, s, x, y, color, sc) {
    sc = sc || 1;
    s = norm(s);
    ctx.fillStyle = color;
    let cx = Math.round(x); y = Math.round(y);
    for (const ch of s) {
      const g = GLYPHS[ch] || GLYPHS[' '];
      for (let i = 0; i < 15; i++) if (g.charCodeAt(i) === 49) ctx.fillRect(cx + (i % 3) * sc, y + ((i / 3) | 0) * sc, sc, sc);
      cx += 4 * sc;
    }
  };
  const textCache = new Map();
  A.textCanvas = function (s, color, sc) {
    sc = sc || 1;
    const key = s + '|' + color + '|' + sc;
    let c = textCache.get(key);
    if (!c) {
      c = cv(Math.max(1, A.textWidth(s, sc)), 5 * sc);
      A.drawText(c.getContext('2d'), s, 0, 0, color, sc);
      textCache.set(key, c);
    }
    return c;
  };

  /* ---------- sprite strings ---------- */
  A.sprite = function (rows, map) {
    const h = rows.length, w = rows[0].length;
    const c = cv(w, h), x = c.getContext('2d');
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const col = map[rows[j][i]];
      if (col) { x.fillStyle = col; x.fillRect(i, j, 1, 1); }
    }
    return c;
  };
  A.flip = function (src) {
    const c = cv(src.width, src.height), x = c.getContext('2d');
    x.translate(src.width, 0); x.scale(-1, 1); x.drawImage(src, 0, 0);
    return c;
  };

  // The player: a small robot (a nod to the robotics work). 12x14.
  const R_HEAD_DOWN = [
    '.....rr.....', '.....kk.....', '..kkkkkkkk..', '.kwwwwwwwwk.', '.kwkkkkkkwk.',
    '.kwkckkckwk.', '.kwkkkkkkwk.', '.kwwwwwwwwk.', '..kkkkkkkk..', '.kbbbyybbbk.',
    'kgkbbbbbbkgk', 'kgkddddddkgk'];
  const R_HEAD_UP = [
    '.....rr.....', '.....kk.....', '..kkkkkkkk..', '.kwwwwwwwwk.', '.kwwggggwwk.',
    '.kwwgkkgwwk.', '.kwwggggwwk.', '.kwwwwwwwwk.', '..kkkkkkkk..', '.kbbbbbbbbk.',
    'kgkbbbbbbkgk', 'kgkddddddkgk'];
  const R_HEAD_SIDE = [
    '....rr......', '.....k......', '..kkkkkkkk..', '.kwwwwwwwwk.', '.kwwwwkkkkk.',
    '.kwwwwkkkck.', '.kwwwwkkkkk.', '.kwwwwwwwwk.', '..kkkkkkkk..', '..kbbbbbbk..',
    '..kbbggbbk..', '..kddggddk..'];
  const LEGS = {
    front: [['..kk....kk..', '..kk....kk..'], ['..kk....kk..', '..kk........'], ['..kk....kk..', '........kk..']],
    side: [['...kk..kk...', '...kk..kk...'], ['...kk..kk...', '..kk....kk..'], ['....kkkk....', '....kkkk....']],
  };
  const ROBOT_PAL = { k: '#140c26', w: '#e9ecf5', g: '#8f97b8', c: '#36f9f6', r: '#ff3d8b', y: '#ffd23f', b: '#3a7bff', d: '#2448b8' };
  const GOLD_PAL = Object.assign({}, ROBOT_PAL, { w: '#fff3c0', b: '#ffc93f', d: '#c8901a', g: '#e0a84a', y: '#ffffff' });
  const robotCache = new Map();
  /** dir: down|up|left|right, frame: 0 stand, 1/2 walk. */
  A.robot = function (dir, frame, opts) {
    opts = opts || {};
    const key = dir + frame + (opts.blink ? 'b' : '') + (opts.gold ? 'g' : '') + (opts.antennaOff ? 'a' : '');
    let s = robotCache.get(key);
    if (s) return s;
    const side = dir === 'left' || dir === 'right';
    const head = dir === 'up' ? R_HEAD_UP : side ? R_HEAD_SIDE : R_HEAD_DOWN;
    const rows = head.concat(LEGS[side ? 'side' : 'front'][frame]);
    const pal = Object.assign({}, opts.gold ? GOLD_PAL : ROBOT_PAL);
    if (opts.blink) pal.c = pal.k;
    if (opts.antennaOff) pal.r = '#5a1a3a';
    s = A.sprite(rows, pal);
    if (dir === 'left') s = A.flip(s);
    robotCache.set(key, s);
    return s;
  };

  // People in the Hall of Fame. 10x14, palette-swapped.
  const PERSON = [
    '...kkkk...', '..khhhhk..', '.khhhhhhk.', '.khsssshk.', '.ksessesk.', '.kssssssk.', '..kssssk..',
    '.kttTTttk.', 'kttttttttk', 'ksttttttsk', 'kkttttttkk', '.kppppppk.', '.kppkkppk.', '.kkk..kkk.'];
  A.person = function (o) {
    const rows = PERSON.map((r) => r);
    const pal = { k: '#140c26', h: o.hair, s: o.skin, e: '#140c26', t: o.shirt, T: o.tie || o.shirt, p: o.pants };
    const body = A.sprite(rows, pal);
    if (!o.cap) return body;
    // Graduation cap for education entries.
    const c = cv(12, 17), x = c.getContext('2d');
    x.drawImage(body, 1, 3);
    const cap = A.sprite(['....kkkk....', 'kkkkkkkkkkkk', '..kkkkkkkky.', '.........y..'],
      { k: '#1b1440', y: '#ffd23f' });
    x.drawImage(cap, 0, 0);
    return c;
  };

  A.cat = A.sprite([
    '...k.k......', '..kokok.....', '..koooo..kk.', '.koooooook.k', '.kooooooooko', '..kkkkkkkkk.'],
  { k: '#140c26', o: '#ff9a4d' });
  A.duck = A.sprite([
    '..kkk...', '.kyyyk..', '.kyykyoo', '..kyyk..', 'kkyyyykk', 'kyyyyyyk', '.kkkkkk.'],
  { k: '#140c26', y: '#ffd23f', o: '#ff8a3d' });
  A.coin = A.sprite([
    '..kkkk..', '.kyyyyk.', 'kyhyyyok', 'kyhyyyok', 'kyyyyyok', 'kyyyyyok', '.kyyook.', '..kkkk..'],
  { k: '#5a3a08', y: '#ffd23f', h: '#fff6c8', o: '#e08a1a' });

  /* ---------- procedural props ---------- */
  function painter(c) {
    const x = c.getContext('2d');
    return (px, py, w, h, col) => { x.fillStyle = col; x.fillRect(px, py, w, h); };
  }
  const O = PAL.outline;

  /** Arcade cabinet, 26x40. The screen (5,12,16x11) and marquee (3,3,20x5) are painted live. */
  A.makeCabinet = function (main, dark, accent, seed) {
    const c = cv(26, 40), R = painter(c);
    R(1, 0, 24, 40, O); R(0, 1, 26, 38, O);
    R(2, 1, 22, 38, main);
    R(2, 1, 2, 38, shade(main, 0.18)); R(22, 1, 2, 38, dark);
    R(2, 1, 22, 1, shade(main, 0.35));
    R(1, 9, 1, 28, accent); R(24, 9, 1, 28, accent);       // LED T-molding
    R(2, 2, 22, 7, O); R(3, 3, 20, 5, '#160b22');           // marquee housing
    R(3, 2, 20, 1, shade(accent, -0.4));
    R(3, 10, 20, 14, '#05030a'); R(4, 11, 18, 12, '#1a1430'); // bezel
    R(2, 24, 22, 1, shade(main, 0.45)); R(2, 25, 22, 4, shade(main, 0.22)); // control panel
    R(6, 23, 3, 2, '#ff4d4d'); R(7, 23, 1, 1, '#ffb0b0'); R(7, 25, 1, 2, O);
    R(13, 26, 2, 1, '#ffd23f'); R(16, 26, 2, 1, '#36f9f6'); R(19, 26, 2, 1, '#ff3d8b');
    R(13, 27, 2, 1, shade('#ffd23f', -0.5)); R(16, 27, 2, 1, shade('#36f9f6', -0.5)); R(19, 27, 2, 1, shade('#ff3d8b', -0.5));
    R(2, 29, 22, 1, dark);
    const r = rng(seed || 1);
    for (let i = 0; i < 3; i++) {                                // side art: little diagonal flashes
      const yy = 31 + i * 2, len = 2 + Math.floor(r() * 3);
      for (let k = 0; k < len; k++) { R(3 + k + i, yy + (k % 2), 1, 1, shade(accent, -0.25)); R(22 - k - i, yy + (k % 2), 1, 1, shade(accent, -0.25)); }
    }
    R(9, 30, 8, 7, O); R(10, 31, 6, 5, dark);                   // coin door
    R(11, 32, 1, 2, '#ff8a3d'); R(14, 32, 1, 2, '#ff8a3d');
    R(2, 37, 22, 2, O); R(3, 37, 20, 1, '#1d1430');
    return c;
  };

  A.makeKiosk = function () {
    const c = cv(16, 28), R = painter(c);
    R(5, 11, 6, 15, O); R(6, 11, 4, 15, '#3b3f66'); R(6, 11, 1, 15, '#565c90');
    R(0, 0, 16, 12, O); R(1, 1, 14, 10, '#2b2f55'); R(1, 1, 14, 1, '#4b5190');
    R(2, 2, 12, 8, '#06232a');
    R(2, 25, 12, 3, O); R(3, 25, 10, 2, '#2b2f55');
    return c;
  };
  A.makePhone = function () {
    const c = cv(18, 34), R = painter(c);
    R(0, 0, 18, 34, O);
    R(1, 1, 16, 32, '#c8283c'); R(1, 1, 2, 32, '#e8485c'); R(15, 1, 2, 32, '#8a1426');
    R(2, 2, 14, 6, '#1a0a14');
    A.drawText(c.getContext('2d'), 'TEL', 4, 3, '#ffd23f');
    for (let row = 0; row < 3; row++) for (let col = 0; col < 2; col++) {
      R(3 + col * 6, 10 + row * 6, 5, 5, '#0f2a3d'); R(3 + col * 6, 10 + row * 6, 2, 1, '#7fd8ff'); R(3 + col * 6, 10 + row * 6, 1, 2, '#7fd8ff');
    }
    R(13, 20, 1, 3, '#ffd23f');
    R(1, 29, 16, 4, '#8a1426'); R(1, 31, 16, 2, O);
    return c;
  };
  A.makeVending = function () {
    const c = cv(16, 32), R = painter(c);
    R(0, 0, 16, 32, O); R(1, 1, 14, 30, '#e9ecf5'); R(1, 1, 14, 5, '#3a7bff');
    A.drawText(c.getContext('2d'), 'POP', 2, 1, '#ffffff');
    R(2, 7, 9, 18, '#0c1630');
    const cans = ['#ff3d8b', '#ffd23f', '#5dff7a', '#36f9f6', '#ff8a3d', '#a35dff'];
    for (let row = 0; row < 4; row++) for (let i = 0; i < 3; i++) { R(3 + i * 3, 8 + row * 4, 2, 3, cans[(row * 3 + i) % cans.length]); R(3 + i * 3, 8 + row * 4, 1, 1, '#fff'); }
    R(12, 8, 2, 2, '#ff4d4d'); R(12, 11, 2, 1, '#2b2f4a'); R(12, 13, 2, 4, '#2b2f4a');
    R(2, 26, 9, 3, '#1b1b2a'); R(1, 30, 14, 1, '#8f97b8');
    return c;
  };
  A.makeClaw = function () {
    const c = cv(30, 40), R = painter(c);
    R(0, 0, 30, 40, O);
    R(1, 1, 28, 5, '#a35dff'); A.drawText(c.getContext('2d'), 'CLAW!', 5, 1, '#ffd23f');
    R(1, 6, 28, 18, '#12223d'); R(2, 7, 1, 16, 'rgba(255,255,255,0.25)'); R(1, 6, 28, 1, '#5f6aa0');
    const prizes = ['#ff3d8b', '#ffd23f', '#5dff7a', '#36f9f6', '#ff8a3d', '#e9ecf5'];
    const r = rng(77);
    for (let i = 0; i < 14; i++) { const px = 2 + Math.floor(r() * 24), py = 17 + Math.floor(r() * 5); R(px, py, 3, 2, prizes[i % 6]); R(px + 1, py - 1, 1, 1, prizes[i % 6]); }
    R(1, 24, 28, 2, '#7a3ac0'); R(1, 26, 28, 13, '#5a2a96'); R(1, 26, 2, 13, '#7a3ac0');
    R(6, 28, 3, 2, '#ff4d4d'); R(7, 30, 1, 2, O); R(18, 29, 3, 1, '#ffd23f');
    R(12, 33, 6, 4, O); R(14, 34, 2, 2, '#ff8a3d');
    return c;
  };
  A.makeShelf = function (seed) {
    const c = cv(30, 36), R = painter(c);
    R(0, 0, 30, 36, O); R(1, 1, 28, 34, '#5a3418'); R(1, 1, 28, 2, '#7a4a24');
    const r = rng(seed || 9), cols = ['#ff3d8b', '#36f9f6', '#ffd23f', '#5dff7a', '#a35dff', '#ff8a3d', '#e9ecf5', '#3a7bff'];
    for (let s = 0; s < 4; s++) {
      const y0 = 4 + s * 8;
      R(2, y0, 26, 7, '#24140a');
      let x = 2;
      while (x < 27) {
        const w = 1 + Math.floor(r() * 2), h = 4 + Math.floor(r() * 3);
        if (x + w > 28) break;
        const col = cols[Math.floor(r() * cols.length)];
        R(x, y0 + 7 - h, w, h, col); R(x, y0 + 7 - h, w, 1, shade(col, 0.4));
        x += w + (r() < 0.2 ? 1 : 0);
      }
      R(1, y0 + 7, 28, 1, '#8a5a30');
    }
    return c;
  };
  A.makePlant = function () {
    return A.sprite([
      '....g..g....', '..g.gg.gg...', '.ggggggg.g..', 'gg.GgggGgg..', '.ggGggggGgg.', '..gggGgggg..', '...ggggGg...',
      '....kkkk....', '...kooook...', '...koOook...', '...kooook...', '....kook....', '....kkkk....'],
    { g: '#2fae5a', G: '#5dff7a', k: '#140c26', o: '#c8603a', O: '#e8805a' });
  };
  /** Hall-of-fame pedestal with a trophy and the year on the front. */
  A.makePlaque = function (year, kind) {
    const c = cv(16, 26), R = painter(c), x = c.getContext('2d');
    const cup = kind === 'edu' ? '#36f9f6' : kind === 'origin' ? '#5dff7a' : '#ffd23f';
    R(4, 0, 8, 1, O); R(3, 1, 10, 6, O); R(4, 1, 8, 5, cup); R(5, 1, 2, 4, '#ffffff'); // cup
    R(2, 2, 1, 3, cup); R(13, 2, 1, 3, cup);
    R(6, 7, 4, 2, O); R(7, 7, 2, 2, cup); R(5, 9, 6, 2, O); R(6, 9, 4, 1, shade(cup, -0.3));
    R(0, 11, 16, 15, O); R(1, 12, 14, 13, '#2a2148'); R(1, 12, 14, 1, '#4a3d7a');
    A.drawText(x, String(year).slice(0, 4), 1, 16, '#ffd23f');
    R(1, 23, 14, 2, '#1a1430');
    return c;
  };
  /** The 2016 "first line of code" machine: an old beige PC. */
  A.makePC = function () {
    const c = cv(18, 24), R = painter(c);
    R(1, 0, 16, 13, O); R(2, 1, 14, 11, '#d8cfae'); R(2, 1, 14, 1, '#efe7c8');
    R(4, 2, 10, 8, '#0a1a0a');
    R(6, 12, 6, 2, O); R(7, 12, 4, 2, '#b8ae8c');
    R(0, 14, 18, 3, O); R(1, 14, 16, 2, '#d8cfae'); for (let i = 0; i < 7; i++) R(2 + i * 2, 15, 1, 1, '#8a8068');
    R(0, 17, 18, 7, O); R(1, 17, 16, 6, '#6a4424'); R(2, 18, 14, 1, '#8a5a30');
    return c;
  };
  A.makeCounter = function (w) {
    const c = cv(w, 22), R = painter(c), x = c.getContext('2d');
    R(0, 0, w, 22, O);
    R(1, 1, w - 2, 5, '#c8884a'); R(1, 1, w - 2, 1, '#e8a86a');
    R(1, 6, w - 2, 15, '#7a4424');
    for (let i = 8; i < w - 4; i += 16) { R(i, 8, 12, 11, '#6a3818'); R(i, 8, 12, 1, '#8a5430'); }
    // register + goods on the counter top
    R(6, 0, 12, 4, '#3b3f66'); R(7, 1, 10, 2, '#5dff7a');
    const msg = 'ALL ITEMS OWNED'; A.drawText(x, msg, Math.floor((w - A.textWidth(msg)) / 2), 10, '#ffd23f');
    return c;
  };
  A.makeDesk = function () {
    const c = cv(32, 18), R = painter(c);
    R(0, 4, 32, 14, O); R(1, 5, 30, 4, '#7a4a24'); R(1, 5, 30, 1, '#9a6a3a');
    R(2, 9, 3, 8, '#5a3418'); R(27, 9, 3, 8, '#5a3418');
    R(17, 0, 12, 6, O); R(18, 1, 10, 4, '#2b2f55'); R(19, 2, 8, 2, '#36f9f6'); // laptop
    R(16, 6, 14, 1, '#8f97b8');
    return c;
  };

  /* ---------- glow sprites for the bloom pass ---------- */
  const glowCache = new Map();
  A.glow = function (color, r) {
    const key = color + r;
    let c = glowCache.get(key);
    if (!c) {
      c = document.createElement('canvas');
      c.width = c.height = r * 2;
      const x = c.getContext('2d');
      const g = x.createRadialGradient(r, r, 0, r, r, r);
      g.addColorStop(0, A.rgba(color, 0.9)); g.addColorStop(0.35, A.rgba(color, 0.35)); g.addColorStop(1, A.rgba(color, 0));
      x.fillStyle = g; x.fillRect(0, 0, r * 2, r * 2);
      glowCache.set(key, c);
    }
    return c;
  };

  /* ---------- identicon "items" for skills ---------- */
  A.itemIcon = function (name) {
    const r = rng(A.hash(name));
    const cols = ['#ff3d8b', '#36f9f6', '#ffd23f', '#5dff7a', '#a35dff', '#ff8a3d', '#3a7bff'];
    const col = cols[Math.floor(r() * cols.length)], col2 = cols[Math.floor(r() * cols.length)];
    const c = cv(9, 9), x = c.getContext('2d');
    for (let j = 0; j < 7; j++) for (let i = 0; i < 4; i++) {
      const v = r();
      if (v < 0.5) continue;
      x.fillStyle = v > 0.82 ? col2 : col;
      x.fillRect(1 + i, 1 + j, 1, 1); x.fillRect(7 - i, 1 + j, 1, 1);
    }
    return c;
  };

  /* ---------- cabinet attract loops ---------- */
  // Each theme draws into (x, y, w, h) at time t. They work at 16x11 (cabinet) and bigger (dialogs).
  const T = (A.themes = {});
  function bg(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }
  function px(ctx, x, y, s, c) { ctx.fillStyle = c; ctx.fillRect(Math.floor(x), Math.floor(y), s, s); }
  const unit = (h) => Math.max(1, Math.floor(h / 11));

  T.snake = function (ctx, x, y, w, h, t) {
    bg(ctx, x, y, w, h, '#03140a');
    const s = unit(h), cols = Math.floor(w / s), rows = Math.floor(h / s) - (Math.floor(h / s) % 2);
    const ox = x + Math.floor((w - cols * s) / 2), oy = y + Math.floor((h - rows * s) / 2);
    // Hamiltonian zig-zag: the kind of path a cautious snake AI loves.
    const path = [];
    for (let r = 0; r < rows; r++) {
      if (r % 2 === 0) for (let c = 1; c < cols; c++) path.push([c, r]);
      else for (let c = cols - 1; c >= 1; c--) path.push([c, r]);
    }
    for (let r = rows - 1; r >= 0; r--) path.push([0, r]);
    const L = path.length, step = Math.floor(t * 12), head = step % L;
    const eaten = Math.floor(step / 23), len = 3 + (eaten % 9);
    const food = path[((eaten + 1) * 23) % L];
    if (Math.floor(t * 4) % 2 === 0 || s > 1) px(ctx, ox + food[0] * s, oy + food[1] * s, s, '#ff4d4d');
    for (let i = len; i >= 0; i--) {
      const p = path[(head - i + L * 4) % L];
      px(ctx, ox + p[0] * s, oy + p[1] * s, s, i === 0 ? '#d8ffe0' : i % 2 ? '#5dff7a' : '#2fae5a');
    }
  };

  T.chess = function (ctx, x, y, w, h, t) {
    bg(ctx, x, y, w, h, '#1a0f08');
    const n = h >= 24 ? 8 : 4, s = Math.max(1, Math.floor(Math.min(w, h) / n));
    const ox = x + Math.floor((w - s * n) / 2), oy = y + Math.floor((h - s * n) / 2);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { ctx.fillStyle = (i + j) % 2 ? '#7a4a2a' : '#e8d6b0'; ctx.fillRect(ox + i * s, oy + j * s, s, s); }
    const tour = n === 4 ? [[0, 0], [1, 2], [3, 3], [2, 1]] : [[1, 7], [2, 5], [4, 4], [6, 5], [5, 3], [3, 2], [1, 3], [2, 5]];
    const k = Math.floor(t * 0.9), f = Math.min(1, (t * 0.9 - k) * 2.2);
    const a = tour[k % tour.length], b = tour[(k + 1) % tour.length];
    const e = f * f * (3 - 2 * f);
    const cx = ox + (a[0] + (b[0] - a[0]) * e) * s, cy = oy + (a[1] + (b[1] - a[1]) * e) * s - Math.sin(e * Math.PI) * s * 0.8;
    if (s >= 4) {
      const u = s / 4;
      ctx.fillStyle = '#140c26'; ctx.fillRect(cx + u * 0.5, cy + u * 0.5, u * 3, u * 3);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(cx + u, cy + u * 0.5, u * 2, u); ctx.fillRect(cx + u * 1.5, cy + u * 1.5, u * 1.5, u); ctx.fillRect(cx + u, cy + u * 2.5, u * 2, u);
    } else px(ctx, cx, cy, s, '#ff3d8b');
    const pawn = n === 4 ? [2, 3] : [5, 6];
    px(ctx, ox + pawn[0] * s + (s > 3 ? s / 4 : 0), oy + pawn[1] * s + (s > 3 ? s / 4 : 0), s > 3 ? s / 2 : s, '#140c26');
  };

  T.cards = function (ctx, x, y, w, h, t) {
    bg(ctx, x, y, w, h, '#0d5a32');
    const cw = Math.max(3, Math.floor(w / 4)), ch = Math.max(5, Math.floor(h * 0.68));
    const gap = Math.floor((w - cw * 3) / 4), cy = y + Math.floor((h - ch) / 2);
    for (let i = 0; i < 3; i++) {
      const c = Math.cos(t * 1.6 - i * 0.7), ww = Math.max(1, Math.round(cw * Math.abs(c)));
      const cx = x + gap + i * (cw + gap) + Math.floor((cw - ww) / 2);
      ctx.fillStyle = c > 0 ? '#f4f1ff' : '#ff3d8b'; ctx.fillRect(cx, cy, ww, ch);
      if (c > 0 && ww > 2) { const u = Math.max(1, Math.floor(ch / 5)); ctx.fillStyle = i === 1 ? '#140c26' : '#ff4d4d'; ctx.fillRect(cx + Math.floor(ww / 2) - Math.floor(u / 2), cy + Math.floor(ch / 2) - Math.floor(u / 2), u, u); }
      if (c <= 0 && ww > 2) { ctx.fillStyle = '#a3164f'; ctx.fillRect(cx + 1, cy + 1, ww - 2, ch - 2); }
    }
  };

  T.wordle = function (ctx, x, y, w, h, t) {
    bg(ctx, x, y, w, h, '#121213');
    const rows = 3, s = Math.max(2, Math.floor(Math.min((w - 4) / 5, (h - 2) / rows)) - 1), g = 1;
    const tw = 5 * (s + g) - g, th = rows * (s + g) - g;
    const ox = x + Math.floor((w - tw) / 2), oy = y + Math.floor((h - th) / 2);
    const k = Math.floor(t * 5) % 22, r = rng(Math.floor(t * 5 / 22) + 3);
    for (let j = 0; j < rows; j++) for (let i = 0; i < 5; i++) {
      const idx = j * 5 + i, v = r();
      let col = '#3a3a3c';
      if (idx < k) col = j === rows - 1 ? '#5dff7a' : v < 0.3 ? '#5dff7a' : v < 0.6 ? '#ffd23f' : '#5a5a6a';
      ctx.fillStyle = col; ctx.fillRect(ox + i * (s + g), oy + j * (s + g), s, s);
    }
  };

  T.particles = function (ctx, x, y, w, h, t) {
    bg(ctx, x, y, w, h, '#0a0d1f');
    const s = unit(h), n = s > 1 ? 70 : 14, cyc = 3.2, k = Math.floor(t / cyc), ph = (t % cyc) / cyc;
    const rx = x + w / 2 + Math.cos(t * 0.7) * w * 0.25, ry = y + h / 2 + Math.sin(t * 1.1) * h * 0.22;
    const r = rng(k * 31 + 7), e = 1 - Math.pow(1 - Math.min(1, ph * 1.4), 3);
    for (let i = 0; i < n; i++) {
      const sx = x + r() * w, sy = y + r() * h, j = (r() - 0.5) * (s * 3) * (1 - e * 0.7);
      px(ctx, sx + (rx - sx) * e * 0.9 + j, sy + (ry - sy) * e * 0.9 + j, s, e > 0.85 ? '#36f9f6' : '#2a8fa0');
    }
    px(ctx, rx - s, ry - s, s * 2, '#ffd23f');
  };

  T.chip = function (ctx, x, y, w, h, t) {
    bg(ctx, x, y, w, h, '#04121a');
    const s = unit(h), cs = Math.floor(h * 0.6), cx = x + Math.floor((w - cs) / 2), cy = y + Math.floor((h - cs) / 2);
    ctx.fillStyle = '#8f97b8';
    for (let i = s; i < cs - s; i += s * 2) { ctx.fillRect(cx + i, cy - s, s, s); ctx.fillRect(cx + i, cy + cs, s, s); ctx.fillRect(cx - s, cy + i, s, s); ctx.fillRect(cx + cs, cy + i, s, s); }
    ctx.fillStyle = '#20263a'; ctx.fillRect(cx, cy, cs, cs);
    ctx.fillStyle = '#2f3756'; ctx.fillRect(cx + s, cy + s, cs - 2 * s, cs - 2 * s);
    const scan = Math.floor(((t * 0.6) % 1) * h);
    const dx = cx + Math.floor(cs * 0.62), dy = cy + Math.floor(cs * 0.4);
    if (scan + y > dy) {
      ctx.fillStyle = '#ff4d4d';
      for (let i = 0; i < 3; i++) ctx.fillRect(dx - i * s, dy + i * s, s, s);
      if (s > 1) { ctx.strokeStyle = '#ff4d4d'; ctx.lineWidth = 1; ctx.strokeRect(dx - 4 * s + 0.5, dy - 2 * s + 0.5, 6 * s, 6 * s); }
    }
    ctx.fillStyle = 'rgba(54,249,246,0.8)'; ctx.fillRect(x, y + scan, w, s);
    ctx.fillStyle = 'rgba(54,249,246,0.18)'; ctx.fillRect(x, y + scan - 3 * s, w, 3 * s);
  };

  const HAND = ['..1.1.1..', '..1.1.1..', '.11111111', '.11111111', '1111111..', '.111111..', '..11111..', '..1111...'];
  T.hand = function (ctx, x, y, w, h, t) {
    bg(ctx, x, y, w, h, '#10101e');
    const s = Math.max(1, Math.floor(h / 11)), hw = 9 * s, hh = 8 * s;
    const ox = x + Math.floor((w - hw) / 2 + Math.sin(t * 3) * s * 1.5), oy = y + Math.floor((h - hh) / 2);
    ctx.fillStyle = '#ffcfa0';
    HAND.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] === '1') ctx.fillRect(ox + i * s, oy + j * s, s, s); });
    if (Math.floor(t * 2) % 3) {
      ctx.fillStyle = '#5dff7a';
      const bx = ox - s, by = oy - s, bw = hw + 2 * s, bh = hh + 2 * s;
      ctx.fillRect(bx, by, bw, Math.max(1, s / 2)); ctx.fillRect(bx, by + bh - Math.max(1, s / 2), bw, Math.max(1, s / 2));
      ctx.fillRect(bx, by, Math.max(1, s / 2), bh); ctx.fillRect(bx + bw - Math.max(1, s / 2), by, Math.max(1, s / 2), bh);
      if (s > 2) A.drawText(ctx, 'HAND', bx, by - 7, '#5dff7a', 1);
    }
  };

  T.bib = function (ctx, x, y, w, h, t) {
    bg(ctx, x, y, w, h, '#1d1530');
    const s = unit(h), digits = s > 1 ? 3 : 2;
    const tw = (digits * 4 - 1) * s, bw = tw + 4 * s, bh = 9 * s;
    const bx = x + Math.floor((w - bw) / 2), by = y + Math.floor((h - bh) / 2);
    ctx.fillStyle = '#f4f1ff'; ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = '#8f97b8'; ctx.fillRect(bx + s, by + s, s, s); ctx.fillRect(bx + bw - 2 * s, by + s, s, s);
    const r = rng(Math.floor(t * 1.5) + 11);
    let num = ''; for (let i = 0; i < digits; i++) num += Math.floor(r() * 10);
    A.drawText(ctx, num, bx + 2 * s, by + 2 * s, '#140c26', s);
    const mx = x + w / 2 + Math.cos(t * 2) * w * 0.3, my = y + h / 2 + Math.sin(t * 2.6) * h * 0.25, mr = 3 * s;
    ctx.fillStyle = '#ffd23f';
    for (let a = 0; a < 12; a++) px(ctx, mx + Math.cos(a / 12 * Math.PI * 2) * mr, my + Math.sin(a / 12 * Math.PI * 2) * mr, s, '#ffd23f');
    px(ctx, mx + mr, my + mr, s, '#ffd23f'); px(ctx, mx + mr + s, my + mr + s, s, '#ffd23f');
  };

  T.wave = function (ctx, x, y, w, h, t) {
    bg(ctx, x, y, w, h, '#0e0b1f');
    const s = unit(h), n = Math.floor(w / (s * 2));
    for (let i = 0; i < n; i++) {
      const a = (Math.sin(t * 7 + i * 0.8) * 0.5 + 0.5) * (Math.sin(t * 1.7 + i * 0.35) * 0.5 + 0.5);
      const bh = Math.max(s, Math.round(a * h * 0.8 / s) * s);
      ctx.fillStyle = i % 3 ? '#a35dff' : '#ff3d8b';
      ctx.fillRect(x + i * s * 2, y + Math.floor((h - bh) / 2), s, bh);
    }
    if (Math.floor(t * 2) % 2) px(ctx, x + s, y + s, s * (s > 1 ? 2 : 1), '#ff4d4d');
  };

  T.race = function (ctx, x, y, w, h, t) {
    bg(ctx, x, y, w, h, '#0c0c14');
    const s = unit(h), lane = Math.floor(h / 2), p = (t % 4) / 4;
    const lab = s > 1 ? 14 * s / 2 : 0;
    const full = w - 2 * s - lab;
    ctx.fillStyle = '#ff8a3d'; ctx.fillRect(x + s + lab, y + Math.floor(lane / 2) - s, Math.max(s, Math.floor(full * Math.min(1, p * 0.6))), 2 * s);
    ctx.fillStyle = '#5dff7a'; ctx.fillRect(x + s + lab, y + lane + Math.floor(lane / 2) - s, Math.max(s, Math.floor(full * Math.min(1, p * 1.5))), 2 * s);
    for (let j = 0; j < h; j += 2 * s) px(ctx, x + w - 2 * s, y + j, s, '#f4f1ff');
    if (s > 1) { A.drawText(ctx, 'CPU', x + s, y + Math.floor(lane / 2) - 2, '#ff8a3d'); A.drawText(ctx, 'GPU', x + s, y + lane + Math.floor(lane / 2) - 2, '#5dff7a'); }
  };

  T.code = function (ctx, x, y, w, h, t) {
    bg(ctx, x, y, w, h, '#0d1117');
    const s = unit(h), lh = 2 * s, off = Math.floor(t * 4), cols = ['#36f9f6', '#ff3d8b', '#ffd23f', '#8f97b8', '#5dff7a'];
    const n = Math.ceil(h / lh) + 1;
    for (let i = 0; i < n; i++) {
      const r = rng((off + i) * 13 + 5), ind = Math.floor(r() * 3) * 2 * s, len = Math.floor((0.25 + r() * 0.6) * w);
      ctx.fillStyle = cols[Math.floor(r() * cols.length)];
      ctx.fillRect(x + s + ind, y + i * lh, Math.min(len, w - ind - 2 * s), s);
    }
    if (Math.floor(t * 3) % 2) px(ctx, x + w - 3 * s, y + h - 2 * s, s, '#f4f1ff');
  };

  T.phone = function (ctx, x, y, w, h, t) {
    bg(ctx, x, y, w, h, '#101326');
    const s = unit(h), pw = Math.max(6, Math.floor(w * 0.38)), ph = h - 2 * s;
    const ox = x + Math.floor((w - pw) / 2), oy = y + s;
    ctx.fillStyle = '#e9ecf5'; ctx.fillRect(ox, oy, pw, ph);
    ctx.fillStyle = '#1a1f3d'; ctx.fillRect(ox + s, oy + s, pw - 2 * s, ph - 2 * s);
    const n = 4, cyc = (t * 0.8) % 1;
    for (let i = 0; i < n; i++) px(ctx, ox + Math.floor(pw / 2) - Math.floor(s / 2), oy + s + ((i + cyc) / n) * (ph - 3 * s), s, '#8f97b8');
    const jump = (t * 0.5) % 1;
    px(ctx, ox + Math.floor(pw / 2) + s, oy + ph - 2 * s - jump * (ph - 3 * s), s, '#ffd23f');
  };

  T.stars = function (ctx, x, y, w, h, t) {
    bg(ctx, x, y, w, h, '#05030a');
    const r = rng(42), s = unit(h);
    for (let i = 0; i < 24; i++) {
      const sp = 4 + r() * 14, sx = x + ((r() * w - t * sp) % w + w) % w, sy = y + r() * h;
      px(ctx, sx, sy, s, sp > 12 ? '#f4f1ff' : '#5f6aa0');
    }
  };

  A.themeFor = function (p) {
    const s = (p.title + ' ' + p.tag + ' ' + p.area).toLowerCase();
    if (/snake/.test(s)) return 'snake';
    if (/wordle/.test(s)) return 'wordle';
    if (/chess/.test(s)) return 'chess';
    if (/poker|card/.test(s)) return 'cards';
    if (/particle|locali|slam/.test(s)) return 'particles';
    if (/chip|defect/.test(s)) return 'chip';
    if (/gesture|hand/.test(s)) return 'hand';
    if (/runner|ocr|bib/.test(s)) return 'bib';
    if (/meeting|whisper|speech|transcri/.test(s)) return 'wave';
    if (/cpu|gpu|benchmark/.test(s)) return 'race';
    if (/yml|yaml|dbt/.test(s)) return 'code';
    if (/swift|ios|mobile/.test(s)) return 'phone';
    return 'stars';
  };
  A.gameFor = function (p) {
    if (/snake/i.test(p.title)) return 'snake';
    if (/wordle/i.test(p.title)) return 'wordle';
    return null;
  };
})();
