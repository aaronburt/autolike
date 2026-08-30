document.addEventListener('DOMContentLoaded', () => {
  const toggleSwitch = document.getElementById('toggle-switch');
  const statsCount = document.getElementById('stats-count');
  const activityList = document.getElementById('activity-list');
  const container = document.querySelector('.container');
  const viewAllBtn = document.getElementById('view-all-btn');
  const historyPanel = document.getElementById('history-panel');
  const historyBack = document.getElementById('history-back');
  const historyList = document.getElementById('history-list');
  const historySearch = document.getElementById('history-search');
  const minDurationInput = document.getElementById('min-duration');
  const watchPercentInput = document.getElementById('watch-percent');
  const recordHistoryToggle = document.getElementById('record-history-toggle');
  const tagline = document.getElementById('tagline');
  const clearHistoryBtn = document.getElementById('clear-history');
  const openTabBtn = document.getElementById('open-tab-btn');
  const historyOpenTab = document.getElementById('history-open-tab');

  const nowWatchingEmpty = document.getElementById('now-watching-empty');
  const nowWatchingInfo = document.getElementById('now-watching-info');
  const nowWatchingLiked = document.getElementById('now-watching-liked');
  const nowWatchingSkipped = document.getElementById('now-watching-skipped');
  const nowWatchingTitle = document.getElementById('now-watching-title');
  const nowWatchingLikedTitle = document.getElementById('now-watching-liked-title');
  const nowWatchingSkippedTitle = document.getElementById('now-watching-skipped-title');
  const progressBarFill = document.getElementById('progress-bar-fill');
  const progressText = document.getElementById('progress-text');
  const progressTime = document.getElementById('progress-time');

  let allLikedVideos = [];
  let pollTimer = null;
  let searchQuery = '';

  function timeAgo(timestamp) {
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  function formatDate(timestamp) {
    return new Date(timestamp).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function updateTagline(percent, minDur) {
    tagline.textContent = `Auto-like after ${percent}% watched (>${minDur}m)`;
  }

  function getFilteredHistory() {
    if (!searchQuery) return allLikedVideos;
    return allLikedVideos.filter((video) => video.title.toLowerCase().includes(searchQuery.toLowerCase()));
  }

  function renderTracking(state) {
    nowWatchingEmpty.style.display = state ? 'none' : 'flex';
    nowWatchingInfo.style.display = state && !state.liked && !state.skipped ? 'block' : 'none';
    nowWatchingLiked.style.display = state && state.liked ? 'flex' : 'none';
    nowWatchingSkipped.style.display = state && state.skipped ? 'flex' : 'none';

    if (!state) return;

    if (state.skipped) {
      nowWatchingSkippedTitle.textContent = state.title ? `${state.title} (Disliked)` : 'Skipped (Video Disliked)';
      return;
    }

    if (state.liked) {
      nowWatchingLikedTitle.textContent = state.title || 'Video liked';
      return;
    }

    nowWatchingTitle.textContent = state.title || 'Unknown Title';
    const fill = Math.min(100, (state.progressPct / state.thresholdPct) * 100);
    progressBarFill.style.width = `${fill}%`;
    progressText.textContent = `${Math.min(state.progressPct, state.thresholdPct).toFixed(1)}% / ${state.thresholdPct}%`;
    progressTime.textContent = `${Math.min(state.watchedSeconds, state.requiredSeconds)}s / ${state.requiredSeconds}s`;
  }

  function renderActivity(list) {
    activityList.innerHTML = '';
    if (!list || list.length === 0) {
      activityList.innerHTML = '<li class="empty-state">No videos auto-liked yet</li>';
      viewAllBtn.style.display = 'none';
      return;
    }

    list.slice(0, 5).forEach((video) => {
      const li = document.createElement('li');
      li.innerHTML = `<span class="dot"></span><span class="title"></span><span class="time">${timeAgo(video.timestamp)}</span>`;
      li.querySelector('.title').textContent = video.title;
      activityList.appendChild(li);
    });
    viewAllBtn.style.display = 'block';
  }

  function deleteHistoryItem(videoId, timestamp) {
    allLikedVideos = allLikedVideos.filter((v) => !(v.videoId === videoId && v.timestamp === timestamp));
    chrome.storage.local.set({ likedVideos: allLikedVideos }, () => {
      const count = allLikedVideos.length;
      statsCount.textContent = `${count} video${count !== 1 ? 's' : ''} auto-liked`;
      renderActivity(allLikedVideos);
      renderHistory(getFilteredHistory());
    });
  }

  function renderHistory(list) {
    historyList.innerHTML = '';
    if (!list || list.length === 0) {
      historyList.innerHTML = '<li class="empty-state">No matching videos found</li>';
      return;
    }

    list.forEach((video) => {
      const li = document.createElement('li');
      const link = document.createElement('a');
      link.href = `https://www.youtube.com/watch?v=${encodeURIComponent(video.videoId)}`;
      link.target = '_blank';
      link.textContent = video.title;

      const info = document.createElement('div');
      info.className = 'info';
      const titleSpan = document.createElement('span');
      titleSpan.className = 'title';
      titleSpan.appendChild(link);
      const metaSpan = document.createElement('span');
      metaSpan.className = 'meta';
      metaSpan.textContent = formatDate(video.timestamp);

      info.appendChild(titleSpan);
      info.appendChild(metaSpan);

      const delBtn = document.createElement('button');
      delBtn.className = 'delete-item-btn';
      delBtn.title = 'Remove';
      delBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteHistoryItem(video.videoId, video.timestamp);
      });

      li.innerHTML = '<span class="dot"></span>';
      li.appendChild(info);
      li.appendChild(delBtn);
      historyList.appendChild(li);
    });
  }

  function loadState() {
    chrome.storage.local.get(['enabled', 'likedVideos', 'minDuration', 'watchPercent', 'recordHistory'], (res) => {
      const enabled = res.enabled !== false;
      toggleSwitch.checked = enabled;
      container.classList.toggle('status-disabled', !enabled);

      allLikedVideos = res.likedVideos || [];
      const count = allLikedVideos.length;
      statsCount.textContent = `${count} video${count !== 1 ? 's' : ''} auto-liked`;

      const minDur = res.minDuration ?? 2;
      const percent = res.watchPercent ?? 25;
      minDurationInput.value = minDur;
      watchPercentInput.value = percent;
      recordHistoryToggle.checked = res.recordHistory !== false;
      updateTagline(percent, minDur);
      renderActivity(allLikedVideos);
      renderHistory(getFilteredHistory());
    });
  }

  function openDashboard() {
    window.open(chrome.runtime.getURL('popup.html'));
  }

  if (openTabBtn) openTabBtn.addEventListener('click', openDashboard);
  if (historyOpenTab) historyOpenTab.addEventListener('click', openDashboard);

  if (historySearch) {
    historySearch.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim();
      renderHistory(getFilteredHistory());
    });
  }

  toggleSwitch.addEventListener('change', () => {
    const enabled = toggleSwitch.checked;
    chrome.storage.local.set({ enabled });
    container.classList.toggle('status-disabled', !enabled);
  });

  minDurationInput.addEventListener('change', () => {
    const val = Math.max(0, Math.min(120, parseInt(minDurationInput.value, 10) || 0));
    minDurationInput.value = val;
    chrome.storage.local.set({ minDuration: val });
    updateTagline(parseInt(watchPercentInput.value, 10), val);
  });

  watchPercentInput.addEventListener('change', () => {
    const val = Math.max(1, Math.min(100, parseInt(watchPercentInput.value, 10) || 25));
    watchPercentInput.value = val;
    chrome.storage.local.set({ watchPercent: val });
    updateTagline(val, parseInt(minDurationInput.value, 10));
  });

  recordHistoryToggle.addEventListener('change', () => {
    chrome.storage.local.set({ recordHistory: recordHistoryToggle.checked });
  });

  viewAllBtn.addEventListener('click', () => {
    renderHistory(getFilteredHistory());
    historyPanel.classList.add('open');
  });

  historyBack.addEventListener('click', () => {
    historyPanel.classList.remove('open');
  });

  clearHistoryBtn.addEventListener('click', () => {
    chrome.storage.local.set({ likedVideos: [] }, () => {
      allLikedVideos = [];
      statsCount.textContent = '0 videos auto-liked';
      renderActivity([]);
      renderHistory([]);
      historyPanel.classList.remove('open');
    });
  });

  loadState();
  pollTimer = setInterval(() => {
    chrome.storage.local.get(['trackingState'], (res) => renderTracking(res.trackingState || null));
  }, 1000);

  window.addEventListener('unload', () => {
    if (pollTimer) clearInterval(pollTimer);
  });
});
