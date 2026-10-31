(function () {
    'use strict';

    const STORAGE_KEY = 'states';
    const QUALITY_KEY = 'default_quality';
    const COLLAPSE_KEY = 'yt-dcltr-collapsed';
    const UPDATE_API_URL = 'https://api.github.com/repos/JasonXiao127/YT-Declutter/releases/latest';
    const RELEASES_PAGE_URL = 'https://github.com/JasonXiao127/YT-Declutter/releases';
    const UPDATE_CACHE_KEY = 'update_check';
    const UPDATE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
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
    const FEATURE_BY_KEY = Object.fromEntries(FEATURES.map((feature) => [feature.key, feature]));
    // Monk Mode is a layer, not a toggle: it never renders as a row and is
    // excluded from counts, badges, search, and bulk All/None. Its preset
    // forces fixed values while active; stored states are never overwritten.
    const TOGGLE_FEATURES = FEATURES.filter((f) => !f || f.mode !== true);
    const MONK_FEATURE = FEATURES.find((f) => f && f.mode === true) || null;
    const MONK_PRESET = (MONK_FEATURE && MONK_FEATURE.preset && typeof MONK_FEATURE.preset === 'object')
        ? MONK_FEATURE.preset
        : {};
    const MONK_PRESET_KEYS = Object.keys(MONK_PRESET);

    // Opt-in = off by default because it is destructive (home feed, full
    // masthead) or needs Premium / a different watching mode. Bulk All never
    // turns these on; the user has to choose each one. The mode card itself
    // is never an opt-in: it is excluded from bulk actions entirely.
    function isOptIn(feature) {
        if (!feature || feature.mode === true) return false;
        if (feature.defaultHidden === false) return true;
        return !!feature.behavior && feature.defaultEnabled === false;
    }

    function toggleFeatures() {
        return TOGGLE_FEATURES;
    }

    function isMonkOn() {
        try {
            return !!states['monk_mode'];
        } catch (err) {
            return false;
        }
    }

    // Effective value shown while the mode is active: the preset wins over
    // the stored toggle. Untouched keys (quality, info panels, ...) and the
    // inactive mode fall through to the stored state.
    function resolveEffective(base) {
        try {
            const src = base || states;
            if (!src || !src['monk_mode']) return { ...src };
            const eff = { ...src };
            for (const key of MONK_PRESET_KEYS) eff[key] = !!MONK_PRESET[key];
            return eff;
        } catch (err) {
            return { ...(base || states) };
        }
    }

    function effectiveIsOn(key, eff) {
        try {
            const snap = eff || resolveEffective();
            if (!snap[key]) return false;
            const feature = FEATURE_BY_KEY[key];
            return !feature || !feature.parent || !!snap[feature.parent];
        } catch (err) {
            return false;
        }
    }

    const listEl = document.getElementById('toggle-list');
    const resetButton = document.getElementById('reset-button');
    const enableAllButton = document.getElementById('enable-all');
    const disableAllButton = document.getElementById('disable-all');
    const searchInput = document.getElementById('search-input');
    const searchClear = document.getElementById('search-clear');
    const enabledCount = document.getElementById('enabled-count');
    const noResults = document.getElementById('no-results');
    const noResultsClear = document.getElementById('no-results-clear');
    const persistErrorEl = document.getElementById('persist-error');
    const versionLabel = document.getElementById('version-label');
    const updateStatus = document.getElementById('update-status');
    const monkCard = document.getElementById('monk-card');
    const monkButton = document.getElementById('monk-button');
    const monkStatus = document.getElementById('monk-status');

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
    // True once the popup saved anything post-load: a late storage read
    // must not overwrite the user's newer choices.
    let savedAfterLoad = false;
    // True while the UI runs on the storage-fallback snapshot. Writes are
    // deferred until the real read arrives, then merged with user edits.
    let fallbackActive = false;
    // Track each storage key separately: a successful quality write must not
    // hide an alert about a failed states write (or vice versa).
    let statesSaveFailed = false;
    let qualitySaveFailed = false;
    // Monotonic write ids per key: a slow earlier write resolving after a
    // newer one must not clear (or set) the banner for the newer state.
    let statesSaveSeq = 0;
    let qualitySaveSeq = 0;
    // Depth, not boolean: stacked rapid filters schedule overlapping
    // clears and the first must not release while a later batch is queued.
    let suppressDepth = 0;
    let resetArmed = false;
    let resetTimer = null;
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
        if (monkButton) monkButton.disabled = !enabled;
        syncQualityUi();
        syncMonkUi();
    }

    // While Monk Mode is active the preset keys show their forced state and
    // cannot be flipped; group All/None and global Enable all are parked
    // (they would fight the preset). Disable all and Reset stay available
    // as exits: both clear the mode along with everything else.
    function syncMonkUi() {
        try {
            const monk = isMonkOn();
            if (monkCard) monkCard.classList.toggle('monk-active', monk);
            if (monkButton) {
                monkButton.textContent = monk ? 'Exit Monk Mode' : 'Enter Monk Mode';
                monkButton.setAttribute('aria-pressed', monk ? 'true' : 'false');
            }
            if (monkStatus) {
                monkStatus.textContent = monk
                    ? `On · ${MONK_PRESET_KEYS.length} settings locked`
                    : '';
            }
            if (listEl) {
                for (const feature of TOGGLE_FEATURES) {
                    const input = document.getElementById(`toggle-${feature.key}`);
                    if (!input) continue;
                    const locked = monk && Object.prototype.hasOwnProperty.call(MONK_PRESET, feature.key);
                    const row = input.closest('.toggle-row');
                    if (locked) {
                        input.checked = !!MONK_PRESET[feature.key];
                        input.disabled = true;
                        if (row) {
                            row.classList.add('monk-locked');
                            row.title = 'Controlled by Monk Mode — exit Monk Mode to change this.';
                        }
                    } else if (row) {
                        row.classList.remove('monk-locked');
                        row.removeAttribute('title');
                    }
                }
                // Re-assert child gating for unlocked rows (quality child).
                syncChildToggles();
                if (monk) {
                    listEl.querySelectorAll('.group-actions .link-button').forEach((btn) => {
                        btn.disabled = true;
                    });
                } else if (loaded) {
                    // Exiting the mode must hand the shortcuts back.
                    listEl.querySelectorAll('.group-actions .link-button').forEach((btn) => {
                        btn.disabled = false;
                    });
                }
            }
            if (enableAllButton) enableAllButton.disabled = monk ? true : !loaded;
        } catch (err) { /* never break the popup for the mode card */ }
    }

    function persist() {
        // Never persist pre-load defaults over real stored values.
        if (!loaded) return;
        // Storage fallback: the stored values were never read. Keep edits in
        // memory and let the late real read merge them; writing now would
        // replace every saved setting with the defaults snapshot.
        if (fallbackActive) return;
        const api = getApi();
        if (!api) return;
        savedAfterLoad = true;
        const seq = ++statesSaveSeq;
        const ok = () => { if (seq === statesSaveSeq) markSave('states', false); };
        const fail = () => { if (seq === statesSaveSeq) markSave('states', true); };
        try {
            const result = api.storage.local.set({ [STORAGE_KEY]: { ...states } }, function () {
                try {
                    if (api.runtime && api.runtime.lastError) fail();
                    else ok();
                } catch (err) { fail(); }
            });
            if (result && typeof result.then === 'function') {
                result.then(ok, fail);
            }
        } catch (err) {
            fail();
        }
    }

    function persistQuality() {
        if (!loaded) return;
        if (fallbackActive) return;
        const api = getApi();
        if (!api) return;
        savedAfterLoad = true;
        const seq = ++qualitySaveSeq;
        const ok = () => { if (seq === qualitySaveSeq) markSave('quality', false); };
        const fail = () => { if (seq === qualitySaveSeq) markSave('quality', true); };
        try {
            const result = api.storage.local.set({ [QUALITY_KEY]: preferredQuality }, function () {
                try {
                    if (api.runtime && api.runtime.lastError) fail();
                    else ok();
                } catch (err) { fail(); }
            });
            if (result && typeof result.then === 'function') {
                result.then(ok, fail);
            }
        } catch (err) {
            fail();
        }
    }

    function persistAll() {
        if (!loaded) return;
        if (fallbackActive) return;
        const api = getApi();
        if (!api) return;
        savedAfterLoad = true;
        const statesSeq = ++statesSaveSeq;
        const qualitySeq = ++qualitySaveSeq;
        const ok = () => {
            if (statesSeq === statesSaveSeq) markSave('states', false);
            if (qualitySeq === qualitySaveSeq) markSave('quality', false);
            if (statesSeq === statesSaveSeq && qualitySeq === qualitySaveSeq) clearStorageMessage();
        };
        const fail = () => {
            if (statesSeq === statesSaveSeq) markSave('states', true);
            if (qualitySeq === qualitySaveSeq) markSave('quality', true);
        };
        try {
            const result = api.storage.local.set({
                [STORAGE_KEY]: { ...states },
                [QUALITY_KEY]: preferredQuality
            }, function () {
                try {
                    if (api.runtime && api.runtime.lastError) fail();
                    else ok();
                } catch (err) { fail(); }
            });
            if (result && typeof result.then === 'function') {
                result.then(ok, fail);
            }
        } catch (err) {
            fail();
        }
    }

    function setStorageMessage(message) {
        try {
            if (!persistErrorEl) return;
            persistErrorEl.textContent = message;
            persistErrorEl.hidden = false;
        } catch (err) { /* ignore */ }
    }

    function clearStorageMessage() {
        // Keep a real save failure visible until that key is written.
        if (statesSaveFailed || qualitySaveFailed) return;
        try {
            if (persistErrorEl) persistErrorEl.hidden = true;
            if (resetButton && resetButton.dataset.persistError) {
                delete resetButton.dataset.persistError;
                if (!resetArmed) resetButton.title = '';
            }
        } catch (err) { /* ignore */ }
    }

    function markSave(name, failed) {
        if (name === 'states') statesSaveFailed = failed;
        else if (name === 'quality') qualitySaveFailed = failed;
        else {
            statesSaveFailed = failed;
            qualitySaveFailed = failed;
        }
        if (statesSaveFailed || qualitySaveFailed) {
            // Persistent user signal: in-memory state diverged from disk.
            // Uses a dedicated role=alert line, never the Reset button.
            setStorageMessage('Save failed — changes kept for this session only.');
            try {
                if (resetButton) {
                    resetButton.title = 'Save failed — changes kept for this session only';
                    resetButton.dataset.persistError = '1';
                    setTimeout(() => {
                        try {
                            if (resetButton.dataset.persistError) {
                                delete resetButton.dataset.persistError;
                                if (!resetArmed) resetButton.title = '';
                            }
                        } catch (err) { /* ignore */ }
                    }, 3000);
                }
            } catch (err) { /* ignore */ }
        } else {
            clearStorageMessage();
        }
    }

    function searchableText(feature) {
        return [
            feature.label || '',
            feature.description || '',
            feature.keywords || '',
            feature.group || '',
            feature.key || '',
            // Verb-free queries like "hide comments" otherwise match nothing.
            'hide show toggle'
        ].join(' ').toLowerCase();
    }

    function featureIsOn(key) {
        if (!states[key]) return false;
        const feature = FEATURE_BY_KEY[key];
        return !feature || !feature.parent || !!states[feature.parent];
    }

    function updateCounts() {
        const eff = resolveEffective();
        const total = TOGGLE_FEATURES.length;
        const on = TOGGLE_FEATURES.filter((f) => effectiveIsOn(f.key, eff)).length;
        if (enabledCount) enabledCount.textContent = total ? `${on}/${total} on` : '';
        // Per-group badges.
        if (listEl) {
            listEl.querySelectorAll('details.group').forEach((details) => {
                const badge = details.querySelector('.group-count');
                if (!badge) return;
                const keys = (details.dataset.keys || '').split(',').filter(Boolean);
                const n = keys.filter((k) => effectiveIsOn(k, eff)).length;
                badge.textContent = `${n}/${keys.length}`;
                // The shortcuts live inside <summary>, so give the disclosure
                // an explicit name instead of letting button labels leak in.
                const summary = details.querySelector('summary');
                if (summary) {
                    summary.setAttribute('aria-label', `${details.dataset.group}, ${n} of ${keys.length} on`);
                }
            });
        }
    }

    function refreshCheckbox(feature) {
        const input = document.getElementById(`toggle-${feature.key}`);
        if (input) {
            if (isMonkOn() && Object.prototype.hasOwnProperty.call(MONK_PRESET, feature.key)) {
                input.checked = !!MONK_PRESET[feature.key];
            } else {
                input.checked = !!states[feature.key];
            }
            input.disabled = !loaded;
        }
    }

    function syncChildToggles() {
        const monk = isMonkOn();
        TOGGLE_FEATURES.filter((f) => f.parent).forEach((child) => {
            const input = document.getElementById(`toggle-${child.key}`);
            if (!input) return;
            // Monk-locked rows stay disabled with their forced state.
            if (monk && Object.prototype.hasOwnProperty.call(MONK_PRESET, child.key)) {
                input.disabled = true;
                const row = input.closest('.toggle-row');
                if (row) row.classList.toggle('child-disabled', false);
                return;
            }
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
        for (const feature of TOGGLE_FEATURES) refreshCheckbox(feature);
        syncChildToggles();
        syncQualityUi();
        syncMonkUi();
        updateCounts();
    }

    function applyStored(stored) {
        // Match content.js sanitize(): a corrupt/non-object payload means
        // defaults, not "leave the previous values alone".
        if (!stored || typeof stored !== 'object') stored = {};
        for (const feature of FEATURES) {
            if (!isSafeKey(feature.key) || pendingUserChanges.has(feature.key)) continue;
            // Missing/non-boolean keys mean a partial write or an older
            // schema; content.js sanitize() fills those from DEFAULTS, so the
            // popup must do the same or its next save resurrects stale values.
            states[feature.key] = (typeof stored[feature.key] === 'boolean')
                ? stored[feature.key]
                : DEFAULTS[feature.key];
        }
    }

    function applyQualityStored(value) {
        if (pendingQuality !== null) return; // pre-load user choice wins
        // Match content.js sanitizeQuality(): null/number/undefined all
        // resolve to the default instead of leaving a stale UI value.
        preferredQuality = sanitizeQuality(value);
    }

    function finishLoad(keepPending) {
        loaded = true;
        const hadPendingQuality = pendingQuality !== null;
        if (hadPendingQuality) preferredQuality = pendingQuality;
        if (!keepPending) {
            pendingUserChanges.clear();
            pendingQuality = null;
        }
        refreshAll();
        setUiEnabled(true);
        applySearchFilter();
        reveal();
        return hadPendingQuality;
    }

    function groupsInOrder() {
        const seen = [];
        for (const f of TOGGLE_FEATURES) {
            if (!seen.includes(f.group)) seen.push(f.group);
        }
        return [
            ...GROUP_ORDER.filter((g) => seen.includes(g)),
            ...seen.filter((g) => !GROUP_ORDER.includes(g))
        ];
    }

    // Keys a bulk action intends to set while running on the fallback
    // snapshot. Enable deliberately leaves opt-ins alone; disable targets
    // every toggle. The mode card itself is never in scope: entering the
    // mode is always an explicit tap, and Disable all exits it directly.
    function fallbackScopeKeys(features, group, enabled) {
        return (features || [])
            .filter((feature) => feature && feature.mode !== true &&
                (group === null || feature.group === group) &&
                (!enabled || !isOptIn(feature)))
            .map((feature) => feature.key);
    }

    function noteFallbackScope(group, enabled) {
        if (!fallbackActive) return;
        for (const key of fallbackScopeKeys(TOGGLE_FEATURES, group, enabled)) {
            pendingUserChanges.add(key);
        }
    }

    // Pure merge decision for the late-read path (unit-tested): one atomic
    // write when both keys are dirty, otherwise the single dirty key.
    function mergePersistAction(hadPendingStates, hadPendingQuality) {
        if (hadPendingStates && hadPendingQuality) return 'all';
        if (hadPendingStates) return 'states';
        if (hadPendingQuality) return 'quality';
        return null;
    }

    function setGroupEnabled(group, enabled) {
        if (!loaded) return;
        // Group shortcuts are parked while the mode holds the preset.
        if (isMonkOn()) return;
        noteFallbackScope(group, enabled);
        let changed = false;
        if (!enabled) {
            for (const f of TOGGLE_FEATURES) {
                if (f.group !== group) continue;
                if (!!states[f.key] !== false) {
                    states[f.key] = false;
                    changed = true;
                }
            }
        } else {
            // Pass 1: parents and standalone default-on features first
            // (order-independent). Opt-ins are never enabled in bulk.
            for (const f of TOGGLE_FEATURES) {
                if (f.group !== group || f.parent || isOptIn(f)) continue;
                if (!states[f.key]) {
                    states[f.key] = true;
                    changed = true;
                }
            }
            // Pass 2: children whose parent is now on.
            for (const f of TOGGLE_FEATURES) {
                if (f.group !== group || !f.parent || isOptIn(f)) continue;
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
        // Global Enable all is parked while the mode holds the preset.
        // Disable all doubles as a mode exit: it clears every toggle and
        // the mode itself so the page returns to the stored setup (off).
        if (isMonkOn() && enabled) return;
        noteFallbackScope(null, enabled);
        let changed = false;
        if (!enabled) {
            for (const f of TOGGLE_FEATURES) {
                if (!!states[f.key] !== false) {
                    states[f.key] = false;
                    changed = true;
                }
            }
            if (!!states['monk_mode'] !== false) {
                states['monk_mode'] = false;
                changed = true;
            }
            if (fallbackActive && changed) pendingUserChanges.add('monk_mode');
        } else {
            // Pass 1: parents and standalone default-on features first.
            for (const f of TOGGLE_FEATURES) {
                if (f.parent || isOptIn(f)) continue;
                if (!states[f.key]) {
                    states[f.key] = true;
                    changed = true;
                }
            }
            // Pass 2: children whose parent is now on.
            for (const f of TOGGLE_FEATURES) {
                if (!f.parent || isOptIn(f)) continue;
                if (states[f.parent] && !states[f.key]) {
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
        if (TOGGLE_FEATURES.length === 0) {
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
            const groupFeatures = TOGGLE_FEATURES.filter((f) => f.group === group);
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
            allBtn.setAttribute('aria-label', `Enable default-on toggles in ${group}`);
            // Bulk enable leaves opt-ins alone, so no group All can
            // accidentally hide the masthead or turn on Shorts-as-watch.
            allBtn.title = `Enable the default-on ${group} toggles (opt-ins are not turned on)`;
            allBtn.addEventListener('click', (e) => {
                // The shortcut sits inside <summary> so it stays reachable
                // when the group is collapsed; stop the click from toggling.
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

            // Keep the shortcuts inside <summary> so they stay reachable
            // while the group is collapsed.
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

                // The transparent input covers this wrapper, so it only
                // needs to be a span. A second <label> would announce the
                // same checkbox twice to screen readers.
                const switchWrap = document.createElement('span');
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
                    if (!loaded || fallbackActive) {
                        // No real settings yet: keep the choice so the late
                        // read can merge it instead of writing defaults.
                        pendingUserChanges.add(feature.key);
                        if (loaded) {
                            refreshAll();
                            applySearchFilter();
                        }
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
                if (!loaded || fallbackActive) {
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
        if (TOGGLE_FEATURES.length === 0) {
            if (noResults) noResults.hidden = true;
            return;
        }
        if (buildFailed) {
            if (noResults) noResults.hidden = true;
            return;
        }
        let visibleRows = 0;
        // Suppress toggle-event saves for programmatic open changes.
        // Depth-counted so stacked rapid filters can't release early while
        // a later batch's toggle events are still queued.
        suppressDepth++;
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
            setTimeout(() => {
                suppressDepth--;
                if (suppressDepth <= 0) {
                    suppressDepth = 0;
                    suppressToggleSave = false;
                }
            }, 0);
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
        // True when the loaded payload was the fallback (error/timeout),
        // not real storage data: a late real read may still overwrite it.
        let usedFallback = false;
        const finishWith = (data, isReal) => {
            if (isReal) {
                // Late real data after a fallback: only accept when no save
                // has happened on top of it. Fallback writes are deferred,
                // so savedAfterLoad stays false and the merge can run.
                if (callbackFired && (!usedFallback || savedAfterLoad)) return;
                usedFallback = false;
                fallbackActive = false;
                clearStorageMessage();
            } else {
                if (callbackFired) return;
                usedFallback = true;
            }
            callbackFired = true;
            if (data && data[STORAGE_KEY]) applyStored(data[STORAGE_KEY]);
            if (data) applyQualityStored(data[QUALITY_KEY]);
            const hadPending = pendingUserChanges.size > 0;
            const hadPendingQuality = finishLoad(false);
            // User choices made while loading win over the payload. A single
            // atomic write avoids stranding a half-merged state if the popup
            // closes between two separate sets.
            const mergeAction = mergePersistAction(hadPending, hadPendingQuality);
            if (mergeAction === 'all') persistAll();
            else if (mergeAction === 'states') persist();
            else if (mergeAction === 'quality') persistQuality();
        };
        const onData = (data) => {
            // A successful get always returns an object (even an empty one).
            // Treat a missing payload as a failed read so it cannot clear the
            // fallback and overwrite storage with defaults.
            if (!data || typeof data !== 'object') return;
            finishWith(data, true);
        };
        const onFallback = () => {
            // The real read has not answered. Show the UI, but do not write:
            // persist() is a no-op until the late read merges user edits.
            fallbackActive = true;
            setStorageMessage('Settings could not be loaded — changes stay in this popup only.');
            const hadPending = pendingUserChanges.size > 0;
            const hadPendingQuality = pendingQuality !== null;
            // Keep pending keys/quality so applyStored() lets them win when
            // the real read finally arrives.
            finishLoad(true);
            if (hadPending) persist(); // deferred by fallbackActive
            if (hadPendingQuality) persistQuality(); // deferred by fallbackActive
        };
        try {
            const result = api.storage.local.get([STORAGE_KEY, QUALITY_KEY], (data) => {
                try {
                    if (api.runtime && api.runtime.lastError) {
                        if (!callbackFired) {
                            callbackFired = true;
                            usedFallback = true;
                            onFallback();
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
                        usedFallback = true;
                        onFallback();
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
                usedFallback = true;
                onFallback();
            }
        }, 2000);
        // One extra read after the fallback window. A fresh request can
        // rescue a hung first one, merge pending edits, and persist them so
        // open tabs receive the changes.
        setTimeout(() => {
            if (!usedFallback || savedAfterLoad) return;
            try {
                const retry = api.storage.local.get([STORAGE_KEY, QUALITY_KEY], (data) => {
                    try {
                        // A failed retry is not authoritative: stay on the
                        // fallback (and keep pending edits) instead of
                        // treating an empty response as real settings.
                        if (api.runtime && api.runtime.lastError) return;
                    } catch (err) { /* ignore */ }
                    if (!data || typeof data !== 'object') return;
                    onData(data);
                });
                if (retry && typeof retry.then === 'function') {
                    retry.then((data) => {
                        if (data && typeof data === 'object') onData(data);
                    }, () => {});
                }
            } catch (err) { /* stay in fallback */ }
        }, 2500);
    }

    function loadFailed() {
        // No usable storage: keep edits session-only instead of writing a
        // defaults snapshot over settings we could not read.
        fallbackActive = true;
        setStorageMessage('Settings unavailable — changes stay in this popup only.');
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
                        } else if (!fallbackActive || pendingUserChanges.size === 0) {
                            // Key deleted: fall back to defaults (matches
                            // content.js). Keep pending user edits during the
                            // initial read; with no pending edits, the clear
                            // is authoritative.
                            states = { ...DEFAULTS };
                            pendingUserChanges.clear();
                        }
                        touched = true;
                    }
                    if (changes[QUALITY_KEY]) {
                        if (changes[QUALITY_KEY].newValue === undefined) {
                            if (!fallbackActive || pendingQuality === null) {
                                preferredQuality = QUALITY_DEFAULT;
                                pendingQuality = null;
                            }
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

    function disarmReset() {
        resetArmed = false;
        if (resetButton) {
            resetButton.classList.remove('armed');
            resetButton.textContent = 'Reset to Defaults';
            if (!statesSaveFailed && !qualitySaveFailed) resetButton.title = '';
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
            if (fallbackActive) {
                // Reset is an explicit override of every stored key; keep the
                // intent so the late real read cannot restore old values.
                for (const feature of FEATURES) pendingUserChanges.add(feature.key);
                pendingQuality = QUALITY_DEFAULT;
            } else {
                pendingUserChanges.clear();
                pendingQuality = null;
            }
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

    function setMonkMode(on) {
        if (!loaded) return;
        // Entering the mode never touches the stored toggles: content.js
        // layers the preset over them, so exiting restores the exact setup.
        if (!!states['monk_mode'] === !!on) {
            refreshAll();
            applySearchFilter();
            return;
        }
        states['monk_mode'] = !!on;
        if (!loaded || fallbackActive) {
            pendingUserChanges.add('monk_mode');
            if (loaded) {
                refreshAll();
                applySearchFilter();
            }
            return;
        }
        persist();
        refreshAll();
        applySearchFilter();
    }

    if (monkButton) {
        monkButton.addEventListener('click', () => setMonkMode(!isMonkOn()));
    }

    function clearSearch(restoreFocus) {
        if (!searchInput) return;
        searchInput.value = '';
        applySearchFilter();
        // Only steal focus back when the user was already in the search box
        // (or activated its clear button). Esc from a toggle must not yank
        // focus away from the control being operated.
        if (restoreFocus !== false) searchInput.focus();
    }

    if (searchInput) {
        searchInput.addEventListener('input', applySearchFilter);
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                // Let empty-Escape close the popup; only hijack to clear text.
                if (!currentQuery()) return;
                e.preventDefault();
                clearSearch(true);
            }
        });
    }
    // Esc clears a live query even after focus moved to a toggle. With no
    // query it is left alone so Chrome can close the popup.
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape' || e.target === searchInput) return;
        if (!currentQuery()) return;
        e.preventDefault();
        clearSearch(false);
    });
    if (searchClear) {
        searchClear.addEventListener('click', () => clearSearch(true));
    }
    if (noResultsClear) {
        noResultsClear.addEventListener('click', () => clearSearch(true));
    }

    function normalizeTag(tag) {
        if (typeof tag !== 'string') return '';
        // Drop a leading v and any prerelease/build suffix: 10.6.0-rc1 and
        // 10.6.0 compare as the same numeric version.
        return tag.trim().replace(/^v/i, '').split(/[-+]/, 1)[0];
    }

    function compareVersions(a, b) {
        const pa = normalizeTag(a).split('.');
        const pb = normalizeTag(b).split('.');
        const len = Math.max(pa.length, pb.length);
        for (let i = 0; i < len; i++) {
            const na = parseInt(pa[i], 10);
            const nb = parseInt(pb[i], 10);
            const va = Number.isNaN(na) ? 0 : na;
            const vb = Number.isNaN(nb) ? 0 : nb;
            if (va !== vb) return va < vb ? -1 : 1;
        }
        return 0;
    }

    function isNewerVersion(latest, current) {
        if (!latest || !current) return false;
        return compareVersions(latest, current) > 0;
    }

    function getCurrentVersion() {
        try {
            const api = getApi();
            if (api && api.runtime && typeof api.runtime.getManifest === 'function') {
                const v = api.runtime.getManifest().version;
                if (typeof v === 'string' && v) return v;
            }
        } catch (err) { /* ignore */ }
        return '';
    }

    function isSafeUpdateUrl(value) {
        if (typeof value !== 'string') return false;
        try {
            const url = new URL(value);
            if (url.protocol !== 'https:') return false;
            if (url.hostname !== 'github.com' && url.hostname !== 'www.github.com') return false;
            return url.pathname.indexOf('/JasonXiao127/YT-Declutter/') === 0;
        } catch (err) {
            return false;
        }
    }

    function renderVersion(current, cached) {
        try {
            if (!versionLabel && !updateStatus) return;
            if (versionLabel) {
                versionLabel.textContent = current ? `v${normalizeTag(current)}` : '';
            }
            if (!updateStatus) return;
            updateStatus.textContent = '';
            updateStatus.removeAttribute('data-state');
            const link = updateStatus.querySelector('a');
            if (link) link.remove();
            if (!current || !cached || !cached.latest) return;
            if (!isNewerVersion(cached.latest, current)) {
                updateStatus.textContent = '· up to date';
                updateStatus.dataset.state = 'ok';
                return;
            }
            const a = document.createElement('a');
            a.href = isSafeUpdateUrl(cached.url) ? cached.url : RELEASES_PAGE_URL;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.className = 'update-available';
            a.textContent = `· Update v${normalizeTag(cached.latest)} available`;
            updateStatus.appendChild(a);
            updateStatus.dataset.state = 'update';
        } catch (err) { /* never break the popup for a footer */ }
    }

    function readUpdateCache() {
        const api = getApi();
        return new Promise((resolve) => {
            let done = false;
            const finish = (value) => {
                if (done) return;
                done = true;
                if (timer) clearTimeout(timer);
                resolve(value);
            };
            const timer = setTimeout(() => finish(null), 2000);
            if (!api) {
                try {
                    const raw = localStorage.getItem(UPDATE_CACHE_KEY);
                    finish(raw ? JSON.parse(raw) : null);
                } catch (err) { finish(null); }
                return;
            }
            try {
                const result = api.storage.local.get([UPDATE_CACHE_KEY], (data) => {
                    try {
                        if (api.runtime && api.runtime.lastError) { finish(null); return; }
                    } catch (err) { /* ignore */ }
                    finish(data ? data[UPDATE_CACHE_KEY] || null : null);
                });
                if (result && typeof result.then === 'function') {
                    result.then(
                        (data) => finish(data ? data[UPDATE_CACHE_KEY] || null : null),
                        () => finish(null)
                    );
                }
            } catch (err) { finish(null); }
        }).then((cached) => {
            if (cached && typeof cached === 'object' &&
                (typeof cached.latest === 'string' || cached.failed === true)) return cached;
            return null;
        });
    }

    function writeUpdateCache(entry) {
        const api = getApi();
        const payload = {
            ts: Date.now(),
            latest: (entry && typeof entry.latest === 'string') ? entry.latest : null,
            url: (entry && typeof entry.url === 'string') ? entry.url : null
        };
        if (entry && entry.failed) payload.failed = true;
        try {
            if (api) {
                const result = api.storage.local.set({ [UPDATE_CACHE_KEY]: payload });
                if (result && typeof result.catch === 'function') result.catch(() => {});
            } else {
                localStorage.setItem(UPDATE_CACHE_KEY, JSON.stringify(payload));
            }
        } catch (err) { /* cache is best-effort */ }
    }

    // Version-less failures (offline on first run) retry after a short
    // window instead of suppressing update checks for a full day with
    // nothing to show for it.
    const UPDATE_FAIL_RETRY_MS = 60 * 60 * 1000;

    function isCacheFresh(cached) {
        if (!cached || typeof cached.ts !== 'number') return false;
        const age = Date.now() - cached.ts;
        if (age < 0) return false; // clock skew must not stay fresh forever
        if (cached.failed === true && !cached.latest) return age < UPDATE_FAIL_RETRY_MS;
        return age < UPDATE_CACHE_TTL_MS;
    }

    function fetchLatestRelease() {
        if (typeof fetch !== 'function') return Promise.resolve(null);
        // Bound the network wait: a hanging captive-portal/VPN request must
        // not dangle forever. Treat timeout the same as any other failure.
        let timer = null;
        let signal = undefined;
        try {
            if (typeof AbortController === 'function') {
                const controller = new AbortController();
                signal = controller.signal;
                timer = setTimeout(() => { try { controller.abort(); } catch (err) { /* ignore */ } }, 10000);
            }
        } catch (err) { /* ignore */ }
        const clearTimer = () => { try { if (timer) clearTimeout(timer); } catch (err) { /* ignore */ } };
        return fetch(UPDATE_API_URL, { headers: { Accept: 'application/vnd.github+json' }, signal })
            .then((res) => {
                if (!res || !res.ok) return null;
                return res.json();
            })
            .then((data) => {
                clearTimer();
                if (!data || typeof data.tag_name !== 'string') return null;
                const latest = normalizeTag(data.tag_name);
                if (!latest) return null;
                const url = isSafeUpdateUrl(data.html_url)
                    ? data.html_url
                    : RELEASES_PAGE_URL;
                return { latest, url };
            })
            .catch(() => { clearTimer(); return null; });
    }

    function maybeCheckForUpdates() {
        const current = getCurrentVersion();
        if (!current) return;
        renderVersion(current, null);
        let settled = false;
        readUpdateCache().then((cached) => {
            if (settled) return;
            settled = true;
            if (cached && cached.latest) renderVersion(current, cached);
            // A fresh success or a fresh failure both suppress the fetch:
            // failures are cached for the same window so a popup cannot
            // hammer a rate-limited or offline API on every open.
            if (isCacheFresh(cached)) return;
            fetchLatestRelease().then((fresh) => {
                if (!fresh) {
                    writeUpdateCache({
                        latest: (cached && cached.latest) ? cached.latest : null,
                        url: (cached && cached.url) ? cached.url : null,
                        failed: true
                    });
                    if (cached && cached.latest) renderVersion(current, cached);
                    else renderVersion(current, null);
                    return;
                }
                writeUpdateCache(fresh);
                renderVersion(current, fresh);
            });
        });
    }

    // Exposed for node --test source-level checks (see tests/update.test.js).
    try {
        globalThis.YT_DCLTR_UPDATE = {
            UPDATE_API_URL,
            RELEASES_PAGE_URL,
            UPDATE_CACHE_KEY,
            UPDATE_CACHE_TTL_MS,
            UPDATE_FAIL_RETRY_MS,
            normalizeTag,
            compareVersions,
            isNewerVersion,
            isSafeUpdateUrl,
            isCacheFresh
        };
    } catch (err) { /* ignore */ }

    try {
        globalThis.YT_DCLTR_POPUP = { isOptIn, fallbackScopeKeys, mergePersistAction, toggleFeatures, resolveEffective, effectiveIsOn, isMonkOn };
    } catch (err) { /* ignore */ }

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
        maybeCheckForUpdates();
    } catch (err) { /* update check never blocks settings */ }
    try {
        loadStates();
    } catch (err) {
        loadFailed();
    }
})();
