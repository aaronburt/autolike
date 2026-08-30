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
- Customizable minimum video duration and watch threshold
- Live watching progress indicator and like history drawer in popup UI
- Full-page dashboard view in a new tab with two-column layout
- Real-time search filter and individual item deletion for liked video history
- Simple master toggle to enable or disable functionality
