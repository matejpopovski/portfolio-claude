/*
 * Hand-drawn diagram doodles, one per project, as SVG strings.
 * Every stroke has pathLength="1" so CSS can "draw" it (stroke-dashoffset 1 -> 0)
 * with a stagger index --i. The #wobble filter makes the clean vectors look penned.
 */
(function () {
  "use strict";

  // Tiny deterministic RNG so particle clouds look the same on every visit.
  function rng(seed) {
    let s = seed >>> 0;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function make() {
    let i = 0;
    const p = (d, cls = "") => `<path class="d ${cls}" pathLength="1" style="--i:${i++}" d="${d}"/>`;
    const c = (cx, cy, r, cls = "") => `<circle class="d ${cls}" pathLength="1" style="--i:${i++}" cx="${cx}" cy="${cy}" r="${r}"/>`;
    const r = (x, y, w, h, rx = 0, cls = "") => `<rect class="d ${cls}" pathLength="1" style="--i:${i++}" x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}"/>`;
    const t = (x, y, s, cls = "", size = 16, anchor = "start") => `<text class="t ${cls}" style="--i:${i++}" x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}">${s}</text>`;
    const fill = (svg, cls = "") => `<g class="f ${cls}" style="--i:${i++}">${svg}</g>`;
    return { p, c, r, t, fill };
  }

  // Arrowhead at (x,y) pointing in direction angle (deg)
  function head(x, y, ang, len = 9) {
    const a = (ang * Math.PI) / 180;
    const l = (s) => {
      const b = a + Math.PI + s;
      return `${(x + Math.cos(b) * len).toFixed(1)} ${(y + Math.sin(b) * len).toFixed(1)}`;
    };
    return `M${l(-0.45)} L${x} ${y} L${l(0.45)}`;
  }

  const D = {};

  D.chip = function () {
    const { p, r, t } = make();
    let pins = "";
    [52, 66, 80, 94, 108].forEach((y) => (pins += `M58 ${y} H70 M170 ${y} H182 `));
    [86, 102, 118, 134, 150].forEach((x) => (pins += `M${x} 28 V40 M${x} 120 V132 `));
    return (
      r(70, 40, 100, 80, 6) +
      p(pins) +
      r(90, 56, 60, 48, 3, "faint") +
      p("M100 60 l7 9 l-4 6 l9 8 l-3 7 l8 6 l4 8") +
      p("M146 70 C 154 92, 130 112, 108 104 C 88 96, 90 64, 114 58 C 130 54, 146 62, 150 74", "red") +
      p("M206 34 C 196 44, 178 56, 154 70", "red") +
      p(head(154, 70, 150), "red") +
      t(190, 26, "crack!", "red hand", 20) +
      t(14, 150, "crack · hole · rust · scratch · ok", "mono", 10)
    );
  };

  D.hand = function () {
    const { p, r, t } = make();
    return (
      r(66, 14, 114, 132, 4, "blue dash") +
      r(66, 2, 44, 14, 2, "blue") +
      t(70, 13, "hand", "blue mono", 10) +
      p("M84 74 L84 118 Q86 138 106 138 L124 138 Q140 138 146 122 L160 96 Q164 86 156 84 Q150 84 144 94 L132 108 L130 74") +
      p("M84 74 L84 52 Q89 44 94 52 L94 70") +
      p("M94 68 L94 36 Q100 28 106 36 L106 68") +
      p("M106 68 L106 28 Q112 20 118 28 L118 68") +
      p("M118 68 L118 36 Q124 28 130 36 L130 74") +
      p("M18 40 a14 14 0 1 0 28 0 a14 14 0 1 0 -28 0 M27 40 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0 M32 54 V66 M22 68 H42") +
      p("M44 32 L64 28 M44 48 L64 56", "faint dash") +
      p("M184 80 C 196 76, 204 76, 214 80", "red") +
      p(head(214, 80, 10), "red") +
      t(204, 104, "cmd", "red hand", 20, "middle") +
      t(32, 92, "webcam", "hand", 16, "middle")
    );
  };

  D.particles = function () {
    const { p, c, t, fill } = make();
    const R = rng(7);
    let dots = "";
    for (let k = 0; k < 120; k++) {
      // Most dots cluster near the robot, the rest are stragglers
      const near = k < 80;
      const ang = R() * Math.PI * 2;
      const rad = near ? Math.pow(R(), 1.6) * 26 + 3 : 30 + R() * 80;
      const x = 150 + Math.cos(ang) * rad * (near ? 1 : 1.3);
      const y = 84 + Math.sin(ang) * rad * (near ? 1 : 0.7);
      if (x < 8 || x > 232 || y < 10 || y > 152) continue;
      dots += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${near ? 1.6 : 1.2}" opacity="${near ? 0.85 : 0.4}"/>`;
    }
    return (
      p("M8 10 H232 V152 H8 Z", "faint") +
      fill(`<g class="dots">${dots}</g>`) +
      c(150, 84, 13) +
      p("M150 84 L166 76") +
      p("M139 74 l-4 -5 M161 94 l4 5 M139 94 l-4 5 M161 74 l4 -5") +
      p("M40 40 C 70 50, 100 60, 128 76", "red dash") +
      p(head(128, 76, 30), "red") +
      p("M44 130 C 80 124, 104 110, 130 96", "red dash") +
      p(head(130, 96, -28), "red") +
      t(22, 30, "guesses", "red hand", 18) +
      t(176, 128, "converge!", "hand", 18, "middle") +
      t(186, 30, "p(x | z)", "mono", 12)
    );
  };

  D.snake = function () {
    const { p, c, t } = make();
    let grid = "";
    for (let x = 36; x <= 180; x += 24) grid += `M${x} 20 V116 `;
    for (let y = 20; y <= 116; y += 24) grid += `M36 ${y} H180 `;
    // snake path through cell centres
    const body = "M48 104 H96 V80 H72 V56 H120";
    return (
      p(grid, "faint") +
      p(body, "thick") +
      c(124, 56, 6) +
      `<circle class="f" style="--i:3" cx="126" cy="54" r="1.6"/>` +
      c(168, 32, 6, "red") +
      p("M168 26 q2 -6 6 -6", "red") +
      // Q-value arrows from the head: longest toward the food
      p("M134 56 H160", "red thick") +
      p(head(162, 56, 0), "red") +
      p("M124 46 V36") +
      p(head(124, 34, -90, 6)) +
      p("M124 66 V74") +
      p(head(124, 76, 90, 6)) +
      t(196, 52, "Q(s,a)", "mono", 12, "middle") +
      t(204, 70, "argmax", "red hand", 16, "middle") +
      t(120, 146, "reward shaping → hunt the food", "hand", 15, "middle")
    );
  };

  D.bib = function () {
    const { p, r, c, t } = make();
    return (
      r(30, 34, 120, 82, 4) +
      c(40, 44, 3) +
      c(140, 44, 3) +
      c(40, 106, 3) +
      c(140, 106, 3) +
      t(90, 90, "1437", "mono big", 38, "middle") +
      p("M114 60 l26 -6 l-4 40 l-24 8 z", "hatchfill") +
      c(176, 96, 26, "blue") +
      p("M195 115 L222 144", "blue thick") +
      t(176, 103, "14?7", "blue mono", 14, "middle") +
      t(36, 146, "14?7 ≈ 1437 → match ✓", "red hand", 18) +
      t(34, 24, "half hidden? still found.", "hand", 15)
    );
  };

  D.wave = function () {
    const { p, r, t } = make();
    let w = "M54 78";
    const amps = [4, 10, 18, 8, 22, 14, 26, 12, 6, 18, 10, 4];
    amps.forEach((a, k) => (w += ` L${60 + k * 6} ${78 - a} L${63 + k * 6} ${78 + a}`));
    w += " L134 78";
    return (
      r(16, 52, 18, 34, 9) +
      p("M10 76 q15 22 30 0 M25 98 V112 M16 112 H34") +
      p(w, "blue") +
      p("M140 78 H158", "red") +
      p(head(160, 78, 0), "red") +
      r(166, 34, 64, 90, 3) +
      p("M174 50 H220 M174 62 H214 M174 74 H218 M174 86 H200", "faint") +
      p("M176 100 l3 3 l6 -7 M176 112 l3 3 l6 -7", "red") +
      p("M190 102 H220 M190 114 H214", "faint") +
      t(94, 128, "whisper", "mono", 12, "middle") +
      t(198, 28, "notes.md", "mono", 11, "middle") +
      t(88, 40, "mic → text → summary", "hand", 16, "middle")
    );
  };

  D.race = function () {
    const { p, r, c, t, fill } = make();
    return (
      t(14, 50, "CPU", "mono", 13) +
      r(52, 36, 160, 20, 2) +
      fill(`<rect x="52" y="36" width="160" height="20" fill="url(#hatch)" opacity=".55"/>`) +
      t(14, 92, "GPU", "mono", 13) +
      r(52, 78, 70, 20, 2, "blue") +
      fill(`<rect x="52" y="78" width="70" height="20" fill="url(#hatch)" class="blue-fill" opacity=".7"/>`) +
      p("M8 92 C 8 76, 46 74, 48 90 C 50 104, 10 108, 8 92", "red") +
      p("M52 118 H220", "faint") +
      p(head(222, 118, 0, 7), "faint") +
      t(136, 136, "time to train →", "hand", 15, "middle") +
      c(196, 22, 11) +
      p("M196 22 L196 15 M196 22 L201 25 M193 9 H199") +
      p("M126 82 l8 -4 M126 94 l8 4 M128 88 h10", "red") +
      t(150, 92, "wins!", "red hand", 18) +
      t(14, 150, "5 / 10 / 20 epochs", "mono", 10)
    );
  };

  D.tree = function () {
    const { p, r, t } = make();
    return (
      p("M24 30 h18 l5 6 h26 v22 h-49 z") +
      t(84, 50, "models/", "mono", 12) +
      p("M36 58 V128 M36 78 H62 M36 104 H62 M36 128 H62", "faint") +
      r(64, 68, 70, 20, 2) +
      t(70, 82, "schema.yml", "mono", 11) +
      r(64, 94, 70, 20, 2) +
      t(70, 108, "schema.yml", "mono", 11) +
      r(64, 118, 70, 20, 2, "dash") +
      t(70, 132, "new.yml ✎", "mono red", 11) +
      p("M186 44 C 214 50, 216 96, 188 104 C 166 110, 150 90, 160 70", "red") +
      p(head(160, 68, -100), "red") +
      t(186, 132, "recurse!", "red hand", 18, "middle") +
      t(150, 26, "docs keep up", "hand", 16)
    );
  };

  D.phone = function () {
    const { p, r, t } = make();
    const fig = (x) =>
      `M${x} 92 a6 6 0 1 0 0.1 0 M${x} 104 V126 M${x} 126 l-7 14 M${x} 126 l7 14 M${x} 110 l-8 8 M${x} 110 l8 8`;
    return (
      r(24, 20, 62, 124, 10) +
      p("M46 30 H64", "faint") +
      r(34, 98, 42, 16, 8, "blue") +
      t(55, 110, "skip", "blue hand", 13, "middle") +
      p("M38 52 H72 M38 62 H66 M38 72 H70", "faint") +
      p(fig(132) + fig(160) + fig(188)) +
      p("M96 70 C 130 20, 190 20, 222 72", "red dash") +
      p(head(222, 74, 60), "red") +
      t(160, 36, "no line!", "red hand", 18, "middle")
    );
  };

  D.chess = function () {
    const { p, t, fill } = make();
    let dark = "";
    for (let row = 0; row < 4; row++)
      for (let col = 0; col < 4; col++)
        if ((row + col) % 2) dark += `<rect x="${40 + col * 32}" y="${16 + row * 32}" width="32" height="32" fill="url(#hatch)" opacity=".45"/>`;
    return (
      p("M40 16 H168 V144 H40 Z") +
      p("M72 16 V144 M104 16 V144 M136 16 V144 M40 48 H168 M40 80 H168 M40 112 H168", "faint") +
      fill(dark) +
      t(56, 138, "♞", "glyph", 30, "middle") +
      p("M56 112 V60 H84", "red dash") +
      p(head(86, 60, 0), "red") +
      p("M120 104 a6 6 0 1 0 0.1 0 M114 128 h12 l-3 -14 h-6 z") +
      t(204, 70, "legal", "hand", 18, "middle") +
      t(204, 90, "moves", "hand", 18, "middle") +
      t(204, 110, "only ✓", "red hand", 18, "middle")
    );
  };

  D.cards = function () {
    const { t, fill, p, c } = make();
    const card = (rot, suit, red) =>
      `<g transform="rotate(${rot} 110 140)"><rect class="d" pathLength="1" x="80" y="30" width="60" height="86" rx="6" style="fill:var(--paper)"/><text x="88" y="50" font-size="16" class="t ${red ? "red" : ""}">${suit}</text><text x="110" y="86" font-size="30" text-anchor="middle" class="t ${red ? "red" : ""}">${suit}</text></g>`;
    return (
      fill(card(-18, "♠", false) + card(0, "♥", true) + card(18, "♦", true)) +
      c(206, 118, 16) +
      p("M206 102 v6 M206 128 v6 M190 118 h6 M216 118 h6", "red") +
      p("M24 40 C 34 30, 46 28, 58 32 M20 60 C 32 52, 44 50, 56 54", "faint") +
      t(30, 150, "deal ×3", "hand", 18)
    );
  };

  D.wordle = function (words) {
    const { p, t, fill } = make();
    const w1 = (words && words.includes("TRAIN") ? "TRAIN" : (words && words[4]) || "TRAIN").slice(0, 5);
    const w2 = (words && words.includes("ROBOT") ? "ROBOT" : (words && words[0]) || "ROBOT").slice(0, 5);
    let boxes = "",
      letters = "",
      hatch = "";
    for (let k = 0; k < 5; k++) {
      const x = 30 + k * 36;
      boxes += `M${x} 24 h30 v30 h-30 z M${x} 62 h30 v30 h-30 z M${x} 100 h30 v30 h-30 z `;
      letters += `<text x="${x + 15}" y="46" font-size="18" text-anchor="middle" class="t mono">${w1[k]}</text>`;
      letters += `<text x="${x + 15}" y="84" font-size="18" text-anchor="middle" class="t mono">${w2[k]}</text>`;
      hatch += `<rect x="${x}" y="62" width="30" height="30" fill="url(#hatch)" opacity=".35"/>`;
      if (w2.includes(w1[k]) && w1[k] !== w2[k]) hatch += `<rect x="${x}" y="24" width="30" height="30" fill="url(#hatch-red)" opacity=".4"/>`;
    }
    return (
      p(boxes) +
      fill(hatch + letters) +
      p("M24 115 h0", "faint") +
      t(218, 84, "✓", "red hand", 26, "middle") +
      t(120, 150, "6 guesses, 5 letters", "hand", 15, "middle")
    );
  };

  D.idea = function () {
    const { p, t } = make();
    return (
      p("M120 30 C 96 30, 86 52, 96 70 C 102 80, 108 84, 108 96 H132 C 132 84, 138 80, 144 70 C 154 52, 144 30, 120 30 Z") +
      p("M108 104 H132 M110 112 H130") +
      p("M120 14 V22 M84 30 L90 36 M156 30 L150 36 M74 62 H82 M158 62 H166", "red") +
      t(120, 140, "idea", "hand", 18, "middle")
    );
  };

  // Pick a doodle by title, then by area keywords.
  const byTitle = [
    [/microchip|defect/i, "chip"],
    [/gesture|hand/i, "hand"],
    [/particle/i, "particles"],
    [/snake|reinforcement|q-learn/i, "snake"],
    [/runner|bib/i, "bib"],
    [/meeting|whisper|speech/i, "wave"],
    [/cpu|gpu/i, "race"],
    [/yml|dbt/i, "tree"],
    [/lineleap|swift|ios/i, "phone"],
    [/chess/i, "chess"],
    [/poker|card/i, "cards"],
    [/wordle/i, "wordle"],
  ];

  function keyFor(project) {
    const hay = `${project.title} ${project.tag}`;
    for (const [re, k] of byTitle) if (re.test(hay)) return k;
    return "idea";
  }

  function svg(project, extraClass) {
    const k = keyFor(project);
    const words = (window.PORTFOLIO && window.PORTFOLIO.words) || [];
    return `<svg class="doodle ${extraClass || ""}" viewBox="0 0 240 160" aria-hidden="true" focusable="false"><g class="wob">${D[k](words)}</g></svg>`;
  }

  // Small icons for the logbook
  const icons = {
    edu: `<svg viewBox="0 0 48 40" aria-hidden="true"><path class="d" pathLength="1" d="M4 14 L24 5 L44 14 L24 23 Z"/><path class="d" pathLength="1" d="M12 18 V28 C 18 34, 30 34, 36 28 V18"/><path class="d red" pathLength="1" d="M42 15 V28 l-2 5 h4 z"/></svg>`,
    work: `<svg viewBox="0 0 48 40" aria-hidden="true"><path class="d" pathLength="1" d="M5 12 H43 V36 H5 Z"/><path class="d" pathLength="1" d="M17 12 V7 H31 V12"/><path class="d red" pathLength="1" d="M5 22 C 18 26, 30 26, 43 22 M22 22 h4 v4 h-4 z"/></svg>`,
    origin: `<svg viewBox="0 0 48 40" aria-hidden="true"><path class="d" pathLength="1" d="M16 10 L6 20 L16 30 M32 10 L42 20 L32 30"/><path class="d red" pathLength="1" d="M27 6 L21 34"/></svg>`,
  };

  window.DOODLES = { svg, keyFor, icons, head };
})();
