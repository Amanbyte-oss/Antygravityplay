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
// YOUTUBE IFrame API STATE
// ═══════════════════════════════════════════════════════════════
let youtubePlayerInstance = null;
let youtubeApiLoaded = false;
let youtubeApiCallbacks = [];

function onYouTubeIframeAPIReady() {
  youtubeApiLoaded = true;
  youtubeApiCallbacks.forEach(function(cb) { cb(); });
  youtubeApiCallbacks = [];
}

function loadYouTubeAPI(callback) {
  if (youtubeApiLoaded || (window.YT && window.YT.Player)) {
    youtubeApiLoaded = true;
    callback();
    return;
  }
  youtubeApiCallbacks.push(callback);
  if (!document.getElementById('youtube-iframe-api')) {
    var tag = document.createElement('script');
    tag.id = 'youtube-iframe-api';
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  }
}

function extractYouTubeId(url) {
  var m = url.match(/\/embed\/([^?&]+)/);
  return m ? m[1] : null;
}

function getYouTubeEmbedUrl(video) {
  if (video.embedUrl) return video.embedUrl;
  var ids = ['aqz-KE-bpKQ', 'Z3nTfB5yCpM', 'R6MlUcmOul8'];
  var num = parseInt(video.id.replace('vid-', ''), 10);
  return 'https://www.youtube.com/embed/' + ids[(num - 1) % 3];
}

// ═══════════════════════════════════════════════════════════════
// QUALITY LEVELS
// ═══════════════════════════════════════════════════════════════
var QUALITY_LABELS = ['1080p', '720p', '480p', '360p', '144p', 'Auto'];
var QUALITY_YT_MAP = { '1080p':'hd1080', '720p':'hd720', '480p':'large', '360p':'medium', '144p':'small', 'Auto':'default' };

function getVideoSources(video) {
  if (video.sources && video.sources.length > 0) return video.sources;
  if (video.videoUrl) {
    var base = video.videoUrl;
    return [
      { quality:'360p', url:base },
      { quality:'720p', url:base }
    ];
  }
  return [];
}

function getDefaultQuality(sources) {
  for (var i = 0; i < sources.length; i++) {
    if (sources[i].quality === '360p') return '360p';
  }
  return sources.length > 0 ? sources[0].quality : 'Auto';
}

// ═══════════════════════════════════════════════════════════════
// CUSTOM VIDEO PLAYER
// ═══════════════════════════════════════════════════════════════

/**
 * Main entry for setting up the video player. Handles three scenarios:
 * 1. YouTube embed in HTTP protocol (uses YouTube IFrame API with custom controls)
 * 2. Other embed in HTTP protocol (uses iframe)
 * 3. Embed video in file:// protocol (tries native, shows fallback)
 * 4. Native video element with custom controls
 * Also sets up keyboard shortcuts (space to play/pause).
 *
 * @param {Object} video - The video object
 * @param {Function} onFirstPlay - Callback fired on the first play event
 * @param {Function} handleLike - Like/unlike handler function
 */
