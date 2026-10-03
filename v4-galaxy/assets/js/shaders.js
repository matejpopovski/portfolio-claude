/*
 * GLSL for the Galaxy scene. Everything is procedural: no textures are loaded,
 * so the planets, the star and the sky all come from noise.
 */

// 3D simplex noise (Ashima Arts / Stefan Gustavson, MIT) + fbm helpers.
export const NOISE = /* glsl */ `
vec3 mod289(vec3 x){ return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x){ return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x){ return mod289(((x * 34.0) + 10.0) * x); }
vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.5 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 105.0 * dot(m * m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
float fbm(vec3 p){
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 5; i++) { s += a * snoise(p); p = p * 2.03 + vec3(1.7, 9.2, 3.1); a *= 0.5; }
  return s;
}
float fbm3(vec3 p){
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 3; i++) { s += a * snoise(p); p = p * 2.07 + vec3(4.1, 1.3, 7.7); a *= 0.5; }
  return s;
}
`;

/* ---------- Sky: a faint nebula and a galactic band ---------- */
export const skyVert = /* glsl */ `
varying vec3 vDir;
void main(){
  vDir = position;
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;
}`;
export const skyFrag = /* glsl */ `
${NOISE}
varying vec3 vDir;
uniform float uBoost;
void main(){
  vec3 d = normalize(vDir);
  vec3 bandN = normalize(vec3(0.35, 1.0, 0.2));
  float band = exp(-pow(dot(d, bandN) * 2.6, 2.0));
  float n  = fbm3(d * 2.1);
  float n2 = fbm3(d * 4.6 + 3.0);
  vec3 col = vec3(0.006, 0.008, 0.02);
  col += vec3(0.10, 0.03, 0.16) * smoothstep(-0.15, 0.75, n) * (0.25 + band * 0.9);
  col += vec3(0.00, 0.10, 0.14) * smoothstep(0.0, 0.8, n2) * band * 0.9;
  col += vec3(0.14, 0.08, 0.05) * band * smoothstep(0.25, 0.95, n * 0.5 + n2 * 0.5 + 0.35) * 0.6;
  // dark dust lane through the band
  col *= 1.0 - 0.55 * band * smoothstep(0.15, 0.5, fbm3(d * 7.0 + 11.0));
  gl_FragColor = vec4(col * uBoost * 0.78, 1.0);
}`;

/* ---------- Background stars ---------- */
export const starsVert = /* glsl */ `
attribute float aSize;
attribute float aPhase;
attribute vec3 color;
uniform float uTime;
uniform float uPR;
varying vec3 vColor;
varying float vTw;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float tw = 0.72 + 0.28 * sin(uTime * (0.6 + aPhase * 1.7) + aPhase * 40.0);
  vTw = tw;
  vColor = color;
  gl_PointSize = clamp(aSize * uPR * (620.0 / -mv.z), 0.0, 9.0 * uPR);
  gl_Position = projectionMatrix * mv;
}`;
export const starsFrag = /* glsl */ `
varying vec3 vColor;
varying float vTw;
void main(){
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  float a = smoothstep(0.5, 0.0, d);
  a = a * a;
  gl_FragColor = vec4(vColor * vTw * 1.4, a);
}`;

