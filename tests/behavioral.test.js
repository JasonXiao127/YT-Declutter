'use strict';
// Behavioral regression tests: drive the real exported helpers instead of
// matching source substrings. A logic inversion that keeps identifiers must
// fail here.
const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const EXT = path.join(ROOT, 'youtube-declutter');
const core = require(path.join(EXT, 'quality-core.js'));

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
  assert.ok(globalThis.YT_DCLTR_UPDATE, 'popup.js must expose YT_DCLTR_UPDATE');
  return { popup: globalThis.YT_DCLTR_POPUP, update: globalThis.YT_DCLTR_UPDATE };
}

describe('late-read merge decisions (behavioral)', () => {
  it('decideApplyKeys preserves externally delivered keys', () => {
    assert.deepEqual(core.decideApplyKeys(false, false), { applyStates: true, applyQuality: true });
    assert.deepEqual(core.decideApplyKeys(false, true), { applyStates: true, applyQuality: false });
    assert.deepEqual(core.decideApplyKeys(true, false), { applyStates: false, applyQuality: true });
    assert.deepEqual(core.decideApplyKeys(true, true), { applyStates: false, applyQuality: false });
  });

  it('a quality change while loading survives the late read', () => {
    // Simulates content.js applyData after an authoritative QUALITY
    // onChanged: the stale snapshot must not revert the newer quality.
    let cachedQuality = 'hd2160';
    const lateSnapshot = { default_quality: 'hd1080' };
    const decision = core.decideApplyKeys(false, true);
    if (decision.applyQuality) cachedQuality = lateSnapshot.default_quality;
    assert.equal(cachedQuality, 'hd2160');
  });

  it('a states change while loading survives the late read', () => {
    let cachedStates = { comments: false };
    const lateSnapshot = { states: { comments: true } };
    const decision = core.decideApplyKeys(true, false);
    if (decision.applyStates) cachedStates = lateSnapshot.states;
    assert.deepEqual(cachedStates, { comments: false });
  });
});

describe('premium flight generation guard (behavioral)', () => {
  it('isStaleAttempt aborts only mismatched generations', () => {
    assert.equal(core.isStaleAttempt(3, 3), false);
    assert.equal(core.isStaleAttempt(3, 4), true);
    assert.equal(core.isStaleAttempt(undefined, 4), false);
    assert.equal(core.isStaleAttempt(null, 4), false);
    assert.equal(core.isStaleAttempt(-1, 4), true);
  });
});

describe('popup merge action (behavioral)', () => {
  let popup;
  before(() => {
    ({ popup } = loadPopupHelpers());
  });

  it('mergePersistAction picks one atomic write for both dirty keys', () => {
    assert.equal(popup.mergePersistAction(true, true), 'all');
    assert.equal(popup.mergePersistAction(true, false), 'states');
    assert.equal(popup.mergePersistAction(false, true), 'quality');
    assert.equal(popup.mergePersistAction(false, false), null);
  });

  it('fallbackScopeKeys covers the bulk intent, not the diff', () => {
    delete require.cache[require.resolve(path.join(EXT, 'features.js'))];
    delete globalThis.YT_DCLTR_FEATURES;
    delete globalThis.YT_DCLTR_DEFAULTS;
    require(path.join(EXT, 'features.js'));
    const features = globalThis.YT_DCLTR_FEATURES;
    const toggles = features.filter((f) => f.mode !== true);
    const disableAll = popup.fallbackScopeKeys(features, null, false);
    assert.equal(disableAll.length, toggles.length);
    const enableAll = popup.fallbackScopeKeys(features, null, true);
    const optIns = toggles.filter((f) => popup.isOptIn(f)).length;
    assert.equal(enableAll.length, toggles.length - optIns);
    assert.ok(optIns > 0, 'expected some opt-in toggles');
  });
});

describe('update cache freshness (behavioral)', () => {
  let update;
  before(() => {
    ({ update } = loadPopupHelpers());
  });

  it('version-less failures retry after an hour, successes wait a day', () => {
    const now = Date.now();
    assert.equal(update.UPDATE_FAIL_RETRY_MS, 60 * 60 * 1000);
    // Fresh success: no refetch.
    assert.equal(update.isCacheFresh({ ts: now, latest: '10.6.0' }), true);
    // Fresh failure WITH a cached version: show it, no refetch.
    assert.equal(update.isCacheFresh({ ts: now, latest: '10.5.0', failed: true }), true);
    // Fresh failure WITHOUT a version: retry after an hour, not a day.
    assert.equal(update.isCacheFresh({ ts: now, failed: true }), true);
    assert.equal(update.isCacheFresh({ ts: now - 61 * 60 * 1000, failed: true }), false);
    assert.equal(update.isCacheFresh({ ts: now - 61 * 60 * 1000, latest: '10.5.0', failed: true }), true);
    // Clock skew never counts as fresh.
    assert.equal(update.isCacheFresh({ ts: now + 60000, failed: true }), false);
  });
});
