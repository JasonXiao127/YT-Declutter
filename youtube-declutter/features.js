globalThis.YT_DCLTR_FEATURES = [
    {
        key: 'shorts',
        label: 'Shorts',
        description: 'Shorts shelves, tabs, and Shorts videos in feed and sidebar.',
        keywords: 'shorts reel vertical shelf tab',
        group: 'Shorts',
        selectors: [
            'ytd-rich-shelf-renderer[is-shorts]',
            'ytd-rich-section-renderer:has(ytd-rich-shelf-renderer[is-shorts])',
            'ytd-reel-shelf-renderer',
            'ytd-guide-entry-renderer:has(a[href^="/shorts"])',
            'ytd-mini-guide-entry-renderer:has(a[href^="/shorts"])',
            'ytd-compact-video-renderer:has(a[href^="/shorts/"], a[href*="/shorts/"])',
            'ytd-grid-video-renderer:has(a[href^="/shorts/"], a[href*="/shorts/"])',
            'ytd-video-renderer:has(a[href^="/shorts/"], a[href*="/shorts/"])',
            'yt-lockup-view-model:has(a[href^="/shorts/"], a[href*="/shorts/"])',
            'yt-shelf-view-model:has(a[href^="/shorts/"], a[href*="/shorts/"])',
            'ytd-shorts',
            'ytd-reel-video-renderer',
            'ytd-reel-overlay-renderer',
            'grid-shelf-view-model:has(a[href^="/shorts/"])',
            'ytd-item-section-renderer:has(grid-shelf-view-model:has(a[href^="/shorts/"]))',
            'yt-chip-cloud-chip-renderer:has(yt-formatted-string[title*="shorts" i])',
            'yt-tab-shape[tab-title*="shorts" i]'
        ]
    },
    {
        key: 'shorts_as_watch',
        label: 'Open Shorts as regular videos',
        description: 'Rewrite Shorts links so they open as normal watch pages.',
        keywords: 'shorts watch redirect player normal',
        group: 'Shorts',
        parent: 'shorts',
        behavior: 'shortsToWatch',
        defaultEnabled: false
    },
    {
        key: 'category_chips',
        label: 'Category Chips',
        description: 'Filter chips bar above the home feed.',
        keywords: 'filter chips categories topics feed',
        group: 'Home / Feed',
        selectors: [
            'ytd-feed-filter-chip-bar-renderer',
            'ytd-feed-filter-chip-bar-renderer #chips-wrapper'
        ]
    },
    {
        key: 'top_news',
        label: 'Top News Section',
        description: 'Breaking and Top News shelves in the feed.',
        keywords: 'news breaking top shelf feed',
        group: 'Home / Feed',
        selectors: [
            'ytd-rich-section-renderer:has(yt-formatted-string[title*="top news" i])',
            'ytd-rich-section-renderer:has(yt-formatted-string[title*="breaking news" i])'
        ]
    },
    {
        key: 'surveys',
        label: 'Feedback Surveys',
        description: 'Inline feedback and survey prompts.',
        keywords: 'survey feedback poll prompt',
        group: 'Home / Feed',
        selectors: [
            'ytd-inline-survey-renderer',
            '#attached-survey'
        ]
    },
    {
        key: 'ads_playables',
        label: 'Ads, Playables & Nag Toasts',
        description: 'Playables links, masthead ads, ad slots, and blocker nag toasts.',
        keywords: 'ads playables games promo masthead nag blocker toast',
        group: 'Home / Feed',
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
        key: 'guide_sections',
        label: 'Sidebar Sections (Explore, More from YouTube)',
        description: 'Explore, Shopping, Premium, and More from YouTube sidebar sections.',
        keywords: 'sidebar guide explore shopping premium more sections',
        group: 'Home / Feed',
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
        description: 'Channel Join and membership buttons.',
        keywords: 'join member sponsor membership',
        group: 'Home / Feed',
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
        description: 'Bell icon in the top bar.',
        keywords: 'notifications bell top bar',
        group: 'Top Bar',
        selectors: [
            'ytd-notification-topbar-button-renderer',
            'ytd-masthead ytd-button-renderer:has(button[aria-label*="Notifications" i])'
        ]
    },
    {
        key: 'create_button',
        label: 'Create Button (Top Bar Only)',
        description: 'Create and Upload button in the top bar.',
        keywords: 'create upload top bar',
        group: 'Top Bar',
        selectors: [
            'ytd-masthead ytd-button-renderer:has(button[aria-label*="Create" i])',
            'ytd-masthead yt-button-view-model:has(button[aria-label*="Create" i])',
            'ytd-masthead a[href*="/upload"]'
        ]
    },
    {
        key: 'voice_search',
        label: 'Voice Search Button',
        description: 'Microphone button next to search.',
        keywords: 'voice microphone search top bar',
        group: 'Top Bar',
        selectors: ['#voice-search-button']
    },
    {
        key: 'ai_search',
        label: 'AI Search (Ask YouTube)',
        description: 'Ask and AI search button in the top bar.',
        keywords: 'ai ask search top bar gemini',
        group: 'Top Bar',
        selectors: [
            'ytd-masthead ytd-ask-search-button-renderer',
            'ytd-masthead button[aria-label*="Ask" i]'
        ]
    },
    {
        key: 'youtube_logo',
        label: 'Logo & Seasonal Doodles',
        description: 'Top-left logo and doodles. Also removes the home link.',
        keywords: 'logo doodle yoodle home top bar',
        group: 'Top Bar',
        defaultHidden: false,
        selectors: [
            'ytd-topbar-logo-renderer',
            'ytd-yoodle-renderer',
            '#big-yoodle'
        ]
    },
    {
        key: 'comments',
        label: 'Comments',
        description: 'Comments section under videos and in the engagement panel.',
        keywords: 'comments replies discussion watch',
        group: 'Watch Page',
        selectors: [
            '#comments',
            'ytd-comments',
            'ytd-item-section-renderer:has(#comments)',
            'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-comments-section"]'
        ]
    },
    {
        key: 'player_overlays',
        label: 'Player Overlays (End Screens, Paid Promotion)',
        description: 'End screens, paid promotion, and reaction panels over the player.',
        keywords: 'player overlay end screen paid promotion reaction watch',
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
        description: 'Download, Thanks, Clip, and purchase buttons under the video.',
        keywords: 'download thanks clip purchase actions watch',
        group: 'Watch Page',
        selectors: [
            '#below ytd-download-button-renderer',
            '#below yt-button-view-model:has(button[aria-label*="thanks" i])',
            '#below yt-button-view-model:has(button[aria-label*="clip" i])',
            '#below ytd-video-owner-renderer > #purchase-button',
            '#below ytd-menu-popup-renderer ytd-menu-service-item-download-renderer'
        ]
    },
    {
        key: 'merch_and_fundraising',
        label: 'Merch & Fundraiser Shelves',
        description: 'Merch, donation, and badge shelves around the video.',
        keywords: 'merch fundraiser donation shelf store watch',
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
        description: 'AI-generated video summary box below the video.',
        keywords: 'ai summary description watch',
        group: 'Watch Page',
        selectors: ['#below [has-video-summary]']
    },
    {
        key: 'description_extras',
        label: 'Description Extras (Chapters, Transcript)',
        description: 'Chapters, transcript, infocards, and teaser carousel.',
        keywords: 'chapters transcript infocards teaser description watch',
        group: 'Watch Page',
        selectors: [
            '#below ytd-horizontal-card-list-renderer[modern-chapters]',
            '#below ytd-video-description-transcript-section-renderer',
            '#below ytd-video-description-infocards-section-renderer',
            '#below #teaser-carousel'
        ]
    },
    {
        key: 'info_panels',
        label: 'Info Panels (Clarify Box)',
        description: 'Fact-check and clarify info box. Shown by default.',
        keywords: 'info clarify fact check panel watch',
        group: 'Watch Page',
        defaultHidden: false,
        selectors: [
            '#below #clarify-box'
        ]
    },
    {
        key: 'search_fluff',
        label: 'Search Fluff (Shelves, Movies, Promos)',
        description: 'Movie shelves, promos, and secondary panels in search results.',
        keywords: 'search movies shelf promo secondary',
        group: 'Search & Channel',
        selectors: [
            'ytd-search ytd-shelf-renderer[thumbnail-style]:has(ytd-movie-renderer, a[href*="/movies"], a[href*="/store"], a[href*="/promo"])',
            'ytd-search ytd-horizontal-card-list-renderer',
            'ytd-search ytd-movie-renderer',
            'ytd-search ytd-secondary-search-container-renderer'
        ]
    },
    {
        key: 'channel_page_extras',
        label: 'Channel Extras (Banner, Links, Member Shoutouts)',
        description: 'Channel banner, header links, and member shoutouts.',
        keywords: 'channel banner links shoutout members header',
        group: 'Search & Channel',
        selectors: [
            '#page-header-banner',
            'ytd-c4-tabbed-header-renderer yt-attribution-view-model',
            'ytd-channel-header-renderer yt-attribution-view-model',
            '#page-header yt-attribution-view-model',
            'ytd-recognition-shelf-renderer'
        ]
    }
];

globalThis.YT_DCLTR_DEFAULTS = Object.fromEntries(
    globalThis.YT_DCLTR_FEATURES.map(feature => [
        feature.key,
        feature.behavior ? !!feature.defaultEnabled : feature.defaultHidden !== false
    ])
);
