// Vice Cover Studio — the cover renderer. One pure function, renderCover, draws a
// GTA-style multi-panel poster (photos, sunset/neon grade, bold caption lettering,
// original sun / skyline / palm silhouettes) onto any canvas at any size, so the
// live preview and the exported PNG are the same drawing at different resolutions.

export const LAYOUTS = {
  hero: 'Hero + strip',
  grid: 'Four panels',
  triple: 'Three panels',
  solo: 'One photo',
};

export const GRADES = {
  sunset: 'Vice Sunset',
  neon: 'Neon Nights',
  golden: 'Golden Hour',
  noir: 'Palm Noir',
  dawn: 'Pastel Dawn',
};

export const TITLE_STYLES = {
  outline: 'Bold outline',
  neon: 'Neon glow',
  vice: 'Vice gradient',
};

export const EXPORT_SIZES = [
  { label: 'Square 1080 x 1080', w: 1080, h: 1080 },
  { label: 'Portrait 1080 x 1350', w: 1080, h: 1350 },
  { label: 'Wide 1920 x 1080', w: 1920, h: 1080 },
];

/** A blank cover state: two sample photos, hero layout, sunset grade. */
export function defaultState() {
  return {
    layout: 'hero',
    grade: 'sunset',
    title: 'SUNSET HEIST',
    subtitle: 'NEON NIGHTS · 2026',
    titleStyle: 'outline',
    selectedPanel: 0,
    photos: [], // HTMLImageElement, filled in by main.js (samples first)
    panels: [
      { photo: 1, zoom: 1.15, ox: 0, oy: -0.05 },
      { photo: 0, zoom: 1.2, ox: 0, oy: 0 },
      { photo: 1, zoom: 1.3, ox: 0.1, oy: 0 },
      { photo: 0, zoom: 1.1, ox: 0, oy: 0.05 },
    ],
  };
}

// ---------------------------------------------------------------------------
// Panel geometry. Each panel is a polygon (array of [x, y]) so dividers can
// slant like a poster collage. `g` is the white gap between panels.
// ---------------------------------------------------------------------------

/** Returns the panel polygons for a layout at W x H, in draw order. */
export function panelPolygons(layout, W, H) {
  const g = Math.round(Math.min(W, H) * 0.012) || 6;
  const slant = Math.round(W * 0.045);
  switch (layout) {
    case 'grid': {
      const hw = W / 2, hh = H / 2;
      return [
        [[0, 0], [hw - g / 2, 0], [hw - g / 2, hh - g / 2], [0, hh - g / 2]],
        [[hw + g / 2, 0], [W, 0], [W, hh - g / 2], [hw + g / 2, hh - g / 2]],
        [[0, hh + g / 2], [hw - g / 2, hh + g / 2], [hw - g / 2, H], [0, H]],
        [[hw + g / 2, hh + g / 2], [W, hh + g / 2], [W, H], [hw + g / 2, H]],
      ];
    }
    case 'triple': {
      const tw = W / 3;
      return [
        [[0, 0], [tw + slant - g / 2, 0], [tw - g / 2, H], [0, H]],
        [[tw + slant + g / 2, 0], [2 * tw - slant - g / 2, 0], [2 * tw - g / 2, H], [tw + g / 2, H]],
        [[2 * tw - slant + g / 2, 0], [W, 0], [W, H], [2 * tw + g / 2, H]],
      ];
    }
    case 'solo':
      return [[[0, 0], [W, 0], [W, H], [0, H]]];
    case 'hero':
    default: {
      const split = W * 0.6, mid = H / 2;
      return [
        [[0, 0], [split + slant, 0], [split, H], [0, H]],
        [[split + slant + g, 0], [W, 0], [W, mid - g / 2], [split + g, mid - g / 2]],
        [[split + g, mid + g / 2], [W, mid + g / 2], [W, H], [split, H]],
      ];
    }
  }
}

/** How many panels a layout shows. */
export function panelCount(layout) {
  return panelPolygons(layout, 100, 100).length;
}