function setupVideoPlayer(video, onFirstPlay, handleLike) {
  // Get references to key DOM elements for the player
  var container = document.getElementById('player-container');
  var embedPlaceholder = document.getElementById('player-embed-placeholder');
  var videoEl = document.getElementById('main-video-player');
  var loadingEl = document.getElementById('player-loading');
  var nowPlayingBar = document.getElementById('now-playing-bar');

  // Exit if the container doesn't exist on this page
  if (!container) return;

  // Detect if the page is loaded via file:// protocol
  var isFileProtocol = window.location.protocol === 'file:';
  // Utility to check if a string is a valid HTTP URL
  var isValidHttpUrl = function(str) { return /^https?:\/\/.+/.test(str); };
  // Resolve embed URL (dynamic for mock videos without embedUrl set)
  var resolvedEmbedUrl = getYouTubeEmbedUrl(video);
  // Check if the video has a valid embed URL (for external platforms)
  var isEmbedVideo = resolvedEmbedUrl && isValidHttpUrl(resolvedEmbedUrl);
  // Check if this is a YouTube embed
  var isYouTube = isEmbedVideo && resolvedEmbedUrl.indexOf('youtube.com/embed') !== -1;
  var isYouTubeEmbed = isYouTube && !isFileProtocol;

  // ─── SCENARIO 1: YOUTUBE EMBED (HTTP, uses IFrame API w/ custom controls) ───
  if (isYouTubeEmbed) {
    // Hide native video, show placeholder
    videoEl.style.display = 'none';
    embedPlaceholder.style.display = 'block';
    loadingEl.style.display = 'flex';

    // Show the custom player overlay so controls are visible
    var overlay = document.getElementById('player-overlay');
    if (overlay) {
      overlay.style.display = 'flex';
      requestAnimationFrame(function() { overlay.classList.add('visible'); });
    }

    // Show the native player controls (play/pause, seek, volume, etc.)
    embedPlaceholder.style.position = 'absolute';
    embedPlaceholder.style.inset = '0';

    loadYouTubeAPI(function() {
      var videoId = extractYouTubeId(resolvedEmbedUrl);
      if (!videoId) {
        loadingEl.style.display = 'none';
        return;
      }
      youtubePlayerInstance = new YT.Player('player-embed-placeholder', {
        height: '100%',
        width: '100%',
        videoId: videoId,
        playerVars: {
          controls: 0,
          rel: 0,
          modestbranding: 1,
          iv_load_policy: 3,
          fs: 0,
          playsinline: 1
        },
        events: {
          onReady: function(event) {
            loadingEl.style.display = 'none';
            var ytPlayer = event.target;
            // Play the video
            ytPlayer.playVideo();
            // Set up now-playing drawer
            setupNowPlayingDrawer(video, videoEl, handleLike);
            // Initialize quality selector
            setupQualitySelector(video, null, ytPlayer);
            // Set up YouTube-specific custom controls
            setupYouTubeControls(video, ytPlayer, loadingEl, onFirstPlay, handleLike);
            // Trigger view on first play
            var ytViewFired = false;
            var ytStateInterval = setInterval(function() {
              try {
                var state = ytPlayer.getPlayerState();
                if (state === YT.PlayerState.PLAYING && !ytViewFired && onFirstPlay) {
                  onFirstPlay();
                  ytViewFired = true;
                  clearInterval(ytStateInterval);
                }
              } catch(e) {}
            }, 500);
            // Update now-playing progress periodically
            var npInterval = setInterval(function() {
              try {
                var ytCur = ytPlayer.getCurrentTime();
                var ytDur = ytPlayer.getDuration();
                updateNowPlayingProgress(ytCur, ytDur);
              } catch(e) {}
            }, 250);
            // Cleanup on page unload
            window.addEventListener('beforeunload', function() {
              clearInterval(ytStateInterval);
              clearInterval(npInterval);
            }, { once: true });
          },
          onStateChange: function(event) {
            // Update play/pause icons based on YouTube player state
            var isPaused = event.data !== YT.PlayerState.PLAYING;
            updatePlayIconsForState(isPaused);
          },
          onError: function() {
            loadingEl.style.display = 'none';
            var errEl = document.getElementById('player-error');
            if (errEl) errEl.style.display = 'flex';
          }
        }
      });
    });
    // ─── SCENARIO 2: OTHER EMBED (HTTP, uses iframe) ───
  } else if (isEmbedVideo && !isFileProtocol) {
    // Hide the native video element
    videoEl.style.display = 'none';
    // Show the iframe placeholder
    embedPlaceholder.style.display = 'block';
    // Show the loading spinner
    loadingEl.style.display = 'flex';
    // Clear any previous content in the placeholder
    embedPlaceholder.innerHTML = '';

    var iframe = document.createElement('iframe');
    iframe.src = resolvedEmbedUrl;
    iframe.title = video.title || 'Video player';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.allowFullscreen = true;
    iframe.style.cssText = 'width:100%; height:100%; border:0;';
    iframe.addEventListener('load', function() { loadingEl.style.display = 'none'; });
    setTimeout(function() { loadingEl.style.display = 'none'; }, 5000);
    embedPlaceholder.appendChild(iframe);

    var viewObserver = new IntersectionObserver(function(entries) {
      if (entries[0].isIntersecting && onFirstPlay) { onFirstPlay(); viewObserver.disconnect(); }
    }, { threshold: 0.5 });
    viewObserver.observe(container);
    setupNowPlayingDrawer(video, videoEl, handleLike);

  // ─── SCENARIO 3: EMBED VIDEO (file:// protocol) ───
  } else if (isEmbedVideo && isFileProtocol) {
    // Hide the iframe placeholder initially
    embedPlaceholder.style.display = 'none';
    // Show the loading spinner while trying native playback
    loadingEl.style.display = 'flex';

    // Fallback UI for when native playback fails in file:// mode
    var showFileFallback = function() {
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
        '<a href="' + (video.videoUrl || resolvedEmbedUrl) + '" target="_blank" rel="noopener noreferrer" ' +
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
      // Initialize quality selector for file:// fallback
      setupQualitySelector(video, videoEl, null);
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
    // Initialize quality selector for native video
    setupQualitySelector(video, videoEl, null);

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
    if (e.key === ' ' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
      e.preventDefault();
      if (isYouTubeEmbed && youtubePlayerInstance) {
        var ytState = youtubePlayerInstance.getPlayerState();
        if (ytState === YT.PlayerState.PLAYING) { youtubePlayerInstance.pauseVideo(); }
        else { youtubePlayerInstance.playVideo(); }
      } else if (!isEmbedVideo && video.videoUrl) {
        if (videoEl.paused) { videoEl.play(); } else { videoEl.pause(); }
      }
    }
  }, { signal: ac.signal });

  window.addEventListener('beforeunload', () => ac.abort(), { once: true });
}

