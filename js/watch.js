// Watch page logic
document.addEventListener('DOMContentLoaded', () => {
  // 1. Inject Navbar & Footer
  window.Components.injectNavbar();
  window.Components.injectFooter();

  // 2. Parse Video ID from query parameter
  const params = window.App.getQueryParams();
  const videoId = params.id;

  if (!videoId) {
    renderErrorView('Invalid Video Reference.');
    return;
  }

  // 3. Retrieve video data
  const dbVideos = window.App.getVideos();
  const videoIndex = dbVideos.findIndex(v => v.id === videoId);
  const video = dbVideos[videoIndex];

  if (!video) {
    renderErrorView('The video you are looking for does not exist.');
    return;
  }

  // Increment views once on play
  let viewIncremented = false;

  // Shared like handler for both main and now-playing buttons
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

  // 4. Setup player and details
  setupVideoPlayer(video, () => {
    if (!viewIncremented) {
      dbVideos[videoIndex].views += 1;
      window.App.saveVideos(dbVideos);
      viewIncremented = true;
      // Refresh views counter on screen
      const viewsEl = document.getElementById('watch-views-count');
      if (viewsEl) {
        viewsEl.innerText = Number(dbVideos[videoIndex].views).toLocaleString();
      }
    }
  }, handleLike);

  setupVideoDetails(video, handleLike);
  setupRelatedSidebar(video, dbVideos);

  // 5. Initialize scroll reveals
  window.Animations.initScrollReveal();
});

// Setup Video Player events and hooks
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
    setTimeout(() => { loadingEl.style.display = 'none'; }, 8000);

    embedPlaceholder.appendChild(iframe);

    // For embed videos, count view on visibility (user sees the embed)
    const viewObserver = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && onFirstPlay) {
        onFirstPlay();
        viewObserver.disconnect();
      }
    }, { threshold: 0.5 });
    viewObserver.observe(container);

    // Setup now-playing drawer with embed-aware mode
    setupNowPlayingDrawer(video, videoEl, handleLike);
  } else if (isEmbedVideo && isFileProtocol) {
    videoEl.style.display = 'none';
    embedPlaceholder.style.display = 'flex';
    embedPlaceholder.style.flexDirection = 'column';
    embedPlaceholder.style.alignItems = 'center';
    embedPlaceholder.style.justifyContent = 'center';
    embedPlaceholder.style.gap = 'var(--space-md)';
    loadingEl.style.display = 'none';
    embedPlaceholder.innerHTML = `
      <svg width="48" height="48" fill="none" stroke="var(--text-muted)" stroke-width="1.5" viewBox="0 0 24 24">
        <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
        <line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line>
        <line x1="2" y1="12" x2="22" y2="12"></line>
      </svg>
      <p style="color:var(--text-muted); font-size:var(--text-sm); text-align:center; max-width:360px;">
        This page is opened from a local file — embedded video playback is not supported in this mode.
        <br><br>
        <a href="${video.videoUrl || video.embedUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block; padding:8px 20px; background:var(--accent); color:#fff; border-radius:var(--radius-full); text-decoration:none; font-weight:600; font-size:var(--text-sm);">
          Open in ${video.platformLabel || 'Platform'} ↗
        </a>
      </p>
    `;
    // For embed videos, count view on visibility (user sees the fallback message with link)
    const viewObserver = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && onFirstPlay) {
        onFirstPlay();
        viewObserver.disconnect();
      }
    }, { threshold: 0.5 });
    viewObserver.observe(container);

    setupNowPlayingDrawer(video, videoEl, handleLike);
  } else {
    embedPlaceholder.style.display = 'none';
    loadingEl.style.display = 'none';
    videoEl.style.display = 'block';

    if (video.videoUrl) {
      videoEl.src = video.videoUrl;
      videoEl.load();
    }

    // Setup bottom Now Playing drawer content
    setupNowPlayingDrawer(video, videoEl, handleLike);

    // Play listener for views tracker
    videoEl.addEventListener('play', () => {
      if (onFirstPlay) onFirstPlay();
      if (nowPlayingBar) nowPlayingBar.classList.add('active');
    });

    // Show fallback if native video has no source
    if (!video.videoUrl) {
      videoEl.style.display = 'none';
      embedPlaceholder.style.display = 'flex';
      embedPlaceholder.style.alignItems = 'center';
      embedPlaceholder.style.justifyContent = 'center';
      embedPlaceholder.style.flexDirection = 'column';
      embedPlaceholder.style.gap = 'var(--space-md)';
      embedPlaceholder.innerHTML = `
        <svg width="48" height="48" fill="none" stroke="var(--text-muted)" stroke-width="1.5" viewBox="0 0 24 24">
          <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line>
        </svg>
        <p style="color:var(--text-muted); font-size:var(--text-sm); text-align:center;">This video source is not available for playback.</p>
      `;
    }
  }

  // Spacebar play/pause keybinding (only for native video)
  document.addEventListener('keydown', (e) => {
    if (e.key === ' ' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
      e.preventDefault();
      if (!isEmbedVideo && video.videoUrl) {
        if (videoEl.paused) { videoEl.play(); } else { videoEl.pause(); }
      }
    }
  });
}

