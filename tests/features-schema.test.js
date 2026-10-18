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
    assert.deepEqual(off, ['home_feed', 'info_panels', 'playlist_panel', 'quality_premium', 'recommended', 'shorts_as_watch', 'top_header', 'youtube_logo']);
  });
});
