/*
 * audio.js: chiptune sound effects and a tiny looping soundtrack, all synthesized
 * with WebAudio. Muted until the player turns sound on (M or the speaker button).
 */
(function () {
  'use strict';
  const A = (window.ARC = window.ARC || {});
  const S = (A.sound = { on: false, music: true, ctx: null, master: null, musicGain: null });

  function ensure() {
    if (!S.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      S.ctx = new AC();
      S.master = S.ctx.createGain(); S.master.gain.value = 0.22; S.master.connect(S.ctx.destination);
      S.musicGain = S.ctx.createGain(); S.musicGain.gain.value = 0.32; S.musicGain.connect(S.master);
    }
    if (S.ctx.state === 'suspended') S.ctx.resume();
    return S.ctx;
  }

  function note(freq, dur, o) {
    o = o || {};
    if (!S.on) return;
    const c = ensure();
    if (!c) return;
    const t = (o.at != null ? o.at : c.currentTime) + (o.delay || 0);
    const osc = c.createOscillator(), g = c.createGain();
    osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(freq, t);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, o.slide), t + dur);
    const v = o.vol == null ? 0.3 : o.vol;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(o.bus || S.master);
    osc.start(t); osc.stop(t + dur + 0.03);
  }
  function noise(dur, vol) {
    if (!S.on) return;
    const c = ensure();
    if (!c) return;
    const len = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource(), g = c.createGain();
    src.buffer = buf; g.gain.value = vol || 0.15;
    src.connect(g).connect(S.master); src.start();
  }
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  S.sfx = {
    coin() { note(988, 0.07); note(1319, 0.28, { delay: 0.07 }); },
    open() { note(523, 0.06, { vol: 0.18 }); note(784, 0.06, { delay: 0.05, vol: 0.18 }); note(1047, 0.12, { delay: 0.1, vol: 0.18 }); },
    close() { note(784, 0.06, { vol: 0.15 }); note(392, 0.12, { delay: 0.05, vol: 0.15 }); },
    select() { note(1568, 0.04, { vol: 0.12 }); },
    tick() { note(1400 + Math.random() * 300, 0.025, { vol: 0.05 }); },
    bonk() { note(140, 0.09, { type: 'triangle', slide: 70, vol: 0.35 }); },
    beep() { note(880, 0.06, { vol: 0.15 }); note(660, 0.08, { delay: 0.08, vol: 0.15 }); },
    teleport() { note(220, 0.35, { type: 'sawtooth', slide: 1760, vol: 0.12 }); },
    eat() { note(660, 0.05, { vol: 0.18 }); note(990, 0.07, { delay: 0.04, vol: 0.18 }); },
    die() { note(330, 0.5, { type: 'sawtooth', slide: 55, vol: 0.2 }); noise(0.3, 0.12); },
    error() { note(180, 0.12, { type: 'square', vol: 0.15 }); note(150, 0.16, { delay: 0.1, vol: 0.15 }); },
    clunk() { noise(0.12, 0.25); note(90, 0.15, { type: 'triangle', vol: 0.3, delay: 0.05 }); },
    win() { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => note(f, 0.16, { delay: i * 0.09, vol: 0.2 })); },
    start() { [392, 523, 659, 784].forEach((f, i) => note(f, 0.12, { delay: i * 0.07, vol: 0.2 })); },
  };

  /* --- soundtrack: Am F C G arpeggios over a bouncing bass --- */
  const CHORDS = [[45, [57, 60, 64]], [41, [53, 57, 60]], [48, [55, 60, 64]], [43, [55, 59, 62]]];
  const LEAD = [76, null, 72, null, 69, 72, 76, 79, 77, null, 72, null, 69, 72, 77, 76,
    76, null, 72, 67, 64, 67, 72, 76, 74, null, 71, null, 67, 71, 74, 79];
  let timer = null, nextT = 0, step = 0;
  const STEP = 60 / 136 / 4;
  function schedule() {
    const c = S.ctx;
    if (!c) return;
    while (nextT < c.currentTime + 0.15) {
      const bar = Math.floor(step / 16) % 4, s = step % 16, [root, tones] = CHORDS[bar];
      if (s % 2 === 0) note(mtof(root + (s % 4 === 0 ? 0 : 12)), STEP * 1.8, { at: nextT, type: 'triangle', vol: 0.5, bus: S.musicGain });
      note(mtof(tones[s % 3] + 12), STEP * 0.9, { at: nextT, type: 'square', vol: 0.06, bus: S.musicGain });
      const ld = LEAD[(Math.floor(step / 2)) % LEAD.length];
      if (s % 2 === 0 && ld && Math.floor(step / 64) % 2 === 1) note(mtof(ld), STEP * 1.9, { at: nextT, type: 'square', vol: 0.09, bus: S.musicGain });
      if (s % 4 === 2) { /* hat */ }
      nextT += STEP; step++;
    }
  }
  function startMusic() {
    if (timer || !S.on || !S.music) return;
    const c = ensure();
    if (!c) return;
    nextT = c.currentTime + 0.05;
    timer = setInterval(schedule, 40);
  }
  function stopMusic() { if (timer) { clearInterval(timer); timer = null; } }

  S.set = function (on) {
    S.on = !!on;
    try { localStorage.setItem('arc-sound', S.on ? '1' : '0'); } catch (e) { /* storage unavailable */ }
    if (S.on) { ensure(); startMusic(); } else stopMusic();
    document.dispatchEvent(new CustomEvent('arc:sound'));
  };
  S.toggle = function () { S.set(!S.on); if (S.on) S.sfx.beep(); };
  S.setMusic = function (on) {
    S.music = !!on;
    if (S.music) startMusic(); else stopMusic();
    document.dispatchEvent(new CustomEvent('arc:sound'));
  };
  // Pause the soundtrack while the tab is hidden.
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopMusic(); else if (S.on) startMusic(); });
})();
