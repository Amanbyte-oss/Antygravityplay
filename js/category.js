// Category page logic
document.addEventListener('DOMContentLoaded', () => {
  // 1. Inject Navbar & Footer
  window.Components.injectNavbar();
  window.Components.injectFooter();

  // 2. Parse category ID from URL parameters
  const params = window.App.getQueryParams();
  const categoryId = params.id;

  if (!categoryId) {
    renderErrorView('Category ID is missing.');
    return;
  }

  // 3. Find category details
  const categories = window.App.getCategories();
  const category = categories.find(c => c.id === categoryId);

  if (!category) {
    renderErrorView('The category you are looking for does not exist.');
    return;
  }

  // 4. Retrieve videos and filter by category
  const allVideos = window.App.getVideos().filter(v => v.status === 'published' && v.category === categoryId);

  // 5. Setup hero banner details
  setupCategoryHero(category, allVideos.length);

  // 6. Render matching videos
  renderCategoryVideos(allVideos);

  // 7. Trigger scroll reveal
  window.Animations.initScrollReveal();
  window.dispatchEvent(new Event('scroll'));
});

// Setup Category Hero Banner
function setupCategoryHero(category, count) {
  const heroEl = document.getElementById('category-hero-section');
  if (!heroEl) return;

  // Render hero HTML
  heroEl.innerHTML = `
    <div class="category-hero" style="background: linear-gradient(135deg, ${category.color}4D 0%, #121212 100%), var(--bg-secondary);">
      <div class="category-hero-overlay"></div>
      <div class="category-hero-content">
        <h1 class="category-hero-title">${category.name}</h1>
        <p class="category-hero-desc">${category.description}</p>
        <span style="font-size: var(--text-xs); color: var(--accent); font-weight:600; text-transform:uppercase; margin-top:10px; display:inline-block;">
          ${count} Video${count === 1 ? '' : 's'} Published
        </span>
      </div>
    </div>
  `;
}

// Render Videos list
function renderCategoryVideos(videos) {
  const gridEl = document.getElementById('category-video-grid');
  if (!gridEl) return;

  if (videos.length === 0) {
    gridEl.innerHTML = window.Components.renderEmptyState('No videos published in this category yet.');
    return;
  }

  gridEl.innerHTML = videos.map(vid => 
    window.Components.renderVideoCard(vid)
  ).join('');
}

// Error state display helper
function renderErrorView(message) {
  const container = document.getElementById('category-page-container');
  if (container) {
    container.innerHTML = window.Components.renderErrorState(message);
  }
}
