// Phase 2: Feature Configuration & Selectors
const FEATURE_CONFIG = {
    comments: [
        '#comments',
        'ytd-comments',
        'ytd-item-section-renderer:has(#comments)',
        'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-comments-section"]'
    ],
    shorts: [
        'ytd-rich-shelf-renderer[is-shorts]',
        'ytd-rich-section-renderer:has(ytd-rich-shelf-renderer[is-shorts])',
        'ytd-reel-shelf-renderer',
        'ytd-guide-entry-renderer:has(a[href^="/shorts"])',
        'ytd-guide-entry-renderer:has(a[href*="/shorts"])',
        'ytd-guide-section-renderer:has(ytd-guide-entry-renderer a[href*="/shorts"])',
        'ytd-guide-entry-renderer:has(a[title="Shorts"])',
        'ytd-mini-guide-entry-renderer:has(a[href^="/shorts"])',
        'ytd-compact-video-renderer:has(a[href^="/shorts/"])',
        'ytd-grid-video-renderer:has(a[href^="/shorts/"])',
        'ytd-video-renderer:has(a[href^="/shorts/"])',
        'ytd-shorts',
        'ytd-reel-video-renderer',
        'ytd-reel-overlay-renderer',
        'grid-shelf-view-model',
        'ytd-item-section-renderer:has(grid-shelf-view-model)'
    ],
    ads_playables: [
        'a[href*="/playables"]',
        'ytd-rich-section-renderer:has(a[href*="/playables"])',
        'ytd-rich-item-renderer:has(a[href*="/playables"])',
        'ytd-video-masthead-ad-renderer',
        'ytd-ad-slot-renderer'
    ],
    notifications: [
        'ytd-notification-topbar-button-renderer',
        'ytd-button-renderer:has(button[aria-label*="Notifications" i])'
    ],
    create_button: [
        'ytd-button-renderer:has(button[aria-label*="Create" i])',
        'ytd-topbar-menu-button-renderer:has(button[aria-label*="Create" i])',
        'a[aria-label*="Create" i]',
        'button[aria-label*="Create" i]'
    ],
    join_button: [
        'ytd-button-renderer:has(a[href*="/join"])',
        'ytd-button-renderer:has(button[aria-label*="Join" i])',
        'yt-button-shape:has(button[aria-label*="Join" i])'
    ],
    voice_search: [
        '#voice-search-button'
    ],
    youtube_logo: [
        'ytd-topbar-logo-renderer',
        '#logo'
    ],
    category_chips: [
        'ytd-feed-filter-chip-bar-renderer',
        'div#chips-wrapper'
    ],
    top_news: [
        'ytd-rich-section-renderer:has(yt-formatted-string[title="Top news"])',
        'ytd-rich-section-renderer:has(yt-formatted-string[title="Breaking news"])'
    ],
    ai_search: [
        'ytd-ask-search-button-renderer',
        'button[aria-label*="ask" i]',
        'yt-button-renderer:has(button[aria-label*="ask" i])'
    ]
};

// Phase 3: Dynamic CSS Injection — Zero FOUC
let cssRule = '';

for (const [featureKey, selectors] of Object.entries(FEATURE_CONFIG)) {
    const joinedSelectors = selectors.join(', ');
    // CRITICAL: Wrap selectors in :is() so :not() applies to ALL selectors, not just the first one
    cssRule += `html:not(.dcltr-show-${featureKey}) :is(${joinedSelectors}) { display: none !important; }\n`;
}

// Inject CSS immediately at document_start
const style = document.createElement('style');
style.textContent = cssRule;
(document.head || document.documentElement).appendChild(style);

// Phase 4: State Management & SPA Navigation
const YT_NAV_EVENTS = ['yt-navigate-finish', 'yt-page-data-updated', 'spfdone'];
let cachedStates = {};

function applyHiding(states) {
    for (const featureKey of Object.keys(FEATURE_CONFIG)) {
        const hideEnabled = states[featureKey];
        // If hideEnabled is true, DO NOT add show class (element stays hidden)
        // If hideEnabled is false, ADD show class (element becomes visible)
        document.documentElement.classList.toggle(`dcltr-show-${featureKey}`, !hideEnabled);
    }
}

function setupListeners() {
    YT_NAV_EVENTS.forEach(eventName => {
        document.addEventListener(eventName, () => {
            // Re-apply states in case YouTube's router strips classes
            applyHiding(cachedStates);
        });
    });
}

// Phase 5: Initialization
const DEFAULT_STATES = {
    comments: true,
    shorts: true,
    ads_playables: true,
    notifications: true,
    create_button: true,
    join_button: true,
    voice_search: true,
    youtube_logo: true,
    category_chips: true,
    top_news: true,
    ai_search: true
};

// 1. Initial Load
chrome.storage.local.get('states', (data) => {
    // Merge saved data with defaults (in case new features added in an update)
    cachedStates = (data && data.states) ? { ...DEFAULT_STATES, ...data.states } : DEFAULT_STATES;
    applyHiding(cachedStates);
    setupListeners();
});

// 2. Listen for Toggle Changes from Popup
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.states) {
        cachedStates = { ...DEFAULT_STATES, ...changes.states.newValue };
        applyHiding(cachedStates);
    }
});