/**
 * main.js — boot for Vice Cover Studio.
 *
 * Loads the bundled fonts, starts the editor, loads the sample photos, and
 * handles the maker's scene modes:
 *   ?shot=cover            full-window exported cover, landscape
 *   ?shot=cover-portrait   full-window exported cover, portrait
 *   ?shot=editor           editor with samples loaded, hero layout
 *   ?shot=editor-grid      editor with samples loaded, 2x2 grid + neon grade
 *   ?selftest=1            render all three export sizes, report dimensions
 */
import { createEditor } from './editor.js';

async function waitForFonts() {
  try {
    await Promise.all([
      document.fonts.load('100px Anton'),
      document.fonts.load('40px Pacifico'),
    ]);
    await document.fonts.ready;
  } catch (e) {
    // bundled fonts failed to load: canvas falls back to system sans
  }
}

async function boot() {
  await waitForFonts();
  const editor = createEditor();
  const params = new URLSearchParams(location.search);
  const shot = params.get('shot');

  await editor.loadSamples();

  if (shot === 'cover' || shot === 'cover-portrait') {
    document.body.classList.add('shot-cover');
    const portrait = shot === 'cover-portrait';
    editor.state.layout = 'hero-strip';
    editor.state.grade = 'sunset';
    editor.state.title = 'NEON SHORE';
    editor.state.subtitle = 'sunset run · vice coast';
    // the wide hero panel crops a portrait photo top and bottom: nudge the
    // hero photo down a touch so the face stays in frame
    if (!portrait) editor.state.panels[0].dy = -0.12;
    const w = portrait ? 1024 : 1280;
    const h = portrait ? 1280 : 720;
    const canvas = document.getElementById('shotCanvas');
    canvas.width = w;
    canvas.height = h;
    editor.shotCover(w, h);
    document.title = `SHOT cover ${w}x${h}`;
    return;
  }

  if (shot === 'editor-grid') {
    editor.state.layout = 'grid-2x2';
    editor.state.grade = 'neon';
    editor.state.title = 'NIGHT SHIFT';
    editor.state.subtitle = 'downtown after dark';
    editor.state.exportSize = '1080x1080';
    editor.render();
    document.title = 'SHOT editor-grid';
    return;
  }

  if (shot === 'editor') {
    editor.state.layout = 'hero-strip';
    editor.state.grade = 'sunset';
    editor.state.title = 'NEON SHORE';
    editor.state.subtitle = 'sunset run · vice coast';
    editor.state.exportSize = '1080x1080';
    editor.render();
    document.title = 'SHOT editor';
    return;
  }

  if (params.get('selftest') === '1') {
    editor.selftest();
  }
}

boot();
