'use strict';
// Regression tests for the 10.6.0 fix sweep. These guard the specific
// behaviors that used to fail, not just the presence of identifiers.
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const EXT = path.join(ROOT, 'youtube-declutter');
const read = (name) => fs.readFileSync(path.join(EXT, name), 'utf8');
const readRoot = (name) => fs.readFileSync(path.join(ROOT, name), 'utf8');

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
  require(path.join(EXT, 'popup.js'));
  const helpers = globalThis.YT_DCLTR_POPUP;
  assert.ok(helpers, 'popup.js must expose globalThis.YT_DCLTR_POPUP');
  return helpers;
}

let popupHelpers = null;
function getPopupHelpers() {
  if (!popupHelpers) popupHelpers = loadPopupHelpers();
  return popupHelpers;
}

describe('bulk enable leaves opt-ins alone', () => {
  it('the eleven opt-ins are exactly the off-by-default toggles', () => {
    const features = loadFeatures();
    const optIns = features
      .filter((f) => f.mode !== true && (f.defaultHidden === false || (f.behavior && f.defaultEnabled === false)))
      .map((f) => f.key)
      .sort();
    assert.deepEqual(optIns, [
      'autoplay_off',
      'home_feed',
      'home_to_subs',
      'info_panels',
      'playlist_panel',
      'quality_premium',
      'recommended',
      'shorts_as_watch',
      'sidebar_subs_only',
      'top_header',
      'youtube_logo'
    ]);
  });

  it('both bulk functions record the whole fallback scope', () => {
    const popup = read('popup.js');
    const groupFn = popup.slice(popup.indexOf('function setGroupEnabled'), popup.indexOf('function setAllEnabled'));
    const allFn = popup.slice(popup.indexOf('function setAllEnabled'), popup.indexOf('function buildUi'));
    for (const fn of [groupFn, allFn]) {
      assert.ok((fn.match(/isOptIn\(f\)/g) || []).length >= 2, 'both enable passes must skip opt-ins');
      assert.match(fn, /noteFallbackScope/, 'fallback intent must be recorded by scope, not by diff');
    }
  });

  it('Disable all covers every toggle; Enable all covers only default-on toggles', () => {
    const features = loadFeatures();
    const popup = getPopupHelpers();
    const toggles = features.filter((f) => f.mode !== true);
    const disableAll = popup.fallbackScopeKeys(features, null, false);
    assert.equal(disableAll.length, toggles.length);
    assert.deepEqual(new Set(disableAll), new Set(toggles.map((f) => f.key)));
    const enableAll = popup.fallbackScopeKeys(features, null, true);
    assert.equal(enableAll.length, toggles.length - 11);
    for (const key of [
      'autoplay_off',
      'home_feed',
      'home_to_subs',
      'sidebar_subs_only',
      'top_header',
      'youtube_logo',
      'recommended',
      'playlist_panel',
      'info_panels',
      'quality_premium',
      'shorts_as_watch'
    ]) {
      assert.ok(!enableAll.includes(key), `${key} is opt-in`);
    }
    assert.ok(!enableAll.includes('monk_mode'), 'monk_mode is never bulk-enabled');
    assert.ok(!disableAll.includes('monk_mode'), 'mode card is outside bulk scope');
  });

  it('group scope respects membership and opt-ins', () => {
    const features = loadFeatures();
    const popup = getPopupHelpers();
    const topBar = features.filter((f) => f.group === 'Top Bar').map((f) => f.key).sort();
    assert.deepEqual(popup.fallbackScopeKeys(features, 'Top Bar', false).sort(), topBar);
    assert.deepEqual(
      popup.fallbackScopeKeys(features, 'Top Bar', true).sort(),
      ['ai_search', 'create_button', 'notifications', 'voice_search']
    );
  });

  it('isOptIn matches the documented set and never fires for the mode', () => {
    const features = loadFeatures();
    const popup = getPopupHelpers();
    assert.equal(popup.isOptIn(features.find((f) => f.key === 'monk_mode')), false);
    for (const f of features.filter((x) => x.mode !== true)) {
      const expected = !!(f.defaultHidden === false || (f.behavior && f.defaultEnabled === false));
      assert.equal(popup.isOptIn(f), expected, f.key);
    }
  });
});

