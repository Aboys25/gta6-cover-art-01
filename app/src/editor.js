/**
 * editor.js — wires the Vice Cover Studio UI to the cover state.
 *
 * Upload (picker + drag-drop), click-to-assign photos, panel selection,
 * drag-to-pan / wheel-to-zoom on the preview, layout + grade + caption
 * controls, undo/redo, and the export preview modal. Also the ?shot=
 * scenes the maker uses for screenshots, and a ?selftest=1 check that
 * renders every export size and reports its pixel dimensions.
 */
import { GRADES, gradeById } from './grades.js';
import { LAYOUTS, TITLE_PRESETS, layoutById } from './layouts.js';
import { exportSizeById, renderCover, renderExport } from './render.js';
import { createDefaultState, createHistory, defaultPanel, syncPanels } from './state.js';

const SAMPLE_PHOTOS = ['samples/boulevard.jpg', 'samples/pier.jpg'];
const $ = (id) => document.getElementById(id);

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${src}`));
    img.src = src;
  });
}

export function createEditor() {
  const state = createDefaultState();
  const history = createHistory(state);
  const preview = $('preview');
  const statusLine = $('statusLine');

  syncPanels(state);

  // ---------- rendering ----------
  function previewSize() {
    const s = exportSizeById(state.exportSize);
    // preview at a comfortable working resolution, same aspect as the export
    const scale = s.w >= s.h ? 900 / s.w : 900 / s.h;
    return { w: Math.round(s.w * scale), h: Math.round(s.h * scale) };
  }

  function render() {
    const { w, h } = previewSize();
    renderCover(preview, state, w, h);
    syncPanelTray();
    syncControls();
  }

  function setStatus(msg) {
    statusLine.textContent = msg;
  }

  function commit(label) {
    history.push();
    render();
    refreshUndoButtons();
    if (label) setStatus(label);
  }

  function refreshUndoButtons() {
    $('undoBtn').disabled = !history.canUndo();
    $('redoBtn').disabled = !history.canRedo();
  }

  // ---------- photos ----------
  async function addPhotoFiles(files) {
    const images = [...files].filter((f) => f.type.startsWith('image/'));
    if (!images.length) { setStatus('That was not an image file.'); return; }
    for (const file of images) {
      try {
        const url = URL.createObjectURL(file);
        const img = await loadImage(url);
        state.photos.push(img);
        state.selectedPhoto = state.photos.length - 1;
      } catch (e) {
        setStatus(`Could not read ${file.name}.`);
      }
    }
    // a new photo lands in the selected panel; empty panels take it too
    state.panels.forEach((p) => { if (state.photos[p.photo] === undefined) p.photo = state.selectedPhoto; });
    buildThumbs();
    commit(`${images.length} photo${images.length > 1 ? 's' : ''} added — drag it inside a panel to frame it.`);
  }

  async function loadSamples() {
    if (state.photos.length) return;
    for (const src of SAMPLE_PHOTOS) {
      try {
        state.photos.push(await loadImage(src));
      } catch (e) { /* sample missing: editor still works with uploads */ }
    }
    state.panels.forEach((p, i) => { p.photo = i % Math.max(1, state.photos.length); });
    buildThumbs();
    render();
    if (state.photos.length) setStatus('Sample photos loaded — pick a layout, a grade, then export.');
  }

  function buildThumbs() {
    const box = $('thumbs');
    box.innerHTML = '';
    state.photos.forEach((img, i) => {
      const t = el('img', 'thumb' + (i === state.selectedPhoto ? ' selected' : ''));
      t.src = img.src;
      t.alt = `Photo ${i + 1}`;
      t.title = `Use photo ${i + 1} in the selected panel`;
      t.addEventListener('click', () => {
        history.push();
        state.selectedPhoto = i;
        state.panels[state.selectedPanel].photo = i;
        buildThumbs();
        render();
        refreshUndoButtons();
        setStatus(`Photo ${i + 1} placed in panel ${state.selectedPanel + 1}.`);
      });
      box.appendChild(t);
    });
  }

  // ---------- panel tray ----------
  function syncPanelTray() {
    const tray = $('panelTray');
    const layout = layoutById(state.layout);
    tray.innerHTML = '';
    layout.panels.forEach((_, i) => {
      const b = el('button', 'panel-chip', `Panel ${i + 1} · photo ${(state.panels[i]?.photo ?? 0) + 1}`);
      b.type = 'button';
      b.setAttribute('aria-pressed', String(i === state.selectedPanel));
      b.addEventListener('click', () => {
        state.selectedPanel = i;
        render();
        setStatus(`Panel ${i + 1} selected — drag its photo, or use the sliders.`);
      });
      tray.appendChild(b);
    });
  }

  // ---------- controls ----------
  function buildLayoutPicker() {
    const grid = $('layoutGrid');
    LAYOUTS.forEach((layout) => {
      const b = el('button', 'layout-btn');
      b.type = 'button';
      b.dataset.layout = layout.id;
      b.setAttribute('aria-pressed', String(layout.id === state.layout));
      b.title = layout.hint;
      const d = el('span', 'diagram');
      layout.panels.forEach((p) => {
        const i = el('i');
        i.style.left = `${p.x * 100}%`;
        i.style.top = `${p.y * 100}%`;
        i.style.width = `${p.w * 100}%`;
        i.style.height = `${p.h * 100}%`;
        d.appendChild(i);
      });
      b.appendChild(d);
      b.appendChild(document.createTextNode(layout.name));
      b.addEventListener('click', () => {
        history.push();
        state.layout = layout.id;
        syncPanels(state);
        render();
        refreshUndoButtons();
        setStatus(`${layout.name} — ${layout.hint}.`);
      });
      grid.appendChild(b);
    });
  }

  function buildGradePicker() {
    const grid = $('gradeGrid');
    GRADES.forEach((grade) => {
      const b = el('button', 'grade-btn');
      b.type = 'button';
      b.dataset.grade = grade.id;
      b.setAttribute('aria-pressed', String(grade.id === state.grade));
      const s = el('span', `swatch ${grade.css}`);
      b.appendChild(s);
      b.appendChild(document.createTextNode(grade.name));
      b.addEventListener('click', () => {
        history.push();
        state.grade = grade.id;
        render();
        refreshUndoButtons();
        setStatus(`${grade.name} grade applied.`);
      });
      grid.appendChild(b);
    });
  }

  function buildCaptionPresets() {
    const box = $('titlePresets');
    TITLE_PRESETS.forEach((p) => {
      const c = el('button', 'chip', p.title);
      c.type = 'button';
      c.addEventListener('click', () => {
        history.push();
        state.title = p.title;
        state.subtitle = p.subtitle;
        render();
        refreshUndoButtons();
        setStatus(`Caption set: ${p.title}.`);
      });
      box.appendChild(c);
    });
  }

  function syncControls() {
    document.querySelectorAll('#layoutGrid .layout-btn').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.layout === state.layout));
    });
    document.querySelectorAll('#gradeGrid .grade-btn').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.grade === state.grade));
    });
    document.querySelectorAll('#captionStyleRow .btn').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.captionStyle === state.captionStyle));
    });
    document.querySelectorAll('#sizeGrid .size-btn').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.size === state.exportSize));
    });
    const titleInput = $('titleInput');
    if (document.activeElement !== titleInput) titleInput.value = state.title;
    const subtitleInput = $('subtitleInput');
    if (document.activeElement !== subtitleInput) subtitleInput.value = state.subtitle;
    const panel = state.panels[state.selectedPanel] || defaultPanel(0);
    $('zoomSlider').value = String(panel.scale);
    $('zoomOut').textContent = `${Number(panel.scale).toFixed(2)}×`;
    $('panXSlider').value = String(panel.dx);
    $('panXOut').textContent = Number(panel.dx).toFixed(2);
    $('panYSlider').value = String(panel.dy);
    $('panYOut').textContent = Number(panel.dy).toFixed(2);
  }

  // ---------- preview interaction: drag to pan, wheel to zoom ----------
  function panelAt(clientX, clientY) {
    const r = preview.getBoundingClientRect();
    const px = ((clientX - r.left) / r.width) * preview.width;
    const py = ((clientY - r.top) / r.height) * preview.height;
    const layout = layoutById(state.layout);
    // reuse the same rect math as the renderer
    const gutter = Math.max(2, Math.round(Math.min(preview.width, preview.height) * 0.008));
    for (let i = 0; i < layout.panels.length; i++) {
      const p = layout.panels[i];
      const x = Math.round(p.x * preview.width) + (p.x > 0 ? gutter / 2 : 0);
      const y = Math.round(p.y * preview.height) + (p.y > 0 ? gutter / 2 : 0);
      const w = Math.round(p.w * preview.width) - (p.x > 0 ? gutter / 2 : 0) - (p.x + p.w < 1 ? gutter / 2 : 0);
      const h = Math.round(p.h * preview.height) - (p.y > 0 ? gutter / 2 : 0) - (p.y + p.h < 1 ? gutter / 2 : 0);
      if (px >= x && px <= x + w && py >= y && py <= y + h) return { index: i, rect: { x, y, w, h } };
    }
    return null;
  }

  let drag = null;
  preview.addEventListener('pointerdown', (e) => {
    const hit = panelAt(e.clientX, e.clientY);
    if (!hit) return;
    history.push();
    state.selectedPanel = hit.index;
    drag = { x: e.clientX, y: e.clientY, panel: { ...state.panels[hit.index] }, rect: hit.rect };
    preview.setPointerCapture(e.pointerId);
    render();
    refreshUndoButtons();
  });
  preview.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const panel = state.panels[state.selectedPanel];
    panel.dx = drag.panel.dx + (e.clientX - drag.x) / drag.rect.w;
    panel.dy = drag.panel.dy + (e.clientY - drag.y) / drag.rect.h;
    panel.dx = Math.max(-0.9, Math.min(0.9, panel.dx));
    panel.dy = Math.max(-0.9, Math.min(0.9, panel.dy));
    render();
  });
  preview.addEventListener('pointerup', () => { drag = null; });
  preview.addEventListener('wheel', (e) => {
    const hit = panelAt(e.clientX, e.clientY);
    if (!hit) return;
    e.preventDefault();
    history.push();
    state.selectedPanel = hit.index;
    const panel = state.panels[hit.index];
    panel.scale = Math.max(1, Math.min(3, panel.scale * (e.deltaY < 0 ? 1.08 : 0.93)));
    render();
    refreshUndoButtons();
  }, { passive: false });

  // ---------- static control wiring ----------
  $('addPhotosBtn').addEventListener('click', () => $('fileInput').click());
  $('dropzone').addEventListener('click', () => $('fileInput').click());
  $('dropzone').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('fileInput').click(); }
  });
  $('fileInput').addEventListener('change', (e) => {
    addPhotoFiles(e.target.files);
    e.target.value = '';
  });
  ['dragover', 'dragenter'].forEach((ev) => $('dropzone').addEventListener(ev, (e) => {
    e.preventDefault();
    $('dropzone').classList.add('over');
  }));
  ['dragleave', 'drop'].forEach((ev) => $('dropzone').addEventListener(ev, (e) => {
    e.preventDefault();
    $('dropzone').classList.remove('over');
  }));
  $('dropzone').addEventListener('drop', (e) => addPhotoFiles(e.dataTransfer.files));
  $('loadSamplesBtn').addEventListener('click', loadSamples);

  $('titleInput').addEventListener('input', (e) => { state.title = e.target.value; render(); });
  $('titleInput').addEventListener('change', () => { history.push(); refreshUndoButtons(); });
  $('subtitleInput').addEventListener('input', (e) => { state.subtitle = e.target.value; render(); });
  $('subtitleInput').addEventListener('change', () => { history.push(); refreshUndoButtons(); });
  document.querySelectorAll('#captionStyleRow .btn').forEach((b) => {
    b.addEventListener('click', () => {
      history.push();
      state.captionStyle = b.dataset.captionStyle;
      render();
      refreshUndoButtons();
      setStatus(`Lettering: ${b.textContent}.`);
    });
  });

  function bindSlider(id, apply) {
    const input = $(id);
    input.addEventListener('input', () => { apply(Number(input.value)); render(); });
    input.addEventListener('change', () => { history.push(); refreshUndoButtons(); });
  }
  bindSlider('zoomSlider', (v) => { state.panels[state.selectedPanel].scale = v; });
  bindSlider('panXSlider', (v) => { state.panels[state.selectedPanel].dx = v; });
  bindSlider('panYSlider', (v) => { state.panels[state.selectedPanel].dy = v; });

  $('fitPanelBtn').addEventListener('click', () => {
    history.push();
    state.panels[state.selectedPanel] = defaultPanel(state.panels[state.selectedPanel].photo);
    render();
    refreshUndoButtons();
    setStatus(`Panel ${state.selectedPanel + 1} fit to its photo.`);
  });
  $('fillAllBtn').addEventListener('click', () => {
    history.push();
    const photo = state.panels[state.selectedPanel].photo;
    state.panels.forEach((p) => { p.photo = photo; });
    render();
    refreshUndoButtons();
    setStatus('Every panel now shows the same photo.');
  });

  document.querySelectorAll('#sizeGrid .size-btn').forEach((b) => {
    b.addEventListener('click', () => {
      state.exportSize = b.dataset.size;
      render();
      const s = exportSizeById(state.exportSize);
      setStatus(`Export size: ${s.w} × ${s.h} (${s.label}).`);
    });
  });

  $('undoBtn').addEventListener('click', () => {
    if (history.undo()) { render(); refreshUndoButtons(); setStatus('Undone.'); }
  });
  $('redoBtn').addEventListener('click', () => {
    if (history.redo()) { render(); refreshUndoButtons(); setStatus('Redone.'); }
  });
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
      e.preventDefault();
      if (history.undo()) { render(); refreshUndoButtons(); }
    } else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
      e.preventDefault();
      if (history.redo()) { render(); refreshUndoButtons(); }
    }
  });

  // ---------- export ----------
  let lastExport = null;
  function openExportPreview() {
    const { canvas, size } = renderExport(state, state.exportSize);
    lastExport = { canvas, size };
    const modalCanvas = $('exportCanvas');
    modalCanvas.width = size.w;
    modalCanvas.height = size.h;
    modalCanvas.getContext('2d').drawImage(canvas, 0, 0);
    $('exportTitle').textContent = `Export preview — ${size.w} × ${size.h}`;
    $('exportMeta').textContent = `${size.label} · PNG · ${size.w} × ${size.h} px · exact pixels, no watermark`;
    $('exportModal').hidden = false;
    setStatus(`Preview ready: ${size.w} × ${size.h}. Download when it looks right.`);
  }
  $('previewExportBtn').addEventListener('click', openExportPreview);
  $('closeModalBtn').addEventListener('click', () => { $('exportModal').hidden = true; });
  $('exportModal').addEventListener('click', (e) => {
    if (e.target === $('exportModal')) $('exportModal').hidden = true;
  });
  $('downloadBtn').addEventListener('click', () => {
    if (!lastExport) return;
    const { canvas, size } = lastExport;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `vice-cover-${size.file}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      setStatus(`Downloaded vice-cover-${size.file}.png — share it.`);
    }, 'image/png');
  });

  // ---------- boot ----------
  buildLayoutPicker();
  buildGradePicker();
  buildCaptionPresets();
  render();
  refreshUndoButtons();

  return {
    state,
    render,
    loadSamples,
    /** Render every export size and report pixel dimensions (for ?selftest=1). */
    selftest() {
      const results = [];
      for (const size of ['1080x1080', '1080x1350', '1920x1080']) {
        const { canvas, size: s } = renderExport(state, size);
        const ctx = canvas.getContext('2d');
        const px = ctx.getImageData(0, 0, 1, 1).data;
        results.push({
          size: s.id,
          w: canvas.width,
          h: canvas.height,
          expectedW: s.w,
          expectedH: s.h,
          ok: canvas.width === s.w && canvas.height === s.h,
          cornerPixel: [px[0], px[1], px[2], px[3]],
        });
      }
      const out = { photos: state.photos.length, panels: state.panels.length, results, allOk: results.every((r) => r.ok) };
      $('selftest').textContent = JSON.stringify(out);
      document.title = `SELFTEST ${out.allOk ? 'PASS' : 'FAIL'} photos=${out.photos}`;
      return out;
    },
    /** Draw the current cover full-window (for ?shot=cover scenes). */
    shotCover(w, h) {
      const c = $('shotCanvas');
      renderCover(c, state, w, h);
    },
  };
}
