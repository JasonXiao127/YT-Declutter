(function () {
    'use strict';

    const STYLE_ID = 'dcltr-style';
    const STORAGE_KEY = 'states';
    const NAV_EVENTS = ['yt-navigate-finish', 'yt-page-data-updated', 'spfdone'];
    const FEATURES = YT_DCLTR_FEATURES;
    const DEFAULTS = YT_DCLTR_DEFAULTS;

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

    NAV_EVENTS.forEach(eventName => {
        document.addEventListener(eventName, () => applyHiding(cachedStates));
    });

    try {
        chrome.storage.local.get(STORAGE_KEY, (data) => {
            if (chrome.runtime.lastError) {
                applyHiding(cachedStates);
                return;
            }
            cachedStates = sanitize(data && data[STORAGE_KEY]);
            applyHiding(cachedStates);
        });
    } catch (err) {
        cachedStates = { ...DEFAULTS };
        applyHiding(cachedStates);
    }

    try {
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'local' && changes[STORAGE_KEY]) {
                cachedStates = sanitize(changes[STORAGE_KEY].newValue);
                applyHiding(cachedStates);
            }
        });
    } catch (err) {
        /* storage unavailable; defaults remain active */
    }
})();
