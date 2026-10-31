'use strict';
// Feature-schema regression tests: every toggle must be well-formed so a
// typo (dup key, dangling parent, empty selectors, unbalanced parens) fails
// loudly instead of silently hiding nothing (or everything).
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const EXT = path.join(__dirname, '..', 'youtube-declutter');

function loadFeatures() {
  delete require.cache[path.join(EXT, 'features.js')];
  require(path.join(EXT, 'features.js'));
  return {
    features: globalThis.YT_DCLTR_FEATURES,
    defaults: globalThis.YT_DCLTR_DEFAULTS,
  };
}

describe('features schema', () => {
  it('keys are unique and parents resolve', () => {
    const { features } = loadFeatures();
    assert.ok(Array.isArray(features) && features.length > 0, 'features must be non-empty');
    const keys = features.map((f) => f.key);
    assert.equal(new Set(keys).size, keys.length, 'duplicate feature key');
    for (const f of features) {
      assert.ok(/^[a-z0-9_]+$/.test(f.key), `unsafe key: ${f.key}`);
      if (f.parent) assert.ok(keys.includes(f.parent), `${f.key} has dangling parent ${f.parent}`);
    }
  });

  it('hiding features carry non-empty selectors with balanced parens', () => {
    const { features } = loadFeatures();
    for (const f of features) {
      if (f.behavior) {
        assert.ok(!f.selectors, `${f.key} is behavior-only and must not carry selectors`);
        continue;
      }
      assert.ok(Array.isArray(f.selectors) && f.selectors.length > 0, `${f.key} needs selectors`);
      for (const s of f.selectors) {
        assert.ok(typeof s === 'string' && s.trim().length > 0, `${f.key} has blank selector`);
        const open = (s.match(/\(/g) || []).length;
        const close = (s.match(/\)/g) || []).length;
        assert.equal(open, close, `${f.key} unbalanced parens in: ${s}`);
      }
    }
  });

  it('defaults match the documented off-by-default set', () => {
    const { defaults } = loadFeatures();
    const off = Object.entries(defaults).filter(([, v]) => !v).map(([k]) => k).sort();
    assert.deepEqual(off, ['autoplay_off', 'home_feed', 'home_to_subs', 'info_panels', 'monk_mode', 'playlist_panel', 'quality_premium', 'recommended', 'shorts_as_watch', 'sidebar_subs_only', 'top_header', 'youtube_logo']);
  });

  it('monk mode is a well-formed mode layer, not a toggle', () => {
    const { features } = loadFeatures();
    const monk = features.find((f) => f.key === 'monk_mode');
    assert.ok(monk, 'monk_mode must exist');
    assert.equal(monk.mode, true, 'monk_mode must be marked as a mode');
    assert.ok(monk.preset && typeof monk.preset === 'object', 'monk_mode needs a preset map');
    assert.ok(!monk.selectors, 'mode must not carry selectors');
    assert.ok(!monk.group, 'mode must not render in any group');
    const keys = features.map((f) => f.key);
    for (const key of Object.keys(monk.preset)) {
      assert.ok(keys.includes(key), `preset key ${key} must be a real feature`);
      assert.notEqual(key, 'monk_mode', 'preset must not reference itself');
    }
    // The preset is all hiding/behavior keys: quality, Premium,
    // Shorts-as-watch, and info panels stay exactly as the user left them.
    for (const untouched of ['quality_enabled', 'quality_premium', 'shorts_as_watch', 'info_panels']) {
      assert.ok(!Object.prototype.hasOwnProperty.call(monk.preset, untouched), `${untouched} must stay user-controlled`);
    }
    assert.equal(Object.keys(monk.preset).length, 29, 'preset covers 29 settings');
  });
});
