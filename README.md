# YouTube Declutter

Hide parts of YouTube you do not want. Pick what to hide. Changes apply at once. No reload needed.

<img width="800" alt="YouTube Declutter popup showing toggle groups" src="https://github.com/user-attachments/assets/d20b14e9-e097-4f64-9afd-ca271484b3eb" />

## Features

**Playback**

- **Auto-set video quality**: Sets every video to your preferred resolution once on load (default 1080p). Manual changes afterwards are always respected.
- **Prefer enhanced bitrate (Premium)**: Picks 1080p Premium / enhanced bitrate when available. Requires YouTube Premium. Off by default.

**Shorts**

- **Shorts**: Removes Shorts shelves, tabs, and Shorts videos in feed and sidebar.
- **Open Shorts as regular videos**: Rewrites Shorts links so they open as normal watch pages. Off by default. Works best with Shorts hiding off — when both are on, rewritten links reappear as watch videos.

**Home / Feed**

- **Comments**: Hides comments under videos and the comments engagement panel.
- **Ads, Playables & Nag Toasts**: Hides masthead ads, ad slots, the Playables shelf, and the ad blocker toast.
- **Category Chips**: Hides the filter chips row (All, Gaming, Music, and the rest).
- **Top News Section**: Hides the Top news and Breaking news sections on the homepage.
- **Feedback Surveys**: Hides feedback surveys on recommendations.
- **Sidebar Sections**: Hides Explore, Trending, Shopping, Premium, Storefront, and More from YouTube sidebar sections.
- **Join Buttons**: Hides channel Join buttons.

**Top Bar**

- **Notifications Bell**: Hides the notification bell.
- **Create Button (Top Bar Only)**: Hides the Create button in the top bar. Does not touch Clip or other watch page buttons.
- **Voice Search Button**: Hides the mic button in the search bar.
- **AI Search (Ask YouTube)**: Hides the Ask button.
- **Logo & Seasonal Doodles**: Hides the YouTube logo and seasonal art. Off by default. Hiding the logo also removes the home link.

**Watch Page**

- **Player Overlays**: Hides end screen cards, paid promotion notices, and live reaction overlays.
- **Video Actions**: Hides the Download, Thanks, and Clip buttons under the player.
- **Merch & Fundraiser Shelves**: Hides merch shelves and donation boxes.
- **AI Video Summary**: Hides the AI summary below the description.
- **Description Extras**: Hides chapters, transcripts, and infocard sections in the description.
- **Info Panels (Clarify Box)**: Hides info panels below the player. Off by default.

**Search & Channel**

- **Search Fluff**: Hides extra shelves, movie rows, and promo panels in search results.
- **Channel Extras**: Hides channel banners, header links, and member shoutout shelves.

Reset to Defaults restores the extension defaults (most hiding on; Logo, Info Panels, Premium enhanced bitrate, and Shorts-as-watch off; quality 1080p). Needs two clicks to confirm.

## Installation

### Chrome, Edge, Brave, Opera

1. Clone the repo:
   ```bash
   git clone https://github.com/JasonXiao127/YT-Declutter.git
   ```
2. Open `chrome://extensions`.
3. Turn on Developer mode.
4. Click Load unpacked and pick the `youtube-declutter` folder.

## Notes

- Works on desktop `youtube.com` / `*.youtube.com`. Skips `music.youtube.com`. Needs Chrome 111 or newer.
- Hiding selectors live in `youtube-declutter/features.js`. Player controls (quality menu) are matched in `quality-main.js`; Shorts link rewriting queries live in `content.js`. The popup and hiding CSS are generated from `features.js`.
- Some features match English labels (Top News, Breaking News, Thanks, Clip, Shorts tab, Notifications, Create, Ask). They silently do nothing on localized YouTube.
- Hiding Shorts blanks a Shorts page you open direct. The hidden Shorts player is also paused so no audio keeps playing.
- Settings stay in `chrome.storage.local` on your device. No network calls. No analytics.

## Changelog

- `10.4.0`: Auto-set video quality (default 1080p) with Premium enhanced-bitrate option. Dev-only regression suite (50 tests) + dist packager. Fixed settings-bridge race (no enforce from pre-storage defaults), settings-menu close logic, mid-roll ad re-enforcement, ad-budget reset, storage-error pending saves, tokenized popup search, switch contrast, bare-domain matches, `all_frames` symmetry. Removed overbroad badge selector.
- `10.3`: Fixed reliability, selector precision, and popup accessibility. Popup UI overhaul: grouped collapsible toggles, search, descriptions, order-independent enable-all.
- `10.2`: Fixed broken toggles and hiding. `features.js` now assigns to `globalThis` so popup and content script can read definitions.
- `10.1`: Fixed the first paint flash. Fixed the popup storage race. Added popup scrolling. Scoped Shorts and notification selectors. Moved the Clarify Box to its own Info Panels toggle. Added icons. Broadened matches to `*.youtube.com` except Music.
