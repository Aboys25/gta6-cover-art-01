// Vice Cover Studio editor: wires the controls to the poster state, owns the
// undo/redo history, photo loading and PNG export. The drawing itself lives
// in render.js; the testable logic (layouts, history, seal) in logic.js.
import { GRADES, LAYOUTS, clampPanel, commitHistory, layoutById, newHistory, panelsFor, redoHistory, snapshotOf, undoHistory } from './logic.js';
import { drawPoster, renderPosterCanvas } from './render.js';
import { runShot } from './shots.js';

const $ = (id) => document.getElementById(id);
const canvas = $('poster');
const ctx = canvas.getContext('2d');

const SAMPLE_FILES = ['boulevard.jpg', 'pier.jpg'];
const DEFAULT_ROLES = ['THE WHEELMAN', 'THE LOOKOUT', 'THE FIXER', 'THE BRAINS', 'THE MUSCLE', 'THE INSIDER', 'THE ROOKIE'];

function defaultState() {
  return {
    layout: 'hero-mosaic',
    grade: 'sunset',
    titleStyle: 'auto',
    title: 'SUNSET SCOUNDRELS',
    script: 'A crew of dreamers steals the whole coastline before dawn.',
    tagline: 'Every getaway needs a golden hour',
    quote: '"A joyride you can frame." — THE COAST GAZETTE',
    look: { paint: 0.5, gradeAmt: 0.6, halftone: 0.3, grain: 0.25, glow: 0.5, titleSize: 0.5, titleLift: 0.5 },
    extras: { stars: true, seal: true, billing: true, comingSoon: true, vol1: true, barcode: true },
    panels: [],
  };
}

function defaultSlot(i) {
  return { photo: null, zoom: 1, flip: false, face: false, name: '', role: DEFAULT_ROLES[i % DEFAULT_ROLES.length] };
}

let state = defaultState();
let photos = [];
let selectedPanel = 0;
let history = null;

function ensurePanelSlots() {
  const count = layoutById(state.layout).panels;
  while (state.panels.length < count) state.panels.push(defaultSlot(state.panels.length));
  if (state.panels.length > count) state.panels.length = count;
  selectedPanel = clampPanel(selectedPanel, state.panels.length);
}

function render() {
  drawPoster(ctx, state, photos, canvas.width, canvas.height);
}

// A change is recorded AFTER it happens; the history was seeded at boot with
// the initial state, so the first undo already steps back one change.
function commit() {
  commitHistory(history, state);
  syncControls();
  render();
}

function restore(json) {
  state = JSON.parse(json);
  // A restore can land on a smaller layout: never leave the selection
  // pointing past the last panel, or the panel handlers would crash.
  selectedPanel = clampPanel(selectedPanel, state.panels.length);
  syncControls();
  render();
}

function undo() {
  const snap = undoHistory(history);
  if (snap !== null) restore(snap);
}

function redo() {
  const snap = redoHistory(history);
  if (snap !== null) restore(snap);
}

function currentPanel() {
  return state.panels[selectedPanel] || null;
}

// --- Controls -------------------------------------------------------------

function buildLayoutButtons() {
  const box = $('layout-picks');
  box.innerHTML = '';
  for (const entry of LAYOUTS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pick' + (state.layout === entry.id ? ' active' : '');
    btn.textContent = entry.name;
    btn.addEventListener('click', () => {
      state.layout = entry.id;
      ensurePanelSlots();
      commit();
    });
    box.appendChild(btn);
  }
}

function buildGradeButtons() {
  const box = $('grade-picks');
  box.innerHTML = '';
  for (const [id, grade] of Object.entries(GRADES)) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pick swatch' + (state.grade === id ? ' active' : '');
    btn.style.setProperty('--sw', grade.sky[2]);
    btn.textContent = grade.name;
    btn.addEventListener('click', () => {
      state.grade = id;
      commit();
    });
    box.appendChild(btn);
  }
}

function buildPanelButtons() {
  const box = $('panel-chips');
  box.innerHTML = '';
  state.panels.forEach((slot, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip' + (i === selectedPanel ? ' active' : '');
    btn.textContent = String(i + 1);
    btn.title = slot.role || `Panel ${i + 1}`;
    btn.addEventListener('click', () => {
      selectedPanel = i;
      syncControls();
      render();
    });
    box.appendChild(btn);
  });
}

function syncPanelControls() {
  const panel = currentPanel();
  const label = $('panel-label');
  label.textContent = panel ? `Panel ${selectedPanel + 1} of ${state.panels.length}` : 'No panel';
  if (!panel) return;
  $('panel-zoom').value = String(panel.zoom);
  $('panel-name').value = panel.name || '';
  $('panel-role').value = panel.role || '';
  $('panel-face').classList.toggle('active', !!panel.face);
  $('panel-flip').classList.toggle('active', !!panel.flip);
}

