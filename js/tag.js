// Tag page logic
document.addEventListener('DOMContentLoaded', () => {
  // 1. Inject Navbar & Footer
  window.Components.injectNavbar();
  window.Components.injectFooter();

  // 2. Parse tag ID from URL parameters
  const params = window.App.getQueryParams();
  const tagId = params.id;

  if (!tagId) {
    renderErrorView('Tag ID is missing.');
    return;
  }

  // 3. Find tag details
  const tags = window.App.getTags();
  const tag = tags.find(t => t.id === tagId);

  if (!tag) {
    renderErrorView('The tag you are looking for does not exist.');
    return;
  }

  // 4. Retrieve videos containing this tag
  const allVideos = window.App.getVideos().filter(v => v.status === 'published' && v.tags.includes(tagId));

  // 5. Setup tag details header
  setupTagHeader(tag, allVideos.length);

  // 6. Render matching videos
  renderTagVideos(allVideos);

  // 7. Trigger scroll reveal
  window.Animations.initScrollReveal();
  window.dispatchEvent(new Event('scroll'));
});

// Setup tag header details
function setupTagHeader(tag, count) {
  const titleEl = document.getElementById('tag-page-title');
  const countEl = document.getElementById('tag-page-desc');

  if (titleEl) titleEl.innerText = `#${tag.name}`;
  if (countEl) countEl.innerText = `Showing ${count} video${count === 1 ? '' : 's'} tagged with #${tag.name}`;
}

// Render Videos list
function renderTagVideos(videos) {
  const gridEl = document.getElementById('tag-video-grid');
  if (!gridEl) return;

  if (videos.length === 0) {
    gridEl.innerHTML = window.Components.renderEmptyState('No videos found with this tag.');
    return;
  }

  gridEl.innerHTML = videos.map(vid => 
    window.Components.renderVideoCard(vid)
  ).join('');
}

// Error state display helper
function renderErrorView(message) {
  const container = document.getElementById('tag-page-container');
  if (container) {
    container.innerHTML = window.Components.renderErrorState(message);
  }
}
