/**
 * state.js — the cover's whole state, and the undo history around it.
 *
 * Photos are kept as loaded <img> elements (never uploaded anywhere).
 * Everything else is plain JSON, so a state snapshot is a cheap clone.
 */
import { layoutById } from './layouts.js';

export function defaultPanel(photo) {
  return { photo, scale: 1, dx: 0, dy: 0 };
}

export function createDefaultState() {
  return {
    layout: 'hero-strip',
    grade: 'sunset',
    title: 'NEON SHORE',
    subtitle: 'sunset run · vice coast',
    captionStyle: 'gradient',
    exportSize: '1080x1080',
    selectedPanel: 0,
    selectedPhoto: 0,
    photos: [], // HTMLImageElement[]
    panels: [], // one per layout panel
  };
}

/** Make sure panels match the layout: keep transforms, fill new ones. */
export function syncPanels(state) {
  const layout = layoutById(state.layout);
  const next = [];
  for (let i = 0; i < layout.panels.length; i++) {
    const old = state.panels[i];
    if (old) next.push({ ...old });
    else next.push(defaultPanel(state.selectedPhoto || 0));
  }
  state.panels = next;
  if (state.selectedPanel >= next.length) state.selectedPanel = 0;
}

/** Plain-JSON copy of the state (photos excluded — they are re-attached). */
export function snapshotState(state) {
  return JSON.parse(JSON.stringify({
    layout: state.layout,
    grade: state.grade,
    title: state.title,
    subtitle: state.subtitle,
    captionStyle: state.captionStyle,
    exportSize: state.exportSize,
    selectedPanel: state.selectedPanel,
    selectedPhoto: state.selectedPhoto,
    panels: state.panels,
  }));
}

export function restoreSnapshot(state, snap) {
  state.layout = snap.layout;
  state.grade = snap.grade;
  state.title = snap.title;
  state.subtitle = snap.subtitle;
  state.captionStyle = snap.captionStyle;
  state.exportSize = snap.exportSize;
  state.selectedPanel = snap.selectedPanel;
  state.selectedPhoto = snap.selectedPhoto;
  state.panels = snap.panels.map((p) => ({ ...p }));
  syncPanels(state);
}

/** Small undo/redo stack over state snapshots. */
export function createHistory(state) {
  const past = [];
  const future = [];
  return {
    push() {
      past.push(snapshotState(state));
      if (past.length > 60) past.shift();
      future.length = 0;
    },
    undo() {
      if (!past.length) return false;
      future.push(snapshotState(state));
      restoreSnapshot(state, past.pop());
      return true;
    },
    redo() {
      if (!future.length) return false;
      past.push(snapshotState(state));
      restoreSnapshot(state, future.pop());
      return true;
    },
    canUndo() { return past.length > 0; },
    canRedo() { return future.length > 0; },
  };
}
