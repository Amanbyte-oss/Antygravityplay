// Watch page logic
document.addEventListener('DOMContentLoaded', () => {
  window.Components.injectNavbar();
  window.Components.injectFooter();

  const params = window.App.getQueryParams();
  const videoId = params.id;

  if (!videoId) {
    renderErrorView('Invalid Video Reference.');
    return;
  }

  const dbVideos = window.App.getVideos();
  const videoIndex = dbVideos.findIndex(v => v.id === videoId);
  const video = dbVideos[videoIndex];

  if (!video) {
    renderErrorView('The video you are looking for does not exist.');
    return;
  }

  let viewIncremented = false;

  const handleLike = (isNowLiked) => {
    const db = window.App.getVideos();
    const idx = db.findIndex(v => v.id === video.id);
    if (idx !== -1) {
      db[idx].likes = isNowLiked ? db[idx].likes + 1 : db[idx].likes - 1;
      window.App.saveVideos(db);
      const likeCountEl = document.getElementById('watch-like-count');
      if (likeCountEl) likeCountEl.innerText = db[idx].likes.toLocaleString();
    }
    const likeBtn = document.getElementById('watch-like-btn');
    if (likeBtn) {
      if (isNowLiked) likeBtn.classList.add('liked');
      else likeBtn.classList.remove('liked');
    }
    const npHeart = document.getElementById('np-heart');
    if (npHeart) {
      if (isNowLiked) npHeart.classList.add('liked');
      else npHeart.classList.remove('liked');
    }
  };

  setupVideoPlayer(video, () => {
    if (!viewIncremented) {
      dbVideos[videoIndex].views += 1;
      window.App.saveVideos(dbVideos);
      viewIncremented = true;
      const viewsEl = document.getElementById('watch-views-count');
      if (viewsEl) {
        viewsEl.innerText = Number(dbVideos[videoIndex].views).toLocaleString();
      }
    }
  }, handleLike);

  setupVideoDetails(video, handleLike);
  setupRelatedSidebar(video, dbVideos);

  window.Animations.initScrollReveal();
});

// ═══════════════════════════════════════════════════════════════
// CUSTOM VIDEO PLAYER
// ═══════════════════════════════════════════════════════════════

