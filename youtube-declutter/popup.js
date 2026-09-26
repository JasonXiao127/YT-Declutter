(function () {
    'use strict';

    const STORAGE_KEY = 'states';
    const FEATURES = Array.isArray(globalThis.YT_DCLTR_FEATURES) ? globalThis.YT_DCLTR_FEATURES : [];
    const DEFAULTS = (globalThis.YT_DCLTR_DEFAULTS && typeof globalThis.YT_DCLTR_DEFAULTS === 'object')
        ? globalThis.YT_DCLTR_DEFAULTS
        : Object.fromEntries(FEATURES.map(feature => [
            feature.key,
            feature.behavior ? !!feature.defaultEnabled : feature.defaultHidden !== false
        ]));

    const listEl = document.getElementById('toggle-list');
    const resetButton = document.getElementById('reset-button');

    function getApi() {
        try {
            if (globalThis.chrome && globalThis.chrome.storage) return globalThis.chrome;
            if (globalThis.browser && globalThis.browser.storage) return globalThis.browser;
        } catch (err) { /* unavailable */ }
        return null;
    }

    let states = { ...DEFAULTS };
    let loaded = false;
    let revealed = false;
    const pendingUserChanges = new Set();

    function reveal() {
        if (revealed) return;
        revealed = true;
        document.body.style.visibility = 'visible';
    }

    function setUiEnabled(enabled) {
        if (listEl) {
            listEl.querySelectorAll('input[type="checkbox"]').forEach((input) => {
                input.disabled = !enabled;
            });
        }
        if (resetButton) resetButton.disabled = !enabled;
    }

    function persist() {
        // Never persist pre-load defaults over real stored values.
        if (!loaded) return;
        const api = getApi();
        if (!api) return;
        try {
            const result = api.storage.local.set({ [STORAGE_KEY]: { ...states } });
            if (result && typeof result.catch === 'function') {
                result.catch((err) => { flagPersistError(); });
            }
        } catch (err) {
            flagPersistError();
        }
    }

    function flagPersistError() {
        // Transient user signal: in-memory state diverged from disk.
        try {
            if (resetButton) {
                const prev = resetButton.textContent;
                resetButton.title = 'Save failed — changes kept for this session only';
                resetButton.dataset.persistError = '1';
                setTimeout(() => {
                    try {
                        if (resetButton.dataset.persistError) {
                            delete resetButton.dataset.persistError;
                            resetButton.title = '';
                            if (resetButton.textContent !== prev && !resetArmed) {
                                resetButton.textContent = 'Reset to Defaults';
                            }
                        }
                    } catch (err) { /* ignore */ }
                }, 3000);
            }
        } catch (err) { /* ignore */ }
    }

    function refreshCheckbox(feature) {
        const input = document.getElementById(`toggle-${feature.key}`);
        if (input) input.checked = !!states[feature.key];
    }

    function refreshAll() {
        FEATURES.forEach(refreshCheckbox);
    }

    function applyStored(stored) {
        if (!stored) return;
        for (const feature of FEATURES) {
            if (typeof stored[feature.key] === 'boolean' && !pendingUserChanges.has(feature.key)) {
                states[feature.key] = stored[feature.key];
            }
        }
    }

    function finishLoad() {
        loaded = true;
        pendingUserChanges.clear();
        refreshAll();
        setUiEnabled(true);
        reveal();
    }

    function buildUi() {
        if (!listEl) return;
        listEl.textContent = '';
        if (FEATURES.length === 0) {
            const empty = document.createElement('p');
            empty.className = 'footer';
            empty.textContent = 'Could not load toggle definitions (features.js missing).';
            listEl.appendChild(empty);
            return;
        }
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
            label.className = 'toggle-label';
            label.textContent = feature.label;
            label.htmlFor = `toggle-${feature.key}`;

            const switchWrap = document.createElement('span');
            switchWrap.className = 'switch';

            const input = document.createElement('input');
            input.type = 'checkbox';
            input.id = `toggle-${feature.key}`;
            input.checked = !!states[feature.key];
            input.disabled = !loaded;
            input.addEventListener('change', () => {
                states[feature.key] = input.checked;
                if (!loaded) {
                    pendingUserChanges.add(feature.key);
                    return;
                }
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
        const api = getApi();
        if (!api) {
            loadFailed();
            return;
        }
        let callbackFired = false;
        const onData = (data) => {
            if (callbackFired) return;
            callbackFired = true;
            if (data && data[STORAGE_KEY]) applyStored(data[STORAGE_KEY]);
            const hadPending = pendingUserChanges.size > 0;
            finishLoad();
            // If the user toggled while loading, their choice wins and is now saved.
            if (hadPending) persist();
        };
        try {
            const result = api.storage.local.get(STORAGE_KEY, (data) => {
                try {
                    if (api.runtime && api.runtime.lastError) {
                        if (!callbackFired) {
                            callbackFired = true;
                            finishLoad();
                        }
                        return;
                    }
                } catch (err) { /* ignore */ }
                onData(data);
            });
            if (result && typeof result.then === 'function') {
                result.then(onData, () => {
                    if (!callbackFired) {
                        callbackFired = true;
                        finishLoad();
                    }
                });
            }
        } catch (err) {
            loadFailed();
            return;
        }
        // Safety net: never leave the popup blank if storage hangs.
        setTimeout(() => {
            if (!callbackFired) {
                callbackFired = true;
                const hadPending = pendingUserChanges.size > 0;
                finishLoad();
                if (hadPending) persist();
            }
        }, 2000);
    }

    function loadFailed() {
        loaded = true;
        pendingUserChanges.clear();
        refreshAll();
        setUiEnabled(true);
        reveal();
    }

    function subscribeToExternalChanges() {
        try {
            const api = getApi();
            if (api && api.storage && api.storage.onChanged) {
                api.storage.onChanged.addListener((changes, namespace) => {
                    if (namespace === 'local' && changes[STORAGE_KEY] && changes[STORAGE_KEY].newValue) {
                        applyStored(changes[STORAGE_KEY].newValue);
                        if (loaded) refreshAll();
                    }
                });
            }
        } catch (err) { /* ignore */ }
    }

    let resetArmed = false;
    let resetTimer = null;
    function disarmReset() {
        resetArmed = false;
        if (resetButton) {
            resetButton.classList.remove('armed');
            resetButton.textContent = 'Reset to Defaults';
        }
        if (resetTimer) {
            clearTimeout(resetTimer);
            resetTimer = null;
        }
    }

    if (resetButton) {
        resetButton.addEventListener('click', () => {
            if (!loaded) return;
            if (!resetArmed) {
                resetArmed = true;
                resetButton.classList.add('armed');
                resetButton.textContent = 'Click again to confirm reset';
                resetTimer = setTimeout(disarmReset, 3000);
                return;
            }
            disarmReset();
            states = { ...DEFAULTS };
            persist();
            refreshAll();
        });
    }

    buildUi();
    setUiEnabled(false);
    subscribeToExternalChanges();
    try {
        loadStates();
    } catch (err) {
        loadFailed();
    }
})();
