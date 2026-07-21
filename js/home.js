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
// This script runs after DOMContentLoaded to build the home page:
// injects navbar/footer, loads published videos, renders hero banner,
// popular tags, browse-by-tag grid, trending now, and new releases sections.
document.addEventListener('DOMContentLoaded', () => {

  // ─── 1. INJECT NAVBAR & FOOTER ───
  // Inject the public navbar with 'home' as the active page
  window.Components.injectNavbar('home');
  // Inject the page footer
  window.Components.injectFooter();

  // ─── 2. LOAD PUBLISHED VIDEOS ───
  // Retrieve all videos from the database and filter for published status only
  const allVideos = window.App.getVideos().filter(v => v.status === 'published');
  
  // If there are no published videos, show an empty state and stop
  if (allVideos.length === 0) {
    // Find the main content container
    const mainContainer = document.querySelector('main');
    if (mainContainer) {
      // Replace main content with the empty state component
      mainContainer.innerHTML = window.Components.renderEmptyState('No published videos found.');
    }
    return;
  }

  // ─── 3. RENDER HERO BANNER ───
  // Find the video with the highest view count to feature in the hero banner
  const heroVideo = allVideos.reduce((max, v) => v.views > max.views ? v : max, allVideos[0]);
  // Setup the hero banner with the most viewed video
  setupHeroBanner(heroVideo);

  // ─── 4. RENDER POPULAR TAGS ───
  // Display tags sorted by how many published videos use each tag
  const popularTagsContainer = document.getElementById('popular-tags-container');
  if (popularTagsContainer) {
    // Get all available tags
    const tags = window.App.getTags();
    // Count how many published videos use each tag
    const tagCounts = {};
    allVideos.forEach(v => (v.tags || []).forEach(tId => { tagCounts[tId] = (tagCounts[tId] || 0) + 1; }));
    // Sort tags by count descending
    const sortedTags = [...tags].sort((a, b) => (tagCounts[b.id] || 0) - (tagCounts[a.id] || 0));
    // Render each tag as a clickable pill with color, name, and count
    popularTagsContainer.innerHTML = sortedTags.map(tag => 
      `<a href="./tag.html?tag=${encodeURIComponent(tag.name)}" class="tag-pill tag-pill-lg" style="border-left: 4px solid ${tag.color}; background-color: ${tag.color}15;">
        <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background-color:${tag.color}; margin-right:6px;"></span>
        ${tag.name}
        <span style="font-size:var(--text-xs); opacity:0.7; margin-left:6px;">(${tagCounts[tag.id] || 0})</span>
      </a>`
    ).join('');
  }

  // ─── 5. RENDER BROWSE BY TAG GRID ───
  // Display all tags with staggered entrance animation (reveal-on-scroll)
  const browseTagGrid = document.getElementById('browse-tag-grid');
  if (browseTagGrid) {
    const tags = window.App.getTags();
    // Count videos per tag again
    const tagCounts = {};
    allVideos.forEach(v => (v.tags || []).forEach(tId => { tagCounts[tId] = (tagCounts[tId] || 0) + 1; }));
    // Render tags with scroll-reveal class and staggered transition-delay
    browseTagGrid.innerHTML = tags.map((tag, i) => 
      `<a href="./tag.html?tag=${encodeURIComponent(tag.name)}" class="tag-pill tag-pill-lg reveal-on-scroll" style="border-left: 4px solid ${tag.color}; background-color: ${tag.color}15; transition-delay: ${i * 0.05}s;">
        <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background-color:${tag.color}; margin-right:6px;"></span>
        ${tag.name}
        <span style="font-size:var(--text-xs); opacity:0.7; margin-left:6px;">(${tagCounts[tag.id] || 0})</span>
      </a>`
    ).join('');
  }

  // ─── 6. RENDER "TRENDING NOW" ───
  // Show the top 8 most-viewed videos
  const trendingContainer = document.getElementById('trending-container');
  if (trendingContainer) {
    // Sort by views descending and take the top 8
    const trendingVideos = [...allVideos].sort((a, b) => b.views - a.views).slice(0, 8);
    // Render each video using the reusable video card component
    trendingContainer.innerHTML = trendingVideos.map(vid => 
      window.Components.renderVideoCard(vid)
    ).join('');
  }

  // ─── 7. RENDER "NEW RELEASES" ───
  // Show the last 8 videos by publish date (most recent first)
  const newReleasesContainer = document.getElementById('new-releases-container');
  if (newReleasesContainer) {
    // Reverse the array (which roughly orders by oldest first, so reverse gives newest first) and take 8
    const newVideos = [...allVideos].reverse().slice(0, 8);
    newReleasesContainer.innerHTML = newVideos.map(vid => 
      window.Components.renderVideoCard(vid)
    ).join('');
  }

  // ─── 8. RE-TRIGGER ANIMATIONS AND LAZY LOADS ───
  // Initialize scroll reveal for any newly added .reveal-on-scroll elements
  window.Animations.initScrollReveal();
  // Refresh lazy loading observation for new images
  if (window.refreshLazyLoading) window.refreshLazyLoading();
});

// ─── HERO BANNER SETUP ───
/**
 * Creates the hero banner HTML for a given video and binds the like button.
 * The hero banner displays the video's first tag as a badge, title, description,
 * a "Watch Now" link, and a like button with state management.
 * @param {Object} video - The video object to feature in the hero
 */
function setupHeroBanner(video) {
  // Find the hero section container in the DOM
  const heroSection = document.getElementById('hero-section');
  // Exit if the container doesn't exist on this page
  if (!heroSection) return;

  // Extract tag names from the video's tag IDs for display
  const tagNames = video.tags.map(tagId => {
    // Find the full tag object by ID
    const t = window.App.getTags().find(tg => tg.id === tagId);
    return t ? t.name : '';
  }).filter(Boolean);
  // Use the first tag name as the badge text, fallback to 'Featured'
  const badgeText = tagNames.length > 0 ? tagNames[0] : 'Featured';

  // Escape user-generated content for safe HTML insertion
  const safeTitle = escapeHtml(video.title);
  const safeDesc = escapeHtml(video.description);
  const safeBadge = escapeHtml(badgeText);

  // ─── Inject Hero Banner HTML ───
  heroSection.innerHTML = `
    <div class="hero-banner">
      <div class="hero-content">
        <span class="hero-tag">${safeBadge}</span>
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
