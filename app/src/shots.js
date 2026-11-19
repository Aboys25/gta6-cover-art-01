// Fixed scenes for screenshots: ?shot=editor shows the page with sample photos
// loaded; ?shot=cover shows the exported cover alone, at the size the query asks
// for (w/h). Query knobs: photo, layout, grade, caption, subtitle, titleStyle.
// window.__shotReady is set once the cover is painted.
import { EXPORT_SIZES } from './cover.js';

export async function runShot(shot, query, state, api) {
  const photo = query.get('photo') ?? 'pier';
  const other = photo === 'pier' ? 'boulevard' : 'pier';
  state.photos.push(await api.loadImage(`samples/${photo}.jpg`));
  state.photos.push(await api.loadImage(`samples/${other}.jpg`));
  state.layout = query.get('layout') ?? 'hero';
  state.grade = query.get('grade') ?? 'sunset';
  state.title = query.get('caption') ?? 'Sunset Heist';
  state.subtitle = query.get('subtitle') ?? 'Neon Nights · 2026';
  state.titleStyle = query.get('titleStyle') ?? 'outline';

  // Point the panels at the two samples in an alternating rhythm.
  const oy = Number(query.get('oy') ?? 0);
  state.panels.forEach((panel, i) => {
    panel.photo = i % 2 === 0 ? 0 : 1;
    panel.zoom = 1.15 + (i % 3) * 0.08;
    panel.ox = 0;
    panel.oy = oy;
  });

  const w = Number(query.get('w') ?? 1080);
  const h = Number(query.get('h') ?? 1080);
  const size = EXPORT_SIZES.find((s) => s.w === w && s.h === h) ?? { w, h };
  api.setExportSize(size);

  // Mirror the scene into the editor controls so the editor shot is honest.
  const titleInput = document.getElementById('title');
  const subtitleInput = document.getElementById('subtitle');
  if (titleInput) titleInput.value = state.title;
  if (subtitleInput) subtitleInput.value = state.subtitle;
  for (const [rowId, value] of [['layoutRow', state.layout], ['gradeRow', state.grade], ['titleStyleRow', state.titleStyle]]) {
    document.querySelectorAll(`#${rowId} .toggle`).forEach((t) => {
      t.classList.toggle('active', t.dataset.key === value);
    });
  }

  if (shot === 'cover') document.body.classList.add('shot-cover');
  try {
    await document.fonts.load('900 100px "Vice Bold"');
    await document.fonts.ready;
  } catch { /* system fallback fonts still draw */ }
  api.refreshPhotoUI();
  api.syncPanelControls();
  api.redraw();
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
