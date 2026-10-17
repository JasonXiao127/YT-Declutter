# YouTube Declutter

Hide parts of YouTube you do not want. Pick what to hide. Changes apply at once. No reload needed.

<img width="800" alt="YouTube Declutter popup showing toggle groups" src="https://github.com/user-attachments/assets/d20b14e9-e097-4f64-9afd-ca271484b3eb" />

## Features

24 toggles in 6 groups, plus a preferred-resolution dropdown. Most hiding is on by default; Logo & Seasonal Doodles, Info Panels, Prefer enhanced bitrate, and Open Shorts as regular videos are off by default.

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

**Top Bar**

- **Notifications Bell**: Hides the notification bell.
- **Create Button (Top Bar Only)**: Hides the Create / Upload button in the top bar. Does not touch Clip or other watch page buttons.
- **Voice Search Button**: Hides the microphone button next to search.
- **AI Search (Ask YouTube)**: Hides the Ask / AI search button in the top bar.
- **Logo & Seasonal Doodles**: Hides the YouTube logo and seasonal art. Off by default. Hiding the logo also removes the home link.

**Watch Page**

- **Comments**: Hides the comments section under videos and the comments engagement panel.
- **Player Overlays (End Screens, Paid Promotion)**: Hides end screens, paid promotion overlays, and reaction panels over the player.
- **Video Actions (Download, Thanks, Clip)**: Hides the Download, Thanks, Clip, and purchase buttons under the video, plus the download menu item.
- **Merch & Fundraiser Shelves**: Hides merch, donation, and badge shelves around the video.
- **AI Video Summary**: Hides the AI-generated video summary box below the video.
- **Description Extras (Chapters, Transcript)**: Hides chapters, transcript, infocards, and the teaser carousel in the description area.
- **Info Panels (Clarify Box)**: Hides fact-check / clarify info boxes below the player. Off by default.

**Search & Channel**

- **Search Fluff (Shelves, Movies, Promos)**: Hides movie shelves, promos, and secondary panels in search results.
- **Channel Extras (Banner, Links, Member Shoutouts)**: Hides channel banners, header links, and member shoutout / recognition shelves.

## Using the popup

- Toggle groups are collapsible; collapsed state is remembered per browser.
- The search box filters every toggle by label, description, and keywords (e.g. `hide comments`). `Esc` clears the search; empty `Esc` closes the popup.
- Headers show `on/total` counts per group and overall.
- Each group has **All** / **None** shortcuts. **Enable all** / **Disable all** act globally (Enable all also hides the logo and turns on Shorts-as-watch — the button says so). **Reset to Defaults** restores the defaults above (quality 1080p) and needs two clicks to confirm.
- The footer shows the installed version (e.g. `v10.5.0`) and, when a newer release exists, an update link (see Updates).

## Installation

### Chrome, Edge, Brave, Opera (GitHub releases)

1. Open the [Releases page](https://github.com/JasonXiao127/YT-Declutter/releases) and download the latest `yt-declutter-<version>.zip` (e.g. `yt-declutter-10.5.0.zip`).
2. Unzip it.
3. Open `chrome://extensions`.
4. Turn on Developer mode.
5. Click Load unpacked and pick the unzipped folder.

Or load from source: clone the repo and pick the `youtube-declutter` folder instead of the unzipped release.

Releases are cut from version tags only (`v<version>`, matching `package.json` / `manifest.json`). Pushing a tag runs tests, builds `dist/`, and attaches the zip automatically. To update, download the new zip and unzip it over (or replace) the old folder — settings are kept. Pinning the extension keeps the popup one click away.

## Updates

The popup footer always shows the installed version (e.g. `v10.5.0`).

- On popup open it checks `https://api.github.com/repos/JasonXiao127/YT-Declutter/releases/latest` at most once per 24 hours (result cached in `chrome.storage.local`). Offline, rate-limited, or denied checks fail silently back to the version number. This is the only network call the extension makes. No analytics.
- When a newer tag exists the footer shows an `Update vX.Y.Z available` link to the release. Click it, download the new zip, and reinstall over the old folder (your settings are kept).
- No silent auto-update: Chrome does not allow unpacked extensions to update themselves. Reinstall is manual by design.

## Permissions & privacy

- `storage`: keeps toggle states and the preferred resolution in `chrome.storage.local` on your device. Popup group collapse state lives in the popup's own `localStorage`. No sync, no accounts.
- `host_permissions: https://api.github.com/`: only used for the 24h-cached release check above. Nothing else ever leaves your machine.

## Notes

- Works on desktop `youtube.com` / `*.youtube.com`. Skips `music.youtube.com`. Needs Chrome 111 or newer. Content scripts run at `document_start` in the top frame only.
- Architecture: toggle definitions live in `youtube-declutter/features.js`. `content.js` (isolated world) builds the hiding CSS from them and bridges quality settings to `quality-main.js` (page `MAIN` world), which enforces quality once per video. The popup rows are built by `popup.js` from the same definitions; shared quality logic (ladder, defaults, options) is canonical in `quality-core.js`, loaded first everywhere. No remote scripts, no `eval`, no inline handlers.
- Some features match English labels (Top News, Breaking News, Thanks, Clip, Shorts tab, Notifications, Create, Ask). They silently do nothing on localized YouTube.
- Hiding Shorts blanks a Shorts page you open direct. The hidden Shorts player is also paused so no audio keeps playing.
- First paint uses defaults synchronously (opt-out features stay visible) until stored settings load; a 2s safety net guarantees the popup and page never hang on slow storage.

## Development

- `npm test`: regression suite (`tests/`, 61 tests across 7 files covering manifest, features schema, quality core, storage bridge, world separation, popup packaging, and the update notifier).
- `npm run package`: validates `manifest.json` vs `package.json` versions and copies the 8-file + `icons/` allowlist into `dist/`. `npm run package:zip` zips it deterministically (`zip -X -o`; needs the `zip` binary).
- Releases: push a `v<version>` tag matching both version files; `.github/workflows/release.yml` verifies the match, tests, packs, and publishes the zip.

## Changelog

- `10.5.0`: Popup footer shows the installed version plus a GitHub update notifier (24h-cached `releases/latest` check, manual reinstall link). Tag-only release workflow builds and attaches the packed zip.
- `10.4.0`: Auto-set video quality (default 1080p) with Premium enhanced-bitrate option. Dev-only regression suite + dist packager. Fixed settings-bridge race (no enforce from pre-storage defaults), settings-menu close logic, mid-roll ad re-enforcement, ad-budget reset, storage-error pending saves, tokenized popup search, switch contrast, bare-domain matches, `all_frames` symmetry. Removed overbroad badge selector.
- `10.3`: Fixed reliability, selector precision, and popup accessibility. Popup UI overhaul: grouped collapsible toggles, search, descriptions, order-independent enable-all.
- `10.2`: Fixed broken toggles and hiding. `features.js` now assigns to `globalThis` so popup and content script can read definitions.
- `10.1`: Fixed the first paint flash. Fixed the popup storage race. Added popup scrolling. Scoped Shorts and notification selectors. Moved the Clarify Box to its own Info Panels toggle. Added icons. Broadened matches to `*.youtube.com` except Music.
