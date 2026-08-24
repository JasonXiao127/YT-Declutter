# YouTube Declutter

A browser extension that lets you hide distracting parts of YouTube. Choose exactly what you want gone — comments, Shorts, ads, buttons, the logo, and more.

<img width="2153" height="1311" alt="image" src="https://github.com/user-attachments/assets/d20b14e9-e097-4f64-9afd-ca271484b3eb" />

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

**Search & Channels**

- **Search Fluff** – Hide "People also watched" shelves, rent/buy movie rows, and promo panels in search results.
- **Channel Extras** – Hide channel banners, header link spam, and member shoutout shelves.

Each toggle works independently — turn things on or off whenever you want, with instant changes (no page reload needed). A **Reset to Defaults** button restores everything.

## Installation

### For Chromium‑based browsers (Chrome, Edge, Brave, Opera)

1. **Download** the extension:
   - Clone this repository:
     ```bash
     git clone https://github.com/JasonXiao127/YT-Declutter
     ```
2. Open `chrome://extensions` (or your browser's equivalent).
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the `youtube-declutter` folder.

## Notes

- The extension runs on `www.youtube.com` only; YouTube Music and mobile are unaffected.
- Selectors are centralized in `youtube-declutter/features.js` — add or tweak entries there to extend it. The popup UI and hiding CSS are generated from that single file.
- Some features rely on English labels (e.g., "Top news", "Thanks") and may not match on localized YouTube interfaces.
