// ─── WATCH PAGE LOGIC ───
// This script handles the video watch page: loading video data, setting up
// the custom video player (native/embed), video details, related sidebar,
// now-playing drawer, like/unlike, view counting, and keyboard shortcuts.
document.addEventListener('DOMContentLoaded', () => {

  // ─── INJECT NAVBAR & FOOTER ───
  window.Components.injectNavbar();
  window.Components.injectFooter();

  // ─── PARSE VIDEO ID ───
  // Get the video ID from the URL query parameter (?id=xxx)
  const params = window.App.getQueryParams();
  const videoId = params.id;

  // If no video ID is provided, show an error
  if (!videoId) {
    renderErrorView('Invalid Video Reference.');
    return;
  }

  // ─── LOAD VIDEO FROM DATABASE ───
  // Retrieve all videos from the database
  const dbVideos = window.App.getVideos();
  // Find the index of the current video in the array
  const videoIndex = dbVideos.findIndex(v => v.id === videoId);
  // Get the video object
  const video = dbVideos[videoIndex];

  // If the video doesn't exist, show an error
  if (!video) {
    renderErrorView('The video you are looking for does not exist.');
    return;
  }

  // ─── VIEW COUNT TRACKING ───
  // Flag to ensure the view is only counted once per page load
  let viewIncremented = false;

  // ─── LIKE HANDLER ───
  // Shared handler for like/unlike that updates the database, UI count, and like button states
  const handleLike = (isNowLiked) => {
    // Reload the database to get the latest state
    const db = window.App.getVideos();
    // Find this video in the database
    const idx = db.findIndex(v => v.id === video.id);
    if (idx !== -1) {
      // Increment or decrement the like count
      db[idx].likes = isNowLiked ? db[idx].likes + 1 : db[idx].likes - 1;
      // Save the updated database
      window.App.saveVideos(db);
      // Update the displayed like count
      const likeCountEl = document.getElementById('watch-like-count');
      if (likeCountEl) likeCountEl.innerText = db[idx].likes.toLocaleString();
    }
    // Update the watch page like button visual state
    const likeBtn = document.getElementById('watch-like-btn');
    if (likeBtn) {
      if (isNowLiked) likeBtn.classList.add('liked');
      else likeBtn.classList.remove('liked');
    }
    // Update the now-playing drawer heart icon state
    const npHeart = document.getElementById('np-heart');
    if (npHeart) {
      if (isNowLiked) npHeart.classList.add('liked');
      else npHeart.classList.remove('liked');
    }
  };

  // ─── SETUP VIDEO PLAYER ───
  // Initialize the custom video player with the video data
  setupVideoPlayer(video, () => {
    // Callback for first play: increment the view count once
    if (!viewIncremented) {
      dbVideos[videoIndex].views += 1;
      window.App.saveVideos(dbVideos);
      viewIncremented = true;
      // Update the displayed view count
      const viewsEl = document.getElementById('watch-views-count');
      if (viewsEl) {
        viewsEl.innerText = Number(dbVideos[videoIndex].views).toLocaleString();
      }
    }
  }, handleLike);

  // ─── SETUP VIDEO DETAILS ───
  setupVideoDetails(video, handleLike);

  // ─── SETUP RELATED SIDEBAR ───
  setupRelatedSidebar(video, dbVideos);

  // ─── TRIGGER SCROLL REVEAL ───
  window.Animations.initScrollReveal();
});

// ═══════════════════════════════════════════════════════════════
// CUSTOM VIDEO PLAYER
// ═══════════════════════════════════════════════════════════════

/**
 * Main entry for setting up the video player. Handles three scenarios:
 * 1. Embed video in HTTP protocol (uses iframe)
 * 2. Embed video in file:// protocol (tries native, shows fallback)
 * 3. Native video element with custom controls
 * Also sets up keyboard shortcuts (space to play/pause).
 *
 * @param {Object} video - The video object
 * @param {Function} onFirstPlay - Callback fired on the first play event
 * @param {Function} handleLike - Like/unlike handler function
 */
