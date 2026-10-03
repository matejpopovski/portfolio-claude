/*
 * Extras: margin doodling, the eraser, the desk lamp, coffee refills,
 * the margin word game, and a few secrets.
 */
(function () {
  "use strict";
  const S = window.SKETCH;
  const P = window.PORTFOLIO;
  if (!S || !P) return;
  const { toast, store, reduce, $, $$ } = S;
  const NS = "http://www.w3.org/2000/svg";
  const body = document.body;
  const book = $("#notebook");

  // ===================== doodle mode =====================
  const svg = $("#scribbles");
  const drawBtn = $("#toolDraw");
  const inks = $("#inks");
  let ink = "#3a3d44";
  let strokes = store.get("mp5-doodles", []);
  if (!Array.isArray(strokes)) strokes = [];
  let live = null;

  function size() {
    const w = book.offsetWidth, h = book.offsetHeight;
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    return { w, h };
  }
  function pathFor(pts, w) {
    if (!pts.length) return "";
    const P0 = pts.map(([fx, y]) => [fx * w, y]);
    if (P0.length === 1) return `M${P0[0][0]} ${P0[0][1]} l0.1 0`;
    let d = `M${P0[0][0].toFixed(1)} ${P0[0][1].toFixed(1)}`;
    for (let i = 1; i < P0.length - 1; i++) {
      const mx = (P0[i][0] + P0[i + 1][0]) / 2, my = (P0[i][1] + P0[i + 1][1]) / 2;
      d += ` Q${P0[i][0].toFixed(1)} ${P0[i][1].toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
    }
    const L = P0[P0.length - 1];
    return d + ` L${L[0].toFixed(1)} ${L[1].toFixed(1)}`;
  }
  function strokeEl(s, w) {
    const p = document.createElementNS(NS, "path");
    p.setAttribute("d", pathFor(s.pts, w));
    p.setAttribute("class", s.c === "hl" ? "scr scr--hl" : "scr");
    if (s.c !== "hl") p.style.stroke = s.c;
    return p;
  }
  function render() {
    const { w } = size();
    svg.innerHTML = "";
    strokes.forEach((s) => svg.appendChild(strokeEl(s, w)));
  }
  function setDrawing(on) {
    body.classList.toggle("is-drawing", on);
    drawBtn.setAttribute("aria-pressed", on);
    inks.hidden = !on;
    if (on) { size(); toast("doodle mode: draw anywhere on the page. Esc to stop.", 2600); }
  }
  drawBtn.addEventListener("click", () => setDrawing(!body.classList.contains("is-drawing")));
  inks.addEventListener("click", (e) => {
    const b = e.target.closest(".ink-dot");
    if (!b) return;
    ink = b.dataset.ink;
    $$(".ink-dot", inks).forEach((x) => x.setAttribute("aria-pressed", x === b));
  });
  function local(e) {
    const r = book.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width, e.clientY - r.top];
  }
  svg.addEventListener("pointerdown", (e) => {
    if (!body.classList.contains("is-drawing")) return;
    e.preventDefault();
    svg.setPointerCapture(e.pointerId);
    live = { c: ink, pts: [local(e)] };
    live.el = strokeEl(live, book.offsetWidth);
    svg.appendChild(live.el);
  });
  svg.addEventListener("pointermove", (e) => {
    if (!live) return;
    const pt = local(e);
    const last = live.pts[live.pts.length - 1];
    const w = book.offsetWidth;
    if (Math.hypot((pt[0] - last[0]) * w, pt[1] - last[1]) < 2.5) return;
    live.pts.push([+pt[0].toFixed(4), Math.round(pt[1] * 10) / 10]);
    live.el.setAttribute("d", pathFor(live.pts, w));
  });
  const endStroke = () => {
    if (!live) return;
    strokes.push({ c: live.c, pts: live.pts });
    if (strokes.length > 300) strokes.shift();
    live = null;
    store.set("mp5-doodles", strokes);
  };
  svg.addEventListener("pointerup", endStroke);
  svg.addEventListener("pointercancel", endStroke);

  $("#toolErase").addEventListener("click", () => {
    if (!strokes.length) { toast("nothing to erase yet. try the doodle pencil first."); return; }
    svg.classList.add("is-erasing");
    setTimeout(() => {
      strokes = [];
      store.del("mp5-doodles");
      svg.classList.remove("is-erasing");
      render();
      toast("erased. eraser crumbs everywhere.");
    }, reduce ? 0 : 700);
  });
  let rT;
  window.addEventListener("resize", () => { clearTimeout(rT); rT = setTimeout(render, 120); });
  new ResizeObserver(() => { clearTimeout(rT); rT = setTimeout(render, 120); }).observe(book);
  render();

  // ===================== desk lamp =====================
  const lampBtn = $("#toolLamp");
  const lamp = $(".lamp");
  function setLamp(on) {
    body.classList.toggle("lamp-on", on);
    lampBtn.setAttribute("aria-pressed", on);
    if (on) toast("lights out. the desk lamp follows your pointer.", 2600);
  }
  lampBtn.addEventListener("click", () => setLamp(!body.classList.contains("lamp-on")));
  window.addEventListener("pointermove", (e) => {
    if (!body.classList.contains("lamp-on")) return;
    lamp.style.setProperty("--lx", e.clientX + "px");
    lamp.style.setProperty("--ly", e.clientY + "px");
  }, { passive: true });

  // ===================== coffee =====================
  let cups = 1;
  const coffee = $(".coffee");
  function refill() {
    cups++;
    $("#coffeeCount").textContent = cups;
    const ring = document.createElement("div");
    ring.className = "coffee coffee--extra";
    ring.setAttribute("aria-hidden", "true");
    const pages = $$(".page");
    const pg = pages[Math.floor(Math.random() * pages.length)];
    ring.style.left = 10 + Math.random() * 70 + "%";
    ring.style.top = 10 + Math.random() * 70 + "%";
    ring.style.setProperty("--r", Math.random() * 360 + "deg");
    pg.appendChild(ring);
    const lines = ["refill #" + cups + ". that's another ring somewhere in the notebook.", "cup " + cups + ". the code is getting faster.", "cup " + cups + ". hands slightly shakier now.", "cup " + cups + ". someone stop this person."];
    toast(lines[Math.min(lines.length - 1, Math.floor((cups - 2) / 2))]);
  }
  coffee.addEventListener("click", refill);
  coffee.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); refill(); } });

  // ===================== keyboard: shortcuts & secrets =====================
  const konami = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
  let kseq = [];
  let typed = "";
  document.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const inGame = e.target.closest && e.target.closest("#game");
    const inCanvas = e.target.id === "pf";
    if (e.key === "Escape" && body.classList.contains("is-drawing")) { setDrawing(false); return; }
    kseq.push(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    kseq = kseq.slice(-konami.length);
    if (kseq.join() === konami.join()) { blueprint(); kseq = []; }
    if (inGame || inCanvas || $("#entry").open) return;
    if (e.key.length === 1) {
      typed = (typed + e.key.toLowerCase()).slice(-12);
      if (typed.endsWith("robot")) { walkRobot(); typed = ""; return; }
      if (typed.endsWith("coffee")) { refill(); typed = ""; return; }
    }
    if (e.key === "d" || e.key === "D") setDrawing(!body.classList.contains("is-drawing"));
    if (e.key === "l" || e.key === "L") setLamp(!body.classList.contains("lamp-on"));
  });

  function blueprint() {
    const on = document.documentElement.classList.toggle("blueprint");
    toast(on ? "blueprint mode unlocked. very engineer. (do it again to undo)" : "back to pencil and paper.");
  }

  function walkRobot() {
    if (reduce) { toast("beep boop. (a robot would walk by, but you prefer less motion.)"); return; }
    const r = document.createElement("div");
    r.className = "walker";
    r.setAttribute("aria-hidden", "true");
    r.innerHTML = `<svg viewBox="0 0 80 100"><g fill="#fdfbf5" stroke="#2f3238" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" filter="url(#wobble)">
      <path d="M40 6 V16"/><circle cx="40" cy="5" r="3" fill="#c8402f"/>
      <rect x="22" y="16" width="36" height="26" rx="5"/><circle cx="33" cy="29" r="3" fill="#2f3238"/><circle cx="48" cy="29" r="3" fill="#2f3238"/>
      <rect x="18" y="46" width="44" height="30" rx="4"/><path d="M30 58 h20" stroke="#c8402f"/>
      <path class="walker__arm" d="M18 50 L8 66"/><path class="walker__arm walker__arm--r" d="M62 50 L72 66"/>
      <path class="walker__leg" d="M30 76 V96"/><path class="walker__leg walker__leg--r" d="M50 76 V96"/></g></svg>
      <span class="walker__say">beep. hi!</span>`;
    body.appendChild(r);
    r.addEventListener("animationend", (e) => { if (e.animationName === "walk-across") r.remove(); });
  }

  // ===================== margin word game =====================
  const words = (P.words || []).filter((w) => /^[A-Z]+$/i.test(w)).map((w) => w.toUpperCase());
  const gameRobot = $(".game__robot");
  const wordEl = $("#gameWord");
  const msgEl = $("#gameMsg");
  const keysEl = $("#gameKeys");
  if (words.length && gameRobot) {
    const parts = [
      '<path d="M44 128 V104 M76 128 V104 M36 130 h16 M68 130 h16"/>', // legs
      '<rect x="30" y="66" width="60" height="40" rx="5"/>', // body
      '<path d="M30 74 L14 94 M90 74 L106 94"/>', // arms
      '<rect x="38" y="34" width="44" height="30" rx="6"/>', // head
      '<path d="M60 34 V20"/><circle cx="60" cy="16" r="4"/>', // antenna
      '<circle cx="51" cy="48" r="3.4" class="fillink"/><circle cx="69" cy="48" r="3.4" class="fillink"/><path d="M50 82 h20 M50 90 h12" class="red"/>', // face + power
    ];
    gameRobot.innerHTML = `<g class="game__ghost">${parts.join("")}</g><g class="game__parts">${parts.map((p, i) => `<g class="gp" data-k="${i}">${p}</g>`).join("")}</g><path class="game__floor" d="M6 132 C 40 128, 80 135, 114 131"/>`;
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    keysEl.innerHTML = letters.map((l) => `<button type="button" class="gk" data-l="${l}">${l}</button>`).join("") + `<button type="button" class="gk gk--new" data-new="1">new word</button>`;
    let word = "", guessed = new Set(), wrong = 0, over = false, lastWord = "";
    function newGame() {
      do { word = words[Math.floor(Math.random() * words.length)]; } while (words.length > 1 && word === lastWord);
      lastWord = word;
      guessed = new Set(); wrong = 0; over = false;
      $$(".gk", keysEl).forEach((b) => { if (b.dataset.l) { b.disabled = false; b.className = "gk"; } });
      msgEl.textContent = "6 wrong guesses and it's alive.";
      draw();
    }
    function draw() {
      wordEl.innerHTML = word.split("").map((c) => `<span class="${guessed.has(c) ? "is-on" : ""}">${guessed.has(c) || over ? c : "&nbsp;"}</span>`).join("");
      wordEl.setAttribute("aria-label", "Word: " + word.split("").map((c) => (guessed.has(c) ? c : "blank")).join(", "));
      $$(".gp", gameRobot).forEach((g) => g.classList.toggle("is-on", +g.dataset.k < wrong));
    }
    function guess(l) {
      if (over || guessed.has(l)) return;
      guessed.add(l);
      const b = $(`.gk[data-l="${l}"]`, keysEl);
      const hit = word.includes(l);
      if (b) { b.disabled = true; b.classList.add(hit ? "is-hit" : "is-miss"); }
      if (!hit) wrong++;
      if (word.split("").every((c) => guessed.has(c))) {
        over = true;
        msgEl.textContent = wrong ? `got it: ${word}! the robot stays in pieces.` : `${word}, flawless. not even a bolt.`;
      } else if (wrong >= 6) {
        over = true;
        msgEl.textContent = `the robot built itself. the word was ${word}.`;
        gameRobot.classList.add("is-alive");
        setTimeout(() => gameRobot.classList.remove("is-alive"), 1400);
      } else if (!hit) {
        msgEl.textContent = `no ${l}. ${6 - wrong} part${6 - wrong === 1 ? "" : "s"} left before it's alive.`;
      } else msgEl.textContent = `yes, ${l}.`;
      draw();
    }
    keysEl.addEventListener("click", (e) => {
      const b = e.target.closest(".gk");
      if (!b) return;
      if (b.dataset.new) newGame(); else guess(b.dataset.l);
    });
    $("#game").addEventListener("keydown", (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^[a-z]$/i.test(e.key)) { e.preventDefault(); guess(e.key.toUpperCase()); }
    });
    newGame();
  }
})();