function setupVideoPlayer(video, onFirstPlay, handleLike) {
  const container = document.getElementById('player-container');
  const embedPlaceholder = document.getElementById('player-embed-placeholder');
  const videoEl = document.getElementById('main-video-player');
  const loadingEl = document.getElementById('player-loading');
  const nowPlayingBar = document.getElementById('now-playing-bar');

  if (!container) return;

  const isFileProtocol = window.location.protocol === 'file:';
  const isValidHttpUrl = (str) => /^https?:\/\/.+/.test(str);
  const isEmbedVideo = video.embedUrl && isValidHttpUrl(video.embedUrl);

  if (isEmbedVideo && !isFileProtocol) {
    videoEl.style.display = 'none';
    embedPlaceholder.style.display = 'block';
    loadingEl.style.display = 'flex';
    embedPlaceholder.innerHTML = '';

    const iframe = document.createElement('iframe');
    iframe.src = video.embedUrl;
    iframe.title = video.title || 'Video player';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.allowFullscreen = true;
    iframe.style.cssText = 'width:100%; height:100%; border:0;';
    iframe.addEventListener('load', () => { loadingEl.style.display = 'none'; });
    setTimeout(() => { loadingEl.style.display = 'none'; }, 5000);
    embedPlaceholder.appendChild(iframe);

    const viewObserver = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && onFirstPlay) { onFirstPlay(); viewObserver.disconnect(); }
    }, { threshold: 0.5 });
    viewObserver.observe(container);

    setupNowPlayingDrawer(video, videoEl, handleLike);
  } else if (isEmbedVideo && isFileProtocol) {
    // Try native playback first; show external link fallback only on error
    embedPlaceholder.style.display = 'none';
    loadingEl.style.display = 'flex';

    const showFileFallback = () => {
      loadingEl.style.display = 'none';
      videoEl.style.display = 'none';
      embedPlaceholder.style.display = 'flex';
      embedPlaceholder.style.flexDirection = 'column';
      embedPlaceholder.style.alignItems = 'center';
      embedPlaceholder.style.justifyContent = 'center';
      embedPlaceholder.style.gap = 'var(--space-md)';
      embedPlaceholder.innerHTML =
        '<svg width="48" height="48" fill="none" stroke="var(--text-muted)" stroke-width="1.5" viewBox="0 0 24 24">' +
        '<rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>' +
        '<line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line>' +
        '<line x1="2" y1="12" x2="22" y2="12"></line></svg>' +
        '<p style="color:var(--text-muted); font-size:var(--text-sm); text-align:center; max-width:360px;">' +
        'This page is opened from a local file &mdash; embedded video playback is not supported in this mode.<br><br>' +
        '<a href="' + (video.videoUrl || video.embedUrl) + '" target="_blank" rel="noopener noreferrer" ' +
        'style="display:inline-block; padding:8px 20px; background:var(--accent); color:#fff; border-radius:var(--radius-full); text-decoration:none; font-weight:600; font-size:var(--text-sm);">' +
        'Open in ' + (video.platformLabel || 'Platform') + ' &nearr;</a></p>';
      const viewObserver = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && onFirstPlay) { onFirstPlay(); viewObserver.disconnect(); }
      }, { threshold: 0.5 });
      viewObserver.observe(container);
    };

    if (video.videoUrl) {
      videoEl.style.display = 'block';
      videoEl.removeAttribute('controls');
      videoEl.src = video.videoUrl;
      videoEl.load();
      initCustomPlayer(video, videoEl, onFirstPlay, handleLike);
      videoEl.addEventListener('error', showFileFallback, { once: true });
      videoEl.addEventListener('play', () => {
        loadingEl.style.display = 'none';
        if (onFirstPlay) onFirstPlay();
      });
    } else {
      showFileFallback();
    }
    setupNowPlayingDrawer(video, videoEl, handleLike);
  } else {
    // NATIVE VIDEO
    embedPlaceholder.style.display = 'none';
    loadingEl.style.display = 'none';
    videoEl.style.display = 'block';
    videoEl.removeAttribute('controls');

    if (video.videoUrl) {
      videoEl.src = video.videoUrl;
      videoEl.load();
    }

    initCustomPlayer(video, videoEl, onFirstPlay, handleLike);
    setupNowPlayingDrawer(video, videoEl, handleLike);

    videoEl.addEventListener('play', () => {
      if (onFirstPlay) onFirstPlay();
    });

    if (!video.videoUrl) {
      videoEl.style.display = 'none';
      embedPlaceholder.style.display = 'flex';
      embedPlaceholder.style.alignItems = 'center';
      embedPlaceholder.style.justifyContent = 'center';
      embedPlaceholder.style.flexDirection = 'column';
      embedPlaceholder.style.gap = 'var(--space-md)';
      embedPlaceholder.innerHTML =
        '<svg width="48" height="48" fill="none" stroke="var(--text-muted)" stroke-width="1.5" viewBox="0 0 24 24">' +
        '<rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line>' +
        '<line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line></svg>' +
        '<p style="color:var(--text-muted); font-size:var(--text-sm); text-align:center;">This video source is not available for playback.</p>';
    }
  }

  const ac = new AbortController();
  document.addEventListener('keydown', (e) => {
    if (e.key === ' ' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
      e.preventDefault();
      if (!isEmbedVideo && video.videoUrl) {
        if (videoEl.paused) { videoEl.play(); } else { videoEl.pause(); }
      }
    }
  }, { signal: ac.signal });

  // Cleanup on page unload to prevent listener accumulation
  window.addEventListener('beforeunload', () => ac.abort(), { once: true });
}