// ---------------------------------------------------------------------------
// Colour grades. Each grade is a canvas filter for the photo plus overlay
// gradients drawn over it (composited, never destructive).
// ---------------------------------------------------------------------------

const GRADE_FILTERS = {
  sunset: 'saturate(1.35) contrast(1.08) brightness(1.02)',
  neon: 'saturate(1.6) contrast(1.12) hue-rotate(-12deg)',
  golden: 'saturate(1.25) contrast(1.05) sepia(0.22) brightness(1.05)',
  noir: 'grayscale(1) contrast(1.18) brightness(1.04)',
  dawn: 'saturate(1.1) contrast(0.98) brightness(1.08) hue-rotate(8deg)',
};

/** Draws a grade's tint, sunset band and sky glow over the whole cover. */
function drawGradeOverlays(ctx, W, H, grade) {
  // Warm band rising from the bottom, the Vice City sunset.
  const band = ctx.createLinearGradient(0, H * 0.45, 0, H);
  if (grade === 'neon') {
    band.addColorStop(0, 'rgba(255, 45, 149, 0)');
    band.addColorStop(0.55, 'rgba(255, 45, 149, 0.20)');
    band.addColorStop(1, 'rgba(90, 20, 200, 0.42)');
  } else if (grade === 'golden') {
    band.addColorStop(0, 'rgba(255, 170, 60, 0)');
    band.addColorStop(0.6, 'rgba(255, 150, 40, 0.16)');
    band.addColorStop(1, 'rgba(190, 80, 10, 0.34)');
  } else if (grade === 'noir') {
    band.addColorStop(0, 'rgba(0, 0, 0, 0)');
    band.addColorStop(1, 'rgba(0, 0, 0, 0.38)');
  } else if (grade === 'dawn') {
    band.addColorStop(0, 'rgba(255, 190, 220, 0)');
    band.addColorStop(0.6, 'rgba(255, 170, 200, 0.14)');
    band.addColorStop(1, 'rgba(150, 110, 220, 0.30)');
  } else {
    band.addColorStop(0, 'rgba(255, 120, 80, 0)');
    band.addColorStop(0.55, 'rgba(255, 110, 90, 0.24)');
    band.addColorStop(1, 'rgba(200, 40, 120, 0.48)');
  }
  ctx.fillStyle = band;
  ctx.fillRect(0, 0, W, H);
  // Sky glow at the top.
  const sky = ctx.createLinearGradient(0, 0, 0, H * 0.3);
  sky.addColorStop(0, grade === 'neon' ? 'rgba(40, 10, 90, 0.35)' : 'rgba(255, 140, 90, 0.18)');
  sky.addColorStop(1, 'rgba(255, 140, 90, 0)');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H * 0.3);
}

// Deterministic film grain: a seeded noise tile, drawn once per cover.
let grainTile = null;
function getGrainTile() {
  if (grainTile) return grainTile;
  const tile = document.createElement('canvas');
  tile.width = 128; tile.height = 128;
  const tctx = tile.getContext('2d');
  const img = tctx.createImageData(128, 128);
  let seed = 20261119;
  const next = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(next() * 255);
    img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 28;
  }
  tctx.putImageData(img, 0, 0);
  grainTile = tile;
  return tile;
}