// Setup Details section
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

  // Load tags
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

// Related Sidebar Builder
function setupRelatedSidebar(currentVideo, allVideos) {
  const sidebarContainer = document.getElementById('related-videos-container');
  if (!sidebarContainer) return;

  // Filter related by tag overlap, excluding active video
  const relatedVideos = allVideos
    .filter(v => v.id !== currentVideo.id && v.status === 'published')
    .sort((a, b) => {
      // Count overlapping tags with current video
      const aOverlap = a.tags.filter(t => currentVideo.tags.includes(t)).length;
      const bOverlap = b.tags.filter(t => currentVideo.tags.includes(t)).length;
      if (aOverlap !== bOverlap) return bOverlap - aOverlap;
      return b.views - a.views;
    })
    .slice(0, 6);

  if (relatedVideos.length === 0) {
    sidebarContainer.innerHTML = '<p style="font-size: var(--text-sm); color: var(--text-muted);">No related videos.</p>';
    return;
  }

  sidebarContainer.innerHTML = relatedVideos.map(vid => `
    <div class="related-card" data-href="./watch.html?id=${encodeURIComponent(vid.id)}" role="button" tabindex="0">
      <div class="related-thumb">
        <img src="${vid.thumbnail}" alt="${vid.title} Thumbnail">
        <span class="duration-badge" style="font-size: 10px; padding: 1px 4px;">${vid.duration}</span>
      </div>
      <div class="related-info">
        <h4 class="related-title">${vid.title}</h4>
        <div class="related-meta">
          <div>${vid.creator}</div>
          <div>${Number(vid.views).toLocaleString()} views</div>
        </div>
      </div>
    </div>
  `).join('');
}

// Setup Bottom Now Playing drawer (Spotify style)
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

  // Load details
  if (npThumb) npThumb.src = video.thumbnail;
  if (npTitle) npTitle.innerText = video.title;
  if (npCreator) npCreator.innerText = video.creator;

  // Sync heart button
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
    // Embed videos: hide native controls, show simplified drawer
    const ctrl = document.getElementById('np-player-controls');
    const prog = document.getElementById('np-progress-container');
    const vol = document.getElementById('np-volume-container');
    if (ctrl) ctrl.style.display = 'none';
    if (prog) prog.style.display = 'none';
    if (vol) vol.style.display = 'none';
    return;
  }

  // Native video: full controls
  // Play / Pause button toggle
  const updatePlayBtnIcon = () => {
    if (videoEl.paused) {
      npPlayBtn.innerHTML = `
        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
          <polygon points="8,5 19,12 8,19"></polygon>
        </svg>
      `;
    } else {
      npPlayBtn.innerHTML = `
        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
          <rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>
        </svg>
      `;
    }
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
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  videoEl.addEventListener('timeupdate', () => {
    const cur = videoEl.currentTime;
    const dur = videoEl.duration || 0;
    const pct = dur > 0 ? (cur / dur) * 100 : 0;
    if (npProgressFill) npProgressFill.style.width = `${pct}%`;
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
    if (npVolumeFill) npVolumeFill.style.width = `${isMuted ? 0 : vol * 100}%`;
    if (npMuteBtn) {
      npMuteBtn.innerHTML = isMuted
        ? `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>`
        : `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`;
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

// Error state display
function renderErrorView(message) {
  const watchGrid = document.querySelector('.watch-grid');
  if (watchGrid) {
    watchGrid.innerHTML = window.Components.renderErrorState(message);
  }
}
