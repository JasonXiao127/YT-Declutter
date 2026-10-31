# YouTube Declutter

Hide parts of YouTube you do not want. Pick what to hide. Changes apply at once. No reload needed.

<img width="800" alt="YouTube Declutter popup showing toggle groups" src="https://github.com/user-attachments/assets/d20b14e9-e097-4f64-9afd-ca271484b3eb" />

## Features

33 toggles in 6 groups, plus Monk Mode and a preferred-resolution dropdown. Most hiding is on by default; 11 toggles are opt-in: Logo & Seasonal Doodles, Entire Top Header, Home Feed, Recommended Sidebar, Playlist Queue Panel, Info Panels, Prefer enhanced bitrate, Open Shorts as regular videos, Subscriptions-Only Sidebar, Home Redirects to Subscriptions, and Turn Off Autoplay.

**Monk Mode**

- **Monk Mode**: One switch at the top of the popup. While on, YouTube is locked to search, your Subscriptions feed, your subscribed channels, and the watch page essentials (player, title/channel, description, chapters/transcript, like/save/share). Everything else is forced off: home feed (opening `youtube.com/` lands on `/feed/subscriptions`), Shorts, sidebar sections and entries beyond subscriptions/channels, related/up-next, comments, live chat, playlist queue, end screens, pause suggestions, merch, fundraiser, AI summary, mixes, download/thanks/clip, masthead logo/notifications/create/voice/Ask, ads, surveys, news, chips, channel banners/links, search shelves/movies/promos, and autoplay. It is a layer over your saved toggles, not a preset: your setup is never overwritten, and exiting restores it exactly. Locked rows show their forced state and cannot be flipped; group **All** / **None** and **Enable all** are parked while active. **Disable all** and **Reset** still work and exit the mode. Autoplay is switched back on when you exit, where possible; closing the tab before exiting may leave it off.

**Playback**

- **Auto-set video quality**: Sets every video to your preferred resolution once on load (default 1080p). Manual changes afterwards are always respected. Applies to watch, embed, and live-URL pages; live streams are left alone (no fixed ladder), and enforcement waits out ads instead of fighting them. Resolutions: 144p through 8K plus Highest available.
- **Prefer enhanced bitrate (Premium)**: Picks 1080p Premium / enhanced bitrate when available. Requires YouTube Premium. Off by default.

**Shorts**

- **Shorts**: Removes Shorts shelves, tabs, and Shorts videos in feed and sidebar.
- **Open Shorts as regular videos**: Rewrites Shorts links so they open as normal watch pages. Off by default. Works best with Shorts hiding off — when both are on, rewritten links reappear as watch videos. Direct `/shorts/<id>` page loads redirect to `/watch`; clicks (left, middle, and modifier-click) are rewritten in place. Only full 11-character video IDs are rewritten, so paths like `/shorts/feed` are untouched.

**Home / Feed**

- **Category Chips**: Hides the filter chips bar above the home feed.
- **Top News Section**: Hides the Top news and Breaking news shelves in the feed.
- **Feedback Surveys**: Hides inline feedback and survey prompts.
- **Ads, Playables & Nag Toasts**: Hides Playables links, masthead ads, ad slots, and ad-blocker nag toasts.
- **Sidebar Sections (Explore, More from YouTube)**: Hides Explore, Trending, Shopping, Premium, Storefront, and More-from-YouTube sidebar sections.
- **Join Buttons**: Hides channel Join and membership buttons.
- **Home Feed**: Hides the entire video grid on the homepage. Opt-in; search and subscriptions are untouched.
- **Mixes & Radio**: Hides auto-generated Mix and radio playlists in feeds and sidebars.
- **Subscriptions-Only Sidebar**: Keeps only Subscriptions and your subscribed channels in the sidebar. Hides Home, Shorts, You, History, Explore, and More from YouTube. Off by default.
- **Home Redirects to Subscriptions**: Opening `youtube.com/` lands on your Subscriptions feed instead. Off by default.

**Top Bar**

