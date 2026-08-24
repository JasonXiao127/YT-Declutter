(function () {
    'use strict';

    const STORAGE_KEY = 'states';
    const FEATURES = YT_DCLTR_FEATURES;
    const DEFAULTS = YT_DCLTR_DEFAULTS;

    const listEl = document.getElementById('toggle-list');
    const resetButton = document.getElementById('reset-button');

    let states = { ...DEFAULTS };
    let loaded = false;
    const pendingUserChanges = new Set();

    function persist() {
        try {
            chrome.storage.local.set({ [STORAGE_KEY]: { ...states } });
        } catch (err) {
            /* extension context invalidated; nothing to save */
        }
    }

    function refreshCheckbox(feature) {
        const input = document.getElementById(`toggle-${feature.key}`);
        if (input) input.checked = states[feature.key];
    }

    function buildUi() {
        let currentGroup = null;
        for (const feature of FEATURES) {
            if (feature.group !== currentGroup) {
                currentGroup = feature.group;
                const header = document.createElement('h2');
                header.className = 'group-header';
                header.textContent = currentGroup;
                listEl.appendChild(header);
            }

            const row = document.createElement('div');
            row.className = 'toggle-row';

            const label = document.createElement('label');
            label.textContent = feature.label;
            label.htmlFor = `toggle-${feature.key}`;

            const switchWrap = document.createElement('label');
            switchWrap.className = 'switch';

            const input = document.createElement('input');
            input.type = 'checkbox';
            input.id = `toggle-${feature.key}`;
            input.checked = states[feature.key];
            input.addEventListener('change', () => {
                states[feature.key] = input.checked;
                if (!loaded) pendingUserChanges.add(feature.key);
                persist();
            });

            const slider = document.createElement('span');
            slider.className = 'slider';

            switchWrap.append(input, slider);
            row.append(label, switchWrap);
            listEl.appendChild(row);
        }
    }

    function loadStates() {
        let storage;
        try {
            storage = chrome.storage.local;
        } catch (err) {
            loaded = true;
            return;
        }
        storage.get(STORAGE_KEY, (data) => {
            if (!chrome.runtime.lastError && data && data[STORAGE_KEY]) {
                const stored = data[STORAGE_KEY];
                for (const feature of FEATURES) {
                    if (
                        typeof stored[feature.key] === 'boolean' &&
                        !pendingUserChanges.has(feature.key)
                    ) {
                        states[feature.key] = stored[feature.key];
                    }
                }
            }
            loaded = true;
            FEATURES.forEach(refreshCheckbox);
        });
    }

    function loadFailed() {
        loaded = true;
        FEATURES.forEach(refreshCheckbox);
    }

    resetButton.addEventListener('click', () => {
        if (!confirm('Reset all toggles to their defaults?')) return;
        states = { ...DEFAULTS };
        if (!loaded) FEATURES.forEach(f => pendingUserChanges.add(f.key));
        persist();
        FEATURES.forEach(refreshCheckbox);
    });

    buildUi();
    document.body.style.visibility = 'visible';
    try {
        chrome.runtime.getManifest();
        loadStates();
    } catch (err) {
        loadFailed();
    }
})();
