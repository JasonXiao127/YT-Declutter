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
      // Skip OS strays (e.g. .DS_Store, Thumbs.db); icons are PNG-only.
      if (entry.name.startsWith('.') || entry.name === 'Thumbs.db') continue;
      if (rel === 'icons' && !/\.png$/i.test(entry.name)) continue;
      copyFile(path.join(rel, entry.name));
    }
  }
}

function validateManifestRefs() {
  const manifest = JSON.parse(fs.readFileSync(path.join(SRC, 'manifest.json'), 'utf8'));
  const refs = new Set(manifest.content_scripts.flatMap((e) => e.js));
  const popupHtml = fs.readFileSync(path.join(SRC, 'popup.html'), 'utf8');
  for (const m of popupHtml.matchAll(/<script src="([^"]+)">/g)) refs.add(m[1]);
  refs.add('popup.html');
  refs.add('popup.js');
  refs.add('popup.css');
  for (const f of refs) {
    if (!FILES.includes(f)) throw new Error(`shippable ref not in allowlist: ${f}`);
  }
  for (const icon of Object.values(manifest.icons)) {
    if (!fs.existsSync(path.join(SRC, icon))) throw new Error(`missing icon: ${icon}`);
  }
}

function main() {
  for (const rel of FILES) {
    if (!fs.existsSync(path.join(SRC, rel))) {
      throw new Error(`missing shippable file: ${rel}`);
    }
  }
  validateManifestRefs();
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });
  for (const f of FILES) copyFile(f);
  for (const d of DIRS) copyDir(d);
  console.log(`dist/ written with ${FILES.length} files + ${DIRS.join(', ')}`);
  console.log('Zip the dist/ folder for the Web Store / GitHub release.');
}

main();
