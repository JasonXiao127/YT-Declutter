'use strict';
// World-separation + drift-guard regression tests (source-pattern level).
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const EXT = path.join(__dirname, '..', 'youtube-declutter');
const main = fs.readFileSync(path.join(EXT, 'quality-main.js'), 'utf8');
const isolated = fs.readFileSync(path.join(EXT, 'content.js'), 'utf8');

function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1');
}

describe('world separation', () => {
  it('MAIN world uses no chrome.* storage APIs', () => {
    const code = stripComments(main);
    assert.ok(!/chrome\.\w/.test(code), 'quality-main.js must not call chrome.*');
    assert.ok(!/storage\./.test(code), 'quality-main.js must not touch storage');
    assert.ok(!/localStorage/.test(code), 'quality-main.js must not touch localStorage');
  });

  it('isolated world never touches the player', () => {
    assert.ok(!/movie_player/.test(isolated), 'content.js must not touch the player');
    assert.ok(!/setPlaybackQuality/.test(isolated), 'content.js must not set quality');
    assert.ok(!/getAvailableQuality/.test(isolated), 'content.js must not read levels');
  });

  it('MAIN world keeps the iframe guard', () => {
    assert.ok(/window\.top !== window/.test(main), 'top-frame guard required');
  });

  it('no eval / new Function (page-CSP compliance)', () => {
    for (const f of ['quality-main.js', 'content.js', 'popup.js', 'features.js', 'quality-core.js']) {
      const src = stripComments(fs.readFileSync(path.join(EXT, f), 'utf8'));
      assert.ok(!/\beval\s*\(/.test(src), `${f}: no eval`);
      assert.ok(!/new\s+Function\s*\(/.test(src), `${f}: no new Function`);
    }
  });
});

describe('player-API drift guards', () => {
  it('feature-detects every player method before use', () => {
    for (const m of ['getAvailableQualityLevels', 'getPlaybackQuality', 'setPlaybackQuality', 'getVideoData', 'getPlayerResponse', 'getAvailableQualityData']) {
      assert.ok(main.includes(m), `${m} referenced`);
    }
    assert.ok(/typeof player\.getAvailableQualityLevels [!=]==+ 'function'/.test(main));
    assert.ok(/typeof .*setPlaybackQualityRange === 'function'/.test(main));
  });

  it('waits on unknown/empty instead of forcing', () => {
    assert.ok(/!Array\.isArray\(levels\) \|\| levels\.length === 0/.test(main));
    assert.ok(/current === 'unknown'/.test(main));
  });

  it('gates enforcement behind the ad check (not just the id mismatch)', () => {
    // Mutation guard: deleting `if (isAd(player)) return 'wait-ad'` must fail.
    // The id-mismatch guard alone is not sufficient (fails open when YouTube
    // keeps the content id during ads).
    assert.ok(/if\s*\(\s*isAd\s*\(\s*player\s*\)\s*\)\s*return\s*['"]wait-ad['"]/.test(main));
  });

  it('keeps the signal-independent id-mismatch guard', () => {
    assert.ok(/if\s*\(\s*pid\s*&&\s*expected\s*&&\s*pid\s*!==\s*expected\s*\)\s*return\s*['"]wait-ad['"]/.test(main));
  });
});
