/**
 * layouts.js — the five poster panel layouts.
 *
 * Every layout is a list of panels in unit coordinates (0..1 of the cover).
 * The title band is drawn over the bottom of every layout, so panels run
 * full-bleed and the lettering sits on top of them.
 */

export const LAYOUTS = [
  {
    id: 'hero-strip',
    name: 'Hero + Strip',
    hint: 'One big moment, three small ones',
    panels: [
      { x: 0, y: 0, w: 0.66, h: 1 },
      { x: 0.66, y: 0, w: 0.34, h: 0.34 },
      { x: 0.66, y: 0.34, w: 0.34, h: 0.33 },
      { x: 0.66, y: 0.67, w: 0.34, h: 0.33 },
    ],
  },
  {
    id: 'grid-2x2',
    name: 'Grid 2 × 2',
    hint: 'Four equal frames',
    panels: [
      { x: 0, y: 0, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0, w: 0.5, h: 0.5 },
      { x: 0, y: 0.5, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
    ],
  },
  {
    id: 'trio',
    name: 'Trio',
    hint: 'Three tall frames side by side',
    panels: [
      { x: 0, y: 0, w: 0.34, h: 1 },
      { x: 0.34, y: 0, w: 0.32, h: 1 },
      { x: 0.66, y: 0, w: 0.34, h: 1 },
    ],
  },
  {
    id: 'hero-duo',
    name: 'Hero + Duo',
    hint: 'Wide hero over two small frames',
    panels: [
      { x: 0, y: 0, w: 1, h: 0.62 },
      { x: 0, y: 0.62, w: 0.5, h: 0.38 },
      { x: 0.5, y: 0.62, w: 0.5, h: 0.38 },
    ],
  },
  {
    id: 'full-bleed',
    name: 'Full Bleed',
    hint: 'One photo, edge to edge',
    panels: [{ x: 0, y: 0, w: 1, h: 1 }],
  },
];

export function layoutById(id) {
  return LAYOUTS.find((l) => l.id === id) || LAYOUTS[0];
}

/** Panel rectangles in pixels for a cover of W x H, with a thin gutter. */
export function layoutPanelRects(layout, w, h) {
  const gutter = Math.max(2, Math.round(Math.min(w, h) * 0.008));
  return layout.panels.map((p) => ({
    x: Math.round(p.x * w) + (p.x > 0 ? gutter / 2 : 0),
    y: Math.round(p.y * h) + (p.y > 0 ? gutter / 2 : 0),
    w: Math.round(p.w * w) - (p.x > 0 ? gutter / 2 : 0) - (p.x + p.w < 1 ? gutter / 2 : 0),
    h: Math.round(p.h * h) - (p.y > 0 ? gutter / 2 : 0) - (p.y + p.h < 1 ? gutter / 2 : 0),
  }));
}

/** Title presets for the caption chips. */
export const TITLE_PRESETS = [
  { title: 'NEON SHORE', subtitle: 'sunset run · vice coast' },
  { title: 'NIGHT SHIFT', subtitle: 'downtown after dark' },
  { title: 'PIER PRESSURE', subtitle: 'salt air & gold hour' },
  { title: 'TOP DOWN', subtitle: 'coast road, windows down' },
  { title: 'GOLDEN HOUR', subtitle: 'last light on the boulevard' },
];