- **Notifications Bell**: Hides the notification bell.
- **Create Button (Top Bar Only)**: Hides the Create / Upload button in the top bar. Does not touch Clip or other watch page buttons.
- **Voice Search Button**: Hides the microphone button next to search.
- **AI Search (Ask YouTube)**: Hides the Ask / AI search button in the top bar.
- **Logo & Seasonal Doodles**: Hides the YouTube logo and seasonal art. Off by default. Hiding the logo also removes the home link.
- **Entire Top Header**: Hides the full masthead: search, buttons, and logo together. Opt-in.

**Watch Page**

- **Comments**: Hides the comments section under videos and the comments engagement panel.
- **Recommended Sidebar (Up Next)**: Hides the related-video list beside the player. Opt-in; keeps comments and description.
- **Live Chat**: Hides live chat and chat replay beside live streams and premieres.
- **Playlist Queue Panel**: Hides the playlist queue above recommendations when a playlist is open. Opt-in.
- **Player Overlays (End Screens, Paid Promotion)**: Hides end screens, paid promotion overlays, and reaction panels over the player.
- **Video Actions (Download, Thanks, Clip)**: Hides the Download, Thanks, Clip, and purchase buttons under the video, plus the download menu item.
- **Merch & Fundraiser Shelves**: Hides merch, donation, and badge shelves around the video.
- **AI Video Summary**: Hides the AI-generated video summary box below the video.
- **Description Extras (Chapters, Transcript)**: Hides chapters, transcript, infocards, and the teaser carousel in the description area.
- **Info Panels (Clarify Box)**: Hides fact-check / clarify info boxes below the player. Off by default.
- **Turn Off Autoplay**: Switches the player autoplay toggle off and keeps it off. Restores it when turned back off. Off by default.

**Search & Channel**

- **Search Fluff (Shelves, Movies, Promos)**: Hides movie shelves, promos, and secondary panels in search results.
- **Channel Extras (Banner, Links, Member Shoutouts)**: Hides channel banners, header links, and member shoutout / recognition shelves.

## Using the popup

- Toggle groups are collapsible; collapsed state is remembered per browser.
- The search box filters every toggle by label, description, and keywords (e.g. `hide comments`). `Esc` clears the search; empty `Esc` closes the popup.
- Headers show `on/total` counts per group and overall.
- Each group has **All** / **None** shortcuts. **All** enables the group's default-on toggles and does not turn on its opt-ins; **None** turns off everything in the group. **Enable all** / **Disable all** act globally: Enable all turns on the 22 default-on toggles and does not turn on the 11 opt-ins (or Monk Mode); Disable all turns everything off, including Monk Mode. **Reset to Defaults** restores the defaults above (quality 1080p, Monk Mode off) and needs two clicks to confirm.
- Monk Mode shows as a card above the list with `On · 29 settings locked` while active. Locked rows are disabled with a hint; the rest stay editable.
- The footer shows the installed version (e.g. `v10.7.0`) and, when a newer release exists, an update link (see Updates).

## Installation

### Chrome, Edge, Brave, Opera (GitHub releases)

