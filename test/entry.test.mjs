// Tests for the risky logic in Vice Cover Studio: undo history, auto title
// style following the grade, and seal geometry on all three export sizes.
// Run: node --test test/entry.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AUTO_STYLE_BY_GRADE,
  GRADES,
  LAYOUTS,
  clampPanel,
  commitHistory,
  newHistory,
  panelsFor,
  redoHistory,
  resolveTitleStyle,
  roleTagEdge,
  roleTagRect,
  sealGeometry,
  undoHistory,
} from '../app/src/logic.js';

// (a) One undo returns the state from before the change — the first undo
// must not be a no-op (the round-4 review's must-fix #1).
test('undo once returns the pre-change state', () => {
  const before = { layout: 'hero-mosaic', grade: 'sunset', panels: [1, 2, 3, 4] };
  const history = newHistory(before);
  const after = { layout: 'six-grid', grade: 'sunset', panels: [1, 2, 3, 4, 5, 6] };
  commitHistory(history, after);
  const restored = undoHistory(history);
  assert.notEqual(restored, null);
  assert.deepEqual(JSON.parse(restored), before);
  // A second undo has nothing left to step back to.
  assert.equal(undoHistory(history), null);
  // And redo walks forward again.
  const forward = redoHistory(history);
  assert.notEqual(forward, null);
  assert.deepEqual(JSON.parse(forward), after);
});

test('undo after several changes steps back one change at a time', () => {
  const s0 = { layout: 'hero-mosaic' };
  const history = newHistory(s0);
  commitHistory(history, { layout: 'hero-three' });
  commitHistory(history, { layout: 'diagonal-trio' });
  assert.deepEqual(JSON.parse(undoHistory(history)), { layout: 'hero-three' });
  assert.deepEqual(JSON.parse(undoHistory(history)), { layout: 'hero-mosaic' });
  assert.equal(undoHistory(history), null);
});

// (b) Auto title style follows the grade — never a fixed chrome
// (the round-4 review's must-fix #2).
test('auto title style follows the grade', () => {
  assert.equal(resolveTitleStyle('neon', 'auto'), 'neon');
  assert.equal(resolveTitleStyle('sunset', 'auto'), 'chrome');
  assert.equal(resolveTitleStyle('golden', 'auto'), 'gold');
  assert.equal(resolveTitleStyle('heat', 'auto'), 'blade');
  assert.equal(resolveTitleStyle('teal', 'auto'), 'sign');
  assert.equal(resolveTitleStyle('ultraviolet', 'auto'), 'sign');
  // An explicit style wins over the grade.
  assert.equal(resolveTitleStyle('neon', 'gold'), 'gold');
  assert.equal(resolveTitleStyle('sunset', 'neon'), 'neon');
  // Every grade has an auto mapping.
  for (const grade of Object.keys(GRADES)) {
    assert.ok(AUTO_STYLE_BY_GRADE[grade], `grade ${grade} needs an auto style`);
  }
});

// (c) The seal's bottom edge stays above the tagline strip on every export
// size (the round-4 review's should-fix #3): radius scales with HEIGHT.
test('seal clears the tagline strip at all three export sizes', () => {
  for (const [w, h] of [[1080, 1080], [1080, 1350], [1920, 1080]]) {
    const seal = sealGeometry(w, h);
    assert.ok(seal.clearsTagline, `${w}x${h}: seal bottom ${seal.sealBottom} must be above tagline ${seal.taglineTop}`);
    assert.ok(seal.sealBottom < seal.taglineTop);
    // Radius tracks height, not width: the wide export gets the square's radius.
    assert.equal(seal.r, 56 * (h / 1080));
  }
  assert.equal(sealGeometry(1920, 1080).r, sealGeometry(1080, 1080).r);
  assert.ok(sealGeometry(1080, 1350).r > sealGeometry(1080, 1080).r);
});

// Layouts: every layout yields exactly its advertised panel count.
test('every layout yields its advertised panel count', () => {
  for (const entry of LAYOUTS) {
    const panels = panelsFor(entry.id, 1080, 1080);
    assert.equal(panels.length, entry.panels, entry.id);
    for (const panel of panels) {
      assert.ok(panel.w > 0 && panel.h > 0, `${entry.id}: panel must have size`);
      assert.ok(panel.x + panel.w <= 1080 + 60, `${entry.id}: panel must stay in frame`);
    }
  }
});

// Restoring onto a smaller layout clamps the selected panel (review #5).
test('clampPanel keeps the selection inside the layout', () => {
  assert.equal(clampPanel(6, 7), 6);
  assert.equal(clampPanel(6, 4), 3);
  assert.equal(clampPanel(0, 4), 0);
  assert.equal(clampPanel(-2, 4), 0);
  assert.equal(clampPanel(3, 0), 0);
});

// Role tags stay off the title band.
test('role tags stay off the title band', () => {
  const topPanel = { x: 0, y: 0, w: 400, h: 300 };
  const bottomPanel = { x: 0, y: 700, w: 400, h: 380 };
  assert.equal(roleTagEdge(topPanel, 1080), 'bottom');
  assert.equal(roleTagEdge(bottomPanel, 1080), 'top');
});

// A role tag never lands inside the title + script zone (44%–64% height)
// and never touches the gold seal — the two collisions the first screenshot
// pass caught (six-grid and hero-three bottom-right panels).
test('role tags clear the title zone and the seal on every layout', () => {
  for (const entry of LAYOUTS) {
    for (const size of [[1080, 1080], [1080, 1350], [1920, 1080]]) {
      const [w, h] = size;
      const seal = sealGeometry(w, h);
      for (const panel of panelsFor(entry.id, w, h)) {
        const tagW = 200;
        const tagH = 44;
        const pos = roleTagRect(panel, tagW, tagH, h, seal);
        const tagBottom = pos.y + tagH;
        const inTitleZone = pos.y < h * 0.64 && tagBottom > h * 0.44;
        assert.ok(!inTitleZone, `${entry.id} ${w}x${h}: tag at y=${pos.y} sits in the title zone`);
        assert.ok(tagBottom <= h * 0.84 + 1, `${entry.id} ${w}x${h}: tag must stay above the tagline strip`);
        const nearX = Math.max(pos.x, Math.min(seal.cx, pos.x + tagW));
        const nearY = Math.max(pos.y, Math.min(seal.cy, pos.y + tagH));
        const dist = Math.hypot(seal.cx - nearX, seal.cy - nearY);
        assert.ok(dist >= seal.r, `${entry.id} ${w}x${h}: tag touches the seal (dist ${dist} < r ${seal.r})`);
      }
    }
  }
});
