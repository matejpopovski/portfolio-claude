/* MatejOS icon set: hand-drawn SVG "stickers" with a hard ink shadow. */
(() => {
  'use strict';
  const INK = '#1c1b19';
  const C = {
    tomato: '#ff5b37', cobalt: '#3557ff', mint: '#2fc58a', sun: '#ffc531', lilac: '#a98bff',
    paper: '#fffcf5', cream: '#efe7d8', sky: '#7cc8ff', pink: '#ff8fc7', orange: '#ff9a3c',
  };
  const svg = (inner, label) => `<svg viewBox="0 0 64 64" ${label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"'} focusable="false">${inner}</svg>`;
  const tile = (fill, glyph) =>
    `<rect x="7" y="8" width="53" height="53" rx="15" fill="${INK}"/>` +
    `<rect x="3" y="4" width="53" height="53" rx="15" fill="${fill}" stroke="${INK}" stroke-width="3"/>` + glyph;

  const paper = (band) => {
    const shape = (dx, dy, fill) => `<path transform="translate(${dx} ${dy})" d="M12 5h27l13 13v37a3 3 0 0 1-3 3H15a3 3 0 0 1-3-3Z" fill="${fill}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`;
    return shape(4, 4, INK) + shape(0, 0, C.paper) +
      `<path d="M39 5v13h13" fill="${C.cream}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>` +
      (band
        ? `<rect x="18" y="24" width="28" height="12" rx="3" fill="${band}" stroke="${INK}" stroke-width="2.5"/><path d="M19 43h26M19 49h17" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`
        : `<path d="M19 26h15" stroke="${C.tomato}" stroke-width="3.4" stroke-linecap="round"/><path d="M19 33h26M19 39h26M19 45h26M19 51h16" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`);
  };

  const glyphs = {
    logo: () => tile(C.tomato, `<path d="M17 43V19l12.5 12.5L42 19v24" fill="none" stroke="${C.paper}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>`),
    doc: () => paper(),
    file: (band) => paper(band || C.cobalt),
    folder: () =>
      `<path transform="translate(4 4)" d="M5 17a4 4 0 0 1 4-4h14l5 5h27a4 4 0 0 1 4 4v31a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4Z" fill="${INK}"/>` +
      `<path d="M5 17a4 4 0 0 1 4-4h14l5 5h27a4 4 0 0 1 4 4v31a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4Z" fill="#2440d0" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>` +
      `<path d="M5 26h54v27a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4Z" fill="${C.cobalt}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>` +
      `<path d="M12 33h11" stroke="${C.paper}" stroke-opacity=".75" stroke-width="3" stroke-linecap="round"/>`,
    monitor: () => tile('#24221f',
      `<path d="M10 22h39M10 31h39M10 40h39" stroke="#3a3833" stroke-width="1.5"/>` +
      `<path d="M9 36h8l4-10 6 17 6-23 5 16h11" fill="none" stroke="${C.mint}" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<circle cx="49" cy="36" r="2.6" fill="${C.sun}"/>`),
    package: () => tile(C.sun,
      `<path d="M29.5 13 45 20.5 29.5 28 14 20.5Z" fill="#fff1bf" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>` +
      `<path d="M14 20.5 29.5 28v19L14 39.5Z" fill="#ffd96a" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>` +
      `<path d="M45 20.5 29.5 28v19L45 39.5Z" fill="#e6a50d" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>` +
      `<path d="m21.5 16.8 15.5 7.5v6" fill="none" stroke="${C.tomato}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`),
    mail: () => tile(C.tomato,
      `<rect x="13" y="19" width="33" height="24" rx="3.5" fill="${C.paper}" stroke="${INK}" stroke-width="2.6"/>` +
      `<path d="m14.5 21.5 15 11.5 15-11.5" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`),
    terminal: () => tile('#24221f',
      `<path d="m15 21 8 7.5-8 7.5" fill="none" stroke="${C.mint}" stroke-width="3.8" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<path d="M27 38h14" stroke="${C.paper}" stroke-width="3.8" stroke-linecap="round"/>`),
    snake: () => tile(C.mint,
      [[12, 38], [18, 38], [24, 38], [24, 32], [24, 26], [30, 26], [36, 26]].map(([x, y]) => `<rect x="${x}" y="${y}" width="6.4" height="6.4" rx="1.6" fill="${INK}"/>`).join('') +
      `<rect x="36" y="26" width="7" height="7" rx="2" fill="${INK}"/><circle cx="40.6" cy="28.4" r="1.3" fill="${C.paper}"/>` +
      `<rect x="40" y="38" width="7" height="7" rx="2" fill="${C.tomato}" stroke="${INK}" stroke-width="1.8"/><path d="M43.5 38v-3" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>`),
    settings: () => tile(C.lilac,
      `<circle cx="29.5" cy="30.5" r="13" fill="none" stroke="${INK}" stroke-width="7" stroke-dasharray="4.6 5.6"/>` +
      `<circle cx="29.5" cy="30.5" r="10.5" fill="${C.paper}" stroke="${INK}" stroke-width="2.6"/>` +
      `<circle cx="29.5" cy="30.5" r="4" fill="${C.lilac}" stroke="${INK}" stroke-width="2.6"/>`),
    trash: (full) =>
      `<path transform="translate(4 3)" d="M16 21h32l-3 35a3 3 0 0 1-3 3H22a3 3 0 0 1-3-3Z" fill="${INK}"/>` +
      `<path d="M16 21h32l-3 35a3 3 0 0 1-3 3H22a3 3 0 0 1-3-3Z" fill="#e8e1d2" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>` +
      `<path d="M26 28v24M32 28v24M38 28v24" stroke="${INK}" stroke-width="2.4" stroke-linecap="round" opacity=".55"/>` +
      (full ? `<path d="M22 17c2-5 8-7 12-4 3-4 10-2 10 3" fill="${C.paper}" stroke="${INK}" stroke-width="2.4"/>` : '') +
      `<rect x="12" y="14" width="40" height="7" rx="2.5" fill="${C.paper}" stroke="${INK}" stroke-width="3"/>` +
      `<path d="M26 14v-3.5h12V14" fill="none" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`,
    github: () => tile(C.paper,
      `<g transform="translate(15.5 16.5) scale(1.17)"><path fill="${INK}" d="M12 .5C5.65.5.5 5.65.5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.56-.29-5.25-1.28-5.25-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.38-5.26 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z"/></g>`),
    linkedin: () => tile('#2a66c9',
      `<rect x="15" y="26" width="6.5" height="18" rx="1.5" fill="${C.paper}"/><circle cx="18.25" cy="19.5" r="3.7" fill="${C.paper}"/>` +
      `<path d="M26 44V26h6v3c1.6-2.6 4-3.6 6.6-3.6 4.4 0 6.4 2.8 6.4 7.6V44h-6.5V34c0-2.4-.9-3.7-2.9-3.7-2.2 0-3.6 1.5-3.6 4.2V44Z" fill="${C.paper}"/>`),
    chip: () => tile(C.sky,
      `<rect x="18" y="19" width="23" height="23" rx="3" fill="${INK}"/><rect x="23" y="24" width="13" height="13" rx="1.5" fill="${C.sun}"/>` +
      `<path d="M23 15v4M29.5 15v4M36 15v4M23 42v4M29.5 42v4M36 42v4M14 24h4M14 30.5h4M14 37h4M41 24h4M41 30.5h4M41 37h4" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`),
  };

  const MOS = window.MOS;
  MOS.icon = (name, arg) => svg((glyphs[name] || glyphs.doc)(arg));
  MOS.iconColors = C;

  /* Small monochrome UI glyphs (currentColor). */
  const ui = {
    m: '<path d="M5 18V6.5l7 7 7-7V18" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>',
    search: '<circle cx="10.5" cy="10.5" r="6" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="m15 15 5 5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
    moon: '<path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10Z" fill="currentColor"/>',
    sun: '<circle cx="12" cy="12" r="4.2" fill="currentColor"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    signal: '<rect x="3" y="14" width="3.4" height="6" rx="1" fill="currentColor"/><rect x="8.2" y="11" width="3.4" height="9" rx="1" fill="currentColor"/><rect x="13.4" y="7.5" width="3.4" height="12.5" rx="1" fill="currentColor"/><rect x="18.6" y="4" width="3.4" height="16" rx="1" fill="currentColor" opacity=".35"/>',
    battery: '<rect x="2" y="7" width="18" height="10" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="4.2" y="9.2" width="11" height="5.6" rx="1.4" fill="currentColor"/><path d="M22 10.5v3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    back: '<path d="m15 5-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>',
    ext: '<path d="M9 5H5v14h14v-4M13 4h7v7M20 4l-9 9" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
    grid: '<rect x="4" y="4" width="7" height="7" rx="1.5" fill="currentColor"/><rect x="13" y="4" width="7" height="7" rx="1.5" fill="currentColor"/><rect x="4" y="13" width="7" height="7" rx="1.5" fill="currentColor"/><rect x="13" y="13" width="7" height="7" rx="1.5" fill="currentColor"/>',
    list: '<path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 5.5V5a1 1 0 0 0-1-1H6a2 2 0 0 0-2 2v9a1 1 0 0 0 1 1h.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    send: '<path d="M3.5 11.5 20 4l-6 16.5-3-6.5Z" fill="currentColor"/><path d="m11 14 9-10" stroke="var(--win, #fff)" stroke-width="1.6"/>',
    play: '<path d="M7 4.5v15l12-7.5Z" fill="currentColor"/>',
    pause: '<rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor"/>',
    bot: '<rect x="4" y="8" width="16" height="11" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="9" cy="13.5" r="1.6" fill="currentColor"/><circle cx="15" cy="13.5" r="1.6" fill="currentColor"/><path d="M12 8V4.5M12 4.5h0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="4" r="1.6" fill="currentColor"/>',
    arrowL: '<path d="M19 12H5m6-6-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
    arrowR: '<path d="M5 12h14m-6-6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
  };
  MOS.ui = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" class="ui-ico">${ui[name] || ''}</svg>`;
})();