describe('popup layout and storage safety', () => {
  it('group shortcuts stay reachable while collapsed', () => {
    const popup = read('popup.js');
    assert.match(popup, /summary\.append\(nameWrap, groupActions\)/);
    assert.ok(!popup.includes('details.appendChild(groupActions)'), 'sibling actions vanish when <details> closes');
    assert.ok((popup.match(/e\.stopPropagation\(\)/g) || []).length >= 2, 'shortcuts must not toggle the group');
  });

  it('fallback writes are deferred until the real read merges', () => {
    const popup = read('popup.js');
    const persistFn = popup.slice(popup.indexOf('function persist()'), popup.indexOf('function persistQuality()'));
    assert.match(persistFn, /if \(fallbackActive\) return;/);
    const fallback = popup.slice(popup.indexOf('const onFallback'), popup.indexOf('try {', popup.indexOf('const onFallback')));
    assert.match(fallback, /finishLoad\(true\)/, 'pending user choices must survive the fallback');
    assert.match(fallback, /setStorageMessage/, 'the user must see that changes are session-only');
  });

  it('a successful write of one key does not hide the other key failure', () => {
    const popup = read('popup.js');
    assert.match(popup, /let statesSaveFailed = false/);
    assert.match(popup, /let qualitySaveFailed = false/);
    assert.match(popup, /markSave\('states', false\)/);
    assert.match(popup, /markSave\('quality', false\)/);
    // persistAll resolves per key so one key's success cannot clear the
    // other key's failure; stale resolutions are gated by sequence ids.
    assert.match(popup, /statesSaveSeq/);
    assert.match(popup, /qualitySaveSeq/);
    assert.match(popup, /if \(statesSaveFailed \|\| qualitySaveFailed\) return;/);
  });

  it('load merge uses one atomic write when both keys are dirty', () => {
    const popup = read('popup.js');
    assert.match(popup, /function mergePersistAction\(hadPendingStates, hadPendingQuality\)/);
    assert.match(popup, /mergePersistAction\(hadPending, hadPendingQuality\)/);
    assert.match(popup, /if \(mergeAction === 'all'\) persistAll\(\);/);
  });

  it('external key deletion keeps pending fallback edits but clears otherwise', () => {
    const popup = read('popup.js');
    const handler = popup.slice(
      popup.indexOf('api.storage.onChanged.addListener'),
      popup.indexOf('} catch (err) {', popup.indexOf('api.storage.onChanged.addListener'))
    );
    assert.ok(handler.includes('else if (!fallbackActive || pendingUserChanges.size === 0)'));
    assert.match(handler, /if \(!fallbackActive \|\| pendingQuality === null\)/);
  });

  it('fallback retries the read once to rescue a hung request', () => {
    const popup = read('popup.js');
    const retry = popup.slice(
      popup.indexOf('One extra read after the fallback'),
      popup.indexOf('}, 2500);')
    );
    assert.match(popup, /if \(!usedFallback \|\| savedAfterLoad\) return;/);
    assert.match(retry, /api\.storage\.local\.get\(\[STORAGE_KEY, QUALITY_KEY\]/);
    assert.match(retry, /api\.runtime && api\.runtime\.lastError\) return/, 'a failed retry must not count as data');
    assert.match(retry, /typeof data !== 'object'/, 'empty retry payloads must stay on the fallback');
  });

  it('counts ignore children of disabled parents', () => {
    const popup = read('popup.js');
    assert.match(popup, /function featureIsOn\(key\)/);
    assert.match(popup, /function effectiveIsOn\(key/);
    assert.match(popup, /TOGGLE_FEATURES\.filter\(/);
  });

  it('each checkbox has one label', () => {
    const popup = read('popup.js');
    assert.match(popup, /const switchWrap = document\.createElement\('span'\)/);
  });

  it('the decorative slider does not swallow switch clicks', () => {
    const css = read('popup.css');
    assert.match(css, /\.slider\s*\{[^}]*pointer-events:\s*none/s);
  });

  it('Escape clears a live query outside the search box', () => {
    const popup = read('popup.js');
    assert.match(popup, /document\.addEventListener\('keydown'/);
  });

  it('update failures are cached for the window', () => {
    const popup = read('popup.js');
    assert.match(popup, /failed: true/);
    assert.match(popup, /cached\.failed === true/);
    assert.match(popup, /if \(isCacheFresh\(cached\)\) return;/);
  });
});

describe('runtime fix guards', () => {
  it('archived livestreams are not treated as live', () => {
    const main = read('quality-main.js');
    assert.ok(!main.includes('details.isLiveContent'), 'isLiveContent is true for finished archives');
    assert.match(main, /typeof data\.isLive === 'boolean'/);
    assert.match(main, /liveFromMetadata\(resp\.videoDetails, resp\.microformat\)/);
    const fn = main.slice(main.indexOf('function isLive'), main.indexOf('function getQualityData'));
    assert.ok(fn.indexOf("'/live/'") > fn.indexOf('liveFromMetadata'), 'URL is only a fallback');
  });

  it('quality recovers after an ad but not over a manual choice', () => {
    const main = read('quality-main.js');
    assert.match(main, /addEventListener\('playing'/);
    assert.match(main, /if \(manualQualityGen === gen\) return;/);
    assert.match(main, /if \(manualQualityGen === gen\) return 'done';/);
    assert.match(main, /e\.isTrusted/);
    assert.match(main, /\.ytp-settings-menu/);
    assert.ok(!main.includes("closest('.ytp-settings-button')"), 'the gear click alone is not a quality choice');
  });

  it('live streams use a non-stamping outcome so an ended stream can recover', () => {
    const main = read('quality-main.js');
    assert.match(main, /if \(isLive\(player\)\) return 'live';/);
    assert.match(main, /outcome === 'live'/);
    assert.match(main, /function getPlayerVideoId/);
    assert.match(main, /responseId !== expected/);
  });

  it('Premium finds the quality submenu by value, not English text', () => {
    const main = read('quality-main.js');
    assert.match(main, /ytp-menuitem-content/);
    assert.ok(main.includes('\\d{3,4}p'));
    assert.match(main, /looksLikeQuality/);
    assert.match(
      main,
      /tryPremiumMenuClick\(premiumLabel, HEIGHT\[normalizeLevel\(resolved\)\] \|\| 0, qualityData, attemptGen\)/,
      'the menu helper needs qualityData for its locale-independent fallback and the generation guard'
    );
  });

  it('re-enabling quality resets the Premium attempt for the current video', () => {
    const main = read('quality-main.js');
    const block = main.slice(
      main.indexOf('wasKnown && !wasEnabled && cached.enabled'),
      main.indexOf('// First real payload', main.indexOf('wasKnown && !wasEnabled && cached.enabled'))
    );
    assert.match(block, /if \(premiumPendingGen !== gen\) premiumAttemptedGen = -1;/);
    assert.match(block, /manualQualityGen = -1;/);
    assert.ok(!/premiumPendingGen = -1/.test(block), 'an in-flight Premium flight must not be cleared');
  });

  it('first real settings and an explicit enable reopen a window', () => {
    const main = read('quality-main.js');
    assert.match(main, /!wasKnown && initialized && pollTimer === null/);
    assert.equal((main.match(/initialized = true;/g) || []).length, 2);
    assert.match(main, /wasKnown && !wasEnabled && cached\.enabled/);
  });

  it('storage fallback does not claim readiness', () => {
    const content = read('content.js');
    const applyCurrent = content.slice(
      content.indexOf('const applyCurrent'),
      content.indexOf('const applyTerminal')
    );
    assert.match(applyCurrent, /settingsReady = false/);
    assert.ok(!applyCurrent.includes('settingsReady = true'));
    const applyTerminal = content.slice(
      content.indexOf('const applyTerminal'),
      content.indexOf('const readStorage')
    );
    assert.match(applyTerminal, /settingsReady = true/, 'exhausted retries must not disable quality forever');
    assert.ok((content.match(/applyTerminal\(\)/g) || []).length >= 4);
  });

  it('a quality change heals a failed initial read', () => {
    const content = read('content.js');
    const handler = content.slice(
      content.indexOf('api.storage.onChanged.addListener'),
      content.indexOf('} catch (err) {', content.indexOf('api.storage.onChanged.addListener'))
    );
    assert.match(handler, /qualityAuthoritative = true/);
    assert.match(handler, /if \(qualityAuthoritative\) settingsReady = true/);
    assert.match(handler, /authoritativeSeen = true/);
    assert.match(handler, /if \(!settled\) \{/);
    assert.match(handler, /postQualitySettings\(\)/);
  });

  it('Shorts hides the expanded guide entry even without an href', () => {
    const features = loadFeatures();
    const shorts = features.find((f) => f.key === 'shorts');
    assert.ok(shorts, 'shorts must exist');
    assert.ok(
      shorts.selectors.includes('ytd-guide-entry-renderer:has(a[title="Shorts" i])'),
      'expanded guide Shorts anchor has no href; its title must be matched'
    );
    assert.ok(shorts.selectors.includes('ytd-mini-guide-entry-renderer:has(a[href^="/shorts"])'));
  });

  it('search fluff no longer blanks every shelf', () => {
    const features = loadFeatures();
    const search = features.find((f) => f.key === 'search_fluff');
    assert.ok(search, 'search_fluff must exist');
    for (const bad of [
      'ytd-search ytd-shelf-renderer',
      'ytd-search ytd-horizontal-card-list-renderer',
      'ytd-search grid-shelf-view-model'
    ]) {
      assert.ok(!search.selectors.includes(bad), `must not blanket ${bad}`);
    }
    assert.ok(search.selectors.some((s) => s.startsWith('ytd-search ytd-shelf-renderer:has(')));
    assert.ok(search.selectors.some((s) => s.startsWith('ytd-search grid-shelf-view-model:has(')));
    assert.ok(search.selectors.includes('ytd-search ytd-secondary-search-container-renderer'));
  });
});

describe('release and docs', () => {
  it('release body names the asset the workflow builds', () => {
    const workflow = readRoot('.github/workflows/release.yml');
    assert.ok(workflow.includes('yt-declutter-${TAG}.zip'));
    assert.ok(workflow.includes('yt-declutter-${{ steps.version.outputs.tag }}.zip'));
    assert.ok(!workflow.includes('yt-declutter-${{ github.ref_name }}.zip'));
  });

  it('release tag is passed through env, not interpolated into shell', () => {
    const workflow = readRoot('.github/workflows/release.yml');
    assert.match(workflow, /env:\s*\n\s*TAG: \$\{\{ steps\.version\.outputs\.tag \}\}/);
    assert.ok(!workflow.includes('TAG="${{ steps.version.outputs.tag }}"'));
  });

  it('README toggle and default counts match features.js', () => {
    const features = loadFeatures();
    const toggles = features.filter((f) => f.mode !== true);
    const readme = readRoot('README.md');
    assert.match(readme, new RegExp(`\\b${toggles.length} toggles in 6 groups\\b`));
    assert.match(readme, /\b11 toggles are opt-in\b/);
    const defaultOn = toggles.filter(
      (f) => !(f.defaultHidden === false || (f.behavior && f.defaultEnabled === false))
    ).length;
    assert.equal(defaultOn, 22);
    assert.match(readme, /\b22 default-on\b/);
  });

  it('packaging normalizes mtimes and sorts entries', () => {
    const pkg = JSON.parse(readRoot('package.json'));
    const script = pkg.scripts['package:zip'];
    assert.match(script, /LC_ALL=C sort/);
    assert.match(script, /touch -t 198001010000/);
    assert.match(script, /zip -X -q/);
    assert.ok(!/\bzip\b[^\n]*-r\b/.test(script), 'recursive zip walks filesystem order');
    const workflow = readRoot('.github/workflows/release.yml');
    assert.match(workflow, /LC_ALL=C sort/);
    assert.match(workflow, /touch -t 198001010000/);
    assert.match(workflow, /zip -X -q/);
  });
});
