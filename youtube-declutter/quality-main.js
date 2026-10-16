(function () {
    'use strict';

    // Frame guard: manifest uses all_frames:false, but never enforce from
    // inside an iframe even if injected (e.g. embedded player frames).
    try {
        if (window.top !== window) return;
    } catch (err) {
        return;
    }

    // MAIN-world quality enforcer. No chrome.* APIs here — settings arrive
    // via window.postMessage from the isolated content.js bridge.
    // Policy: enforce ONCE per video load, then stop so manual changes stick.

    var QCORE = (typeof globalThis.YT_DCLTR_QUALITY_CORE === 'object' && globalThis.YT_DCLTR_QUALITY_CORE)
        ? globalThis.YT_DCLTR_QUALITY_CORE
        : null;
    var QUALITY_DEFAULT = (QCORE && typeof QCORE.QUALITY_DEFAULT === 'string')
        ? QCORE.QUALITY_DEFAULT
        : ((typeof globalThis.YT_DCLTR_QUALITY_DEFAULT === 'string')
            ? globalThis.YT_DCLTR_QUALITY_DEFAULT
            : 'hd1080');
    var QUALITY_VALUES = (QCORE && Array.isArray(QCORE.QUALITY_VALUES))
        ? QCORE.QUALITY_VALUES
        : (Array.isArray(globalThis.YT_DCLTR_QUALITY_VALUES)
            ? globalThis.YT_DCLTR_QUALITY_VALUES
            : ['tiny', 'small', 'medium', 'large', 'hd720', 'hd1080', 'hd1440', 'hd2160', 'hd4320', 'highest']);

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
    // Descending (best first). hd2880 (5K) included because it appears in
    // getAvailableQualityLevels() on some uploads. highres (YouTube's 8K
    // alias) is normalized to hd4320 by normalizeLevel, so it needs no
    // separate ORDER entry.
    var ORDER = (QCORE && Array.isArray(QCORE.ORDER)) ? QCORE.ORDER
        : ['hd4320', 'hd2880', 'hd2160', 'hd1440', 'hd1080', 'hd720', 'large', 'medium', 'small', 'tiny'];
    var HEIGHT = (QCORE && QCORE.HEIGHT && typeof QCORE.HEIGHT === 'object') ? QCORE.HEIGHT
        : { highres: 4320, hd4320: 4320, hd2880: 2880, hd2160: 2160, hd1440: 1440, hd1080: 1080, hd720: 720, large: 480, medium: 360, small: 240, tiny: 144 };
    var PREMIUM_RE = (QCORE && QCORE.PREMIUM_RE instanceof RegExp) ? QCORE.PREMIUM_RE
        : /\d{3,4}p?\s*(premium|enhanced)/i;

    var POLL_MS = 500;
    var MAX_TICKS = 30; // ~15s window for normal waits
    var MAX_AD_TICKS = 120; // ~60s for ad/transition waits (long ad stacks)

    var cached = { enabled: true, quality: QUALITY_DEFAULT, premium: false, known: false };
    var gen = 0;
    var enforcedGen = -1;
    var lastVideoId = null;
    var pollTimer = null;
    var ticks = 0;
    var adTicks = 0;
    var premiumAttemptedGen = -1;
    var premiumPendingGen = -1;

    function normalizeLevel(level) {
        if (QCORE && typeof QCORE.normalizeLevel === 'function') {
            try {
                return QCORE.normalizeLevel(level);
            } catch (err) { /* fall through */ }
        }
        // highres is YouTube's alias for 8K in some responses.
        if (level === 'highres') return 'hd4320';
        return level;
    }

    function isWatchOrEmbed() {
        try {
            var path = location.pathname || '';
            if (path === '/watch') return true;
            if (path.indexOf('/embed/') === 0) return true;
            if (path.indexOf('/live/') === 0) return true;
            return false;
        } catch (err) {
            return false;
        }
    }

    function getPlayer() {
        try {
            return document.getElementById('movie_player') || null;
        } catch (err) {
            return null;
        }
    }

    function getVideoId(player) {
        try {
            if (player && typeof player.getVideoData === 'function') {
                var data = player.getVideoData();
                if (data && typeof data.video_id === 'string' && data.video_id) return data.video_id;
            }
        } catch (err) { /* ignore */ }
        try {
            var params = new URLSearchParams(location.search || '');
            var v = params.get('v');
            if (v) return v;
            var path = location.pathname || '';
            var m = path.match(/^\/(?:embed|live)\/([^/?#]+)/);
            if (m && m[1]) return m[1];
        } catch (err) { /* ignore */ }
        return null;
    }

    function getExpectedId() {
        // URL-ground-truth video id. During ads the player reports the ad's
        // id while the URL still holds the content id — that mismatch is a
        // signal-independent ad/stale detector (safe default when ad classes
        // get renamed and isAd disappears).
        try {
            var params = new URLSearchParams(location.search || '');
            var v = params.get('v');
            if (v) return v;
            var path = location.pathname || '';
            var m = path.match(/^\/(?:embed|live|shorts)\/([^/?#]+)/);
            if (m && m[1]) return m[1];
        } catch (err) { /* ignore */ }
        return null;
    }

    function isAd(player) {
        try {
            if (player && typeof player.getVideoData === 'function') {
                var data = player.getVideoData();
                if (data && data.isAd === true) return true;
            }
        } catch (err) { /* ignore */ }
        try {
            if (player && player.classList) {
                if (player.classList.contains('ad-showing') || player.classList.contains('ad-interrupting')) return true;
            }
            var scope = player || document;
            if (scope.querySelector && scope.querySelector('.ytp-ad-player-overlay')) return true;
        } catch (err) { /* ignore */ }
        return false;
    }

    function isLive(player) {
        try {
            if (player && typeof player.getVideoData === 'function') {
                var data = player.getVideoData();
                if (data && data.isLive === true) return true;
            }
        } catch (err) { /* ignore */ }
        try {
            if (player && typeof player.getPlayerResponse === 'function') {
                var resp = player.getPlayerResponse();
                var details = resp && resp.videoDetails;
                if (details && (details.isLive === true || details.isLiveContent === true)) return true;
            }
        } catch (err) { /* ignore */ }
        try {
            if ((location.pathname || '').indexOf('/live/') === 0) return true;
        } catch (err) { /* ignore */ }
        return false;
    }

    function getQualityData(player) {
        try {
            if (player && typeof player.getAvailableQualityData === 'function') {
                var qd = player.getAvailableQualityData();
                if (Array.isArray(qd) && qd.length > 0) return qd;
            }
        } catch (err) { /* ignore */ }
        return null;
    }

    function resolveTarget(target, levels) {
        if (QCORE && typeof QCORE.resolveTarget === 'function') {
            try {
                return QCORE.resolveTarget(target, levels);
            } catch (err) { /* fall through */ }
        }
        var normLevels = levels.map(normalizeLevel);
        if (target === 'highest') return normalizeLevel(levels[0]);
        var normTarget = normalizeLevel(target);
        var idx = ORDER.indexOf(normTarget);
        if (idx === -1) return normalizeLevel(levels[0]);
        for (var i = idx; i < ORDER.length; i++) {
            if (normLevels.indexOf(ORDER[i]) !== -1) return ORDER[i];
        }
        // Nothing at or below target: fall back to lowest available.
        return normalizeLevel(levels[levels.length - 1]);
    }

    function findPremiumLabel(qualityData, resolved) {
        if (QCORE && typeof QCORE.findPremiumLabel === 'function') {
            try {
                return QCORE.findPremiumLabel(qualityData, resolved);
            } catch (err) { /* fall through */ }
        }
        if (!Array.isArray(qualityData)) return null;
        var normResolved = normalizeLevel(resolved);
        var targetHeight = HEIGHT[normResolved] || 0;
        for (var i = 0; i < qualityData.length; i++) {
            var q = qualityData[i];
            if (!q || typeof q.qualityLabel !== 'string') continue;
            if (q.isPlayable === false) continue;
            var qNorm = normalizeLevel(q.quality);
            if (qNorm !== normResolved) continue;
            if (PREMIUM_RE.test(q.qualityLabel)) return q.qualityLabel;
        }
        // Fallback: any playable Premium label at the same height.
        for (var j = 0; j < qualityData.length; j++) {
            var q2 = qualityData[j];
            if (!q2 || typeof q2.qualityLabel !== 'string') continue;
            if (q2.isPlayable === false) continue;
            if (!PREMIUM_RE.test(q2.qualityLabel)) continue;
            var h = parseInt(q2.qualityLabel, 10);
            if (h === targetHeight) return q2.qualityLabel;
        }
        return null;
    }

    function isPremiumCandidate(level) {
        if (QCORE && typeof QCORE.isPremiumCandidate === 'function') {
            try {
                return QCORE.isPremiumCandidate(level);
            } catch (err) { /* fall through */ }
        }
        return (HEIGHT[normalizeLevel(level)] || 0) >= 1080;
    }

    function sleep(ms) {
        return new Promise(function (resolve) { setTimeout(resolve, ms); });
    }

    function isMenuOpen() {
        try {
            var menu = document.querySelector('.ytp-settings-menu');
            if (!menu) return false;
            // .ytp-settings-menu persists in DOM hidden via display:none;
            // existence alone cannot signal open state.
            var style = window.getComputedStyle ? window.getComputedStyle(menu) : null;
            if (style && style.display === 'none') return false;
            if (style && style.visibility === 'hidden') return false;
            if (menu.offsetParent === null && style && style.position !== 'fixed') return false;
            var btn = document.querySelector('.ytp-settings-button');
            if (btn && btn.getAttribute && btn.getAttribute('aria-expanded') === 'false') return false;
            // Fallback: closed menus have zero rect.
            try {
                var rect = menu.getBoundingClientRect();
                if (rect && rect.width === 0 && rect.height === 0) return false;
            } catch (err) { /* ignore */ }
            return true;
        } catch (err) {
            return false;
        }
    }

    function clickMenuItemByText(root, text, exact) {
        try {
            var items = root.querySelectorAll('.ytp-menuitem');
            for (var i = 0; i < items.length; i++) {
                var label = items[i].textContent || '';
                if (exact ? label.trim() === text : label.indexOf(text) !== -1) {
                    items[i].click();
                    return true;
                }
            }
        } catch (err) { /* ignore */ }
        return false;
    }

    function tryPremiumMenuClick(premiumLabel, targetHeight) {
        try {
            var btn = document.querySelector('.ytp-settings-button');
            if (!btn) return Promise.resolve(false);
            btn.click();
            return sleep(180).then(function () {
                // Open the Quality submenu.
                var qualityOpened = false;
                try {
                    var labels = document.querySelectorAll('.ytp-menuitem-label');
                    for (var i = 0; i < labels.length; i++) {
                        if (/quality/i.test(labels[i].textContent || '')) {
                            var item = labels[i].closest ? labels[i].closest('.ytp-menuitem') : null;
                            (item || labels[i]).click();
                            qualityOpened = true;
                            break;
                        }
                    }
                } catch (err) { /* ignore */ }
                if (!qualityOpened) {
                    // Blind toggle shut, then verify: if YouTube left the
                    // menu open (or our first click never opened it and the
                    // second click opened it), close again / dismiss.
                    try { btn.click(); } catch (e) { /* ignore */ }
                    return sleep(120).then(function () {
                        try {
                            if (isMenuOpen()) {
                                try { btn.click(); } catch (e2) { /* ignore */ }
                            }
                        } catch (err) { /* ignore */ }
                        return false;
                    });
                }
                return sleep(220).then(function () {
                    var picked = clickMenuItemByText(document, premiumLabel, true);
                    if (!picked && targetHeight) {
                        // Fallback: row containing both height and Premium.
                        try {
                            var items = document.querySelectorAll('.ytp-menuitem');
                            for (var k = 0; k < items.length; k++) {
                                var t = items[k].textContent || '';
                                if (t.indexOf(String(targetHeight)) !== -1 && PREMIUM_RE.test(t)) {
                                    items[k].click();
                                    picked = true;
                                    break;
                                }
                            }
                        } catch (err) { /* ignore */ }
                    }
                    return sleep(120).then(function () {
                        // Close any leftover menu.
                        try {
                            if (isMenuOpen()) btn.click();
                        } catch (err) { /* ignore */ }
                        return picked;
                    });
                });
            });
        } catch (err) {
            return Promise.resolve(false);
        }
    }

    function attemptEnforce() {
        if (!cached.known) {
            requestSettings();
            return 'wait';
        }
        if (!cached.enabled) return 'done';
        if (!isWatchOrEmbed()) return 'done';
        var player = getPlayer();
        if (!player) return 'wait';
        if (typeof player.getAvailableQualityLevels !== 'function' ||
            typeof player.getPlaybackQuality !== 'function' ||
            typeof player.setPlaybackQuality !== 'function') {
            return 'wait';
        }
        if (isAd(player)) return 'wait-ad'; // skip tick, keep polling until ad ends
        if (isLive(player)) return 'done'; // live has no fixed ladder; don't fight ABR
        // Signal-independent ad/stale guard: during ads (or a stale player
        // mid-navigation) the player's video id differs from the URL id.
        // Waiting here is the safe default if ad classes/flags get renamed.
        try {
            var pid = getVideoId(player);
            var expected = getExpectedId();
            if (pid && expected && pid !== expected) return 'wait-ad';
        } catch (err) { /* ignore; fall through to level checks */ }
        var levels;
        try {
            levels = player.getAvailableQualityLevels();
        } catch (err) {
            return 'wait';
        }
        if (!Array.isArray(levels) || levels.length === 0) return 'wait';
        var current = null;
        try {
            current = player.getPlaybackQuality();
        } catch (err) { /* ignore */ }
        if (current === 'unknown' || current === null || current === undefined || current === '') return 'wait';
        // Note: 'auto' is enforceable (that is exactly the state we override).

        var target = sanitizeQuality(cached.quality);
        var resolved = resolveTarget(target, levels);
        var qualityData = getQualityData(player);

        // Premium path: menu click, attempted at most once per video.
        // While a menu attempt is in flight, keep waiting so the poll loop
        // doesn't race it with an immediate API fallback.
        if (cached.premium && isPremiumCandidate(resolved)) {
            if (premiumPendingGen === gen) return 'wait';
            if (premiumAttemptedGen !== gen) {
                var premiumLabel = findPremiumLabel(qualityData, resolved);
                if (premiumLabel) {
                    premiumAttemptedGen = gen;
                    premiumPendingGen = gen;
                    var attemptGen = gen;
                    var attemptPlayer = player;
                    var attemptResolved = resolved;
                    tryPremiumMenuClick(premiumLabel, HEIGHT[normalizeLevel(resolved)] || 0).then(function (picked) {
                        // Stale flight (navigated mid-menu): never stamp or
                        // stop the NEW generation's window.
                        if (attemptGen !== gen) {
                            if (premiumPendingGen === attemptGen) premiumPendingGen = -1;
                            return;
                        }
                        if (premiumPendingGen === gen) premiumPendingGen = -1;
                        if (picked) {
                            enforcedGen = gen;
                            stopPoll();
                        } else {
                            // Menu failed: fall back to standard API level once.
                            try {
                                if (typeof attemptPlayer.setPlaybackQualityRange === 'function') attemptPlayer.setPlaybackQualityRange(attemptResolved);
                                attemptPlayer.setPlaybackQuality(attemptResolved);
                            } catch (err) { /* ignore */ }
                            enforcedGen = gen;
                            stopPoll();
                        }
                    }, function () {
                        // Rejection === menu failure: same single API fallback.
                        if (attemptGen !== gen) {
                            if (premiumPendingGen === attemptGen) premiumPendingGen = -1;
                            return;
                        }
                        if (premiumPendingGen === gen) premiumPendingGen = -1;
                        try {
                            if (typeof attemptPlayer.setPlaybackQualityRange === 'function') attemptPlayer.setPlaybackQualityRange(attemptResolved);
                            attemptPlayer.setPlaybackQuality(attemptResolved);
                        } catch (err) { /* ignore */ }
                        enforcedGen = gen;
                        stopPoll();
                    });
                    return 'wait';
                }
            }
        }

        try {
            if (typeof player.setPlaybackQualityRange === 'function') player.setPlaybackQualityRange(resolved);
            player.setPlaybackQuality(resolved);
        } catch (err) {
            return 'wait';
        }
        return 'done';
    }

    function stopPoll() {
        if (pollTimer !== null) {
            try { clearInterval(pollTimer); } catch (err) { /* ignore */ }
            pollTimer = null;
        }
    }

    function pollTick() {
        if (pollTimer === null) return;
        var outcome = null;
        try {
            outcome = attemptEnforce();
        } catch (err) {
            outcome = 'wait';
        }
        if (outcome === 'done') {
            enforcedGen = gen;
            stopPoll();
        } else if (outcome === 'wait-ad') {
            // Ads/transitions: extended budget, don't burn the normal window.
            adTicks++;
            if (adTicks >= MAX_AD_TICKS) stopPoll();
        } else {
            // Progress (player ready, levels visible): fresh ad budget for
            // the next ad unit so stacked/long ads each get a full window.
            adTicks = 0;
            ticks++;
            if (ticks >= MAX_TICKS) {
                stopPoll();
            }
        }
    }

    function startWindow() {
        if (!isWatchOrEmbed()) return;
        if (enforcedGen === gen) return; // already enforced for this navigation
        stopPoll();
        ticks = 0;
        adTicks = 0;
        // Immediate attempt accelerates enforcement; interval covers late level population.
        try {
            var first = attemptEnforce();
            if (first === 'done') {
                enforcedGen = gen;
                return;
            }
        } catch (err) { /* ignore */ }
        pollTimer = setInterval(pollTick, POLL_MS);
    }

    function onNewNavigation(force) {
        if (!isWatchOrEmbed()) return;
        var player = getPlayer();
        var id = getVideoId(player) || null;
        if (id !== lastVideoId) {
            lastVideoId = id;
            gen++;
            enforcedGen = -1;
            premiumAttemptedGen = -1;
            premiumPendingGen = -1;
        } else if (force === true) {
            // Real reload of the same video (e.g. back/forward): fresh load,
            // deserves one enforcement. Spurious same-id nav events must not
            // reset enforcement or they would fight manual user changes.
            gen++;
            enforcedGen = -1;
            premiumAttemptedGen = -1;
            premiumPendingGen = -1;
        } else {
            // Same video, no new load: only ensure a pending window continues.
            startWindow();
            return;
        }
        startWindow();
    }

    function requestSettings() {
        try {
            window.postMessage({ __dcltr: true, type: 'DCLTR_SETTINGS_REQUEST' }, '*');
        } catch (err) { /* ignore */ }
    }

    window.addEventListener('message', function (event) {
        try {
            if (event.source !== window) return;
            var data = event.data;
            if (!data || data.__dcltr !== true) return;
            if (data.type !== 'DCLTR_SETTINGS') return;
            // Pre-storage defaults carry ready:false: keep polling and do
            // not latch them, or a slow storage read enforces the wrong
            // quality for this video.
            if (data.ready === false) {
                cached.known = false;
                return;
            }
            cached.enabled = data.enabled !== false;
            cached.quality = sanitizeQuality(data.quality);
            cached.premium = data.premium === true;
            cached.known = true;
            // If a window is pending, retry immediately with fresh settings.
            if (pollTimer !== null && enforcedGen !== gen) {
                try {
                    var outcome = attemptEnforce();
                    if (outcome === 'done') {
                        enforcedGen = gen;
                        stopPoll();
                    }
                } catch (err) { /* ignore */ }
            }
        } catch (err) { /* ignore */ }
    });

    document.addEventListener('yt-navigate-finish', function () { onNewNavigation(false); });
    document.addEventListener('yt-page-data-updated', function () {
        // Commit-check: only treat as new if video id actually changed.
        try {
            var player = getPlayer();
            var id = getVideoId(player);
            if (id && id !== lastVideoId && isWatchOrEmbed()) onNewNavigation(false);
        } catch (err) { /* ignore */ }
    });
    try {
        window.addEventListener('popstate', function () {
            // Same-video timestamp Back (e.g. ?t=30) must not re-enforce
            // over a manual quality change; real reloads are caught by
            // loadstart / yt-navigate events which bump the generation.
            setTimeout(function () { onNewNavigation(false); }, 0);
        });
    } catch (err) { /* ignore */ }
    // New stream metadata (covers autoplay next without nav events firing first).
    document.addEventListener('loadstart', function (e) {
        try {
            var t = e && e.target;
            if (t && t.tagName === 'VIDEO' && isWatchOrEmbed()) {
                var player = getPlayer();
                // Mid-roll ads fire loadstart with the ad's video id: never
                // bump gen / lastVideoId for ads or they reopen an
                // enforcement window that clobbers manual quality changes.
                try {
                    if (player && isAd(player)) return;
                } catch (err) { /* fall through to id check */ }
                var id = getVideoId(player);
                if (id && id !== lastVideoId) onNewNavigation(false);
                else startWindow();
            }
        } catch (err) { /* ignore */ }
    }, true);

    requestSettings();
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        try {
            if (isWatchOrEmbed()) {
                var p0 = getPlayer();
                lastVideoId = getVideoId(p0) || null;
                gen = 1;
                enforcedGen = -1;
                startWindow();
            }
        } catch (err) { /* ignore */ }
    } else {
        document.addEventListener('DOMContentLoaded', function () {
            try {
                if (isWatchOrEmbed()) {
                    var p1 = getPlayer();
                    lastVideoId = getVideoId(p1) || null;
                    gen = 1;
                    enforcedGen = -1;
                    startWindow();
                }
            } catch (err) { /* ignore */ }
        }, { once: true });
    }
})();
