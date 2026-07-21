// ─── TAG PAGE LOGIC ───
// This script runs on DOMContentLoaded to build the tag listing page.
// Supports two modes: displaying videos for a specific tag (via ?id= or ?tag= query params),
// or showing a "Browse All Tags" view with live search filtering when no tag is specified.
document.addEventListener('DOMContentLoaded', () => {

  // ─── 1. INJECT NAVBAR & FOOTER ───
  window.Components.injectNavbar();
  window.Components.injectFooter();

  // ─── 2. PARSE TAG IDENTIFIER FROM URL ───
  // Support both ?id= (tag ID) and ?tag= (tag name) query parameters
  const params = window.App.getQueryParams();
  // Get the tag ID from the URL if present
  const tagId = params.id;
  // Get the tag name from the URL if present
  const tagName = params.tag;
  // Load all available tags
  const tags = window.App.getTags();
  // Placeholder for the resolved tag object
  let tag = null;

  // Try to find the tag by ID first
  if (tagId) {
    tag = tags.find(t => t.id === tagId);
  // Fall back to finding by name (case-insensitive)
  } else if (tagName) {
    tag = tags.find(t => t.name.toLowerCase() === tagName.toLowerCase());
  }

  // If still not found and tagName was provided, try with decodeURIComponent
  if (!tag) {
    if (tagName) {
      tag = tags.find(t => t.name.toLowerCase() === decodeURIComponent(tagName).toLowerCase());
    }
  }

  // ─── IF NO SPECIFIC TAG, SHOW "BROWSE ALL TAGS" VIEW ───
  if (!tag) {
    renderAllTagsView();
    return;
  }

  // ─── 3. RETRIEVE VIDEOS FOR THIS TAG ───
  // Filter only published videos that include the tag ID
  const allVideos = window.App.getVideos().filter(v => v.status === 'published' && v.tags.includes(tag.id));

  // ─── 4. SETUP TAG DETAILS HEADER ───
  // Update the hero banner with tag name, count, and color
  setupTagHeader(tag, allVideos.length);

  // ─── 5. RENDER MATCHING VIDEOS ───
  renderTagVideos(allVideos);

  // ─── 6. RENDER RELATED TAGS ───
  // Show tags that frequently appear alongside the current tag
  renderRelatedTags(tag, allVideos);

  // ─── 7. TRIGGER SCROLL REVEAL AND LAZY LOADING ───
  window.Animations.initScrollReveal();
  if (window.refreshLazyLoading) window.refreshLazyLoading();
});

// ─── BROWSE ALL TAGS VIEW ───
/**
 * Renders the "Browse All Tags" view with a search input for live filtering.
 * Transforms the page hero and grid to show an interactive tag browser.
 */