function setupVideoPlayer(video, onFirstPlay, handleLike) {
  // Get references to key DOM elements for the player
  const container = document.getElementById('player-container');
  const embedPlaceholder = document.getElementById('player-embed-placeholder');
  const videoEl = document.getElementById('main-video-player');
  const loadingEl = document.getElementById('player-loading');
  const nowPlayingBar = document.getElementById('now-playing-bar');

  // Exit if the container doesn't exist on this page
  if (!container) return;

  // Detect if the page is loaded via file:// protocol
  const isFileProtocol = window.location.protocol === 'file:';
  // Utility to check if a string is a valid HTTP URL
  const isValidHttpUrl = (str) => /^https?:\/\/.+/.test(str);
  // Check if the video has a valid embed URL (for external platforms)
  const isEmbedVideo = video.embedUrl && isValidHttpUrl(video.embedUrl);

  // ─── SCENARIO 1: EMBED VIDEO (HTTP protocol) ───
  if (isEmbedVideo && !isFileProtocol) {
    // Hide the native video element
    videoEl.style.display = 'none';
    // Show the iframe placeholder
    embedPlaceholder.style.display = 'block';
    // Show the loading spinner
    loadingEl.style.display = 'flex';
    // Clear any previous content in the placeholder
    embedPlaceholder.innerHTML = '';

    // Create an iframe for the embedded video (e.g., YouTube, Vimeo)
    const iframe = document.createElement('iframe');
    // Set the embed URL
    iframe.src = video.embedUrl;
    // Set descriptive title for accessibility
    iframe.title = video.title || 'Video player';
    // Allow standard video player features
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    // Enable fullscreen on the iframe
    iframe.allowFullscreen = true;
    // Apply inline styles for sizing
    iframe.style.cssText = 'width:100%; height:100%; border:0;';
    // Hide the loading spinner once the iframe loads
    iframe.addEventListener('load', () => { loadingEl.style.display = 'none'; });
    // Fallback: hide loading after 5 seconds even if load event doesn't fire
    setTimeout(() => { loadingEl.style.display = 'none'; }, 5000);
    // Append the iframe to the placeholder
    embedPlaceholder.appendChild(iframe);

    // Use IntersectionObserver to trigger the view count when the player becomes visible
    const viewObserver = new IntersectionObserver((entries) => {
      // If the player is at least 50% visible and callback exists, fire it
      if (entries[0].isIntersecting && onFirstPlay) { onFirstPlay(); viewObserver.disconnect(); }
    }, { threshold: 0.5 });
    // Start observing the container
    viewObserver.observe(container);

    // Setup the now-playing drawer (minimal controls for embed)
    setupNowPlayingDrawer(video, videoEl, handleLike);

  // ─── SCENARIO 2: EMBED VIDEO (file:// protocol) ───
  } else if (isEmbedVideo && isFileProtocol) {
    // Hide the iframe placeholder initially
    embedPlaceholder.style.display = 'none';
    // Show the loading spinner while trying native playback
    loadingEl.style.display = 'flex';

    // Fallback UI for when native playback fails in file:// mode
    const showFileFallback = () => {
      // Hide the loading spinner
      loadingEl.style.display = 'none';
      // Hide the native video element
      videoEl.style.display = 'none';
      // Show the placeholder with a fallback message and external link
      embedPlaceholder.style.display = 'flex';
      embedPlaceholder.style.flexDirection = 'column';
      embedPlaceholder.style.alignItems = 'center';
      embedPlaceholder.style.justifyContent = 'center';
      embedPlaceholder.style.gap = 'var(--space-md)';
      // Build the fallback HTML with a monitor icon and external link button
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
      // Trigger view count when the fallback becomes visible
      const viewObserver = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && onFirstPlay) { onFirstPlay(); viewObserver.disconnect(); }
      }, { threshold: 0.5 });
      viewObserver.observe(container);
    };

    // Try native playback with the video URL
    if (video.videoUrl) {
      // Show the native video element
      videoEl.style.display = 'block';
      // Remove default browser controls (we use custom ones)
      videoEl.removeAttribute('controls');
      // Set the video source
      videoEl.src = video.videoUrl;
      // Start loading the video
      videoEl.load();
      // Initialize the custom player controls
      initCustomPlayer(video, videoEl, onFirstPlay, handleLike);
      // If native playback fails, show the fallback (one-time listener)
      videoEl.addEventListener('error', showFileFallback, { once: true });
      // On play, hide the loading spinner and trigger the first-play callback
      videoEl.addEventListener('play', () => {
        loadingEl.style.display = 'none';
        if (onFirstPlay) onFirstPlay();
      });
    } else {
      // No video URL available, show fallback immediately
      showFileFallback();
    }
    // Setup the now-playing drawer
    setupNowPlayingDrawer(video, videoEl, handleLike);

  // ─── SCENARIO 3: NATIVE VIDEO ───
  } else {
    // Hide the embed placeholder
    embedPlaceholder.style.display = 'none';
    // Hide the loading spinner (native video loads quickly)
    loadingEl.style.display = 'none';
    // Show the native video element
    videoEl.style.display = 'block';
    // Remove default browser controls
    videoEl.removeAttribute('controls');

    // If the video has a URL, set it as the source
    if (video.videoUrl) {
      videoEl.src = video.videoUrl;
      videoEl.load();
    }

    // Initialize the custom player controls
    initCustomPlayer(video, videoEl, onFirstPlay, handleLike);
    // Setup the now-playing drawer
    setupNowPlayingDrawer(video, videoEl, handleLike);

    // On first play, trigger the callback
    videoEl.addEventListener('play', () => {
      if (onFirstPlay) onFirstPlay();
    });

    // If no video URL is available, show a "not available" message
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

  // ─── KEYBOARD SHORTCUTS ───
  // Use an AbortController so we can clean up the listener on page unload
  const ac = new AbortController();
  // Listen for keyboard events with the abort signal
  document.addEventListener('keydown', (e) => {
    // Space bar toggles play/pause (only when not focused on an input field)
    if (e.key === ' ' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
      // Prevent the default scroll-on-space behavior
      e.preventDefault();
      // Only toggle if this is not an embed video and has a URL
      if (!isEmbedVideo && video.videoUrl) {
        if (videoEl.paused) { videoEl.play(); } else { videoEl.pause(); }
      }
    }
  }, { signal: ac.signal });

  // ─── CLEANUP ON PAGE UNLOAD ───
  // Abort the keyboard event listener when leaving the page to prevent memory leaks
  window.addEventListener('beforeunload', () => ac.abort(), { once: true });
}

