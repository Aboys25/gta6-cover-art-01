// Pure logic for Vice Cover Studio: layouts, grades, title styles, undo history
// and seal geometry. No DOM here on purpose, so node --test can import this
// file directly and exercise the risky logic (undo, auto title style, seal
// placement) without a browser.

export const LAYOUTS = [
  { id: 'hero-mosaic', name: 'Hero mosaic', panels: 4 },
  { id: 'hero-three', name: 'Hero + three', panels: 4 },
  { id: 'six-grid', name: 'Six grid', panels: 6 },
  { id: 'diagonal-trio', name: 'Diagonal trio', panels: 3 },
  { id: 'seven-mosaic', name: 'Seven mosaic', panels: 7 },
];

export const GRADES = {
  sunset: { name: 'Vice Sunset', sky: ['#2b1038', '#7a1e4d', '#ff7a4d'], wash: 'rgba(255, 110, 70, 0.20)', accent: '#ffb347' },
  neon: { name: 'Neon Nights', sky: ['#0a1030', '#123a6e', '#00e5ff'], wash: 'rgba(0, 229, 255, 0.18)', accent: '#37e6ff' },
  golden: { name: 'Golden Hour', sky: ['#2e1a05', '#7a4a08', '#ffc233'], wash: 'rgba(255, 194, 51, 0.20)', accent: '#ffd76a' },
  teal: { name: 'Tropic Teal', sky: ['#04241f', '#0b5e52', '#2ee6a8'], wash: 'rgba(46, 230, 168, 0.16)', accent: '#5cf2c0' },
  heat: { name: 'Heatwave', sky: ['#2b0605', '#7a0e08', '#ff3d2e'], wash: 'rgba(255, 61, 46, 0.20)', accent: '#ff6a4d' },
  ultraviolet: { name: 'Ultraviolet', sky: ['#160a33', '#3d1470', '#b44dff'], wash: 'rgba(180, 77, 255, 0.20)', accent: '#c98bff' },
};

export const TITLE_STYLES = {
  chrome: { name: 'Sunset chrome' },
  neon: { name: 'Ice neon' },
  gold: { name: 'Gold rush' },
  blade: { name: 'Heat blade' },
  sign: { name: 'Neon sign' },
};

// Auto title style follows the grade: the label promises it, so the lookup
// must actually read the grade instead of always falling back to chrome.
export const AUTO_STYLE_BY_GRADE = {
  sunset: 'chrome',
  neon: 'neon',
  golden: 'gold',
  teal: 'sign',
  heat: 'blade',
  ultraviolet: 'sign',
};

export function resolveTitleStyle(grade, style) {
  if (style !== 'auto') return style;
  return AUTO_STYLE_BY_GRADE[grade] || 'chrome';
}

export function layoutById(id) {
  return LAYOUTS.find((entry) => entry.id === id) || LAYOUTS[0];
}

// Panel rectangles for a layout, as fractions of the poster (w, h).
// Each panel: { x, y, w, h } in pixels, plus an optional `poly` (parallelogram
// points) for the diagonal trio. A small gap separates the panels.
export function panelsFor(layoutId, w, h) {
  const g = Math.max(4, Math.round(w * 0.008));
  const third = (w - 2 * g) / 3;
  switch (layoutId) {
    case 'hero-mosaic': {
      const heroW = Math.round(w * 0.6);
      const colX = heroW + g;
      const colW = w - colX;
      const rowH = (h - 2 * g) / 3;
      return [
        { x: 0, y: 0, w: heroW, h },
        { x: colX, y: 0, w: colW, h: rowH },
        { x: colX, y: rowH + g, w: colW, h: rowH },
        { x: colX, y: 2 * (rowH + g), w: colW, h: rowH },
      ];
    }
    case 'hero-three': {
      const heroH = Math.round(h * 0.58);
      const rowY = heroH + g;
      const rowH = h - rowY;
      return [
        { x: 0, y: 0, w, h: heroH },
        { x: 0, y: rowY, w: third, h: rowH },
        { x: third + g, y: rowY, w: third, h: rowH },
        { x: 2 * (third + g), y: rowY, w: third, h: rowH },
      ];
    }
    case 'six-grid': {
      const rowH = (h - g) / 2;
      const panels = [];
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 3; c++) {
          panels.push({ x: c * (third + g), y: r * (rowH + g), w: third, h: rowH });
        }
      }
      return panels;
    }
    case 'diagonal-trio': {
      // One shared cut angle: every panel is a parallelogram slanting the
      // same way, so the three photos read as one diagonal system.
      const slant = Math.round(h * 0.05);
      const panels = [];
      for (let i = 0; i < 3; i++) {
        const x = i * (third + g);
        const leftTop = i === 0 ? x : x + slant;
        panels.push({
          x, y: 0, w: third + slant, h,
          poly: [[leftTop, 0], [x + third + slant, 0], [x + third, h], [x, h]],
        });
      }
      return panels;
    }
    case 'seven-mosaic': {
      const heroW = Math.round(w * 0.5);
      const heroH = Math.round(h * 0.62);
      const topY = 0;
      const topH = heroH;
      const topW = (w - heroW - g - g) / 2;
      const botY = heroH + g;
      const botH = h - botY;
      const botW = (w - 3 * g) / 4;
      return [
        { x: 0, y: 0, w: heroW, h: heroH },
        { x: heroW + g, y: topY, w: topW, h: topH },
        { x: heroW + g + topW + g, y: topY, w: topW, h: topH },
        { x: 0, y: botY, w: botW, h: botH },
        { x: botW + g, y: botY, w: botW, h: botH },
        { x: 2 * (botW + g), y: botY, w: botW, h: botH },
        { x: 3 * (botW + g), y: botY, w: botW, h: botH },
      ];
    }
    default:
      return panelsFor('hero-mosaic', w, h);
  }
}