function renderAllTagsView() {
  // Get references to page elements that need to be modified
  const titleEl = document.getElementById('tag-page-title');
  const descEl = document.getElementById('tag-page-desc');
  const heroIcon = document.getElementById('tag-hero-icon');
  const heroSection = document.getElementById('tag-hero');
  const gridHeading = document.getElementById('grid-heading');
  const gridEl = document.getElementById('tag-video-grid');
  const relatedSection = document.querySelector('.related-tags-section');

  // Update hero title to indicate all-tags browsing mode
  if (titleEl) titleEl.innerText = 'Browse All Tags';
  // Update subtitle
  if (descEl) descEl.innerText = 'Click on a tag to explore videos';
  // Change hero icon to a generic '#' symbol with accent color
  if (heroIcon) {
    heroIcon.style.backgroundColor = 'var(--accent)';
    heroIcon.innerText = '#';
  }
  // Apply a gradient background to the hero section
  if (heroSection) {
    heroSection.style.background = 'linear-gradient(135deg, var(--accent)15, transparent 100%)';
  }
  // Change the grid heading to "All Tags"
  if (gridHeading) gridHeading.innerText = 'All Tags';
  // Hide the related tags section since we're in browse-all mode
  if (relatedSection) relatedSection.style.display = 'none';

  // Exit if the grid container doesn't exist
  if (!gridEl) return;

  // Get all published videos and all tags
  const allVideos = window.App.getVideos().filter(v => v.status === 'published');
  const allTags = window.App.getTags();

  // ─── COUNT VIDEOS PER TAG ───
  // Iterate through all published videos and count how many use each tag
  const tagCounts = {};
  allVideos.forEach(v => {
    (v.tags || []).forEach(tId => {
      tagCounts[tId] = (tagCounts[tId] || 0) + 1;
    });
  });

  // Sort tags by usage count descending
  const sortedTags = [...allTags].sort((a, b) => (tagCounts[b.id] || 0) - (tagCounts[a.id] || 0));

  // ─── INJECT ALL-TAGS GRID ───
  gridEl.innerHTML = `
    <div class="alltags-wrapper">
      <!-- Search bar for live tag filtering -->
      <div class="alltags-search-bar">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="alltags-search-icon">
          <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input type="text" id="alltags-search-input" class="alltags-search-input" placeholder="Search tags..." autofocus>
      </div>
      <!-- Grid of tag cards -->
      <div id="alltags-grid" class="alltags-grid">
        ${sortedTags.map(t => renderTagCard(t, tagCounts[t.id] || 0)).join('')}
      </div>
    </div>
  `;

  // ─── LIVE SEARCH FILTER ───
  // Get references to the search input and the tag grid container
  const searchInput = document.getElementById('alltags-search-input');
  const gridContainer = document.getElementById('alltags-grid');
  if (searchInput && gridContainer) {
    searchInput.addEventListener('input', () => {
      // Get the search query in lowercase
      const q = searchInput.value.toLowerCase().trim();
      // Filter tags whose name includes the query
      const filtered = q
        ? sortedTags.filter(t => t.name.toLowerCase().includes(q))
        : sortedTags;
      // Re-render the grid with only matching tags
      gridContainer.innerHTML = filtered.map(t => renderTagCard(t, tagCounts[t.id] || 0)).join('');
    });
  }

  // ─── RE-TRIGGER ANIMATIONS ───
  window.Animations.initScrollReveal();
  if (window.refreshLazyLoading) window.refreshLazyLoading();
}

// ─── TAG CARD RENDERER ───
/**
 * Renders a single tag card for the "Browse All Tags" grid.
 * @param {Object} tag - The tag object with id, name, color
 * @param {number} count - Number of videos using this tag
 * @returns {string} HTML string for the tag card
 */
function renderTagCard(tag, count) {
  return `
    <a href="./tag.html?tag=${encodeURIComponent(tag.name)}" class="alltags-card">
      <!-- Colored dot indicator -->
      <span class="alltags-card-dot" style="background-color:${tag.color};"></span>
      <!-- Tag name with # prefix -->
      <span class="alltags-card-name">#${tag.name}</span>
      <!-- Video count with pluralization -->
      <span class="alltags-card-count">${count} video${count === 1 ? '' : 's'}</span>
    </a>
  `;
}

// ─── TAG HEADER SETUP ───
/**
 * Updates the hero section with tag-specific details: title, video count,
 * icon color, and gradient background.
 * @param {Object} tag - The tag object
 * @param {number} count - Number of videos for this tag
 */
function setupTagHeader(tag, count) {
  // Get hero section element references
  const titleEl = document.getElementById('tag-page-title');
  const countEl = document.getElementById('tag-page-desc');
  const heroIcon = document.getElementById('tag-hero-icon');
  const heroSection = document.getElementById('tag-hero');

  // Set the page title to the tag name prefixed with #
  if (titleEl) titleEl.innerText = `#${tag.name}`;
  // Set the description showing the video count
  if (countEl) countEl.innerText = `Showing ${count} video${count === 1 ? '' : 's'} tagged with #${tag.name}`;
  
  // Update the hero icon with the tag's color and first letter
  if (heroIcon) {
    heroIcon.style.backgroundColor = tag.color || '#1ed760';
    heroIcon.innerText = tag.name.charAt(0).toUpperCase();
  }
  
  // Apply a gradient background using the tag's color
  if (heroSection) {
    heroSection.style.background = `linear-gradient(135deg, ${tag.color}22 0%, transparent 100%)`;
  }
}

