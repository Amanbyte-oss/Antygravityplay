// Home page logic
document.addEventListener('DOMContentLoaded', () => {
  // 1. Inject Navbar & Footer
  window.Components.injectNavbar('home');
  window.Components.injectFooter();

  // 2. Load and filter Videos Database
  const allVideos = window.App.getVideos().filter(v => v.status === 'published');
  
  if (allVideos.length === 0) {
    const mainContainer = document.querySelector('main');
    if (mainContainer) {
      mainContainer.innerHTML = window.Components.renderEmptyState('No published videos found.');
    }
    return;
  }

  // 3. Render Hero Banner (using the top viewed video)
  const heroVideo = allVideos.reduce((max, v) => v.views > max.views ? v : max, allVideos[0]);
  setupHeroBanner(heroVideo);

  // 4. Render Popular Tags (sorted by real video count desc)
  const popularTagsContainer = document.getElementById('popular-tags-container');
  if (popularTagsContainer) {
    const tags = window.App.getTags();
    const tagCounts = {};
    allVideos.forEach(v => (v.tags || []).forEach(tId => { tagCounts[tId] = (tagCounts[tId] || 0) + 1; }));
    const sortedTags = [...tags].sort((a, b) => (tagCounts[b.id] || 0) - (tagCounts[a.id] || 0));
    popularTagsContainer.innerHTML = sortedTags.map(tag => 
      `<a href="./tag.html?tag=${encodeURIComponent(tag.name)}" class="tag-pill tag-pill-lg" style="border-left: 4px solid ${tag.color}; background-color: ${tag.color}15;">
        <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background-color:${tag.color}; margin-right:6px;"></span>
        ${tag.name}
        <span style="font-size:var(--text-xs); opacity:0.7; margin-left:6px;">(${tagCounts[tag.id] || 0})</span>
      </a>`
    ).join('');
  }

  // 5. Render Browse by Tag grid (same pill style as popular tags with scroll-reveal)
  const browseTagGrid = document.getElementById('browse-tag-grid');
  if (browseTagGrid) {
    const tags = window.App.getTags();
    const tagCounts = {};
    allVideos.forEach(v => (v.tags || []).forEach(tId => { tagCounts[tId] = (tagCounts[tId] || 0) + 1; }));
    browseTagGrid.innerHTML = tags.map((tag, i) => 
      `<a href="./tag.html?tag=${encodeURIComponent(tag.name)}" class="tag-pill tag-pill-lg reveal-on-scroll" style="border-left: 4px solid ${tag.color}; background-color: ${tag.color}15; transition-delay: ${i * 0.05}s;">
        <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background-color:${tag.color}; margin-right:6px;"></span>
        ${tag.name}
        <span style="font-size:var(--text-xs); opacity:0.7; margin-left:6px;">(${tagCounts[tag.id] || 0})</span>
      </a>`
    ).join('');
  }

  // 6. Render "Trending Now" (views desc)
  const trendingContainer = document.getElementById('trending-container');
  if (trendingContainer) {
    const trendingVideos = [...allVideos].sort((a, b) => b.views - a.views).slice(0, 8);
    trendingContainer.innerHTML = trendingVideos.map(vid => 
      window.Components.renderVideoCard(vid)
    ).join('');
  }

  // 7. Render "New Releases" (date desc)
  const newReleasesContainer = document.getElementById('new-releases-container');
  if (newReleasesContainer) {
    const newVideos = [...allVideos].reverse().slice(0, 8);
    newReleasesContainer.innerHTML = newVideos.map(vid => 
      window.Components.renderVideoCard(vid)
    ).join('');
  }

  // 8. Re-trigger Animations and Lazy Loads
  window.Animations.initScrollReveal();
  if (window.refreshLazyLoading) window.refreshLazyLoading();
});

// Setup Hero banner contents and click listener
function setupHeroBanner(video) {
  const heroSection = document.getElementById('hero-section');
  if (!heroSection) return;

  const tagNames = video.tags.map(tagId => {
    const t = window.App.getTags().find(tg => tg.id === tagId);
    return t ? t.name : '';
  }).filter(Boolean);
  const badgeText = tagNames.length > 0 ? tagNames[0] : 'Featured';

  heroSection.innerHTML = `
    <div class="hero-banner">
      <div class="hero-content">
        <span class="hero-tag">${badgeText}</span>
        <h1 class="hero-title">${video.title}</h1>
        <p class="hero-desc">${video.description}</p>
        <div class="hero-btns">
          <a href="./watch.html?id=${video.id}" class="btn btn-primary">
            <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24" style="margin-right:4px;">
              <polygon points="8,5 19,12 8,19"></polygon>
            </svg>
            Watch Now
          </a>
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

  // Bind hero like click action
  const likeBtn = document.getElementById('hero-like-btn');
  const likeText = document.getElementById('hero-like-text');
  
  if (likeBtn && likeText) {
    const updateBtnState = () => {
      const isLiked = window.App.isVideoLiked(video.id);
      if (isLiked) {
        likeBtn.style.color = '#f3727f';
        likeBtn.querySelector('svg').style.fill = '#f3727f';
        likeBtn.querySelector('svg').style.stroke = '#f3727f';
        likeText.innerText = 'Liked';
      } else {
        likeBtn.style.color = '';
        likeBtn.querySelector('svg').style.fill = 'none';
        likeBtn.querySelector('svg').style.stroke = 'currentColor';
        likeText.innerText = 'Like';
      }
    };

    updateBtnState();

    likeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.App.toggleLikeVideo(video.id);
      updateBtnState();
      window.Animations.animateLike(likeBtn);
      window.App.showToast(window.App.isVideoLiked(video.id) ? 'Added to liked videos' : 'Removed from liked videos');
    });
  }
}
