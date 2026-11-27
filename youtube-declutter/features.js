// Note: several selectors match English aria-label/title substrings
// (e.g. "Notifications", "Create", "Top News"). On non-English YouTube
// those features silently do nothing — an inherent limitation of
// label-based selectors, not a bug in the hiding logic.
globalThis.YT_DCLTR_FEATURES = [
    {
        key: 'quality_enabled',
        label: 'Auto-set video quality',
        description: 'Set every video to your preferred resolution once on load. Manual changes afterwards are always respected.',
        keywords: 'quality resolution playback 1080p 720p 4k hd auto',
        group: 'Playback',
        behavior: 'quality',
        defaultEnabled: true
    },
    {
        key: 'quality_premium',
        label: 'Prefer enhanced bitrate (Premium)',
        description: 'When available, pick 1080p Premium / enhanced bitrate instead of standard. Requires YouTube Premium.',
        keywords: 'premium enhanced bitrate 1080p quality playback',
        group: 'Playback',
        behavior: 'qualityPremium',
        defaultEnabled: false,
        parent: 'quality_enabled'
    },
    {
        key: 'shorts',
        label: 'Shorts',
        description: 'Shorts shelves, tabs, and Shorts videos in feed and sidebar.',
        keywords: 'shorts reel vertical shelf tab',
        group: 'Shorts',
        selectors: [
            'ytd-rich-shelf-renderer[is-shorts]',
            'ytd-rich-grid-renderer[is-shorts-grid]',
            'ytd-rich-section-renderer:has(ytd-rich-shelf-renderer[is-shorts])',
            'ytd-rich-item-renderer:has(a[href*="/shorts/"])',
            'ytm-shorts-lockup-view-model',
            'ytd-reel-shelf-renderer',
            'ytm-shorts-lockup-view-model-v2',
            'grid-shelf-view-model:has(ytm-shorts-lockup-view-model-v2)',
            'grid-shelf-view-model:has(a[href^="/shorts/"])',
            'ytd-guide-entry-renderer:has(a[href^="/shorts"])',
            'ytd-guide-entry-renderer:has(a[title="Shorts" i])',
            'ytd-mini-guide-entry-renderer:has(a[href^="/shorts"])',
            'ytd-compact-video-renderer:has(a[href*="/shorts/"])',
            'ytd-grid-video-renderer:has(a[href*="/shorts/"])',
            'ytd-video-renderer:has(a[href*="/shorts/"])',
            'yt-lockup-view-model:has(a[href*="/shorts/"])',
            'ytd-shorts',
            'ytd-reel-video-renderer',
            'ytd-reel-overlay-renderer',
            'yt-chip-cloud-chip-renderer:has(yt-formatted-string[title*="shorts" i])',
            'yt-tab-shape[tab-title*="shorts" i]'
        ]
    },
    {
        key: 'shorts_as_watch',
        label: 'Open Shorts as regular videos',
        description: 'Rewrite Shorts links so they open as normal watch pages. Works best with Shorts hiding off — when both are on, rewritten links reappear as watch videos.',
        keywords: 'shorts watch redirect player normal',
        group: 'Shorts',
        behavior: 'shortsToWatch',
        defaultEnabled: false
    },
    {
        key: 'category_chips',
        label: 'Category Chips',
        description: 'Filter chips above the home feed and beside recommended videos.',
        keywords: 'filter chips categories topics feed related',
        group: 'Home / Feed',
        selectors: [
            'ytd-feed-filter-chip-bar-renderer',
            'yt-related-chip-cloud-renderer'
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
        key: 'community_posts',
        label: 'Community Posts',
        description: 'Community posts in feeds (including the Latest YouTube posts shelf) and their channel Posts tab.',
        keywords: 'community posts latest shelf backstage channel tab',
        group: 'Home / Feed',
        selectors: [
            'ytd-rich-section-renderer:has(ytd-post-renderer)',
            'ytd-rich-section-renderer:has(ytd-backstage-post-renderer)',
            'ytd-rich-shelf-renderer:has(ytd-post-renderer)',
            'ytd-rich-item-renderer:has(ytd-post-renderer)',
            'grid-shelf-view-model:has(ytd-post-renderer)',
            'ytd-search ytd-shelf-renderer:has(ytd-post-renderer)',
            'ytd-post-renderer',
            'ytd-backstage-post-renderer',
            'yt-tab-shape[tab-title="posts" i]',
            'yt-flexible-actions-view-model button-view-model:has(a[aria-label="community" i])'
        ]
    },
    {
        key: 'most_relevant',
        label: 'Most Relevant Shelf',
        description: 'The "Most relevant" recommendation shelf on the Subscriptions feed.',
        keywords: 'subscriptions most relevant recommended shelf feed',
        group: 'Home / Feed',
        selectors: [
            'ytd-rich-section-renderer[page-subtype="subscriptions"]:has(ytd-rich-shelf-renderer[elements-per-row="3"])'
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
        description: 'Playables links, masthead ads, ad slots, promoted placements, and blocker nag toasts.',
        keywords: 'ads playables games promo masthead nag blocker toast promoted companion banner',
        group: 'Home / Feed',
        selectors: [
            'ytd-rich-section-renderer:has(a[href*="/playables"])',
            'ytd-rich-item-renderer:has(a[href*="/playables"])',
            'ytd-compact-video-renderer:has(a[href*="/playables"])',
            'ytd-video-renderer:has(a[href*="/playables"])',
            'yt-lockup-view-model:has(a[href*="/playables"])',
            'ytd-video-masthead-ad-renderer',
            'ytd-video-masthead-ad-v3-renderer',
            'ytd-video-masthead-ad-advertiser-info-renderer',
            'ytd-video-masthead-ad-primary-video-renderer',
            'ytd-video-masthead-ad-primary-video-overlay-renderer',
            'ytd-page-top-ad-layout-renderer',
            'ytd-ad-slot-renderer',
            'ytd-in-feed-ad-layout-renderer',
            'ytd-display-ad-renderer',
            'ytd-companion-slot-renderer',
            'ytd-action-companion-ad-renderer',
            'ytd-promoted-sparkles-web-renderer',
            'ytd-promoted-video-renderer',
            'ytd-compact-promoted-video-renderer',
            'ytd-search-pyv-renderer',
            'ytd-statement-banner-renderer',
            'ytd-banner-promo-renderer',
            'tp-yt-paper-toast#toast:has(yt-button-renderer#action-button a[href*="blocker"])'
        ]
    },
    {
        key: 'guide_sections',
        label: 'Sidebar Sections (Explore, More from YouTube)',
        description: 'Explore, Gaming, Music, Shopping, Premium, Podcasts, and More from YouTube sidebar sections.',
        keywords: 'sidebar guide explore gaming music shopping premium podcasts more sections',
        group: 'Home / Feed',
        selectors: [
            'ytd-guide-section-renderer:has(a[href^="/feed/trending"])',
            'ytd-guide-section-renderer:has(a[href^="/feed/shopping"])',
            'ytd-guide-section-renderer:has(a[href^="/feed/explore"])',
            'ytd-guide-section-renderer:has(a[href^="/gaming"])',
            'ytd-guide-section-renderer:has(a[href^="/music"])',
            'ytd-guide-section-renderer:has(a[href*="/podcasts"])',
            'ytd-guide-section-renderer:has(a[href^="/premium"])',
            'ytd-guide-section-renderer:has(a[href^="/feed/storefront"])',
            'ytd-guide-section-renderer:has(a[href*="music.youtube.com"])',
            'ytd-guide-section-renderer:has(a[href*="tv.youtube.com"])',
            'ytd-guide-section-renderer:has(a[href*="youtubekids.com"])',
            'ytd-guide-section-renderer:has(a[href^="/labs"])',
            'ytd-guide-section-renderer:has(a[href="/reporthistory"])',
            'ytd-guide-entry-renderer:has(a[href^="/labs"])',
            'ytd-guide-entry-renderer:has(a[href="/reporthistory"])',
            'ytd-guide-entry-renderer:has(a[href^="/premium"])',
            'ytd-guide-entry-renderer:has(a[href^="/feed/storefront"])',
            'ytd-guide-entry-renderer:has(a[href^="/gaming"])',
            'ytd-guide-entry-renderer:has(a[href^="/music"])',
            'ytd-guide-entry-renderer:has(a[href*="/podcasts"])'
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
        key: 'home_feed',
        label: 'Home Feed',
        description: 'Entire video grid on the YouTube homepage. Opt-in; hides all home recommendations.',
        keywords: 'home feed homepage recommendations grid',
        group: 'Home / Feed',
        defaultHidden: false,
        selectors: [
            'ytd-browse[page-subtype="home"] ytd-rich-grid-renderer'
        ]
    },
    {
        key: 'mixes',
        label: 'Mixes & Radio',
        description: 'Auto-generated Mix and radio playlists in feeds and sidebars.',
        keywords: 'mix radio playlist autoplay blend',
        group: 'Home / Feed',
        selectors: [
            'yt-lockup-view-model:has(a[href*="list=RDMM"])',
            'ytd-rich-item-renderer:has(a[href*="list=RDMM"])',
            'ytd-compact-video-renderer:has(a[href*="list=RDMM"])',
            'ytd-video-renderer:has(a[href*="list=RDMM"])',
            'ytd-playlist-renderer:has(a[href*="list=RDMM"])',
            'ytd-compact-playlist-renderer:has(a[href*="list=RDMM"])',
            'yt-lockup-view-model:has(a[href*="list=RD"])',
            'ytd-rich-item-renderer:has(a[href*="list=RD"])',
            'ytd-compact-video-renderer:has(a[href*="list=RD"])',
            'ytd-video-renderer:has(a[href*="list=RD"])',
            'ytd-playlist-renderer:has(a[href*="list=RD"])',
            'ytd-compact-playlist-renderer:has(a[href*="list=RD"])',
            'ytd-radio-renderer',
            'ytd-compact-radio-renderer'
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
        description: 'Ask / AI search button in the top bar and the Ask YouTube filter chip on search.',
        keywords: 'ai ask search top bar gemini chip',
        group: 'Top Bar',
        selectors: [
            'ytd-masthead ytd-ask-search-button-renderer',
            'ytd-masthead button[aria-label^="Ask" i]',
            'yt-chip-cloud-chip-renderer[chip-style="STYLE_AI_MODE_CHIP"]',
            'ytd-search-header-renderer yt-chip-cloud-chip-renderer:has(button[aria-label*="Ask" i])'
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
        key: 'top_header',
        label: 'Entire Top Header',
        description: 'Full masthead bar across the top. Opt-in; removes search, buttons, and logo together.',
        keywords: 'header masthead top bar full hide',
        group: 'Top Bar',
        defaultHidden: false,
        selectors: [
            '#masthead-container',
            'ytd-masthead'
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
        key: 'recommended',
        label: 'Recommended Sidebar (Up Next)',
        description: 'Up Next and related video list beside the player. Opt-in; keeps comments and description.',
        keywords: 'recommended related up next sidebar suggestions watch',
        group: 'Watch Page',
        defaultHidden: false,
        selectors: [
            'ytd-watch-flexy #related',
            'ytd-watch-next-secondary-results-renderer'
        ]
    },
    {
        key: 'live_chat',
        label: 'Live Chat',
        description: 'Live chat and chat replay beside live streams and premieres.',
        keywords: 'live chat stream premiere replay watch',
        group: 'Watch Page',
        selectors: [
            '#chat-container',
            '#chat',
            'ytd-live-chat-frame'
        ]
    },
    {
        key: 'playlist_panel',
        label: 'Playlist Queue Panel',
        description: 'Up-next queue panel above recommendations when a playlist is open. Opt-in.',
        keywords: 'playlist queue panel up next watch',
        group: 'Watch Page',
        defaultHidden: false,
        selectors: [
            '#playlist',
            'ytd-playlist-panel-renderer'
        ]
    },
    {
        key: 'player_overlays',
        label: 'Player Overlays (End Screens, Paid Promotion)',
        description: 'End screens, pause overlay suggestions, paid promotion, and reaction panels over the player.',
        keywords: 'player overlay end screen pause paid promotion reaction watch',
        group: 'Watch Page',
        selectors: [
            '.ytp-ce-element',
            '.ytp-endscreen-content',
            '.ytp-pause-overlay',
            '.ytp-paid-content-overlay',
            'ytd-endscreen-watch-next-renderer',
            'yt-reaction-control-panel-view-model',
            'yt-reaction-control-panel-overlay-view-model'
        ]
    },
    {
        key: 'video_action_buttons',
        label: 'Video Actions (Download, Thanks, Hype, Clip)',
        description: 'Download, Thanks, Hype, Clip, and purchase buttons under the video.',
        keywords: 'download thanks hype clip purchase actions watch',
        group: 'Watch Page',
        selectors: [
            '#below ytd-download-button-renderer',
            '#below yt-button-view-model:has(button[aria-label*="thanks" i])',
            '#below yt-button-view-model:has(button[aria-label*="hype" i])',
            '#below yt-button-view-model:has(button[aria-label*="clip" i])',
            '#below ytd-video-owner-renderer > #purchase-button',
            'ytd-menu-service-item-download-renderer'
        ]
    },
    {
        key: 'merch_and_fundraising',
        label: 'Merch & Fundraiser Shelves',
        description: 'Merch, tickets, shopping, donation, and badge shelves around the video.',
        keywords: 'merch fundraiser donation tickets shopping shelf store watch',
        group: 'Watch Page',
        selectors: [
            'ytd-merch-shelf-renderer',
            'ytd-structured-description-content-renderer #merch-shelf',
            'ytd-ticket-shelf-renderer',
            '#shopping-timely-shelf',
            '#secondary #donation-shelf',
            'ytd-donation-shelf-renderer'
        ]
    },
    {
        key: 'ai_summary',
        label: 'AI Summaries (Video & Search)',
        description: 'AI-generated summaries below the player and in search results.',
        keywords: 'ai summary description watch search',
        group: 'Watch Page',
        selectors: [
            '#below [has-video-summary]',
            '[has-video-summary]',
            'video-summary-content-view-model',
            'video-summary-content-view-model-wiz',
            'yt-video-summary-content-view-model'
        ]
    },
    {
        key: 'watch_ask',
        label: 'Ask About This Video (AI)',
        description: 'Ask button, Ask questions box, and YouChat entry points on the watch page.',
        keywords: 'ask ai questions youchat gemini video watch',
        group: 'Watch Page',
        selectors: [
            '#below yt-button-view-model:has(button[aria-label="Ask" i])',
            '#flexible-item-buttons yt-button-view-model:has(button[aria-label="Ask" i])',
            'yt-video-description-youchat-section-view-model',
            'yt-player-quick-action-buttons:has(.you-chat-entrypoint-button)',
            '.ytp-fullscreen-quick-actions .you-chat-entrypoint-button'
        ]
    },
    {
        key: 'description_extras',
        label: 'Description Extras (Chapters, Transcript)',
        description: 'Chapters, transcript, infocards, teaser carousel, auto-dub info, and people mentioned.',
        keywords: 'chapters transcript infocards teaser description auto-dubbed people mentioned watch',
        group: 'Watch Page',
        selectors: [
            '#below ytd-horizontal-card-list-renderer[modern-chapters]',
            '#below ytd-video-description-transcript-section-renderer',
            '#below ytd-video-description-infocards-section-renderer',
            '#below #teaser-carousel',
            '#below how-this-was-made-section-view-model',
            '#below yt-video-attributes-section-view-model'
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
        keywords: 'search movies shelf promo secondary exploratory suggestions',
        group: 'Search & Channel',
        selectors: [
            'ytd-search ytd-shelf-renderer:has(ytd-movie-renderer, a[href*="/movies"], a[href*="/store"], a[href*="/promo"])',
            'ytd-search ytd-horizontal-card-list-renderer:has(ytd-movie-renderer, a[href*="/movies"], a[href*="/store"], a[href*="/promo"])',
            'ytd-search grid-shelf-view-model:has(ytd-movie-renderer, a[href*="/movies"], a[href*="/store"], a[href*="/promo"])',
            'ytd-search ytd-secondary-search-container-renderer',
            'ytd-search ytd-reel-shelf-renderer',
            'ytd-search ytd-movie-renderer'
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
    },
    {
        key: 'sidebar_subs_only',
        label: 'Subscriptions-Only Sidebar',
        description: 'Keeps only Subscriptions and your subscribed channels in the sidebar. Hides Home, Shorts, You, History, Explore, and More from YouTube.',
        keywords: 'sidebar subscriptions channels guide only subs keep',
        group: 'Home / Feed',
        defaultHidden: false,
        selectors: [
            '#guide-content ytd-guide-section-renderer:has(a[href^="/feed/storefront"])',
            '#guide-content ytd-guide-section-renderer:has(a[href*="tv.youtube.com"])',
            '#guide-content ytd-guide-section-renderer:has(a[href*="music.youtube.com"])',
            '#guide-content ytd-guide-section-renderer:has(a[href*="youtubekids.com"])',
            '#guide-content ytd-guide-section-renderer:has(a[href^="/labs"])',
            '#guide-content ytd-guide-section-renderer:has(a[href="/reporthistory"])',
            '#guide-content ytd-guide-section-renderer:has(a[href*="/channel/UC-9-kyTW8ZkZNDHQJ6FgpwQ"])',
            '#guide-content ytd-guide-section-renderer:has(a[href*="/channel/UC4R8DWoMoI7CAwX8_LjQHig"])',
            '#guide-content ytd-guide-section-renderer:has(a[href^="/feed/you"]):not(:has(a[href^="/feed/subscriptions"]))',
            '#guide-content ytd-guide-section-renderer:has(a[href^="/feed/history"]):not(:has(a[href^="/feed/subscriptions"]))',
            '#guide-content ytd-guide-section-renderer > #items > ytd-guide-entry-renderer:not(#expander-item):not(#collapser-item):not(:has(a[href^="/feed/subscriptions"])):not(:has(a[href^="/feed/channels"])):not(:has(a[href^="/@"])):not(:has(a[href*="/channel/"])):not(:has(a[href*="/c/"])):not(:has(a[href*="/user/"]))',
            '#guide-content ytd-guide-collapsible-section-entry-renderer:has(a[href^="/feed/you"])',
            '#guide-content ytd-guide-collapsible-section-entry-renderer:has(a[href^="/feed/history"])',
            '#guide-content ytd-guide-collapsible-entry-renderer:has(a[href^="/feed/you"])',
            '#guide-content ytd-guide-collapsible-entry-renderer:has(a[href^="/feed/history"])',
            'ytd-mini-guide-entry-renderer:not(:has(a[href^="/feed/subscriptions"]))'
        ]
    },
    {
        key: 'home_to_subs',
        label: 'Home Redirects to Subscriptions',
        description: 'Opening youtube.com/ lands on your Subscriptions feed instead. Opt-in.',
        keywords: 'home redirect subscriptions feed homepage',
        group: 'Home / Feed',
        behavior: 'homeToSubs',
        defaultEnabled: false
    },
    {
        key: 'autoplay_off',
        label: 'Turn Off Autoplay',
        description: 'Switches the player autoplay toggle off and keeps it off. Restores it when turned back off. Opt-in.',
        keywords: 'autoplay autonav next up next video player',
        group: 'Watch Page',
        behavior: 'autoplayOff',
        defaultEnabled: false
    },
    {
        key: 'monk_mode',
        label: 'Monk Mode',
        description: 'One switch lockdown: only search, subscriptions, and your channels. No feed, Shorts, recommendations, comments, or autoplay.',
        keywords: 'monk mode lockdown focus subs only minimal',
        behavior: 'monkMode',
        mode: true,
        defaultEnabled: false,
        preset: {
            shorts: true,
            category_chips: true,
            top_news: true,
            community_posts: true,
            most_relevant: true,
            surveys: true,
            ads_playables: true,
            guide_sections: true,
            join_button: true,
            home_feed: true,
            mixes: true,
            notifications: true,
            create_button: true,
            voice_search: true,
            ai_search: true,
            youtube_logo: true,
            top_header: false,
            comments: true,
            recommended: true,
            live_chat: true,
            playlist_panel: true,
            player_overlays: true,
            video_action_buttons: true,
            merch_and_fundraising: true,
            ai_summary: true,
            watch_ask: true,
            description_extras: false,
            search_fluff: true,
            channel_page_extras: true,
            sidebar_subs_only: true,
            home_to_subs: true,
            autoplay_off: true
        }
    }
];

globalThis.YT_DCLTR_DEFAULTS = Object.fromEntries(
    globalThis.YT_DCLTR_FEATURES.map(feature => [
        feature.key,
        feature.behavior ? !!feature.defaultEnabled : feature.defaultHidden !== false
    ])
);

globalThis.YT_DCLTR_QUALITY_DEFAULT = 'hd1080';
globalThis.YT_DCLTR_QUALITY_OPTIONS = [
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
globalThis.YT_DCLTR_QUALITY_VALUES = globalThis.YT_DCLTR_QUALITY_OPTIONS.map(o => o.value);

// Canonical source is quality-core.js (loaded before this file). Adopt it
// when present so display metadata and logic can never drift; otherwise the
// literals above stand alone (e.g. features.js loaded without the core).
try {
    var __core = globalThis.YT_DCLTR_QUALITY_CORE;
    if (__core && typeof __core === 'object') {
        if (typeof __core.QUALITY_DEFAULT === 'string') globalThis.YT_DCLTR_QUALITY_DEFAULT = __core.QUALITY_DEFAULT;
        if (Array.isArray(__core.QUALITY_OPTIONS)) globalThis.YT_DCLTR_QUALITY_OPTIONS = __core.QUALITY_OPTIONS;
        if (Array.isArray(__core.QUALITY_VALUES)) globalThis.YT_DCLTR_QUALITY_VALUES = __core.QUALITY_VALUES;
    }
} catch (err) { /* ignore */ }
