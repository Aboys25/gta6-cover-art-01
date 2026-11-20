# gta6-cover-art-01

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Aboys25/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Aboys25/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Vice Cover Studio — a web app that turns your photos and a caption into GTA-style multi-panel cover art, exported as a PNG to share.

## What it does

Three steps from a photo to a poster:

1. **Add photos** — pick files, drag and drop, or paste. Load the two free
   sample photos, or use your own. Auto layout picks a mosaic for your photo
   count; Surprise me shuffles layout and grade.
2. **Caption** — write a title, script line, tagline and quote. The title
   style can follow the grade automatically (Auto), or pick Sunset chrome,
   Ice neon, Gold rush, Heat blade or Neon sign.
3. **Export PNG** — 1080 × 1080, 1080 × 1350 or 1920 × 1080, straight from
   the canvas.

The poster itself is a multi-panel mosaic in five layouts (Hero mosaic,
Hero + three, Six grid, Diagonal trio, Seven mosaic) under six colour grades
(Vice Sunset, Neon Nights, Golden Hour, Tropic Teal, Heatwave, Ultraviolet),
with a huge chrome-gradient title across the middle, a script subtitle, a
tagline strip, a role tag on every panel, a gold "ORIGINAL COVER ART" seal,
a billing block, stars + quote, a VOL. 1 badge, a barcode and COMING SOON.
Each panel can be zoomed, flipped, swapped, face-marked and re-captioned;
Look & Title sliders tune paint, grade, halftone, grain, glow, title size
and title lift. Undo / Redo (Ctrl+Z / Ctrl+Y) step back through every change.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 — the app is static files under `app/` and
works with no network request.

## Layout of the repo

- `main.ts` — the entrypoint: copies `app/` and `screenshots/` to the
  output directory and writes `dossier.json` (Node 22, standard library
  only). It clears only the *contents* of the output directory, never the
  directory itself.
- `app/index.html`, `app/style.css`, `app/src/editor.js` — the editor.
- `app/src/render.js` — the poster drawing (mosaic, title, seal, barcode).
- `app/src/logic.js` — pure logic (layouts, grades, undo history, seal
  geometry), covered by `test/entry.test.mjs`.
- `app/src/shots.js` — fixed scenes for screenshots (`?shot=cover`,
  `?shot=cover-portrait`, `?shot=editor`, `?shot=editor-grid`).
- `app/samples/` — two free sample photos from the kit.
- `screenshots/` — four screenshots, the first one the cover.
- `test/entry.test.mjs` — `node --test test/entry.test.mjs`.

## Tests

```sh
node --test test/entry.test.mjs
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

---

Entered on [make.fun](https://make.fun/?ref=kg74h5f2&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards
