/**
 * render.js — draws a finished poster cover onto a canvas.
 *
 * Pipeline per panel: draw the photo cover-fit with its zoom/pan, grade the
 * panel's pixels with the chosen Vice City grade, then frame it. Over the
 * whole cover: grade band, vignette, grain, and the title block (big Anton
 * lettering with a script subtitle). One function renders both the live
 * preview and the exported PNG, so what you see is what you download.
 */
import { applyGradeToPixels, gradeById, paintGradeBand, paintGrain, paintVignette } from './grades.js';
import { layoutById, layoutPanelRects } from './layouts.js';

/** Export sizes: label, pixel size, short name for the file. */
export const EXPORT_SIZES = [
  { id: '1080x1080', w: 1080, h: 1080, label: 'Square post', file: 'square-1080x1080' },
  { id: '1080x1350', w: 1080, h: 1350, label: 'Portrait post', file: 'portrait-1080x1350' },
  { id: '1920x1080', w: 1920, h: 1080, label: 'Wide post', file: 'wide-1920x1080' },
];

export function exportSizeById(id) {
  return EXPORT_SIZES.find((s) => s.id === id) || EXPORT_SIZES[0];
}

/**
 * Draw one photo into a rectangle, cover-fit, with a per-panel transform.
 * transform: { scale >= 1, dx, dy } — dx/dy are fractions of the rect.
 */
export function drawPhotoCover(ctx, img, rect, transform) {
  const t = transform || { scale: 1, dx: 0, dy: 0 };
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const base = Math.max(rect.w / iw, rect.h / ih);
  const s = base * (t.scale || 1);
  const dw = iw * s;
  const dh = ih * s;
  const dx = rect.x + (rect.w - dw) / 2 + (t.dx || 0) * rect.w;
  const dy = rect.y + (rect.h - dh) / 2 + (t.dy || 0) * rect.h;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

/** Grade one panel in place on the cover canvas. */
function gradePanel(ctx, rect, grade) {
  const img = ctx.getImageData(rect.x, rect.y, rect.w, rect.h);
  applyGradeToPixels(img.data, grade);
  ctx.putImageData(img, rect.x, rect.y);
}

/** The poster frame: thin bright border + hairline inner line. */
function paintFrame(ctx, w, h) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.92)';
  ctx.lineWidth = Math.max(3, Math.round(w * 0.004));
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(ctx.lineWidth * 4, ctx.lineWidth * 4, w - ctx.lineWidth * 8, h - ctx.lineWidth * 8);
  ctx.restore();
}

/** Small location pill, top-left, in the poster's own voice. */
function paintTag(ctx, w, h) {
  const fs = Math.max(13, Math.round(w * 0.016));
  ctx.save();
  ctx.font = `${fs}px Anton, "Arial Narrow", sans-serif`;
  try { ctx.letterSpacing = `${Math.round(fs * 0.22)}px`; } catch (e) { /* older canvas */ }
  const label = 'VICE COAST';
  const padX = fs * 0.9;
  const tw = ctx.measureText(label).width;
  const bw = tw + padX * 2;
  const bh = fs * 2.1;
  const x = Math.round(w * 0.035);
  const y = Math.round(h * 0.035);
  ctx.fillStyle = 'rgba(8,4,18,0.82)';
  ctx.beginPath();
  ctx.roundRect(x, y, bw, bh, bh / 2);
  ctx.fill();
  ctx.fillStyle = '#ffd166';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + padX, y + bh / 2 + fs * 0.04);
  ctx.restore();
}

