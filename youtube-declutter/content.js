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

    function buildCss() {
        return FEATURES.filter(feature => Array.isArray(feature.selectors) && feature.selectors.length > 0).map(feature =>
            `html:not(.dcltr-show-${feature.key}) :is(${feature.selectors.join(', ')}) { display: none !important; }\n`
        ).join('');
    }

    function injectStyle() {
        let style = document.getElementById(STYLE_ID);
        if (!style) {
            style = document.createElement('style');
            style.id = STYLE_ID;
            (document.head || document.documentElement).appendChild(style);
        }
        style.textContent = buildCss();
    }

    injectStyle();

    let cachedStates = { ...DEFAULTS };

    function applyHiding(states) {
        for (const feature of FEATURES) {
            if (feature.behavior || !Array.isArray(feature.selectors) || feature.selectors.length === 0) continue;
            document.documentElement.classList.toggle(
                `dcltr-show-${feature.key}`,
                !states[feature.key]
            );
        }
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
            const url = new URL(href, location.origin);
            if (!href.startsWith('/') && !/(^|\.)youtube\.com$/.test(url.hostname)) return null;
            const id = extractShortsId(url.pathname);
            if (!id) return null;
            return buildWatchUrl(id, url.search);
        } catch (err) {
            return null;
        }
    }

    function rewriteAnchor(anchor) {
        try {
            const href = anchor.getAttribute('href');
            if (!href || !href.includes('/shorts/')) return;
            if (anchor.hasAttribute(ORIGINAL_HREF_ATTR)) {
                if (href.includes('/shorts/')) {
                    const watch = toWatchHref(href);
                    if (watch && href !== watch) anchor.setAttribute('href', watch);
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
            if (scope.tagName === 'A') rewriteAnchor(scope);
            const anchors = scope.querySelectorAll('a[href*="/shorts/"]');
            for (const anchor of anchors) rewriteAnchor(anchor);
        } catch (err) { /* ignore */ }
    }

    function restoreAnchors() {
        try {
            const anchors = document.querySelectorAll(`a[${ORIGINAL_HREF_ATTR}]`);
            for (const anchor of anchors) {
                const original = anchor.getAttribute(ORIGINAL_HREF_ATTR);
                if (original) anchor.setAttribute('href', original);
                anchor.removeAttribute(ORIGINAL_HREF_ATTR);
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
            if (!anchor) return;
            const watch = toWatchHref(anchor.getAttribute('href'));
            if (!watch) return;
            event.preventDefault();
            event.stopPropagation();
            location.href = watch;
        } catch (err) { /* ignore */ }
    }

    let shortsObserver = null;
    let shortsRedirectStarted = false;
    let lastCheckedUrl = location.href;

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
            shortsObserver = new MutationObserver((mutations) => {
                let needsUrlCheck = false;
                for (const mutation of mutations) {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'href' && mutation.target && mutation.target.tagName === 'A') {
                        rewriteAnchor(mutation.target);
                    } else if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                        for (const node of mutation.addedNodes) {
                            if (!node || node.nodeType !== 1) continue;
                            if (node.tagName === 'A') {
                                rewriteAnchor(node);
                            } else if (node.querySelectorAll) {
                                scanAndRewrite(node);
                            }
                            needsUrlCheck = true;
                        }
                    } else {
                        needsUrlCheck = true;
                    }
                }
                if (needsUrlCheck || location.href !== lastCheckedUrl) checkUrlChange();
            });
            shortsObserver.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['href'] });
        } catch (err) { /* observer unavailable */ }
    }

    function stopShortsRedirect() {
        shortsRedirectStarted = false;
        lastCheckedUrl = location.href;
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

    document.addEventListener('click', onCaptureClick, true);

    for (const eventName of [...NAV_EVENTS, 'yt-navigate-start', 'popstate']) {
        document.addEventListener(eventName, () => {
            checkUrlChange();
            if (isShortsBehaviorEnabled()) maybeRedirectFromShortsPage();
        });
        try {
            window.addEventListener(eventName, () => {
                checkUrlChange();
                if (isShortsBehaviorEnabled()) maybeRedirectFromShortsPage();
            });
        } catch (err) { /* window unavailable */ }
    }

    try {
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;
        history.pushState = function (...args) {
            const result = originalPushState.apply(this, args);
            setTimeout(checkUrlChange, 0);
            return result;
        };
        history.replaceState = function (...args) {
            const result = originalReplaceState.apply(this, args);
            setTimeout(checkUrlChange, 0);
            return result;
        };
    } catch (err) { /* history patch unavailable */ }

    // Apply defaults synchronously so first paint does not hide
    // opt-out features (e.g. logo) before storage loads.
    applyHiding(cachedStates);
    syncShortsBehavior();

    for (const eventName of NAV_EVENTS) {
        document.addEventListener(eventName, () => applyHiding(cachedStates));
        try {
            window.addEventListener(eventName, () => applyHiding(cachedStates));
        } catch (err) { /* window unavailable */ }
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
