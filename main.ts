/**
 * main.ts — Vice Cover Studio entry program (make.fun program/v1).
 *
 * Copies app/ and screenshots/ from this repository into the output
 * directory and writes /output/dossier.json with buildDossier from
 * vendor/makefun-app.ts. Outside the grader, MAKEFUN_OUTPUT_DIR stands
 * in for /output. Node 22+, standard library only, no network.
 */
import { buildDossier } from './vendor/makefun-app.ts';
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 48 * 1024 * 1024,
  app_path_max_bytes: 1000,
};

const repoRoot = dirname(fileURLToPath(import.meta.url));
// A relative MAKEFUN_OUTPUT_DIR resolves against the working directory,
// an absolute one is used as given; default is the grader's /output.
const outDir = resolve(process.env.MAKEFUN_OUTPUT_DIR || '/output');

for (const name of ['app', 'screenshots']) {
  const src = join(repoRoot, name);
  if (!existsSync(src)) throw new Error(`main.ts: missing ${name}/ in ${repoRoot}`);
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

for (const name of ['app', 'screenshots']) {
  cpSync(join(repoRoot, name), join(outDir, name), { recursive: true });
}

const dossier = buildDossier(outDir, CAPS);
const dossierPath = join(outDir, 'dossier.json');
writeFileSync(dossierPath, dossier);
if (!existsSync(dossierPath)) throw new Error(`main.ts: failed to write ${dossierPath}`);
console.log(`wrote ${dossierPath} (${dossier.length} bytes)`);
