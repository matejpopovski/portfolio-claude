/*
 * game.js: the arcade hall itself. Tile map, props, the robot, collisions, camera,
 * coins, secrets, the minimap, the title screen and all input.
 */
(function () {
  'use strict';
  const A = window.ARC, P = window.PORTFOLIO, UI = A.ui;
  const $ = (s) => document.querySelector(s);
  const TS = 16, MW = 42, MH = 28;
  const sfx = (n) => A.sound.sfx[n] && A.sound.sfx[n]();

  const RMQ = matchMedia('(prefers-reduced-motion: reduce)');
  let reduced = RMQ.matches;
  const onRM = (e) => { reduced = e.matches; };
  if (RMQ.addEventListener) RMQ.addEventListener('change', onRM); else if (RMQ.addListener) RMQ.addListener(onRM);
  A.reduced = () => reduced;

  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
  };
  const firstName = (P.first || P.name.split(' ')[0]);
  const niceFirst = firstName.charAt(0) + firstName.slice(1).toLowerCase();

  /* =========================================================
   * MAP: carve floors out of solid wall.
   *  . arcade carpet   , lobby checker   m marble   r red runner
   *  w shop planks     c circuit board   # wall     X cracked wall (walkable!)
   * ========================================================= */
  const map = Array.from({ length: MH }, () => Array(MW).fill('#'));
  const carve = (x0, y0, x1, y1, ch) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) map[y][x] = ch; };
  carve(12, 2, 40, 17, '.');                     // arcade floor
  carve(1, 2, 10, 17, 'm'); carve(4, 2, 7, 17, 'r'); // hall of fame
  carve(11, 10, 11, 11, 'm');                    // side door between the two
  carve(1, 18, 40, 26, ',');                     // lobby
  carve(31, 19, 40, 26, 'w');                    // item shop
  carve(31, 18, 40, 18, '#');                    // shop back wall
  carve(37, 11, 40, 17, '#'); carve(38, 12, 40, 17, 'c'); // the dev room...
  map[15][37] = 'X';                             // ...and the crack that leads into it

  const isWallVis = (x, y) => x < 0 || y < 0 || x >= MW || y >= MH || map[y][x] === '#' || map[y][x] === 'X';
  const solid = map.map((r) => r.map((c) => c === '#'));
  const solidAt = (tx, ty) => tx < 0 || ty < 0 || tx >= MW || ty >= MH || solid[ty][tx];

  const ZONES = [
    { name: 'DEV ROOM', x0: 38, y0: 12, x1: 40, y1: 17, secret: true },
    { name: 'HALL OF FAME', x0: 0, y0: 2, x1: 11, y1: 17 },
    { name: 'ITEM SHOP', x0: 31, y0: 19, x1: 40, y1: 26 },
    { name: 'ARCADE FLOOR', x0: 12, y0: 0, x1: 40, y1: 17 },
    { name: 'LOBBY', x0: 0, y0: 18, x1: 41, y1: 27 },
  ];
  const zoneAt = (tx, ty) => ZONES.find((z) => tx >= z.x0 && tx <= z.x1 && ty >= z.y0 && ty <= z.y1) || ZONES[4];

  /* =========================================================
   * OBJECTS
   * ========================================================= */
  const objects = [];
  function add(o) {
    o.tw = o.tw || 1; o.th = o.th || 1;
    o.px = o.tx * TS + (o.ox || 0); o.py = o.ty * TS;
    o.pw = o.tw * TS; o.ph = o.th * TS;
    o.sortY = o.py + o.ph + (o.sortBias || 0);
    if (o.solid !== false) for (let y = 0; y < o.th; y++) for (let x = 0; x < o.tw; x++) solid[o.ty + y][o.tx + x] = true;
    objects.push(o);
    return o;
  }
  const standBelow = (o, dx) => ({ x: o.px + (dx != null ? dx : o.pw / 2), y: o.py + o.ph + 11, dir: 'up' });

  // --- Cabinets: one per project ---
  const CAB_COLORS = [
    ['#3a1d6e', '#24104a', '#ff3d8b', '#ffd23f'], ['#0f3e5c', '#082638', '#36f9f6', '#ff8a3d'],
    ['#5c1530', '#3a0b1e', '#ffd23f', '#36f9f6'], ['#16503a', '#0b3122', '#5dff7a', '#ff3d8b'],
    ['#5a3410', '#3a2008', '#ff8a3d', '#a35dff'], ['#2b2f6e', '#191c48', '#a35dff', '#5dff7a'],
  ];
  const SLOTS = [];
  [3, 10].forEach((ty) => [14, 18, 22, 26, 30, 34].forEach((tx) => SLOTS.push([tx, ty])));
  P.projects.forEach((p, i) => {
    if (i >= SLOTS.length) return;
    const [tx, ty] = SLOTS[i], col = CAB_COLORS[i % CAB_COLORS.length], game = A.gameFor(p);
    add({
      kind: 'cab', tx, ty, tw: 2, i, p, col, game, theme: A.themeFor(p), h: 40,
      sprite: A.makeCabinet(col[0], col[1], col[2], i + 3),
      verb: game ? 'PLAY' : 'VIEW', label: p.title,
      interact() { UI.openProject(i); },
      stand() { return standBelow(this); },
      draw: drawCabinet,
    });
  });

  // --- Hall of Fame: one NPC + trophy pedestal per timeline entry, oldest at the entrance ---
  const NPC_LOOKS = [
    { hair: '#3a2414', skin: '#f2c49a', shirt: '#3a7bff', pants: '#24204a' },
    { hair: '#141018', skin: '#c88a5a', shirt: '#ff3d8b', pants: '#2b2f55' },
    { hair: '#c8803a', skin: '#f6d2b0', shirt: '#5dff7a', pants: '#3b2a1a' },
    { hair: '#5a3a24', skin: '#e0a878', shirt: '#ff8a3d', pants: '#1b1b2a' },
    { hair: '#e8d06a', skin: '#f6d2b0', shirt: '#a35dff', pants: '#24204a' },
    { hair: '#2a1a12', skin: '#a8704a', shirt: '#36f9f6', pants: '#2b2f55' },
  ];
  const timeline = P.timeline || [];
  const oldestFirst = timeline.map((e, ti) => ({ e, ti })).reverse();
  oldestFirst.forEach(({ e, ti }, k) => {
    const n = oldestFirst.length;
    const ty = n > 1 ? Math.round(15 - (k * 12) / (n - 1)) : 9;
    const left = k % 2 === 0;
    const look = Object.assign({}, NPC_LOOKS[k % NPC_LOOKS.length]);
    if (e.kind === 'edu') { look.shirt = '#1b1440'; look.tie = '#ffd23f'; look.cap = true; }
    if (e.kind === 'work') look.tie = '#ff4d4d';
    const isPC = e.kind === 'origin';
    const sprite = isPC ? A.makePC() : A.person(look);
    const talkFn = () => talkTimeline(e, sprite);
    const npc = add({
      kind: 'npc', tx: left ? 2 : 9, ty, ti, e, sprite, isPC, h: sprite.height + 2, phase: k * 0.7,
      verb: isPC ? 'BOOT' : 'TALK', label: e.org + ' · ' + e.year,
      interact: talkFn,
      stand() { return { x: (left ? 3 : 8) * TS + 8, y: ty * TS + 11, dir: left ? 'left' : 'right' }; },
      draw: drawNPC,
    });
    add({
      kind: 'plaque', tx: left ? 1 : 10, ty, e, sprite: A.makePlaque(e.year, e.kind), h: 26,
      verb: 'READ', label: e.title, interact: talkFn, stand: npc.stand, draw: drawSimple,
    });
  });

  function talkTimeline(e, sprite) {
    let pages;
    if (e.kind === 'origin') {
      pages = ['C:\\> ' + e.title.toUpperCase() + '.EXE', e.year + ' · ' + e.org + ' · ' + e.duration + '. ' + e.details];
    } else if (e.kind === 'edu') {
      pages = ['Ahem! ' + e.org + ' presents: ' + e.title + '. Since ' + e.year + ' · ' + e.duration + '.', e.details];
    } else {
      pages = ['Welcome to the ' + e.org + ' booth! In ' + e.year + ', ' + niceFirst + ' was our ' + e.title + ' (' + e.duration + ').', e.details];
    }
    UI.talk({ name: e.org.toUpperCase() + ' · ' + e.year, portrait: sprite, pages, bg: e.kind === 'edu' ? '#10263a' : e.kind === 'origin' ? '#0a1a0a' : '#2a1430' });
  }

  // --- Lobby, shop, archive, secrets ---
  const keeperSprite = A.person({ hair: '#e9ecf5', skin: '#e0a878', shirt: '#2fae5a', pants: '#3b2a1a', tie: '#e9ecf5' });
  add({ kind: 'keeper', tx: 35, ty: 20, ox: 8, sprite: keeperSprite, h: 16, phase: 0.3, draw: drawNPC, solid: true });
  add({
    kind: 'shop', tx: 31, ty: 21, tw: 10, sprite: A.makeCounter(160), h: 22, verb: 'SHOP', label: 'Skills & stack',
    interact() { UI.talk({ name: 'SHOPKEEPER', portrait: keeperSprite, bg: '#123a24', pages: ['Welcome to the ITEM SHOP! Every skill on these shelves is already in ' + niceFirst + "'s bag."], after: UI.shop }); },
    stand() { return { x: 35 * TS + 8, y: 22 * TS + 11, dir: 'up' }; }, draw: drawSimple,
  });
  add({ kind: 'kiosk', tx: 17, ty: 22, sprite: A.makeKiosk(), h: 28, verb: 'READ', label: 'About ' + niceFirst, interact: () => UI.about(), stand() { return standBelow(this); }, draw: drawKiosk });
  add({
    kind: 'phone', tx: 24, ty: 21, sprite: A.makePhone(), h: 34, verb: 'CALL', label: 'Contact',
    interact() { UI.talk({ name: 'PHONE BOOTH', portrait: A.makePhone(), bg: '#2a0a14', pages: ['*ring ring* ... Connecting you to ' + P.name + '.'], after: UI.contact }); },
    stand() { return standBelow(this); }, draw: drawSimple,
  });
  add({ kind: 'shelf', tx: 38, ty: 3, tw: 2, sprite: A.makeShelf(12), h: 36, verb: 'BROWSE', label: 'Coursework', interact: () => UI.courses(), stand() { return standBelow(this); }, draw: drawSimple });
  const clawLines = [
    ['The claw dips, grabs a plush robot... and lets go at the last second.', 'Classic claw.'],
    ['The claw is still training.', 'Maybe after about 100 more games.'],
    ['You win a tiny plush robot!', 'It looks a lot like you.'],
  ];
  let clawN = 0;
  add({ kind: 'claw', tx: 38, ty: 7, tw: 2, sprite: A.makeClaw(), h: 40, verb: 'PLAY', label: 'Claw machine', interact() { sfx('clunk'); UI.talk({ name: 'CLAW MACHINE', portrait: A.makeClaw(), bg: '#1a1040', pages: clawLines[clawN++ % clawLines.length] }); }, stand() { return standBelow(this); }, draw: drawClaw });
  const popLines = [['*clunk*', 'One can of JAVA. Robots run on it too.'], ['*clunk*', 'A can of PYTHON. Surprisingly smooth.'], ['*clunk*', 'SWIFT. Gone before you finish reading this.']];
  let popN = 0;
  add({ kind: 'vending', tx: 2, ty: 20, sprite: A.makeVending(), h: 32, verb: 'BUY', label: 'Soda machine', interact() { sfx('clunk'); UI.talk({ name: 'POP MACHINE', portrait: A.makeVending(), bg: '#0c1630', pages: popLines[popN++ % popLines.length] }); }, stand() { return standBelow(this); }, draw: drawSimple });
  const plant = A.makePlant();
  [[12, 2], [1, 26], [40, 26], [13, 26]].forEach(([tx, ty]) => add({ kind: 'plant', tx, ty, sprite: plant, h: 13, draw: drawSimple }));
  add({ kind: 'desk', tx: 38, ty: 13, tw: 2, sprite: A.makeDesk(), h: 18, verb: 'TALK', label: 'Rubber duck', interact() { UI.talk({ name: 'RUBBER DUCK', portrait: A.duck, bg: '#0b3a24', pages: ['You explain your bug to the rubber duck, line by line.', 'The duck says nothing.', '...the bug is fixed anyway. Good duck.'] }); }, stand() { return { x: 38 * TS + 16, y: 14 * TS + 11, dir: 'up' }; }, draw: drawDesk });
  add({ kind: 'cat', tx: 40, ty: 16, sprite: A.cat, h: 14, verb: 'PET', label: 'Sleeping cat', interact() { sfx('beep'); UI.talk({ name: 'CAT', portrait: A.cat, bg: '#0b3a24', pages: ['The cat is asleep on a warm GPU.', 'It purrs at exactly 60 frames per second.'] }); }, stand() { return { x: 39 * TS + 8, y: 16 * TS + 11, dir: 'right' }; }, draw: drawCat });
  add({ kind: 'door', tx: 20, ty: 27, tw: 2, solid: true, h: 16, verb: 'EXIT', label: 'Leave the arcade', interact: () => UI.exit(), stand() { return { x: 21 * TS, y: 26 * TS + 11, dir: 'down' }; }, draw() { /* painted into the static layer */ } });

  /* --- coins --- */
  const COIN_SPOTS = [[13, 7], [24, 7], [37, 9], [16, 14], [28, 14], [5, 4], [6, 12], [3, 23], [11, 24], [29, 24], [36, 25], [39, 15]];
  let gotCoins = new Set(store.get('arc-coins', []));
  const coins = COIN_SPOTS.filter(([x, y]) => !solid[y][x]).map(([x, y], id) => ({ id, x: x * TS + 8, y: y * TS + 10, hx: x * TS + 8, hy: y * TS + 10, got: gotCoins.has(id) }));
  const coinInfo = () => ({ got: coins.filter((c) => c.got).length, total: coins.length });

  /* =========================================================
   * STATIC LAYER: floors and walls painted once
   * ========================================================= */
  function buildStatic() {
    const c = A.canvas(MW * TS, MH * TS), x = c.getContext('2d');
    const R = (px, py, w, h, col) => { x.fillStyle = col; x.fillRect(px, py, w, h); };
    const NEON = ['#ff3d8b', '#36f9f6', '#ffd23f', '#a35dff'];
    for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++) {
      const ch = map[ty][tx], px = tx * TS, py = ty * TS, r = A.rng(tx * 92821 + ty * 1237 + 7);
      if (ch === '.') {
        R(px, py, 16, 16, (tx + ty) % 2 ? '#150c2d' : '#170e31');
        const k = r(), col = NEON[Math.floor(r() * 4)], ox = 2 + Math.floor(r() * 7), oy = 2 + Math.floor(r() * 7);
        x.globalAlpha = 0.5;
        if (k < 0.2) { for (let i = 0; i < 7; i++) R(px + ox + i, py + oy + [0, 1, 2, 1][i % 4], 1, 1, col); }
        else if (k < 0.34) { R(px + ox + 2, py + oy, 1, 1, col); R(px + ox + 1, py + oy + 1, 1, 1, col); R(px + ox + 3, py + oy + 1, 1, 1, col); R(px + ox, py + oy + 2, 5, 1, col); }
        else if (k < 0.46) { R(px + ox + 1, py + oy, 2, 1, col); R(px + ox + 1, py + oy + 3, 2, 1, col); R(px + ox, py + oy + 1, 1, 2, col); R(px + ox + 3, py + oy + 1, 1, 2, col); }
        else if (k < 0.56) { R(px + ox, py + oy, 1, 1, col); R(px + ox + 3, py + oy + 2, 1, 1, col); R(px + ox + 1, py + oy + 4, 1, 1, col); }
        else if (k < 0.62) { R(px + ox + 1, py + oy, 1, 3, col); R(px + ox, py + oy + 1, 3, 1, col); }
        x.globalAlpha = 1;
      } else if (ch === ',') {
        const a = (tx + ty) % 2 === 0;
        R(px, py, 16, 16, a ? '#1d1738' : '#28204a');
        R(px, py, 16, 1, a ? '#221b42' : '#2f2756');
      } else if (ch === 'm') {
        R(px, py, 16, 16, '#251d40'); R(px, py, 16, 1, '#1a1430'); R(px, py, 1, 16, '#1a1430');
        const v = Math.floor(r() * 10);
        for (let i = 0; i < 6; i++) R(px + 2 + v / 2 + i, py + 3 + i * 2 - (i > 3 ? 3 : 0), 1, 1, '#33295a');
      } else if (ch === 'r') {
        R(px, py, 16, 16, '#6e1430');
        if ((tx + ty) % 2 === 0) { R(px + 7, py + 6, 2, 4, '#80203e'); R(px + 6, py + 7, 4, 2, '#80203e'); }
        if (tx === 4) { R(px, py, 2, 16, '#c89a2a'); R(px + 2, py, 1, 16, '#4a0c20'); }
        if (tx === 7) { R(px + 14, py, 2, 16, '#c89a2a'); R(px + 13, py, 1, 16, '#4a0c20'); }
      } else if (ch === 'w') {
        R(px, py, 16, 16, '#5a3418');
        for (let i = 0; i < 4; i++) { R(px, py + i * 4, 16, 1, '#4a2810'); R(px + ((ty * 4 + i) * 7) % 16, py + i * 4, 1, 4, '#4a2810'); R(px, py + i * 4 + 1, 16, 1, '#64401e'); }
      } else if (ch === 'c') {
        R(px, py, 16, 16, '#0a3320');
        R(px, py + 4 + Math.floor(r() * 8), 16, 1, '#17603a');
        R(px + 3 + Math.floor(r() * 10), py, 1, 16, '#17603a');
        if (r() < 0.6) { const vx = 2 + Math.floor(r() * 12), vy = 2 + Math.floor(r() * 12); R(px + vx, py + vy, 2, 2, '#c8a040'); }
      } else {
        // walls
        const below = isWallVis(tx, ty + 1), below2 = isWallVis(tx, ty + 2);
        const strip = tx <= 11 && ty <= 17 ? ['#ffd23f', '#5a4614'] : ty === 18 && tx >= 31 ? ['#36f9f6', '#13505a'] : tx >= 37 && ty >= 11 && ty <= 17 ? ['#5dff7a', '#1a5a2a'] : ['#ff3d8b', '#6e1d48'];
        const low = !below, high = below && !below2 && ty + 1 < MH && map[ty + 1][tx] === '#';
        if (low || high) {
          R(px, py, 16, 16, '#2b1b4d');
          for (let i = 0; i < 16; i += 8) R(px + i, py, 1, 16, '#22153d');
          if (low) {
            R(px, py + 7, 16, 1, strip[1]); R(px, py + 8, 16, 1, strip[0]); R(px, py + 9, 16, 1, strip[1]);
            R(px, py + 12, 16, 4, '#140c26'); R(px, py + 12, 16, 1, '#3d2a6b');
            if (isWallVis(tx, ty - 1) === false || ty === 0) R(px, py, 16, 2, '#3d2a6b');
          } else {
            R(px, py, 16, 2, '#3d2a6b'); R(px, py + 2, 16, 1, '#160d2a');
          }
        } else {
          R(px, py, 16, 16, '#1b1133');
          R(px + 2 + ((ty % 2) * 6), py + 5, 6, 1, '#211739'); R(px + 8 - ((ty % 2) * 6), py + 11, 6, 1, '#211739');
          if (!isWallVis(tx - 1, ty)) R(px, py, 1, 16, '#3d2a6b');
          if (!isWallVis(tx + 1, ty)) R(px + 15, py, 1, 16, '#3d2a6b');
          if (!isWallVis(tx, ty - 1)) R(px, py, 16, 1, '#3d2a6b');
          if (ch === 'X') {
            // a hairline crack, the kind a defect detector would flag
            [[7, 0], [8, 1], [8, 2], [7, 3], [6, 4], [7, 5], [8, 6], [9, 7], [9, 8], [8, 9], [7, 10], [7, 11], [8, 12], [9, 13], [8, 14], [8, 15]].forEach(([a, b]) => R(px + a, py + b, 1, 1, '#05030a'));
            R(px + 10, py + 7, 1, 1, '#2a6a40'); R(px + 5, py + 4, 1, 1, '#2a6a40');
          }
        }
      }
    }
    // Year markers painted along the red runner.
    oldestFirst.forEach(({ e }, k) => {
      const n = oldestFirst.length, ty = n > 1 ? Math.round(15 - (k * 12) / (n - 1)) : 9;
      x.globalAlpha = 0.55;
      A.drawText(x, String(e.year), 4 * TS + 33 - A.textWidth(e.year) / 2, ty * TS + 6, '#ffd23f');
      x.globalAlpha = 1;
    });
    // Door to the outside, welcome mat, and floor wayfinding.
    const dx = 20 * TS, dy = 27 * TS;
    R(dx, dy, 32, 16, '#0a0614'); R(dx + 1, dy + 1, 30, 15, '#1d3a5a');
    R(dx + 15, dy + 1, 2, 15, '#0a0614'); R(dx + 3, dy + 3, 2, 9, '#5f8ab0'); R(dx + 19, dy + 3, 2, 9, '#5f8ab0');
    R(dx + 6, dy - 3, 20, 7, '#0a2a14'); A.drawText(x, 'EXIT', dx + 9, dy - 2, '#5dff7a');
    R(19 * TS + 4, 26 * TS + 3, 56, 11, '#3a1a66'); R(19 * TS + 5, 26 * TS + 4, 54, 9, '#5a2a96');
    A.drawText(x, 'WELCOME', 19 * TS + 32 - A.textWidth('WELCOME') / 2, 26 * TS + 6, '#ffd23f');
    x.globalAlpha = 0.45;
    A.drawText(x, '^ ARCADE ^', 21 * TS - A.textWidth('^ ARCADE ^') / 2, 19 * TS + 4, '#36f9f6');
    A.drawText(x, '< HALL OF FAME', 4 * TS, 19 * TS + 1, '#ffd23f');
    A.drawText(x, 'ITEM SHOP >', 30 * TS - A.textWidth('ITEM SHOP >') - 4, 23 * TS + 6, '#5dff7a');
    x.globalAlpha = 1;
    // Shop shelf of potions along the back wall.
    for (let i = 0; i < 18; i++) {
      const bx = 34 * TS + 4 + i * 6, cols = ['#ff3d8b', '#36f9f6', '#ffd23f', '#5dff7a', '#a35dff'];
      R(bx, 18 * TS + 3, 3, 5, cols[i % 5]); R(bx + 1, 18 * TS + 2, 1, 1, '#e9ecf5'); R(bx, 18 * TS + 3, 1, 1, '#ffffff');
    }
    R(34 * TS, 18 * TS + 8, 7 * TS, 1, '#8a5a30');
    return c;
  }

  /* =========================================================
   * RENDERING
   * ========================================================= */
  const canvas = $('#game'), ctx = canvas.getContext('2d');
  const mini = $('#minimap'), mctx = mini.getContext('2d');
  let vw = 320, vh = 200, scale = 2, isTouch = false;
  let staticLayer = null, miniBase = null;
  let t = 0;
  const cam = { x: 0, y: 0 };
  let glows = [];

  function resize() {
    const w = innerWidth, h = innerHeight;
    let s = Math.floor(Math.min(w / 340, h / 220));
    s = Math.max(2, Math.min(6, s));
    scale = s;
    vw = Math.ceil(w / s); vh = Math.ceil(h / s);
    canvas.width = vw; canvas.height = vh;
    canvas.style.width = vw * s + 'px'; canvas.style.height = vh * s + 'px';
    ctx.imageSmoothingEnabled = false;
    updateCam(0, true);
  }

  function glow(cx, cy, w, h, color, a) { glows.push([cx, cy, w, h, color, a]); }

  function drawSimple(o, sx, sy) {
    const s = o.sprite;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(sx + Math.floor((o.pw - s.width) / 2) + 1, sy + o.ph - 3, s.width - 2, 3);
    ctx.drawImage(s, sx + Math.floor((o.pw - s.width) / 2), sy + o.ph - s.height);
    if (o.kind === 'phone') glow(sx + 8, sy - 10, 40, 40, '#ff4d4d', 0.18);
    if (o.kind === 'vending') glow(sx + 8, sy - 4, 34, 40, '#36f9f6', 0.18);
    if (o.kind === 'plaque') glow(sx + 8, sy - 6, 24, 20, '#ffd23f', 0.14 + 0.06 * Math.sin(t * 2 + o.ty));
  }
  function drawCabinet(o, sx, sy) {
    const bx = sx + 3, by = sy + 16 - 40, tt = reduced ? Math.floor(t) : t;
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(bx + 1, sy + 14, 24, 4);
    ctx.drawImage(o.sprite, bx, by);
    A.themes[o.theme](ctx, bx + 5, by + 12, 16, 11, tt + o.i * 1.7);
    ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.fillRect(bx + 5, by + 12, 16, 1); ctx.fillRect(bx + 5, by + 12, 1, 11);
    // marquee: the title scrolls past like an LED sign
    const near = target === o;
    const tc = A.textCanvas(o.p.title, near ? '#ffffff' : o.col[3]);
    const span = tc.width + 22, off = reduced ? 0 : Math.floor((t * 16 + o.i * 23) % span);
    ctx.save(); ctx.beginPath(); ctx.rect(bx + 3, by + 3, 20, 5); ctx.clip();
    if (near) { ctx.fillStyle = A.shade(o.col[2], -0.55); ctx.fillRect(bx + 3, by + 3, 20, 5); }
    ctx.drawImage(tc, reduced ? bx + 4 : bx + 3 + 20 - off, by + 3);
    ctx.restore();
    const pulse = 0.85 + 0.15 * Math.sin(t * 3 + o.i);
    glow(bx + 13, by + 17, 54, 46, o.col[2], 0.32 * pulse * (near ? 1.4 : 1));
    glow(bx + 13, by + 5, 44, 18, o.col[3], 0.22);
    glow(bx + 13, sy + 22, 44, 14, o.col[2], 0.16);
  }
  function drawNPC(o, sx, sy) {
    const s = o.sprite, bob = reduced ? 0 : (Math.sin(t * 2.4 + (o.phase || 0)) > 0.6 ? 1 : 0);
    const x0 = sx + Math.floor((o.pw - s.width) / 2), y0 = sy + 15 - s.height;
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x0 + 1, sy + 13, s.width - 2, 3);
    if (o.isPC) {
      ctx.drawImage(s, x0, y0);
      ctx.fillStyle = '#5dff7a';
      ctx.fillRect(x0 + 5, y0 + 3, 4, 1); ctx.fillRect(x0 + 5, y0 + 5, 6, 1);
      if (Math.floor(t * 2) % 2 || reduced) ctx.fillRect(x0 + 5, y0 + 7, 2, 1);
      glow(x0 + 9, y0 + 6, 30, 24, '#5dff7a', 0.25);
      return;
    }
    ctx.drawImage(s, x0, y0 - bob);
  }
  function drawKiosk(o, sx, sy) {
    drawSimple(o, sx, sy);
    const x0 = sx, y0 = sy + 16 - 28;
    ctx.fillStyle = '#36f9f6'; ctx.fillRect(x0 + 3, y0 + 3, 10, 6);
    ctx.fillStyle = '#06232a'; ctx.fillRect(x0 + 7, y0 + 4, 2, 1); ctx.fillRect(x0 + 7, y0 + 6, 2, 3);
    glow(x0 + 8, y0 + 6, 40, 34, '#36f9f6', 0.3 + (reduced ? 0 : 0.08 * Math.sin(t * 3)));
  }
  function drawClaw(o, sx, sy) {
    drawSimple(o, sx, sy);
    const x0 = sx + 1, y0 = sy + 16 - 40, cx = reduced ? 14 : Math.round(14 + Math.sin(t * 0.9) * 10), drop = reduced ? 0 : Math.max(0, Math.round(Math.sin(t * 0.45) * 8));
    ctx.fillStyle = '#c8cde0'; ctx.fillRect(x0 + 2, y0 + 7, 26, 1); ctx.fillRect(x0 + cx, y0 + 8, 1, 2 + drop);
    ctx.fillRect(x0 + cx - 2, y0 + 10 + drop, 5, 1); ctx.fillRect(x0 + cx - 2, y0 + 11 + drop, 1, 2); ctx.fillRect(x0 + cx + 2, y0 + 11 + drop, 1, 2);
    glow(x0 + 15, y0 + 14, 50, 36, '#a35dff', 0.22);
  }
  function drawDesk(o, sx, sy) {
    drawSimple(o, sx, sy);
    ctx.drawImage(A.duck, sx + 4, sy + o.ph - 18 + 0);
    glow(sx + 23, sy + o.ph - 16, 30, 20, '#36f9f6', 0.2);
  }
  function drawCat(o, sx, sy) {
    const breathe = reduced ? 0 : Math.sin(t * 1.5) > 0 ? 1 : 0;
    ctx.fillStyle = '#c8a040'; ctx.fillRect(sx + 1, sy + 10, 14, 5); ctx.fillStyle = '#0a0614'; ctx.fillRect(sx + 1, sy + 14, 14, 1); // a GPU, warm
    ctx.fillStyle = '#5dff7a'; ctx.fillRect(sx + 3, sy + 12, 2, 1); ctx.fillRect(sx + 7, sy + 12, 2, 1);
    ctx.drawImage(A.cat, sx + 2, sy + 4 + (breathe ? 0 : 1), 12, 6 - (breathe ? 0 : 1) + 0);
    if (!reduced) {
      const zt = (t * 0.6) % 1;
      ctx.globalAlpha = 1 - zt;
      A.drawText(ctx, 'Z', sx + 12 + zt * 4, sy - zt * 10, '#e9ecf5');
      ctx.globalAlpha = 1;
    }
  }

  function drawCoin(c, sx, sy) {
    const f = reduced ? 0 : Math.floor(t * 8 + c.id) % 6, w = [8, 6, 4, 2, 4, 6][f];
    const bob = reduced ? 0 : Math.round(Math.sin(t * 3 + c.id) * 1.5);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(sx - 3, sy + 4, 6, 2);
    ctx.drawImage(A.coin, 0, 0, 8, 8, Math.round(sx - w / 2), sy - 6 + bob, w, 8);
    glow(sx, sy - 2 + bob, 22, 22, '#ffd23f', 0.28);
  }

  /* =========================================================
   * PLAYER
   * ========================================================= */
  const SPAWN = { x: 21 * TS, y: 24 * TS + 11 };
  const player = { x: SPAWN.x, y: SPAWN.y, dir: 'up', walk: 0, moving: false, idle: 0, dust: 0, emote: null, bonk: 0 };
  const DX = { up: 0, down: 0, left: -1, right: 1 }, DY = { up: -1, down: 1, left: 0, right: 0 };

  function hits(x, y) {
    const x0 = Math.floor((x - 5) / TS), x1 = Math.floor((x + 4.99) / TS), y0 = Math.floor((y - 5) / TS), y1 = Math.floor((y + 0.99) / TS);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (solidAt(tx, ty)) return true;
    return false;
  }
  function moveAxis(dx, dy) {
    const nx = player.x + dx, ny = player.y + dy;
    if (!hits(nx, ny)) { player.x = nx; player.y = ny; return false; }
    // Corner assist: slide around edges so narrow doorways feel forgiving.
    for (let n = 1; n <= 6; n++) {
      if (dx) {
        if (!hits(nx, player.y - n)) { if (!hits(player.x, player.y - 1)) player.y -= 1; return true; }
        if (!hits(nx, player.y + n)) { if (!hits(player.x, player.y + 1)) player.y += 1; return true; }
      } else {
        if (!hits(player.x - n, ny)) { if (!hits(player.x - 1, player.y)) player.x -= 1; return true; }
        if (!hits(player.x + n, ny)) { if (!hits(player.x + 1, player.y)) player.x += 1; return true; }
      }
    }
    return true;
  }

  /* =========================================================
   * INPUT
   * ========================================================= */
  const keys = new Set();
  const MOVE = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right' };
  const dpadState = { x: 0, y: 0 };
  A.input = A.input || {};
  let paused = false, state = 'title';

  function inputDir() {
    let x = 0, y = 0;
    if (keys.has('left')) x -= 1; if (keys.has('right')) x += 1;
    if (keys.has('up')) y -= 1; if (keys.has('down')) y += 1;
    if (!x && !y) { x = dpadState.x; y = dpadState.y; }
    return { x, y };
  }

  const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let kpos = 0;
  function konami(k) {
    k = k.length === 1 ? k.toLowerCase() : k;
    kpos = k === KONAMI[kpos] ? kpos + 1 : k === KONAMI[0] ? 1 : 0;
    if (kpos === KONAMI.length) {
      kpos = 0;
      G.gold = !G.gold;
      UI.toast(G.gold ? 'CHEAT ON · GOLD PLATING + COIN MAGNET' : 'CHEAT OFF · BACK TO FACTORY SETTINGS', 'gold');
      sfx('win');
      if (G.gold) UI.confetti(120);
    }
  }

  window.addEventListener('keydown', (e) => {
    if (UI.busy()) return;
    const k = e.key;
    konami(k);
    const tag = e.target && e.target.tagName, onCtl = tag === 'BUTTON' || tag === 'A' || tag === 'INPUT';
    if (state === 'title') {
      if ((k === 'Enter' || k === ' ') && !onCtl) { e.preventDefault(); startGame(); }
      return;
    }
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (MOVE[k]) { keys.add(MOVE[k]); e.preventDefault(); return; }
    if (k === 'Shift') { keys.add('run'); return; }
    if (k === 'e' || k === 'E' || ((k === ' ' || k === 'Enter') && !onCtl)) { e.preventDefault(); if (!e.repeat) interact(); return; }
    if (k === 'i' || k === 'I') { e.preventDefault(); UI.inventory(); return; }
    if (k === 'm' || k === 'M') { A.sound.toggle(); return; }
    if (k === 'Escape' || k === 'p' || k === 'P') { e.preventDefault(); UI.menu(); return; }
  });
  window.addEventListener('keyup', (e) => { if (MOVE[e.key]) keys.delete(MOVE[e.key]); if (e.key === 'Shift') keys.delete('run'); });
  window.addEventListener('blur', () => keys.clear());

  // Touch D-pad (one pointer, 8 directions) and A/B buttons.
  const dpad = $('#dpad');
  function setDpad(x, y) {
    if (x === dpadState.x && y === dpadState.y) return;
    dpadState.x = x; dpadState.y = y;
    dpad.dataset.dir = (y < 0 ? 'u' : y > 0 ? 'd' : '') + (x < 0 ? 'l' : x > 0 ? 'r' : '');
    if ((x || y) && A.input.dirHandler) A.input.dirHandler({ x, y });
  }
  function dpadFrom(e) {
    const r = dpad.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const dead = r.width * 0.12;
    let x = Math.abs(dx) > dead ? Math.sign(dx) : 0, y = Math.abs(dy) > dead ? Math.sign(dy) : 0;
    if (Math.abs(dx) > Math.abs(dy) * 2.2) y = 0; else if (Math.abs(dy) > Math.abs(dx) * 2.2) x = 0;
    setDpad(x, y);
  }
  dpad.addEventListener('pointerdown', (e) => { e.preventDefault(); dpad.setPointerCapture(e.pointerId); dpadFrom(e); markTouch(); });
  dpad.addEventListener('pointermove', (e) => { if (dpad.hasPointerCapture(e.pointerId)) dpadFrom(e); });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) => dpad.addEventListener(ev, () => setDpad(0, 0)));
  function pressA() {
    if (UI.isTalking()) return UI.talkAdvance();
    if (UI.isModal()) { if (A.input.actionHandler) A.input.actionHandler(); return; }
    if (state === 'title') return startGame();
    interact();
  }
  function pressB() {
    if (UI.isTalking()) return UI.talkClose();
    if (UI.isModal()) return UI.close();
    if (state === 'play') UI.inventory();
  }
  const btnA = $('#btnA'), btnB = $('#btnB');
  btnA.addEventListener('pointerdown', (e) => { e.preventDefault(); btnA.classList.add('down'); pressA(); });
  btnB.addEventListener('pointerdown', (e) => { e.preventDefault(); btnB.classList.add('down'); pressB(); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => { btnA.addEventListener(ev, () => btnA.classList.remove('down')); btnB.addEventListener(ev, () => btnB.classList.remove('down')); });
  function markTouch() { if (!isTouch) { isTouch = true; document.body.classList.add('is-touch'); updatePrompt(true); } }
  window.addEventListener('touchstart', markTouch, { passive: true, once: true });

  // Mouse: click a prop on the canvas to walk (well, warp) to it.
  function worldAt(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) / scale + Math.round(cam.x), y: (e.clientY - r.top) / scale + Math.round(cam.y) };
  }
  function objAt(p) {
    for (let i = objects.length - 1; i >= 0; i--) {
      const o = objects[i];
      if (!o.interact) continue;
      const top = o.py + o.ph - (o.h || 16);
      if (p.x >= o.px && p.x < o.px + o.pw && p.y >= top && p.y < o.py + o.ph) return o;
    }
    return null;
  }
  canvas.addEventListener('click', (e) => {
    if (state === 'title') return startGame();
    if (UI.busy() || paused) return;
    const o = objAt(worldAt(e));
    if (!o) return;
    if (o === target) return o.interact();
    warpTo(o, true);
  });
  canvas.addEventListener('mousemove', (e) => { canvas.style.cursor = state === 'play' && objAt(worldAt(e)) ? 'pointer' : ''; });

  /* =========================================================
   * INTERACTION
   * ========================================================= */
  let target = null;
  function rectDist(x, y, o) {
    const dx = Math.max(o.px - x, 0, x - (o.px + o.pw)), dy = Math.max(o.py - y, 0, y - (o.py + o.ph));
    return Math.hypot(dx, dy);
  }
  function findTarget() {
    const fx = player.x + DX[player.dir] * 10, fy = player.y - 3 + DY[player.dir] * 10;
    let best = null, bd = 1e9;
    for (const o of objects) {
      if (!o.interact) continue;
      const d = rectDist(fx, fy, o);
      if (d < 5 && d < bd) { bd = d; best = o; }
    }
    if (best) return best;
    for (const o of objects) {
      if (!o.interact) continue;
      const d = rectDist(player.x, player.y - 3, o) + 4;
      if (d < 13 && d < bd) { bd = d; best = o; }
    }
    return best;
  }
  function interact() {
    if (state !== 'play' || paused) return;
    if (target) { player.idle = 0; target.interact(); return; }
    const lines = ['BEEP!', 'BOOP?', '01001000 01001001', '♥', 'HI!'];
    player.emote = { text: lines[Math.floor(Math.random() * lines.length)], t: 1.4 };
    sfx('beep');
  }
  function warpTo(o, thenInteract) {
    const s = o.stand ? o.stand.call(o) : null;
    if (!s) { if (o.interact) o.interact(); return; }
    burst(player.x, player.y - 7, '#36f9f6', 14);
    player.x = s.x; player.y = s.y; player.dir = s.dir; player.idle = 0;
    burst(player.x, player.y - 7, '#ffd23f', 18);
    sfx('teleport');
    checkZone(false);
    if (reduced) updateCam(0, true);
    target = o;
    if (thenInteract) setTimeout(() => { if (!UI.busy()) o.interact(); }, reduced ? 0 : 380);
  }
  function travel(kind, idx) {
    UI.close(true);
    UI.talkClose(true);
    let o;
    if (kind === 'cab') o = objects.find((x) => x.kind === 'cab' && x.i === idx);
    else if (kind === 'npc') o = objects.find((x) => x.kind === 'npc' && x.ti === idx);
    else o = objects.find((x) => x.kind === kind);
    if (state === 'title') startGame(true);
    if (!o) { if (kind === 'cab') UI.openProject(idx); return; }
    warpTo(o, true);
  }

  /* =========================================================
   * PARTICLES & FLOATING TEXT
   * ========================================================= */
  const parts = [], floats = [];
  function burst(x, y, color, n) {
    if (reduced) return;
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, s = 20 + Math.random() * 50; parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 20, life: 0.5 + Math.random() * 0.4, c: color, g: 60 }); }
  }

  /* =========================================================
   * CAMERA
   * ========================================================= */
  const attract = [[26.5, 8], [6, 9], [20, 22], [35, 22], [30, 12], [16, 6]];
  function updateCam(dt, snap) {
    let fx, fy;
    if (state === 'title') {
      if (reduced) { fx = 26 * TS; fy = 9 * TS; }
      else {
        const seg = 7, k = (t / seg) % attract.length, i = Math.floor(k), f = k - i, e = f * f * (3 - 2 * f);
        const a = attract[i], b = attract[(i + 1) % attract.length];
        fx = (a[0] + (b[0] - a[0]) * e) * TS; fy = (a[1] + (b[1] - a[1]) * e) * TS;
      }
    } else {
      fx = player.x; fy = player.y - 10 + (isTouch ? Math.min(60, vh * 0.12) : 0);
    }
    let tx = fx - vw / 2, ty = fy - vh / 2;
    const W = MW * TS, H = MH * TS;
    tx = W <= vw ? (W - vw) / 2 : Math.max(0, Math.min(W - vw, tx));
    ty = H <= vh ? (H - vh) / 2 : Math.max(0, Math.min(H - vh, ty));
    const k = snap || reduced ? 1 : 1 - Math.exp(-dt * (state === 'title' ? 3 : 7));
    cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k;
  }

  /* =========================================================
   * UPDATE
   * ========================================================= */
  let curZone = null;
  const G = (A.game = {
    gold: false, foundSecret: store.get('arc-secret', false), visited: new Set(store.get('arc-visited', [])),
    pause(on) { paused = on; keys.clear(); setDpad(0, 0); if (on) $('#prompt').hidden = true; },
    travel, coinInfo,
    markVisited(i) { if (!G.visited.has(i)) { G.visited.add(i); store.set('arc-visited', [...G.visited]); } },
    toTitle,
    debug: () => ({ x: player.x, y: player.y, dir: player.dir, state, paused, target: target ? target.label : null, zone: curZone && curZone.name }),
  });

  function update(dt) {
    t += dt;
    if (state === 'play' && !paused) {
      const d = inputDir();
      const run = keys.has('run') ? 1.7 : 1;
      if (d.x || d.y) {
        const len = Math.hypot(d.x, d.y), sp = 74 * run * dt;
        const bx = moveAxis((d.x / len) * sp, 0), by = moveAxis(0, (d.y / len) * sp);
        if (Math.abs(d.x) > Math.abs(d.y)) player.dir = d.x > 0 ? 'right' : 'left';
        else player.dir = d.y > 0 ? 'down' : 'up';
        player.moving = true; player.walk += dt * 9 * run; player.idle = 0;
        player.dust -= dt;
        if (player.dust <= 0 && !reduced) { player.dust = 0.16 / run; parts.push({ x: player.x + (Math.random() * 6 - 3), y: player.y, vx: -d.x * 10, vy: -8, life: 0.35, c: '#5f5a80', g: 0 }); }
        player.bonk -= dt;
        if ((bx && d.x && !d.y) || (by && d.y && !d.x)) { if (player.bonk <= 0) { sfx('bonk'); player.bonk = 0.5; } }
      } else { player.moving = false; player.idle += dt; }

      // coins
      for (const c of coins) {
        if (c.got) continue;
        const dx = player.x - c.x, dy = player.y - 6 - c.y, dist = Math.hypot(dx, dy);
        if (G.gold && dist < 96 && dist > 1) { c.x += (dx / dist) * dt * 140; c.y += (dy / dist) * dt * 140; }
        if (dist < 10) collect(c);
      }
      checkZone(true);
      const nt = findTarget();
      if (nt !== target) { target = nt; updatePrompt(); if (target) sfx('select'); }
    }
    if (player.emote) { player.emote.t -= dt; if (player.emote.t <= 0) player.emote = null; }
    for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.life -= dt; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.life <= 0) parts.splice(i, 1); }
    for (let i = floats.length - 1; i >= 0; i--) { const f = floats[i]; f.life -= dt; f.y -= dt * 18; if (f.life <= 0) floats.splice(i, 1); }
    updateCam(dt);
  }

  function checkZone(walked) {
    const tz = zoneAt(Math.floor(player.x / TS), Math.floor((player.y - 4) / TS));
    if (tz === curZone) return;
    curZone = tz;
    $('#hudZone').textContent = tz.name;
    if (walked && tz.secret && !G.foundSecret) {
      G.foundSecret = true; store.set('arc-secret', true);
      UI.toast('SECRET FOUND · THE DEV ROOM', 'gold'); sfx('win');
      burst(player.x, player.y - 8, '#5dff7a', 30);
    }
  }

  function collect(c) {
    c.got = true;
    gotCoins.add(c.id);
    store.set('arc-coins', [...gotCoins]);
    sfx('coin');
    burst(c.x, c.y - 2, '#ffd23f', 10);
    floats.push({ text: '+1', x: c.x, y: c.y - 10, life: 0.9, c: '#ffd23f' });
    const ci = coinInfo();
    UI.setCoins(ci.got, ci.total);
    if (ci.got === ci.total) {
      setTimeout(() => { sfx('win'); UI.confetti(); UI.hire(); }, 700);
    } else if (ci.got === 1 && !store.get('arc-coin-hint', false)) {
      store.set('arc-coin-hint', true);
      UI.toast('COIN! ' + (ci.total - 1) + ' MORE HIDDEN AROUND THE ARCADE');
    }
  }

  function updatePrompt(force) {
    const p = $('#prompt');
    if (!target || state !== 'play' || paused) { p.hidden = true; return; }
    if (!force && p.dataset.for === String(objects.indexOf(target))) { p.hidden = false; return; }
    p.dataset.for = String(objects.indexOf(target));
    p.querySelector('kbd').textContent = isTouch ? 'A' : 'E';
    p.querySelector('.p-verb').textContent = target.verb || 'USE';
    p.querySelector('.p-what').textContent = target.label || '';
    p.hidden = false;
    p.classList.remove('pop'); void p.offsetWidth; p.classList.add('pop');
  }
  $('#prompt').addEventListener('click', () => interact());

  /* =========================================================
   * RENDER
   * ========================================================= */
  const SIGNS = [
    { text: 'HALL OF FAME', x: 5.5 * TS + 8, y: 3, color: '#ffd23f', sc: 2, seed: 1 },
    { text: firstName + "'S ARCADE", x: 26.5 * TS, y: 3, color: '#ff3d8b', sc: 2, seed: 4 },
    { text: 'DEV ROOM', x: 39.5 * TS, y: 11 * TS + 1, color: '#5dff7a', sc: 1, seed: 7 },
    { text: 'ITEM SHOP', x: 32.5 * TS + 6, y: 18 * TS + 2, color: '#36f9f6', sc: 1, seed: 2 },
  ];
  function drawSigns(cx, cy) {
    for (const s of SIGNS) {
      const tc = A.textCanvas(s.text, s.color, s.sc), x = Math.round(s.x - tc.width / 2 - cx), y = Math.round(s.y - cy);
      if (x > vw || x + tc.width < 0 || y > vh || y + tc.height < 0) continue;
      let on = true;
      if (!reduced) { const f = (t * 0.9 + s.seed * 2.3) % 11; if (f < 0.35 && Math.floor(t * 24) % 2) on = false; }
      ctx.globalAlpha = on ? 1 : 0.3;
      ctx.drawImage(tc, x, y);
      ctx.globalAlpha = 1;
      if (on) glow(x + tc.width / 2, y + tc.height / 2, tc.width + 30, tc.height + 22, s.color, 0.4);
    }
  }

  function render() {
    glows = [];
    ctx.fillStyle = '#07040f'; ctx.fillRect(0, 0, vw, vh);
    const cx = Math.round(cam.x), cy = Math.round(cam.y);
    ctx.drawImage(staticLayer, -cx, -cy);
    drawSigns(cx, cy);

    // floor decals in front of playable cabinets
    for (const o of objects) {
      if (o.kind !== 'cab' || !o.game) continue;
      const sx = o.px - cx, sy = o.py - cy;
      if (sx < -40 || sx > vw + 40 || sy < -60 || sy > vh + 40) continue;
      if (reduced || Math.floor(t * 2) % 2 === 0) { const tc = A.textCanvas('PLAY!', '#ffd23f'); ctx.drawImage(tc, sx + 16 - Math.floor(tc.width / 2), sy + 25); }
      glow(sx + 16, sy + 27, 34, 14, '#ffd23f', 0.15);
    }

    // y-sorted sprites
    const list = [];
    for (const o of objects) {
      const sx = o.px - cx, sy = o.py - cy;
      if (sx > vw + 8 || sx + o.pw < -8 || sy - (o.h || 16) > vh + 8 || sy + o.ph < -8) continue;
      list.push([o.sortY, 0, o]);
    }
    for (const c of coins) if (!c.got) list.push([c.y + 4, 1, c]);
    if (state === 'play' || state === 'title') list.push([player.y, 2, player]);
    list.sort((a, b) => a[0] - b[0]);
    for (const [, kind, o] of list) {
      if (kind === 0) o.draw(o, o.px - cx, o.py - cy);
      else if (kind === 1) drawCoin(o, Math.round(o.x - cx), Math.round(o.y - cy));
      else drawPlayer(cx, cy);
    }

    for (const p of parts) { ctx.globalAlpha = Math.min(1, p.life * 3); ctx.fillStyle = p.c; ctx.fillRect(Math.round(p.x - cx), Math.round(p.y - cy), 1, 1); }
    ctx.globalAlpha = 1;

    // bloom pass
    ctx.globalCompositeOperation = 'lighter';
    ctx.imageSmoothingEnabled = true;
    for (const g of glows) {
      if (g[0] + g[2] / 2 < 0 || g[0] - g[2] / 2 > vw || g[1] + g[3] / 2 < 0 || g[1] - g[3] / 2 > vh) continue;
      ctx.globalAlpha = Math.min(1, g[5]);
      ctx.drawImage(A.glow(g[4], 32), g[0] - g[2] / 2, g[1] - g[3] / 2, g[2], g[3]);
    }
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    // bubbles and floating text on top
    if (state === 'play' && target && !paused) {
      const top = target.py + target.ph - (target.h || 16) - cy;
      const bx = Math.round(target.px + target.pw / 2 - cx), by = Math.round(top - 9 + (reduced ? 0 : Math.round(Math.sin(t * 6))));
      ctx.fillStyle = '#0a0614'; ctx.fillRect(bx - 4, by - 1, 9, 9);
      ctx.fillStyle = '#f4f1ff'; ctx.fillRect(bx - 3, by, 7, 7); ctx.fillRect(bx - 1, by + 7, 3, 1); ctx.fillRect(bx, by + 8, 1, 1);
      A.drawText(ctx, '!', bx - 1, by + 1, '#ff3d8b');
    }
    for (const f of floats) A.drawText(ctx, f.text, Math.round(f.x - cx - A.textWidth(f.text) / 2), Math.round(f.y - cy), f.c);
    if (state === 'play' && (player.emote || player.idle > 20)) {
      const text = player.emote ? player.emote.text : 'Z' + (Math.floor(t * 2) % 3 ? 'z' : '') + (Math.floor(t * 2) % 3 === 2 ? 'z' : '');
      const w = A.textWidth(text) + 4, x = Math.round(player.x - cx - w / 2), y = Math.round(player.y - cy - 27);
      ctx.fillStyle = '#0a0614'; ctx.fillRect(x - 1, y - 1, w + 2, 9);
      ctx.fillStyle = '#f4f1ff'; ctx.fillRect(x, y, w, 7); ctx.fillRect(x + Math.floor(w / 2) - 1, y + 7, 2, 1);
      A.drawText(ctx, text, x + 2, y + 1, '#140c26');
    }
    drawMinimap();
  }

  function drawPlayer(cx, cy) {
    const moving = player.moving && !paused;
    const frame = moving ? 1 + (Math.floor(player.walk) % 2) : 0;
    const sleeping = player.idle > 20;
    const blink = sleeping || (t % 3.7) < 0.13;
    const s = A.robot(player.dir, frame, { blink, gold: G.gold, antennaOff: (t % 1.4) > 1.0 });
    const x = Math.round(player.x - cx), y = Math.round(player.y - cy);
    const bob = moving && frame === 1 ? 1 : 0;
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(x - 5, y - 1, 10, 3);
    ctx.drawImage(s, x - 6, y - 14 + 1 - bob);
    if ((t % 1.4) <= 1.0) glow(x + (player.dir === 'right' ? -1 : player.dir === 'left' ? 1 : 0), y - 13 - bob, 14, 14, '#ff3d8b', 0.5);
    if (G.gold) glow(x, y - 7, 34, 34, '#ffd23f', 0.25);
  }

  function buildMiniBase() {
    const c = A.canvas(MW, MH), x = c.getContext('2d');
    const COL = { '.': '#2a1a5a', ',': '#3a2f66', m: '#4a2a4a', r: '#6e1430', w: '#5a3418', c: '#0f4a2a', '#': '#0b0618', X: '#0b0618' };
    for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++) { x.fillStyle = COL[map[ty][tx]] || '#000'; x.fillRect(tx, ty, 1, 1); }
    for (const o of objects) {
      const col = o.kind === 'cab' ? '#ff3d8b' : o.kind === 'npc' ? '#ffd23f' : o.kind === 'plaque' || o.kind === 'plant' || o.kind === 'door' ? null : '#36f9f6';
      if (!col) continue;
      x.fillStyle = col; x.fillRect(o.tx, o.ty, o.tw, o.th);
    }
    x.fillStyle = '#5dff7a'; x.fillRect(20, 27, 2, 1);
    return c;
  }
  let miniTick = 0;
  function drawMinimap() {
    if (state !== 'play') return;
    if (++miniTick % 3) return;
    mctx.drawImage(miniBase, 0, 0);
    for (const c of coins) if (!c.got && (Math.floor(t * 3 + c.id) % 2 || reduced)) { mctx.fillStyle = '#ffd23f'; mctx.fillRect(Math.floor(c.x / TS), Math.floor(c.y / TS), 1, 1); }
    mctx.fillStyle = 'rgba(244,241,255,0.35)';
    const rx = Math.floor(cam.x / TS), ry = Math.floor(cam.y / TS), rw = Math.ceil(vw / TS), rh = Math.ceil(vh / TS);
    mctx.fillRect(rx, ry, rw, 1); mctx.fillRect(rx, ry + rh, rw, 1); mctx.fillRect(rx, ry, 1, rh); mctx.fillRect(rx + rw, ry, 1, rh + 1);
    if (Math.floor(t * 4) % 2 || reduced) { mctx.fillStyle = G.gold ? '#ffd23f' : '#ffffff'; mctx.fillRect(Math.floor(player.x / TS), Math.floor((player.y - 4) / TS), 1, 1); }
  }

  /* =========================================================
   * TITLE SCREEN
   * ========================================================= */
  const titleEl = $('#title');
  const ORD = ['1ST', '2ND', '3RD', '4TH', '5TH', '6TH', '7TH', '8TH', '9TH', '10TH'];
  function fillTitle() {
    $('#logo1').textContent = (P.first || '').toUpperCase();
    $('#logo2').textContent = (P.last || '').toUpperCase();
    $('#titleSub').textContent = P.title;
    $('#titleRole').textContent = P.role;
    const pages = [
      {
        h: 'HIGH SCORES',
        rows: timeline.map((e, i) => [ORD[i] || (i + 1) + 'TH', e.year, e.title, e.org]),
      },
      {
        h: 'TONIGHT ON THE FLOOR',
        rows: P.projects.slice(0, 6).map((p, i) => [String(i + 1).padStart(2, '0'), p.year, p.title, p.area]),
      },
      {
        h: 'HOW TO PLAY',
        rows: [['◆', 'MOVE', 'Arrows / WASD · D-pad', 'Shift runs'], ['◆', 'USE', 'E / Space / Enter · Ⓐ', 'talk, play, read'], ['◆', 'BAG', 'I · Ⓑ', 'skills inventory'], ['◆', 'MENU', 'Esc · ☰', 'quick travel'], ['◆', 'SOUND', 'M', 'off by default'], ['◆', '???', '↑↑↓↓←→←→BA', 'and find every coin']],
      },
    ];
    let pi = 0;
    const board = $('#board'), bh = $('#boardTitle');
    function show() {
      const pg = pages[pi];
      bh.textContent = pg.h;
      board.replaceChildren(...pg.rows.map((r) => {
        const li = document.createElement('li');
        li.innerHTML = '<span class="b-rank"></span><span class="b-score"></span><span class="b-name"></span><span class="b-org"></span>';
        li.children[0].textContent = r[0]; li.children[1].textContent = r[1]; li.children[2].textContent = r[2]; li.children[3].textContent = r[3];
        return li;
      }));
      $('#boardDots').replaceChildren(...pages.map((_, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'dot' + (i === pi ? ' on' : ''); b.setAttribute('aria-label', 'Show ' + pages[i].h.toLowerCase()); b.setAttribute('aria-pressed', String(i === pi)); b.addEventListener('click', (ev) => { ev.stopPropagation(); pi = i; show(); restart(); }); return b; }));
      const sc = $('#scores'); sc.classList.remove('flip'); void sc.offsetWidth; sc.classList.add('flip');
    }
    let timer = 0;
    const restart = () => { clearInterval(timer); if (!reduced) timer = setInterval(() => { if (state === 'title') { pi = (pi + 1) % pages.length; show(); } }, 6500); };
    show(); restart();
  }
  function startGame(instant) {
    if (state === 'play') return;
    state = 'play';
    titleEl.classList.add('gone');
    setTimeout(() => { if (state === 'play') titleEl.hidden = true; }, reduced || instant ? 0 : 500);
    $('#hud').hidden = false; mini.hidden = false; $('#keys').hidden = false;
    document.body.classList.add('playing');
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    sfx('start');
    if (!instant) {
      const b = $('#banner');
      b.textContent = 'READY?';
      b.className = 'banner on';
      setTimeout(() => { b.textContent = 'GO!'; }, reduced ? 300 : 900);
      setTimeout(() => { b.className = 'banner'; }, reduced ? 900 : 1600);
      if (!store.get('arc-hint', false)) setTimeout(() => { if (state === 'play') UI.toast(isTouch ? 'WALK UP TO A CABINET AND TAP A' : 'WALK UP TO A CABINET AND PRESS E'); }, 1700);
      store.set('arc-hint', true);
    }
    curZone = null;
  }
  function toTitle() {
    state = 'title';
    titleEl.hidden = false; void titleEl.offsetWidth; titleEl.classList.remove('gone');
    $('#hud').hidden = true; mini.hidden = true; $('#keys').hidden = true; $('#prompt').hidden = true;
    document.body.classList.remove('playing');
    setTimeout(() => $('#pressStart').focus({ preventScroll: true }), 50);
  }
  $('#pressStart').addEventListener('click', (e) => { e.stopPropagation(); startGame(); });
  titleEl.addEventListener('click', (e) => { if (!e.target.closest('button, a')) startGame(); });
  $('#btnSkip').addEventListener('click', (e) => { e.stopPropagation(); UI.openText(); });

  /* =========================================================
   * HUD BUTTONS + BOOT
   * ========================================================= */
  $('#btnSound').addEventListener('click', () => A.sound.toggle());
  $('#btnMenu').addEventListener('click', () => UI.menu());
  $('#btnItems').addEventListener('click', () => UI.inventory());
  $('#skipLink').addEventListener('click', (e) => { e.preventDefault(); UI.openText(); });
  window.addEventListener('hashchange', () => { if (location.hash === '#textv') UI.openText(); });

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    render();
    requestAnimationFrame(frame);
  }

  function boot() {
    document.getElementById('srName').textContent = P.name + ': ' + P.title;
    staticLayer = buildStatic();
    miniBase = buildMiniBase();
    if (matchMedia('(pointer: coarse)').matches) markTouch();
    resize();
    window.addEventListener('resize', resize);
    fillTitle();
    UI.buildText();
    UI.syncSound();
    const ci = coinInfo();
    UI.setCoins(ci.got, ci.total);
    updateCam(0, true);
    requestAnimationFrame(frame);
    if (location.hash === '#textv') UI.openText();
    else if (location.hash === '#play') startGame(true);
    // A note for anyone who opens the console.
    try { console.log('%c' + firstName + "'S ARCADE", 'font: 700 16px monospace; color: #ff3d8b', '\nHello, fellow dev. Try the Konami code, and look for a crack in the wall.'); } catch (e) { /* no console */ }
  }
  boot();
})();
