(function () {
    'use strict';

    const STYLE_ID = 'dcltr-style';
    const STORAGE_KEY = 'states';
    const QUALITY_KEY = 'default_quality';
    const QCORE = (typeof globalThis.YT_DCLTR_QUALITY_CORE === 'object' && globalThis.YT_DCLTR_QUALITY_CORE)
        ? globalThis.YT_DCLTR_QUALITY_CORE
        : null;
    const QUALITY_DEFAULT = (QCORE && typeof QCORE.QUALITY_DEFAULT === 'string')
        ? QCORE.QUALITY_DEFAULT
        : ((typeof globalThis.YT_DCLTR_QUALITY_DEFAULT === 'string')
            ? globalThis.YT_DCLTR_QUALITY_DEFAULT
            : 'hd1080');
    const QUALITY_VALUES = (QCORE && Array.isArray(QCORE.QUALITY_VALUES))
        ? QCORE.QUALITY_VALUES
        : (Array.isArray(globalThis.YT_DCLTR_QUALITY_VALUES)
            ? globalThis.YT_DCLTR_QUALITY_VALUES
            : ['tiny', 'small', 'medium', 'large', 'hd720', 'hd1080', 'hd1440', 'hd2160', 'hd4320', 'highest']);
    const NAV_EVENTS = ['yt-navigate-finish', 'yt-page-data-updated'];
    const FEATURES = Array.isArray(globalThis.YT_DCLTR_FEATURES) ? globalThis.YT_DCLTR_FEATURES : [];
    const DEFAULTS = (globalThis.YT_DCLTR_DEFAULTS && typeof globalThis.YT_DCLTR_DEFAULTS === 'object')
        ? globalThis.YT_DCLTR_DEFAULTS
        : Object.fromEntries(FEATURES.map(feature => [
            feature.key,
            feature.behavior ? !!feature.defaultEnabled : feature.defaultHidden !== false
        ]));
    const MONK_FEATURE = FEATURES.find((f) => f && f.mode === true) || null;
    const MONK_PRESET = (MONK_FEATURE && MONK_FEATURE.preset && typeof MONK_FEATURE.preset === 'object')
        ? MONK_FEATURE.preset
        : {};

    // Monk Mode is a layer over the saved toggles: while it is on, the
    // preset forces a fixed set of values. Exiting restores the exact
    // previous setup because the stored states are never overwritten.
    function isMonkActive() {
        try {
            return !!cachedStates['monk_mode'];
        } catch (err) {
            return false;
        }
    }

    function effectiveStates() {
        try {
            if (!cachedStates || !cachedStates['monk_mode']) return cachedStates;
            const eff = { ...cachedStates };
            for (const key of Object.keys(MONK_PRESET)) {
                if (isSafeKey(key)) eff[key] = !!MONK_PRESET[key];
            }
            return eff;
        } catch (err) {
            return cachedStates;
        }
    }

    function getStorageArea() {
        try {
            const chromeApi = globalThis.chrome;
            if (chromeApi && chromeApi.storage && chromeApi.storage.local) return chromeApi.storage.local;
            const browserApi = globalThis.browser;
            if (browserApi && browserApi.storage && browserApi.storage.local) return browserApi.storage.local;
        } catch (err) { /* unavailable */ }
        return null;
    }

    function getExtensionApi() {
        try {
            const chromeApi = globalThis.chrome;
            if (chromeApi && chromeApi.storage) return chromeApi;
            const browserApi = globalThis.browser;
            if (browserApi && browserApi.storage) return browserApi;
        } catch (err) { /* unavailable */ }
        return null;
    }

    const KEY_RE = /^[a-z0-9_]+$/;
    const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

    function isSafeKey(key) {
        return typeof key === 'string' && KEY_RE.test(key) && !FORBIDDEN_KEYS.has(key);
    }

    function buildCss() {
        return FEATURES.filter(feature =>
            feature && !feature.behavior && isSafeKey(feature.key) &&
            Array.isArray(feature.selectors) && feature.selectors.length > 0
        ).map(feature =>
            `html:not(.dcltr-show-${feature.key}) :is(${feature.selectors.join(', ')}) { display: none !important; }\n`
        ).join('');
    }

    function injectStyle() {
        try {
            const parent = (document.head || document.documentElement);
            if (!parent || typeof document.createElement !== 'function') return false;
            let style = document.getElementById(STYLE_ID);
            if (!style) {
                style = document.createElement('style');
                style.id = STYLE_ID;
                parent.appendChild(style);
            }
            style.textContent = buildCss();
            return true;
        } catch (err) {
            return false;
        }
    }

    if (!injectStyle()) {
        document.addEventListener('DOMContentLoaded', () => { injectStyle(); }, { once: true });
    }

    let cachedStates = { ...DEFAULTS };
    let cachedQuality = QUALITY_DEFAULT;
    // Becomes true once real storage data (or an explicit fallback) has
    // been applied. MAIN-world must not enforce from pre-storage defaults.
    let settingsReady = false;

    function sanitizeQuality(value) {
        if (QCORE && typeof QCORE.sanitizeQuality === 'function') {
            try {
                return QCORE.sanitizeQuality(value);
            } catch (err) { /* fall through to local check */ }
        }
        return (typeof value === 'string' && QUALITY_VALUES.indexOf(value) !== -1)
            ? value
            : QUALITY_DEFAULT;
    }

    function postQualitySettings() {
        try {
            window.postMessage({
                __dcltr: true,
                type: 'DCLTR_SETTINGS',
                enabled: !!cachedStates['quality_enabled'],
                quality: cachedQuality,
                premium: !!cachedStates['quality_premium'],
                ready: settingsReady
            }, '*');
        } catch (err) { /* ignore */ }
    }

    window.addEventListener('message', (event) => {
        try {
            if (event.source !== window) return;
            const data = event.data;
            if (!data || data.__dcltr !== true) return;
            if (data.type === 'DCLTR_SETTINGS_REQUEST') postQualitySettings();
        } catch (err) { /* ignore */ }
    });

    function applyHiding(states) {
        try {
            const root = document.documentElement;
            if (!root || !root.classList) return;
            for (const feature of FEATURES) {
                try {
                    if (!feature || feature.behavior || !Array.isArray(feature.selectors) || feature.selectors.length === 0) continue;
                    if (!isSafeKey(feature.key)) continue;
                    root.classList.toggle(
                        `dcltr-show-${feature.key}`,
                        !states[feature.key]
                    );
                } catch (err) { /* per-feature failure must not abort loop */ }
            }
        } catch (err) { /* document unavailable */ }
        pauseHiddenShortsVideos(states);
        syncShortsPauseObserver();
    }

    // display:none does not pause media: a CSS-hidden Shorts player keeps
    // playing audio with no visible controls. Pause videos inside hidden
    // Shorts hosts so "Shorts hidden + direct /shorts/ visit" stays silent.
    function pauseHiddenShortsVideos(states) {
        try {
            if (!states || !states['shorts']) return;
            const vids = document.querySelectorAll
                ? document.querySelectorAll('ytd-shorts video, ytd-reel-video-renderer video')
                : [];
            for (const v of vids) {
                try {
                    if (v && !v.paused && typeof v.pause === 'function') v.pause();
                } catch (err) { /* per-video */ }
            }
        } catch (err) { /* ignore */ }
    }

    function sanitize(stored) {
        const merged = { ...DEFAULTS };
        if (!stored || typeof stored !== 'object') return merged;
        for (const feature of FEATURES) {
            if (!feature || !isSafeKey(feature.key)) continue;
            if (typeof stored[feature.key] === 'boolean') {
                Object.defineProperty(merged, feature.key, {
                    value: stored[feature.key],
                    writable: true,
                    enumerable: true,
                    configurable: true
                });
            }
        }
        return merged;
    }

    const SHORTS_BEHAVIOR_KEY = 'shorts_as_watch';
    const SHORTS_PREFIX = '/shorts/';
    const ORIGINAL_HREF_ATTR = 'data-dcltr-original-href';

    function isShortsBehaviorEnabled() {
        try {
            return !!effectiveStates()[SHORTS_BEHAVIOR_KEY];
        } catch (err) {
            return false;
        }
    }

    function isHomeToSubsEnabled() {
        try {
            return !!effectiveStates()['home_to_subs'];
        } catch (err) {
            return false;
        }
    }

    function isAutoplayOffEnabled() {
        try {
            return !!effectiveStates()['autoplay_off'];
        } catch (err) {
            return false;
        }
    }

    // Opening youtube.com/ lands on the Subscriptions feed instead.
    // replace() keeps the homepage out of history so Back never loops.
    function maybeRedirectHome() {
        if (!isHomeToSubsEnabled()) return;
        try {
            const path = location.pathname;
            if (path === '/' || path === '') {
                location.replace('/feed/subscriptions');
            }
        } catch (err) { /* ignore */ }
    }

    // Autoplay lives on the outer player button: clicking the inner
    // .ytp-autonav-toggle-button div does nothing, the outer
    // button.ytp-autonav-toggle flips aria-checked on the inner div.
    const AUTOPLAY_RESTORE_KEY = 'dcltr-monk-autoplay-was-on';

    function autoplayOuterButton() {
        try {
            return document.querySelector('button.ytp-autonav-toggle');
        } catch (err) {
            return null;
        }
    }

    function autoplayCheckedState() {
        try {
            const inner = document.querySelector('.ytp-autonav-toggle-button');
            return inner ? inner.getAttribute('aria-checked') : null;
        } catch (err) {
            return null;
        }
    }

    function noteAutoplayWasOn() {
        try {
            if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(AUTOPLAY_RESTORE_KEY, '1');
        } catch (err) { /* ignore */ }
    }

    function autoplayRestorePending() {
        try {
            return typeof sessionStorage !== 'undefined' && sessionStorage.getItem(AUTOPLAY_RESTORE_KEY) === '1';
        } catch (err) {
            return false;
        }
    }

    function clearAutoplayRestore() {
        try {
            if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(AUTOPLAY_RESTORE_KEY);
        } catch (err) { /* ignore */ }
    }

    function ensureAutoplayOff() {
        if (!isAutoplayOffEnabled()) return;
        try {
            if (!location.pathname.startsWith('/watch')) return;
            const btn = autoplayOuterButton();
            if (!btn || typeof btn.click !== 'function') return;
            if (autoplayCheckedState() === 'true') {
                noteAutoplayWasOn();
                btn.click();
            }
        } catch (err) { /* ignore */ }
    }

    function maybeRestoreAutoplay() {
        if (isAutoplayOffEnabled()) return;
        if (!autoplayRestorePending()) return;
        try {
            if (!location.pathname.startsWith('/watch')) return;
            if (autoplayCheckedState() !== 'false') {
                clearAutoplayRestore();
                return;
            }
            const btn = autoplayOuterButton();
            if (!btn || typeof btn.click !== 'function') return;
            btn.click();
            clearAutoplayRestore();
        } catch (err) { /* ignore */ }
    }

    function syncAutoplay() {
        try {
            if (isAutoplayOffEnabled()) ensureAutoplayOff();
            else maybeRestoreAutoplay();
        } catch (err) { /* ignore */ }
    }

    function syncMonkBehaviors() {
        maybeRedirectHome();
        syncAutoplay();
    }

    // YouTube video IDs are 11 base64url chars. Requiring the full
    // length keeps non-video /shorts/* subpaths (e.g. /shorts/feed)
    // from redirecting to a bogus watch page.
    const SHORTS_ID_RE = /^[A-Za-z0-9_-]{11}$/;

    function extractShortsId(pathname) {
        if (!pathname || !pathname.startsWith(SHORTS_PREFIX)) return null;
        const rest = pathname.slice(SHORTS_PREFIX.length).split('/')[0];
        if (!rest || !SHORTS_ID_RE.test(rest)) return null;
        return rest;
    }

    function buildWatchUrl(shortsId, searchString) {
        if (!shortsId || !SHORTS_ID_RE.test(shortsId)) return null;
        const safeId = encodeURIComponent(shortsId);
        let t = null;
        try {
            const params = new URLSearchParams(searchString || '');
            t = params.get('t');
        } catch (err) { /* ignore */ }
        return t ? `/watch?v=${safeId}&t=${encodeURIComponent(t)}` : `/watch?v=${safeId}`;
    }

    function toWatchHref(href) {
        try {
            if (typeof href !== 'string' || !href.includes('/shorts/')) return null;
            // Reject protocol-relative URLs outright: `//evil.com/shorts/x`
            // starts with `/` but resolves off-origin.
            if (href.startsWith('//')) return null;
            const url = new URL(href, location.origin);
            const isRelative = href.startsWith('/') && !href.startsWith('//');
            if (isRelative) {
                if (url.origin !== location.origin) return null;
            } else {
                if (!/(^|\.)youtube\.com$/.test(url.hostname)) return null;
            }
            const id = extractShortsId(url.pathname);
            if (!id) return null;
            return buildWatchUrl(id, url.search);
        } catch (err) {
            return null;
        }
    }

    function isAnchorElement(node) {
        return !!node && node.nodeType === 1 &&
            typeof node.tagName === 'string' && node.tagName.toUpperCase() === 'A' &&
            typeof node.getAttribute === 'function';
    }

    function rewriteAnchor(anchor) {
        try {
            if (!isAnchorElement(anchor)) return;
            const href = anchor.getAttribute('href');
            if (!href || !href.includes('/shorts/')) return;
            if (anchor.hasAttribute(ORIGINAL_HREF_ATTR)) {
                // YouTube may have re-rendered a new Shorts ID over our rewritten link.
                // Update the stored original so restore() returns the latest, not stale.
                const watch = toWatchHref(href);
                if (watch && href !== watch) {
                    anchor.setAttribute(ORIGINAL_HREF_ATTR, href);
                    anchor.setAttribute('href', watch);
                }
                return;
            }
            const watch = toWatchHref(href);
            if (!watch) return;
            anchor.setAttribute(ORIGINAL_HREF_ATTR, href);
            anchor.setAttribute('href', watch);
        } catch (err) { /* ignore */ }
    }

    function scanAndRewrite(root) {
        try {
            const scope = root && root.querySelectorAll ? root : document;
            if (isAnchorElement(scope)) rewriteAnchor(scope);
            // Skip our own rewrites: query excludes already-processed anchors
            // to avoid re-scanning on self-triggered href mutations.
            const anchors = scope.querySelectorAll
                ? scope.querySelectorAll('a[href*="/shorts/"]:not([data-dcltr-original-href])')
                : [];
            for (const anchor of anchors) rewriteAnchor(anchor);
        } catch (err) { /* ignore */ }
    }

    function restoreAnchors() {
        try {
            const anchors = document.querySelectorAll(`a[${ORIGINAL_HREF_ATTR}]`);
            for (const anchor of anchors) {
                try {
                    const original = anchor.getAttribute(ORIGINAL_HREF_ATTR);
                    const current = anchor.getAttribute('href');
                    if (original) {
                        const expected = toWatchHref(original);
                        // Only overwrite if current is still our rewrite.
                        // If YouTube legitimately changed the link since, don't clobber it.
                        if (!current || current === expected) {
                            anchor.setAttribute('href', original);
                        }
                    }
                    anchor.removeAttribute(ORIGINAL_HREF_ATTR);
                } catch (err) { /* per-anchor */ }
            }
        } catch (err) { /* ignore */ }
    }

    function maybeRedirectFromShortsPage() {
        if (!isShortsBehaviorEnabled()) return;
        try {
            const id = extractShortsId(location.pathname);
            if (!id) return;
            const watch = buildWatchUrl(id, location.search);
            if (!watch) return;
            location.replace(watch);
        } catch (err) { /* ignore */ }
    }

    function onCaptureClick(event) {
        if (!isShortsBehaviorEnabled()) return;
        try {
            if (event.defaultPrevented) return;
            // Modifier+left-click opens a new tab: rewrite in place and let
            // it proceed so the new tab lands on /watch.
            if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
                rewriteShortsLinkInPlace(event.target);
                return;
            }
            if (event.button !== 0) return;
            const watch = rewriteShortsLinkInPlace(event.target);
            if (!watch) return;
            event.preventDefault();
            event.stopPropagation();
            // Intentional: click creates a history entry (Back returns to feed),
            // while direct /shorts/ page loads use replace() to avoid
            // leaving the Shorts URL in history.
            location.href = watch;
        } catch (err) { /* ignore */ }
    }

    // Shared by click (left) and auxclick (middle): rewrite the href in
    // place so the navigation — same-tab or new-tab — lands on /watch.
    // Returns the watch URL, or null when nothing was rewritten.
    // Left-click still preventDefaults + navigates explicitly (history
    // entry); auxclick must NOT preventDefault or the new tab never opens.
    function rewriteShortsLinkInPlace(target) {
        if (!target || !target.closest) return null;
        const anchor = target.closest('a[href*="/shorts/"]');
        // Already rewritten to /watch: let normal navigation proceed.
        // Only intercept un-rewritten Shorts links (race with observer).
        if (!anchor) return null;
        if (anchor.hasAttribute(ORIGINAL_HREF_ATTR)) return null;
        const href = anchor.getAttribute('href');
        const watch = toWatchHref(href);
        if (!watch) return null;
        try {
            anchor.setAttribute(ORIGINAL_HREF_ATTR, href);
            anchor.setAttribute('href', watch);
        } catch (err) { return null; }
        return watch;
    }

    function onCaptureAuxClick(event) {
        if (!isShortsBehaviorEnabled()) return;
        try {
            if (event.defaultPrevented) return;
            // Middle-click (button 1) opens a new tab; Ctrl/Cmd+click also
            // opens a new tab. Rewrite in place and let it proceed.
            if (event.button !== 1) return;
            rewriteShortsLinkInPlace(event.target);
        } catch (err) { /* ignore */ }
    }

    let shortsObserver = null;
    let shortsRedirectStarted = false;
    let lastCheckedUrl = location.href;
    let pendingRewriteNodes = [];
    let rewriteScheduled = false;
    let fullRescanNeeded = false;
    // Independent of the rewrite observer below: pauses newly appended
    // hidden Shorts players even when link rewriting is off (infinite
    // scroll appends shelves without any navigation event).
    let shortsPauseObserver = null;

    function pauseNewShortsVideos(root) {
        try {
            const eff = effectiveStates();
            if (!eff || !eff['shorts']) return;
            if (!root || root.nodeType !== 1) return;
            if (typeof root.tagName === 'string' && root.tagName.toLowerCase() === 'video') {
                try {
                    const host = root.closest ? root.closest('ytd-shorts, ytd-reel-video-renderer') : null;
                    if (host && !root.paused && typeof root.pause === 'function') root.pause();
                } catch (err) { /* per-video */ }
                return;
            }
            const vids = root.querySelectorAll
                ? root.querySelectorAll('ytd-shorts video, ytd-reel-video-renderer video')
                : [];
            for (const v of vids) {
                try {
                    if (v && !v.paused && typeof v.pause === 'function') v.pause();
                } catch (err) { /* per-video */ }
            }
        } catch (err) { /* ignore */ }
    }

    function startShortsPauseObserver() {
        if (shortsPauseObserver) return;
        try {
            const root = document.documentElement;
            if (!root) return;
            shortsPauseObserver = new MutationObserver((mutations) => {
                try {
                    if (!cachedStates || !cachedStates['shorts']) return;
                    for (const mutation of mutations) {
                        if (!mutation.addedNodes || mutation.addedNodes.length === 0) continue;
                        for (const node of mutation.addedNodes) {
                            pauseNewShortsVideos(node);
                        }
                    }
                } catch (err) { /* ignore */ }
            });
            shortsPauseObserver.observe(root, { childList: true, subtree: true });
        } catch (err) {
            shortsPauseObserver = null;
        }
    }

    function stopShortsPauseObserver() {
        try {
            if (shortsPauseObserver) {
                shortsPauseObserver.disconnect();
                shortsPauseObserver = null;
            }
        } catch (err) { /* ignore */ }
    }

    function syncShortsPauseObserver() {
        try {
            const eff = effectiveStates();
            if (eff && eff['shorts']) startShortsPauseObserver();
            else stopShortsPauseObserver();
        } catch (err) { /* ignore */ }
    }

    function flushPendingRewrites() {
        rewriteScheduled = false;
        if (!isShortsBehaviorEnabled()) {
            pendingRewriteNodes = [];
            fullRescanNeeded = false;
            return;
        }
        // Bounded work: process at most 500 nodes per flush, re-queue the
        // remainder instead of falling back to a full-document scan.
        const batch = pendingRewriteNodes.slice(0, 500);
        pendingRewriteNodes = pendingRewriteNodes.slice(500);
        const needsFullRescan = fullRescanNeeded;
        fullRescanNeeded = false;
        try {
            for (const node of batch) {
                if (!node || node.nodeType !== 1) continue;
                if (isAnchorElement(node)) {
                    rewriteAnchor(node);
                } else if (node.querySelectorAll) {
                    scanAndRewrite(node);
                }
            }
            if (needsFullRescan) scanAndRewrite(document);
        } catch (err) { /* ignore */ }
        // Newly added Shorts players arrive hidden (CSS) but keep playing
        // audio: pause them whenever hiding is on.
        try {
            if (effectiveStates()['shorts']) pauseHiddenShortsVideos(effectiveStates());
        } catch (err) { /* ignore */ }
        if (pendingRewriteNodes.length > 0) {
            // More work remains: schedule a follow-up flush.
            if (!rewriteScheduled) {
                rewriteScheduled = true;
                try {
                    setTimeout(flushPendingRewrites, 0);
                } catch (err) {
                    try { setTimeout(flushPendingRewrites, 0); } catch (ignored) { /* ignore */ }
                }
            }
        }
        if (location.href !== lastCheckedUrl) checkUrlChange();
    }

    function scheduleRewrite(nodes) {
        for (const n of nodes) {
            if (n && n.nodeType === 1) pendingRewriteNodes.push(n);
        }
        // Hard cap to avoid unbounded growth; excess beyond 2000 falls
        // back to a single full rescan (rare, huge SPA renders only).
        if (pendingRewriteNodes.length > 2000) {
            pendingRewriteNodes = [];
            fullRescanNeeded = true;
        }
        if (rewriteScheduled) return;
        rewriteScheduled = true;
        // setTimeout (not rAF): rAF pauses in background tabs and would
        // stall rewrites until the tab is foregrounded.
        try {
            setTimeout(flushPendingRewrites, 0);
        } catch (err) {
            try { setTimeout(flushPendingRewrites, 0); } catch (ignored) { /* ignore */ }
        }
    }

    function checkUrlChange() {
        if (location.href === lastCheckedUrl) return;
        // Hash-only changes need no rescan (no new Shorts links appear).
        try {
            const prev = new URL(lastCheckedUrl);
            const next = new URL(location.href);
            prev.hash = '';
            next.hash = '';
            lastCheckedUrl = location.href;
            if (prev.href === next.href) return;
        } catch (err) {
            lastCheckedUrl = location.href;
        }
        if (isShortsBehaviorEnabled()) {
            maybeRedirectFromShortsPage();
            scanAndRewrite(document);
        }
        try {
            if (effectiveStates()['shorts']) pauseHiddenShortsVideos(effectiveStates());
        } catch (err) { /* ignore */ }
    }

    function startShortsRedirect() {
        if (shortsRedirectStarted) return;
        shortsRedirectStarted = true;
        lastCheckedUrl = location.href;
        maybeRedirectFromShortsPage();
        scanAndRewrite(document);
        try {
            const root = document.documentElement;
            if (!root) return;
            shortsObserver = new MutationObserver((mutations) => {
                let hrefTargets = null;
                let addedBatch = null;
                for (const mutation of mutations) {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'href') {
                        const t = mutation.target;
                        // Skip our own rewrites: they carry the marker attr
                        // and no longer contain /shorts/.
                        if (!isAnchorElement(t)) continue;
                        try {
                            const h = t.getAttribute('href');
                            if (t.hasAttribute(ORIGINAL_HREF_ATTR) && (!h || !h.includes('/shorts/'))) continue;
                            if (!h || !h.includes('/shorts/')) continue;
                        } catch (err) { continue; }
                        (hrefTargets || (hrefTargets = [])).push(t);
                    } else if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                        (addedBatch || (addedBatch = [])).push(...mutation.addedNodes);
                    }
                }
                if (hrefTargets) {
                    // Route through the chunked queue instead of synchronous
                    // rewrites so bulk href-swaps stay bounded per task.
                    scheduleRewrite(hrefTargets);
                }
                if (addedBatch) scheduleRewrite(addedBatch);
                if ((!hrefTargets && !addedBatch) && location.href !== lastCheckedUrl) checkUrlChange();
            });
            // Subscribe to href changes too: YouTube reuses anchors and swaps
            // hrefs in place. Our own rewrites are skipped by marker check
            // below, so no self-trigger loop.
            shortsObserver.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['href'] });
        } catch (err) { /* observer unavailable */ }
    }

    function stopShortsRedirect() {
        shortsRedirectStarted = false;
        lastCheckedUrl = location.href;
        pendingRewriteNodes = [];
        fullRescanNeeded = false;
        rewriteScheduled = false;
        try {
            if (shortsObserver) {
                shortsObserver.disconnect();
                shortsObserver = null;
            }
        } catch (err) { /* ignore */ }
        restoreAnchors();
    }

    function syncShortsBehavior() {
        if (isShortsBehaviorEnabled()) startShortsRedirect();
        else stopShortsRedirect();
    }

    function handleNavEvent() {
        checkUrlChange();
        try {
            applyHiding(effectiveStates());
        } catch (err) { /* ignore */ }
        syncMonkBehaviors();
    }

    document.addEventListener('click', onCaptureClick, true);
    // Middle-click opens a new tab via auxclick (click never fires for
    // button 1): rewrite in place and let the new tab proceed to /watch.
    try {
        document.addEventListener('auxclick', onCaptureAuxClick, true);
    } catch (err) { /* auxclick unavailable */ }

    // YouTube SPA events fire on `document`; `popstate` fires on `window`.
    // yt-navigate-start fires before the URL commits, so only listen to
    // finish/update events to avoid redirecting on a stale URL.
    // Note: no history.pushState patch — MV3 isolated worlds cannot
    // intercept page-context pushState/replaceState calls; yt-navigate-*
    // events carry the real SPA detection.
    for (const eventName of NAV_EVENTS) {
        document.addEventListener(eventName, handleNavEvent);
    }
    try {
        window.addEventListener('popstate', handleNavEvent);
    } catch (err) { /* window unavailable */ }

    // Apply defaults synchronously so first paint does not hide
    // opt-out features (e.g. logo) before storage loads.
    applyHiding(effectiveStates());
    syncShortsBehavior();
    syncMonkBehaviors();
    // YouTube re-enables autoplay on its own; poll while the mode wants it
    // off. Cheap (one query per tick) and a no-op when the mode is off.
    try {
        setInterval(syncAutoplay, 1000);
    } catch (err) { /* ignore */ }

    for (const eventName of NAV_EVENTS) {
        document.addEventListener(eventName, () => {
            try {
                applyHiding(effectiveStates());
            } catch (err) { /* ignore */ }
            syncMonkBehaviors();
        });
    }

    const storageArea = getStorageArea();
    if (storageArea) {
        let settled = false;
        // True when the settled payload was the defaults fallback (safety
        // timer / lastError), not real storage data: a late real read may
        // still overwrite it. Never overwritten the other way around.
        let usedFallback = false;
        let safetyTimer = null;
        let retried = false;
        let authoritativeSeen = false;
        // A STATES onChanged carries the newest states value directly, so a
        // late full read started before it must not clobber it (same race
        // as the quality key below, but hiding-only).
        let statesExternalSeen = false;
        const clearSafetyTimer = () => {
            if (safetyTimer !== null) {
                try { clearTimeout(safetyTimer); } catch (err) { /* ignore */ }
                safetyTimer = null;
            }
        };
        const applyData = (data) => {
            if (settled && !usedFallback) return;
            // A full read started before an external change carries a stale
            // snapshot for the changed keys. onChanged already applied the
            // newest values directly, so preserve them here instead of
            // reverting (e.g. a quality change made while loading).
            let applyStates = true;
            let applyQuality = true;
            try {
                if (QCORE && typeof QCORE.decideApplyKeys === 'function') {
                    const decision = QCORE.decideApplyKeys(statesExternalSeen, authoritativeSeen);
                    if (decision && typeof decision === 'object') {
                        applyStates = decision.applyStates !== false;
                        applyQuality = decision.applyQuality !== false;
                    }
                } else {
                    applyStates = !statesExternalSeen;
                    applyQuality = !authoritativeSeen;
                }
            } catch (err) {
                applyStates = !statesExternalSeen;
                applyQuality = !authoritativeSeen;
            }
            settled = true;
            usedFallback = false;
            clearSafetyTimer();
            if (applyStates) cachedStates = sanitize(data && data[STORAGE_KEY]);
            if (applyQuality) cachedQuality = sanitizeQuality(data && data[QUALITY_KEY]);
            settingsReady = true;
            applyHiding(effectiveStates());
            syncShortsBehavior();
            syncMonkBehaviors();
            postQualitySettings();
        };
        const applyCurrent = () => {
            if (settled) return;
            settled = true;
            usedFallback = true;
            clearSafetyTimer();
            // Do NOT claim readiness: this is the defaults snapshot. MAIN
            // must keep waiting instead of enforcing hd1080, and the late
            // real read may still supersede this with the stored quality.
            settingsReady = false;
            applyHiding(effectiveStates());
            syncShortsBehavior();
            syncMonkBehaviors();
            postQualitySettings();
        };
        const applyTerminal = () => {
            if (settled && !usedFallback) return;
            if (authoritativeSeen || statesExternalSeen) return;
            settled = true;
            usedFallback = true;
            clearSafetyTimer();
            // Both reads failed and a retry was exhausted: no late payload
            // is coming. Fall back to defaults rather than leaving quality
            // unenforced for the life of the tab.
            cachedStates = { ...DEFAULTS };
            cachedQuality = QUALITY_DEFAULT;
            settingsReady = true;
            applyHiding(effectiveStates());
            syncShortsBehavior();
            syncMonkBehaviors();
            postQualitySettings();
        };
        const readStorage = () => {
            try {
                const result = storageArea.get([STORAGE_KEY, QUALITY_KEY], (data) => {
                    try {
                        const api = getExtensionApi();
                        if (api && api.runtime && api.runtime.lastError) {
                            if (!retried) {
                                retried = true;
                                try { setTimeout(readStorage, 250); } catch (err) { applyTerminal(); }
                                return;
                            }
                            applyTerminal();
                            return;
                        }
                    } catch (err) { /* ignore */ }
                    applyData(data);
                });
                // MV3 promise form: chrome.storage.local.get(key) without callback.
                if (result && typeof result.then === 'function') {
                    result.then(applyData, () => {
                        if (!retried) {
                            retried = true;
                            try { setTimeout(readStorage, 250); } catch (err) { applyTerminal(); }
                            return;
                        }
                        applyTerminal();
                    });
                }
            } catch (err) {
                if (!retried) {
                    retried = true;
                    try { setTimeout(readStorage, 250); } catch (retryErr) { applyTerminal(); }
                    return;
                }
                applyTerminal();
            }
        };
        readStorage();
        // Safety net: never stay on defaults forever if storage hangs.
        safetyTimer = setTimeout(() => { applyCurrent(); }, 2000);

        try {
            const api = getExtensionApi();
            if (api && api.storage && api.storage.onChanged) {
                api.storage.onChanged.addListener((changes, namespace) => {
                    if (namespace !== 'local') return;
                    let qualityChanged = false;
                    let qualityAuthoritative = false;
                    if (changes[STORAGE_KEY]) {
                        cachedStates = sanitize(changes[STORAGE_KEY].newValue);
                        applyHiding(effectiveStates());
                        syncShortsBehavior();
                        syncMonkBehaviors();
                        qualityChanged = true;
                        statesExternalSeen = true;
                        clearSafetyTimer();
                    }
                    if (changes[QUALITY_KEY]) {
                        cachedQuality = sanitizeQuality(
                            changes[QUALITY_KEY].newValue === undefined
                                ? undefined
                                : changes[QUALITY_KEY].newValue
                        );
                        qualityAuthoritative = true;
                        qualityChanged = true;
                        authoritativeSeen = true;
                        clearSafetyTimer();
                        if (!settled) {
                            // This value is authoritative; stop the 2s
                            // fallback timer from re-posting ready:false.
                            // A late full read may still apply.
                            settled = true;
                            usedFallback = true;
                        }
                    }
                    if (qualityChanged) {
                        // Only the quality key proves the stored quality. A
                        // states-only change during a fallback must not latch
                        // the default 1080p; wait for the quality key or a
                        // real read instead.
                        if (qualityAuthoritative) settingsReady = true;
                        postQualitySettings();
                    }
                });
            }
        } catch (err) {
            /* storage events unavailable; defaults remain active */
        }
    } else {
        // No storage API (e.g. unexpected context): defaults are all we have.
        settingsReady = true;
    }
})();
