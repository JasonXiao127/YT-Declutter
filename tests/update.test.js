'use strict';
// Update notifier + version footer regression tests.
const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const EXT = path.join(ROOT, 'youtube-declutter');

function loadPopupUpdateHelpers() {
  // Minimal DOM stubs so popup.js (a browser IIFE) can load under node.
  // popup.js guards every element access; only document.body is touched
  // unconditionally via reveal().
  if (typeof global.document === 'undefined') {
    global.document = {
      getElementById: () => null,
      createElement: () => ({
        className: '',
        dataset: {},
        appendChild: () => {},
        append: () => {},
        querySelectorAll: () => [],
        querySelector: () => null,
        addEventListener: () => {},
        setAttribute: () => {},
      }),
      body: { style: {} },
    };
  }
  if (typeof global.localStorage === 'undefined') {
    const store = new Map();
    global.localStorage = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => { store.set(k, String(v)); },
      removeItem: (k) => { store.delete(k); },
    };
  }
  delete require.cache[require.resolve(path.join(EXT, 'popup.js'))];
  delete globalThis.YT_DCLTR_UPDATE;
  require(path.join(EXT, 'popup.js'));
  const helpers = globalThis.YT_DCLTR_UPDATE;
  assert.ok(helpers, 'popup.js must expose globalThis.YT_DCLTR_UPDATE');
  return helpers;
}

describe('update notifier', () => {
  let update;
  before(() => {
    update = loadPopupUpdateHelpers();
  });

  it('points at this repo releases and caches 24h', () => {
    assert.equal(update.UPDATE_API_URL, 'https://api.github.com/repos/JasonXiao127/YT-Declutter/releases/latest');
    assert.equal(update.RELEASES_PAGE_URL, 'https://github.com/JasonXiao127/YT-Declutter/releases');
    assert.equal(update.UPDATE_CACHE_KEY, 'update_check');
    assert.equal(update.UPDATE_CACHE_TTL_MS, 24 * 60 * 60 * 1000);
  });

  it('normalizeTag strips leading v and whitespace', () => {
    assert.equal(update.normalizeTag('v10.5.0'), '10.5.0');
    assert.equal(update.normalizeTag('  V10.5.0 '), '10.5.0');
    assert.equal(update.normalizeTag('10.5.0'), '10.5.0');
    assert.equal(update.normalizeTag(''), '');
    assert.equal(update.normalizeTag(null), '');
  });

  it('compareVersions orders dotted numerics', () => {
    assert.equal(update.compareVersions('10.5.0', '10.4.0'), 1);
    assert.equal(update.compareVersions('10.4.0', '10.5.0'), -1);
    assert.equal(update.compareVersions('10.5.0', 'v10.5.0'), 0);
    assert.equal(update.compareVersions('10.5', '10.5.0'), 0);
    assert.equal(update.compareVersions('9.9.9', '10.0.0'), -1);
  });

  it('isNewerVersion ignores missing and older releases', () => {
    assert.equal(update.isNewerVersion('10.6.0', '10.5.0'), true);
    assert.equal(update.isNewerVersion('10.5.0', '10.5.0'), false);
    assert.equal(update.isNewerVersion('10.4.9', '10.5.0'), false);
    assert.equal(update.isNewerVersion('', '10.5.0'), false);
    assert.equal(update.isNewerVersion('10.6.0', ''), false);
  });

  it('popup fetches latest, reads manifest version, and renders footer', () => {
    const popup = fs.readFileSync(path.join(EXT, 'popup.js'), 'utf8');
    assert.ok(popup.includes('fetch(UPDATE_API_URL'), 'must fetch the releases/latest endpoint');
    assert.ok(popup.includes('runtime.getManifest'), 'must read the installed version');
    assert.ok(popup.includes("getElementById('version-label')"), 'must bind the version label');
    assert.ok(popup.includes("getElementById('update-status')"), 'must bind the update status');
    assert.ok(popup.includes('maybeCheckForUpdates()'), 'must run the check on popup open');
    const html = fs.readFileSync(path.join(EXT, 'popup.html'), 'utf8');
    assert.ok(html.includes('id="version-label"'), 'popup.html needs the version label');
    assert.ok(html.includes('id="update-status"'), 'popup.html needs the update status');
    const css = fs.readFileSync(path.join(EXT, 'popup.css'), 'utf8');
    assert.ok(css.includes('.version-row'), 'popup.css must style the version row');
    assert.ok(css.includes('.update-available'), 'popup.css must style the update link');
  });

  it('manifest grants only the GitHub API host', () => {
    const manifest = require(path.join(EXT, 'manifest.json'));
    assert.deepEqual(manifest.host_permissions, ['https://api.github.com/']);
    assert.deepEqual(manifest.permissions, ['storage']);
  });

  it('tag-only release workflow packs and uploads the zip', () => {
    const workflowPath = path.join(ROOT, '.github', 'workflows', 'release.yml');
    assert.ok(fs.existsSync(workflowPath), 'release workflow must exist');
    const workflow = fs.readFileSync(workflowPath, 'utf8');
    assert.ok(workflow.includes("tags:"), 'workflow must trigger on tags');
    assert.ok(workflow.includes('npm test'), 'workflow must run tests before releasing');
    assert.ok(workflow.includes('npm run package'), 'workflow must build dist/');
    assert.ok(workflow.includes('yt-declutter-'), 'workflow must upload the packed zip');
  });
});
