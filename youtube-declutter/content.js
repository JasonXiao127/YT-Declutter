(function () {
    'use strict';

    const STYLE_ID = 'dcltr-style';
    const STORAGE_KEY = 'states';
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
            const api = globalThis.chrome ?? globalThis.browser;
            if (api && api.storage && api.storage.local) return api.storage.local;
        } catch (err) { /* unavailable */ }
        return null;
    }

    const KEY_RE = /^[a-z0-9_]+$/;

    function buildCss() {
        return FEATURES.filter(feature =>
            feature && typeof feature.key === 'string' && KEY_RE.test(feature.key) &&
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
            return true;
        }
    }

    if (!injectStyle()) {
        document.addEventListener('DOMContentLoaded', () => { injectStyle(); }, { once: true });
    }

    let cachedStates = { ...DEFAULTS };

    function applyHiding(states) {
        try {
            const root = document.documentElement;
            if (!root || !root.classList) return;
            for (const feature of FEATURES) {
                try {
                    if (!feature || feature.behavior || !Array.isArray(feature.selectors) || feature.selectors.length === 0) continue;
                    if (typeof feature.key !== 'string' || !KEY_RE.test(feature.key)) continue;
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
        if (!stored) return merged;
        for (const feature of FEATURES) {
            if (typeof stored[feature.key] === 'boolean') {
                merged[feature.key] = stored[feature.key];
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

    function extractShortsId(pathname) {
        if (!pathname || !pathname.startsWith(SHORTS_PREFIX)) return null;
        const rest = pathname.slice(SHORTS_PREFIX.length).split('/')[0].split('?')[0].split('#')[0].split('&')[0];
        return rest || null;
    }

    function buildWatchUrl(shortsId, searchString) {
        let t = null;
        try {
            const params = new URLSearchParams(searchString || '');
            t = params.get('t');
        } catch (err) { /* ignore */ }
        return t ? `/watch?v=${shortsId}&t=${encodeURIComponent(t)}` : `/watch?v=${shortsId}`;
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
            location.replace(buildWatchUrl(id, location.search));
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
            if (!anchor || anchor.hasAttribute(ORIGINAL_HREF_ATTR)) {
                // Already rewritten to /watch: let normal navigation proceed.
                // Only intercept un-rewritten Shorts links (race with observer).
                if (anchor && anchor.hasAttribute(ORIGINAL_HREF_ATTR)) return;
                if (!anchor) return;
            }
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

    function flushPendingRewrites() {
        rewriteScheduled = false;
        if (!isShortsBehaviorEnabled()) {
            pendingRewriteNodes = [];
            return;
        }
        const batch = pendingRewriteNodes;
        pendingRewriteNodes = [];
        try {
            for (const node of batch) {
                if (!node || node.nodeType !== 1) continue;
                if (isAnchorElement(node)) {
                    rewriteAnchor(node);
                } else if (node.querySelectorAll) {
                    scanAndRewrite(node);
                }
            }
        } catch (err) { /* ignore */ }
        if (location.href !== lastCheckedUrl) checkUrlChange();
    }

    function scheduleRewrite(nodes) {
        for (const n of nodes) {
            if (n && n.nodeType === 1) pendingRewriteNodes.push(n);
        }
        // Cap batch to avoid unbounded growth on huge SPA renders.
        if (pendingRewriteNodes.length > 500) {
            pendingRewriteNodes = pendingRewriteNodes.slice(-500);
        }
        if (rewriteScheduled) return;
        rewriteScheduled = true;
        try {
            if (typeof requestAnimationFrame === 'function') {
                requestAnimationFrame(flushPendingRewrites);
            } else {
                setTimeout(flushPendingRewrites, 0);
            }
        } catch (err) {
            setTimeout(flushPendingRewrites, 0);
        }
    }

    function checkUrlChange() {
        if (location.href !== lastCheckedUrl) {
            lastCheckedUrl = location.href;
            if (isShortsBehaviorEnabled()) {
                maybeRedirectFromShortsPage();
                scanAndRewrite(document);
            }
        }
    }

    function startShortsRedirect() {
        maybeRedirectFromShortsPage();
        scanAndRewrite(document);
        if (shortsRedirectStarted) return;
        shortsRedirectStarted = true;
        lastCheckedUrl = location.href;
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
            // No `attributes: href` subscription: rewrites are handled
            // synchronously + via childList batching, avoiding self-trigger loops.
            shortsObserver.observe(root, { childList: true, subtree: true });
        } catch (err) { /* observer unavailable */ }
    }

    function stopShortsRedirect() {
        shortsRedirectStarted = false;
        lastCheckedUrl = location.href;
        pendingRewriteNodes = [];
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
        if (isShortsBehaviorEnabled()) maybeRedirectFromShortsPage();
    }

    document.addEventListener('click', onCaptureClick, true);

    // YouTube SPA events fire on `document`; `popstate` fires on `window`.
    // Listen once each — no duplicate document+window handlers.
    for (const eventName of [...NAV_EVENTS, 'yt-navigate-start']) {
        document.addEventListener(eventName, handleNavEvent);
    }
    try {
        window.addEventListener('popstate', handleNavEvent);
    } catch (err) { /* window unavailable */ }

    try {
        if (!history.pushState.__dcltrPatched && !history.replaceState.__dcltrPatched) {
            const originalPushState = history.pushState;
            const originalReplaceState = history.replaceState;
            const patchedPush = function (...args) {
                const result = originalPushState.apply(this, args);
                setTimeout(checkUrlChange, 0);
                return result;
            };
            const patchedReplace = function (...args) {
                const result = originalReplaceState.apply(this, args);
                setTimeout(checkUrlChange, 0);
                return result;
            };
            patchedPush.__dcltrPatched = true;
            patchedReplace.__dcltrPatched = true;
            try {
                patchedPush.toString = originalPushState.toString.bind(originalPushState);
                patchedReplace.toString = originalReplaceState.toString.bind(originalReplaceState);
            } catch (err) { /* toString preserve best-effort */ }
            history.pushState = patchedPush;
            history.replaceState = patchedReplace;
        }
    } catch (err) { /* history patch unavailable */ }

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
        const applyData = (data) => {
            if (settled) return;
            settled = true;
            cachedStates = sanitize(data && data[STORAGE_KEY]);
            applyHiding(cachedStates);
            syncShortsBehavior();
        };
        const applyCurrent = () => {
            if (settled) return;
            settled = true;
            applyHiding(cachedStates);
            syncShortsBehavior();
        };
        try {
            const result = storageArea.get(STORAGE_KEY, (data) => {
                try {
                    const api = globalThis.chrome ?? globalThis.browser;
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
        } catch (err) {
            cachedStates = { ...DEFAULTS };
            applyHiding(cachedStates);
            syncShortsBehavior();
        }

        try {
            const api = globalThis.chrome ?? globalThis.browser;
            if (api && api.storage && api.storage.onChanged) {
                api.storage.onChanged.addListener((changes, namespace) => {
                    if (namespace === 'local' && changes[STORAGE_KEY]) {
                        cachedStates = sanitize(changes[STORAGE_KEY].newValue);
                        applyHiding(cachedStates);
                        syncShortsBehavior();
                    }
                });
            }
        } catch (err) {
            /* storage events unavailable; defaults remain active */
        }
    }
})();
