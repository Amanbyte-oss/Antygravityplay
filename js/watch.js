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
  });

  setupVideoDetails(video);
  setupRelatedSidebar(video, dbVideos);

  // 5. Initialize scroll reveals
  window.Animations.initScrollReveal();
});

// Setup Video Player events and hooks
function setupVideoPlayer(video, onFirstPlay) {
  const videoEl = document.getElementById('main-video-player');
  const nowPlayingBar = document.getElementById('now-playing-bar');
  
  if (!videoEl) return;

  videoEl.src = video.videoUrl;
  videoEl.load();

  // Setup bottom Now Playing drawer content
  setupNowPlayingDrawer(video, videoEl);

  // Play listener for views tracker
  videoEl.addEventListener('play', () => {
    if (onFirstPlay) onFirstPlay();
    if (nowPlayingBar) nowPlayingBar.classList.add('active');
  });

  // Spacebar play/pause keybinding
  document.addEventListener('keydown', (e) => {
    if (e.key === ' ' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
      e.preventDefault();
      if (videoEl.paused) {
        videoEl.play();
      } else {
        videoEl.pause();
      }
    }
  });
}

// Setup Details section
function setupVideoDetails(video) {
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

  // Like system configuration
  if (likeBtn && likeCountEl) {
    let initialLikes = video.likes;
    
    const renderLikeState = () => {
      const isLiked = window.App.isVideoLiked(video.id);
      likeCountEl.innerText = isLiked ? (initialLikes + 1).toLocaleString() : initialLikes.toLocaleString();
      if (isLiked) {
        likeBtn.classList.add('liked');
      } else {
        likeBtn.classList.remove('liked');
      }
    };

    renderLikeState();

    likeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const isNowLiked = window.App.toggleLikeVideo(video.id);
      window.Animations.animateLike(likeBtn);
      
      // Save likes count back to DB
      const dbVideos = window.App.getVideos();
      const index = dbVideos.findIndex(v => v.id === video.id);
      if (index !== -1) {
        dbVideos[index].likes = isNowLiked ? dbVideos[index].likes + 1 : dbVideos[index].likes - 1;
        initialLikes = dbVideos[index].likes;
        if (isNowLiked) initialLikes -= 1; // offset calculation
        window.App.saveVideos(dbVideos);
      }

      renderLikeState();
      window.App.showToast(isNowLiked ? 'Video added to likes' : 'Video removed from likes');
      
      // Update now playing left heart if visible
      const npHeart = document.getElementById('np-heart');
      if (npHeart) {
        if (isNowLiked) {
          npHeart.classList.add('liked');
        } else {
          npHeart.classList.remove('liked');
        }
      }
    });
  }
}

// Related Sidebar Builder
function setupRelatedSidebar(currentVideo, allVideos) {
  const sidebarContainer = document.getElementById('related-videos-container');
  if (!sidebarContainer) return;

  // Filter and show videos within same category, excluding active video
  const relatedVideos = allVideos
    .filter(v => v.id !== currentVideo.id && v.status === 'published')
    .sort((a, b) => {
      // Prioritize same category
      if (a.category === currentVideo.category && b.category !== currentVideo.category) return -1;
      if (b.category === currentVideo.category && a.category !== currentVideo.category) return 1;
      return b.views - a.views;
    })
    .slice(0, 6);

  if (relatedVideos.length === 0) {
    sidebarContainer.innerHTML = '<p style="font-size: var(--text-sm); color: var(--text-muted);">No related videos.</p>';
    return;
  }

  sidebarContainer.innerHTML = relatedVideos.map(vid => `
    <div class="related-card" onclick="window.location.href='./watch.html?id=${vid.id}'" role="button" tabindex="0">
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
function setupNowPlayingDrawer(video, videoEl) {
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

  // Load details
  if (npThumb) npThumb.src = video.thumbnail;
  if (npTitle) npTitle.innerText = video.title;
  if (npCreator) npCreator.innerText = video.creator;

  // Sync heart button
  if (npHeart) {
    const isLiked = window.App.isVideoLiked(video.id);
    if (isLiked) {
      npHeart.classList.add('liked');
    } else {
      npHeart.classList.remove('liked');
    }

    npHeart.addEventListener('click', (e) => {
      e.stopPropagation();
      const isNowLiked = window.App.toggleLikeVideo(video.id);
      
      const dbVideos = window.App.getVideos();
      const index = dbVideos.findIndex(v => v.id === video.id);
      if (index !== -1) {
        dbVideos[index].likes = isNowLiked ? dbVideos[index].likes + 1 : dbVideos[index].likes - 1;
        window.App.saveVideos(dbVideos);
      }

      // Sync elements
      const mainLikeBtn = document.getElementById('watch-like-btn');
      const mainLikeCount = document.getElementById('watch-like-count');
      if (mainLikeBtn && mainLikeCount) {
        mainLikeCount.innerText = dbVideos[index].likes.toLocaleString();
        if (isNowLiked) {
          mainLikeBtn.classList.add('liked');
          npHeart.classList.add('liked');
        } else {
          mainLikeBtn.classList.remove('liked');
          npHeart.classList.remove('liked');
        }
      }
      
      window.App.showToast(isNowLiked ? 'Video added to likes' : 'Video removed from likes');
    });
  }

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
    if (videoEl.paused) {
      videoEl.play();
    } else {
      videoEl.pause();
    }
  });

  // Time & Progress Updates
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

  // Seek bar click tracking
  if (npProgressTrack) {
    npProgressTrack.addEventListener('click', (e) => {
      const rect = npProgressTrack.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const pct = clickX / rect.width;
      videoEl.currentTime = pct * (videoEl.duration || 0);
    });
  }

  // Volume slider events
  let lastVolume = videoEl.volume;
  videoEl.addEventListener('volumechange', () => {
    const vol = videoEl.volume;
    const isMuted = videoEl.muted || vol === 0;
    
    if (npVolumeFill) npVolumeFill.style.width = `${isMuted ? 0 : vol * 100}%`;
    
    if (npMuteBtn) {
      if (isMuted) {
        npMuteBtn.innerHTML = `
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
            <line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line>
          </svg>
        `;
      } else {
        npMuteBtn.innerHTML = `
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
          </svg>
        `;
      }
    }
  });

  if (npVolumeTrack) {
    npVolumeTrack.addEventListener('click', (e) => {
      const rect = npVolumeTrack.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      let pct = clickX / rect.width;
      if (pct < 0) pct = 0;
      if (pct > 1) pct = 1;
      
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
