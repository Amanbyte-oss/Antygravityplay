// ─── HTML ESCAPE UTILITY (local copy) ───
/**
 * Escapes special HTML characters to prevent XSS attacks.
 * This local copy is used by setupHeroBanner within this file.
 * @param {*} str - The string to escape
 * @returns {string} The escaped string safe for innerHTML
 */
function escapeHtml(str) {
  // Convert non-strings to their string representation
  if (typeof str !== 'string') return String(str || '');
  // Mapping of unsafe characters to their HTML entities
  const map = { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' };
  // Replace each unsafe character using the map
  return str.replace(/[&<>"']/g, ch => map[ch]);
}

// ─── HOME PAGE LOGIC ───
document.addEventListener('DOMContentLoaded', () => {
  window.Components.injectNavbar('home');
  window.Components.injectFooter();
  renderHomePage();
  document.addEventListener('supabase-active', renderHomePage);
});

function renderHomePage() {
  const allVideos = window.App.getVideos().filter(v => v.status === 'published');
  
  if (allVideos.length === 0) {
    const mainContainer = document.querySelector('main');
    if (!mainContainer) return;
    if (window.__supabase && !window.SUPABASE_SYNCED) {
      mainContainer.innerHTML = '<div class="loading-state" style="text-align:center;padding:80px 20px;"><div class="spinner" style="width:40px;height:40px;border:3px solid var(--bg-tertiary);border-top-color:var(--accent);border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 16px;"></div><p style="color:var(--text-muted);">Loading videos\u2026</p></div>';
      return;
    }
    mainContainer.innerHTML = window.Components.renderEmptyState('No published videos found.');
    return;
  }

  // ─── TAG COLOR HELPER ───
  function tagColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) { hash = str.charCodeAt(i) + ((hash << 5) - hash); }
    var colors = ['#0070f3','#7928ca','#ff0080','#ffa42b','#50e3c2','#539df5','#1db954','#f3727f','#e91e63','#ff5722','#9c27b0','#00bcd4','#ff9800','#4caf50','#f44336','#3f51b5'];
    return colors[Math.abs(hash) % colors.length];
  }

  // ─── 3. EXTRACT UNIQUE TAGS FROM VIDEOS ───
  var allTagStrings = [];
  var tagCounts = {};
  allVideos.forEach(function(v) {
    (v.tags || []).forEach(function(t) {
      if (tagCounts[t]) { tagCounts[t]++; } else { tagCounts[t] = 1; }
      if (allTagStrings.indexOf(t) === -1) allTagStrings.push(t);
    });
  });
  allTagStrings.sort();

  // ─── 4. RENDER HERO BANNER ───
  const heroVideo = allVideos.reduce((max, v) => v.views > max.views ? v : max, allVideos[0]);
  setupHeroBanner(heroVideo, tagColor);

  // ─── 5. POPULATE TAG FILTER BAR ───
  var filterBar = document.getElementById('tag-filter-bar');
  var filterTag = '';
  if (filterBar) {
    allTagStrings.forEach(function(t) {
      var btn = document.createElement('button');
      btn.className = 'tag-filter-pill';
      btn.dataset.tag = t;
      btn.textContent = t;
      filterBar.appendChild(btn);
    });
    filterBar.addEventListener('click', function(e) {
      var btn = e.target.closest('.tag-filter-pill');
      if (!btn) return;
      filterBar.querySelectorAll('.tag-filter-pill').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      filterTag = btn.dataset.tag;
      renderSections(allVideos, filterTag);
    });
  }

  // ─── 6. RENDER POPULAR TAGS ───
  var popularTagsContainer = document.getElementById('popular-tags-container');
  if (popularTagsContainer) {
    var sortedByCount = allTagStrings.slice().sort(function(a, b) { return (tagCounts[b] || 0) - (tagCounts[a] || 0); });
    popularTagsContainer.innerHTML = sortedByCount.map(function(t) {
      var count = tagCounts[t] || 0;
      var c = tagColor(t);
      return '<a href="./tag.html?tag=' + encodeURIComponent(t) + '" class="tag-pill tag-pill-lg" style="border-left:4px solid ' + c + ';background-color:' + c + '15;"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background-color:' + c + ';margin-right:6px;"></span>' + escapeHtml(t) + '<span style="font-size:var(--text-xs);opacity:0.7;margin-left:6px;">(' + count + ')</span></a>';
    }).join('');
  }

  // ─── 7. RENDER BROWSE BY TAG GRID ───
  var browseTagGrid = document.getElementById('browse-tag-grid');
  if (browseTagGrid) {
    browseTagGrid.innerHTML = allTagStrings.map(function(t, i) {
      var count = tagCounts[t] || 0;
      var c = tagColor(t);
      return '<a href="./tag.html?tag=' + encodeURIComponent(t) + '" class="tag-pill tag-pill-lg reveal-on-scroll" style="border-left:4px solid ' + c + ';background-color:' + c + '15;transition-delay:' + (i * 0.05) + 's;"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background-color:' + c + ';margin-right:6px;"></span>' + escapeHtml(t) + '<span style="font-size:var(--text-xs);opacity:0.7;margin-left:6px;">(' + count + ')</span></a>';
    }).join('');
  }

  // ─── 8. RENDER SECTIONS (trending + new releases) ───
  function renderSections(videos, tag) {
    var filtered = tag ? videos.filter(function(v) { return (v.tags || []).indexOf(tag) !== -1; }) : videos;

    var trendingContainer = document.getElementById('trending-container');
    if (trendingContainer) {
      var trending = [...filtered].sort(function(a, b) { return b.views - a.views; }).slice(0, 8);
      trendingContainer.innerHTML = trending.map(function(v) { return window.Components.renderVideoCard(v); }).join('');
    }

    var newReleasesContainer = document.getElementById('new-releases-container');
    if (newReleasesContainer) {
      var newest = [...filtered].reverse().slice(0, 8);
      newReleasesContainer.innerHTML = newest.map(function(v) { return window.Components.renderVideoCard(v); }).join('');
    }
  }
  renderSections(allVideos, filterTag);

  // ─── 8. RE-TRIGGER ANIMATIONS AND LAZY LOADS ───
  // Initialize scroll reveal for any newly added .reveal-on-scroll elements
  window.Animations.initScrollReveal();
  // Refresh lazy loading observation for new images
  if (window.refreshLazyLoading) window.refreshLazyLoading();
}

// ─── HERO BANNER SETUP ───
/**
 * Creates the hero banner HTML for a given video and binds the like button.
 * The hero banner displays the video's first tag as a badge, title, description,
 * a "Watch Now" link, and a like button with state management.
 * @param {Object} video - The video object to feature in the hero
 */
function setupHeroBanner(video, tagColor) {
  // Find the hero section container in the DOM
  const heroSection = document.getElementById('hero-section');
  // Exit if the container doesn't exist on this page
  if (!heroSection) return;

  // Use the first tag string directly
  var tags = video.tags || [];
  var badgeText = tags.length > 0 ? tags[0] : 'Featured';
  var badgeColor = tags.length > 0 ? tagColor(tags[0]) : 'var(--accent)';

  // Escape user-generated content for safe HTML insertion
  const safeTitle = escapeHtml(video.title);
  const safeDesc = escapeHtml(video.description);
  const safeBadge = escapeHtml(badgeText);

  // ─── Inject Hero Banner HTML ───
  heroSection.innerHTML = `
    <div class="hero-banner">
      <div class="hero-content">
        <span class="hero-tag" style="background-color:${badgeColor}18;color:${badgeColor};">${safeBadge}</span>
        <h1 class="hero-title">${safeTitle}</h1>
        <p class="hero-desc">${safeDesc}</p>
        <div class="hero-btns">
          <!-- Watch Now button linking to the video's watch page -->
          <a href="./watch.html?id=${video.id}" class="btn btn-primary">
            <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24" style="margin-right:4px;">
              <polygon points="8,5 19,12 8,19"></polygon>
            </svg>
            Watch Now
          </a>
          <!-- Like/Unlike toggle button -->
          <button class="btn btn-secondary" id="hero-like-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px;">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
            <span id="hero-like-text">Like</span>
          </button>
        </div>
      </div>
    </div>
  `;

  // ─── BIND HERO LIKE BUTTON ───
  // Get references to the like button and its text label
  const likeBtn = document.getElementById('hero-like-btn');
  const likeText = document.getElementById('hero-like-text');
  
  // Only proceed if both elements exist in the DOM
  if (likeBtn && likeText) {

    // Updates the visual appearance of the like button based on current state
    const updateBtnState = () => {
      // Check if this video is currently liked
      const isLiked = window.App.isVideoLiked(video.id);
      if (isLiked) {
        // Set filled heart with pink color
        likeBtn.style.color = '#f3727f';
        likeBtn.querySelector('svg').style.fill = '#f3727f';
        likeBtn.querySelector('svg').style.stroke = '#f3727f';
        likeText.innerText = 'Liked';
      } else {
        // Set outline heart with default color
        likeBtn.style.color = '';
        likeBtn.querySelector('svg').style.fill = 'none';
        likeBtn.querySelector('svg').style.stroke = 'currentColor';
        likeText.innerText = 'Like';
      }
    };

    // Initial render of the like button state
    updateBtnState();

    // Bind click event to toggle like state
    likeBtn.addEventListener('click', (e) => {
      // Prevent default button behavior
      e.preventDefault();
      // Toggle the like state and get the new state
      const isNowLiked = window.App.toggleLikeVideo(video.id);
      // Update the visual state
      updateBtnState();
      // Trigger the heart-beat animation
      window.Animations.animateLike(likeBtn);
      // Show a toast notification with the result
      window.App.showToast(isNowLiked ? 'Added to liked videos' : 'Removed from liked videos');
    });
  }
}
