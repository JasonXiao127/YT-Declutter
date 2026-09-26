(function () {
    'use strict';

    const STORAGE_KEY = 'states';
    const COLLAPSE_KEY = 'yt-dcltr-collapsed';
    const GROUP_ORDER = ['Shorts', 'Home / Feed', 'Top Bar', 'Watch Page', 'Search & Channel'];
    const FEATURES = Array.isArray(globalThis.YT_DCLTR_FEATURES) ? globalThis.YT_DCLTR_FEATURES : [];
    const DEFAULTS = (globalThis.YT_DCLTR_DEFAULTS && typeof globalThis.YT_DCLTR_DEFAULTS === 'object')
        ? globalThis.YT_DCLTR_DEFAULTS
        : Object.fromEntries(FEATURES.map(feature => [
            feature.key,
            feature.behavior ? !!feature.defaultEnabled : feature.defaultHidden !== false
        ]));

    const listEl = document.getElementById('toggle-list');
    const resetButton = document.getElementById('reset-button');
    const enableAllButton = document.getElementById('enable-all');
    const disableAllButton = document.getElementById('disable-all');
    const searchInput = document.getElementById('search-input');
    const searchClear = document.getElementById('search-clear');
    const enabledCount = document.getElementById('enabled-count');
    const noResults = document.getElementById('no-results');
    const noResultsClear = document.getElementById('no-results-clear');

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
    let collapsedGroups = loadCollapsed();

    function loadCollapsed() {
        try {
            const raw = localStorage.getItem(COLLAPSE_KEY);
            if (!raw) return {};
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch (err) {
            return {};
        }
    }

    function saveCollapsed() {
        try {
            localStorage.setItem(COLLAPSE_KEY, JSON.stringify(collapsedGroups));
        } catch (err) { /* ignore */ }
    }

    function reveal() {
        if (revealed) return;
        revealed = true;
        document.body.style.visibility = 'visible';
    }

    function setUiEnabled(enabled) {
        if (listEl) {
            listEl.querySelectorAll('input[type="checkbox"]').forEach((input) => {
                // Child toggle stays disabled when its parent is off.
                if (input.dataset.parent && !states[input.dataset.parent]) {
                    input.disabled = true;
                    return;
                }
                input.disabled = !enabled;
            });
        }
        if (resetButton) resetButton.disabled = !enabled;
        if (enableAllButton) enableAllButton.disabled = !enabled;
        if (disableAllButton) disableAllButton.disabled = !enabled;
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

    function searchableText(feature) {
        return [
            feature.label || '',
            feature.description || '',
            feature.keywords || '',
            feature.group || '',
            feature.key || ''
        ].join(' ').toLowerCase();
    }

    function updateCounts() {
        const total = FEATURES.length;
        const on = FEATURES.filter((f) => !!states[f.key]).length;
        if (enabledCount) enabledCount.textContent = total ? `${on}/${total} on` : '';
        // Per-group badges.
        if (listEl) {
            listEl.querySelectorAll('details.group').forEach((details) => {
                const badge = details.querySelector('.group-count');
                if (!badge) return;
                const keys = (details.dataset.keys || '').split(',').filter(Boolean);
                const n = keys.filter((k) => !!states[k]).length;
                badge.textContent = `${n}/${keys.length}`;
            });
        }
    }

    function refreshCheckbox(feature) {
        const input = document.getElementById(`toggle-${feature.key}`);
        if (input) {
            input.checked = !!states[feature.key];
            // Enforce parent dependency for nested child toggles.
            if (input.dataset.parent && !states[input.dataset.parent]) {
                input.disabled = true;
            } else if (loaded) {
                input.disabled = false;
            }
        }
        updateCounts();
        if (feature.key === 'shorts') syncChildToggles();
    }

    function syncChildToggles() {
        FEATURES.filter((f) => f.parent).forEach((child) => {
            const input = document.getElementById(`toggle-${child.key}`);
            if (!input) return;
            const parentOn = !!states[child.parent];
            input.disabled = !loaded || !parentOn;
            const row = input.closest('.toggle-row');
            if (row) row.classList.toggle('child-disabled', !parentOn);
        });
    }

    function refreshAll() {
        FEATURES.forEach(refreshCheckbox);
        syncChildToggles();
        updateCounts();
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
        applySearchFilter();
        reveal();
    }

    function groupsInOrder() {
        const seen = [];
        for (const f of FEATURES) {
            if (!seen.includes(f.group)) seen.push(f.group);
        }
        return [
            ...GROUP_ORDER.filter((g) => seen.includes(g)),
            ...seen.filter((g) => !GROUP_ORDER.includes(g))
        ];
    }

    function setGroupEnabled(group, enabled) {
        if (!loaded) return;
        let changed = false;
        if (!enabled) {
            for (const f of FEATURES) {
                if (f.group !== group) continue;
                if (!!states[f.key] !== false) {
                    states[f.key] = false;
                    changed = true;
                }
            }
        } else {
            // Pass 1: parents and standalone features first (order-independent).
            for (const f of FEATURES) {
                if (f.group !== group || f.parent) continue;
                if (!states[f.key]) {
                    states[f.key] = true;
                    changed = true;
                }
            }
            // Pass 2: children whose parent is now on.
            for (const f of FEATURES) {
                if (f.group !== group || !f.parent) continue;
                if (!states[f.parent]) continue;
                if (!states[f.key]) {
                    states[f.key] = true;
                    changed = true;
                }
            }
        }
        if (changed) {
            persist();
            refreshAll();
            applySearchFilter();
        }
    }

    function setAllEnabled(enabled) {
        if (!loaded) return;
        if (!enabled) {
            for (const f of FEATURES) states[f.key] = false;
        } else {
            // Pass 1: parents and standalone features first (order-independent).
            for (const f of FEATURES) {
                if (!f.parent) states[f.key] = true;
            }
            // Pass 2: children whose parent is now on.
            for (const f of FEATURES) {
                if (f.parent && states[f.parent]) states[f.key] = true;
            }
        }
        persist();
        refreshAll();
        applySearchFilter();
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
        const query = currentQuery();
        for (const group of groupsInOrder()) {
            const groupFeatures = FEATURES.filter((f) => f.group === group);
            if (groupFeatures.length === 0) continue;

            const details = document.createElement('details');
            details.className = 'group';
            details.dataset.group = group;
            details.dataset.keys = groupFeatures.map((f) => f.key).join(',');
            details.open = query ? true : !collapsedGroups[group];
            details.addEventListener('toggle', () => {
                // Don't persist transient auto-expands during search.
                if (currentQuery()) return;
                if (details.open) delete collapsedGroups[group];
                else collapsedGroups[group] = true;
                saveCollapsed();
            });

            const summary = document.createElement('summary');
            summary.className = 'group-header';

            const nameWrap = document.createElement('span');
            nameWrap.className = 'group-name';
            const caret = document.createElement('span');
            caret.className = 'group-caret';
            caret.setAttribute('aria-hidden', 'true');
            const name = document.createElement('span');
            name.textContent = group;
            const badge = document.createElement('span');
            badge.className = 'group-count';
            nameWrap.append(caret, name, badge);

            const groupActions = document.createElement('span');
            groupActions.className = 'group-actions';
            const allBtn = document.createElement('button');
            allBtn.type = 'button';
            allBtn.className = 'link-button';
            allBtn.textContent = 'All';
            allBtn.setAttribute('aria-label', `Enable all in ${group}`);
            allBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                setGroupEnabled(group, true);
            });
            const sep = document.createElement('span');
            sep.className = 'group-actions-sep';
            sep.textContent = '·';
            const noneBtn = document.createElement('button');
            noneBtn.type = 'button';
            noneBtn.className = 'link-button';
            noneBtn.textContent = 'None';
            noneBtn.setAttribute('aria-label', `Disable all in ${group}`);
            noneBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                setGroupEnabled(group, false);
            });
            groupActions.append(allBtn, sep, noneBtn);

            summary.append(nameWrap, groupActions);
            details.appendChild(summary);

            for (const feature of groupFeatures) {
                const row = document.createElement('div');
                row.className = 'toggle-row' + (feature.parent ? ' toggle-child' : '');
                row.dataset.key = feature.key;
                row.dataset.search = searchableText(feature);

                const textWrap = document.createElement('div');
                textWrap.className = 'toggle-text';

                const label = document.createElement('label');
                label.className = 'toggle-label';
                label.textContent = feature.label;
                label.htmlFor = `toggle-${feature.key}`;
                textWrap.appendChild(label);
                if (feature.description) {
                    const desc = document.createElement('span');
                    desc.className = 'toggle-desc';
                    desc.textContent = feature.description;
                    textWrap.appendChild(desc);
                }

                const switchWrap = document.createElement('span');
                switchWrap.className = 'switch';

                const input = document.createElement('input');
                input.type = 'checkbox';
                input.id = `toggle-${feature.key}`;
                input.checked = !!states[feature.key];
                input.disabled = !loaded;
                if (feature.parent) input.dataset.parent = feature.parent;
                input.setAttribute('aria-label', feature.label);
                input.addEventListener('change', () => {
                    states[feature.key] = input.checked;
                    if (!loaded) {
                        pendingUserChanges.add(feature.key);
                        return;
                    }
                    persist();
                    refreshAll();
                    applySearchFilter();
                });

                const slider = document.createElement('span');
                slider.className = 'slider';

                switchWrap.append(input, slider);
                row.append(textWrap, switchWrap);
                details.appendChild(row);
            }

            listEl.appendChild(details);
        }
        updateCounts();
        syncChildToggles();
    }

    function currentQuery() {
        return searchInput ? searchInput.value.trim().toLowerCase() : '';
    }

    function applySearchFilter() {
        const query = currentQuery();
        if (searchClear) searchClear.hidden = !query;
        let visibleRows = 0;
        if (listEl) {
            listEl.querySelectorAll('details.group').forEach((details) => {
                let groupVisible = 0;
                details.querySelectorAll('.toggle-row').forEach((row) => {
                    const match = !query || (row.dataset.search || '').includes(query);
                    row.style.display = match ? '' : 'none';
                    if (match) {
                        groupVisible += 1;
                        visibleRows += 1;
                    }
                });
                const groupHidden = groupVisible === 0;
                details.style.display = groupHidden ? 'none' : '';
                // Auto-expand groups with matches while searching.
                if (query) {
                    details.open = true;
                } else {
                    details.open = !collapsedGroups[details.dataset.group];
                }
            });
        }
        if (noResults) noResults.hidden = visibleRows !== 0;
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
        applySearchFilter();
        reveal();
    }

    function subscribeToExternalChanges() {
        try {
            const api = getApi();
            if (api && api.storage && api.storage.onChanged) {
                api.storage.onChanged.addListener((changes, namespace) => {
                    if (namespace === 'local' && changes[STORAGE_KEY] && changes[STORAGE_KEY].newValue) {
                        applyStored(changes[STORAGE_KEY].newValue);
                        if (loaded) {
                            refreshAll();
                            applySearchFilter();
                        }
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
            applySearchFilter();
        });
    }

    if (enableAllButton) {
        enableAllButton.addEventListener('click', () => setAllEnabled(true));
    }
    if (disableAllButton) {
        disableAllButton.addEventListener('click', () => setAllEnabled(false));
    }

    function clearSearch() {
        if (!searchInput) return;
        searchInput.value = '';
        applySearchFilter();
        searchInput.focus();
    }

    if (searchInput) {
        searchInput.addEventListener('input', applySearchFilter);
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                clearSearch();
            }
        });
    }
    if (searchClear) {
        searchClear.addEventListener('click', clearSearch);
    }
    if (noResultsClear) {
        noResultsClear.addEventListener('click', clearSearch);
    }

    buildUi();
    setUiEnabled(false);
    applySearchFilter();
    subscribeToExternalChanges();
    try {
        loadStates();
    } catch (err) {
        loadFailed();
    }
})();
