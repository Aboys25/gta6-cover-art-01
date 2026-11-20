// Poster renderer for Vice Cover Studio: draws the multi-panel cover on a
// canvas at any of the three export sizes. Pure canvas work — no DOM reads
// except the photos passed in — so the editor, the shot scenes and the PNG
// export all share this one drawing path.
import { GRADES, panelsFor, resolveTitleStyle, roleTagRect, sealGeometry } from './logic.js';

const DISPLAY = '"Arial Black", "Helvetica Neue", Arial, sans-serif';
const SCRIPT_FONT = 'italic bold Georgia, "Times New Roman", serif';

// Deterministic pseudo-random (fixed seed) so grain looks the same on every
// export of the same poster.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function coverDraw(ctx, img, x, y, w, h, zoom, flip) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const scale = Math.max(w / iw, h / ih) * (zoom || 1);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = x + (w - dw) / 2;
  const dy = y + (h - dh) / 2;
  ctx.save();
  if (flip) {
    ctx.translate(x + w / 2, 0);
    ctx.scale(-1, 1);
    ctx.translate(-(x + w / 2), 0);
  }
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

function fitFont(ctx, text, maxWidth, startSize, family, weight) {
  let size = startSize;
  ctx.font = `${weight} ${size}px ${family}`;
  while (size > 12 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return size;
}

function paintTitle(ctx, text, styleKey, cx, cy, maxWidth, baseSize, glow) {
  const size = fitFont(ctx, text, maxWidth, baseSize, DISPLAY, '900');
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  let fill;
  if (styleKey === 'neon') {
    fill = ctx.createLinearGradient(0, cy - size / 2, 0, cy + size / 2);
    fill.addColorStop(0, '#eafcff');
    fill.addColorStop(0.5, '#7df3ff');
    fill.addColorStop(1, '#00b3d8');
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = size * (0.35 + glow * 0.4);
    ctx.strokeStyle = '#062a33';
  } else if (styleKey === 'gold') {
    fill = ctx.createLinearGradient(0, cy - size / 2, 0, cy + size / 2);
    fill.addColorStop(0, '#fff8d6');
    fill.addColorStop(0.45, '#ffd76a');
    fill.addColorStop(1, '#a86e00');
    ctx.shadowColor = 'rgba(255, 190, 60, 0.8)';
    ctx.shadowBlur = size * (0.25 + glow * 0.3);
    ctx.strokeStyle = '#3d2600';
  } else if (styleKey === 'blade') {
    fill = ctx.createLinearGradient(0, cy - size / 2, 0, cy + size / 2);
    fill.addColorStop(0, '#ffffff');
    fill.addColorStop(0.5, '#ff7a5c');
    fill.addColorStop(1, '#b30000');
    ctx.shadowColor = 'rgba(255, 40, 20, 0.8)';
    ctx.shadowBlur = size * (0.25 + glow * 0.3);
    ctx.strokeStyle = '#2b0000';
    ctx.transform(1, 0, -0.06, 1, 0, 0);
  } else if (styleKey === 'sign') {
    fill = ctx.createLinearGradient(0, cy - size / 2, 0, cy + size / 2);
    fill.addColorStop(0, '#ffe3f6');
    fill.addColorStop(0.5, '#ff7ad9');
    fill.addColorStop(1, '#c4008f');
    ctx.shadowColor = '#ff4fd8';
    ctx.shadowBlur = size * (0.45 + glow * 0.4);
    ctx.strokeStyle = '#4d0036';
  } else {
    // chrome: sunset chrome — white, gold, pink, pale blue.
    fill = ctx.createLinearGradient(0, cy - size / 2, 0, cy + size / 2);
    fill.addColorStop(0, '#ffffff');
    fill.addColorStop(0.35, '#ffe9b0');
    fill.addColorStop(0.62, '#ff9d5c');
    fill.addColorStop(0.85, '#ff5e8a');
    fill.addColorStop(1, '#b8c6ff');
    ctx.shadowColor = 'rgba(255, 120, 90, 0.85)';
    ctx.shadowBlur = size * (0.3 + glow * 0.35);
    ctx.strokeStyle = '#1a0b1e';
  }
  ctx.lineWidth = Math.max(2, size * 0.07);
  ctx.strokeText(text, cx, cy);
  ctx.fillStyle = fill;
  ctx.fillText(text, cx, cy);
  ctx.restore();
  return size;
}

export function drawSeal(ctx, cx, cy, r) {
  ctx.save();
  ctx.translate(cx, cy);
  const gold = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
  gold.addColorStop(0, '#fff3c4');
  gold.addColorStop(0.55, '#f5c542');
  gold.addColorStop(1, '#9a6b00');
  ctx.fillStyle = gold;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#5c3d00';
  ctx.lineWidth = Math.max(2, r * 0.05);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.82, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#3d2600';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const label = Math.max(9, Math.round(r * 0.24));
  ctx.font = `900 ${label}px ${DISPLAY}`;
  ctx.fillText('ORIGINAL', 0, -r * 0.22);
  ctx.fillText('COVER ART', 0, r * 0.22);
  ctx.font = `900 ${Math.max(8, Math.round(r * 0.16))}px ${DISPLAY}`;
  ctx.fillText('★ ★ ★', 0, r * 0.58);
  ctx.restore();
}

function drawBarcode(ctx, x, y, w, h) {
  ctx.save();
  ctx.fillStyle = '#f5f0e6';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#111111';
  const rand = mulberry32(20261120);
  let bx = x + w * 0.06;
  while (bx < x + w * 0.94) {
    const bw = (1 + Math.floor(rand() * 4)) * (w / 90);
    if (rand() > 0.45) ctx.fillRect(bx, y + h * 0.12, bw, h * 0.62);
    bx += bw + w / 90;
  }
  ctx.fillStyle = '#111111';
  ctx.font = `${Math.max(8, Math.round(h * 0.2))}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('8 90211 2026', x + w / 2, y + h * 0.94);
  ctx.restore();
}

function drawRoleTag(ctx, panel, label, h, seal) {
  if (!label) return;
  const pad = Math.max(8, h * 0.012);
  const fontSize = Math.max(11, Math.round(h * 0.021));
  ctx.save();
  ctx.font = `900 ${fontSize}px ${DISPLAY}`;
  const textW = ctx.measureText(label).width;
  const tagW = textW + pad * 1.6;
  const tagH = fontSize * 1.9;
  const pos = roleTagRect(panel, tagW, tagH, h, seal);
  const tx = pos.x;
  const ty = pos.y;
  ctx.fillStyle = 'rgba(10, 4, 16, 0.82)';
  ctx.fillRect(tx, ty, tagW, tagH);
  ctx.strokeStyle = 'rgba(255, 215, 106, 0.9)';
  ctx.lineWidth = Math.max(1, h * 0.0015);
  ctx.strokeRect(tx, ty, tagW, tagH);
  ctx.fillStyle = '#ffd76a';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, tx + pad * 0.8, ty + tagH / 2 + 1);
  ctx.restore();
}

function drawFaceMark(ctx, panel) {
  const cx = panel.x + panel.w / 2;
  const cy = panel.y + panel.h / 2;
  const r = Math.min(panel.w, panel.h) * 0.16;
  ctx.save();
  ctx.strokeStyle = '#ffd76a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - r - 8, cy); ctx.lineTo(cx - r + 4, cy);
  ctx.moveTo(cx + r - 4, cy); ctx.lineTo(cx + r + 8, cy);
  ctx.moveTo(cx, cy - r - 8); ctx.lineTo(cx, cy - r + 4);
  ctx.moveTo(cx, cy + r - 4); ctx.lineTo(cx, cy + r + 8);
  ctx.stroke();
  ctx.restore();
}

// The poster itself. `state` is the editor state, `photos` an array of
// { img } (an <img> or any drawable with naturalWidth/naturalHeight).
export function drawPoster(ctx, state, photos, w, h) {
  const grade = GRADES[state.grade] || GRADES.sunset;
  const look = state.look || {};
  const paint = look.paint ?? 0.5;
  const gradeAmt = look.gradeAmt ?? 0.6;
  const halftone = look.halftone ?? 0.3;
  const grain = look.grain ?? 0.25;
  const glow = look.glow ?? 0.5;
  const titleSize = look.titleSize ?? 0.5;
  const titleLift = look.titleLift ?? 0.5;
  const extras = state.extras || {};

  // Dark sunset sky behind everything.
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, grade.sky[0]);
  sky.addColorStop(0.55, grade.sky[1]);
  sky.addColorStop(1, grade.sky[2]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // Mosaic panels.
  const panels = panelsFor(state.layout, w, h);
  panels.forEach((panel, i) => {
    const slot = state.panels[i] || {};
    const photo = slot.photo != null ? photos[slot.photo] : null;
    ctx.save();
    if (panel.poly) {
      ctx.beginPath();
      ctx.moveTo(panel.poly[0][0], panel.poly[0][1]);
      for (let k = 1; k < panel.poly.length; k++) ctx.lineTo(panel.poly[k][0], panel.poly[k][1]);
      ctx.closePath();
      ctx.clip();
    } else {
      ctx.beginPath();
      ctx.rect(panel.x, panel.y, panel.w, panel.h);
      ctx.clip();
    }
    if (photo && photo.img) {
      coverDraw(ctx, photo.img, panel.x, panel.y, panel.w, panel.h, slot.zoom || 1, slot.flip);
    } else {
      const g2 = ctx.createLinearGradient(panel.x, panel.y, panel.x + panel.w, panel.y + panel.h);
      g2.addColorStop(0, grade.sky[1]);
      g2.addColorStop(1, grade.sky[0]);
      ctx.fillStyle = g2;
      ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
    }
    // Grade wash + warm paint over every panel so the mosaic reads as one image.
    ctx.fillStyle = grade.wash;
    ctx.globalAlpha = gradeAmt;
    ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(255, 150, 60, 0.10)';
    ctx.globalAlpha = paint * 0.6;
    ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
    ctx.globalAlpha = 1;
    ctx.restore();
    // Thin dark frame between panels.
    ctx.strokeStyle = 'rgba(8, 3, 12, 0.9)';
    ctx.lineWidth = Math.max(2, w * 0.004);
    if (panel.poly) {
      ctx.beginPath();
      ctx.moveTo(panel.poly[0][0], panel.poly[0][1]);
      for (let k = 1; k < panel.poly.length; k++) ctx.lineTo(panel.poly[k][0], panel.poly[k][1]);
      ctx.closePath();
      ctx.stroke();
    } else {
      ctx.strokeRect(panel.x, panel.y, panel.w, panel.h);
    }
    if (slot.face) drawFaceMark(ctx, panel);
  });

  // Vignette: darken the edges so the title sits on calm dark space.
  const vig = ctx.createRadialGradient(w / 2, h * 0.45, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(5,2,10,0.55)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);

  // Halftone dots, strongest near the foot.
  if (halftone > 0.02) {
    const step = Math.max(12, Math.round(w / 72));
    ctx.fillStyle = `rgba(0, 0, 0, ${0.16 * halftone})`;
    for (let y = Math.round(h * 0.55); y < h; y += step) {
      for (let x = (Math.round(y / step) % 2 ? step / 2 : 0); x < w; x += step) {
        ctx.beginPath();
        ctx.arc(x, y, Math.max(1, step * 0.14), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Grain.
  if (grain > 0.02) {
    const rand = mulberry32(7);
    const count = Math.round(1400 * grain * (w / 1080));
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (let i = 0; i < count; i++) {
      const gx = rand() * w;
      const gy = rand() * h;
      ctx.globalAlpha = 0.05 + rand() * 0.10;
      ctx.fillRect(gx, gy, 1.6, 1.6);
    }
    ctx.globalAlpha = 1;
  }

  // Stars + quote across the top.
  if (extras.stars !== false && state.quote) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd76a';
    ctx.font = `900 ${Math.max(12, Math.round(h * 0.024))}px ${DISPLAY}`;
    ctx.fillText('★ ★ ★ ★ ★', w / 2, h * 0.045);
    ctx.fillStyle = '#ffffff';
    const qSize = fitFont(ctx, state.quote, w * 0.8, Math.max(13, Math.round(h * 0.026)), SCRIPT_FONT, 'italic bold');
    ctx.font = `italic bold ${qSize}px ${SCRIPT_FONT}`;
    ctx.fillText(state.quote, w / 2, h * 0.085);
    ctx.restore();
  }

  // VOL. 1 badge, top left.
  if (extras.vol1 !== false) {
    ctx.save();
    ctx.fillStyle = '#ffd76a';
    const bw = w * 0.075;
    const bh = h * 0.032;
    ctx.fillRect(w * 0.025, h * 0.028, bw, bh);
    ctx.fillStyle = '#1a0b1e';
    ctx.font = `900 ${Math.max(10, Math.round(h * 0.02))}px ${DISPLAY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('VOL. 1', w * 0.025 + bw / 2, h * 0.028 + bh / 2);
    ctx.restore();
  }

  // COMING SOON, top right.
  if (extras.comingSoon !== false) {
    ctx.save();
    ctx.fillStyle = 'rgba(10, 4, 16, 0.75)';
    const bw = w * 0.14;
    const bh = h * 0.032;
    ctx.fillRect(w * 0.975 - bw, h * 0.028, bw, bh);
    ctx.strokeStyle = '#ff5e8a';
    ctx.lineWidth = Math.max(1, h * 0.002);
    ctx.strokeRect(w * 0.975 - bw, h * 0.028, bw, bh);
    ctx.fillStyle = '#ff8fb0';
    ctx.font = `900 ${Math.max(10, Math.round(h * 0.018))}px ${DISPLAY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('COMING SOON', w * 0.975 - bw / 2, h * 0.028 + bh / 2);
    ctx.restore();
  }

  // The big title across the middle, in its own reserved band.
  const styleKey = resolveTitleStyle(state.grade, state.titleStyle);
  const titleText = (state.title || '').trim().toUpperCase();
  const lift = (titleLift - 0.5) * h * 0.07;
  const titleCy = h * 0.52 + lift;
  const titleBase = h * 0.105 * (0.75 + titleSize * 0.5);
  if (titleText) {
    paintTitle(ctx, titleText, styleKey, w / 2, titleCy, w * 0.92, titleBase, glow);
  }

  // Script subtitle under the title.
  if (state.script) {
    ctx.save();
    ctx.textAlign = 'center';
    const sSize = fitFont(ctx, state.script, w * 0.86, Math.max(13, Math.round(h * 0.028)), SCRIPT_FONT, 'italic bold');
    ctx.font = `italic bold ${sSize}px ${SCRIPT_FONT}`;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 6;
    ctx.fillText(state.script, w / 2, titleCy + titleBase * 0.62 + h * 0.02);
    ctx.restore();
  }

  // Role tags on the panels (kept clear of the title band and the seal).
  const seal = extras.seal === false ? null : sealGeometry(w, h);
  panels.forEach((panel, i) => {
    const slot = state.panels[i] || {};
    drawRoleTag(ctx, panel, (slot.role || '').trim().toUpperCase(), h, seal);
  });

  // Gold seal — radius scales with HEIGHT so its foot never crosses the
  // tagline strip on the wide export.
  if (seal) drawSeal(ctx, seal.cx, seal.cy, seal.r);

  // Tagline strip.
  if (state.tagline) {
    ctx.save();
    ctx.fillStyle = 'rgba(8, 3, 12, 0.72)';
    ctx.fillRect(0, h * 0.865, w, h * 0.055);
    ctx.fillStyle = grade.accent;
    ctx.fillRect(0, h * 0.865, w, Math.max(2, h * 0.004));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const tSize = fitFont(ctx, state.tagline.toUpperCase(), w * 0.9, Math.max(13, Math.round(h * 0.026)), DISPLAY, '900');
    ctx.font = `900 ${tSize}px ${DISPLAY}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(state.tagline.toUpperCase(), w / 2, h * 0.8925);
    ctx.restore();
  }

  // Billing block, small centred type at the foot.
  if (extras.billing !== false) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = `${Math.max(9, Math.round(h * 0.0135))}px ${DISPLAY}`;
    ctx.fillText('VICE COVER STUDIO  •  A COVER BY YOU  •  STARRING YOUR CREW', w / 2, h * 0.945);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = `${Math.max(8, Math.round(h * 0.0115))}px ${DISPLAY}`;
    ctx.fillText('FILMED ON THE BOULEVARD  •  COLORED BY HAND  •  NO STUNT DRIVERS HARMED', w / 2, h * 0.968);
    ctx.restore();
  }

  // Barcode, bottom left.
  if (extras.barcode !== false) {
    drawBarcode(ctx, w * 0.025, h * 0.925, w * 0.11, h * 0.05);
  }
}

// Build a fresh canvas with the poster drawn on it (used for PNG export).
export function renderPosterCanvas(state, photos, w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  drawPoster(canvas.getContext('2d'), state, photos, w, h);
  return canvas;
}
