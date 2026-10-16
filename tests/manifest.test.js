'use strict';
// Manifest + load-order regression tests.
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const EXT = path.join(ROOT, 'youtube-declutter');
const manifest = require(path.join(EXT, 'manifest.json'));

describe('manifest', () => {
  it('parses with expected version floor', () => {
    assert.equal(manifest.manifest_version, 3);
    assert.match(manifest.version, /^\d+\.\d+/);
    assert.ok(Number(manifest.minimum_chrome_version) >= 111, 'world: MAIN needs Chrome 111+');
  });

  it('declares isolated + MAIN entries with matching scope', () => {
    assert.equal(manifest.content_scripts.length, 2);
    const [isolated, main] = manifest.content_scripts;
    assert.deepEqual(isolated.matches, ['*://youtube.com/*', '*://*.youtube.com/*']);
    assert.deepEqual(main.matches, ['*://youtube.com/*', '*://*.youtube.com/*']);
    assert.equal(main.world, 'MAIN');
    assert.equal(main.all_frames, false);
    assert.equal(isolated.all_frames, false);
  });

  it('pins scope, timing, and permissions on both entries', () => {
    for (const entry of manifest.content_scripts) {
      assert.deepEqual(entry.exclude_matches, ['*://music.youtube.com/*'], 'music exclusion required');
      assert.equal(entry.run_at, 'document_start');
    }
    assert.deepEqual(manifest.permissions, ['storage']);
    assert.equal(manifest.action.default_popup, 'popup.html');
  });

  it('loads quality-core before every consumer', () => {
    const [isolated, main] = manifest.content_scripts;
    assert.deepEqual(isolated.js, ['quality-core.js', 'features.js', 'content.js']);
    assert.deepEqual(main.js, ['quality-core.js', 'features.js', 'quality-main.js']);
  });

  it('every referenced file exists', () => {
    const refs = new Set(manifest.content_scripts.flatMap((e) => e.js));
    refs.add('popup.js');
    const popupHtml = fs.readFileSync(path.join(EXT, 'popup.html'), 'utf8');
    const popupScripts = [...popupHtml.matchAll(/<script src="([^"]+)">/g)].map((m) => m[1]);
    assert.deepEqual(popupScripts, ['quality-core.js', 'features.js', 'popup.js']);
    for (const f of refs) assert.ok(fs.existsSync(path.join(EXT, f)), `missing ${f}`);
    for (const icon of Object.values(manifest.icons)) {
      assert.ok(fs.existsSync(path.join(EXT, icon)), `missing ${icon}`);
    }
  });
});
