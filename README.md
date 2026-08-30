# AutoLike

AutoLike is a Chrome extension that automatically likes YouTube videos based on customizable watch duration and threshold settings.

## How It Works
Once enabled, the extension monitors your active watch progress on YouTube. If a video meets the minimum configured length (default: 2 minutes), AutoLike automatically clicks the Like button after you have actively watched the configured percentage (default: 25%) of its total runtime.

AutoLike respects user choices:
- If a video is already disliked (or disliked during playback), auto-liking is halted and the video is marked as Skipped.
- If a user removes their dislike before reaching the threshold, normal tracking resumes automatically.
- If a video is manually liked prior to reaching the threshold, tracking completes immediately without logging manual likes to the automated history.

## Features
- Automatically likes YouTube videos after watching a set percentage
- Respects user dislikes and manual likes
- Dynamic dislike recovery if a dislike is undone
- Ad-resilient tracking (pauses during pre-roll and mid-roll ads without killing watcher)
- Scaled watch accumulation supporting variable playback speeds (e.g. 1.25x, 1.5x, 2x)
- Customizable minimum video duration and watch threshold
- Live watching progress indicator and like history drawer in popup UI
- Full-page dashboard view in a new tab with two-column layout
- Real-time search filter and individual item deletion for liked video history
- Simple master toggle to enable or disable functionality

## Installation

### From Release
1. Download the latest `autolike-extension-v*.zip` from the [GitHub Releases](https://github.com/aaronburt/AutoLike/releases/latest) page.
2. Unzip the downloaded archive.
3. Open Google Chrome and navigate to `chrome://extensions/`.
4. Enable **Developer mode** using the toggle in the top right corner.
5. Click **Load unpacked** and select the extracted folder.

### From Source
1. Clone this repository: `git clone https://github.com/aaronburt/AutoLike.git`
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** using the toggle in the top right corner.
4. Click **Load unpacked** and select this project's folder (`AutoLike`).

## Notice
This project was built with the assistance of Google Gemini and thoroughly reviewed and verified by a human.