// ─── YOUTUBE CUSTOM CONTROLS ──────────────────────────────
/**
 * Sets up the custom player overlay controls for YouTube embeds,
 * bridging the YouTube IFrame Player API with the custom UI.
 */
function setupYouTubeControls(video, ytPlayer, loadingEl, onFirstPlay, handleLike) {
  var playBtn = document.getElementById('player-play-btn');
  var centerPlay = document.getElementById('player-center-play');
  var rewindBtn = document.getElementById('player-rewind-btn');
  var forwardBtn = document.getElementById('player-forward-btn');
  var timeCurrent = document.getElementById('player-time-current');
  var timeTotal = document.getElementById('player-time-total');
  var progressFill = document.getElementById('player-progress-fill');
  var progressThumb = document.getElementById('player-progress-thumb');
  var progressTrack = document.getElementById('player-progress-track');
  var progressBuffered = document.getElementById('player-progress-buffered');
  var muteBtn = document.getElementById('player-mute-btn');
  var volumeFill = document.getElementById('player-volume-fill');
  var volumeTrack = document.getElementById('player-volume-track');
  var speedBtn = document.getElementById('player-speed-btn');
  var speedMenu = document.getElementById('player-speed-menu');
  var theaterBtn = document.getElementById('player-theater-btn');
  var fullscreenBtn = document.getElementById('player-fullscreen-btn');
  var replayBtn = document.getElementById('player-replay-btn');
  var endScreen = document.getElementById('player-endscreen');
  var overlay = document.getElementById('player-overlay');
  var container = document.getElementById('player-container');
  var emojiBar = document.getElementById('player-emoji-bar');
  var progressEl = document.getElementById('player-progress');
  var preview = document.getElementById('player-preview');
  var previewTime = document.getElementById('player-preview-time');

  var controlsTimeout = null;
  var lastTapTime = 0;
  var viewFired = false;

  var showControls = function() {
    if (overlay) { overlay.classList.add('visible'); overlay.classList.remove('hide-cursor'); }
    clearTimeout(controlsTimeout);
    controlsTimeout = setTimeout(function() {
      if (overlay && ytPlayer && ytPlayer.getPlayerState && ytPlayer.getPlayerState() === YT.PlayerState.PLAYING) {
        overlay.classList.remove('visible');
        overlay.classList.add('hide-cursor');
      }
    }, 3000);
  };

  var showControlsOnce = function() {
    if (overlay) { overlay.classList.add('visible'); overlay.classList.remove('hide-cursor'); }
    clearTimeout(controlsTimeout);
  };

  if (overlay) {
    overlay.addEventListener('mousemove', showControls);
    overlay.addEventListener('touchstart', showControlsOnce, { passive: true });
    overlay.addEventListener('click', showControlsOnce);
  }

  var fmt = function(s) {
    if (isNaN(s)) return '0:00';
    var m = Math.floor(s / 60);
    var sec = Math.floor(s % 60);
    return m + ':' + (sec < 10 ? '0' : '') + sec;
  };

  // Poll YouTube player state and update UI
  var progressInterval = setInterval(function() {
    try {
      var cur = ytPlayer.getCurrentTime();
      var dur = ytPlayer.getDuration();
      var pct = dur > 0 ? (cur / dur) * 100 : 0;
      if (!isSeeking) {
        if (progressFill) progressFill.style.width = pct + '%';
        if (progressThumb) progressThumb.style.left = pct + '%';
      }
      if (timeCurrent) timeCurrent.innerText = fmt(cur);
      if (timeTotal) timeTotal.innerText = fmt(dur);

      // Trigger view count on first play
      if (ytPlayer.getPlayerState() === YT.PlayerState.PLAYING && !viewFired && onFirstPlay) {
        onFirstPlay();
        viewFired = true;
      }

      // Update buffered progress (YouTube doesn't expose this directly, approximate)
      if (progressBuffered) progressBuffered.style.width = Math.min(100, pct + 20) + '%';

      // Sync now-playing
      updateNowPlayingProgress(cur, dur);
    } catch(e) {}
  }, 250);

  // Play/pause toggle
  var togglePlay = function() {
    try {
      if (ytPlayer.getPlayerState() === YT.PlayerState.PLAYING) {
        ytPlayer.pauseVideo();
      } else {
        ytPlayer.playVideo();
      }
    } catch(e) {}
    showControlsOnce();
  };

  var updatePlayIcons = function() {
    try {
      var playing = ytPlayer.getPlayerState() === YT.PlayerState.PLAYING;
      var smallIcon = playing
        ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>'
        : '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="8,5 19,12 8,19"></polygon></svg>';
      var bigIcon = playing
        ? '<svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>'
        : '<svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor"><polygon points="8,5 19,12 8,19"></polygon></svg>';
      if (playBtn) playBtn.innerHTML = smallIcon;
      if (centerPlay) {
        centerPlay.innerHTML = bigIcon;
        centerPlay.classList.toggle('show', !playing);
      }
      if (!playing && overlay) {
        overlay.classList.add('visible');
        overlay.classList.remove('hide-cursor');
        clearTimeout(controlsTimeout);
      }
    } catch(e) {}
  };

  // Monitor YouTube state changes via polling
  var prevState = -1;
  var stateInterval = setInterval(function() {
    try {
      var state = ytPlayer.getPlayerState();
      if (state !== prevState) {
        prevState = state;
        updatePlayIcons();
        if (state === YT.PlayerState.ENDED) {
          if (endScreen) endScreen.style.display = 'flex';
        } else {
          if (endScreen) endScreen.style.display = 'none';
        }
        if (state === YT.PlayerState.BUFFERING && loadingEl) loadingEl.style.display = 'flex';
        else if (loadingEl) loadingEl.style.display = 'none';
      }
    } catch(e) {}
  }, 200);

  // Bind play/pause buttons
  if (playBtn) playBtn.addEventListener('click', togglePlay);
  if (centerPlay) centerPlay.addEventListener('click', togglePlay);

  // Seek relative
  var seekRelative = function(delta) {
    try {
      var newTime = Math.max(0, Math.min(ytPlayer.getDuration() || 0, ytPlayer.getCurrentTime() + delta));
      ytPlayer.seekTo(newTime, true);
      var seekIndicator = document.getElementById('player-seek-indicator');
      if (seekIndicator) {
        seekIndicator.style.display = 'flex';
        seekIndicator.className = 'player-seek-indicator ' + (delta < 0 ? 'seek-left' : 'seek-right');
        var arrow = delta < 0
          ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>'
          : '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>';
        seekIndicator.innerHTML = arrow + '<span>' + Math.abs(delta) + 's</span>';
        seekIndicator.style.animation = 'none';
        void seekIndicator.offsetWidth;
        seekIndicator.style.animation = 'playerSeekPop 0.4s var(--ease-spring) forwards';
        clearTimeout(seekIndicator._hide);
        seekIndicator._hide = setTimeout(function() { seekIndicator.style.display = 'none'; }, 800);
      }
    } catch(e) {}
    showControlsOnce();
  };

  if (rewindBtn) rewindBtn.addEventListener('click', function() { seekRelative(-10); });
  if (forwardBtn) forwardBtn.addEventListener('click', function() { seekRelative(10); });

  // ─── DOUBLE-TAP SEEK (MOBILE) ─────────────────
  var dtapLeft = document.getElementById('player-dtap-left');
  var dtapRight = document.getElementById('player-dtap-right');
  var tapSuppressDbl = false;

  var handleDblTap = function(side) {
    var now = Date.now();
    if (now - lastTapTime < 350) {
      tapSuppressDbl = true;
      seekRelative(side === 'left' ? -10 : 10);
      lastTapTime = 0;
      setTimeout(function() { tapSuppressDbl = false; }, 400);
    } else {
      lastTapTime = now;
    }
  };

  if (dtapLeft) dtapLeft.addEventListener('click', function(e) { e.stopPropagation(); handleDblTap('left'); });
  if (dtapRight) dtapRight.addEventListener('click', function(e) { e.stopPropagation(); handleDblTap('right'); });

  // Double-click on container toggles play/pause (skip if triggered by seek double-tap)
  if (container) container.addEventListener('dblclick', function(e) {
    if (tapSuppressDbl) { e.stopPropagation(); return; }
    togglePlay();
  });

  // ─── PROGRESS BAR SEEKING (with drag support for mobile) ────
  if (progressTrack) {
    var seekFromEvent = function(clientX) {
      try {
        var rect = progressTrack.getBoundingClientRect();
        var pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        var dur = ytPlayer.getDuration() || 0;
        ytPlayer.seekTo(pct * dur, true);
      } catch(e) {}
    };

    var isSeeking = false;

    var onMove = function(e) {
      isSeeking = true;
      var clientX = e.touches ? e.touches[0].clientX : e.clientX;
      var rect = progressTrack.getBoundingClientRect();
      var pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      if (progressFill) progressFill.style.width = pct + '%';
      if (progressThumb) progressThumb.style.left = pct + '%';
      try {
        var dur = ytPlayer.getDuration() || 0;
        if (previewTime) previewTime.innerText = fmt(pct * dur);
      } catch(e) {}
    };

    var onUp = function(e) {
      if (!isSeeking) return;
      isSeeking = false;
      var clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
      seekFromEvent(clientX);
      if (preview) preview.style.display = 'none';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
    };

    // Click to seek
    progressTrack.addEventListener('click', function(e) { seekFromEvent(e.clientX); });

    // Mouse drag
    progressTrack.addEventListener('mousedown', function(e) {
      isSeeking = true;
      if (preview) preview.style.display = 'block';
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });

    // Touch drag (mobile)
    progressTrack.addEventListener('touchstart', function() {
      isSeeking = true;
      if (preview) preview.style.display = 'block';
      document.addEventListener('touchmove', onMove);
      document.addEventListener('touchend', onUp);
    }, { passive: true });

    // Hover preview
    if (progressEl) {
      progressEl.addEventListener('mousemove', function(e) {
        if (isSeeking) return;
        var rect = progressTrack.getBoundingClientRect();
        var pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        if (preview) {
          preview.style.display = 'block';
          preview.style.left = (pct * 100) + '%';
        }
        try {
          var dur = ytPlayer.getDuration() || 0;
          if (previewTime) previewTime.innerText = fmt(pct * dur);
        } catch(e) {}
      });

      progressEl.addEventListener('mouseleave', function() {
        if (!isSeeking && preview) preview.style.display = 'none';
      });
    }
  }

  // Volume
  var updateVolumeUI = function() {
    try {
      var vol = ytPlayer.isMuted() ? 0 : (ytPlayer.getVolume() / 100);
      if (volumeFill) volumeFill.style.width = (vol * 100) + '%';
      if (muteBtn) {
        var isMuted = ytPlayer.isMuted() || vol === 0;
        muteBtn.innerHTML = isMuted
          ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>'
          : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>';
      }
    } catch(e) {}
  };

  if (muteBtn) {
    muteBtn.addEventListener('click', function() {
      try {
        if (ytPlayer.isMuted()) { ytPlayer.unMute(); } else { ytPlayer.mute(); }
      } catch(e) {}
      setTimeout(updateVolumeUI, 50);
    });
  }

  if (volumeTrack) {
    volumeTrack.addEventListener('click', function(e) {
      try {
        var rect = volumeTrack.getBoundingClientRect();
        var pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        ytPlayer.setVolume(pct * 100);
        ytPlayer.unMute();
      } catch(e) {}
      updateVolumeUI();
    });
  }
  // Update volume UI periodically
  setInterval(updateVolumeUI, 500);

  // Playback speed
  if (speedBtn) {
    speedBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      if (speedMenu) speedMenu.style.display = speedMenu.style.display === 'block' ? 'none' : 'block';
    });
    if (speedMenu) {
      speedMenu.addEventListener('click', function(e) {
        var btn = e.target.closest('button');
        if (!btn) return;
        var speed = parseFloat(btn.dataset.speed);
        try { ytPlayer.setPlaybackRate(speed); } catch(e) {}
        speedBtn.innerText = speed + 'x';
        speedMenu.querySelectorAll('button').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        speedMenu.style.display = 'none';
      });
    }
    document.addEventListener('click', function() { if (speedMenu) speedMenu.style.display = 'none'; });
  }

  // Theater mode
  if (theaterBtn && container) {
    theaterBtn.addEventListener('click', function() {
      container.classList.toggle('theater-mode');
      var isTheater = container.classList.contains('theater-mode');
      theaterBtn.innerHTML = isTheater
        ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>'
        : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>';
    });
  }

  // Fullscreen
  if (fullscreenBtn && container) {
    fullscreenBtn.addEventListener('click', function() {
      if (!document.fullscreenElement) {
        if (container.requestFullscreen) container.requestFullscreen();
        else if (container.webkitRequestFullscreen) container.webkitRequestFullscreen();
        container.classList.add('fullscreen-mode');
      } else {
        if (document.exitFullscreen) document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        container.classList.remove('fullscreen-mode');
      }
    });
  }

  // Replay
  if (replayBtn) {
    replayBtn.addEventListener('click', function() {
      try { ytPlayer.seekTo(0, true); ytPlayer.playVideo(); } catch(e) {}
      if (endScreen) endScreen.style.display = 'none';
    });
  }

  // ─── EMOJI REACTIONS ─────────────────
  if (emojiBar) {
    var EMOJI_KEY = 'emoji-reactions-' + video.id;
    var emojiCounts = {};

    var updateEmojiUI = function() {
      document.querySelectorAll('.emoji-btn').forEach(function(btn) {
        var emoji = btn.dataset.emoji;
        var count = emojiCounts[emoji] || 0;
        var countEl = btn.querySelector('.emoji-count');
        if (countEl) countEl.innerText = count || '0';
      });
    };
    updateEmojiUI();

    emojiBar.addEventListener('click', function(e) {
      var btn = e.target.closest('.emoji-btn');
      if (!btn) return;
      var emoji = btn.dataset.emoji;
      emojiCounts[emoji] = (emojiCounts[emoji] || 0) + 1;
      try { localStorage.setItem(EMOJI_KEY, JSON.stringify(emojiCounts)); } catch (_) {}
      updateEmojiUI();

      var float = document.createElement('div');
      float.className = 'emoji-float';
      float.innerText = emoji;
      var rect = btn.getBoundingClientRect();
      var containerRect = container.getBoundingClientRect();
      float.style.left = (rect.left - containerRect.left + rect.width / 2 - 14) + 'px';
      float.style.top = (rect.top - containerRect.top - 10) + 'px';
      container.appendChild(float);
      setTimeout(function() { float.remove(); }, 1200);
    });
  }

  // Cleanup on page unload
  window.addEventListener('beforeunload', function() {
    clearInterval(progressInterval);
    clearInterval(stateInterval);
  }, { once: true });

  // Hide the loading spinner
  if (loadingEl) loadingEl.style.display = 'none';
}

