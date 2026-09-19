# YouTube Declutter

Hide parts of YouTube you do not want. Pick what to hide. Changes apply at once. No reload needed.

<img width="800" alt="YouTube Declutter popup showing toggle groups" src="https://github.com/user-attachments/assets/d20b14e9-e097-4f64-9afd-ca271484b3eb" />

## Features

**Feed & Sidebar**

- **Shorts**: Removes Shorts from the feed, sidebar, search results, channel tabs, and remixes in descriptions.
- **Comments**: Hides comments under videos and the comments panel on Shorts.
- **Ads, Playables & Nag Toasts**: Hides masthead ads, ad slots, the Playables shelf, and the ad blocker toast.
- **Category Chips**: Hides the filter chips row (All, Gaming, Music, and the rest).
- **Top News Section**: Hides the Top news and Breaking news sections on the homepage.
- **Feedback Surveys**: Hides feedback surveys on recommendations.
- **Sidebar Sections**: Hides the Explore and More from YouTube sections.
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

**Search & Channels**

- **Search Fluff**: Hides extra shelves, movie rows, and promo panels in search results.
- **Channel Extras**: Hides channel banners, header links, and member shoutout shelves.

Reset to Defaults turns everything back to the standard setup.

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

- Works on `*.youtube.com`, including `m.youtube.com`. Skips `music.youtube.com`. Needs Chrome 105 or newer.
- All selectors live in `youtube-declutter/features.js`. The popup and hiding CSS come from that one file.
- Some features match English labels (Top news, Thanks). They may not match on localized YouTube.
- Hiding Shorts blanks a Shorts page you open direct. The player itself is hidden.
- Settings stay in `chrome.storage.local` on your device. No network calls. No analytics.

## Changelog

- `10.1`: Fixed the first paint flash. Fixed the popup storage race. Added popup scrolling. Scoped Shorts and notification selectors. Moved the Clarify Box to its own Info Panels toggle. Added icons. Broadened matches to `*.youtube.com` except Music.
