/*
 * Shapes window.PORTFOLIO into what the Galaxy needs: areas (one orbit each),
 * projects with their orbit + colour, the timeline in flight order, and a
 * deterministic constellation layout for each skill group.
 * Nothing here adds content; it only arranges what is in shared/data.js.
 */

export const AREA_COLORS = ['#5fd4ff', '#ff7a45', '#a8f26a', '#c393ff', '#ff5f97', '#ffd166', '#47e3c4', '#8c9cff'];
export const KIND_COLORS = { work: '#ffb547', edu: '#6fd0ff', origin: '#ff6fd8' };
export const KIND_LABELS = { work: 'Work', edu: 'Education', origin: 'Origin' };

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export const slug = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function buildModel(P) {
  const areaNames = [...new Set(P.projects.map((p) => p.area))];
  const areas = areaNames.map((name, i) => ({ name, index: i, color: AREA_COLORS[i % AREA_COLORS.length], projects: [] }));

  const projects = P.projects.map((p, i) => {
    const areaIndex = areaNames.indexOf(p.area);
    areas[areaIndex].projects.push(i);
    return { ...p, index: i, areaIndex, color: areas[areaIndex].color, slug: slug(p.title) };
  });

  // Oldest first: the order the comet flies through them.
  const chrono = P.timeline
    .map((t, i) => ({ ...t, index: i }))
    .sort((a, b) => (parseInt(a.year, 10) || 0) - (parseInt(b.year, 10) || 0));

  // Skill constellations: rows of up to two, each a seeded random walk
  // squeezed into a box so neighbours never overlap.
  const G = P.stack.length;
  const perRow = 2;
  const rows = Math.ceil(G / perRow);
  const constellations = P.stack.map((g, gi) => {
    const rng = mulberry32(hashStr(g.group));
    const row = Math.floor(gi / perRow);
    const inRow = Math.min(perRow, G - row * perRow);
    const col = gi - row * perRow;
    const caz = (col - (inRow - 1) / 2) * 0.5;
    const cel = 0.5 + ((rows - 1) / 2 - row) * 0.25 + (rng() - 0.5) * 0.02;
    let az = 0, el = 0, dir = rng() * Math.PI * 2;
    const pts = g.items.map((name, k) => {
      if (k > 0) {
        dir += (rng() - 0.5) * 2.2;
        const step = 0.8 + rng() * 0.5;
        az += Math.cos(dir) * step;
        el += Math.sin(dir) * step;
      }
      return { name, az, el, bright: P.skills.some((s) => s.toLowerCase() === name.toLowerCase()) };
    });
    // normalise into a 0.25 x 0.14 rad box centred on (caz, cel)
    const xs = pts.map((p) => p.az), ys = pts.map((p) => p.el);
    const minx = Math.min(...xs), maxx = Math.max(...xs), miny = Math.min(...ys), maxy = Math.max(...ys);
    const sx = 0.25 / Math.max(maxx - minx, 1e-3), sy = 0.14 / Math.max(maxy - miny, 1e-3);
    const s = Math.min(sx, sy);
    const cx = (minx + maxx) / 2, cy = (miny + maxy) / 2;
    pts.forEach((p) => {
      p.u = (p.az - cx) * s; // local, for the 2D chart
      p.v = (p.el - cy) * s;
      p.az = caz + p.u;
      p.el = cel + p.v;
    });
    const edges = pts.slice(1).map((_, k) => [k, k + 1]);
    return { group: g.group, items: pts, edges, center: { az: caz, el: cel } };
  });

  return { P, areas, projects, chrono, constellations };
}

/** Fuzzy project finder for the comms console. */
export function findProject(model, query) {
  const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const q = norm(query);
  if (!q) return -1;
  const fields = ['title', 'tag', 'area', 'blurb'];
  for (const f of fields) {
    const hit = model.projects.find((p) => norm(p[f]).includes(q));
    if (hit) return hit.index;
  }
  if (/^\d+$/.test(q)) {
    const n = parseInt(q, 10) - 1;
    if (n >= 0 && n < model.projects.length) return n;
  }
  return -1;
}