1. Open the [Releases page](https://github.com/JasonXiao127/YT-Declutter/releases) and download the latest `yt-declutter-<version>.zip` (e.g. `yt-declutter-10.7.0.zip`).
2. Unzip it.
3. Open `chrome://extensions`.
4. Turn on Developer mode.
5. Click Load unpacked and pick the unzipped folder.

Or load from source: clone the repo and pick the `youtube-declutter` folder instead of the unzipped release.

Releases are cut from version tags only (`v<version>`, matching `package.json` / `manifest.json`). Pushing a tag runs tests, builds `dist/`, and attaches the zip automatically. To update, download the new zip and unzip it over the same folder (same path = same extension ID = settings kept). Pinning the extension keeps the popup one click away.

## Updates

The popup footer always shows the installed version (e.g. `v10.7.0`).

- On popup open it checks `https://api.github.com/repos/JasonXiao127/YT-Declutter/releases/latest` at most once per 24 hours (result cached in `chrome.storage.local`). Failures (offline, rate-limited, denied) are cached so a popup cannot hammer the API: with a previously seen version the cache holds for the same window, otherwise it retries after an hour. Failures fall back to the last cached result (or just the version number). This is the only network call the extension makes. No analytics.
- When a newer tag exists the footer shows an `Update vX.Y.Z available` link to the release. Click it, download the new zip, and reinstall over the old folder (your settings are kept).
- No silent auto-update: Chrome does not allow unpacked extensions to update themselves. Reinstall is manual by design.

## Permissions & privacy

- `storage`: keeps toggle states and the preferred resolution in `chrome.storage.local` on your device. Popup group collapse state lives in the popup's own `localStorage`. No sync, no accounts.
- `host_permissions: https://api.github.com/`: only used for the 24h-cached release check above. Nothing else ever leaves your machine.

## Notes

- Works on desktop `youtube.com` / `*.youtube.com`. Skips `music.youtube.com`. Needs Chrome 111 or newer. Content scripts run at `document_start` in the top frame only.
- Architecture: toggle definitions live in `youtube-declutter/features.js`. `content.js` (isolated world) builds the hiding CSS from them, layers the Monk Mode preset over the stored states, and bridges quality settings to `quality-main.js` (page `MAIN` world), which enforces quality once per video. The popup rows are built by `popup.js` from the same definitions; shared quality logic (ladder, defaults, options) is canonical in `quality-core.js`, loaded first everywhere. No remote scripts, no `eval`, no inline handlers.
- Some features match English labels (Top News, Breaking News, Thanks, Clip, Shorts tab, Notifications, Create, Ask). They silently do nothing on localized YouTube.
- Hiding Shorts blanks a Shorts page you open direct. The hidden Shorts player is also paused so no audio keeps playing.
- First paint uses defaults synchronously (opt-out features stay visible) until stored settings load; a 2s safety net guarantees the popup and page never hang on slow storage.

## Development

- `npm test`: regression suite (`tests/`, 10 files covering manifest, features schema, quality core, storage bridge, world separation, popup packaging, update notifier, behavioral helpers, Monk Mode, and the fix guards).
- `npm run package`: validates `manifest.json` vs `package.json` versions and copies the 8-file + `icons/` allowlist into `dist/`. `npm run package:zip` zips it deterministically (sorted file list, fixed mtimes, `zip -X`; needs the `zip` binary).
- Releases: push a `v<version>` tag matching both version files; `.github/workflows/release.yml` verifies the match, tests, packs, and publishes the zip.
- License: GPL-3.0-or-later, see `LICENSE`.

## Changelog

- `10.7.0`: Monk Mode: one-switch lockdown to search, subscriptions, subscribed channels, and watch essentials (no feed, Shorts, recommendations, comments, autoplay). Preset layer leaves saved toggles untouched; exit restores them. New opt-in toggles: Subscriptions-Only Sidebar, Home Redirects to Subscriptions, Turn Off Autoplay.
- `10.6.0`: Expanded coverage: Home Feed, Entire Top Header, Recommended Sidebar, Live Chat, Playlist Queue Panel, Mixes & Radio, and refreshed 2026 selectors. Fixed archived livestreams never getting preferred quality, Premium quality on non-English YouTube, ad waits abandoning enforcement, storage-fallback races, update-check retry storms, group All/None controls disappearing when collapsed, and the release zip filename. Bulk enable now leaves opt-in toggles off. Deterministic zip builds.
- `10.5.0`: Popup footer shows the installed version plus a GitHub update notifier (24h-cached `releases/latest` check, manual reinstall link). Tag-only release workflow builds and attaches the packed zip.
- `10.4.0`: Auto-set video quality (default 1080p) with Premium enhanced-bitrate option. Dev-only regression suite + dist packager. Fixed settings-bridge race (no enforce from pre-storage defaults), settings-menu close logic, mid-roll ad re-enforcement, ad-budget reset, storage-error pending saves, tokenized popup search, switch contrast, bare-domain matches, `all_frames` symmetry. Removed overbroad badge selector.
- `10.3`: Fixed reliability, selector precision, and popup accessibility. Popup UI overhaul: grouped collapsible toggles, search, descriptions, order-independent enable-all.
- `10.2`: Fixed broken toggles and hiding. `features.js` now assigns to `globalThis` so popup and content script can read definitions.
- `10.1`: Fixed the first paint flash. Fixed the popup storage race. Added popup scrolling. Scoped Shorts and notification selectors. Moved the Clarify Box to its own Info Panels toggle. Added icons. Broadened matches to `*.youtube.com` except Music.