// ─── INIT CUSTOM PLAYER ───────────────────────────────────
/**
 * Initializes all custom video player controls (play/pause, seek, volume,
 * speed, theater mode, PIP, fullscreen, end screen, emoji reactions,
 * loading/error states, progress bar, and swipe/double-tap seek).
 *
 * @param {Object} video - The video object
 * @param {HTMLVideoElement} videoEl - The native <video> element
 * @param {Function} onFirstPlay - Callback for first play
 * @param {Function} handleLike - Like/unlike handler
 */
function initCustomPlayer(video, videoEl, onFirstPlay, handleLike) {
  // ─── DOM REFERENCES ───
  // Collect references to all player control elements
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
  // Get the parent container of the video element
  const container = videoEl.parentElement;

  // Exit if the overlay doesn't exist
  if (!overlay) return;
  // Show the overlay
  overlay.style.display = 'flex';
  // Wait for next frame then add the 'visible' class for CSS transition
  requestAnimationFrame(() => overlay.classList.add('visible'));

  // ─── STATE ───
  // Timer reference for auto-hiding controls after inactivity
  let controlsTimeout = null;
  // Flag for whether the user is currently dragging the progress bar
  let isSeeking = false;
  // Stores the volume level before muting (for restore on unmute)
  let volumeBeforeMute = videoEl.volume || 0.7;
  // Timestamp of the last tap (for double-tap detection)
  let lastTapTime = 0;

  // ─── AUTO-HIDE CONTROLS ─────────────────────────────────
  // Shows all controls and resets the auto-hide timer
  const showControls = () => {
    overlay.classList.add('visible');
    overlay.classList.remove('hide-cursor');
    clearTimeout(controlsTimeout);
    // Hide controls after 3 seconds of inactivity (only when playing)
    controlsTimeout = setTimeout(() => {
      if (!videoEl.paused) {
        overlay.classList.remove('visible');
        overlay.classList.add('hide-cursor');
      }
    }, 3000);
  };

  // Shows controls without scheduling a new hide timer
  const showControlsOnce = () => {
    overlay.classList.add('visible');
    overlay.classList.remove('hide-cursor');
    clearTimeout(controlsTimeout);
  };

  // Show controls on mouse movement over the player
  overlay.addEventListener('mousemove', showControls);
  // Show controls on touch start (mobile), with passive flag for performance
  overlay.addEventListener('touchstart', showControlsOnce, { passive: true });
  // Show controls on any click within the overlay
  overlay.addEventListener('click', showControlsOnce);

  // ─── FORMAT TIME ────────────────────────────────────────
  // Converts seconds (number) to a "M:SS" display string
  const fmt = (s) => {
    if (isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return m + ':' + (sec < 10 ? '0' : '') + sec;
  };

  // ─── PLAY / PAUSE ───────────────────────────────────────
  // Toggles play/pause state on the video element
  const togglePlay = () => {
    if (videoEl.paused) { videoEl.play(); } else { videoEl.pause(); }
    showControlsOnce();
  };

  // Updates all play/pause button icons to reflect the current video state
  const updatePlayIcons = () => {
    const isPaused = videoEl.paused;
    // Small play/pause icon for the bottom control bar
    const smallIcon = isPaused
      ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="8,5 19,12 8,19"></polygon></svg>'
      : '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>';
    // Large play/pause icon for the center overlay
    const bigIcon = isPaused
      ? '<svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor"><polygon points="8,5 19,12 8,19"></polygon></svg>'
      : '<svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>';
    if (playBtn) playBtn.innerHTML = smallIcon;
    if (centerPlay) {
      centerPlay.innerHTML = bigIcon;
      centerPlay.classList.toggle('show', isPaused);
    }
    // When paused, ensure controls stay visible and the cursor is shown
    if (isPaused) {
      overlay.classList.add('visible');
      overlay.classList.remove('hide-cursor');
      clearTimeout(controlsTimeout);
    }
  };

  // Update icons when playback state changes
  videoEl.addEventListener('play', updatePlayIcons);
  videoEl.addEventListener('pause', updatePlayIcons);
  // Set initial icon state
  updatePlayIcons();

  // Bind center play button and bottom play button to toggle
  if (centerPlay) centerPlay.addEventListener('click', togglePlay);
  if (playBtn) playBtn.addEventListener('click', togglePlay);
  // Double-click on the video container also toggles play/pause
  container.addEventListener('dblclick', togglePlay);

  // ─── REWIND / FORWARD ───────────────────────────────────
  // Seeks the video by a relative amount (in seconds), showing a seek indicator popup
  const seekRelative = (delta) => {
    // Calculate new time, clamped between 0 and duration
    const newTime = Math.max(0, Math.min(videoEl.duration || 0, videoEl.currentTime + delta));
    videoEl.currentTime = newTime;
    // Show the seek indicator popup
    if (seekIndicator) {
      seekIndicator.style.display = 'flex';
      // Apply direction-specific class for CSS styling
      seekIndicator.className = 'player-seek-indicator ' + (delta < 0 ? 'seek-left' : 'seek-right');
      // Arrow icon pointing left for rewind, right for forward
      const arrow = delta < 0
        ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>'
        : '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>';
      seekIndicator.innerHTML = arrow + '<span>' + Math.abs(delta) + 's</span>';
      // Reset and restart the pop animation by removing/re-adding
      seekIndicator.style.animation = 'none';
      void seekIndicator.offsetWidth;
      seekIndicator.style.animation = 'playerSeekPop 0.4s var(--ease-spring) forwards';
      // Clear any existing hide timeout
      clearTimeout(seekIndicator._hide);
      // Hide the indicator after 800ms
      seekIndicator._hide = setTimeout(() => { seekIndicator.style.display = 'none'; }, 800);
    }
    showControlsOnce();
  };

  // Bind rewind (-10s) and forward (+10s) buttons
  if (rewindBtn) rewindBtn.addEventListener('click', () => seekRelative(-10));
  if (forwardBtn) forwardBtn.addEventListener('click', () => seekRelative(10));

  // ─── DOUBLE-TAP SEEK (MOBILE) ───────────────────────────
  // Left and right tap zones for mobile double-tap seeking
  const dtapLeft = document.getElementById('player-dtap-left');
  const dtapRight = document.getElementById('player-dtap-right');

  // Handles double-tap detection: if two taps occur within 350ms, seek by +/-10s
  const handleDblTap = (side) => {
    const now = Date.now();
    if (now - lastTapTime < 350) {
      // Double tap detected: seek in the corresponding direction
      seekRelative(side === 'left' ? -10 : 10);
      // Reset the tap timer
      lastTapTime = 0;
    } else {
      // First tap: store the timestamp
      lastTapTime = now;
    }
  };

  // Bind double-tap zones
  if (dtapLeft) dtapLeft.addEventListener('click', () => handleDblTap('left'));
  if (dtapRight) dtapRight.addEventListener('click', () => handleDblTap('right'));

  // ─── SWIPE SEEK (MOBILE) ────────────────────────────────
  // Track touch start position for swipe detection
  let touchStartX = 0;
  // Timestamp when the touch started
  let touchStartTime = 0;
  // Whether a swipe has been detected
  let isSwiping = false;

  // Record the starting X position on touch start
  container.addEventListener('touchstart', (e) => {
    // Only track single-finger touches
    if (e.touches.length === 1) {
      touchStartX = e.touches[0].clientX;
      touchStartTime = Date.now();
      isSwiping = false;
    }
  }, { passive: true });

  // Detect horizontal swipe during touch move
  container.addEventListener('touchmove', (e) => {
    if (e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - touchStartX;
    // If the horizontal movement exceeds 20px, consider it a swipe
    if (Math.abs(dx) > 20) {
      isSwiping = true;
      // Prevent default scrolling while swiping
      e.preventDefault();
    }
  }, { passive: false });

  // On touch end, calculate swipe distance and seek proportionally
  container.addEventListener('touchend', (e) => {
    if (!isSwiping) return;
    // Calculate total horizontal distance swiped
    const dx = e.changedTouches[0].clientX - touchStartX;
    const duration = videoEl.duration || 0;
    // Only act if the swipe was more than 40px
    if (Math.abs(dx) > 40) {
      // Convert pixel distance to a percentage of container width, scaled by 2x for sensitivity
      const seekPct = (dx / container.offsetWidth) * 2;
      // Calculate seek delta clamped to +/-30 seconds
      const delta = duration * Math.max(-30, Math.min(30, seekPct));
      // Perform the seek
      seekRelative(delta);
    }
  }, { passive: true });

  // ─── TIME UPDATE ────────────────────────────────────────
  // Updates the progress bar, current time display, and saves resume position
  videoEl.addEventListener('timeupdate', () => {
    const cur = videoEl.currentTime;
    const dur = videoEl.duration || 0;
    // Calculate progress percentage
    const pct = dur > 0 ? (cur / dur) * 100 : 0;
    // Update the progress fill width
    if (progressFill) progressFill.style.width = pct + '%';
    // Update the progress thumb (draggable handle) position
    if (progressThumb) progressThumb.style.left = pct + '%';
    // Update the current time display
    if (timeCurrent) timeCurrent.innerText = fmt(cur);

    // Save the current playback position for resume functionality
    try { localStorage.setItem('continue-' + video.id, cur); } catch (_) {}
  });

  // On video metadata load, display total duration and attempt to resume from saved position
  videoEl.addEventListener('loadedmetadata', () => {
    // Set the total time display
    if (timeTotal) timeTotal.innerText = fmt(videoEl.duration);

    // Attempt to resume playback from a saved position
    try {
      const saved = localStorage.getItem('continue-' + video.id);
      if (saved && videoEl.duration > 0) {
        const t = parseFloat(saved);
        // Only resume if the saved position is more than 5s in and more than 5s from the end
        if (t > 5 && t < videoEl.duration - 5) {
          videoEl.currentTime = t;
          // Notify the user about resuming
          window.App.showToast('Resuming from ' + fmt(t), 'info');
        }
      }
    } catch (_) {}
  });

  // Updates the buffered progress bar as the video loads
  videoEl.addEventListener('progress', () => {
    if (!videoEl.buffered.length) return;
    // Get the end of the buffered range
    const bufferedEnd = videoEl.buffered.end(videoEl.buffered.length - 1);
    const dur = videoEl.duration || 1;
    // Update the buffered bar width
    if (progressBuffered) progressBuffered.style.width = (bufferedEnd / dur * 100) + '%';
  });

  // ─── PROGRESS BAR SEEKING ───────────────────────────────
  // Handles click-to-seek and drag-to-seek on the progress bar
  if (progressTrack) {
    // Seeks the video to the position corresponding to a clientX coordinate
    const seekFromEvent = (clientX) => {
      const rect = progressTrack.getBoundingClientRect();
      // Calculate the click position as a fraction (0-1)
      const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      // Seek the video to that fraction of its duration
      if (videoEl.duration) videoEl.currentTime = pct * videoEl.duration;
    };

    // Click to seek on the progress track
    progressTrack.addEventListener('click', (e) => seekFromEvent(e.clientX));

    // Handles mouse/touch move during drag
    const onMove = (e) => {
      isSeeking = true;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const rect = progressTrack.getBoundingClientRect();
      // Calculate preview position
      const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      // Update the progress fill and thumb in real time
      if (progressFill) progressFill.style.width = pct + '%';
      if (progressThumb) progressThumb.style.left = pct + '%';
      // Update the preview time tooltip
      if (previewTime) previewTime.innerText = fmt(pct * (videoEl.duration || 0));
    };

    // Handles the end of a drag (mouseup/touchend)
    const onUp = (e) => {
      if (!isSeeking) return;
      isSeeking = false;
      const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
      // Seek to the final position
      seekFromEvent(clientX);
      // Hide the preview tooltip
      if (preview) preview.style.display = 'none';
      // Remove the move/up listeners that were added during drag
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
    };

    // Start drag on mousedown over the progress track
    progressTrack.addEventListener('mousedown', (e) => {
      isSeeking = true;
      // Show the preview tooltip
      if (preview) preview.style.display = 'block';
      // Add document-level listeners for smooth drag tracking
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });

    // Start drag on touchstart over the progress track (mobile)
    progressTrack.addEventListener('touchstart', () => {
      isSeeking = true;
      if (preview) preview.style.display = 'block';
      document.addEventListener('touchmove', onMove);
      document.addEventListener('touchend', onUp);
    }, { passive: true });

    // Show preview time on hover over the progress container
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

    // Hide the preview when the mouse leaves the progress container
    progressEl.addEventListener('mouseleave', () => {
      if (!isSeeking && preview) preview.style.display = 'none';
    });
  }

  // ─── VOLUME ─────────────────────────────────────────────
  // Updates the volume slider and mute button icon
  const updateVolumeUI = () => {
    const vol = videoEl.muted ? 0 : videoEl.volume;
    // Update the volume fill width
    if (volumeFill) volumeFill.style.width = (vol * 100) + '%';
    // Update the mute button icon
    if (muteBtn) {
      const isMuted = videoEl.muted || videoEl.volume === 0;
      muteBtn.innerHTML = isMuted
        // Muted icon (speaker with X)
        ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>'
        // Unmuted icon (speaker with waves)
        : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>';
    }
  };

  // Update volume UI when the volume changes
  videoEl.addEventListener('volumechange', updateVolumeUI);
  // Set initial volume UI state
  updateVolumeUI();

  // Click on the volume track to set volume level
  if (volumeTrack) {
    volumeTrack.addEventListener('click', (e) => {
      const rect = volumeTrack.getBoundingClientRect();
      let pct = (e.clientX - rect.left) / rect.width;
      // Clamp between 0 and 1
      pct = Math.max(0, Math.min(1, pct));
      videoEl.volume = pct;
      videoEl.muted = false;
      volumeBeforeMute = pct;
    });
  }

  // Toggle mute on the mute button click
  if (muteBtn) {
    muteBtn.addEventListener('click', () => {
      if (videoEl.muted) {
        // Unmute and restore previous volume level
        videoEl.muted = false;
        videoEl.volume = volumeBeforeMute > 0 ? volumeBeforeMute : 0.5;
      } else {
        // Mute and save current volume
        volumeBeforeMute = videoEl.volume;
        videoEl.muted = true;
      }
    });
  }

  // ─── PLAYBACK SPEED ─────────────────────────────────────
  if (speedBtn) {
    // Toggle the speed menu on button click (prevent event from bubbling)
    speedBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      speedMenu.style.display = speedMenu.style.display === 'block' ? 'none' : 'block';
    });

    // Handle speed option selection
    speedMenu.addEventListener('click', (e) => {
      // Find the clicked button within the menu
      const btn = e.target.closest('button');
      if (!btn) return;
      // Parse the speed value from the data attribute
      const speed = parseFloat(btn.dataset.speed);
      // Set the video playback rate
      videoEl.playbackRate = speed;
      // Update the speed button text
      speedBtn.innerText = speed + 'x';
      // Remove active state from all speed options
      speedMenu.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      // Set active state on the selected option
      btn.classList.add('active');
      // Close the menu
      speedMenu.style.display = 'none';
    });

    // Close the speed menu when clicking anywhere else on the document
    document.addEventListener('click', () => { speedMenu.style.display = 'none'; });
  }

  // ─── THEATER MODE ─────────────────────────────────────
  if (theaterBtn) {
    theaterBtn.addEventListener('click', () => {
      // Toggle the 'theater-mode' class on the container
      container.classList.toggle('theater-mode');
      const isTheater = container.classList.contains('theater-mode');
      // Update the button icon for theater mode (expand/collapse)
      theaterBtn.innerHTML = isTheater
        ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>'
        : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>';
      // Notify the user
      window.App.showToast(isTheater ? 'Theater mode on' : 'Theater mode off', 'info');
    });
  }

  // ─── MINI PLAYER (PIP) ────────────────────────────────
  if (pipBtn) {
    pipBtn.addEventListener('click', async () => {
      try {
        if (document.pictureInPictureElement) {
          // Exit Picture-in-Picture mode if already in it
          await document.exitPictureInPicture();
        } else {
          // Request Picture-in-Picture for the video element
          await videoEl.requestPictureInPicture();
        }
      } catch (_) {
        // Show error if PIP is not supported or denied
        window.App.showToast('Picture-in-Picture not supported', 'error');
      }
    });
  }

  // ─── FULLSCREEN ───────────────────────────────────────
  // Toggles fullscreen mode on the player container
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      // Request fullscreen with vendor prefix fallbacks
      if (container.requestFullscreen) container.requestFullscreen();
      else if (container.webkitRequestFullscreen) container.webkitRequestFullscreen();
      // Add fullscreen class for additional CSS styling
      container.classList.add('fullscreen-mode');
    } else {
      // Exit fullscreen with vendor prefix fallbacks
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      container.classList.remove('fullscreen-mode');
    }
  };

  // Bind the fullscreen button
  if (fullscreenBtn) fullscreenBtn.addEventListener('click', toggleFullscreen);
  // Sync the fullscreen class when the browser enters/exits fullscreen natively
  document.addEventListener('fullscreenchange', () => {
    container.classList.toggle('fullscreen-mode', !!document.fullscreenElement);
  });

  // ─── END SCREEN (DISCOVERY) ───────────────────────────
  // Show the end screen when the video finishes playing
  videoEl.addEventListener('ended', () => {
    // Show the end screen overlay
    if (endScreen) endScreen.style.display = 'flex';
    // Ensure controls are visible
    overlay.classList.add('visible');
    overlay.classList.remove('hide-cursor');
    clearTimeout(controlsTimeout);

    // Load a random related video for the "Up Next" suggestion
    if (endRelated) {
      // Get all published videos except the current one
      const allVideos = window.App.getVideos().filter(v => v.id !== video.id && v.status === 'published');
      // Pick a random video
      const next = allVideos[Math.floor(Math.random() * allVideos.length)];
      if (next) {
        // Render the suggested video card
        endRelated.innerHTML =
          '<a href="./watch.html?id=' + encodeURIComponent(next.id) + '" class="player-end-card">' +
          '<img src="' + next.thumbnail + '" alt="" class="player-end-thumb" loading="lazy">' +
          '<div class="player-end-info">' +
          '<div class="player-end-title">' + next.title + '</div>' +
          '<div class="player-end-creator">' + next.creator + '</div></div></a>';
      } else {
        // No more videos available
        endRelated.innerHTML = '<p style="color:rgba(255,255,255,0.6);font-size:var(--text-sm);">No more videos</p>';
      }
    }
  });

  // Replay button: restart the video and hide the end screen
  if (replayBtn) {
    replayBtn.addEventListener('click', () => {
      videoEl.currentTime = 0;
      videoEl.play();
      if (endScreen) endScreen.style.display = 'none';
    });
  }

  // ─── EMOJI REACTIONS (session-based, resets each page load) ─────────────────
  // LocalStorage key for persisting emoji reaction counts for this video
  const EMOJI_KEY = 'emoji-reactions-' + video.id;
  // Object to store current emoji counts in memory
  let emojiCounts = {};

  // Updates the count display for each emoji button
  const updateEmojiUI = () => {
    document.querySelectorAll('.emoji-btn').forEach(btn => {
      const emoji = btn.dataset.emoji;
      const count = emojiCounts[emoji] || 0;
      const countEl = btn.querySelector('.emoji-count');
      if (countEl) countEl.innerText = count || '0';
    });
  };
  // Initialize the emoji UI
  updateEmojiUI();

  // Handle emoji click: increment count, persist, update UI, and show floating animation
  emojiBar.addEventListener('click', (e) => {
    // Find the clicked emoji button
    const btn = e.target.closest('.emoji-btn');
    if (!btn) return;
    const emoji = btn.dataset.emoji;
    // Increment the count for this emoji
    emojiCounts[emoji] = (emojiCounts[emoji] || 0) + 1;
    // Persist to localStorage
    try { localStorage.setItem(EMOJI_KEY, JSON.stringify(emojiCounts)); } catch (_) {}
    // Update the UI
    updateEmojiUI();

    // Create a floating emoji that animates upward
    const float = document.createElement('div');
    float.className = 'emoji-float';
    float.innerText = emoji;
    // Position the floating emoji above the clicked button
    const rect = btn.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    float.style.left = (rect.left - containerRect.left + rect.width / 2 - 14) + 'px';
    float.style.top = (rect.top - containerRect.top - 10) + 'px';
    // Add to the player container
    container.appendChild(float);
    // Remove after the animation completes (1.2s)
    setTimeout(() => float.remove(), 1200);
  });

  // ─── LOADING STATE ───────────────────────────────────
  // Show a loading spinner when the video is buffering
  const loadingEl = document.getElementById('player-loading');
  // Show loading when video is waiting for data
  videoEl.addEventListener('waiting', () => { if (loadingEl) loadingEl.style.display = 'flex'; });
  // Hide loading when the video can play
  videoEl.addEventListener('canplay', () => { if (loadingEl) loadingEl.style.display = 'none'; });
  // Hide loading when the video is actively playing
  videoEl.addEventListener('playing', () => { if (loadingEl) loadingEl.style.display = 'none'; });

  // ─── ERROR STATE ─────────────────────────────────────
  // Show an error overlay when the video fails to load
  const errorOverlay = document.getElementById('player-error');
  const retryBtn = document.getElementById('player-error-retry');

  videoEl.addEventListener('error', () => {
    if (errorOverlay) errorOverlay.style.display = 'flex';
    overlay.classList.add('visible');
    overlay.classList.remove('hide-cursor');
    clearTimeout(controlsTimeout);
    if (loadingEl) loadingEl.style.display = 'none';
  });

  // Retry button: hide the error overlay and reload the video
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

