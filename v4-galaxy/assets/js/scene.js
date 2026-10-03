/*
 * The Galaxy: a three.js solar system built from window.PORTFOLIO.
 *   - Matej is the star at the centre.
 *   - Each project is a procedurally shaded planet; projects in the same area
 *     share an orbit.
 *   - The timeline is a ring of beacons in an outer asteroid belt, linked by a comet.
 *   - The skill groups are constellations in the sky.
 * The DOM (labels, reticle, panels) stays in charge of content and accessibility;
 * this module only draws and reports picks through `hooks`.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import * as S from './shaders.js';
import { mulberry32, hashStr, KIND_COLORS } from './model.js';

const TAU = Math.PI * 2;
const UP = new THREE.Vector3(0, 1, 0);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 4);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const pad2 = (n) => String(n).padStart(2, '0');
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const STAR_R = 3.6;
export const ORBIT_R0 = 9.5;
export const ORBIT_DR = 3.8;
export const BELT_R = 45;
const SKY_R = 300;
const PLANET_TYPES = [1, 0, 3, 2]; // ocean, gas, molten, ice: cycled by project index

function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.18, 'rgba(255,255,255,0.75)');
  grd.addColorStop(0.45, 'rgba(255,255,255,0.18)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const skyDir = (az, el) => new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));

export function createGalaxy({ canvas, labelsEl, reticleEl, model, hooks = {}, mobile = false, reduced = false, quality = 'auto' }) {
  /* ---------------- renderer + post ---------------- */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.setClearColor(0x02030a, 1);
  const maxPR = mobile ? 1.5 : 1.75;
  let pr = Math.min(window.devicePixelRatio || 1, maxPR);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 4000);
  scene.add(camera);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.enablePan = false;
  controls.rotateSpeed = 0.55;
  controls.zoomSpeed = 0.8;
  controls.minDistance = 6;
  controls.maxDistance = 240;
  controls.autoRotateSpeed = 0.22;
  controls.maxPolarAngle = Math.PI * 0.93;

  const isGL2 = renderer.capabilities.isWebGL2;
  const rt = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, samples: isGL2 && !mobile ? 4 : 0 });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(2, 2), 0.95, 0.6, 0.55);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const BLOOM_BASE = 0.95;

  const uTime = { value: 0 };
  const uPR = { value: pr };
  const glowTex = glowTexture();

  /* ---------------- sky ---------------- */
  const skyMat = new THREE.ShaderMaterial({
    uniforms: { uBoost: { value: 1 } }, vertexShader: S.skyVert, fragmentShader: S.skyFrag,
    side: THREE.BackSide, depthWrite: false, depthTest: false,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 48, 24), skyMat);
  sky.renderOrder = -10;
  scene.add(sky);

  {
    const N = mobile ? 2400 : 5000;
    const rng = mulberry32(7);
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), size = new Float32Array(N), phase = new Float32Array(N);
    const tints = [new THREE.Color('#ffffff'), new THREE.Color('#cfe0ff'), new THREE.Color('#9fc2ff'), new THREE.Color('#ffe2c0'), new THREE.Color('#ffd0a8')];
    const bandN = new THREE.Vector3(0.35, 1, 0.2).normalize();
    const v = new THREE.Vector3();
    for (let i = 0; i < N; i++) {
      // bias a third of the stars into the galactic band
      do {
        v.set(rng() * 2 - 1, rng() * 2 - 1, rng() * 2 - 1);
      } while (v.lengthSq() > 1 || v.lengthSq() < 0.01);
      v.normalize();
      if (i % 3 === 0) { v.addScaledVector(bandN, -v.dot(bandN) * 0.85).normalize(); }
      const r = 600 + rng() * 700;
      pos.set([v.x * r, v.y * r, v.z * r], i * 3);
      const c = tints[Math.floor(rng() * tints.length)];
      col.set([c.r, c.g, c.b], i * 3);
      size[i] = 0.6 + Math.pow(rng(), 6) * 3.6;
      phase[i] = rng();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    g.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
    const m = new THREE.ShaderMaterial({
      uniforms: { uTime, uPR }, vertexShader: S.starsVert, fragmentShader: S.starsFrag,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const stars = new THREE.Points(g, m);
    stars.frustumCulled = false;
    scene.add(stars);
  }

  /* ---------------- the star ---------------- */
  const sunU = { uTime, uIntensity: { value: 1 }, uHover: { value: 0 } };
  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(STAR_R, 96, 64),
    new THREE.ShaderMaterial({ uniforms: sunU, vertexShader: S.sunVert, fragmentShader: S.sunFrag })
  );
  sun.userData.pick = { kind: 'star' };
  scene.add(sun);
  const coronaU = { uTime, uIntensity: { value: 1 }, uEdge: { value: 1 / 3.6 } };
  const corona = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.ShaderMaterial({
      uniforms: coronaU, vertexShader: S.coronaVert, fragmentShader: S.coronaFrag,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    })
  );
  const CORONA_SCALE = STAR_R * 7.2;
  coronaU.uEdge.value = (STAR_R * 0.98) / (CORONA_SCALE / 2);
  corona.scale.setScalar(CORONA_SCALE);
  scene.add(corona);
  scene.add(new THREE.PointLight(0xffe0bd, 3.4, 0, 0));
  scene.add(new THREE.AmbientLight(0x6070a0, 0.28));

  /* ---------------- orbits + planets ---------------- */
  const sphereGeo = new THREE.SphereGeometry(1, 72, 48);
  const lowSphere = new THREE.SphereGeometry(1, 20, 14);
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });
  const pickables = [sun];

  const orbits = model.areas.map((a, ai) => {
    const rng = mulberry32(hashStr(a.name));
    const r = ORBIT_R0 + ai * ORBIT_DR;
    const pivot = new THREE.Group();
    pivot.rotation.x = (rng() - 0.5) * 0.09;
    pivot.rotation.z = (rng() - 0.5) * 0.09;
    scene.add(pivot);
    const pts = [];
    for (let i = 0; i < 256; i++) { const t = (i / 256) * TAU; pts.push(new THREE.Vector3(Math.cos(t) * r, 0, Math.sin(t) * r)); }
    const lineMat = new THREE.LineBasicMaterial({ color: new THREE.Color(a.color), transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending });
    const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), lineMat);
    pivot.add(line);
    return { r, pivot, lineMat, omega: 2.4 / Math.pow(r, 1.5), phase0: ai * 2.39996, hi: 0 };
  });

  const trailGeo = (() => {
    const n = 72, pos = new Float32Array(n * 3), t = new Float32Array(n);
    for (let i = 0; i < n; i++) { const k = i / (n - 1); const ang = -1.1 + k * 1.1; pos.set([Math.cos(ang), 0, Math.sin(ang)], i * 3); t[i] = k; }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aT', new THREE.BufferAttribute(t, 1));
    return g;
  })();

  const planets = model.projects.map((p, i) => {
    const area = model.areas[p.areaIndex];
    const orbit = orbits[p.areaIndex];
    const rng = mulberry32(hashStr(p.title) ^ 0x9e3779b9);
    const type = PLANET_TYPES[i % PLANET_TYPES.length];
    const radius = (1.85 - i * 0.065) * (type === 0 ? 1.16 : 1);
    const k = area.projects.indexOf(i), n = area.projects.length;
    const theta0 = orbit.phase0 + (k / n) * TAU;

    const hsl = {};
    new THREE.Color(area.color).getHSL(hsl, THREE.SRGBColorSpace);
    const h = hsl.h + (rng() - 0.5) * 0.06;
    const c = (hh, ss, ll) => new THREE.Color().setHSL(((hh % 1) + 1) % 1, clamp(ss, 0, 1), clamp(ll, 0, 1), THREE.SRGBColorSpace);
    let A, B, C;
    if (type === 1) { A = c(h, 0.72, 0.36); B = c(h + 0.14, 0.32, 0.42); C = c(h + 0.1, 0.18, 0.72); }
    else if (type === 0) { A = c(h, 0.5, 0.3); B = c(h + 0.04, 0.6, 0.6); C = c(h - 0.06, 0.45, 0.84); }
    else if (type === 2) { A = c(h, 0.3, 0.3); B = c(h, 0.65, 0.6); C = c(h, 0.25, 0.7); }
    else { A = c(h, 0.25, 0.2); B = c(h, 1, 0.55).multiplyScalar(2.2); C = A.clone(); }
    const atmo = new THREE.Color(area.color).multiplyScalar(0.85);

    const u = {
      uA: { value: A }, uB: { value: B }, uC: { value: C }, uAtmo: { value: atmo },
      uType: { value: type }, uSeed: { value: rng() * 10 }, uTime, uHover: { value: 0 }, uSun: { value: 1 },
    };
    const holder = new THREE.Group();
    orbit.pivot.add(holder);
    const tilt = new THREE.Group();
    tilt.rotation.z = (rng() - 0.5) * 0.7;
    tilt.rotation.x = (rng() - 0.5) * 0.3;
    holder.add(tilt);
    const mesh = new THREE.Mesh(sphereGeo, new THREE.ShaderMaterial({ uniforms: u, vertexShader: S.planetVert, fragmentShader: S.planetFrag }));
    mesh.scale.setScalar(radius);
    mesh.rotation.y = rng() * TAU;
    tilt.add(mesh);

    const atmoMesh = new THREE.Mesh(sphereGeo, new THREE.ShaderMaterial({
      uniforms: { uAtmo: u.uAtmo, uHover: u.uHover }, vertexShader: S.atmoVert, fragmentShader: S.atmoFrag,
      side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    atmoMesh.scale.setScalar(radius * 1.16);
    holder.add(atmoMesh);

    if (i % 3 === 1) {
      const rin = 1.4, rout = 2.35;
      const ring = new THREE.Mesh(new THREE.RingGeometry(rin, rout, 128, 1), new THREE.ShaderMaterial({
        uniforms: { uCol: { value: c(h + 0.03, 0.35, 0.72) }, uSeed: { value: rng() }, uIn: { value: rin }, uOut: { value: rout } },
        vertexShader: S.ringVert, fragmentShader: S.ringFrag, transparent: true, depthWrite: false, side: THREE.DoubleSide,
      }));
      ring.rotation.x = -Math.PI / 2 + 0.38;
      ring.scale.setScalar(radius);
      tilt.add(ring);
    }

    const moons = [];
    const moonCount = (i * 7 + 3) % 4;
    for (let m = 0; m < moonCount; m++) {
      const mp = new THREE.Group();
      mp.rotation.x = (rng() - 0.5) * 0.9;
      mp.rotation.z = (rng() - 0.5) * 0.5;
      const spin = new THREE.Group();
      mp.add(spin);
      const moon = new THREE.Mesh(lowSphere, new THREE.MeshStandardMaterial({ color: c(h, 0.08, 0.62 - m * 0.08), roughness: 1, metalness: 0 }));
      moon.scale.setScalar(radius * (0.13 + rng() * 0.09));
      moon.position.x = radius * (2.0 + m * 0.62);
      spin.add(moon);
      holder.add(mp);
      moons.push({ spin, speed: (0.9 + rng() * 0.8) / (1 + m * 0.6), phase: rng() * TAU });
    }

    const trailMat = new THREE.ShaderMaterial({
      uniforms: { uCol: { value: new THREE.Color(area.color) }, uOpacity: { value: 0.55 }, uCut: { value: 1 - (radius * 1.25) / (orbit.r * 1.1) } },
      vertexShader: S.trailVert, fragmentShader: S.trailFrag,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const trail = new THREE.Line(trailGeo, trailMat);
    trail.scale.setScalar(orbit.r);
    orbit.pivot.add(trail);

    const hit = new THREE.Mesh(lowSphere, hitMat);
    hit.scale.setScalar(Math.max(radius * 1.7, 2.2));
    hit.userData.pick = { kind: 'planet', index: i };
    holder.add(hit);
    pickables.push(hit);

    const reach = radius * Math.max(i % 3 === 1 ? 2.4 : 1.2, moons.length ? 2.25 + 0.62 * (moons.length - 1) : 0);
    return {
      p, i, area, orbit, holder, mesh, u, moons, trail, trailMat, radius, theta0, reach,
      spin: (0.12 + rng() * 0.2) * (rng() < 0.2 ? -1 : 1),
      world: new THREE.Vector3(), hover: 0, label: null,
    };
  });

  /* ---------------- asteroid belt ---------------- */
  const belt = new THREE.Group();
  scene.add(belt);
  {
    const geo = new THREE.IcosahedronGeometry(1, 1);
    const pa = geo.attributes.position;
    for (let i = 0; i < pa.count; i++) {
      const x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i);
      const hsh = Math.abs(Math.sin(Math.round(x * 997) * 12.9898 + Math.round(y * 991) * 78.233 + Math.round(z * 983) * 37.719) * 43758.5453) % 1;
      const s = 0.72 + hsh * 0.5;
      pa.setXYZ(i, x * s, y * s * 0.8, z * s);
    }
    geo.computeVertexNormals();
    const count = mobile ? 420 : 900;
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, metalness: 0.05, flatShading: true });
    const inst = new THREE.InstancedMesh(geo, mat, count);
    const rng = mulberry32(42);
    const gauss = () => (rng() + rng() + rng() - 1.5) / 1.5;
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sv = new THREE.Vector3(), pv = new THREE.Vector3();
    const tint = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const t = rng() * TAU, r = BELT_R + gauss() * 2.6;
      pv.set(Math.cos(t) * r, gauss() * 0.9, Math.sin(t) * r);
      e.set(rng() * TAU, rng() * TAU, rng() * TAU);
      q.setFromEuler(e);
      const s = 0.08 + Math.pow(rng(), 3) * 0.5;
      sv.set(s, s * (0.6 + rng() * 0.5), s);
      m4.compose(pv, q, sv);
      inst.setMatrixAt(i, m4);
      inst.setColorAt(i, tint.setHSL(0.07 + rng() * 0.06, 0.12 + rng() * 0.1, 0.32 + rng() * 0.18, THREE.SRGBColorSpace));
    }
    belt.add(inst);
    // faint dust ring
    const dust = new THREE.Mesh(new THREE.RingGeometry(BELT_R - 4, BELT_R + 4, 160, 1), new THREE.ShaderMaterial({
      uniforms: { uCol: { value: new THREE.Color('#8a7a6a') }, uSeed: { value: 0.3 }, uIn: { value: BELT_R - 4 }, uOut: { value: BELT_R + 4 } },
      vertexShader: S.ringVert, fragmentShader: S.ringFrag, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    }));
    dust.rotation.x = -Math.PI / 2;
    dust.material.opacity = 0.2;
    dust.scale.setScalar(1);
    dust.visible = true;
    belt.add(dust);
    dust.material.uniforms.uCol.value.multiplyScalar(0.18);
  }

  /* ---------------- timeline beacons + comet ---------------- */
  const beaconGeo = new THREE.OctahedronGeometry(0.75, 0);
  const n = model.chrono.length;
  const beacons = model.chrono.map((t, j) => {
    const ang = -2.55 + (n > 1 ? (j / (n - 1)) * 4.9 : 0);
    const pos = new THREE.Vector3(Math.cos(ang) * BELT_R, 2.2, Math.sin(ang) * BELT_R);
    const color = new THREE.Color(KIND_COLORS[t.kind] || '#ffffff');
    const g = new THREE.Group();
    g.position.copy(pos);
    const core = new THREE.Mesh(beaconGeo, new THREE.MeshBasicMaterial({ color: color.clone().multiplyScalar(1.6), wireframe: true }));
    g.add(core);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.85 }));
    glow.scale.setScalar(3.4);
    g.add(glow);
    const beam = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -3.2, 0), new THREE.Vector3(0, 6, 0)]),
      new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    g.add(beam);
    const hit = new THREE.Mesh(lowSphere, hitMat);
    hit.scale.setScalar(2.2);
    hit.userData.pick = { kind: 'beacon', index: t.index };
    g.add(hit);
    pickables.push(hit);
    scene.add(g);
    return { t, j, g, core, glow, pos, hi: 0, label: null };
  });

  const cometCurve = new THREE.CatmullRomCurve3(
    beacons.map((b, j) => new THREE.Vector3(b.pos.x * 1.07, b.pos.y + (j % 2 ? 3.5 : -1.5), b.pos.z * 1.07)),
    true, 'centripetal'
  );
  const comet = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color('#cfefff').multiplyScalar(2), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  comet.scale.setScalar(2.6);
  scene.add(comet);
  const TAIL = 70;
  const tailPos = new Float32Array(TAIL * 3);
  const tailT = new Float32Array(TAIL);
  for (let i = 0; i < TAIL; i++) tailT[i] = i / (TAIL - 1);
  const tailGeo = new THREE.BufferGeometry();
  tailGeo.setAttribute('position', new THREE.BufferAttribute(tailPos, 3));
  tailGeo.setAttribute('aT', new THREE.BufferAttribute(tailT, 1));
  const tail = new THREE.Points(tailGeo, new THREE.ShaderMaterial({
    uniforms: { uCol: { value: new THREE.Color('#9fdcff') }, uPR }, vertexShader: S.tailVert, fragmentShader: S.tailFrag,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  tail.frustumCulled = false;
  scene.add(tail);
  // faint dotted path the comet follows
  {
    const pts = cometCurve.getSpacedPoints(400);
    const path = new THREE.Points(new THREE.BufferGeometry().setFromPoints(pts), new THREE.PointsMaterial({ color: 0x6fa8d8, size: 0.16, transparent: true, opacity: 0.35, depthWrite: false }));
    scene.add(path);
  }

  /* ---------------- skill constellations ---------------- */
  const skillStars = [];
  const constellations = model.constellations.map((cst, gi) => {
    const color = new THREE.Color(['#bfe6ff', '#ffd9a8', '#d6c4ff', '#b6ffd9', '#ffc4dc'][gi % 5]);
    const pts = cst.items.map((it) => skyDir(it.az, it.el).multiplyScalar(SKY_R));
    const segs = [];
    cst.edges.forEach(([a, b]) => { segs.push(pts[a], pts[b]); });
    const lineMat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.08, depthWrite: false, blending: THREE.AdditiveBlending });
    const lines = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(segs), lineMat);
    scene.add(lines);
    const stars = cst.items.map((it, k) => {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: color.clone().multiplyScalar(1.4), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.6 }));
      const base = it.bright ? 7.5 : 5.2;
      sp.scale.setScalar(base);
      sp.position.copy(pts[k]);
      scene.add(sp);
      const s = { it, gi, k, sp, base, hi: 0, pos: pts[k], label: null };
      skillStars.push(s);
      return s;
    });
    const center = skyDir(cst.center.az, cst.center.el - 0.11).multiplyScalar(SKY_R);
    return { cst, lines, lineMat, stars, color, center, label: null };
  });

  /* ---------------- pulses, warp streaks, shooting stars ---------------- */
  const pulses = [];
  const ringGeo = new THREE.RingGeometry(0.97, 1, 160, 1);
  function pulse(color = '#ffb547', maxR = 60, dur = 3.2, y = 0) {
    const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(1.6), transparent: true, opacity: 0.9, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    m.position.y = y;
    m.scale.setScalar(STAR_R);
    scene.add(m);
    pulses.push({ m, t: 0, dur, maxR });
  }

  const STREAKS = 460;
  const streakData = [];
  const streakPos = new Float32Array(STREAKS * 6);
  {
    const rng = mulberry32(99);
    for (let i = 0; i < STREAKS; i++) {
      const a = rng() * TAU, r = 3 + Math.pow(rng(), 0.7) * 34;
      streakData.push({ x: Math.cos(a) * r, y: Math.sin(a) * r, z: rng() * 160, len: 4 + rng() * 14 });
    }
  }
  const streakGeo = new THREE.BufferGeometry();
  streakGeo.setAttribute('position', new THREE.BufferAttribute(streakPos, 3));
  const streakMat = new THREE.LineBasicMaterial({ color: new THREE.Color('#cfe6ff').multiplyScalar(1.5), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const streaks = new THREE.LineSegments(streakGeo, streakMat);
  streaks.frustumCulled = false;
  streaks.visible = false;
  camera.add(streaks);

  const shooting = [];
  let nextShoot = 4;
  function spawnShootingStar() {
    const rng = Math.random;
    const dir = skyDir(rng() * TAU, 0.15 + rng() * 0.9);
    const start = dir.clone().multiplyScalar(500);
    const vel = new THREE.Vector3().randomDirection().cross(dir).normalize().multiplyScalar(260);
    const g = new THREE.BufferGeometry().setFromPoints([start.clone(), start.clone()]);
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array([1.6, 1.7, 2, 0, 0, 0]), 3));
    const line = new THREE.Line(g, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    line.frustumCulled = false;
    scene.add(line);
    shooting.push({ line, start, vel, t: 0, dur: 0.9 + rng() * 0.6 });
  }

  /* ---------------- HTML labels ---------------- */
  function makeLabel(cls, html, aria, pick, color) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'lbl ' + cls;
    b.innerHTML = html;
    b.setAttribute('aria-label', aria);
    if (color) b.style.setProperty('--c', color);
    b.addEventListener('click', (e) => { e.stopPropagation(); hooks.onPick?.(pick); });
    b.addEventListener('pointerenter', () => setHover(pick, 'label'));
    b.addEventListener('pointerleave', () => setHover(null, 'label'));
    b.addEventListener('focus', () => setHover(pick, 'focus'));
    b.addEventListener('blur', () => setHover(null, 'focus'));
    labelsEl.appendChild(b);
    return b;
  }
  const P = model.P;
  const starLabel = makeLabel('lbl-star',
    `<span class="lbl-name">${esc(P.name)}</span><span class="lbl-tag">${esc(P.title)}</span>`,
    `The star: about ${P.name}`, { kind: 'star' });
  planets.forEach((pl) => {
    pl.label = makeLabel('lbl-planet',
      `<span class="lbl-idx">${pad2(pl.i + 1)}</span><span class="lbl-name">${esc(pl.p.title)}</span><span class="lbl-tag">${esc(pl.p.tag)}</span>`,
      `Fly to project ${pl.i + 1}: ${pl.p.title} (${pl.p.area})`, { kind: 'planet', index: pl.i }, pl.area.color);
  });
  beacons.forEach((b) => {
    b.label = makeLabel('lbl-beacon',
      `<span class="lbl-idx">${esc(b.t.year)}</span><span class="lbl-name">${esc(b.t.title)}</span><span class="lbl-tag">${esc(b.t.org)}</span>`,
      `Voyage log ${b.t.year}: ${b.t.title}, ${b.t.org}`, { kind: 'beacon', index: b.t.index }, KIND_COLORS[b.t.kind]);
  });
  constellations.forEach((c, gi) => {
    c.label = document.createElement('div');
    c.label.className = 'lbl lbl-group';
    c.label.setAttribute('aria-hidden', 'true');
    c.label.textContent = c.cst.group;
    labelsEl.appendChild(c.label);
    c.stars.forEach((s) => {
      s.label = makeLabel('lbl-skill', `<span class="lbl-name">${esc(s.it.name)}</span>`, `${s.it.name} (${c.cst.group})`, { kind: 'skill', group: gi, index: s.k }, '#' + c.color.getHexString());
    });
  });

  /* ---------------- state ---------------- */
  const S0 = {
    mode: 'overview', index: -1, focus: null,
    timeScale: 1, timeTarget: 1, simT: 0, realT: 0,
    hover: null, hoverSrc: null, hiArea: -1, hiSkill: null, hiBeacon: -1,
    insetTarget: { x: 0, y: 0 }, inset: { x: 0, y: 0 },
    lastInteract: -1e9, tween: null, warp: null, nova: null, shake: 0,
    baseFov: 50, fovTarget: 50, paused: false, running: false, skillsActive: 0,
    pulseTimer: 0, frame: 0, fps: 60, frameTimes: [], adapted: quality !== 'auto',
  };
  let W = 1, H = 1;

  controls.addEventListener('start', () => { S0.lastInteract = S0.realT; });

  /* ---------------- camera helpers ---------------- */
  const tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3(), tmpQ = new THREE.Quaternion();
  function fitDistance(R) {
    const vf = THREE.MathUtils.degToRad(S0.baseFov);
    const aspect = W / Math.max(H, 1);
    const hf = 2 * Math.atan(Math.tan(vf / 2) * aspect);
    const dH = R / Math.tan(hf / 2);
    const dV = (R * 0.7) / Math.tan(vf / 2);
    return Math.max(dH, dV);
  }
  function currentAzimuth() {
    tmpV.copy(camera.position).sub(controls.target);
    return Math.atan2(tmpV.x, tmpV.z);
  }
  const fromSpherical = (d, polar, az, out = new THREE.Vector3()) => out.setFromSphericalCoords(d, polar, az);

  // Pick a close-up angle that sees the planet three-quarter lit and isn't
  // blocked by a neighbour (rings and moons included) or by the star.
  const ORIGIN = new THREE.Vector3();
  function segDist(p, a, b) {
    const ab = tmpV.copy(b).sub(a);
    const t = clamp(tmpV2.copy(p).sub(a).dot(ab) / Math.max(ab.lengthSq(), 1e-6), 0, 1);
    return tmpV2.copy(a).addScaledVector(ab, t).distanceTo(p);
  }
  function clearDirection(pl, dist) {
    const tgt = pl.world.clone();
    const u = new THREE.Vector3(tgt.x, 0, tgt.z).normalize();
    const t = new THREE.Vector3(-u.z, 0, u.x);
    const base = new THREE.Vector3().addScaledVector(u, -0.55).addScaledVector(t, -0.78).normalize();
    let best = null, bestScore = -Infinity;
    const cam = new THREE.Vector3();
    for (const a of [0, 0.35, -0.35, 0.7, -0.7, 1.05, -1.05, 1.5, -1.5, 2.2, -2.2]) {
      for (const el of [0.4, 0.22, 0.65, 0.9]) {
        const h = base.clone().applyAxisAngle(UP, a);
        const dir = h.multiplyScalar(Math.cos(el)).add(new THREE.Vector3(0, Math.sin(el), 0)).normalize();
        cam.copy(tgt).addScaledVector(dir, dist);
        let clear = segDist(ORIGIN, cam, tgt) - STAR_R * 1.5;
        for (const o of planets) {
          if (o === pl) continue;
          clear = Math.min(clear, segDist(o.world, cam, tgt) - o.reach, o.world.distanceTo(cam) - o.reach - 1.5);
        }
        const score = Math.min(clear, 3) - Math.abs(a) * 0.55 - Math.abs(el - 0.4) * 0.9;
        if (score > bestScore) { bestScore = score; best = dir; }
      }
    }
    return best;
  }

  function viewFor(mode, index) {
    const az = currentAzimuth();
    const portrait = W < H;
    if (mode === 'project') {
      const pl = planets[index];
      const dist = pl.radius * (portrait ? 11.5 : 7.4);
      const dir = clearDirection(pl, dist);
      return {
        target: () => pl.world,
        cam: (tgt) => tgt.clone().addScaledVector(dir, dist),
        minD: pl.radius * 1.8, maxD: 80,
      };
    }
    if (mode === 'about') {
      const d = portrait ? STAR_R * 13 : STAR_R * 8.2;
      return { target: () => new THREE.Vector3(), cam: () => fromSpherical(d, 0.82, az), minD: STAR_R * 1.8, maxD: 120 };
    }
    if (mode === 'voyage') {
      const d = portrait ? fitDistance(30) * 1.05 : fitDistance(BELT_R + 6) * 1.04;
      return { target: () => new THREE.Vector3(), cam: () => fromSpherical(Math.min(d, 200), 0.58, az), minD: 20, maxD: 240 };
    }
    if (mode === 'contact') {
      const d = portrait ? 150 : fitDistance(BELT_R + 10) * 1.35;
      return { target: () => new THREE.Vector3(0, 0, 0), cam: () => fromSpherical(Math.min(d, 220), 1.28, az), minD: 20, maxD: 240 };
    }
    if (mode === 'skills') {
      const pos = portrait ? new THREE.Vector3(0, 10, 72) : new THREE.Vector3(0, 14, 64);
      const dir = skyDir(0, 0.5);
      return { target: () => pos.clone().addScaledVector(dir, 20), cam: () => pos.clone(), minD: 1, maxD: 400 };
    }
    // overview
    const d = portrait ? clamp(fitDistance(26), 70, 125) : clamp(fitDistance(BELT_R + 4), 55, 150);
    return { target: () => new THREE.Vector3(), cam: () => fromSpherical(d, portrait ? 0.92 : 1.06, az), minD: 8, maxD: 240 };
  }

  function flyTo(view, { duration = 1.7, arc = 4, easing = easeInOut, onDone } = {}) {
    if (S0.reduced) duration = 0;
    S0.tween = {
      t: 0, duration, arc, easing, onDone, view,
      fromTarget: controls.target.clone(), fromCam: camera.position.clone(),
    };
    controls.enabled = false;
    controls.minDistance = 0;
    controls.maxDistance = Infinity;
  }

  function stepTween(dt) {
    const tw = S0.tween;
    if (!tw) return;
    tw.t = tw.duration > 0 ? Math.min(1, tw.t + dt / tw.duration) : 1;
    const k = tw.easing(tw.t);
    const tgt = tw.view.target();
    const cp = tw.view.cam(tgt);
    controls.target.lerpVectors(tw.fromTarget, tgt, k);
    // Swing around the star instead of through it: slerp the direction, lerp the radius.
    const ra = tw.fromCam.length(), rb = cp.length();
    const da = tmpV.copy(tw.fromCam).normalize();
    const db = tmpV2.copy(cp).normalize();
    tmpQ.setFromUnitVectors(da, db);
    const q = new THREE.Quaternion().slerp(tmpQ, k);
    camera.position.copy(da).applyQuaternion(q).multiplyScalar(THREE.MathUtils.lerp(ra, rb, k));
    camera.position.y += Math.sin(Math.PI * k) * tw.arc;
    if (tw.t >= 1) {
      camera.position.copy(cp);
      controls.target.copy(tgt);
      S0.tween = null;
      controls.enabled = S0.mode !== 'skills';
      controls.minDistance = tw.view.minD;
      controls.maxDistance = tw.view.maxD;
      tw.onDone?.();
    }
  }

  function setMode(mode, opts = {}) {
    const prev = S0.mode;
    S0.mode = mode;
    S0.index = mode === 'project' ? opts.index : -1;
    labelsEl.dataset.mode = mode;
    const view = viewFor(mode, opts.index);
    S0.focus = mode === 'project' ? planets[opts.index] : null;
    S0.timeTarget = mode === 'project' ? 0.06 : mode === 'about' ? 0.35 : 1;
    controls.minDistance = view.minD;
    controls.maxDistance = view.maxD;
    controls.enableZoom = mode !== 'skills';
    controls.enableRotate = mode !== 'skills';
    if (mode === 'skills') view.minD = 0.1;
    S0.fovTarget = mode === 'skills' ? (W < H ? 68 : 56) : 50;
    planets.forEach((pl) => { pl.lockT = pl.i === S0.index ? 1 : 0; });
    if (opts.instant) {
      const tgt = view.target();
      controls.target.copy(tgt);
      camera.position.copy(view.cam(tgt));
      controls.enabled = mode !== 'skills';
      return;
    }
    if (opts.warp) return startWarp(view);
    const far = prev === 'skills' || mode === 'skills';
    flyTo(view, { duration: far ? 2.0 : mode === 'project' ? 1.7 : 1.5, arc: mode === 'project' ? 5 : 3 });
  }

  function startWarp(view) {
    S0.warp = { t: 0, dur: S0.reduced ? 0.01 : 1.5 };
    hooks.onWarp?.();
    if (!S0.reduced) streaks.visible = true;
    flyTo(view, { duration: 1.5, arc: 8, easing: easeInOut });
  }

  /* ---------------- hover + picking ---------------- */
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let pointer = null, needsPick = false, down = null;

  function samePick(a, b) { return a && b && a.kind === b.kind && a.index === b.index && a.group === b.group; }
  function setHover(pick, src) {
    if (!pick && src && S0.hoverSrc && src !== S0.hoverSrc) return;
    if (samePick(pick, S0.hover)) { S0.hoverSrc = src; return; }
    S0.hover = pick;
    S0.hoverSrc = pick ? src : null;
    canvas.style.cursor = pick ? 'pointer' : '';
    if (pick?.kind === 'skill') highlightSkill(pick.group, pick.index, src !== 'label');
    else if (S0.hiSkill && src) highlightSkill(null);
    hooks.onHover?.(pick);
  }

  function pickAt(clientX, clientY) {
    if (S0.mode === 'skills') return null;
    const r = canvas.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(pickables, false);
    for (const h of hits) {
      const p = h.object.userData.pick;
      if (p) return p;
    }
    return null;
  }

  canvas.addEventListener('pointermove', (e) => {
    pointer = { x: e.clientX, y: e.clientY, type: e.pointerType };
    if (e.pointerType === 'mouse') needsPick = true;
  });
  canvas.addEventListener('pointerleave', () => { pointer = null; if (S0.hoverSrc === 'ray') setHover(null, 'ray'); });
  canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; S0.lastInteract = S0.realT; });
  canvas.addEventListener('pointerup', (e) => {
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    const quick = performance.now() - down.t < 650;
    down = null;
    if (moved > 8 || !quick) return;
    const hit = pickAt(e.clientX, e.clientY);
    if (hit) hooks.onPick?.(hit);
    else hooks.onEmptyClick?.();
  });

  /* ---------------- highlights ---------------- */
  function highlightArea(ai) { S0.hiArea = ai; }
  function highlightSkill(gi, k, turn = true) { S0.hiSkill = gi == null ? null : { gi, k, turn }; }
  function highlightBeacon(idx) { S0.hiBeacon = idx; }

  /* ---------------- resize ---------------- */
  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    renderer.setPixelRatio(pr);
    renderer.setSize(W, H, false);
    composer.setPixelRatio(pr);
    composer.setSize(W, H);
    uPR.value = pr;
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', () => {
    resize();
    if (!S0.tween && S0.mode === 'skills') setMode('skills', { instant: true });
  });

  /* ---------------- per-frame ---------------- */
  const clock = new THREE.Clock(false);
  const proj = new THREE.Vector3();
  const camDir = new THREE.Vector3();

  function screenOf(world, out) {
    proj.copy(world).project(camera);
    out.x = (proj.x * 0.5 + 0.5) * W;
    out.y = (-proj.y * 0.5 + 0.5) * H;
    out.behind = proj.z > 1 || proj.z < -1;
    return out;
  }
  function pxRadius(world, r) {
    const d = camera.position.distanceTo(world);
    return (r / Math.max(d, 0.001)) * (H / 2) / Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
  }
  function occludedByStar(world) {
    const c = camera.position;
    tmpV.copy(world).sub(c);
    const len2 = tmpV.lengthSq();
    const t = clamp(-c.dot(tmpV) / len2, 0, 1);
    if (t >= 0.999) return false;
    tmpV2.copy(c).addScaledVector(tmpV, t);
    return tmpV2.length() < STAR_R * 1.02;
  }
  const scr = { x: 0, y: 0, behind: false };
  // Labels are placed greedily by priority; one that would overlap an
  // already-placed label is hidden (unless hovered or focused).
  const placed = [];
  function placeLabel(el, world, offsetY, opacity = 1, extraHidden = false, declutter = false) {
    screenOf(world, scr);
    let off = extraHidden || scr.behind || scr.x < -80 || scr.x > W + 80 || scr.y < -40 || scr.y > H + 40;
    const y = scr.y + offsetY;
    if (!off && declutter) {
      if (!el._w || S0.frame % 40 === 0) { el._w = el.offsetWidth || 80; el._h = el.offsetHeight || 16; }
      const pinned = el === document.activeElement || el.matches(':hover');
      const r = { x0: scr.x - el._w / 2, x1: scr.x + el._w / 2, y0: y, y1: y + el._h };
      if (!pinned) {
        for (const q of placed) {
          if (r.x0 < q.x1 && r.x1 > q.x0 && r.y0 < q.y1 && r.y1 > q.y0) { off = true; break; }
        }
      }
      if (!off) placed.push(r);
    }
    if (off) { if (!el.dataset.off) el.dataset.off = '1'; return; }
    if (el.dataset.off) delete el.dataset.off;
    // keep the label of an on-screen object inside the viewport
    if (declutter && el._w && scr.x > 0 && scr.x < W) scr.x = clamp(scr.x, el._w / 2 + 6, W - el._w / 2 - 6);
    el.style.transform = `translate3d(${scr.x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translateX(-50%)`;
    el.style.setProperty('--o', opacity.toFixed(2));
  }

  const reticleName = reticleEl.querySelector('[data-r=name]');
  const reticleMeta = reticleEl.querySelector('[data-r=meta]');
  let reticleKey = '';
  function updateReticle() {
    const pick = S0.hover && S0.hover.kind !== 'skill' ? S0.hover : (S0.mode === 'project' ? { kind: 'planet', index: S0.index } : S0.mode === 'about' ? { kind: 'star' } : null);
    if (!pick) { reticleEl.classList.remove('on'); reticleKey = ''; return; }
    let world, r, name, meta, color;
    if (pick.kind === 'planet') { const pl = planets[pick.index]; world = pl.world; r = pl.radius * 1.15; name = pl.p.title; meta = `${pl.p.area} · ${pl.p.year}`; color = pl.area.color; }
    else if (pick.kind === 'star') { world = sun.position; r = STAR_R * 1.1; name = P.name; meta = P.title; color = '#ffb547'; }
    else if (pick.kind === 'beacon') { const b = beacons.find((x) => x.t.index === pick.index); world = b.pos; r = 1.4; name = `${b.t.year} · ${b.t.title}`; meta = b.t.org; color = KIND_COLORS[b.t.kind]; }
    else { reticleEl.classList.remove('on'); return; }
    screenOf(world, scr);
    if (scr.behind) { reticleEl.classList.remove('on'); return; }
    const key = pick.kind + pick.index;
    if (key !== reticleKey) {
      reticleKey = key;
      reticleName.textContent = name;
      reticleMeta.textContent = meta;
      reticleEl.style.setProperty('--c', color);
      reticleEl.classList.remove('on');
      void reticleEl.offsetWidth; // restart the lock-on animation
      reticleEl.classList.toggle('locked', S0.hover == null);
    }
    reticleEl.classList.add('on');
    const size = clamp(pxRadius(world, r) * 2 + 22, 38, Math.min(W, H) * 0.7);
    reticleEl.style.setProperty('--s', size.toFixed(0) + 'px');
    reticleEl.style.transform = `translate3d(${scr.x.toFixed(1)}px, ${scr.y.toFixed(1)}px, 0)`;
  }

  const order = [];
  function updateLabels() {
    const mode = S0.mode;
    placed.length = 0;
    if (mode !== 'skills') {
      placeLabel(starLabel, sun.position, pxRadius(sun.position, STAR_R) + 14, 1, false, true);
      order.length = 0;
      for (const pl of planets) {
        pl.rpx = pxRadius(pl.world, pl.radius);
        pl.prio = pl.rpx + (pl.i === S0.index ? 1e4 : 0) + (S0.hover?.kind === 'planet' && S0.hover.index === pl.i ? 2e4 : 0) + (S0.hiArea === pl.area.index ? 5e3 : 0);
        order.push(pl);
      }
      order.sort((a, b) => b.prio - a.prio);
      for (const pl of order) {
        const op = clamp(0.5 + pl.rpx / 14, 0.5, 1);
        placeLabel(pl.label, pl.world, pl.rpx + 8, op, occludedByStar(pl.world), true);
      }
      for (const b of beacons) placeLabel(b.label, b.pos, pxRadius(b.pos, 1.2) + 8, 1, occludedByStar(b.pos), true);
    } else {
      for (const c of constellations) {
        placeLabel(c.label, c.center, 0, 1);
        // push each name away from the constellation's centre so neighbours don't collide
        let cx = 0, cy = 0;
        for (const s of c.stars) { screenOf(s.pos, scr); s.sx = scr.x; s.sy = scr.y; s.sb = scr.behind; cx += scr.x; cy += scr.y; }
        cx /= c.stars.length; cy /= c.stars.length;
        for (const s of c.stars) {
          const el = s.label;
          if (s.sb || s.sx < -60 || s.sx > W + 60 || s.sy < -30 || s.sy > H + 30) { el.dataset.off = '1'; continue; }
          if (el.dataset.off) delete el.dataset.off;
          let dx = s.sx - cx, dy = s.sy - cy;
          const len = Math.hypot(dx, dy) || 1;
          dx /= len; dy /= len;
          const ax = dx > 0.35 ? 0 : dx < -0.35 ? -100 : -50;
          const ay = dy > 0.35 ? 0 : dy < -0.35 ? -100 : -50;
          el.style.transform = `translate3d(${(s.sx + dx * 9).toFixed(1)}px, ${(s.sy + dy * 9).toFixed(1)}px, 0) translate(${ax}%, ${ay}%)`;
        }
      }
    }
  }

  function updateWarp(dt) {
    const w = S0.warp;
    let env = 0;
    if (w) {
      w.t += dt / w.dur;
      env = Math.pow(Math.sin(Math.PI * clamp(w.t, 0, 1)), 0.7);
      if (w.t >= 1) { S0.warp = null; env = 0; streaks.visible = false; }
    }
    S0.warpEnv = env;
    if (streaks.visible) {
      const speed = 220;
      w && (w.off = (w.off || 0) + dt * speed * (0.3 + env));
      const off = w ? w.off : 0;
      for (let i = 0; i < STREAKS; i++) {
        const s = streakData[i];
        const z = -(((s.z - off) % 160) + 160) % 160 - 3;
        const l = s.len * (0.2 + env * 1.8);
        streakPos[i * 6] = s.x; streakPos[i * 6 + 1] = s.y; streakPos[i * 6 + 2] = z;
        streakPos[i * 6 + 3] = s.x; streakPos[i * 6 + 4] = s.y; streakPos[i * 6 + 5] = z - l;
      }
      streakGeo.attributes.position.needsUpdate = true;
      streakMat.opacity = env * 0.9;
    }
    return env;
  }

  function frame() {
    if (!S0.running) return;
    requestAnimationFrame(frame);
    const rawDt = clock.getDelta();
    const dt = Math.min(rawDt, 1 / 20);
    const dtR = Math.min(rawDt, 0.25); // wall-clock-ish step for camera moves, so slow GPUs don't drag them out
    S0.realT += dt;
    S0.frame++;
    if (rawDt > 0) S0.fps = damp(S0.fps, 1 / rawDt, 3, rawDt);
    adapt(rawDt);
    const motion = !S0.reduced;

    // time
    S0.timeScale = damp(S0.timeScale, motion ? S0.timeTarget * (S0.turbo ? 14 : 1) : 0, 2.2, dt);
    S0.simT += dt * S0.timeScale;
    if (motion) uTime.value += dt;

    // orbits
    for (const pl of planets) {
      const th = pl.theta0 + pl.orbit.omega * S0.simT;
      pl.holder.position.set(Math.cos(th) * pl.orbit.r, 0, Math.sin(th) * pl.orbit.r);
      pl.trail.rotation.y = -th;
      if (motion) pl.mesh.rotation.y += dt * pl.spin * (0.3 + S0.timeScale);
      for (const m of pl.moons) m.spin.rotation.y = m.phase + S0.simT * m.speed * 3;
      const hovered = (S0.hover?.kind === 'planet' && S0.hover.index === pl.i) || S0.index === pl.i;
      const areaHi = S0.hiArea === pl.area.index;
      pl.hover = damp(pl.hover, hovered ? 1 : areaHi ? 0.6 : 0, 8, dt);
      pl.u.uHover.value = pl.hover;
      pl.trailMat.uniforms.uOpacity.value = 0.4 + pl.hover * 0.6;
    }
    orbits.forEach((o, ai) => {
      const want = S0.hiArea === ai ? 0.7 : (S0.focus && S0.focus.area.index === ai) ? 0.4 : S0.hiArea >= 0 ? 0.06 : 0.16;
      o.lineMat.opacity = damp(o.lineMat.opacity, want, 6, dt);
    });
    belt.rotation.y = -S0.simT * 0.012;

    // beacons
    for (const b of beacons) {
      const want = S0.hiBeacon === b.t.index || (S0.hover?.kind === 'beacon' && S0.hover.index === b.t.index) ? 1 : 0;
      b.hi = damp(b.hi, want, 8, dt);
      if (motion) b.core.rotation.y += dt * (0.6 + b.hi * 2);
      b.core.scale.setScalar(1 + b.hi * 0.6);
      b.glow.scale.setScalar(3.4 + b.hi * 3 + (motion ? Math.sin(S0.realT * 2 + b.j) * 0.3 : 0));
    }
    // comet
    {
      const u = ((S0.realT * (motion ? 1 : 0)) / 48 + 0.15) % 1;
      cometCurve.getPointAt(u, comet.position);
      for (let i = 0; i < TAIL; i++) {
        cometCurve.getPointAt(((u - i * 0.0016) % 1 + 1) % 1, tmpV);
        tailPos[i * 3] = tmpV.x; tailPos[i * 3 + 1] = tmpV.y; tailPos[i * 3 + 2] = tmpV.z;
      }
      tailGeo.attributes.position.needsUpdate = true;
    }

    // skills
    const skillsOn = S0.mode === 'skills' ? 1 : 0;
    S0.skillsActive = damp(S0.skillsActive, skillsOn, 3, dt);
    for (const c of constellations) {
      const gHi = S0.hiSkill && S0.hiSkill.gi === constellations.indexOf(c) ? 1 : 0;
      c.lineMat.opacity = 0.035 + S0.skillsActive * (0.33 + gHi * 0.4);
      for (const s of c.stars) {
        const hi = S0.hiSkill && S0.hiSkill.gi === s.gi && S0.hiSkill.k === s.k ? 1 : 0;
        s.hi = damp(s.hi, hi, 10, dt);
        s.sp.material.opacity = 0.22 + S0.skillsActive * 0.73;
        s.sp.scale.setScalar(s.base * (1 + s.hi * 1.3 + gHi * 0.15) * (motion ? 1 + Math.sin(S0.realT * 1.7 + s.k * 2.1 + s.gi) * 0.08 : 1));
      }
    }

    // supernova
    let novaEnv = 0;
    if (S0.nova) {
      S0.nova.t += dtR / 3.6;
      const t = S0.nova.t;
      novaEnv = t < 0.12 ? t / 0.12 : Math.exp(-(t - 0.12) * 3.2);
      if (t >= 1) S0.nova = null;
    }
    const sunHover = S0.hover?.kind === 'star' ? 1 : 0;
    sunU.uHover.value = damp(sunU.uHover.value, sunHover, 6, dt);
    sunU.uIntensity.value = 1 + novaEnv * 1.7;
    // the corona fills the view up close, so it fades as the camera approaches
    const near = clamp(camera.position.length() / 50, 0.3, 1);
    coronaU.uIntensity.value = (1 + novaEnv * 3 + sunU.uHover.value * 0.25) * near;
    corona.scale.setScalar(CORONA_SCALE * (1 + novaEnv * 1.6));

    // pulses
    if (S0.mode === 'contact' && motion) {
      S0.pulseTimer -= dt;
      if (S0.pulseTimer <= 0) { pulse('#ffb547', BELT_R + 18, 4); S0.pulseTimer = 1.5; }
    }
    for (let i = pulses.length - 1; i >= 0; i--) {
      const p = pulses[i];
      p.t += dtR / p.dur;
      const k = easeOut(Math.min(p.t, 1));
      p.m.scale.setScalar(STAR_R + (p.maxR - STAR_R) * k);
      p.m.material.opacity = (1 - Math.min(p.t, 1)) * 0.85;
      if (p.t >= 1) { scene.remove(p.m); p.m.material.dispose(); pulses.splice(i, 1); }
    }

    // shooting stars
    if (motion) {
      nextShoot -= dt;
      if (nextShoot <= 0) { spawnShootingStar(); nextShoot = 5 + Math.random() * 9; }
    }
    for (let i = shooting.length - 1; i >= 0; i--) {
      const s = shooting[i];
      s.t += dt / s.dur;
      const head = s.start.clone().addScaledVector(s.vel, s.t);
      const tailP = s.start.clone().addScaledVector(s.vel, Math.max(0, s.t - 0.25));
      const pa = s.line.geometry.attributes.position;
      pa.setXYZ(0, head.x, head.y, head.z); pa.setXYZ(1, tailP.x, tailP.y, tailP.z);
      pa.needsUpdate = true;
      s.line.material.opacity = Math.sin(Math.PI * Math.min(s.t, 1));
      if (s.t >= 1) { scene.remove(s.line); s.line.geometry.dispose(); s.line.material.dispose(); shooting.splice(i, 1); }
    }

    scene.updateMatrixWorld();
    for (const pl of planets) pl.mesh.getWorldPosition(pl.world);

    // camera
    const prevFocus = S0.focusPrev;
    if (S0.tween) stepTween(dtR);
    else if (S0.focus) {
      // ride along with the planet
      if (prevFocus) {
        tmpV.copy(S0.focus.world).sub(prevFocus);
        camera.position.add(tmpV);
        controls.target.copy(S0.focus.world);
      }
    }
    S0.focusPrev = S0.focus ? (S0.focusPrevV || (S0.focusPrevV = new THREE.Vector3())).copy(S0.focus.world) : null;
    controls.autoRotate = motion && S0.mode === 'overview' && !S0.tween && S0.realT - S0.lastInteract > 7;
    controls.update();
    if (S0.mode === 'skills' && !S0.tween) {
      // Look around the sky instead of orbiting: turn toward a highlighted
      // skill, otherwise rest on the chart (and slowly pan it on narrow screens).
      const v = viewFor('skills');
      const base = v.cam();
      if (pointer && motion && pointer.type === 'mouse') {
        const px = pointer.x / W - 0.5, py = pointer.y / H - 0.5;
        camera.position.x = damp(camera.position.x, base.x - px * 6, 3, dt);
        camera.position.y = damp(camera.position.y, base.y + py * 4, 3, dt);
      }
      const want = tmpV2;
      if (S0.hiSkill && S0.hiSkill.turn) {
        want.copy(constellations[S0.hiSkill.gi].stars[S0.hiSkill.k].pos).sub(camera.position).normalize();
      } else {
        const sweep = W < H && motion ? Math.sin(S0.realT * 0.18) * 0.42 : 0;
        want.copy(skyDir(sweep, 0.5));
      }
      if (!S0.skillLook) S0.skillLook = skyDir(0, 0.5);
      if (S0.reduced) S0.skillLook.copy(want);
      else S0.skillLook.lerp(want, 1 - Math.exp(-2.2 * dt)).normalize();
      controls.target.copy(camera.position).addScaledVector(S0.skillLook, 20);
      camera.lookAt(controls.target);
    } else if (S0.mode !== 'skills') S0.skillLook = null;

    const env = updateWarp(dtR);
    bloom.strength = BLOOM_BASE + env * 0.9 + novaEnv * 0.75;
    S0.baseFov = damp(S0.baseFov, S0.fovTarget, 3, dt);
    camera.fov = S0.baseFov + env * 40;
    S0.inset.x = damp(S0.inset.x, S0.insetTarget.x, 5, dt);
    S0.inset.y = damp(S0.inset.y, S0.insetTarget.y, 5, dt);
    if (Math.abs(S0.inset.x) > 0.5 || Math.abs(S0.inset.y) > 0.5) camera.setViewOffset(W, H, S0.inset.x, S0.inset.y, W, H);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
    if (novaEnv > 0.02 && motion) {
      camera.position.x += (Math.random() - 0.5) * novaEnv * 0.5;
      camera.position.y += (Math.random() - 0.5) * novaEnv * 0.5;
    }
    camera.updateMatrixWorld();
    corona.quaternion.copy(camera.quaternion);

    if (needsPick && pointer && S0.frame % 2 === 0 && !S0.tween) {
      needsPick = false;
      const hit = pickAt(pointer.x, pointer.y);
      if (hit || S0.hoverSrc === 'ray') setHover(hit, 'ray');
    }

    updateLabels();
    updateReticle();
    composer.render();
    hooks.onFrame?.(api);
  }

  function adapt(rawDt) {
    if (S0.adapted || S0.realT < 2.5) return;
    S0.frameTimes.push(rawDt);
    if (S0.frameTimes.length < 60) return;
    const avg = S0.frameTimes.reduce((a, b) => a + b, 0) / S0.frameTimes.length;
    S0.frameTimes.length = 0;
    if (avg > 1 / 38 && pr > 1) { pr = 1; resize(); }
    else if (avg > 1 / 18) { bloom.enabled = false; S0.adapted = true; }
    else S0.adapted = true;
  }

  function start() {
    if (S0.running || S0.paused || document.hidden) return;
    S0.running = true;
    clock.start();
    clock.getDelta();
    requestAnimationFrame(frame);
  }
  function stop() { S0.running = false; clock.stop(); }
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

  /* ---------------- api ---------------- */
  const api = {
    setMode,
    warp(index) { setMode('project', { index, warp: true }); },
    highlightArea, highlightSkill, highlightBeacon,
    setInset({ right = 0, bottom = 0 }) { S0.insetTarget.x = right / 2; S0.insetTarget.y = bottom / 2; },
    setReduced(r) { S0.reduced = r; },
    setPaused(p) { S0.paused = p; p ? stop() : start(); },
    setTurbo(on) { S0.turbo = on; },
    get turbo() { return !!S0.turbo; },
    supernova() { S0.nova = { t: 0 }; pulse('#ffd28a', 90, 3.4); pulse('#ff7a45', 70, 2.6); },
    pulse(color) { pulse(color || '#ffb547', BELT_R + 16, 3.6); },
    intro(duration = 4.2) {
      const v = viewFor('overview');
      camera.position.set(-120, 210, 460);
      controls.target.set(0, 0, 0);
      S0.tween = null;
      flyTo(v, { duration, arc: 0, easing: easeOut });
    },
    stats() { return { fps: S0.fps, calls: renderer.info.render.calls, tris: renderer.info.render.triangles, pr }; },
    snapshot() {
      return {
        planets: planets.map((pl) => ({ x: pl.world.x, z: pl.world.z, color: pl.area.color, i: pl.i })),
        orbits: orbits.map((o, ai) => ({ r: o.r, color: model.areas[ai].color })),
        cam: camera.position, target: controls.target, beltR: BELT_R, mode: S0.mode, index: S0.index,
        beacons: beacons.map((b) => ({ x: b.pos.x, z: b.pos.z, color: KIND_COLORS[b.t.kind] })),
        comet: comet.position, t: S0.realT,
      };
    },
    get mode() { return S0.mode; },
  };
  S0.reduced = reduced;

  // seed planet positions so a deep link can frame its planet before the first frame
  for (const pl of planets) pl.holder.position.set(Math.cos(pl.theta0) * pl.orbit.r, 0, Math.sin(pl.theta0) * pl.orbit.r);
  scene.updateMatrixWorld();
  for (const pl of planets) pl.mesh.getWorldPosition(pl.world);

  resize();
  labelsEl.dataset.mode = 'overview';
  setMode('overview', { instant: true });
  composer.render();
  start();
  return api;
}
