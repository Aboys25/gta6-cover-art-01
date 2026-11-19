[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Aboys25/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Aboys25/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

# Vice Cover Studio — GTA-style cover art maker

Turn your photo and a caption into a multi-panel poster cover in the style of
GTA 6's posters — bold lettering, a Vice City sunset / neon grade — and export
it as a PNG to share. Runs entirely offline in a desktop browser: your photos
never leave your machine.

## What it does

- **Any photo** — drag-and-drop or pick up to 6 photos; each panel takes its own
  photo, with zoom and pan (drag the cover, or use the sliders).
- **Multi-panel layouts** — Hero + strip, 2×2 grid, three slanted panels, or one
  full-bleed photo, with poster-style slanted seams.
- **Caption** — editable title and subtitle, four presets, three title styles
  (bold outline, neon glow, vice gradient).
- **Colour grades** — Vice Sunset, Neon Nights, Golden Hour, Palm Noir, Pastel
  Dawn, plus an original retro sun, skyline and palm silhouettes drawn in code.
- **Fast export** — one click to PNG in 1080×1080, 1080×1350, or 1920×1080.

## Try it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network: everything the app loads lives under `app/`, including
its bold display font (`app/fonts/DejaVuSans-Bold.ttf`, Bitstream Vera license —
see `app/fonts/LICENSE-DejaVu.txt`). The two sample photos under `app/samples/`
were made with an image model for make.fun and are free to use. All lettering,
art and fonts are original — no Rockstar Games logo, artwork, or font.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) copies `app/` and `screenshots/` to
the output directory and writes `dossier.json` with the vendored make.fun
library. Run it twice and the output is byte-identical.

## Files

- `app/index.html` — the editor page
- `app/style.css` — the editor styling
- `app/src/cover.js` — the cover renderer (layouts, grades, silhouettes, lettering)
- `app/src/main.js` — state, controls, drag-to-pan, PNG export
- `app/src/shots.js` — fixed scenes for screenshots (`?shot=cover` / `?shot=editor`)
- `app/fonts/`, `app/samples/` — bundled font and sample photos
- `screenshots/` — 3–4 screenshots: exported covers and the editor at work
- `main.ts`, `vendor/makefun-app.ts`, `serve.ts` — entrypoint, library, local server

## License

MIT — see `LICENSE`.