// ─── QUALITY SELECTOR ─────────────────────────────────────
var currentQuality = 'Auto';

function setupQualitySelector(video, videoEl, ytPlayer) {
  var qualityBtn = document.getElementById('player-quality-btn');
  var qualityMenu = document.getElementById('player-quality-menu');
  if (!qualityBtn || !qualityMenu) return;

  var sources = getVideoSources(video);
  if (sources.length <= 1 && !ytPlayer) {
    qualityBtn.style.display = 'none';
    return;
  }
  qualityBtn.style.display = '';

  // Populate menu from available sources
  var availableLabels = [];
  var sourceMap = {};
  for (var i = 0; i < sources.length; i++) {
    var q = sources[i].quality;
    availableLabels.push(q);
    sourceMap[q] = sources[i].url;
  }
  // Add YouTube quality options when using YouTube player
  if (ytPlayer) {
    var ytLabels = ['1080p','720p','480p','360p','144p','Auto'];
    availableLabels = ytLabels;
  }

  qualityMenu.innerHTML = '';
  for (var j = 0; j < availableLabels.length; j++) {
    var label = availableLabels[j];
    var btn = document.createElement('button');
    btn.dataset.quality = label;
    btn.textContent = label;
    if (label === currentQuality || (currentQuality === 'Auto' && label === '360p')) {
      btn.classList.add('active');
    }
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      var q = this.dataset.quality;
      currentQuality = q;
      qualityBtn.textContent = q;
      qualityMenu.querySelectorAll('button').forEach(function(b) { b.classList.remove('active'); });
      this.classList.add('active');
      qualityMenu.style.display = 'none';

      // Apply quality
      if (ytPlayer) {
        try {
          var ytQ = QUALITY_YT_MAP[q] || 'default';
          ytPlayer.setPlaybackQuality(ytQ);
        } catch(e) {}
      } else if (videoEl) {
        var url = sourceMap[q];
        if (url) {
          var wasPaused = videoEl.paused;
          var curTime = videoEl.currentTime;
          videoEl.src = url;
          videoEl.load();
          videoEl.currentTime = curTime;
          if (!wasPaused) videoEl.play();
        }
      }
    });
    qualityMenu.appendChild(btn);
  }

  // Set initial quality label
  if (!currentQuality || currentQuality === 'Auto') {
    var def = getDefaultQuality(sources);
    currentQuality = def;
    qualityBtn.textContent = def;
    var activeItem = qualityMenu.querySelector('button[data-quality="' + def + '"]');
    if (activeItem) activeItem.classList.add('active');
  }

  // Toggle menu
  qualityBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    qualityMenu.style.display = qualityMenu.style.display === 'block' ? 'none' : 'block';
  });

  document.addEventListener('click', function() {
    qualityMenu.style.display = 'none';
  });
}

