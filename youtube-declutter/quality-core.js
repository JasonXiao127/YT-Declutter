// Shared pure quality logic (no DOM, no chrome.* APIs, no timers).
// Loaded first in every context (isolated, MAIN, popup) so all consumers
// share one canonical implementation. Safe to require() from Node tests.
(function () {
    'use strict';

    var QUALITY_DEFAULT = 'hd1080';
    var QUALITY_OPTIONS = [
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
    ];
    var QUALITY_VALUES = QUALITY_OPTIONS.map(function (o) { return o.value; });

    // Player-facing ladder, descending (best first). hd2880 (5K) included
    // because it appears in getAvailableQualityLevels() on some uploads.
    // highres (YouTube's 8K alias) is normalized to hd4320, so it needs no
    // separate ORDER entry. This intentionally differs from the user-facing
    // allowlist above (which has no highres/hd2880 as settings).
    var ORDER = ['hd4320', 'hd2880', 'hd2160', 'hd1440', 'hd1080', 'hd720', 'large', 'medium', 'small', 'tiny'];
    var HEIGHT = { highres: 4320, hd4320: 4320, hd2880: 2880, hd2160: 2160, hd1440: 1440, hd1080: 1080, hd720: 720, large: 480, medium: 360, small: 240, tiny: 144 };
    var PREMIUM_RE = /\d{3,4}p?\s*(premium|enhanced)/i;

    function sanitizeQuality(value) {
        return (typeof value === 'string' && QUALITY_VALUES.indexOf(value) !== -1)
            ? value
            : QUALITY_DEFAULT;
    }

    function normalizeLevel(level) {
        // highres is YouTube's alias for 8K in some responses.
        if (level === 'highres') return 'hd4320';
        return level;
    }

    function resolveTarget(target, levels) {
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

    function isPremiumCandidate(resolved) {
        return (HEIGHT[normalizeLevel(resolved)] || 0) >= 1080;
    }

    var CORE = {
        QUALITY_DEFAULT: QUALITY_DEFAULT,
        QUALITY_OPTIONS: QUALITY_OPTIONS,
        QUALITY_VALUES: QUALITY_VALUES,
        ORDER: ORDER,
        HEIGHT: HEIGHT,
        PREMIUM_RE: PREMIUM_RE,
        sanitizeQuality: sanitizeQuality,
        normalizeLevel: normalizeLevel,
        resolveTarget: resolveTarget,
        findPremiumLabel: findPremiumLabel,
        isPremiumCandidate: isPremiumCandidate
    };

    try {
        globalThis.YT_DCLTR_QUALITY_CORE = CORE;
    } catch (err) { /* ignore */ }
    // Back-compat globals for consumers that read them directly.
    try {
        if (typeof globalThis.YT_DCLTR_QUALITY_DEFAULT !== 'string') {
            globalThis.YT_DCLTR_QUALITY_DEFAULT = QUALITY_DEFAULT;
        }
        if (!Array.isArray(globalThis.YT_DCLTR_QUALITY_OPTIONS)) {
            globalThis.YT_DCLTR_QUALITY_OPTIONS = QUALITY_OPTIONS;
        }
        if (!Array.isArray(globalThis.YT_DCLTR_QUALITY_VALUES)) {
            globalThis.YT_DCLTR_QUALITY_VALUES = QUALITY_VALUES;
        }
    } catch (err) { /* ignore */ }
    try {
        if (typeof module !== 'undefined' && module.exports) module.exports = CORE;
    } catch (err) { /* ignore */ }
})();
