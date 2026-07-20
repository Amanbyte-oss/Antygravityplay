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

  // 4. Render Categories row
  const categoriesContainer = document.getElementById('categories-container');
  if (categoriesContainer) {
    const categories = window.App.getCategories();
    categoriesContainer.innerHTML = categories.map(cat => 
      window.Components.renderCategoryCard(cat)
    ).join('');
  }

  // 5. Render "Trending Now" (views desc)
  const trendingContainer = document.getElementById('trending-container');
  if (trendingContainer) {
    const trendingVideos = [...allVideos].sort((a, b) => b.views - a.views).slice(0, 8);
    trendingContainer.innerHTML = trendingVideos.map(vid => 
      window.Components.renderVideoCard(vid)
    ).join('');
  }

  // 6. Render "New Releases" (date desc)
  const newReleasesContainer = document.getElementById('new-releases-container');
  if (newReleasesContainer) {
    const newVideos = [...allVideos].sort((a, b) => new Date(b.publishDate) - new Date(a.publishDate)).slice(0, 8);
    newReleasesContainer.innerHTML = newVideos.map(vid => 
      window.Components.renderVideoCard(vid)
    ).join('');
  }

  // 7. Render Category Rows (Tech & Music rows specifically)
  const techRowContainer = document.getElementById('tech-row-container');
  if (techRowContainer) {
    const techVideos = allVideos.filter(v => v.category === 'tech').slice(0, 8);
    techRowContainer.innerHTML = techVideos.map(vid => 
      window.Components.renderVideoCard(vid)
    ).join('');
  }

  const musicRowContainer = document.getElementById('music-row-container');
  if (musicRowContainer) {
    const musicVideos = allVideos.filter(v => v.category === 'music').slice(0, 8);
    musicRowContainer.innerHTML = musicVideos.map(vid => 
      window.Components.renderVideoCard(vid)
    ).join('');
  }

  // 8. Re-trigger Animations and Lazy Loads
  window.Animations.initScrollReveal();
  // Manually trigger a scroll check for lazy loading
  window.dispatchEvent(new Event('scroll'));
});

// Setup Hero banner contents and click listener
function setupHeroBanner(video) {
  const heroSection = document.getElementById('hero-section');
  if (!heroSection) return;

  const categoryName = window.MOCK_CATEGORIES.find(c => c.id === video.category)?.name || 'Featured';

  heroSection.innerHTML = `
    <div class="hero-banner">
      <div class="hero-content">
        <span class="hero-tag">${categoryName}</span>
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
