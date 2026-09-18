(function () {
    'use strict';

    const STYLE_ID = 'dcltr-style';
    const STORAGE_KEY = 'states';
    const NAV_EVENTS = ['yt-navigate-finish', 'yt-page-data-updated'];
    const FEATURES = Array.isArray(globalThis.YT_DCLTR_FEATURES) ? globalThis.YT_DCLTR_FEATURES : [];
    const DEFAULTS = (globalThis.YT_DCLTR_DEFAULTS && typeof globalThis.YT_DCLTR_DEFAULTS === 'object')
        ? globalThis.YT_DCLTR_DEFAULTS
        : Object.fromEntries(FEATURES.map(feature => [feature.key, feature.defaultHidden !== false]));

    function getStorageArea() {
        try {
            const api = globalThis.chrome ?? globalThis.browser;
            if (api && api.storage && api.storage.local) return api.storage.local;
        } catch (err) { /* unavailable */ }
        return null;
    }

    function buildCss() {
        return FEATURES.map(feature =>
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

    // Apply defaults synchronously so first paint does not hide
    // opt-out features (e.g. logo) before storage loads.
    applyHiding(cachedStates);

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
        };
        const applyCurrent = () => {
            if (settled) return;
            settled = true;
            applyHiding(cachedStates);
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
        }

        try {
            const api = globalThis.chrome ?? globalThis.browser;
            if (api && api.storage && api.storage.onChanged) {
                api.storage.onChanged.addListener((changes, namespace) => {
                    if (namespace === 'local' && changes[STORAGE_KEY]) {
                        cachedStates = sanitize(changes[STORAGE_KEY].newValue);
                        applyHiding(cachedStates);
                    }
                });
            }
        } catch (err) {
            /* storage events unavailable; defaults remain active */
        }
    }
})();
