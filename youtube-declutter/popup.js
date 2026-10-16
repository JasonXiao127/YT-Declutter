(function () {
    'use strict';

    const STORAGE_KEY = 'states';
    const QUALITY_KEY = 'default_quality';
    const COLLAPSE_KEY = 'yt-dcltr-collapsed';
    const GROUP_ORDER = ['Playback', 'Shorts', 'Home / Feed', 'Top Bar', 'Watch Page', 'Search & Channel'];
    const QCORE = (typeof globalThis.YT_DCLTR_QUALITY_CORE === 'object' && globalThis.YT_DCLTR_QUALITY_CORE)
        ? globalThis.YT_DCLTR_QUALITY_CORE
        : null;
    const QUALITY_DEFAULT = (QCORE && typeof QCORE.QUALITY_DEFAULT === 'string')
        ? QCORE.QUALITY_DEFAULT
        : ((typeof globalThis.YT_DCLTR_QUALITY_DEFAULT === 'string')
            ? globalThis.YT_DCLTR_QUALITY_DEFAULT
            : 'hd1080');
    const QUALITY_OPTIONS = (QCORE && Array.isArray(QCORE.QUALITY_OPTIONS))
        ? QCORE.QUALITY_OPTIONS
        : (Array.isArray(globalThis.YT_DCLTR_QUALITY_OPTIONS)
            ? globalThis.YT_DCLTR_QUALITY_OPTIONS
            : [
                { value: 'tiny', label: '144p' },
                { value: 'small', label: '240p' },
                { value: 'medium', label: '360p' },
                { value: 'large', label: '480p' },
                { value: 'hd720', label: '720p' },
                { value: 'hd1080', label: '1080p' },
                { value: 'hd1440', label: '1440p' },
                { value: 'hd2160', label: '2160p (4K)' },
                { value: 'hd4320', label: '4320p (8K)' },
                { value: 'highest', label: 'Highest available' }
            ]);
    const QUALITY_VALUES = QUALITY_OPTIONS.map((o) => o.value);
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
    let preferredQuality = QUALITY_DEFAULT;
    let pendingQuality = null;
    let loaded = false;
    let revealed = false;
    let suppressToggleSave = false;
    let buildFailed = false;
    const pendingUserChanges = new Set();
    let collapsedGroups = loadCollapsed();
    const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

    function isSafeKey(key) {
        return typeof key === 'string' && /^[a-z0-9_]+$/.test(key) && !FORBIDDEN_KEYS.has(key);
    }

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

    function reveal() {
        if (revealed) return;
        revealed = true;
        document.body.style.visibility = 'visible';
    }

    function setUiEnabled(enabled) {
        if (listEl) {
            listEl.querySelectorAll('input[type="checkbox"]').forEach((input) => {
                if (input.id === 'toggle-quality_premium' && states.quality_enabled === false) {
                    input.disabled = true;
                    return;
                }
                input.disabled = !enabled;
            });
            const select = document.getElementById('quality-select');
            if (select) select.disabled = !enabled || !states.quality_enabled;
            listEl.querySelectorAll('.group-actions .link-button').forEach((btn) => {
                btn.disabled = !enabled;
            });
        }
        if (resetButton) resetButton.disabled = !enabled;
        if (enableAllButton) enableAllButton.disabled = !enabled;
        if (disableAllButton) disableAllButton.disabled = !enabled;
        syncQualityUi();
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

    function persistQuality() {
        if (!loaded) return;
        const api = getApi();
        if (!api) return;
        try {
            const result = api.storage.local.set({ [QUALITY_KEY]: preferredQuality });
            if (result && typeof result.catch === 'function') {
                result.catch((err) => { flagPersistError(); });
            }
        } catch (err) {
            flagPersistError();
        }
    }

    function persistAll() {
        if (!loaded) return;
        const api = getApi();
        if (!api) return;
        try {
            const result = api.storage.local.set({
                [STORAGE_KEY]: { ...states },
                [QUALITY_KEY]: preferredQuality
            });
            if (result && typeof result.catch === 'function') {
                result.catch((err) => { flagPersistError(); });
            }
        } catch (err) {
            flagPersistError();
        }
    }

    function flagPersistError() {
        // Visible user signal: in-memory state diverged from disk.
        try {
            if (resetButton) {
                resetButton.title = 'Save failed — changes kept for this session only';
                resetButton.dataset.persistError = '1';
                if (!resetArmed) {
                    resetButton.textContent = 'Save failed — retry?';
                }
                setTimeout(() => {
                    try {
                        if (resetButton.dataset.persistError) {
                            delete resetButton.dataset.persistError;
                            resetButton.title = '';
                            if (!resetArmed) {
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
            input.disabled = !loaded;
        }
    }

    function syncChildToggles() {
        FEATURES.filter((f) => f.parent).forEach((child) => {
            const input = document.getElementById(`toggle-${child.key}`);
            if (!input) return;
            const parentOff = child.parent && !states[child.parent];
            input.disabled = !loaded || !!parentOff;
            const row = input.closest('.toggle-row');
            if (row) row.classList.toggle('child-disabled', !!parentOff);
        });
    }

    function syncQualityUi() {
        const select = document.getElementById('quality-select');
        if (select) {
            if (select.value !== preferredQuality) select.value = preferredQuality;
            select.disabled = !loaded || !states.quality_enabled;
            const row = select.closest('.toggle-row');
            if (row) row.classList.toggle('child-disabled', !states.quality_enabled);
        }
        const premiumInput = document.getElementById('toggle-quality_premium');
        if (premiumInput) {
            premiumInput.disabled = !loaded || !states.quality_enabled;
        }
    }

    function refreshAll() {
        for (const feature of FEATURES) refreshCheckbox(feature);
        syncChildToggles();
        syncQualityUi();
        updateCounts();
    }

    function applyStored(stored) {
        if (!stored || typeof stored !== 'object') return;
        for (const feature of FEATURES) {
            if (!isSafeKey(feature.key)) continue;
            if (typeof stored[feature.key] === 'boolean' && !pendingUserChanges.has(feature.key)) {
                states[feature.key] = stored[feature.key];
            }
        }
    }

    function applyQualityStored(value) {
        if (pendingQuality !== null) return; // pre-load user choice wins
        if (typeof value === 'string') preferredQuality = sanitizeQuality(value);
    }

    function finishLoad() {
        loaded = true;
        pendingUserChanges.clear();
        const hadPendingQuality = pendingQuality !== null;
        if (hadPendingQuality) preferredQuality = pendingQuality;
        pendingQuality = null;
        refreshAll();
        setUiEnabled(true);
        applySearchFilter();
        reveal();
        return hadPendingQuality;
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
        let changed = false;
        if (!enabled) {
            for (const f of FEATURES) {
                if (!!states[f.key] !== false) {
                    states[f.key] = false;
                    changed = true;
                }
            }
        } else {
            // Pass 1: parents and standalone features first (order-independent).
            for (const f of FEATURES) {
                if (!f.parent && !states[f.key]) {
                    states[f.key] = true;
                    changed = true;
                }
            }
            // Pass 2: children whose parent is now on.
            for (const f of FEATURES) {
                if (f.parent && states[f.parent] && !states[f.key]) {
                    states[f.key] = true;
                    changed = true;
                }
            }
        }
        if (!changed) return;
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
            if (noResults) noResults.hidden = true;
            updateCounts();
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
                // Don't persist transient auto-expands during search or
                // programmatic restores from applySearchFilter.
                if (suppressToggleSave || currentQuery()) return;
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
            sep.setAttribute('aria-hidden', 'true');
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
                let descId = '';
                if (feature.description) {
                    const desc = document.createElement('span');
                    desc.className = 'toggle-desc';
                    desc.textContent = feature.description;
                    descId = `desc-${feature.key}`;
                    desc.id = descId;
                    textWrap.appendChild(desc);
                }

                const switchWrap = document.createElement('label');
                switchWrap.className = 'switch';

                const input = document.createElement('input');
                input.type = 'checkbox';
                input.id = `toggle-${feature.key}`;
                input.checked = !!states[feature.key];
                input.disabled = !loaded;
                if (feature.parent) input.dataset.parent = feature.parent;
                if (descId) input.setAttribute('aria-describedby', descId);
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
                slider.setAttribute('aria-hidden', 'true');

                switchWrap.append(input, slider);
                row.append(textWrap, switchWrap);
                details.appendChild(row);
            }

            if (group === 'Playback') injectQualityRow(details);

            listEl.appendChild(details);
        }
        updateCounts();
        syncChildToggles();
        syncQualityUi();
    }

    function injectQualityRow(details) {
        try {
            if (!details || details.querySelector('[data-key="default_quality"]')) return;
            const row = document.createElement('div');
            row.className = 'toggle-row';
            row.dataset.key = 'default_quality';
            row.dataset.search = [
                'default quality',
                'preferred resolution',
                'playback quality resolution 144p 240p 360p 480p 720p 1080p 1440p 2160p 4k 4320p 8k highest available premium enhanced bitrate',
                'playback'
            ].join(' ').toLowerCase();

            const textWrap = document.createElement('div');
            textWrap.className = 'toggle-text';
            const label = document.createElement('label');
            label.className = 'toggle-label';
            label.textContent = 'Preferred resolution';
            label.htmlFor = 'quality-select';
            const desc = document.createElement('span');
            desc.className = 'toggle-desc';
            desc.textContent = 'Videos start here when available, otherwise the closest lower resolution. 1080p by default.';
            desc.id = 'desc-default_quality';
            textWrap.appendChild(label);
            textWrap.appendChild(desc);

            const select = document.createElement('select');
            select.id = 'quality-select';
            select.className = 'quality-select';
            select.setAttribute('aria-describedby', 'desc-default_quality');
            for (const opt of QUALITY_OPTIONS) {
                const el = document.createElement('option');
                el.value = opt.value;
                el.textContent = opt.label;
                select.appendChild(el);
            }
            select.value = preferredQuality;
            select.disabled = !loaded || !states.quality_enabled;
            select.addEventListener('change', () => {
                const next = sanitizeQuality(select.value);
                select.value = next;
                preferredQuality = next;
                if (!loaded) {
                    pendingQuality = next;
                    return;
                }
                persistQuality();
            });

            row.append(textWrap, select);
            const masterRow = details.querySelector('[data-key="quality_enabled"]');
            if (masterRow && masterRow.nextSibling) {
                details.insertBefore(row, masterRow.nextSibling);
            } else {
                details.appendChild(row);
            }
        } catch (err) { /* ignore */ }
    }

    function currentQuery() {
        return searchInput ? searchInput.value.trim().toLowerCase() : '';
    }

    function matchesQuery(searchText, query) {
        if (!query) return true;
        const hay = searchText || '';
        // Tokenized AND-match so "hide comments" finds "comments".
        const tokens = query.split(/\s+/).filter(Boolean);
        for (const tok of tokens) {
            if (!hay.includes(tok)) return false;
        }
        return true;
    }

    function applySearchFilter() {
        const query = currentQuery();
        if (searchClear) searchClear.hidden = !query;
        if (FEATURES.length === 0) {
            if (noResults) noResults.hidden = true;
            return;
        }
        if (buildFailed) {
            if (noResults) noResults.hidden = true;
            return;
        }
        let visibleRows = 0;
        // Suppress toggle-event saves for programmatic open changes.
        // Reset async so toggle events queued in the same task are also
        // covered; the window is one task so genuine user toggles after
        // the filter returns are still persisted.
        suppressToggleSave = true;
        try {
            if (listEl) {
                listEl.querySelectorAll('details.group').forEach((details) => {
                    let groupVisible = 0;
                    details.querySelectorAll('.toggle-row').forEach((row) => {
                        const match = matchesQuery(row.dataset.search || '', query);
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
        } finally {
            setTimeout(() => { suppressToggleSave = false; }, 0);
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
            if (data) applyQualityStored(data[QUALITY_KEY]);
            const hadPending = pendingUserChanges.size > 0;
            const hadPendingQuality = finishLoad();
            // If the user toggled while loading, their choice wins and is now saved.
            if (hadPending) persist();
            if (hadPendingQuality) persistQuality();
        };
        try {
            const result = api.storage.local.get([STORAGE_KEY, QUALITY_KEY], (data) => {
                try {
                    if (api.runtime && api.runtime.lastError) {
                        if (!callbackFired) {
                            callbackFired = true;
                            const hadPending = pendingUserChanges.size > 0;
                            const hadPendingQuality = finishLoad();
                            if (hadPending) persist();
                            if (hadPendingQuality) persistQuality();
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
                        const hadPending = pendingUserChanges.size > 0;
                        const hadPendingQuality = finishLoad();
                        if (hadPending) persist();
                        if (hadPendingQuality) persistQuality();
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
                const hadPendingQuality = finishLoad();
                if (hadPending) persist();
                if (hadPendingQuality) persistQuality();
            }
        }, 2000);
    }

    function loadFailed() {
        loaded = true;
        pendingUserChanges.clear();
        pendingQuality = null;
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
                    if (namespace !== 'local') return;
                    let touched = false;
                    if (changes[STORAGE_KEY]) {
                        if (changes[STORAGE_KEY].newValue) {
                            applyStored(changes[STORAGE_KEY].newValue);
                        } else {
                            // Key deleted: fall back to defaults (matches content.js).
                            states = { ...DEFAULTS };
                            pendingUserChanges.clear();
                        }
                        touched = true;
                    }
                    if (changes[QUALITY_KEY]) {
                        if (changes[QUALITY_KEY].newValue === undefined) {
                            preferredQuality = QUALITY_DEFAULT;
                            pendingQuality = null;
                        } else {
                            applyQualityStored(changes[QUALITY_KEY].newValue);
                            if (loaded && pendingQuality === null) {
                                preferredQuality = sanitizeQuality(changes[QUALITY_KEY].newValue);
                            }
                        }
                        touched = true;
                    }
                    if (touched && loaded) {
                        refreshAll();
                        applySearchFilter();
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
            preferredQuality = QUALITY_DEFAULT;
            pendingUserChanges.clear();
            pendingQuality = null;
            persistAll();
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
                // Let empty-Escape close the popup; only hijack to clear text.
                if (!currentQuery()) return;
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

    try {
        buildUi();
    } catch (err) {
        buildFailed = true;
        try {
            if (listEl) {
                listEl.textContent = '';
                const empty = document.createElement('p');
                empty.className = 'footer';
                empty.textContent = 'Could not load settings. Try reopening the popup.';
                listEl.appendChild(empty);
            }
        } catch (ignored) { /* ignore */ }
    }
    try {
        setUiEnabled(false);
    } catch (err) { /* ignore */ }
    try {
        applySearchFilter();
    } catch (err) { /* ignore */ }
    subscribeToExternalChanges();
    try {
        loadStates();
    } catch (err) {
        loadFailed();
    }
})();