/** Title block: scrim, big lettering, script subtitle. */
function paintTitleBlock(ctx, w, h, state) {
  const title = (state.title || '').trim().toUpperCase();
  const subtitle = (state.subtitle || '').trim();
  const bandH = Math.round(h * 0.24);
  const y0 = h - bandH;

  // scrim so lettering reads on any photo
  const scrim = ctx.createLinearGradient(0, y0 - bandH * 0.45, 0, h);
  scrim.addColorStop(0, 'rgba(8,4,18,0)');
  scrim.addColorStop(0.5, 'rgba(8,4,18,0.55)');
  scrim.addColorStop(1, 'rgba(8,4,18,0.88)');
  ctx.save();
  ctx.fillStyle = scrim;
  ctx.fillRect(0, y0 - bandH * 0.45, w, h - (y0 - bandH * 0.45));
  ctx.restore();

  // sunset rule line above the title
  const ruleY = y0 + Math.round(bandH * 0.16);
  const rule = ctx.createLinearGradient(w * 0.05, 0, w * 0.95, 0);
  rule.addColorStop(0, '#ffd166');
  rule.addColorStop(0.5, '#ff7a3d');
  rule.addColorStop(1, '#ff2e88');
  ctx.save();
  ctx.fillStyle = rule;
  ctx.fillRect(Math.round(w * 0.05), ruleY, Math.round(w * 0.9), Math.max(3, Math.round(h * 0.004)));
  ctx.restore();

  if (!title) return;
  // Fit the title to the cover width, then lay the whole block out from the
  // bottom up so the script subtitle can never run off the canvas.
  let fs = Math.round(h * 0.105);
  let sfs = Math.max(16, Math.round(h * 0.042));
  const fitTitle = () => {
    ctx.save();
    ctx.font = `${fs}px Anton, "Arial Narrow", sans-serif`;
    try { ctx.letterSpacing = `${Math.round(fs * 0.02)}px`; } catch (e) { /* older canvas */ }
    const maxW = w * 0.9;
    while (fs > 24 && ctx.measureText(title).width > maxW) {
      fs = Math.round(fs * 0.94);
      ctx.font = `${fs}px Anton, "Arial Narrow", sans-serif`;
    }
    ctx.restore();
  };
  const baselines = () => {
    const ty = ruleY + Math.round(bandH * 0.12) + fs;
    const sy = subtitle ? ty + Math.round(sfs * 1.4) : ty;
    return { ty, sy };
  };
  fitTitle();
  let { ty, sy } = baselines();
  while (subtitle && sy + sfs * 0.25 > h - Math.round(h * 0.015) && fs > 20) {
    fs = Math.round(fs * 0.94);
    sfs = Math.max(12, Math.round(sfs * 0.94));
    fitTitle();
    ({ ty, sy } = baselines());
  }
  const tx = Math.round(w * 0.05);
  ctx.save();
  ctx.font = `${fs}px Anton, "Arial Narrow", sans-serif`;
  try { ctx.letterSpacing = `${Math.round(fs * 0.02)}px`; } catch (e) { /* older canvas */ }
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  if (state.captionStyle === 'neon') {
    ctx.shadowColor = '#ff2e88';
    ctx.shadowBlur = Math.round(fs * 0.35);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(title, tx, ty);
    ctx.shadowColor = '#22d3ee';
    ctx.shadowBlur = Math.round(fs * 0.18);
    ctx.fillText(title, tx, ty);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,46,136,0.9)';
    ctx.lineWidth = Math.max(2, Math.round(fs * 0.03));
    ctx.strokeText(title, tx, ty);
  } else if (state.captionStyle === 'classic') {
    ctx.strokeStyle = 'rgba(8,4,18,0.9)';
    ctx.lineWidth = Math.round(fs * 0.09);
    ctx.strokeText(title, tx, ty);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(title, tx, ty);
  } else {
    // sunset gradient fill with a hard dark outline
    const grad = ctx.createLinearGradient(tx, ty - fs, tx, ty + fs * 0.12);
    grad.addColorStop(0, '#ffe9a8');
    grad.addColorStop(0.45, '#ff7a3d');
    grad.addColorStop(1, '#ff2e88');
    ctx.strokeStyle = 'rgba(8,4,18,0.92)';
    ctx.lineWidth = Math.round(fs * 0.1);
    ctx.strokeText(title, tx, ty);
    ctx.fillStyle = grad;
    ctx.fillText(title, tx, ty);
  }
  ctx.restore();

  if (subtitle) {
    ctx.save();
    ctx.font = `${sfs}px Pacifico, cursive`;
    ctx.fillStyle = state.captionStyle === 'neon' ? '#a5f3fc' : '#ffd166';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(subtitle, Math.round(w * 0.052), sy);
    ctx.restore();
  }
}

/**
 * Render the whole cover onto `canvas` at W x H.
 * state.photos: HTMLImageElement[]; state.panels: [{photo, scale, dx, dy}].
 */
export function renderCover(canvas, state, w, h) {
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const grade = gradeById(state.grade);
  const layout = layoutById(state.layout);
  const rects = layoutPanelRects(layout, w, h);

  ctx.fillStyle = '#0d0a16';
  ctx.fillRect(0, 0, w, h);

  rects.forEach((rect, i) => {
    const panel = (state.panels && state.panels[i]) || { photo: 0, scale: 1.15, dx: 0, dy: 0 };
    const img = state.photos[panel.photo];
    if (img) {
      drawPhotoCover(ctx, img, rect, panel);
      gradePanel(ctx, rect, grade);
    } else {
      // empty panel: sunset placeholder so the poster still reads
      const g = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
      g.addColorStop(0, '#3b2370');
      g.addColorStop(1, '#ff2e88');
      ctx.fillStyle = g;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    }
    // gutter lines between panels
    ctx.strokeStyle = 'rgba(13,10,22,0.9)';
    ctx.lineWidth = Math.max(2, Math.round(Math.min(w, h) * 0.008));
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  });

  paintGradeBand(ctx, w, h, grade);
  paintVignette(ctx, w, h, grade.vignette);
  paintGrain(ctx, w, h, grade.grain);
  paintTag(ctx, w, h);
  paintTitleBlock(ctx, w, h, state);
  paintFrame(ctx, w, h);
  return canvas;
}

/** Render the cover at an export size into a fresh canvas. */
export function renderExport(state, sizeId) {
  const size = exportSizeById(sizeId);
  const canvas = document.createElement('canvas');
  renderCover(canvas, state, size.w, size.h);
  return { canvas, size };
}