// ─── VIDEO LIST RENDERER ───
/**
 * Renders the list of videos for the current tag into the grid.
 * Shows an empty state if no videos are found.
 * @param {Array} videos - Array of video objects to render
 */
function renderTagVideos(videos) {
  const gridEl = document.getElementById('tag-video-grid');
  if (!gridEl) return;

  // Show empty state if no videos match this tag
  if (videos.length === 0) {
    gridEl.innerHTML = window.Components.renderEmptyState('No videos found with this tag.');
    return;
  }

  // Render each video using the reusable video card component
  gridEl.innerHTML = videos.map(vid => 
    window.Components.renderVideoCard(vid)
  ).join('');
}

// ─── RELATED TAGS RENDERER ───
/**
 * Finds and renders tags that appear alongside the current tag in videos.
 * Shows up to 8 related tags sorted by co-occurrence count.
 * @param {Object} currentTag - The currently selected tag
 * @param {Array} taggedVideos - Videos that have the current tag
 */
function renderRelatedTags(currentTag, taggedVideos) {
  // Get the related tags container
  const container = document.getElementById('related-tags-container');
  const descEl = document.getElementById('related-tags-desc');
  if (!container) return;

  // ─── COUNT CO-OCCURRENCES ───
  // Count how many times each other tag appears alongside the current tag
  const tagCounts = {};
  taggedVideos.forEach(v => {
    v.tags.forEach(tId => {
      // Skip the current tag itself
      if (tId !== currentTag.id) {
        tagCounts[tId] = (tagCounts[tId] || 0) + 1;
      }
    });
  });

  // Get all available tags for lookups
  const allTags = window.App.getTags();
  // Sort co-occurring tags by count descending, take top 8, and enrich with tag data
  const related = Object.entries(tagCounts)
    // Sort by co-occurrence count descending
    .sort((a, b) => b[1] - a[1])
    // Take the top 8
    .slice(0, 8)
    // Map [tagId, count] to tag object with coCount
    .map(([tId, count]) => {
      const t = allTags.find(tg => tg.id === tId);
      return t ? { ...t, coCount: count } : null;
    })
    // Remove any null entries (tags not found)
    .filter(Boolean);

  // ─── EMPTY RELATED TAGS ───
  if (related.length === 0) {
    container.innerHTML = '<span style="font-size:var(--text-sm); color:var(--text-muted);">No related tags found.</span>';
    return;
  }

  // Update the description with the top related tag info
  if (descEl) descEl.innerText = `Also appears in ${related[0].coCount} video${related[0].coCount > 1 ? 's' : ''} tagged with #${currentTag.name}`;

  // ─── RENDER RELATED TAG CARDS ───
  container.innerHTML = related.map(t => `
    <a href="./tag.html?tag=${encodeURIComponent(t.name)}" class="related-tag-card" style="display:flex; align-items:center; gap:var(--space-md); padding:var(--space-md) var(--space-lg); background:var(--bg-secondary); border:1px solid var(--border); border-radius:var(--radius-md); border-left:4px solid ${t.color}; text-decoration:none; transition:all var(--transition-fast);">
      <!-- Tag initial circle -->
      <span style="display:flex; align-items:center; justify-content:center; width:36px; height:36px; border-radius:var(--radius-sm); background:${t.color}20; color:${t.color}; font-weight:700; font-size:var(--text-sm); flex-shrink:0;">${t.name.charAt(0).toUpperCase()}</span>
      <div style="flex:1; min-width:0;">
        <div style="font-size:var(--text-sm); font-weight:600; color:var(--text-primary);">#${t.name}</div>
        <div style="font-size:var(--text-xs); color:var(--text-muted); margin-top:2px;">${t.coCount} video${t.coCount > 1 ? 's' : ''}</div>
      </div>
      <!-- Right arrow icon -->
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--text-muted); flex-shrink:0;">
        <polyline points="9 18 15 12 9 6"></polyline>
      </svg>
    </a>
  `).join('');
}

// ─── ERROR STATE HELPER ───
/**
 * Replaces the entire tag page content with an error state.
 * @param {string} message - The error message to display
 */
function renderErrorView(message) {
  const container = document.getElementById('tag-page-container');
  if (container) {
    container.innerHTML = window.Components.renderErrorState(message);
  }
}