function syncControls() {
  buildLayoutButtons();
  buildGradeButtons();
  buildPanelButtons();
  syncPanelControls();
  $('title-input').value = state.title;
  $('script-input').value = state.script;
  $('tagline-input').value = state.tagline;
  $('quote-input').value = state.quote;
  $('title-style').value = state.titleStyle;
  for (const key of ['paint', 'gradeAmt', 'halftone', 'grain', 'glow', 'titleSize', 'titleLift']) {
    const el = $(`look-${key.toLowerCase()}`);
    if (el) el.value = String(state.look[key]);
  }
  for (const [key, id] of [['stars', 'extra-stars'], ['seal', 'extra-seal'], ['billing', 'extra-billing'], ['comingSoon', 'extra-coming'], ['vol1', 'extra-vol1'], ['barcode', 'extra-barcode']]) {
    $(id).checked = !!state.extras[key];
  }
  $('undo-btn').disabled = !history || history.undo.length <= 1;
  $('redo-btn').disabled = !history || history.redo.length === 0;
  const count = document.querySelectorAll('#thumbs img').length;
  $('photo-count').textContent = `${photos.length} photo${photos.length === 1 ? '' : 's'} · ${count} shown`;
}

// --- Photos ---------------------------------------------------------------

// Loads an image from a URL and resolves once it can be drawn. One src
// assignment: loadImage already sets it and waits for onload.
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function rebuildThumbs() {
  const box = $('thumbs');
  box.innerHTML = '';
  photos.forEach((photo, i) => {
    const thumb = document.createElement('img');
    thumb.src = photo.src;
    thumb.alt = photo.name;
    thumb.title = photo.name;
    thumb.addEventListener('click', () => {
      const panel = currentPanel();
      if (!panel) return;
      panel.photo = i;
      commit();
    });
    box.appendChild(thumb);
  });
}

async function addPhotoFile(file) {
  const url = URL.createObjectURL(file);
  const img = await loadImage(url);
  photos.push({ src: url, img, name: file.name });
  // Fill the first empty panel slot, else the selected one.
  const empty = state.panels.findIndex((slot) => slot.photo == null);
  const target = empty === -1 ? selectedPanel : empty;
  if (state.panels[target]) state.panels[target].photo = photos.length - 1;
  rebuildThumbs();
  commit();
}

async function loadSamples() {
  for (const file of SAMPLE_FILES) {
    if (photos.some((photo) => photo.name === file)) continue;
    const img = await loadImage(`samples/${file}`);
    photos.push({ src: `samples/${file}`, img, name: file });
  }
  state.panels.forEach((slot, i) => {
    if (slot.photo == null) slot.photo = i % photos.length;
  });
  rebuildThumbs();
  commit();
}

function autoLayout() {
  const n = photos.length;
  if (n <= 1) state.layout = 'hero-mosaic';
  else if (n === 2) state.layout = 'hero-three';
  else if (n === 3) state.layout = 'diagonal-trio';
  else if (n <= 4) state.layout = 'hero-mosaic';
  else if (n <= 6) state.layout = 'six-grid';
  else state.layout = 'seven-mosaic';
  ensurePanelSlots();
  commit();
}

function surprise() {
  const layouts = LAYOUTS.map((entry) => entry.id);
  const grades = Object.keys(GRADES);
  state.layout = layouts[Math.floor(Math.random() * layouts.length)];
  state.grade = grades[Math.floor(Math.random() * grades.length)];
  ensurePanelSlots();
  commit();
}

// --- Export ---------------------------------------------------------------

function exportPng(w, h, filename) {
  const out = renderPosterCanvas(state, photos, w, h);
  out.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    $('status').textContent = `Saved ${filename}`;
  }, 'image/png');
}

// --- Wiring ---------------------------------------------------------------

function bindText(id, get, set) {
  const el = $(id);
  el.addEventListener('input', () => { set(el.value); render(); });
  el.addEventListener('change', () => { set(el.value); commit(); });
}

function bindSlider(id, key) {
  const el = $(id);
  el.addEventListener('input', () => { state.look[key] = Number(el.value); render(); });
  el.addEventListener('change', () => { state.look[key] = Number(el.value); commit(); });
}

function bindExtra(id, key) {
  $(id).addEventListener('change', (e) => {
    state.extras[key] = e.target.checked;
    commit();
  });
}

