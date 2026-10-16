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
        return !!cachedStates[SHORTS_BEHAVIOR_KEY];
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
            if (event.defaultPrevented || event.button !== 0) return;
            if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
            const target = event.target;
            if (!target || !target.closest) return;
            const anchor = target.closest('a[href*="/shorts/"]');
            // Already rewritten to /watch: let normal navigation proceed.
            // Only intercept un-rewritten Shorts links (race with observer).
            if (!anchor) return;
            if (anchor.hasAttribute(ORIGINAL_HREF_ATTR)) return;
            const watch = toWatchHref(anchor.getAttribute('href'));
            if (!watch) return;
            event.preventDefault();
            event.stopPropagation();
            // Intentional: click creates a history entry (Back returns to feed),
            // while direct /shorts/ page loads use replace() to avoid
            // leaving the Shorts URL in history.
            location.href = watch;
        } catch (err) { /* ignore */ }
    }

    let shortsObserver = null;
    let shortsRedirectStarted = false;
    let lastCheckedUrl = location.href;
    let pendingRewriteNodes = [];
    let rewriteScheduled = false;
    let fullRescanNeeded = false;

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
                    for (const t of hrefTargets) rewriteAnchor(t);
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
    }

    document.addEventListener('click', onCaptureClick, true);

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
    applyHiding(cachedStates);
    syncShortsBehavior();

    for (const eventName of NAV_EVENTS) {
        document.addEventListener(eventName, () => applyHiding(cachedStates));
    }

    const storageArea = getStorageArea();
    if (storageArea) {
        let settled = false;
        let safetyTimer = null;
        const clearSafetyTimer = () => {
            if (safetyTimer !== null) {
                try { clearTimeout(safetyTimer); } catch (err) { /* ignore */ }
                safetyTimer = null;
            }
        };
        const applyData = (data) => {
            if (settled) return;
            settled = true;
            clearSafetyTimer();
            cachedStates = sanitize(data && data[STORAGE_KEY]);
            cachedQuality = sanitizeQuality(data && data[QUALITY_KEY]);
            settingsReady = true;
            applyHiding(cachedStates);
            syncShortsBehavior();
            postQualitySettings();
        };
        const applyCurrent = () => {
            if (settled) return;
            settled = true;
            clearSafetyTimer();
            settingsReady = true;
            applyHiding(cachedStates);
            syncShortsBehavior();
            postQualitySettings();
        };
        try {
            const result = storageArea.get([STORAGE_KEY, QUALITY_KEY], (data) => {
                try {
                    const api = getExtensionApi();
                    if (api && api.runtime && api.runtime.lastError) {
                        applyCurrent();
                        return;
                    }
                } catch (err) { /* ignore */ }
                applyData(data);
            });
            // MV3 promise form: chrome.storage.local.get(key) without callback.
            if (result && typeof result.then === 'function') {
                result.then(applyData, applyCurrent);
            }
            // Safety net: never stay on defaults forever if storage hangs.
            safetyTimer = setTimeout(() => { applyCurrent(); }, 2000);
        } catch (err) {
            cachedStates = { ...DEFAULTS };
            cachedQuality = QUALITY_DEFAULT;
            settingsReady = true;
            applyHiding(cachedStates);
            syncShortsBehavior();
            postQualitySettings();
        }

        try {
            const api = getExtensionApi();
            if (api && api.storage && api.storage.onChanged) {
                api.storage.onChanged.addListener((changes, namespace) => {
                    if (namespace !== 'local') return;
                    let qualityChanged = false;
                    if (changes[STORAGE_KEY]) {
                        cachedStates = sanitize(changes[STORAGE_KEY].newValue);
                        applyHiding(cachedStates);
                        syncShortsBehavior();
                        qualityChanged = true;
                    }
                    if (changes[QUALITY_KEY]) {
                        cachedQuality = sanitizeQuality(
                            changes[QUALITY_KEY].newValue === undefined
                                ? undefined
                                : changes[QUALITY_KEY].newValue
                        );
                        qualityChanged = true;
                    }
                    if (qualityChanged) postQualitySettings();
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
