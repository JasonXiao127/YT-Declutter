'use strict';
// Monk Mode regression tests: the lockdown layer forces a fixed preset over
// the saved toggles without overwriting them, and exits restore the setup.
const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const EXT = path.join(ROOT, 'youtube-declutter');
const read = (name) => fs.readFileSync(path.join(EXT, name), 'utf8');

function loadFeatures() {
  delete require.cache[require.resolve(path.join(EXT, 'features.js'))];
  delete globalThis.YT_DCLTR_FEATURES;
  delete globalThis.YT_DCLTR_DEFAULTS;
  require(path.join(EXT, 'features.js'));
  return globalThis.YT_DCLTR_FEATURES;
}

function loadPopupHelpers() {
  if (typeof global.document === 'undefined') {
    global.document = {
      getElementById: () => null,
      createElement: () => ({
        className: '',
        dataset: {},
        hidden: false,
        style: {},
        textContent: '',
        appendChild: () => {},
        append: () => {},
        querySelectorAll: () => [],
        querySelector: () => null,
        addEventListener: () => {},
        setAttribute: () => {},
        removeAttribute: () => {},
        classList: { add: () => {}, remove: () => {}, toggle: () => {} }
      }),
      body: { style: {} },
      addEventListener: () => {}
    };
  }
  if (typeof global.localStorage === 'undefined') {
    const store = new Map();
    global.localStorage = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => { store.set(k, String(v)); },
      removeItem: (k) => { store.delete(k); }
    };
  }
  delete require.cache[require.resolve(path.join(EXT, 'popup.js'))];
  delete globalThis.YT_DCLTR_POPUP;
  delete globalThis.YT_DCLTR_UPDATE;
  require(path.join(EXT, 'popup.js'));
  assert.ok(globalThis.YT_DCLTR_POPUP, 'popup.js must expose YT_DCLTR_POPUP');
  return globalThis.YT_DCLTR_POPUP;
}

let popupHelpers = null;
function getPopupHelpers() {
  if (!popupHelpers) popupHelpers = loadPopupHelpers();
  return popupHelpers;
}

describe('monk mode preset', () => {
  it('forces 29 settings: 27 on, 2 off', () => {
    const features = loadFeatures();
    const monk = features.find((f) => f.key === 'monk_mode');
    assert.ok(monk && monk.preset, 'monk preset must exist');
    const entries = Object.entries(monk.preset);
    assert.equal(entries.length, 29);
    assert.equal(entries.filter(([, v]) => v === true).length, 27);
    assert.deepEqual(
      entries.filter(([, v]) => v === false).map(([k]) => k).sort(),
      ['description_extras', 'top_header']
    );
  });

  it('search stays alive: top header is forced visible', () => {
    const features = loadFeatures();
    const monk = features.find((f) => f.key === 'monk_mode');
    assert.equal(monk.preset.top_header, false, 'hiding the masthead would kill search');
  });

  it('chapters and transcript stay visible on the watch page', () => {
    const features = loadFeatures();
    const monk = features.find((f) => f.key === 'monk_mode');
    assert.equal(monk.preset.description_extras, false);
  });

  it('new behaviors default off and exist', () => {
    const features = loadFeatures();
    for (const key of ['sidebar_subs_only', 'home_to_subs', 'autoplay_off']) {
      const f = features.find((x) => x.key === key);
      assert.ok(f, `${key} must exist`);
    }
    const { defaults } = (() => {
      delete require.cache[require.resolve(path.join(EXT, 'features.js'))];
      require(path.join(EXT, 'features.js'));
      return { defaults: globalThis.YT_DCLTR_DEFAULTS };
    })();
    assert.equal(defaults.sidebar_subs_only, false);
    assert.equal(defaults.home_to_subs, false);
    assert.equal(defaults.autoplay_off, false);
    assert.equal(defaults.monk_mode, false);
  });
});

describe('monk mode effective state (behavioral)', () => {
  it('resolveEffective layers the preset without mutating storage', () => {
    const popup = getPopupHelpers();
    const features = loadFeatures();
    const monk = features.find((f) => f.key === 'monk_mode');
    const stored = {};
    for (const f of features) stored[f.key] = false;
    stored.monk_mode = true;
    stored.info_panels = true; // user choice the preset must not touch
    const eff = popup.resolveEffective(stored);
    for (const [k, v] of Object.entries(monk.preset)) {
      assert.equal(eff[k], v, `preset must force ${k}`);
    }
    assert.equal(stored.comments, false, 'stored states must not be mutated');
    assert.equal(eff.info_panels, true, 'untouched keys survive');
    assert.equal(eff.quality_enabled, false, 'quality stays as stored');
  });

  it('resolveEffective is a no-op while the mode is off', () => {
    const popup = getPopupHelpers();
    const stored = { monk_mode: false, comments: true, shorts: false };
    assert.deepEqual(popup.resolveEffective(stored), stored);
  });

  it('toggleFeatures excludes the mode card', () => {
    const popup = getPopupHelpers();
    const toggles = popup.toggleFeatures();
    assert.ok(!toggles.some((f) => f.key === 'monk_mode'), 'mode must not render as a row');
    assert.ok(toggles.some((f) => f.key === 'sidebar_subs_only'), 'new toggles render');
  });
});

