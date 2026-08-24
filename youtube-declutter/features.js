const YT_DCLTR_FEATURES = [
    {
        key: 'shorts',
        label: 'Shorts',
        group: 'Feed & Sidebar',
        selectors: [
            'ytd-rich-shelf-renderer[is-shorts]',
            'ytd-rich-section-renderer:has(ytd-rich-shelf-renderer[is-shorts])',
            'ytd-reel-shelf-renderer',
            'ytd-guide-entry-renderer:has(a[href^="/shorts"])',
            'ytd-mini-guide-entry-renderer:has(a[href^="/shorts"])',
            'ytd-guide-section-renderer:has(ytd-guide-entry-renderer a[href*="/shorts"])',
            'ytd-compact-video-renderer:has(a[href^="/shorts/"])',
            'ytd-grid-video-renderer:has(a[href^="/shorts/"])',
            'ytd-video-renderer:has(a[href^="/shorts/"])',
            'ytd-video-renderer:has(badge-shape[aria-label="Shorts"])',
            'ytd-shorts',
            'ytd-reel-video-renderer',
            'ytd-reel-overlay-renderer',
            'grid-shelf-view-model',
            'ytd-item-section-renderer:has(grid-shelf-view-model)',
            'yt-chip-cloud-chip-renderer:has(yt-formatted-string[title="Shorts"])',
            'yt-tab-shape[tab-title="Shorts"]'
        ]
    },
    {
        key: 'comments',
        label: 'Comments',
        group: 'Feed & Sidebar',
        selectors: [
            '#comments',
            'ytd-comments',
            'ytd-item-section-renderer:has(#comments)',
            'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-comments-section"]'
        ]
    },
    {
        key: 'ads_playables',
        label: 'Ads, Playables & Nag Toasts',
        group: 'Feed & Sidebar',
        selectors: [
            'a[href*="/playables"]',
            'ytd-rich-section-renderer:has(a[href*="/playables"])',
            'ytd-rich-item-renderer:has(a[href*="/playables"])',
            'ytd-video-masthead-ad-renderer',
            'ytd-ad-slot-renderer',
            'tp-yt-paper-toast#toast:has(yt-button-renderer#action-button a[href*="blocker"])'
        ]
    },
    {
        key: 'category_chips',
        label: 'Category Chips',
        group: 'Feed & Sidebar',
        selectors: [
            'ytd-feed-filter-chip-bar-renderer',
            'div#chips-wrapper'
        ]
    },
    {
        key: 'top_news',
        label: 'Top News Section',
        group: 'Feed & Sidebar',
        selectors: [
            'ytd-rich-section-renderer:has(yt-formatted-string[title="Top news"])',
            'ytd-rich-section-renderer:has(yt-formatted-string[title="Breaking news"])'
        ]
    },
    {
        key: 'surveys',
        label: 'Feedback Surveys',
        group: 'Feed & Sidebar',
        selectors: [
            'ytd-inline-survey-renderer',
            '#attached-survey'
        ]
    },
    {
        key: 'guide_sections',
        label: 'Sidebar Sections (Explore, More from YouTube)',
        group: 'Feed & Sidebar',
        selectors: [
            'ytd-guide-section-renderer:has(a[href="/feed/trending"])',
            'ytd-guide-section-renderer:has(a[href="/feed/shopping"])',
            'ytd-guide-section-renderer:has(a[href="/feed/explore"])',
            'ytd-guide-section-renderer:has(a[href="/premium"])',
            'ytd-guide-section-renderer:has(a[href="/feed/storefront"])',
            'ytd-guide-section-renderer:has(a[href="https://music.youtube.com"])',
            'ytd-guide-entry-renderer:has(a[href="/premium"])',
            'ytd-guide-entry-renderer:has(a[href="/feed/storefront"])'
        ]
    },
    {
        key: 'join_button',
        label: 'Join Buttons',
        group: 'Feed & Sidebar',
        selectors: [
            'yt-button-view-model:has(a[href*="/join"])',
            'yt-button-shape:has(a[href*="/join"])',
            'ytd-button-renderer:has(a[href*="/join"])',
            'ytd-video-owner-renderer > #sponsor-button'
        ]
    },
    {
        key: 'notifications',
        label: 'Notifications Bell',
        group: 'Top Bar',
        selectors: [
            'ytd-notification-topbar-button-renderer',
            'ytd-button-renderer:has(button[aria-label*="Notifications" i])'
        ]
    },
    {
        key: 'create_button',
        label: 'Create Button (Top Bar Only)',
        group: 'Top Bar',
        selectors: [
            'ytd-masthead ytd-button-renderer:has(button[aria-label*="Create" i])',
            'ytd-masthead yt-button-view-model:has(button[aria-label*="Create" i])'
        ]
    },
    {
        key: 'voice_search',
        label: 'Voice Search Button',
        group: 'Top Bar',
        selectors: ['#voice-search-button']
    },
    {
        key: 'ai_search',
        label: 'AI Search (Ask YouTube)',
        group: 'Top Bar',
        selectors: [
            'ytd-masthead ytd-ask-search-button-renderer',
            'ytd-masthead button[aria-label*="Ask" i]'
        ]
    },
    {
        key: 'youtube_logo',
        label: 'Logo & Seasonal Doodles',
        group: 'Top Bar',
        selectors: [
            'ytd-topbar-logo-renderer',
            'ytd-yoodle-renderer',
            '#big-yoodle'
        ]
    },
    {
        key: 'player_overlays',
        label: 'Player Overlays (End Screens, Paid Promotion)',
        group: 'Watch Page',
        selectors: [
            '.ytp-ce-element',
            '.ytp-paid-content-overlay',
            'yt-reaction-control-panel-view-model',
            'yt-reaction-control-panel-overlay-view-model'
        ]
    },
    {
        key: 'video_action_buttons',
        label: 'Video Actions (Download, Thanks, Clip)',
        group: 'Watch Page',
        selectors: [
            '#below ytd-download-button-renderer',
            '#below yt-button-view-model:has(button[aria-label="Thanks"])',
            '#below yt-button-view-model:has(button[aria-label="Clip"])',
            '#below ytd-video-owner-renderer > #purchase-button',
            'ytd-menu-popup-renderer ytd-menu-service-item-download-renderer'
        ]
    },
    {
        key: 'merch_and_fundraising',
        label: 'Merch & Fundraiser Shelves',
        group: 'Watch Page',
        selectors: [
            'ytd-merch-shelf-renderer',
            'ytd-structured-description-content-renderer #merch-shelf',
            '#secondary #donation-shelf',
            '#below ytd-badge-supported-renderer'
        ]
    },
    {
        key: 'ai_summary',
        label: 'AI Video Summary',
        group: 'Watch Page',
        selectors: ['#below [has-video-summary]']
    },
    {
        key: 'description_extras',
        label: 'Description Extras (Chapters, Transcript)',
        group: 'Watch Page',
        selectors: [
            '#below ytd-horizontal-card-list-renderer[modern-chapters]',
            '#below ytd-video-description-transcript-section-renderer',
            '#below ytd-video-description-infocards-section-renderer',
            '#below #teaser-carousel',
            '#below > #clarify-box'
        ]
    },
    {
        key: 'search_fluff',
        label: 'Search Fluff (Shelves, Movies, Promos)',
        group: 'Search & Channels',
        selectors: [
            'ytd-search ytd-shelf-renderer[thumbnail-style]',
            'ytd-search ytd-horizontal-card-list-renderer',
            'ytd-search ytd-movie-renderer',
            'ytd-search ytd-secondary-search-container-renderer'
        ]
    },
    {
        key: 'channel_page_extras',
        label: 'Channel Extras (Banner, Links, Member Shoutouts)',
        group: 'Search & Channels',
        selectors: [
            '#page-header-banner',
            'yt-attribution-view-model',
            'ytd-recognition-shelf-renderer'
        ]
    }
];

const YT_DCLTR_DEFAULTS = Object.fromEntries(
    YT_DCLTR_FEATURES.map(feature => [feature.key, true])
);