/* ---------- The star (Matej) ---------- */
export const sunVert = /* glsl */ `
varying vec3 vObj;
varying vec3 vN;
varying vec3 vWP;
void main(){
  vObj = position;
  vN = normalize(mat3(modelMatrix) * normal);
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWP = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
export const sunFrag = /* glsl */ `
${NOISE}
uniform float uTime;
uniform float uIntensity;
uniform float uHover;
varying vec3 vObj;
varying vec3 vN;
varying vec3 vWP;
void main(){
  vec3 p = normalize(vObj);
  float n1 = fbm(p * 2.6 + vec3(0.0, uTime * 0.04, uTime * 0.02));
  float n2 = fbm(p * 7.5 - vec3(uTime * 0.07, 0.0, uTime * 0.05));
  float cells = 1.0 - abs(snoise(p * 14.0 + uTime * 0.1));
  float t = n1 * 0.62 + n2 * 0.38 + cells * 0.12;
  vec3 deep = vec3(0.75, 0.16, 0.02);
  vec3 mid  = vec3(1.0, 0.5, 0.12);
  vec3 hot  = vec3(1.0, 0.9, 0.66);
  vec3 col = mix(deep, mid, smoothstep(-0.4, 0.3, t));
  col = mix(col, hot, smoothstep(0.3, 0.8, t));
  col *= 0.8 + 0.35 * cells; // granulation
  vec3 V = normalize(cameraPosition - vWP);
  float mu = max(dot(normalize(vN), V), 0.0);
  // limb darkening, then a hot rim
  col *= 0.55 + 0.45 * pow(mu, 0.45);
  col += vec3(1.0, 0.45, 0.12) * pow(1.0 - mu, 2.5) * 0.9;
  gl_FragColor = vec4(col * (0.92 + 0.3 * uHover) * uIntensity, 1.0);
}`;

export const coronaVert = /* glsl */ `
varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
export const coronaFrag = /* glsl */ `
${NOISE}
uniform float uTime;
uniform float uIntensity;
uniform float uEdge;
varying vec2 vUv;
void main(){
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  float a = atan(p.y, p.x);
  float rays = snoise(vec3(cos(a) * 2.4, sin(a) * 2.4, uTime * 0.12)) * 0.5 + 0.5;
  rays = mix(rays, snoise(vec3(cos(a) * 7.0, sin(a) * 7.0, uTime * 0.2)) * 0.5 + 0.5, 0.35);
  float e = max(r - uEdge, 0.0);
  float halo = exp(-e * 5.0) * (0.45 + 0.9 * pow(rays, 2.2));
  float rim  = exp(-e * 22.0);
  vec3 col = vec3(1.0, 0.48, 0.14) * halo * 0.9 + vec3(1.0, 0.82, 0.55) * rim * 0.9;
  col *= smoothstep(1.0, 0.55, r) * uIntensity;
  gl_FragColor = vec4(col, 1.0);
}`;