describe('monk mode content guards', () => {
  it('layers effective states over every hiding path', () => {
    const content = read('content.js');
    assert.match(content, /function effectiveStates\(\)/);
    assert.match(content, /function isMonkActive\(\)/);
    // Every hiding application must use the layered state, never raw cache.
    assert.ok(!/applyHiding\(cachedStates\)/.test(content), 'no raw-state hiding path may remain');
    assert.ok((content.match(/applyHiding\(effectiveStates\(\)\)/g) || []).length >= 5);
  });

  it('redirects the homepage with replace (no Back loop)', () => {
    const content = read('content.js');
    assert.match(content, /function maybeRedirectHome\(\)/);
    assert.match(content, /location\.replace\('\/feed\/subscriptions'\)/);
    assert.ok(!/location\.href = '\/feed\/subscriptions'/.test(content), 'assign would pollute history');
  });

  it('clicks the outer autoplay button, not the inert inner div', () => {
    const content = read('content.js');
    assert.match(content, /button\.ytp-autonav-toggle/);
    assert.match(content, /function ensureAutoplayOff\(\)/);
    assert.match(content, /function maybeRestoreAutoplay\(\)/);
    assert.match(content, /dcltr-monk-autoplay-was-on/);
  });

  it('keeps the isolated-world contract (no player access)', () => {
    const content = read('content.js');
    assert.ok(!/movie_player/.test(content), 'content.js must not touch the player');
  });

  it('sidebar rules keep subscriptions and channels, drop the rest', () => {
    const features = loadFeatures();
    const subs = features.find((f) => f.key === 'sidebar_subs_only');
    assert.ok(subs, 'sidebar_subs_only must exist');
    const sels = subs.selectors.join('\n');
    assert.ok(sels.includes('a[href^="/feed/subscriptions"]'), 'must reference the subs entry');
    assert.ok(sels.includes('a[href^="/@"]'), 'must keep @-channels');
    assert.ok(sels.includes('ytd-mini-guide-entry-renderer'), 'mini rail must collapse to subs');
    // Explore leaks channel links (Music/Live are /channel/ URLs), so the
    // section needs explicit killers beyond the keep-list.
    assert.ok(sels.includes('/feed/storefront'), 'Explore section must die explicitly');
    assert.ok(sels.includes('UC-9-kyTW8ZkZNDHQJ6FgpwQ'), 'Explore Music entry must die explicitly');
  });
});

describe('monk mode popup guards', () => {
  it('renders a mode card outside the toggle list', () => {
    const html = read('popup.html');
    assert.match(html, /id="monk-card"/);
    assert.match(html, /id="monk-button"/);
    assert.match(html, /id="monk-status"/);
    const popup = read('popup.js');
    assert.match(popup, /function syncMonkUi\(\)/);
    assert.match(popup, /function setMonkMode\(on\)/);
    assert.match(popup, /monk-locked/);
  });

  it('parks bulk enable while the mode holds the preset', () => {
    const popup = read('popup.js');
    assert.match(popup, /if \(isMonkOn\(\) && enabled\) return;/);
    assert.match(popup, /if \(isMonkOn\(\)\) return;/);
  });

  it('Disable all exits the mode', () => {
    const popup = read('popup.js');
    const fn = popup.slice(popup.indexOf('function setAllEnabled'), popup.indexOf('function buildUi'));
    assert.match(fn, /states\['monk_mode'\] = false/);
  });

  it('exiting the mode hands the shortcuts back', () => {
    const popup = read('popup.js');
    const fn = popup.slice(popup.indexOf('function syncMonkUi'), popup.indexOf('function updateCounts'));
    assert.match(fn, /else if \(loaded\)/, 'group shortcuts re-enable on exit');
    assert.match(fn, /enableAllButton\.disabled = monk \? true : !loaded/, 'Enable all follows mode and load state');
  });

  it('popup styling fits the 600px budget with the card', () => {
    const css = read('popup.css');
    assert.match(css, /\.monk-card/);
    assert.match(css, /\.monk-button/);
    assert.match(css, /max-height: 330px/);
  });
});
