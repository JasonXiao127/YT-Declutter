# YouTube Declutter

A browser extension that lets you hide distracting parts of YouTube. Choose exactly what you want gone — comments, Shorts, ads, buttons, the logo, and more.

<img width="800" alt="YouTube Declutter popup showing toggle groups" src="https://github.com/user-attachments/assets/d20b14e9-e097-4f64-9afd-ca271484b3eb" />

## Features

**Feed & Sidebar**

- **Shorts** – Remove Shorts from the feed, sidebar, search results, channel tabs, and description remixes.
- **Comments** – Hide the comment section under videos and the comments panel on Shorts.
- **Ads, Playables & Nag Toasts** – Block masthead ads, ad slots, the Playables shelf, and the "ad blocker detected" toast.
- **Category Chips** – Remove the filter chips row (All, Gaming, Music, etc.).
- **Top News Section** – Hide the "Top news" and "Breaking news" sections on the homepage.
- **Feedback Surveys** – Hide "How is this recommendation?" style surveys.
- **Sidebar Sections** – Remove the Explore and More from YouTube sidebar sections.
- **Join Buttons** – Hide membership join buttons.

**Top Bar**

- **Notifications Bell** – Hide the notification bell.
- **Create Button (Top Bar Only)** – Remove the Create (camera) button without touching watch-page actions like Clip or playlist creation.
- **Voice Search Button** – Disable the microphone button in the search bar.
- **AI Search (Ask YouTube)** – Remove the experimental "Ask" button.
- **Logo & Seasonal Doodles** – Hide the YouTube logo and holiday banner art.

**Watch Page**

- **Player Overlays** – Hide end-screen cards, paid-promotion notices, and live reaction overlays.
- **Video Actions** – Remove Download, Thanks, and Clip buttons under the player.
- **Merch & Fundraiser Shelves** – Hide merch shelves and donation boxes.
- **AI Video Summary** – Remove the AI-generated summary below the description.
- **Description Extras** – Collapse chapters, transcripts, and infocard sections in the description.
- **Info Panels (Clarify Box)** – Hide contextual info panels below the player. Off by default.

**Search & Channels**

- **Search Fluff** – Hide "People also watched" shelves, rent/buy movie rows, and promo panels in search results.
- **Channel Extras** – Hide channel banners, header link spam, and member shoutout shelves.

Each toggle works independently — turn things on or off whenever you want, with instant changes (no page reload needed). A **Reset to Defaults** button restores everything.

## Installation

### For Chromium‑based browsers (Chrome, Edge, Brave, Opera)

1. **Download** the extension:
    - Clone this repository:
      ```bash
      git clone https://github.com/JasonXiao127/unslopify.git
      ```
2. Open `chrome://extensions` (or your browser's equivalent).
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the `youtube-declutter` folder.

## Notes

- Runs on `*.youtube.com` (including `m.youtube.com`), except `music.youtube.com` which is excluded. Requires Chrome 105+ (or equivalent) for `:has()` selectors.
- Selectors are centralized in `youtube-declutter/features.js` — add or tweak entries there to extend it. The popup UI and hiding CSS are generated from that single file.
- Some features rely on English labels (e.g., "Top news", "Thanks") and may not match on localized YouTube interfaces.
- Hiding Shorts also blanks a directly-opened `/shorts/...` watch URL (the player itself is hidden). Hiding the logo removes the home link in the top bar.
- Privacy: settings are stored only in `chrome.storage.local` on your device. No network requests, analytics, or extra permissions.

## Changelog

- `10.1` — Fixed first-paint defaults flash, popup storage race, popup scrolling/disabled states, scoped Shorts/notifications selectors, split Clarify Box into opt-in Info Panels toggle, added icons, broadened YouTube matches (music excluded).