/* ---------- Planets ---------- */
export const planetVert = /* glsl */ `
varying vec3 vObj;
varying vec3 vN;
varying vec3 vWP;
void main(){
  vObj = position;
  vN = normalize(mat3(modelMatrix) * normal);
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWP = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
export const planetFrag = /* glsl */ `
${NOISE}
uniform vec3 uA;
uniform vec3 uB;
uniform vec3 uC;
uniform vec3 uAtmo;
uniform float uType;
uniform float uSeed;
uniform float uTime;
uniform float uHover;
uniform float uSun;
varying vec3 vObj;
varying vec3 vN;
varying vec3 vWP;
void main(){
  vec3 p = normalize(vObj);
  vec3 q = p * 1.8 + vec3(uSeed * 3.1, uSeed * 1.7, uSeed * 2.3);
  vec3 col;
  vec3 glow = vec3(0.0);
  float spec = 0.0;
  if (uType < 0.5) {
    // gas giant: warped latitude bands and a storm
    float w = fbm(q * 1.4 + vec3(0.0, 0.0, uTime * 0.015));
    float lat = p.y * 5.5 + w * 1.6;
    float bands = sin(lat * 3.14159) * 0.5 + 0.5;
    float fine = sin(lat * 11.0 + w * 3.0) * 0.5 + 0.5;
    col = mix(uA, uB, smoothstep(0.15, 0.85, bands));
    col = mix(col, uC, fine * 0.35);
    vec3 sc = normalize(vec3(0.7, -0.35, 0.6));
    float storm = smoothstep(0.32, 0.0, length(p - sc) + w * 0.08);
    col = mix(col, uC * 1.25, storm * 0.8);
  } else if (uType < 1.5) {
    // ocean world with continents, ice caps and clouds
    float h = fbm(q * 1.5);
    float land = smoothstep(0.02, 0.07, h);
    vec3 ocean = mix(uA * 0.5, uA, smoothstep(-0.5, 0.02, h));
    col = mix(ocean, uB, land);
    col = mix(col, uC, smoothstep(0.22, 0.5, h) * land);
    spec = (1.0 - land) * 0.6;
    float cap = smoothstep(0.74, 0.86, abs(p.y) + h * 0.12);
    col = mix(col, vec3(0.92, 0.95, 1.0), cap);
    float cl = smoothstep(0.08, 0.55, fbm(q * 2.4 + vec3(uTime * 0.02, 0.0, 0.0)));
    col = mix(col, vec3(1.0), cl * 0.55);
  } else if (uType < 2.5) {
    // ice / cratered moonlike world
    float h = fbm(q * 2.6);
    col = mix(uA, uC, smoothstep(-0.5, 0.6, h));
    float cr = snoise(q * 5.0);
    float ring = smoothstep(0.55, 0.62, cr) - smoothstep(0.62, 0.75, cr);
    col *= 1.0 - smoothstep(0.62, 0.85, cr) * 0.25;
    col += ring * 0.12;
    float streak = smoothstep(0.6, 1.0, sin((p.x + p.z + h * 0.6) * 9.0));
    col = mix(col, uB, streak * 0.35);
    spec = 0.25;
  } else {
    // molten world: dark crust with glowing fissures
    float h = fbm3(q * 1.3 + vec3(0.0, uTime * 0.01, 0.0));
    float cracks = 1.0 - smoothstep(0.0, 0.045, abs(h));
    float cracks2 = 1.0 - smoothstep(0.0, 0.03, abs(fbm3(q * 2.6 + 5.0)));
    float crust = fbm(q * 3.0) * 0.5 + 0.5;
    col = mix(uA * 0.22, uA * 0.6, crust);
    float pulse = 0.75 + 0.25 * sin(uTime * 1.1 + h * 14.0);
    glow = uB * (cracks * 1.3 + cracks2 * 0.45) * pulse;
    glow += uB * 0.08 * smoothstep(0.2, 0.6, crust);
  }
  vec3 N = normalize(vN);
  vec3 L = normalize(-vWP);
  vec3 V = normalize(cameraPosition - vWP);
  float ndl = dot(N, L);
  float lit = smoothstep(-0.18, 0.75, ndl) * uSun;
  vec3 outc = col * (0.04 + 1.0 * lit);
  vec3 H = normalize(L + V);
  outc += vec3(1.0, 0.9, 0.75) * pow(max(dot(N, H), 0.0), 40.0) * spec * lit;
  outc += glow;
  float fres = pow(1.0 - max(dot(N, V), 0.0), 2.6);
  outc += uAtmo * fres * (0.14 + 0.8 * smoothstep(-0.3, 0.6, ndl)) * (1.0 + uHover * 0.55);
  gl_FragColor = vec4(outc, 1.0);
}`;

/* Atmosphere halo: a back-faced shell around each planet */
export const atmoVert = /* glsl */ `
varying vec3 vNV;
varying vec3 vNW;
varying vec3 vWP;
void main(){
  vNV = normalize(normalMatrix * normal);
  vNW = normalize(mat3(modelMatrix) * normal);
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWP = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
export const atmoFrag = /* glsl */ `
uniform vec3 uAtmo;
uniform float uHover;
varying vec3 vNV;
varying vec3 vNW;
varying vec3 vWP;
void main(){
  float i = pow(clamp(0.62 + dot(vNV, vec3(0.0, 0.0, 1.0)), 0.0, 1.0), 3.2);
  float lit = smoothstep(-0.45, 0.5, dot(vNW, normalize(-vWP)));
  gl_FragColor = vec4(uAtmo * i * (0.2 + 0.8 * lit) * (1.0 + uHover * 0.5), 1.0);
}`;

/* Planetary rings */
export const ringVert = /* glsl */ `
varying vec3 vPos;
void main(){
  vPos = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
export const ringFrag = /* glsl */ `
${NOISE}
uniform vec3 uCol;
uniform float uSeed;
uniform float uIn;
uniform float uOut;
varying vec3 vPos;
void main(){
  float r = length(vPos.xy);
  float t = (r - uIn) / (uOut - uIn);
  float b = 0.5 + 0.25 * sin(t * 57.0 + uSeed * 9.0) + 0.25 * sin(t * 13.0 + uSeed * 4.0);
  float n = snoise(vec3(t * 26.0, uSeed * 10.0, 0.0)) * 0.5 + 0.5;
  float a = smoothstep(0.0, 0.06, t) * smoothstep(1.0, 0.82, t) * (0.2 + 0.55 * b + 0.25 * n);
  a *= 1.0 - (smoothstep(0.52, 0.55, t) - smoothstep(0.58, 0.61, t)) * 0.9;
  gl_FragColor = vec4(uCol * (0.55 + 0.7 * b), a * 0.8);
}`;

/* Fading arc that trails each planet along its orbit */
export const trailVert = /* glsl */ `
attribute float aT;
varying float vT;
void main(){
  vT = aT;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
export const trailFrag = /* glsl */ `
uniform vec3 uCol;
uniform float uOpacity;
uniform float uCut;
varying float vT;
void main(){
  // stop at the planet's limb so the trail never crosses its face
  float cut = 1.0 - smoothstep(uCut - 0.025, uCut, vT);
  gl_FragColor = vec4(uCol, pow(vT, 2.4) * uOpacity * cut);
}`;

/* Comet tail particles */
export const tailVert = /* glsl */ `
attribute float aT;
uniform float uPR;
varying float vT;
void main(){
  vT = aT;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = (1.0 - aT) * 34.0 * uPR / -mv.z * 6.0;
  gl_Position = projectionMatrix * mv;
}`;
export const tailFrag = /* glsl */ `
uniform vec3 uCol;
varying float vT;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d) * pow(1.0 - vT, 1.6);
  gl_FragColor = vec4(uCol * 1.5, a * 0.9);
}`;
