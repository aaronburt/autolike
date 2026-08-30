(() => {
  const POLL_INTERVAL_MS = 1000;
  const MAX_HISTORY = 50;
  const SECONDS_PER_MINUTE = 60;
  const DEFAULT_MIN_MINUTES = 2;
  const DEFAULT_WATCH_PERCENT = 25;
  const MAX_CONTINUOUS_DELTA_SEC = 2.5;

  let currentVideoId = null;
  let hasLikedCurrent = false;
  let pollTimer = null;
  let watchedSeconds = 0;
  let lastCurrentTime = null;

  function isContextValid() {
    return Boolean(typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id);
  }

  async function setTracking(data) {
    if (!isContextValid()) {
      stop();
      return;
    }
    try {
      await chrome.storage.local.set({ trackingState: data });
    } catch {
      stop();
    }
  }

  const isPressed = (button) => Boolean(button && button.getAttribute('aria-pressed') === 'true');

  function isAdPlaying() {
    const moviePlayer = document.querySelector('#movie_player, .html5-video-player');
    if (moviePlayer && (moviePlayer.classList.contains('ad-showing') || moviePlayer.classList.contains('ad-interrupting'))) {
      return true;
    }
    return Boolean(document.querySelector('.ytp-ad-player-overlay, .ytp-ad-text, .video-ads.ytp-ad-module > *'));
  }

  function getButton(type) {
    const viewModel = document.querySelector(`${type}-button-view-model button`);
    if (viewModel) return viewModel;

    const containers = document.querySelectorAll(
      'ytd-segmented-like-dislike-button-renderer button, #actions button, #top-level-buttons-computed button'
    );
    for (const button of containers) {
      const label = (button.getAttribute('aria-label') || '').toLowerCase();
      const matches = type === 'dislike'
        ? label.includes('dislike')
        : label.includes('like') && !label.includes('dislike');
      if (matches) return button;
    }
    return null;
  }

  function getTitle() {
    const element = document.querySelector(
      'yt-formatted-string.style-scope.ytd-watch-metadata, h1.ytd-watch-metadata yt-formatted-string, #title h1 yt-formatted-string, h1.title'
    );
    return element ? element.textContent.trim() : 'Unknown Title';
  }

  async function recordLikedVideo(videoId, title) {
    if (!isContextValid()) return;
    try {
      const result = await chrome.storage.local.get(['likedVideos', 'recordHistory']);
      if (result.recordHistory === false) return;
      const list = result.likedVideos || [];
      list.unshift({ videoId, title, timestamp: Date.now() });
      if (list.length > MAX_HISTORY) list.length = MAX_HISTORY;
      await chrome.storage.local.set({ likedVideos: list });
    } catch {
      stop();
    }
  }

  async function tryLike() {
    if (!isContextValid()) {
      stop();
      return;
    }

    if (isPressed(getButton('dislike'))) {
      await setTracking({ videoId: currentVideoId, title: getTitle(), liked: false, skipped: true });
      return;
    }

    const likeButton = getButton('like');
    if (!likeButton) return;

    if (isPressed(likeButton)) {
      hasLikedCurrent = true;
      await setTracking({ videoId: currentVideoId, title: getTitle(), liked: true, skipped: false });
      return;
    }

    likeButton.click();
    hasLikedCurrent = true;
    const title = getTitle();
    await setTracking({ videoId: currentVideoId, title, liked: true, skipped: false });
    await recordLikedVideo(currentVideoId, title);
  }

  async function tick() {
    if (!isContextValid()) {
      stop();
      return;
    }

    if (hasLikedCurrent) return;

    if (isAdPlaying()) {
      lastCurrentTime = null;
      return;
    }

    const video = document.querySelector('video.html5-main-video, video');
    if (!video || video.paused || video.readyState < 3 || !video.duration) {
      lastCurrentTime = null;
      return;
    }

    if (isPressed(getButton('like'))) {
      hasLikedCurrent = true;
      await setTracking({ videoId: currentVideoId, title: getTitle(), liked: true, skipped: false });
      return;
    }

    if (isPressed(getButton('dislike'))) {
      await setTracking({ videoId: currentVideoId, title: getTitle(), liked: false, skipped: true });
      return;
    }

    const currentVideoTime = video.currentTime;
    const playbackRate = Math.max(0.25, Math.min(16, video.playbackRate || 1));

    if (lastCurrentTime !== null) {
      const timeDelta = currentVideoTime - lastCurrentTime;
      if (timeDelta > 0 && timeDelta <= MAX_CONTINUOUS_DELTA_SEC * playbackRate) {
        watchedSeconds += timeDelta;
      }
    } else {
      watchedSeconds += 1 * playbackRate;
    }
    lastCurrentTime = currentVideoTime;

    let settings;
    try {
      settings = await chrome.storage.local.get(['enabled', 'minDuration', 'watchPercent']);
    } catch {
      stop();
      return;
    }

    if (settings.enabled === false) return;

    const minDurationSec = (settings.minDuration ?? DEFAULT_MIN_MINUTES) * SECONDS_PER_MINUTE;
    const watchThreshold = (settings.watchPercent ?? DEFAULT_WATCH_PERCENT) / 100;

    if (video.duration < minDurationSec) {
      stop();
      return;
    }

    const requiredSeconds = Math.round(video.duration * watchThreshold);
    const progressRatio = watchedSeconds / video.duration;

    await setTracking({
      videoId: currentVideoId,
      title: getTitle(),
      watchedSeconds: Math.round(watchedSeconds),
      requiredSeconds,
      progressPct: parseFloat((progressRatio * 100).toFixed(1)),
      thresholdPct: parseFloat((watchThreshold * 100).toFixed(0)),
      liked: false,
      skipped: false
    });

    if (progressRatio >= watchThreshold) {
      await tryLike();
    }
  }

  function stop() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = null;
    lastCurrentTime = null;
    if (isContextValid()) {
      try {
        chrome.storage.local.remove('trackingState');
      } catch {
        // Silently handled
      }
    }
  }

  function start() {
    stop();
    watchedSeconds = 0;
    lastCurrentTime = null;
    hasLikedCurrent = false;
    pollTimer = setInterval(tick, POLL_INTERVAL_MS);
  }

  function handleNavigation() {
    const params = new URLSearchParams(window.location.search);
    const videoId = params.get('v');
    if (window.location.pathname === '/watch' && videoId) {
      if (videoId === currentVideoId) return;
      currentVideoId = videoId;
      start();
    } else {
      currentVideoId = null;
      stop();
    }
  }

  document.addEventListener('yt-navigate-finish', handleNavigation);
  handleNavigation();
})();
