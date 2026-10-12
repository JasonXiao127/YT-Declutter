'use strict';
// Pure-logic regression tests for quality-core.js (no DOM, no chrome.*).
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const EXT = path.join(__dirname, '..', 'youtube-declutter');
const core = require(path.join(EXT, 'quality-core.js'));

describe('quality-core constants', () => {
  it('defaults to hd1080 with 10 options ending in highest', () => {
    assert.equal(core.QUALITY_DEFAULT, 'hd1080');
    assert.equal(core.QUALITY_OPTIONS.length, 10);
    assert.deepEqual(core.QUALITY_VALUES, [
      'tiny', 'small', 'medium', 'large', 'hd720', 'hd1080',
      'hd1440', 'hd2160', 'hd4320', 'highest',
    ]);
    assert.equal(core.QUALITY_OPTIONS.at(-1).value, 'highest');
  });

  it('player ladder is descending without the highres alias', () => {
    assert.deepEqual(core.ORDER, [
      'hd4320', 'hd2880', 'hd2160', 'hd1440', 'hd1080',
      'hd720', 'large', 'medium', 'small', 'tiny',
    ]);
    assert.deepEqual(core.HEIGHT, {
      highres: 4320, hd4320: 4320, hd2880: 2880, hd2160: 2160, hd1440: 1440,
      hd1080: 1080, hd720: 720, large: 480, medium: 360, small: 240, tiny: 144,
    });
  });
});

describe('sanitizeQuality', () => {
  it('accepts every allowlisted value', () => {
    for (const v of core.QUALITY_VALUES) assert.equal(core.sanitizeQuality(v), v);
  });

  it('rejects impostors to hd1080', () => {
    for (const bad of ['4k', 'hd1080p', '1080', 'HD1080', 'highres', 'hd2880', '', ' ', null, undefined, 0, {}, []]) {
      assert.equal(core.sanitizeQuality(bad), 'hd1080', JSON.stringify(bad));
    }
  });
});

describe('normalizeLevel', () => {
  it('aliases highres to hd4320 and passes everything else through', () => {
    assert.equal(core.normalizeLevel('highres'), 'hd4320');
    assert.equal(core.normalizeLevel('hd1080'), 'hd1080');
    assert.equal(core.normalizeLevel('hd5760'), 'hd5760');
    assert.equal(core.normalizeLevel(undefined), undefined);
  });
});

describe('resolveTarget', () => {
  const cases = [
    ['hd1080', ['hd2160', 'hd1440', 'hd1080', 'hd720', 'large'], 'hd1080', 'caps higher uploads at target'],
    ['hd1080', ['hd720', 'large', 'medium'], 'hd720', 'falls back to highest at-or-below'],
    ['hd2160', ['hd1080', 'hd720'], 'hd1080', 'unavailable 4K falls back to 1080p'],
    ['highest', ['hd720', 'large'], 'hd720', 'highest takes top level'],
    ['hd4320', ['hd2160', 'hd1080'], 'hd2160', 'unavailable 8K falls back to 4K'],
    ['hd1080', ['hd4320', 'hd2160'], 'hd2160', 'nothing below target takes lowest available'],
    ['hd1080', ['highres', 'hd1080', 'hd720'], 'hd1080', 'literal highres handled via alias'],
    ['bogus', ['hd720', 'large'], 'hd720', 'unknown target takes top level'],
    ['hd1080', ['hd5760', 'hd1080'], 'hd1080', 'unknown-above-target ignored'],
  ];
  for (const [target, levels, expected, label] of cases) {
    it(`${label}: ${target} => ${expected}`, () => {
      assert.equal(core.resolveTarget(target, levels), expected);
    });
  }
});

describe('findPremiumLabel', () => {
  const std = [
    { quality: 'hd1080', qualityLabel: '1080p', isPlayable: true },
    { quality: 'hd720', qualityLabel: '720p', isPlayable: true },
  ];
  it('returns null without a premium label (=> API path)', () => {
    assert.equal(core.findPremiumLabel(std, 'hd1080'), null);
    assert.equal(core.findPremiumLabel(null, 'hd1080'), null);
    assert.equal(core.findPremiumLabel([], 'hd1080'), null);
  });

  it('resolves renamed premium labels', () => {
    for (const label of ['1080p Premium', '1080p Enhanced bitrate', '1080p Premium – Enhanced bitrate']) {
      const qd = [...std, { quality: 'hd1080', qualityLabel: label, isPlayable: true }];
      assert.equal(core.findPremiumLabel(qd, 'hd1080'), label);
    }
  });

  it('skips unplayable and malformed entries without throwing', () => {
    const qd = [
      null,
      {},
      { quality: 'hd1080' },
      { quality: 'hd1080', qualityLabel: 1080 },
      { quality: 'hd1080', qualityLabel: '1080p Premium', isPlayable: false },
      { quality: 'hd720', qualityLabel: '720p' },
    ];
    assert.equal(core.findPremiumLabel(qd, 'hd1080'), null);
  });

  it('never leaks across heights', () => {
    const qd = [{ quality: 'hd2160', qualityLabel: '2160p Premium', isPlayable: true }];
    assert.equal(core.findPremiumLabel(qd, 'hd1080'), null);
  });

  it('handles a future level sanely', () => {
    const qd = [{ quality: 'hd5760', qualityLabel: '5760p Premium', isPlayable: true }];
    assert.equal(core.findPremiumLabel(qd, 'hd5760'), '5760p Premium');
    assert.equal(core.findPremiumLabel(qd, 'hd1080'), null);
  });
});

describe('isPremiumCandidate', () => {
  it('gates the menu path at 1080p+', () => {
    assert.equal(core.isPremiumCandidate('hd720'), false);
    assert.equal(core.isPremiumCandidate('hd1080'), true);
    assert.equal(core.isPremiumCandidate('hd2160'), true);
    assert.equal(core.isPremiumCandidate('bogus'), false);
  });

  it('agrees with the height map for every ladder level', () => {
    for (const level of core.ORDER) {
      const expected = (core.HEIGHT[core.normalizeLevel(level)] || 0) >= 1080;
      assert.equal(core.isPremiumCandidate(level), expected, level);
    }
    assert.equal(core.isPremiumCandidate('highres'), true);
    assert.equal(core.isPremiumCandidate('tiny'), false);
  });

  it('covers the height-fallback pass (mismatched quality field, same height)', () => {
    const qd = [{ quality: 'hd720', qualityLabel: '1080p Premium', isPlayable: true }];
    assert.equal(core.findPremiumLabel(qd, 'hd1080'), '1080p Premium');
  });
});
