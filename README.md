# gta6-cover-art-01
[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Aboys25/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Aboys25/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

**Vice Cover Studio** — turn any photo and caption into a multi-panel GTA-style poster cover with a Vice City sunset or neon grade, and export it as a PNG to share. It runs entirely offline in your browser: your photos never leave your machine, no upload, no watermark.

## What it does

- **Any photo, any panel** — drag-drop or pick photos from your machine, click a thumbnail to place it in the selected panel, drag inside the preview to reposition, scroll to zoom. One photo can fill every panel, or each panel gets its own.
- **Five poster layouts** — Hero + Strip, Grid 2×2, Trio, Hero + Duo, and Full Bleed, all with the title band over the bottom.
- **Five Vice City grades** — Vice Sunset, Neon Nights, Palm Dusk, Miami Heat, and Mono Noir: gradient-map colour, a sunset light band, vignette, and a whisper of film grain.
- **Caption lettering** — free text title and script subtitle, three lettering styles (sunset gradient, neon glow, classic white), plus one-tap title presets. Fonts are bundled locally under the SIL Open Font License (Anton + Pacifico); nothing is loaded from the network.
- **One-click PNG export** — 1080×1080, 1080×1350, and 1920×1080, with an exact preview before you download. Undo/redo included.

## Run it

```sh
node serve.ts
# open http://localhost:8080 — drop a photo, or load the samples
```

No build step, no dependencies: `app/` is plain static files. `main.ts` hands the app in for make.fun (`MAKEFUN_OUTPUT_DIR=out node main.ts`).

## Screenshots

`01-cover-1920x1080.jpg` is the wide cover the app exported; `03-cover-1080x1350.jpg` the portrait one. `02-editor-hero.jpg` and `04-editor-grid.jpg` show the editor at work with photos loaded.

<sub>Entered on [make.fun](https://make.fun/?ref=kg74h5f2&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>
