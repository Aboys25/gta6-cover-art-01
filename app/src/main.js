// Vice Cover Studio — wires the page: photos in, layout / grade / caption controls,
// a live preview canvas you can drag to pan each panel, and one-click PNG export
// in the three common post sizes. A `?shot=` query sets up a fixed scene for a
// screenshot instead (./shots.js).
import { renderCover, defaultState, panelCount, panelPolygons, LAYOUTS, GRADES, TITLE_STYLES, EXPORT_SIZES } from './cover.js';
import { runShot } from './shots.js';

const state = defaultState();
const preview = document.getElementById('preview');
const status = document.getElementById('status');
const panelPhoto = document.getElementById('panelPhoto');
const zoom = document.getElementById('zoom');
const offsetX = document.getElementById('offsetX');
const offsetY = document.getElementById('offsetY');
let exportSize = EXPORT_SIZES[0];
let fontReady = false;

/** Loads an image from a URL, resolving to the image once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function redraw() {
  renderCover(preview, state);
}

function note(text) {
  status.textContent = text;
}

/** Refreshes the photo strip, the panel picker and the per-panel sliders. */
function refreshPhotoUI() {
  const strip = document.getElementById('photoStrip');
  strip.innerHTML = '';
  state.photos.forEach((img, i) => {
    const thumb = document.createElement('button');
    thumb.type = 'button';
    thumb.className = 'thumb';
    thumb.title = `Photo ${i + 1} — click to put it in the selected panel`;
    const t = document.createElement('img');
    t.src = img.src;
    t.alt = `Photo ${i + 1}`;
    thumb.appendChild(t);
    thumb.addEventListener('click', () => {
      state.panels[state.selectedPanel].photo = i;
      syncPanelControls();
      redraw();
    });
    strip.appendChild(thumb);
  });
  panelPhoto.innerHTML = '';
  state.photos.forEach((img, i) => {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = `Photo ${i + 1}`;
    panelPhoto.appendChild(opt);
  });
  syncPanelControls();
}

function syncPanelControls() {
  const panel = state.panels[state.selectedPanel];
  if (!panel) return;
  panelPhoto.value = String(panel.photo ?? 0);
  zoom.value = String(panel.zoom ?? 1);
  offsetX.value = String(panel.ox ?? 0);
  offsetY.value = String(panel.oy ?? 0);
  document.getElementById('zoomVal').textContent = `${Math.round((panel.zoom ?? 1) * 100)}%`;
  document.getElementById('panelLabel').textContent = `Panel ${state.selectedPanel + 1} of ${panelCount(state.layout)}`;
}

/** Builds a row of toggle buttons from a {key: label} map. */
function buildToggles(containerId, options, current, onPick) {
  const box = document.getElementById(containerId);
  box.innerHTML = '';
  for (const [key, label] of Object.entries(options)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.key = key;
    b.className = 'toggle' + (key === current ? ' active' : '');
    b.textContent = label;
    b.addEventListener('click', () => {
      onPick(key);
      box.querySelectorAll('.toggle').forEach((t) => t.classList.remove('active'));
      b.classList.add('active');
    });
    box.appendChild(b);
  }
}

function buildLayoutToggles() {
  buildToggles('layoutRow', LAYOUTS, state.layout, (key) => {
    state.layout = key;
    state.selectedPanel = 0;
    while (state.panels.length < panelCount(key)) {
      state.panels.push({ photo: state.photos.length - 1, zoom: 1.15, ox: 0, oy: 0 });
    }
    syncPanelControls();
    redraw();
  });
}

function buildGradeToggles() {
  buildToggles('gradeRow', GRADES, state.grade, (key) => {
    state.grade = key;
    redraw();
  });
}

function buildTitleStyleToggles() {
  buildToggles('titleStyleRow', TITLE_STYLES, state.titleStyle, (key) => {
    state.titleStyle = key;
    redraw();
  });
}

function buildSizeToggles() {
  const box = document.getElementById('sizeRow');
  box.innerHTML = '';
  EXPORT_SIZES.forEach((size) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'toggle' + (size === exportSize ? ' active' : '');
    b.textContent = `${size.w} x ${size.h}`;
    b.addEventListener('click', () => {
      exportSize = size;
      preview.width = size.w;
      preview.height = size.h;
      box.querySelectorAll('.toggle').forEach((t) => t.classList.remove('active'));
      b.classList.add('active');
      redraw();
    });
    box.appendChild(b);
  });
}

