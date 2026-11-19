// Vice Cover Studio — the make.fun entrypoint for gta6-cover-art-01 (Node 22,
// standard library only). It hands the app in: it copies this repository's app/
// (the offline cover maker: index.html, its ES modules, the bundled bold font and
// the two sample photos) and screenshots/ into /output, then writes
// /output/dossier.json with buildDossier from the vendored make.fun library, so
// the judge reads the app's source and screenshots from one file. Outside the
// grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The program touches no network and writes nothing outside the output dir, so
// running it twice over the same inputs produces byte-identical output.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's own caps (from the kit's gate): only text_max_bytes shapes the
// bytes; the rest refuse an entry the scorer would refuse anyway (more than 4
// screenshots or one over 256 KiB; more than 993 files in app/ or 48 MiB of app
// files in all, or a path under app/ over 1000 bytes). app/ counts beside
// /output's own 1000-entry cap, its screenshots/ and dossier.json.
const DOSSIER_LIMITS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

function handIn() {
  // Fail loudly, before copying anything, when the entry is incomplete: a
  // half-handed-in output dir is worse than no output at all.
  for (const required of ['app/index.html', 'screenshots']) {
    if (!existsSync(join(here, required))) {
      throw new Error(`missing required entry file: ${required}`);
    }
  }
  mkdirSync(out, { recursive: true });
  cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
  mkdirSync(join(out, 'screenshots'), { recursive: true });
  if (existsSync(join(here, 'screenshots'))) {
    cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
  }
  writeFileSync(join(out, 'dossier.json'), buildDossier(out, DOSSIER_LIMITS));
}

handIn();