function drawVignetteAndGrain(ctx, W, H) {
  const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.72);
  v.addColorStop(0, 'rgba(0, 0, 0, 0)');
  v.addColorStop(1, 'rgba(10, 0, 20, 0.32)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
  const tile = getGrainTile();
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = ctx.createPattern(tile, 'repeat');
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Original silhouettes: a retro sun, a skyline and palm trees, all drawn
// with canvas paths — no borrowed artwork.
// ---------------------------------------------------------------------------

/** Retro sun with horizontal slats, centred at (cx, cy) with radius r. Drawn on a
 *  scratch canvas first so the slat cuts erase only the sun, never the photo. */
function drawRetroSun(ctx, cx, cy, r, grade) {
  const pad = 4;
  const sun = document.createElement('canvas');
  sun.width = Math.ceil(r * 2 + pad * 2);
  sun.height = Math.ceil(r * 2 + pad * 2);
  const sctx = sun.getContext('2d');
  const grad = sctx.createLinearGradient(0, 0, 0, sun.height);
  if (grade === 'neon') {
    grad.addColorStop(0, '#ffe95e'); grad.addColorStop(0.55, '#ff5e8a'); grad.addColorStop(1, '#b537f2');
  } else if (grade === 'noir') {
    grad.addColorStop(0, '#f5f5f5'); grad.addColorStop(1, '#9a9a9a');
  } else {
    grad.addColorStop(0, '#ffd76a'); grad.addColorStop(0.55, '#ff7e4a'); grad.addColorStop(1, '#e83e8c');
  }
  sctx.fillStyle = grad;
  sctx.beginPath();
  sctx.arc(r + pad, r + pad, r, 0, Math.PI * 2);
  sctx.fill();
  // Slats: cut the lower half into stripes.
  sctx.globalCompositeOperation = 'destination-out';
  let y = r + pad + r * 0.05;
  let gap = r * 0.05;
  while (y < r + pad + r) {
    sctx.fillRect(0, y, sun.width, gap);
    y += gap + r * 0.11;
    gap *= 1.5;
  }
  ctx.drawImage(sun, cx - r - pad, cy - r - pad);
}

/** A simple skyline silhouette with a few lit windows. */
function drawSkyline(ctx, W, H, baseY, grade) {
  const dark = grade === 'noir' ? '#111' : '#1c0b2e';
  ctx.fillStyle = dark;
  let x = 0;
  let seed = 7;
  const next = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  while (x < W) {
    const bw = W * (0.04 + next() * 0.06);
    const bh = H * (0.03 + next() * 0.09);
    ctx.fillRect(x, baseY - bh, bw, bh);
    // Antenna on some towers.
    if (next() > 0.6) ctx.fillRect(x + bw / 2 - 1, baseY - bh - H * 0.02, 2, H * 0.02);
    x += bw + W * 0.008;
  }
  // Lit windows.
  ctx.fillStyle = grade === 'neon' ? '#ff9de2' : '#ffd76a';
  seed = 13;
  x = W * 0.02;
  while (x < W) {
    if (next() > 0.5) ctx.fillRect(x, baseY - H * (0.02 + next() * 0.06), 3, 4);
    x += W * 0.02;
  }
}

/** One palm silhouette: curved trunk and arcing fronds. */
function drawPalm(ctx, x, baseY, s, lean) {
  ctx.save();
  ctx.translate(x, baseY);
  ctx.scale(s, s);
  ctx.rotate(lean);
  ctx.strokeStyle = '#160a24';
  ctx.fillStyle = '#160a24';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  // Trunk, curving gently.
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(6, -55, -4, -105);
  ctx.stroke();
  // Fronds from the crown.
  ctx.translate(-4, -105);
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI * (0.08 + i * 0.13);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(Math.cos(a) * 42, Math.sin(a) * 42 - 18, Math.cos(a) * 78, Math.sin(a) * 78 + 26);
    ctx.quadraticCurveTo(Math.cos(a) * 42, Math.sin(a) * 42 + 8, 0, 0);
    ctx.fill();
  }
  // Coconuts.
  ctx.beginPath(); ctx.arc(-6, 4, 4, 0, Math.PI * 2); ctx.arc(6, 5, 4, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Photos, panels and lettering.
// ---------------------------------------------------------------------------

/** Draws one photo cover-fit into a polygon, with the panel's zoom/offset. */
function drawPhotoInPolygon(ctx, img, poly, zoom, ox, oy) {
  // Bounding box of the polygon.
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of poly) {
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  const bw = maxX - minX, bh = maxY - minY;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(poly[0][0], poly[0][1]);
  for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i][0], poly[i][1]);
  ctx.closePath();
  ctx.clip();
  if (img) {
    const base = Math.max(bw / img.naturalWidth, bh / img.naturalHeight);
    const scale = base * zoom;
    const pw = img.naturalWidth * scale;
    const ph = img.naturalHeight * scale;
    const cx = minX + bw / 2 + ox * (pw - bw) * 0.5;
    const cy = minY + bh / 2 + oy * (ph - bh) * 0.5;
    ctx.drawImage(img, cx - pw / 2, cy - ph / 2, pw, ph);
  } else {
    ctx.fillStyle = '#3a2340';
    ctx.fillRect(minX, minY, bw, bh);
  }
  ctx.restore();
}