/** Renders the cover at full export size and downloads it as a PNG. */
export function exportCover() {
  const off = document.createElement('canvas');
  off.width = exportSize.w;
  off.height = exportSize.h;
  renderCover(off, state);
  off.toBlob((blob) => {
    if (!blob) { note('Export failed — try again.'); return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-cover-${exportSize.w}x${exportSize.h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    note(`Saved vice-cover-${exportSize.w}x${exportSize.h}.png`);
  }, 'image/png');
}

async function addFiles(files) {
  let added = 0;
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    if (state.photos.length >= 6) { note('Six photos is the limit.'); break; }
    const img = await loadImage(URL.createObjectURL(file));
    state.photos.push(img);
    added++;
  }
  if (added) {
    refreshPhotoUI();
    redraw();
    note(`${added} photo${added > 1 ? 's' : ''} added — click a thumbnail to place it.`);
  }
}

// --- Wiring ---------------------------------------------------------------

document.getElementById('photoInput').addEventListener('change', (e) => {
  addFiles([...e.target.files]);
  e.target.value = '';
});
document.getElementById('addSample').addEventListener('click', async () => {
  if (state.photos.length >= 6) return;
  const which = state.photos.length % 2 === 0 ? 'boulevard' : 'pier';
  state.photos.push(await loadImage(`samples/${which}.jpg`));
  refreshPhotoUI();
  redraw();
});
document.getElementById('fillAll').addEventListener('click', () => {
  const photo = state.panels[state.selectedPanel].photo;
  state.panels.forEach((p) => { p.photo = photo; });
  redraw();
  note('Every panel now uses the selected photo.');
});
document.getElementById('title').addEventListener('input', (e) => { state.title = e.target.value; redraw(); });
document.getElementById('subtitle').addEventListener('input', (e) => { state.subtitle = e.target.value; redraw(); });
document.getElementById('titlePreset').addEventListener('change', (e) => {
  const [title, subtitle] = e.target.value.split('|');
  state.title = title;
  state.subtitle = subtitle;
  document.getElementById('title').value = title;
  document.getElementById('subtitle').value = subtitle;
  redraw();
});
panelPhoto.addEventListener('change', () => {
  state.panels[state.selectedPanel].photo = Number(panelPhoto.value);
  redraw();
});
zoom.addEventListener('input', () => {
  state.panels[state.selectedPanel].zoom = Number(zoom.value);
  document.getElementById('zoomVal').textContent = `${Math.round(Number(zoom.value) * 100)}%`;
  redraw();
});
offsetX.addEventListener('input', () => { state.panels[state.selectedPanel].ox = Number(offsetX.value); redraw(); });
offsetY.addEventListener('input', () => { state.panels[state.selectedPanel].oy = Number(offsetY.value); redraw(); });
document.getElementById('prevPanel').addEventListener('click', () => {
  state.selectedPanel = (state.selectedPanel - 1 + panelCount(state.layout)) % panelCount(state.layout);
  syncPanelControls();
  redraw();
});
document.getElementById('nextPanel').addEventListener('click', () => {
  state.selectedPanel = (state.selectedPanel + 1) % panelCount(state.layout);
  syncPanelControls();
  redraw();
});
document.getElementById('export').addEventListener('click', exportCover);

// Drag the preview to pan the selected panel's photo; click a panel to select it.
let dragging = null;
function canvasPoint(clientX, clientY) {
  const rect = preview.getBoundingClientRect();
  return {
    x: (clientX - rect.left) * (preview.width / rect.width),
    y: (clientY - rect.top) * (preview.height / rect.height),
  };
}
function hitTestPanel(x, y) {
  const polys = panelPolygons(state.layout, preview.width, preview.height);
  let hit = -1;
  polys.forEach((poly, i) => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [px, py] of poly) {
      minX = Math.min(minX, px); minY = Math.min(minY, py);
      maxX = Math.max(maxX, px); maxY = Math.max(maxY, py);
    }
    if (x >= minX && x <= maxX && y >= minY && y <= maxY) hit = i;
  });
  return hit;
}
preview.addEventListener('pointerdown', (e) => {
  preview.setPointerCapture(e.pointerId);
  const { x, y } = canvasPoint(e.clientX, e.clientY);
  const hit = hitTestPanel(x, y);
  if (hit >= 0) {
    state.selectedPanel = hit;
    syncPanelControls();
  }
  dragging = { x, y, ox: state.panels[state.selectedPanel].ox, oy: state.panels[state.selectedPanel].oy };
  redraw();
});
preview.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const { x, y } = canvasPoint(e.clientX, e.clientY);
  const panel = state.panels[state.selectedPanel];
  panel.ox = Math.max(-1, Math.min(1, dragging.ox + (x - dragging.x) / (preview.width * 0.4)));
  panel.oy = Math.max(-1, Math.min(1, dragging.oy + (y - dragging.y) / (preview.height * 0.4)));
  syncPanelControls();
  redraw();
});
preview.addEventListener('pointerup', () => { dragging = null; });

// Drag-and-drop photos anywhere on the page.
window.addEventListener('dragover', (e) => { e.preventDefault(); document.body.classList.add('dropping'); });
window.addEventListener('dragleave', (e) => { if (e.target === document.body) document.body.classList.remove('dropping'); });
window.addEventListener('drop', (e) => {
  e.preventDefault();
  document.body.classList.remove('dropping');
  addFiles([...e.dataTransfer.files]);
});

// --- Boot -----------------------------------------------------------------

async function boot() {
  buildLayoutToggles();
  buildGradeToggles();
  buildTitleStyleToggles();
  buildSizeToggles();
  preview.width = exportSize.w;
  preview.height = exportSize.h;
  const query = new URLSearchParams(location.search);
  const shot = query.get('shot');
  if (shot) {
    await runShot(shot, query, state, { loadImage, redraw, refreshPhotoUI, syncPanelControls, setExportSize });
    return;
  }
  // Default scene: both sample photos, so the first cover is already there.
  state.photos.push(await loadImage('samples/pier.jpg'));
  state.photos.push(await loadImage('samples/boulevard.jpg'));
  try {
    await document.fonts.load('900 100px "Vice Bold"');
    fontReady = true;
  } catch { /* system fallback fonts still draw */ }
  refreshPhotoUI();
  redraw();
  note('Drop a photo, or use the samples — then export your cover.');
}

function setExportSize(size) {
  exportSize = size;
  preview.width = size.w;
  preview.height = size.h;
  document.querySelectorAll('#sizeRow .toggle').forEach((t, i) => {
    t.classList.toggle('active', EXPORT_SIZES[i] === size);
  });
}

void boot();
export { state, fontReady };
