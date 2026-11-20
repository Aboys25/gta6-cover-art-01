/**
 * grades.js — Vice City colour grades.
 *
 * Each grade is a recipe: a gradient-map ramp (shadows -> highlights), a
 * mix strength, a saturation/contrast push, and the overlay it paints over
 * the finished cover (sunset band, vignette, grain). All numbers are ours;
 * no reference image or LUT was copied in.
 */

function hexRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function ramp(stops) {
  // stops: [[position 0..1, '#rrggbb'], ...] -> 256-entry RGB lookup table.
  const lut = new Uint8Array(256 * 3);
  const pts = stops.map(([p, c]) => [p, hexRgb(c)]);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let a = pts[0];
    let b = pts[pts.length - 1];
    for (let k = 0; k < pts.length - 1; k++) {
      if (t >= pts[k][0] && t <= pts[k + 1][0]) { a = pts[k]; b = pts[k + 1]; break; }
    }
    const span = b[0] - a[0] || 1;
    const f = Math.min(1, Math.max(0, (t - a[0]) / span));
    for (let ch = 0; ch < 3; ch++) lut[i * 3 + ch] = Math.round(a[1][ch] + (b[1][ch] - a[1][ch]) * f);
  }
  return lut;
}

export const GRADES = [
  {
    id: 'sunset',
    name: 'Vice Sunset',
    css: 'sunset',
    // deep violet shadows, magenta mids, orange-gold highlights
    stops: [[0, '#160a2e'], [0.28, '#571b63'], [0.55, '#c62b6e'], [0.8, '#ff7a3d'], [1, '#ffd166']],
    mix: 0.52,
    saturation: 1.28,
    contrast: 1.07,
    band: 'sunset',
    vignette: 0.34,
    grain: 0.05,
  },
  {
    id: 'neon',
    name: 'Neon Nights',
    css: 'neon',
    // teal shadows, electric pink highlights — night-street duotone
    stops: [[0, '#03181d'], [0.3, '#0e4d5c'], [0.55, '#1f8fa8'], [0.78, '#ff2e88'], [1, '#ffb3d9']],
    mix: 0.58,
    saturation: 1.35,
    contrast: 1.1,
    band: 'neon',
    vignette: 0.38,
    grain: 0.06,
  },
  {
    id: 'dusk',
    name: 'Palm Dusk',
    css: 'dusk',
    // purple dusk with a warm gold top end
    stops: [[0, '#0d0722'], [0.3, '#3b2370'], [0.58, '#8b5cf6'], [0.82, '#ff9a5c'], [1, '#ffe9a8']],
    mix: 0.5,
    saturation: 1.22,
    contrast: 1.05,
    band: 'dusk',
    vignette: 0.36,
    grain: 0.05,
  },
  {
    id: 'heat',
    name: 'Miami Heat',
    css: 'heat',
    // hot red-orange, crushed blacks, blown golds
    stops: [[0, '#1c0505'], [0.3, '#7a1020'], [0.58, '#e8322e'], [0.8, '#ff7a2e'], [1, '#ffe08a']],
    mix: 0.55,
    saturation: 1.32,
    contrast: 1.14,
    band: 'heat',
    vignette: 0.3,
    grain: 0.04,
  },
  {
    id: 'noir',
    name: 'Mono Noir',
    css: 'noir',
    // black-and-white with a pink shadow tint and warm highlights
    stops: [[0, '#050505'], [0.25, '#2a2430'], [0.55, '#8f8a96'], [0.8, '#e8e2ea'], [1, '#fff4f6']],
    mix: 0.85,
    saturation: 0.12,
    contrast: 1.12,
    band: 'none',
    vignette: 0.42,
    grain: 0.07,
  },
];

const lutCache = new Map();

export function gradeById(id) {
  return GRADES.find((g) => g.id === id) || GRADES[0];
}

export function gradeLut(grade) {
  if (!lutCache.has(grade.id)) lutCache.set(grade.id, ramp(grade.stops));
  return lutCache.get(grade.id);
}

/** Apply one grade to raw RGBA pixels, in place. */
export function applyGradeToPixels(data, grade) {
  const lut = gradeLut(grade);
  const mix = grade.mix;
  const sat = grade.saturation;
  const con = grade.contrast;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
    const li = lum * 3;
    let nr = r + (lut[li] - r) * mix;
    let ng = g + (lut[li + 1] - g) * mix;
    let nb = b + (lut[li + 2] - b) * mix;
    // saturation around the pixel's own luminance
    const l2 = 0.2126 * nr + 0.7152 * ng + 0.0722 * nb;
    nr = l2 + (nr - l2) * sat;
    ng = l2 + (ng - l2) * sat;
    nb = l2 + (nb - l2) * sat;
    // gentle S-contrast around mid grey
    nr = 128 + (nr - 128) * con;
    ng = 128 + (ng - 128) * con;
    nb = 128 + (nb - 128) * con;
    data[i] = nr < 0 ? 0 : nr > 255 ? 255 : nr;
    data[i + 1] = ng < 0 ? 0 : ng > 255 ? 255 : ng;
    data[i + 2] = nb < 0 ? 0 : nb > 255 ? 255 : nb;
  }
}

/** Paint the grade's light band across the finished cover. */
export function paintGradeBand(ctx, w, h, grade) {
  if (grade.band === 'none') return;
  const bandH = h * 0.34;
  const y = h - bandH;
  const grad = ctx.createLinearGradient(0, y, 0, h);
  if (grade.band === 'sunset') {
    grad.addColorStop(0, 'rgba(255,122,61,0)');
    grad.addColorStop(0.55, 'rgba(255,122,61,0.16)');
    grad.addColorStop(1, 'rgba(255,46,136,0.30)');
  } else if (grade.band === 'neon') {
    grad.addColorStop(0, 'rgba(34,211,238,0)');
    grad.addColorStop(0.5, 'rgba(34,211,238,0.14)');
    grad.addColorStop(1, 'rgba(255,46,136,0.32)');
  } else if (grade.band === 'dusk') {
    grad.addColorStop(0, 'rgba(139,92,246,0)');
    grad.addColorStop(0.55, 'rgba(139,92,246,0.18)');
    grad.addColorStop(1, 'rgba(255,154,92,0.26)');
  } else if (grade.band === 'heat') {
    grad.addColorStop(0, 'rgba(255,122,46,0)');
    grad.addColorStop(0.55, 'rgba(255,60,40,0.20)');
    grad.addColorStop(1, 'rgba(255,46,46,0.30)');
  }
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = grad;
  ctx.fillRect(0, y, w, bandH);
  ctx.restore();
}

/** Darken the corners so the middle of the poster pops. */
export function paintVignette(ctx, w, h, strength) {
  if (strength <= 0) return;
  const r = Math.hypot(w, h) / 2;
  const grad = ctx.createRadialGradient(w / 2, h / 2, r * 0.45, w / 2, h / 2, r);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, `rgba(5,2,12,${strength})`);
  ctx.save();
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

let grainTile = null;
function getGrainTile() {
  if (grainTile) return grainTile;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const g = c.getContext('2d');
  const img = g.createImageData(128, 128);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(Math.random() * 256);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  grainTile = c;
  return c;
}

/** A whisper of film grain over the whole cover. */
export function paintGrain(ctx, w, h, amount) {
  if (amount <= 0) return;
  const tile = getGrainTile();
  const pat = ctx.createPattern(tile, 'repeat');
  ctx.save();
  ctx.globalAlpha = amount;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = pat;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}