/** White gap lines along each polygon's edges, for the poster-collage seams. */
function strokePanelSeams(ctx, polys, W) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.92)';
  ctx.lineWidth = Math.max(2, W * 0.004);
  for (const poly of polys) {
    ctx.beginPath();
    ctx.moveTo(poly[0][0], poly[0][1]);
    for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i][0], poly[i][1]);
    ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();
}

function fitTitleSize(ctx, text, maxWidth, startSize, fontFamily) {
  let size = startSize;
  ctx.font = `900 ${size}px ${fontFamily}`;
  while (size > 14 && ctx.measureText(text).width > maxWidth) {
    size -= 4;
    ctx.font = `900 ${size}px ${fontFamily}`;
  }
  return size;
}

const TITLE_FONT = '"Vice Bold", "Arial Black", "Liberation Sans", sans-serif';

/** The bold caption: big title with a slant, plus a letterspaced subtitle. */
function drawCaption(ctx, W, H, state) {
  const bandH = H * 0.26;
  const bandY = H - bandH;
  // Scrim so lettering reads over any photo.
  const scrim = ctx.createLinearGradient(0, bandY - H * 0.06, 0, H);
  scrim.addColorStop(0, 'rgba(10, 2, 18, 0)');
  scrim.addColorStop(0.45, 'rgba(10, 2, 18, 0.55)');
  scrim.addColorStop(1, 'rgba(10, 2, 18, 0.82)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, bandY - H * 0.06, W, H - bandY + H * 0.06);

  const title = (state.title || '').trim().toUpperCase();
  const sub = (state.subtitle || '').trim().toUpperCase();
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  // Slight forward slant, the poster-lettering lean.
  const shear = -0.07;
  ctx.transform(1, 0, shear, 1, -shear * (H * 0.5), 0);
  if (title) {
    const size = fitTitleSize(ctx, title, W * 0.9, H * 0.115, TITLE_FONT);
    const y = H - H * 0.085;
    ctx.font = `900 ${size}px ${TITLE_FONT}`;
    try { ctx.letterSpacing = `${Math.round(size * 0.02)}px`; } catch { /* older canvas */ }
    if (state.titleStyle === 'neon') {
      const grad = ctx.createLinearGradient(0, y - size, 0, y);
      grad.addColorStop(0, '#7df9ff'); grad.addColorStop(0.5, '#ff5edb'); grad.addColorStop(1, '#ffe95e');
      ctx.fillStyle = grad;
      ctx.shadowColor = '#ff2d95';
      ctx.shadowBlur = size * 0.35;
      ctx.fillText(title, W / 2, y);
      ctx.shadowBlur = 0;
      ctx.lineWidth = size * 0.03;
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.strokeText(title, W / 2, y);
    } else if (state.titleStyle === 'vice') {
      const grad = ctx.createLinearGradient(0, y - size, 0, y);
      grad.addColorStop(0, '#ffe95e'); grad.addColorStop(0.45, '#ff7e4a'); grad.addColorStop(1, '#e83e8c');
      ctx.fillStyle = grad;
      ctx.lineWidth = size * 0.06;
      ctx.strokeStyle = '#160a24';
      ctx.lineJoin = 'round';
      ctx.strokeText(title, W / 2, y);
      ctx.fillText(title, W / 2, y);
    } else {
      ctx.lineWidth = size * 0.09;
      ctx.strokeStyle = '#160a24';
      ctx.lineJoin = 'round';
      ctx.strokeText(title, W / 2, y);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(title, W / 2, y);
    }
    try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
  }
  ctx.restore();

  if (sub) {
    ctx.save();
    ctx.textAlign = 'center';
    const subSize = Math.max(12, H * 0.026);
    ctx.font = `700 ${subSize}px ${TITLE_FONT}`;
    try { ctx.letterSpacing = `${Math.round(subSize * 0.32)}px`; } catch { /* older canvas */ }
    ctx.fillStyle = '#ffd76a';
    ctx.fillText(sub, W / 2, H - H * 0.028);
    // Flanking rules.
    const tw = ctx.measureText(sub).width;
    ctx.strokeStyle = 'rgba(255,215,106,0.8)';
    ctx.lineWidth = Math.max(1.5, H * 0.002);
    const ruleY = H - H * 0.028 - subSize * 0.35;
    const ruleLen = Math.min(W * 0.12, (W - tw) / 2 - W * 0.03);
    if (ruleLen > 10) {
      ctx.beginPath();
      ctx.moveTo(W / 2 - tw / 2 - W * 0.02 - ruleLen, ruleY);
      ctx.lineTo(W / 2 - tw / 2 - W * 0.02, ruleY);
      ctx.moveTo(W / 2 + tw / 2 + W * 0.02, ruleY);
      ctx.lineTo(W / 2 + tw / 2 + W * 0.02 + ruleLen, ruleY);
      ctx.stroke();
    }
    ctx.restore();
  }
}

/** Small corner labels, the poster's fine print. */
function drawCornerLabels(ctx, W, H) {
  ctx.save();
  ctx.font = `700 ${Math.max(11, H * 0.016)}px ${TITLE_FONT}`;
  try { ctx.letterSpacing = '3px'; } catch { /* older canvas */ }
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.textAlign = 'left';
  ctx.fillText('NEON COAST', W * 0.03, H * 0.045);
  ctx.textAlign = 'right';
  ctx.fillText('EST. 2026', W * 0.97, H * 0.045);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// The cover itself.
// ---------------------------------------------------------------------------

/**
 * Draws the whole cover for `state` onto `canvas` (at the canvas's own size).
 * Deterministic: same state and size always paint the same pixels.
 */
export function renderCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const grade = GRADES[state.grade] ? state.grade : 'sunset';
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#160a24';
  ctx.fillRect(0, 0, W, H);

  const polys = panelPolygons(state.layout, W, H);
  const count = polys.length;
  ctx.save();
  ctx.filter = GRADE_FILTERS[grade];
  for (let i = 0; i < count; i++) {
    const panel = state.panels[i] || { photo: 0, zoom: 1, ox: 0, oy: 0 };
    const img = state.photos[panel.photo] || state.photos[0] || null;
    drawPhotoInPolygon(ctx, img, polys[i], panel.zoom || 1, panel.ox || 0, panel.oy || 0);
  }
  ctx.restore();

  // Retro sun behind the caption band, on the big panel's side.
  const sunR = Math.min(W, H) * 0.15;
  const sunX = state.layout === 'hero' ? W * 0.30 : W * 0.5;
  const sunY = H * 0.58;
  drawRetroSun(ctx, sunX, sunY, sunR, grade);

  drawGradeOverlays(ctx, W, H, grade);
  drawSkyline(ctx, W, H, H * 0.78, grade);
  drawPalm(ctx, W * 0.06, H * 0.80, Math.min(W, H) * 0.0016, -0.12);
  drawPalm(ctx, W * 0.94, H * 0.80, Math.min(W, H) * 0.0014, 0.14);
  strokePanelSeams(ctx, polys, W);
  drawVignetteAndGrain(ctx, W, H);

  // Poster frame.
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = Math.max(3, W * 0.006);
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, W - ctx.lineWidth, H - ctx.lineWidth);
  ctx.restore();

  drawCaption(ctx, W, H, state);
  drawCornerLabels(ctx, W, H);
  return canvas;
}