// ─── INIT CUSTOM PLAYER ───────────────────────────────────
function initCustomPlayer(video, videoEl, onFirstPlay, handleLike) {
  const overlay = document.getElementById('player-overlay');
  const centerPlay = document.getElementById('player-center-play');
  const playBtn = document.getElementById('player-play-btn');
  const rewindBtn = document.getElementById('player-rewind-btn');
  const forwardBtn = document.getElementById('player-forward-btn');
  const timeCurrent = document.getElementById('player-time-current');
  const timeTotal = document.getElementById('player-time-total');
  const progressTrack = document.getElementById('player-progress-track');
  const progressFill = document.getElementById('player-progress-fill');
  const progressBuffered = document.getElementById('player-progress-buffered');
  const progressThumb = document.getElementById('player-progress-thumb');
  const preview = document.getElementById('player-preview');
  const previewTime = document.getElementById('player-preview-time');
  const muteBtn = document.getElementById('player-mute-btn');
  const volumeFill = document.getElementById('player-volume-fill');
  const volumeTrack = document.getElementById('player-volume-track');
  const speedBtn = document.getElementById('player-speed-btn');
  const speedMenu = document.getElementById('player-speed-menu');
  const theaterBtn = document.getElementById('player-theater-btn');
  const pipBtn = document.getElementById('player-pip-btn');
  const fullscreenBtn = document.getElementById('player-fullscreen-btn');
  const endScreen = document.getElementById('player-endscreen');
  const endRelated = document.getElementById('player-end-related');
  const replayBtn = document.getElementById('player-replay-btn');
  const seekIndicator = document.getElementById('player-seek-indicator');
  const seekText = document.getElementById('player-seek-text');
  const emojiBar = document.getElementById('player-emoji-bar');
  const progressEl = document.getElementById('player-progress');
  const container = videoEl.parentElement;

  if (!overlay) return;
  overlay.style.display = 'flex';
  requestAnimationFrame(() => overlay.classList.add('visible'));

  // STATE
  let controlsTimeout = null;
  let isSeeking = false;
  let volumeBeforeMute = videoEl.volume || 0.7;
  let lastTapTime = 0;

  // ─── AUTO-HIDE CONTROLS ─────────────────────────────────
  const showControls = () => {
    overlay.classList.add('visible');
    overlay.classList.remove('hide-cursor');
    clearTimeout(controlsTimeout);
    controlsTimeout = setTimeout(() => {
      if (!videoEl.paused) {
        overlay.classList.remove('visible');
        overlay.classList.add('hide-cursor');
      }
    }, 3000);
  };

  const showControlsOnce = () => {
    overlay.classList.add('visible');
    overlay.classList.remove('hide-cursor');
    clearTimeout(controlsTimeout);
  };

  overlay.addEventListener('mousemove', showControls);
  overlay.addEventListener('touchstart', showControlsOnce, { passive: true });
  overlay.addEventListener('click', showControlsOnce);

  // ─── FORMAT TIME ────────────────────────────────────────
  const fmt = (s) => {
    if (isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return m + ':' + (sec < 10 ? '0' : '') + sec;
  };

  // ─── PLAY / PAUSE ───────────────────────────────────────
  const togglePlay = () => {
    if (videoEl.paused) { videoEl.play(); } else { videoEl.pause(); }
    showControlsOnce();
  };

  const updatePlayIcons = () => {
    const isPaused = videoEl.paused;
    const smallIcon = isPaused
      ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="8,5 19,12 8,19"></polygon></svg>'
      : '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>';
    const bigIcon = isPaused
      ? '<svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor"><polygon points="8,5 19,12 8,19"></polygon></svg>'
      : '<svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>';
    if (playBtn) playBtn.innerHTML = smallIcon;
    if (centerPlay) {
      centerPlay.innerHTML = bigIcon;
      centerPlay.classList.toggle('show', isPaused);
    }
    if (isPaused) {
      overlay.classList.add('visible');
      overlay.classList.remove('hide-cursor');
      clearTimeout(controlsTimeout);
    }
  };

  videoEl.addEventListener('play', updatePlayIcons);
  videoEl.addEventListener('pause', updatePlayIcons);
  updatePlayIcons();

  if (centerPlay) centerPlay.addEventListener('click', togglePlay);
  if (playBtn) playBtn.addEventListener('click', togglePlay);
  container.addEventListener('dblclick', togglePlay);

  // ─── REWIND / FORWARD ───────────────────────────────────
  const seekRelative = (delta) => {
    const newTime = Math.max(0, Math.min(videoEl.duration || 0, videoEl.currentTime + delta));
    videoEl.currentTime = newTime;
    if (seekIndicator) {
      seekIndicator.style.display = 'flex';
      seekIndicator.className = 'player-seek-indicator ' + (delta < 0 ? 'seek-left' : 'seek-right');
      const arrow = delta < 0
        ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>'
        : '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>';
      seekIndicator.innerHTML = arrow + '<span>' + Math.abs(delta) + 's</span>';
      seekIndicator.style.animation = 'none';
      void seekIndicator.offsetWidth;
      seekIndicator.style.animation = 'playerSeekPop 0.4s var(--ease-spring) forwards';
      clearTimeout(seekIndicator._hide);
      seekIndicator._hide = setTimeout(() => { seekIndicator.style.display = 'none'; }, 800);
    }
    showControlsOnce();
  };

  if (rewindBtn) rewindBtn.addEventListener('click', () => seekRelative(-10));
  if (forwardBtn) forwardBtn.addEventListener('click', () => seekRelative(10));

  // ─── DOUBLE-TAP SEEK (MOBILE) ───────────────────────────
  const dtapLeft = document.getElementById('player-dtap-left');
  const dtapRight = document.getElementById('player-dtap-right');

  const handleDblTap = (side) => {
    const now = Date.now();
    if (now - lastTapTime < 350) {
      seekRelative(side === 'left' ? -10 : 10);
      lastTapTime = 0;
    } else {
      lastTapTime = now;
    }
  };

  if (dtapLeft) dtapLeft.addEventListener('click', () => handleDblTap('left'));
  if (dtapRight) dtapRight.addEventListener('click', () => handleDblTap('right'));

  // ─── SWIPE SEEK (MOBILE) ────────────────────────────────
  let touchStartX = 0;
  let touchStartTime = 0;
  let isSwiping = false;

  container.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      touchStartX = e.touches[0].clientX;
      touchStartTime = Date.now();
      isSwiping = false;
    }
  }, { passive: true });

  container.addEventListener('touchmove', (e) => {
    if (e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - touchStartX;
    if (Math.abs(dx) > 20) {
      isSwiping = true;
      e.preventDefault();
    }
  }, { passive: false });

  container.addEventListener('touchend', (e) => {
    if (!isSwiping) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    const duration = videoEl.duration || 0;
    if (Math.abs(dx) > 40) {
      const seekPct = (dx / container.offsetWidth) * 2;
      const delta = duration * Math.max(-30, Math.min(30, seekPct));
      seekRelative(delta);
    }
  }, { passive: true });

  // ─── TIME UPDATE ────────────────────────────────────────
  videoEl.addEventListener('timeupdate', () => {
    const cur = videoEl.currentTime;
    const dur = videoEl.duration || 0;
    const pct = dur > 0 ? (cur / dur) * 100 : 0;
    if (progressFill) progressFill.style.width = pct + '%';
    if (progressThumb) progressThumb.style.left = pct + '%';
    if (timeCurrent) timeCurrent.innerText = fmt(cur);

    try { localStorage.setItem('continue-' + video.id, cur); } catch (_) {}
  });

  videoEl.addEventListener('loadedmetadata', () => {
    if (timeTotal) timeTotal.innerText = fmt(videoEl.duration);

    try {
      const saved = localStorage.getItem('continue-' + video.id);
      if (saved && videoEl.duration > 0) {
        const t = parseFloat(saved);
        if (t > 5 && t < videoEl.duration - 5) {
          videoEl.currentTime = t;
          window.App.showToast('Resuming from ' + fmt(t), 'info');
        }
      }
    } catch (_) {}
  });

  videoEl.addEventListener('progress', () => {
    if (!videoEl.buffered.length) return;
    const bufferedEnd = videoEl.buffered.end(videoEl.buffered.length - 1);
    const dur = videoEl.duration || 1;
    if (progressBuffered) progressBuffered.style.width = (bufferedEnd / dur * 100) + '%';
  });

  // ─── PROGRESS BAR SEEKING ───────────────────────────────
  if (progressTrack) {
    const seekFromEvent = (clientX) => {
      const rect = progressTrack.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      if (videoEl.duration) videoEl.currentTime = pct * videoEl.duration;
    };

    progressTrack.addEventListener('click', (e) => seekFromEvent(e.clientX));

    const onMove = (e) => {
      isSeeking = true;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const rect = progressTrack.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      if (progressFill) progressFill.style.width = pct + '%';
      if (progressThumb) progressThumb.style.left = pct + '%';
      if (previewTime) previewTime.innerText = fmt(pct * (videoEl.duration || 0));
    };

    const onUp = (e) => {
      if (!isSeeking) return;
      isSeeking = false;
      const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
      seekFromEvent(clientX);
      if (preview) preview.style.display = 'none';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
    };

    progressTrack.addEventListener('mousedown', (e) => {
      isSeeking = true;
      if (preview) preview.style.display = 'block';
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });

    progressTrack.addEventListener('touchstart', () => {
      isSeeking = true;
      if (preview) preview.style.display = 'block';
      document.addEventListener('touchmove', onMove);
      document.addEventListener('touchend', onUp);
    }, { passive: true });

    progressEl.addEventListener('mousemove', (e) => {
      if (isSeeking) return;
      const rect = progressTrack.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      if (preview) {
        preview.style.display = 'block';
        preview.style.left = (pct * 100) + '%';
      }
      if (previewTime) previewTime.innerText = fmt(pct * (videoEl.duration || 0));
    });

    progressEl.addEventListener('mouseleave', () => {
      if (!isSeeking && preview) preview.style.display = 'none';
    });
  }

  // ─── VOLUME ─────────────────────────────────────────────
  const updateVolumeUI = () => {
    const vol = videoEl.muted ? 0 : videoEl.volume;
    if (volumeFill) volumeFill.style.width = (vol * 100) + '%';
    if (muteBtn) {
      const isMuted = videoEl.muted || videoEl.volume === 0;
      muteBtn.innerHTML = isMuted
        ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>'
        : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>';
    }
  };

  videoEl.addEventListener('volumechange', updateVolumeUI);
  updateVolumeUI();

  if (volumeTrack) {
    volumeTrack.addEventListener('click', (e) => {
      const rect = volumeTrack.getBoundingClientRect();
      let pct = (e.clientX - rect.left) / rect.width;
      pct = Math.max(0, Math.min(1, pct));
      videoEl.volume = pct;
      videoEl.muted = false;
      volumeBeforeMute = pct;
    });
  }

  if (muteBtn) {
    muteBtn.addEventListener('click', () => {
      if (videoEl.muted) {
        videoEl.muted = false;
        videoEl.volume = volumeBeforeMute > 0 ? volumeBeforeMute : 0.5;
      } else {
        volumeBeforeMute = videoEl.volume;
        videoEl.muted = true;
      }
    });
  }

  // ─── PLAYBACK SPEED ─────────────────────────────────────
  if (speedBtn) {
    speedBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      speedMenu.style.display = speedMenu.style.display === 'block' ? 'none' : 'block';
    });

    speedMenu.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const speed = parseFloat(btn.dataset.speed);
      videoEl.playbackRate = speed;
      speedBtn.innerText = speed + 'x';
      speedMenu.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      speedMenu.style.display = 'none';
    });

    document.addEventListener('click', () => { speedMenu.style.display = 'none'; });
  }

  // ─── THEATER MODE ─────────────────────────────────────
  if (theaterBtn) {
    theaterBtn.addEventListener('click', () => {
      container.classList.toggle('theater-mode');
      const isTheater = container.classList.contains('theater-mode');
      theaterBtn.innerHTML = isTheater
        ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>'
        : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>';
      window.App.showToast(isTheater ? 'Theater mode on' : 'Theater mode off', 'info');
    });
  }

  // ─── MINI PLAYER (PIP) ────────────────────────────────
  if (pipBtn) {
    pipBtn.addEventListener('click', async () => {
      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else {
          await videoEl.requestPictureInPicture();
        }
      } catch (_) {
        window.App.showToast('Picture-in-Picture not supported', 'error');
      }
    });
  }

  // ─── FULLSCREEN ───────────────────────────────────────
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (container.requestFullscreen) container.requestFullscreen();
      else if (container.webkitRequestFullscreen) container.webkitRequestFullscreen();
      container.classList.add('fullscreen-mode');
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      container.classList.remove('fullscreen-mode');
    }
  };

  if (fullscreenBtn) fullscreenBtn.addEventListener('click', toggleFullscreen);
  document.addEventListener('fullscreenchange', () => {
    container.classList.toggle('fullscreen-mode', !!document.fullscreenElement);
  });

  // ─── END SCREEN (DISCOVERY) ───────────────────────────
  videoEl.addEventListener('ended', () => {
    if (endScreen) endScreen.style.display = 'flex';
    overlay.classList.add('visible');
    overlay.classList.remove('hide-cursor');
    clearTimeout(controlsTimeout);

    if (endRelated) {
      const allVideos = window.App.getVideos().filter(v => v.id !== video.id && v.status === 'published');
      const next = allVideos[Math.floor(Math.random() * allVideos.length)];
      if (next) {
        endRelated.innerHTML =
          '<a href="./watch.html?id=' + encodeURIComponent(next.id) + '" class="player-end-card">' +
          '<img src="' + next.thumbnail + '" alt="" class="player-end-thumb" loading="lazy">' +
          '<div class="player-end-info">' +
          '<div class="player-end-title">' + next.title + '</div>' +
          '<div class="player-end-creator">' + next.creator + '</div></div></a>';
      } else {
        endRelated.innerHTML = '<p style="color:rgba(255,255,255,0.6);font-size:var(--text-sm);">No more videos</p>';
      }
    }
  });

  if (replayBtn) {
    replayBtn.addEventListener('click', () => {
      videoEl.currentTime = 0;
      videoEl.play();
      if (endScreen) endScreen.style.display = 'none';
    });
  }

  // ─── EMOJI REACTIONS (session-based, reset each page load) ─────────────────
  const EMOJI_KEY = 'emoji-reactions-' + video.id;
  let emojiCounts = {};

  const updateEmojiUI = () => {
    document.querySelectorAll('.emoji-btn').forEach(btn => {
      const emoji = btn.dataset.emoji;
      const count = emojiCounts[emoji] || 0;
      const countEl = btn.querySelector('.emoji-count');
      if (countEl) countEl.innerText = count || '0';
    });
  };
  updateEmojiUI();

  emojiBar.addEventListener('click', (e) => {
    const btn = e.target.closest('.emoji-btn');
    if (!btn) return;
    const emoji = btn.dataset.emoji;
    emojiCounts[emoji] = (emojiCounts[emoji] || 0) + 1;
    try { localStorage.setItem(EMOJI_KEY, JSON.stringify(emojiCounts)); } catch (_) {}
    updateEmojiUI();

    const float = document.createElement('div');
    float.className = 'emoji-float';
    float.innerText = emoji;
    const rect = btn.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    float.style.left = (rect.left - containerRect.left + rect.width / 2 - 14) + 'px';
    float.style.top = (rect.top - containerRect.top - 10) + 'px';
    container.appendChild(float);
    setTimeout(() => float.remove(), 1200);
  });

  // ─── LOADING STATE ───────────────────────────────────
  const loadingEl = document.getElementById('player-loading');
  videoEl.addEventListener('waiting', () => { if (loadingEl) loadingEl.style.display = 'flex'; });
  videoEl.addEventListener('canplay', () => { if (loadingEl) loadingEl.style.display = 'none'; });
  videoEl.addEventListener('playing', () => { if (loadingEl) loadingEl.style.display = 'none'; });

  // ─── ERROR STATE ─────────────────────────────────────
  const errorOverlay = document.getElementById('player-error');
  const retryBtn = document.getElementById('player-error-retry');

  videoEl.addEventListener('error', () => {
    if (errorOverlay) errorOverlay.style.display = 'flex';
    overlay.classList.add('visible');
    overlay.classList.remove('hide-cursor');
    clearTimeout(controlsTimeout);
    if (loadingEl) loadingEl.style.display = 'none';
  });

  if (retryBtn) {
    retryBtn.addEventListener('click', () => {
      if (errorOverlay) errorOverlay.style.display = 'none';
      videoEl.load();
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// SETUP VIDEO DETAILS
// ═══════════════════════════════════════════════════════════════
function setupVideoDetails(video, handleLike) {
  const titleEl = document.getElementById('watch-title');
  const viewsEl = document.getElementById('watch-views-count');
  const dateEl = document.getElementById('watch-publish-date');
  const descEl = document.getElementById('watch-description');
  const creatorAvatarEl = document.getElementById('creator-avatar-letter');
  const creatorNameEl = document.getElementById('creator-name');
  const tagsRow = document.getElementById('watch-tags-row');
  const likeBtn = document.getElementById('watch-like-btn');
  const likeCountEl = document.getElementById('watch-like-count');

  if (titleEl) titleEl.innerText = video.title;
  if (viewsEl) viewsEl.innerText = Number(video.views).toLocaleString();
  if (dateEl) dateEl.innerText = video.publishDate;
  if (descEl) descEl.innerText = video.description;
  if (creatorNameEl) creatorNameEl.innerText = video.creator;
  if (creatorAvatarEl) creatorAvatarEl.innerText = video.creator.charAt(0).toUpperCase();

  if (tagsRow) {
    const allTags = window.App.getTags();
    tagsRow.innerHTML = video.tags.map(tagId => {
      const tag = allTags.find(t => t.id === tagId);
      return tag ? window.Components.renderTagCard(tag) : '';
    }).join('');
  }

  if (likeBtn && likeCountEl) {
    const renderLikeState = () => {
      const isLiked = window.App.isVideoLiked(video.id);
      likeCountEl.innerText = video.likes.toLocaleString();
      if (isLiked) likeBtn.classList.add('liked');
      else likeBtn.classList.remove('liked');
    };
    renderLikeState();

    likeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const isNowLiked = window.App.toggleLikeVideo(video.id);
      window.Animations.animateLike(likeBtn);
      handleLike(isNowLiked);
      window.App.showToast(isNowLiked ? 'Video added to likes' : 'Video removed from likes');
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// RELATED SIDEBAR
// ═══════════════════════════════════════════════════════════════
function setupRelatedSidebar(currentVideo, allVideos) {
  const sidebarContainer = document.getElementById('related-videos-container');
  if (!sidebarContainer) return;

  const published = allVideos.filter(v => v.id !== currentVideo.id && v.status === 'published');
  const pinnedId = localStorage.getItem('up-next-video-id');
  let pinnedVideo = null;
  if (pinnedId && pinnedId !== currentVideo.id) {
    pinnedVideo = published.find(v => v.id === pinnedId) || null;
  }

  const relatedVideos = published
    .filter(v => !pinnedVideo || v.id !== pinnedVideo.id)
    .sort((a, b) => {
      const aOverlap = a.tags.filter(t => currentVideo.tags.includes(t)).length;
      const bOverlap = b.tags.filter(t => currentVideo.tags.includes(t)).length;
      if (aOverlap !== bOverlap) return bOverlap - aOverlap;
      return b.views - a.views;
    })
    .slice(0, pinnedVideo ? 5 : 6);

  if (!pinnedVideo && relatedVideos.length === 0) {
    sidebarContainer.innerHTML = '<p style="font-size: var(--text-sm); color: var(--text-muted);">No related videos.</p>';
    return;
  }

  const renderCard = (vid, isPinned = false) =>
    '<div class="related-card" data-href="./watch.html?id=' + encodeURIComponent(vid.id) + '" role="button" tabindex="0">' +
    '<div class="related-thumb"><img src="' + vid.thumbnail + '" alt="' + vid.title + ' Thumbnail" loading="lazy">' +
    '<span class="duration-badge" style="font-size: 10px; padding: 1px 4px;">' + vid.duration + '</span></div>' +
    '<div class="related-info"><h4 class="related-title">' + vid.title +
    (isPinned ? ' <span class="upnext-badge">Up Next</span>' : '') + '</h4>' +
    '<div class="related-meta"><div>' + vid.creator + '</div><div>' +
    Number(vid.views).toLocaleString() + ' views</div></div></div></div>';

  let html = '';
  if (pinnedVideo) html += renderCard(pinnedVideo, true);
  html += relatedVideos.map(v => renderCard(v)).join('');
  sidebarContainer.innerHTML = html;
}

// ═══════════════════════════════════════════════════════════════
// NOW PLAYING DRAWER
// ═══════════════════════════════════════════════════════════════
function setupNowPlayingDrawer(video, videoEl, handleLike) {
  const npThumb = document.getElementById('np-thumb');
  const npTitle = document.getElementById('np-title');
  const npCreator = document.getElementById('np-creator');
  const npPlayBtn = document.getElementById('np-play-btn');
  const npProgressFill = document.getElementById('np-progress-fill');
  const npProgressTrack = document.getElementById('np-progress-track');
  const npTimeCurrent = document.getElementById('np-time-current');
  const npTimeTotal = document.getElementById('np-time-total');
  const npVolumeFill = document.getElementById('np-volume-fill');
  const npVolumeTrack = document.getElementById('np-volume-track');
  const npMuteBtn = document.getElementById('np-mute-btn');
  const npHeart = document.getElementById('np-heart');

  const isEmbed = video.embedUrl && videoEl.style.display === 'none';

  if (npThumb) npThumb.src = video.thumbnail;
  if (npTitle) npTitle.innerText = video.title;
  if (npCreator) npCreator.innerText = video.creator;

  if (npHeart) {
    const isLiked = window.App.isVideoLiked(video.id);
    if (isLiked) npHeart.classList.add('liked');
    else npHeart.classList.remove('liked');

    npHeart.addEventListener('click', (e) => {
      e.stopPropagation();
      const isNowLiked = window.App.toggleLikeVideo(video.id);
      handleLike(isNowLiked);
      window.App.showToast(isNowLiked ? 'Video added to likes' : 'Video removed from likes');
    });
  }

  if (isEmbed) {
    const ctrl = document.getElementById('np-player-controls');
    const prog = document.getElementById('np-progress-container');
    const vol = document.getElementById('np-volume-container');
    if (ctrl) ctrl.style.display = 'none';
    if (prog) prog.style.display = 'none';
    if (vol) vol.style.display = 'none';
    return;
  }

  const updatePlayBtnIcon = () => {
    npPlayBtn.innerHTML = videoEl.paused
      ? '<svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><polygon points="8,5 19,12 8,19"></polygon></svg>'
      : '<svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>';
  };

  videoEl.addEventListener('play', updatePlayBtnIcon);
  videoEl.addEventListener('pause', updatePlayBtnIcon);
  updatePlayBtnIcon();

  npPlayBtn.addEventListener('click', () => {
    if (videoEl.paused) { videoEl.play(); } else { videoEl.pause(); }
  });

  const formatTime = (seconds) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins + ':' + (secs < 10 ? '0' : '') + secs;
  };

  videoEl.addEventListener('timeupdate', () => {
    const cur = videoEl.currentTime;
    const dur = videoEl.duration || 0;
    const pct = dur > 0 ? (cur / dur) * 100 : 0;
    if (npProgressFill) npProgressFill.style.width = pct + '%';
    if (npTimeCurrent) npTimeCurrent.innerText = formatTime(cur);
  });

  videoEl.addEventListener('loadedmetadata', () => {
    if (npTimeTotal) npTimeTotal.innerText = formatTime(videoEl.duration);
  });

  if (npProgressTrack) {
    npProgressTrack.addEventListener('click', (e) => {
      const rect = npProgressTrack.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;
      videoEl.currentTime = pct * (videoEl.duration || 0);
    });
  }

  let lastVolume = videoEl.volume;
  videoEl.addEventListener('volumechange', () => {
    const vol = videoEl.volume;
    const isMuted = videoEl.muted || vol === 0;
    if (npVolumeFill) npVolumeFill.style.width = (isMuted ? 0 : vol * 100) + '%';
    if (npMuteBtn) {
      npMuteBtn.innerHTML = isMuted
        ? '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>'
        : '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>';
    }
  });

  if (npVolumeTrack) {
    npVolumeTrack.addEventListener('click', (e) => {
      const rect = npVolumeTrack.getBoundingClientRect();
      let pct = (e.clientX - rect.left) / rect.width;
      if (pct < 0) pct = 0; if (pct > 1) pct = 1;
      videoEl.volume = pct;
      videoEl.muted = false;
      lastVolume = pct;
    });
  }

  if (npMuteBtn) {
    npMuteBtn.addEventListener('click', () => {
      if (videoEl.muted) {
        videoEl.muted = false;
        videoEl.volume = lastVolume > 0 ? lastVolume : 0.5;
      } else {
        lastVolume = videoEl.volume;
        videoEl.muted = true;
      }
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// ERROR STATE
// ═══════════════════════════════════════════════════════════════
function renderErrorView(message) {
  const watchGrid = document.querySelector('.watch-grid');
  if (watchGrid) {
    watchGrid.innerHTML = window.Components.renderErrorState(message);
  }
}
