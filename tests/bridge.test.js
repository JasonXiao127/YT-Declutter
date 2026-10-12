'use strict';
// Bridge-contract + no-fight regression tests (source-pattern level).
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const EXT = path.join(__dirname, '..', 'youtube-declutter');
const main = fs.readFileSync(path.join(EXT, 'quality-main.js'), 'utf8');
const isolated = fs.readFileSync(path.join(EXT, 'content.js'), 'utf8');

describe('settings bridge contract', () => {
  it('message shapes match on both sides', () => {
    assert.ok(isolated.includes("type: 'DCLTR_SETTINGS'"), 'isolated posts settings');
    assert.ok(main.includes("type: 'DCLTR_SETTINGS_REQUEST'"), 'MAIN requests settings');
    assert.ok(isolated.includes('DCLTR_SETTINGS_REQUEST'), 'isolated answers requests');
    assert.ok(main.includes("data.type !== 'DCLTR_SETTINGS'"), 'MAIN filters by type');
    for (const src of [isolated, main]) {
      assert.ok(src.includes('event.source !== window'), 'source guard required');
      assert.ok(src.includes('__dcltr'), 'namespace marker required');
    }
  });

  it('MAIN sanitizes receipt via the shared core', () => {
    assert.ok(/cached\.quality = sanitizeQuality\(data\.quality\)/.test(main));
    assert.ok(/cached\.enabled = data\.enabled !== false/.test(main));
    assert.ok(/cached\.premium = data\.premium === true/.test(main));
  });

  it('isolated posts after every init path and both storage keys', () => {
    const posts = (isolated.match(/postQualitySettings\(\)/g) || []).length;
    assert.ok(posts >= 4, `expected >=4 post sites, found ${posts}`);
    assert.ok(isolated.includes('changes[STORAGE_KEY]'), 'states changes forwarded');
    assert.ok(isolated.includes('changes[QUALITY_KEY]'), 'quality changes forwarded');
  });
});

describe('no-fight invariants', () => {
  it('message handler never restarts polling', () => {
    const start = main.indexOf("addEventListener('message'");
    const end = main.indexOf("document.addEventListener('yt-navigate-finish'");
    const handler = main.slice(start, end);
    assert.ok(!/startWindow\(\)/.test(handler), 'handler must not call startWindow');
    assert.ok(/pollTimer !== null && enforcedGen !== gen/.test(handler), 'handler only retries pending windows');
  });

  it('every enforcement stamps the generation and stops', () => {
    for (const token of ['enforcedGen = gen', 'stopPoll()']) {
      const count = (main.match(new RegExp(token.replace(/[()]/g, '\\$&'), 'g')) || []).length;
      assert.ok(count >= 4, `${token} appears ${count}x, expected >=4`);
    }
  });

  it('same-id events never bump the generation', () => {
    assert.ok(/else \{\s*\n.*startWindow\(\);\s*\n.*return;/s.test(main), 'same-id else-branch must not bump gen');
    const bumpSites = (main.match(/gen\+\+/g) || []).length;
    assert.ok(bumpSites >= 2, `gen++ in id-change + force paths (${bumpSites}x)`);
  });

  it('ad waits use the extended budget, not the normal window', () => {
    assert.ok(main.includes("return 'wait-ad'"), 'wait-ad outcome exists');
    assert.ok(/adTicks\+\+/.test(main), 'ad ticks tracked separately');
    assert.ok(/adTicks >= MAX_AD_TICKS/.test(main), 'ad budget enforced');
  });
});
