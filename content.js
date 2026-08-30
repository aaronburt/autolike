(() => {
  const POLL_INTERVAL_MS = 1000;
  const MAX_HISTORY = 50;
  const SECONDS_PER_MINUTE = 60;
  const DEFAULT_MIN_MINUTES = 2;
  const DEFAULT_WATCH_PERCENT = 25;

  let currentVideoId = null;
  let hasLikedCurrent = false;
  let pollTimer = null;
  let watchedSeconds = 0;

  const setTracking = (data) => chrome.storage.local.set({ trackingState: data });
  const isPressed = (button) => Boolean(button && button.getAttribute('aria-pressed') === 'true');

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

  function recordLikedVideo(videoId, title) {
    chrome.storage.local.get(['likedVideos', 'recordHistory'], (result) => {
      if (result.recordHistory === false) return;
      const list = result.likedVideos || [];
      list.unshift({ videoId, title, timestamp: Date.now() });
      if (list.length > MAX_HISTORY) list.length = MAX_HISTORY;
      chrome.storage.local.set({ likedVideos: list });
    });
  }

  function tryLike() {
    if (isPressed(getButton('dislike'))) {
      setTracking({ videoId: currentVideoId, title: getTitle(), liked: false, skipped: true });
      return;
    }

    const likeButton = getButton('like');
    if (!likeButton) return;

    if (isPressed(likeButton)) {
      hasLikedCurrent = true;
      setTracking({ videoId: currentVideoId, title: getTitle(), liked: true, skipped: false });
      return;
    }

    likeButton.click();
    hasLikedCurrent = true;
    const title = getTitle();
    setTracking({ videoId: currentVideoId, title, liked: true, skipped: false });
    recordLikedVideo(currentVideoId, title);
  }

  function tick() {
    if (hasLikedCurrent) return;

    const video = document.querySelector('video.html5-main-video, video');
    if (!video || video.paused || video.readyState < 3 || !video.duration) return;

    if (isPressed(getButton('like'))) {
      hasLikedCurrent = true;
      setTracking({ videoId: currentVideoId, title: getTitle(), liked: true, skipped: false });
      return;
    }

    if (isPressed(getButton('dislike'))) {
      setTracking({ videoId: currentVideoId, title: getTitle(), liked: false, skipped: true });
      return;
    }

    watchedSeconds += 1;

    chrome.storage.local.get(['enabled', 'minDuration', 'watchPercent'], (result) => {
      if (result.enabled === false) return;

      const minDurationSec = (result.minDuration ?? DEFAULT_MIN_MINUTES) * SECONDS_PER_MINUTE;
      const watchThreshold = (result.watchPercent ?? DEFAULT_WATCH_PERCENT) / 100;

      if (video.duration < minDurationSec) {
        stop();
        return;
      }

      const requiredSeconds = Math.round(video.duration * watchThreshold);
      const progressRatio = watchedSeconds / video.duration;

      setTracking({
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
        tryLike();
      }
    });
  }

  function stop() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = null;
    chrome.storage.local.remove('trackingState');
  }

  function start() {
    stop();
    watchedSeconds = 0;
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