/**
 * Populates the video detail section (title, views, date, description,
 * creator, tags, and like button with its count).
 *
 * @param {Object} video - The video object
 * @param {Function} handleLike - Like/unlike handler
 */
function setupVideoDetails(video, handleLike) {
  // Get references to all detail section elements
  const titleEl = document.getElementById('watch-title');
  const viewsEl = document.getElementById('watch-views-count');
  const dateEl = document.getElementById('watch-publish-date');
  const descEl = document.getElementById('watch-description');
  const creatorAvatarEl = document.getElementById('creator-avatar-letter');
  const creatorNameEl = document.getElementById('creator-name');
  const tagsRow = document.getElementById('watch-tags-row');
  const likeBtn = document.getElementById('watch-like-btn');
  const likeCountEl = document.getElementById('watch-like-count');

  // Set video title
  if (titleEl) titleEl.innerText = video.title;
  // Set view count with locale formatting
  if (viewsEl) viewsEl.innerText = Number(video.views).toLocaleString();
  // Set publish date
  if (dateEl) dateEl.innerText = video.publishDate;
  // Set description
  if (descEl) descEl.innerText = video.description;
  // Set creator name
  if (creatorNameEl) creatorNameEl.innerText = video.creator;
  // Set creator avatar initial letter
  if (creatorAvatarEl) creatorAvatarEl.innerText = video.creator.charAt(0).toUpperCase();

  // Render tag badges for the video's tags
  if (tagsRow) {
    const allTags = window.App.getTags();
    tagsRow.innerHTML = video.tags.map(tagId => {
      const tag = allTags.find(t => t.id === tagId);
      return tag ? window.Components.renderTagCard(tag) : '';
    }).join('');
  }

  // ─── LIKE BUTTON ───
  if (likeBtn && likeCountEl) {
    // Renders the current like state (liked/unliked) and count
    const renderLikeState = () => {
      const isLiked = window.App.isVideoLiked(video.id);
      likeCountEl.innerText = video.likes.toLocaleString();
      if (isLiked) likeBtn.classList.add('liked');
      else likeBtn.classList.remove('liked');
    };
    // Initial render
    renderLikeState();

    // Handle like button click
    likeBtn.addEventListener('click', (e) => {
      // Prevent default button behavior
      e.preventDefault();
      // Toggle the like state
      const isNowLiked = window.App.toggleLikeVideo(video.id);
      // Trigger the heart-beat animation
      window.Animations.animateLike(likeBtn);
      // Update the database and UI via the shared handler
      handleLike(isNowLiked);
      // Show toast notification
      window.App.showToast(isNowLiked ? 'Video added to likes' : 'Video removed from likes');
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// RELATED SIDEBAR
// ═══════════════════════════════════════════════════════════════

/**
 * Builds the related videos sidebar. Shows a pinned "Up Next" video (if set),
 * then sorts remaining videos by tag overlap (descending) and view count (descending).
 *
 * @param {Object} currentVideo - The currently playing video
 * @param {Array} allVideos - Full video database
 */
function setupRelatedSidebar(currentVideo, allVideos) {
  // Find the sidebar container
  const sidebarContainer = document.getElementById('related-videos-container');
  if (!sidebarContainer) return;

  // Filter out the current video and only show published videos
  const published = allVideos.filter(v => v.id !== currentVideo.id && v.status === 'published');
  // Check if there's a user-pinned "Up Next" video in localStorage
  const pinnedId = localStorage.getItem('up-next-video-id');
  let pinnedVideo = null;
  if (pinnedId && pinnedId !== currentVideo.id) {
    pinnedVideo = published.find(v => v.id === pinnedId) || null;
  }

  // Sort and select related videos
  const relatedVideos = published
    // Exclude the pinned video from the main list (it's shown separately)
    .filter(v => !pinnedVideo || v.id !== pinnedVideo.id)
    .sort((a, b) => {
      // Primary sort: number of overlapping tags with the current video
      const aOverlap = a.tags.filter(t => currentVideo.tags.includes(t)).length;
      const bOverlap = b.tags.filter(t => currentVideo.tags.includes(t)).length;
      if (aOverlap !== bOverlap) return bOverlap - aOverlap;
      // Secondary sort: view count (higher first)
      return b.views - a.views;
    })
    // Limit to 5 if there's a pinned video, otherwise 6
    .slice(0, pinnedVideo ? 5 : 6);

  // If no pinned video and no related videos, show a message
  if (!pinnedVideo && relatedVideos.length === 0) {
    sidebarContainer.innerHTML = '<p style="font-size: var(--text-sm); color: var(--text-muted);">No related videos.</p>';
    return;
  }

  // Renders a single related video card with optional "Up Next" badge
  const renderCard = (vid, isPinned = false) =>
    '<div class="related-card" data-href="./watch.html?id=' + encodeURIComponent(vid.id) + '" role="button" tabindex="0">' +
    '<div class="related-thumb"><img src="' + vid.thumbnail + '" alt="' + vid.title + ' Thumbnail" loading="lazy">' +
    '<span class="duration-badge" style="font-size: 10px; padding: 1px 4px;">' + vid.duration + '</span></div>' +
    '<div class="related-info"><h4 class="related-title">' + vid.title +
    (isPinned ? ' <span class="upnext-badge">Up Next</span>' : '') + '</h4>' +
    '<div class="related-meta"><div>' + vid.creator + '</div><div>' +
    Number(vid.views).toLocaleString() + ' views</div></div></div></div>';

  // Build the HTML: pinned video first (if any), then related videos
  let html = '';
  if (pinnedVideo) html += renderCard(pinnedVideo, true);
  html += relatedVideos.map(v => renderCard(v)).join('');
  sidebarContainer.innerHTML = html;
}

// ═══════════════════════════════════════════════════════════════
// NOW PLAYING DRAWER
// ═══════════════════════════════════════════════════════════════

/**
 * Sets up the "Now Playing" drawer bar at the bottom of the page.
 * Shows thumbnail, title, creator, play/pause, progress, volume, and heart (like).
 * For embed videos, hides the controllable elements.
 *
 * @param {Object} video - The video object
 * @param {HTMLVideoElement} videoEl - The native <video> element
 * @param {Function} handleLike - Like/unlike handler
 */
function setupNowPlayingDrawer(video, videoEl, handleLike) {
  // Get references to drawer elements
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

  // Detect if this is an embed video (native video element is hidden)
  const isEmbed = video.embedUrl && videoEl.style.display === 'none';

  // Set thumbnail image
  if (npThumb) npThumb.src = video.thumbnail;
  // Set video title
  if (npTitle) npTitle.innerText = video.title;
  // Set creator name
  if (npCreator) npCreator.innerText = video.creator;

  // ─── HEART (LIKE) BUTTON ───
  if (npHeart) {
    // Set initial like state
    const isLiked = window.App.isVideoLiked(video.id);
    if (isLiked) npHeart.classList.add('liked');
    else npHeart.classList.remove('liked');

    // Handle heart click: toggle like state
    npHeart.addEventListener('click', (e) => {
      // Prevent event from bubbling up (which could trigger other handlers)
      e.stopPropagation();
      const isNowLiked = window.App.toggleLikeVideo(video.id);
      handleLike(isNowLiked);
      window.App.showToast(isNowLiked ? 'Video added to likes' : 'Video removed from likes');
    });
  }

  // ─── EMBED MODE: HIDE CONTROLS ───
  if (isEmbed) {
    // Hide the play/pause button
    const ctrl = document.getElementById('np-player-controls');
    // Hide the progress bar container
    const prog = document.getElementById('np-progress-container');
    // Hide the volume controls
    const vol = document.getElementById('np-volume-container');
    if (ctrl) ctrl.style.display = 'none';
    if (prog) prog.style.display = 'none';
    if (vol) vol.style.display = 'none';
    return;
  }

  // ─── PLAY/PAUSE BUTTON ───
  const updatePlayBtnIcon = () => {
    npPlayBtn.innerHTML = videoEl.paused
      ? '<svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><polygon points="8,5 19,12 8,19"></polygon></svg>'
      : '<svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>';
  };

  // Update icon on play/pause events
  videoEl.addEventListener('play', updatePlayBtnIcon);
  videoEl.addEventListener('pause', updatePlayBtnIcon);
  // Set initial icon
  updatePlayBtnIcon();

  // Toggle play/pause on button click
  npPlayBtn.addEventListener('click', () => {
    if (videoEl.paused) { videoEl.play(); } else { videoEl.pause(); }
  });

  // ─── TIME FORMATTER (local copy) ───
  const formatTime = (seconds) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins + ':' + (secs < 10 ? '0' : '') + secs;
  };

  // ─── TIME UPDATE ───
  videoEl.addEventListener('timeupdate', () => {
    const cur = videoEl.currentTime;
    const dur = videoEl.duration || 0;
    const pct = dur > 0 ? (cur / dur) * 100 : 0;
    if (npProgressFill) npProgressFill.style.width = pct + '%';
    if (npTimeCurrent) npTimeCurrent.innerText = formatTime(cur);
  });

  // ─── LOADED METADATA ───
  videoEl.addEventListener('loadedmetadata', () => {
    if (npTimeTotal) npTimeTotal.innerText = formatTime(videoEl.duration);
  });

  // ─── PROGRESS BAR SEEK ───
  if (npProgressTrack) {
    npProgressTrack.addEventListener('click', (e) => {
      const rect = npProgressTrack.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;
      videoEl.currentTime = pct * (videoEl.duration || 0);
    });
  }

  // ─── VOLUME ───
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

  // Click on volume track to set volume
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

  // Toggle mute on button click
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

/**
 * Replaces the watch page grid content with an error state message.
 * @param {string} message - The error message to display
 */
function renderErrorView(message) {
  const watchGrid = document.querySelector('.watch-grid');
  if (watchGrid) {
    watchGrid.innerHTML = window.Components.renderErrorState(message);
  }
}
