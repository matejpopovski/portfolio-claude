/*
 * Swiss poster generator.
 * Every project gets a deterministic A-format poster (600 × 848, i.e. 1 : √2)
 * built from a hash of its title: a scheme, a motif template and all the
 * random choices inside it come from one seeded PRNG, so the same title
 * always prints the same poster. A "salt" lets the visitor remix it.
 */
(function () {
  'use strict';

  var W = 600, H = 848, M = 36;           // canvas + outer margin
  var TOP = 64, BOT = 512;                // motif band
  var C = { paper: '#f1eee6', ink: '#121211', red: '#e4321b', cobalt: '#1d3fd0' };

  // Swiss restraint: four inks, six schemes.
  var SCHEMES = [
    { bg: 'paper',  fg: 'ink',   a: 'red',    b: 'cobalt', c: 'ink' },
    { bg: 'red',    fg: 'paper', a: 'ink',    b: 'paper',  c: 'ink' },
    { bg: 'cobalt', fg: 'paper', a: 'red',    b: 'paper',  c: 'ink' },
    { bg: 'ink',    fg: 'paper', a: 'red',    b: 'cobalt', c: 'paper' },
    { bg: 'paper',  fg: 'ink',   a: 'cobalt', b: 'red',    c: 'ink' },
    { bg: 'paper',  fg: 'ink',   a: 'ink',    b: 'red',    c: 'cobalt' },
  ];

  var TEMPLATES = ['rings', 'bars', 'dots', 'quarters', 'orbit', 'stripes', 'glyph', 'steps'];

  function hash(str) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    // final avalanche so similar titles diverge
    h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
    return h >>> 0;
  }

  function mulberry(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function f(n) { return Math.round(n * 10) / 10; }

  function wrap(text, max) {
    var words = String(text).split(/\s+/), lines = [], cur = '';
    words.forEach(function (w) {
      if (!cur) cur = w;
      else if ((cur + ' ' + w).length <= max) cur += ' ' + w;
      else { lines.push(cur); cur = w; }
    });
    if (cur) lines.push(cur);
    return lines;
  }

  var uid = 0;

  /**
   * make(project, index, total, salt) -> SVG markup string.
   */
  function make(p, index, total, salt) {
    var seed = salt ? hash(p.title + '#' + salt) : hash(p.title);
    var r = mulberry(seed);
    var pick = function (arr) { return arr[Math.floor(r() * arr.length)]; };

    var S = SCHEMES[seed % SCHEMES.length];
    var tpl = TEMPLATES[(seed >>> 8) % TEMPLATES.length];
    var bg = C[S.bg], fg = C[S.fg], A = C[S.a], B = C[S.b], CC = C[S.c];
    var P = [A, B, CC].filter(function (x) { return x !== bg; });
    if (!P.length) P = [fg];
    var id = 'pc' + (++uid);
    var k = 0; // shape counter for stagger
    var out = [];

    // Every motif shape carries its own hover drift so the poster "moves" as one composition.
    function sh(tag, attrs, still) {
      var a = '';
      for (var key in attrs) a += ' ' + key + '="' + attrs[key] + '"';
      if (still) return '<' + tag + a + '/>';
      var dx = f((r() - 0.5) * 70), dy = f((r() - 0.5) * 70), rot = f((r() - 0.5) * 50);
      return '<' + tag + ' class="s" style="--dx:' + dx + 'px;--dy:' + dy + 'px;--r:' + rot + 'deg;--i:' + (k++) + '"' + a + '/>';
    }

    var cx, cy, n, i, j, R;
    switch (tpl) {
      case 'rings': {
        cx = 90 + r() * 420; cy = TOP + 60 + r() * 330; n = 5 + Math.floor(r() * 5); R = 240 + r() * 170;
        var ringCols = [P[0], bg, P[1 % P.length], bg];
        for (i = 0; i < n; i++) {
          out.push(sh('circle', { cx: f(cx), cy: f(cy), r: f(R * (1 - i / n)), fill: ringCols[i % 4] }));
        }
        out.push(sh('rect', { x: -20, y: f(cy - 3), width: 640, height: 6, fill: fg }));
        out.push(sh('circle', { cx: f(600 - cx * 0.6), cy: f(TOP + 40 + r() * 80), r: f(14 + r() * 22), fill: fg }));
        break;
      }
      case 'bars': {
        var ang = pick([-45, -30, -15, 15, 30, 45, 60, -60]);
        var g = [], x = -460;
        while (x < 460) {
          var bw = 10 + r() * 70, len = 90 + r() * 360;
          g.push(sh('rect', { x: f(x), y: f(-len / 2 + (r() - 0.5) * 160), width: f(bw), height: f(len), fill: pick(P.concat([fg])) }));
          x += bw + 8 + r() * 34;
        }
        out.push('<g transform="translate(300 ' + (TOP + 224) + ') rotate(' + ang + ')">' + g.join('') + '</g>');
        out.push(sh('circle', { cx: f(80 + r() * 440), cy: f(TOP + 60 + r() * 330), r: f(40 + r() * 60), fill: bg, stroke: fg, 'stroke-width': 4 }));
        break;
      }
      case 'dots': {
        var cols = 8, rows = 6, cw = W / cols, chh = (BOT - TOP) / rows;
        var f1 = 0.4 + r() * 0.9, f2 = 0.3 + r() * 0.9, ph = r() * 6.28;
        for (j = 0; j < rows; j++) for (i = 0; i < cols; i++) {
          var v = Math.abs(Math.sin(i * f1 + j * f2 + ph));
          var rad = 3 + v * (Math.min(cw, chh) / 2 - 2);
          var col = v > 0.82 ? P[0] : (r() < 0.08 ? P[1 % P.length] : fg);
          out.push(sh('circle', { cx: f(cw * (i + 0.5)), cy: f(TOP + chh * (j + 0.5)), r: f(rad), fill: col }));
        }
        break;
      }
      case 'quarters': {
        var qc = 4, qr = 3, qw = W / qc, qh = (BOT - TOP) / qr;
        for (j = 0; j < qr; j++) for (i = 0; i < qc; i++) {
          var x0 = i * qw, y0 = TOP + j * qh, kind = Math.floor(r() * 6), fill = pick(P.concat([fg]));
          var corner = Math.floor(r() * 4);
          var cxq = corner % 2 ? x0 + qw : x0, cyq = corner > 1 ? y0 + qh : y0;
          var rr = Math.min(qw, qh);
          if (kind <= 2) {
            // quarter disc anchored in a corner
            var sx = corner % 2 ? -1 : 1, sy = corner > 1 ? -1 : 1;
            var d = 'M' + f(cxq) + ' ' + f(cyq) + ' L' + f(cxq + sx * rr) + ' ' + f(cyq) +
              ' A' + f(rr) + ' ' + f(rr) + ' 0 0 ' + (sx * sy > 0 ? 1 : 0) + ' ' + f(cxq) + ' ' + f(cyq + sy * rr) + ' Z';
            out.push(sh('path', { d: d, fill: fill }));
          } else if (kind === 3) {
            out.push(sh('circle', { cx: f(x0 + qw / 2), cy: f(y0 + qh / 2), r: f(rr / 2 - 4), fill: fill }));
          } else if (kind === 4) {
            out.push(sh('rect', { x: f(x0 + 6), y: f(y0 + 6), width: f(qw - 12), height: f(qh - 12), fill: fill }));
          } else {
            out.push(sh('rect', { x: f(x0), y: f(y0 + qh / 2 - 3), width: f(qw), height: 6, fill: fg }));
          }
        }
        break;
      }
      case 'orbit': {
        cx = r() < 0.5 ? 70 + r() * 80 : 450 + r() * 80; cy = TOP + 120 + r() * 220; R = 170 + r() * 110;
        for (i = 0; i < 14; i++) {
          var t = (i / 14) * Math.PI * 2 + r() * 0.1;
          out.push(sh('line', { x1: f(cx), y1: f(cy), x2: f(cx + Math.cos(t) * 520), y2: f(cy + Math.sin(t) * 520), stroke: fg, 'stroke-width': 1.5 }, true));
        }
        out.push(sh('circle', { cx: f(cx), cy: f(cy), r: f(R), fill: P[0] }));
        out.push(sh('circle', { cx: f(cx), cy: f(cy), r: f(R + 44), fill: 'none', stroke: fg, 'stroke-width': 3 }));
        out.push(sh('circle', { cx: f(cx), cy: f(cy), r: f(R + 96), fill: 'none', stroke: fg, 'stroke-width': 1.5, 'stroke-dasharray': '4 8' }));
        var ta = r() * Math.PI * 2;
        out.push(sh('circle', { cx: f(cx + Math.cos(ta) * (R + 44)), cy: f(cy + Math.sin(ta) * (R + 44)), r: f(18 + r() * 26), fill: P[1 % P.length] === P[0] ? fg : P[1 % P.length] }));
        out.push(sh('circle', { cx: f(cx), cy: f(cy), r: 6, fill: bg }));
        break;
      }
      case 'stripes': {
        var y = TOP, kk = 0;
        while (y < BOT) {
          var th = 2 + Math.pow(kk, 1.55) * 1.2;
          out.push(sh('rect', { x: 0, y: f(y), width: W, height: f(Math.min(th, BOT - y)), fill: fg }));
          y += th + 10 + kk * 0.6; kk++;
        }
        var blend = S.bg === 'paper' ? ' style="mix-blend-mode:multiply"' : '';
        R = 150 + r() * 90;
        out.push('<g' + blend + '>' + sh('circle', { cx: f(R * 0.6 + r() * (600 - R * 1.2)), cy: f(TOP + 110 + r() * 230), r: f(R), fill: P[0] }) + '</g>');
        break;
      }
      case 'glyph': {
        var ch = r() < 0.5 ? p.title.charAt(0).toUpperCase() : String(index + 1);
        out.push(sh('circle', { cx: f(150 + r() * 300), cy: f(TOP + 150 + r() * 200), r: f(110 + r() * 80), fill: P[1 % P.length] === bg ? fg : P[1 % P.length] }));
        out.push('<text class="s" style="--dx:' + f((r() - .5) * 40) + 'px;--dy:' + f((r() - .5) * 40) + 'px;--r:' + f((r() - .5) * 16) + 'deg;--i:' + (k++) + ';font-stretch:75%' +
          '" x="' + f(-30 + r() * 60) + '" y="' + (BOT + 70) + '" font-size="' + (ch.length > 1 ? 520 : 640) + '" font-weight="900" fill="' + P[0] + '" letter-spacing="-30">' + esc(ch) + '</text>');
        out.push(sh('rect', { x: 0, y: f(TOP + 60 + r() * 300), width: W, height: 8, fill: fg }));
        break;
      }
      case 'steps': {
        n = 6 + Math.floor(r() * 5);
        var sw = W / n, flip = r() < 0.5;
        for (i = 0; i < n; i++) {
          var hgt = (BOT - TOP) * ((i + 1) / n) * (0.55 + r() * 0.45);
          var xx = flip ? W - (i + 1) * sw : i * sw;
          out.push(sh('rect', { x: f(xx), y: f(BOT - hgt), width: f(sw - 6), height: f(hgt), fill: i % 3 === 0 ? P[0] : (i % 3 === 1 ? fg : P[1 % P.length]) }));
        }
        out.push(sh('circle', { cx: f(flip ? 120 + r() * 80 : 400 + r() * 80), cy: f(TOP + 70 + r() * 60), r: f(46 + r() * 30), fill: P[0] }));
        break;
      }
    }

    // A faint module grid on some posters, like the construction lines left on the sheet.
    var guides = '';
    if (r() < 0.55) {
      var gl = [];
      for (i = 1; i < 6; i++) gl.push('<line x1="' + (i * 100) + '" y1="' + TOP + '" x2="' + (i * 100) + '" y2="' + BOT + '"/>');
      guides = '<g stroke="' + fg + '" stroke-opacity=".22" stroke-width="1">' + gl.join('') + '</g>';
    }

    // ---- Typography layer (identical system on every poster) ----
    var num = String(index + 1).padStart(2, '0');
    var tot = String(total).padStart(2, '0');
    var stat = p.stat || { value: '', label: '' };
    var sv = String(stat.value);
    var ss = Math.min(132, 470 / Math.max(1, sv.length * 0.6));
    var statBase = 548 + ss * 0.74;
    var statW = sv.length * 0.6 * ss;
    var labelW = String(stat.label).length * 8.6;
    var labelBelow = M + statW + 24 > W - M - labelW;
    var titleLines = wrap(p.title, 19).slice(0, 3);
    var ts = titleLines.length > 2 ? 34 : 40;
    var t = [];
    var font = "font-family=\"Archivo, 'Helvetica Neue', Helvetica, Arial, sans-serif\"";

    t.push('<g ' + font + ' fill="' + fg + '">');
    t.push('<text x="' + M + '" y="42" font-size="18" font-weight="700">Nº ' + num + '</text>');
    t.push('<text x="' + (W / 2) + '" y="42" font-size="15" font-weight="500" text-anchor="middle" letter-spacing="1.5">' + esc(String(p.area || '').toUpperCase()) + '</text>');
    t.push('<text x="' + (W - M) + '" y="42" font-size="18" font-weight="700" text-anchor="end">' + esc(p.year || '') + '</text>');
    t.push('<rect x="0" y="' + (BOT + 14) + '" width="' + W + '" height="3"/>');
    t.push('<text x="' + (M - 4) + '" y="' + f(statBase) + '" font-size="' + f(ss) + '" font-weight="900" letter-spacing="' + f(-ss * 0.045) + '">' + esc(sv) + '</text>');
    if (labelBelow) t.push('<text x="' + M + '" y="' + f(statBase + 28) + '" font-size="17" font-weight="500">' + esc(stat.label) + '</text>');
    else t.push('<text x="' + (W - M) + '" y="' + f(statBase) + '" font-size="17" font-weight="500" text-anchor="end">' + esc(stat.label) + '</text>');
    var lastBase = 786;
    titleLines.forEach(function (line, li) {
      var yy = lastBase - (titleLines.length - 1 - li) * (ts * 1.02);
      t.push('<text x="' + (M - 2) + '" y="' + f(yy) + '" font-size="' + ts + '" font-weight="800" letter-spacing="' + f(-ts * 0.02) + '">' + esc(line) + '</text>');
    });
    t.push('<text x="' + M + '" y="' + (H - 26) + '" font-size="16" font-weight="500" opacity=".85">' + esc(p.tag || '') + '</text>');
    t.push('<text x="' + (W - M) + '" y="' + (H - 26) + '" font-size="16" font-weight="700" text-anchor="end">' + num + '/' + tot + '</text>');
    t.push('</g>');

    return '<svg class="poster-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-hidden="true" focusable="false" data-template="' + tpl + '">' +
      '<defs><clipPath id="' + id + '"><rect x="0" y="' + TOP + '" width="' + W + '" height="' + (BOT - TOP) + '"/></clipPath></defs>' +
      '<rect width="' + W + '" height="' + H + '" fill="' + bg + '"/>' +
      '<g clip-path="url(#' + id + ')">' + guides + '<g class="m">' + out.join('') + '</g></g>' +
      t.join('') + '</svg>';
  }

  // Standalone SVG file (for download): inline the hover vars away, keep fonts as a fallback stack.
  function toFile(svgString) {
    return '<?xml version="1.0" encoding="UTF-8"?>\n' + svgString
      .replace(' aria-hidden="true" focusable="false"', '')
      .replace(/ class="s" style="[^"]*"/g, '');
  }

  window.SwissPoster = { make: make, toFile: toFile, hash: hash, colors: C };
})();