// --- Undo / redo history -------------------------------------------------
// The stack holds snapshots TAKEN AFTER each change, seeded once at boot with
// the initial state (S0). Undo pops the newest snapshot onto the redo stack
// and restores the new top — so the FIRST undo already returns to the state
// before the last change. (Pushing a snapshot after the change and then
// restoring the popped one is the off-by-one that made the first undo a no-op.)
export function newHistory(initialState) {
  return { undo: [snapshotOf(initialState)], redo: [] };
}

export function snapshotOf(state) {
  return JSON.stringify(state);
}

export function commitHistory(history, state) {
  history.undo.push(snapshotOf(state));
  if (history.undo.length > 50) history.undo.shift();
  history.redo.length = 0;
}

export function undoHistory(history) {
  if (history.undo.length <= 1) return null;
  history.redo.push(history.undo.pop());
  return history.undo[history.undo.length - 1];
}

export function redoHistory(history) {
  if (history.redo.length === 0) return null;
  const snap = history.redo.pop();
  history.undo.push(snap);
  return snap;
}

// Clamp a panel selection after a restore (e.g. undo back to a smaller
// layout): an out-of-range index would crash the panel handlers.
export function clampPanel(index, panelCount) {
  if (panelCount <= 0) return 0;
  return Math.max(0, Math.min(index, panelCount - 1));
}

// --- Seal geometry -------------------------------------------------------
// The seal sits at 90% width, 79% height. Its radius scales with the poster
// HEIGHT (not the width), so on the wide 1920x1080 export its bottom edge
// stays above the tagline strip that starts at 86% height.
export function sealGeometry(w, h) {
  const cx = w * 0.9;
  const cy = h * 0.79;
  const r = 56 * (h / 1080);
  const taglineTop = h * 0.86;
  return { cx, cy, r, taglineTop, sealBottom: cy + r, clearsTagline: cy + r < taglineTop };
}

// Role tags live on the panel edge farthest from the title band (centred
// around 53% height), so a tag never sits under the big title.
export function roleTagEdge(panel, h) {
  const bandCenter = h * 0.53;
  const panelCenter = panel.y + panel.h / 2;
  return panelCenter < bandCenter ? 'bottom' : 'top';
}

// Where a role tag of (tagW x tagH) goes on a panel: on the edge farthest
// from the title band, never below 84% height (the tagline strip owns the
// foot), never inside the title + script zone (44%–64% height), and never
// touching the gold seal — it slides left, or parks just above the seal.
// Returns { x, y } (top-left corner of the tag).
export function roleTagRect(panel, tagW, tagH, h, seal) {
  const pad = Math.max(8, h * 0.012);
  const foot = h * 0.84 - tagH;
  let x = panel.x + pad;
  let y;
  if (roleTagEdge(panel, h) === 'bottom') {
    y = Math.min(panel.y + panel.h - pad - tagH, foot);
    if (y + tagH > h * 0.44 && y < h * 0.64) y = h * 0.44 - tagH - pad;
  } else {
    y = panel.y + pad;
    if (y < h * 0.64 && y + tagH > h * 0.44) {
      y = Math.min(panel.y + panel.h - pad - tagH, foot);
    }
  }
  if (seal) {
    const nearX = Math.max(x, Math.min(seal.cx, x + tagW));
    const nearY = Math.max(y, Math.min(seal.cy, y + tagH));
    if (Math.hypot(seal.cx - nearX, seal.cy - nearY) < seal.r + 4) {
      const slid = Math.min(x, seal.cx - seal.r - pad - tagW);
      if (slid >= panel.x + pad) x = slid;
      else y = seal.cy - seal.r - pad - tagH;
    }
  }
  return { x, y };
}
