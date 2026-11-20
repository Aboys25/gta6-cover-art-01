// Vice Cover Studio — gta6-cover-art-01 entrypoint (Node 22, standard library only).
//
// The app itself is the static files under app/ (index.html + ES modules, no
// network, no library). This program hands the entry in: it copies app/ and
// screenshots/ from beside this file into the output directory and writes
// /output/dossier.json with the kit's vendored library.
//
// The grader runs `node /bot/main.ts` with /bot read-only, an empty writable
// output directory whose PARENT is read-only, 10 seconds, uid 65534. So this
// program never deletes the output directory itself: it creates it, empties
// only its CONTENTS, then copies in. Deleting the directory itself fails with
// EACCES on the grader (that is how round 3 crashed) — the contents-only
// clear is the whole point of this file's shape.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
// An empty string counts as unset: `||` (not `??`) so MAKEFUN_OUTPUT_DIR=''
// never reaches mkdirSync('') and dies with ENOENT.
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

// Create the output directory (a no-op when the grader already made it),
// then clear ONLY what is inside it — never the directory itself.
mkdirSync(outDir, { recursive: true });
for (const child of readdirSync(outDir)) {
  rmSync(join(outDir, child), { recursive: true, force: true });
}

cpSync(join(here, 'app'), join(outDir, 'app'), { recursive: true });
cpSync(join(here, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
const shotCount = readdirSync(join(outDir, 'screenshots')).length;

// The scorer's own caps: only text_max_bytes shapes the dossier bytes; the
// rest refuse an entry the scorer would refuse anyway (more than 4 screenshots
// or one over 256 KiB; app/ over 993 files, 48 MiB, or a path over 1000 bytes).
writeFileSync(
  join(outDir, 'dossier.json'),
  buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);

console.log(`Vice Cover Studio handed in to ${outDir} (${shotCount} screenshots)`);
