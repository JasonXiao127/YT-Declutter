'use strict';
// Guards for the 2025/2026 YouTube DOM sweep. These selectors were verified
// against the live desktop UI (home, search, watch, channel, subscriptions).
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const EXT = path.join(__dirname, '..', 'youtube-declutter');
const read = (name) => fs.readFileSync(path.join(EXT, name), 'utf8');

function loadFeatures() {
  delete require.cache[require.resolve(path.join(EXT, 'features.js'))];
  delete globalThis.YT_DCLTR_FEATURES;
  delete globalThis.YT_DCLTR_DEFAULTS;
  require(path.join(EXT, 'features.js'));
  return {
    features: globalThis.YT_DCLTR_FEATURES,
    defaults: globalThis.YT_DCLTR_DEFAULTS,
  };
}

function selectorsFor(features, key) {
  const feature = features.find((f) => f.key === key);
  assert.ok(feature, `${key} must exist`);
  return feature.selectors || [];
}

describe('modern YouTube selectors', () => {
  it('hides current Shorts lockups and search Shorts shelves', () => {
    const { features } = loadFeatures();
    const selectors = selectorsFor(features, 'shorts');
    assert.ok(selectors.includes('ytm-shorts-lockup-view-model-v2'));
    assert.ok(selectors.includes('grid-shelf-view-model:has(ytm-shorts-lockup-view-model-v2)'));
    assert.ok(selectors.includes('grid-shelf-view-model:has(a[href^="/shorts/"])'));
  });

  it('matches modern radio/Mix URLs, not just RDMM', () => {
    const { features } = loadFeatures();
    const selectors = selectorsFor(features, 'mixes');
    assert.ok(selectors.some((s) => s.includes('a[href*="list=RD"]')));
    assert.ok(selectors.includes('ytd-rich-item-renderer:has(a[href*="list=RD"])'));
  });

  it('hides masthead v3 ads and the whole page-top ad layout', () => {
    const { features } = loadFeatures();
    const selectors = selectorsFor(features, 'ads_playables');
    assert.ok(selectors.includes('ytd-video-masthead-ad-v3-renderer'));
    assert.ok(selectors.includes('ytd-page-top-ad-layout-renderer'));
  });

  it('hides the Ask YouTube search chip and top-bar Ask button', () => {
    const { features } = loadFeatures();
    const selectors = selectorsFor(features, 'ai_search');
    assert.ok(selectors.includes('yt-chip-cloud-chip-renderer[chip-style="STYLE_AI_MODE_CHIP"]'));
    assert.ok(selectors.some((s) => s.includes('ytd-masthead button[aria-label^="Ask"')));
  });

  it('hides AI summaries on watch pages and in search results', () => {
    const { features } = loadFeatures();
    const selectors = selectorsFor(features, 'ai_summary');
    assert.ok(selectors.includes('#below [has-video-summary]'));
    assert.ok(selectors.includes('[has-video-summary]'));
    assert.ok(selectors.includes('video-summary-content-view-model'));
    assert.ok(selectors.includes('video-summary-content-view-model-wiz'));
  });

  it('has a default-on Community Posts toggle with feed, tab, and shortcut cover', () => {
    const { features, defaults } = loadFeatures();
    const selectors = selectorsFor(features, 'community_posts');
    assert.equal(defaults.community_posts, true);
    assert.ok(selectors.includes('ytd-rich-section-renderer:has(ytd-post-renderer)'));
    assert.ok(selectors.includes('grid-shelf-view-model:has(ytd-post-renderer)'));
    assert.ok(selectors.includes('ytd-post-renderer'));
    assert.ok(selectors.includes('yt-tab-shape[tab-title="posts" i]'));
    assert.ok(selectors.some((s) => s.includes('a[aria-label="community" i]')));
  });

  it('has a default-on Most Relevant shelf toggle for subscriptions', () => {
    const { features, defaults } = loadFeatures();
    const selectors = selectorsFor(features, 'most_relevant');
    assert.equal(defaults.most_relevant, true);
    assert.ok(selectors.some((s) => s.includes('page-subtype="subscriptions"')));
    assert.ok(selectors.some((s) => s.includes('elements-per-row="3"')));
  });

  it('collapses the empty watch sidebar when recommended is hidden', () => {
    const content = read('content.js');
    assert.match(content, /LAYOUT_CSS/);
    assert.match(content, /dcltr-show-recommended[^\n]*#secondary/);
    assert.ok(content.includes('#playlist:not([hidden])'));
    assert.ok(content.includes('ytd-live-chat-frame'));
  });

  it('has a default-on watch-page Ask toggle covering YouChat', () => {
    const { features, defaults } = loadFeatures();
    const selectors = selectorsFor(features, 'watch_ask');
    assert.equal(defaults.watch_ask, true);
    assert.ok(selectors.includes('yt-video-description-youchat-section-view-model'));
    assert.ok(selectors.some((s) => s.includes('button[aria-label="Ask" i]')));
    assert.ok(selectors.some((s) => s.includes('you-chat-entrypoint-button')));
  });

  it('hides related-video filter chips with Category Chips', () => {
    const { features } = loadFeatures();
    assert.ok(selectorsFor(features, 'category_chips').includes('yt-related-chip-cloud-renderer'));
  });

  it('covers Report history and YouTube Labs sidebar sections', () => {
    const { features } = loadFeatures();
    const selectors = selectorsFor(features, 'guide_sections');
    assert.ok(selectors.some((s) => s.includes('a[href="/reporthistory"]')));
    assert.ok(selectors.some((s) => s.includes('a[href^="/labs"]')));
  });

  it('covers shopping shelf, description extras, and the Hype action', () => {
    const { features } = loadFeatures();
    assert.ok(selectorsFor(features, 'merch_and_fundraising').includes('#shopping-timely-shelf'));
    const extras = selectorsFor(features, 'description_extras');
    assert.ok(extras.includes('#below how-this-was-made-section-view-model'));
    assert.ok(extras.includes('#below yt-video-attributes-section-view-model'));
    assert.ok(selectorsFor(features, 'video_action_buttons').some((s) => s.includes('aria-label*="hype" i')));
  });

  it('Monk Mode locks all three new toggles', () => {
    const { features } = loadFeatures();
    const monk = features.find((f) => f.key === 'monk_mode');
    assert.equal(monk.preset.community_posts, true);
    assert.equal(monk.preset.most_relevant, true);
    assert.equal(monk.preset.watch_ask, true);
  });
});
