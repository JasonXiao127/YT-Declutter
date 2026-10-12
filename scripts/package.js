const fs = require('fs');
const path = require('path');

// Dev-only packager (no dependencies). Copies the shippable allowlist into
// dist/ so tests, tooling, and docs never ship in the packed extension.
// The Chrome Web Store / release upload is the dist/ folder, not the repo.
const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'youtube-declutter');
const DIST = path.join(ROOT, 'dist');

const FILES = [
  'manifest.json',
  'quality-core.js',
  'features.js',
  'content.js',
  'quality-main.js',
  'popup.html',
  'popup.js',
  'popup.css',
];

const DIRS = ['icons'];

function copyFile(rel) {
  const from = path.join(SRC, rel);
  const to = path.join(DIST, rel);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

function copyDir(rel) {
  const from = path.join(SRC, rel);
  const to = path.join(DIST, rel);
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      copyDir(path.join(rel, entry.name));
    } else {
      copyFile(path.join(rel, entry.name));
    }
  }
}

function main() {
  for (const rel of FILES) {
    if (!fs.existsSync(path.join(SRC, rel))) {
      throw new Error(`missing shippable file: ${rel}`);
    }
  }
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });
  for (const f of FILES) copyFile(f);
  for (const d of DIRS) copyDir(d);
  console.log(`dist/ written with ${FILES.length} files + ${DIRS.join(', ')}`);
  console.log('Zip the dist/ folder for the Web Store / GitHub release.');
}

main();