// ─── NOW-PLAYING PROGRESS SYNC ────────────────────────────
function updateNowPlayingProgress(currentTime, duration) {
  var npFill = document.getElementById('np-progress-fill');
  var npTimeCur = document.getElementById('np-time-current');
  var npTimeTotal = document.getElementById('np-time-total');
  var fmt = function(s) {
    if (isNaN(s)) return '0:00';
    var m = Math.floor(s / 60);
    var sec = Math.floor(s % 60);
    return m + ':' + (sec < 10 ? '0' : '') + sec;
  };
  if (npFill) {
    var pct = duration > 0 ? (currentTime / duration) * 100 : 0;
    npFill.style.width = pct + '%';
  }
  if (npTimeCur) npTimeCur.innerText = fmt(currentTime);
  if (npTimeTotal) npTimeTotal.innerText = fmt(duration);
}

// ─── UPDATE PLAY ICONS FOR YOUTUBE STATE ──────────────────
function updatePlayIconsForState(isPaused) {
  var playBtn = document.getElementById('player-play-btn');
  var centerPlay = document.getElementById('player-center-play');
  var smallIcon = isPaused
    ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="8,5 19,12 8,19"></polygon></svg>'
    : '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>';
  var bigIcon = isPaused
    ? '<svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor"><polygon points="8,5 19,12 8,19"></polygon></svg>'
    : '<svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>';
  if (playBtn) playBtn.innerHTML = smallIcon;
  if (centerPlay) {
    centerPlay.innerHTML = bigIcon;
    centerPlay.classList.toggle('show', isPaused);
  }
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
  // Double-click on the video container also toggles play/pause (skip if seek double-tap)
  container.addEventListener('dblclick', (e) => {
    if (tapSuppressDbl) { e.stopPropagation(); return; }
    togglePlay();
  });

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

  let tapSuppressDbl = false;

  const handleDblTap = (side) => {
    const now = Date.now();
    if (now - lastTapTime < 350) {
      tapSuppressDbl = true;
      seekRelative(side === 'left' ? -10 : 10);
      lastTapTime = 0;
      setTimeout(() => { tapSuppressDbl = false; }, 400);
    } else {
      lastTapTime = now;
    }
  };

  // Bind double-tap zones
  if (dtapLeft) dtapLeft.addEventListener('click', (e) => { e.stopPropagation(); handleDblTap('left'); });
  if (dtapRight) dtapRight.addEventListener('click', (e) => { e.stopPropagation(); handleDblTap('right'); });

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