function init() {
  ensurePanelSlots();
  history = newHistory(state);

  $('undo-btn').addEventListener('click', undo);
  $('redo-btn').addEventListener('click', redo);
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
    if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
  });

  $('photo-input').addEventListener('change', async (e) => {
    for (const file of e.target.files) await addPhotoFile(file);
    e.target.value = '';
  });
  $('load-samples').addEventListener('click', loadSamples);
  $('auto-layout').addEventListener('click', autoLayout);
  $('surprise').addEventListener('click', surprise);

  const dropZone = $('drop-zone');
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('over'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('over'));
  dropZone.addEventListener('drop', async (e) => {
    e.preventDefault();
    dropZone.classList.remove('over');
    for (const file of e.dataTransfer.files) {
      if (file.type.startsWith('image/')) await addPhotoFile(file);
    }
  });
  document.addEventListener('paste', async (e) => {
    if (!e.clipboardData) return;
    for (const item of e.clipboardData.items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) await addPhotoFile(file);
      }
    }
  });

  bindText('title-input', () => state.title, (v) => { state.title = v; });
  bindText('script-input', () => state.script, (v) => { state.script = v; });
  bindText('tagline-input', () => state.tagline, (v) => { state.tagline = v; });
  bindText('quote-input', () => state.quote, (v) => { state.quote = v; });
  $('title-style').addEventListener('change', (e) => {
    state.titleStyle = e.target.value;
    commit();
  });

  $('panel-zoom').addEventListener('input', (e) => {
    const panel = currentPanel();
    if (!panel) return;
    panel.zoom = Number(e.target.value);
    render();
  });
  $('panel-zoom').addEventListener('change', () => commit());
  $('panel-name').addEventListener('input', (e) => {
    const panel = currentPanel();
    if (!panel) return;
    panel.name = e.target.value;
    render();
  });
  $('panel-name').addEventListener('change', () => commit());
  $('panel-role').addEventListener('input', (e) => {
    const panel = currentPanel();
    if (!panel) return;
    panel.role = e.target.value;
    render();
  });
  $('panel-role').addEventListener('change', () => commit());
  $('panel-prev').addEventListener('click', () => {
    const panel = currentPanel();
    if (!panel || photos.length === 0) return;
    panel.photo = panel.photo == null ? photos.length - 1 : (panel.photo - 1 + photos.length) % photos.length;
    commit();
  });
  $('panel-next').addEventListener('click', () => {
    const panel = currentPanel();
    if (!panel || photos.length === 0) return;
    panel.photo = panel.photo == null ? 0 : (panel.photo + 1) % photos.length;
    commit();
  });
  $('panel-reset').addEventListener('click', () => {
    const panel = currentPanel();
    if (!panel) return;
    panel.zoom = 1;
    panel.flip = false;
    panel.face = false;
    commit();
  });
  $('panel-flip').addEventListener('click', () => {
    const panel = currentPanel();
    if (!panel) return;
    panel.flip = !panel.flip;
    commit();
  });
  $('panel-face').addEventListener('click', () => {
    const panel = currentPanel();
    if (!panel) return;
    panel.face = !panel.face;
    commit();
  });
  $('panel-swap').addEventListener('click', () => {
    if (state.panels.length < 2) return;
    const next = (selectedPanel + 1) % state.panels.length;
    const a = state.panels[selectedPanel];
    const b = state.panels[next];
    const tmp = { photo: a.photo, zoom: a.zoom, flip: a.flip, face: a.face };
    a.photo = b.photo; a.zoom = b.zoom; a.flip = b.flip; a.face = b.face;
    b.photo = tmp.photo; b.zoom = tmp.zoom; b.flip = tmp.flip; b.face = tmp.face;
    commit();
  });

  bindSlider('look-paint', 'paint');
  bindSlider('look-gradeamt', 'gradeAmt');
  bindSlider('look-halftone', 'halftone');
  bindSlider('look-grain', 'grain');
  bindSlider('look-glow', 'glow');
  bindSlider('look-titlesize', 'titleSize');
  bindSlider('look-titlelift', 'titleLift');

  bindExtra('extra-stars', 'stars');
  bindExtra('extra-seal', 'seal');
  bindExtra('extra-billing', 'billing');
  bindExtra('extra-coming', 'comingSoon');
  bindExtra('extra-vol1', 'vol1');
  bindExtra('extra-barcode', 'barcode');

  $('export-square').addEventListener('click', () => exportPng(1080, 1080, 'vice-cover-1080x1080.png'));
  $('export-portrait').addEventListener('click', () => exportPng(1080, 1350, 'vice-cover-1080x1350.png'));
  $('export-wide').addEventListener('click', () => exportPng(1920, 1080, 'vice-cover-1920x1080.png'));

  canvas.addEventListener('pointerdown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    const rects = panelsFor(state.layout, canvas.width, canvas.height);
    const hit = rects.findIndex((p) => x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h);
    if (hit !== -1) {
      selectedPanel = hit;
      syncControls();
      render();
    }
  });

  const shot = new URLSearchParams(location.search).get('shot');
  if (shot) {
    runShot(shot, new URLSearchParams(location.search), {
      canvas,
      loadSamples,
      setLayout: (id) => { state.layout = id; ensurePanelSlots(); },
      setGrade: (id) => { state.grade = id; },
      setTitle: (text) => { state.title = text; },
      syncAndRender: () => { history = newHistory(state); syncControls(); render(); },
      ready: () => { window.__shotReady = true; },
    });
  } else {
    syncControls();
    render();
  }
}

init();
