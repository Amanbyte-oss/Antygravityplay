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
  var currentTagName = tag.name;
  var allVideos = window.App.getVideos().filter(function(v) {
    if (v.status !== 'published') return false;
    return (v.tags || []).indexOf(currentTagName) !== -1 || v.tags.indexOf(tag.id) !== -1;
  });

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

  var allVideos = window.App.getVideos().filter(function(v) { return v.status === 'published'; });

  var tagCounts = {};
  var tagSet = [];
  allVideos.forEach(function(v) {
    (v.tags || []).forEach(function(t) {
      if (tagCounts[t]) { tagCounts[t]++; } else { tagCounts[t] = 1; }
      if (tagSet.indexOf(t) === -1) tagSet.push(t);
    });
  });
  tagSet.sort();

  var sortedTags = tagSet.slice().sort(function(a, b) { return (tagCounts[b] || 0) - (tagCounts[a] || 0); });

  gridEl.innerHTML = '\
    <div class="alltags-wrapper">\
      <div class="alltags-search-bar">\
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="alltags-search-icon">\
          <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>\
        </svg>\
        <input type="text" id="alltags-search-input" class="alltags-search-input" placeholder="Search tags..." autofocus>\
      </div>\
      <div id="alltags-grid" class="alltags-grid">\
        ' + sortedTags.map(function(t) { return renderTagCardStr(t, tagCounts[t] || 0); }).join('') + '\
      </div>\
    </div>';

  var searchInput = document.getElementById('alltags-search-input');
  var gridContainer = document.getElementById('alltags-grid');
  if (searchInput && gridContainer) {
    searchInput.addEventListener('input', function() {
      var q = searchInput.value.toLowerCase().trim();
      var filtered = q ? tagSet.filter(function(t) { return t.toLowerCase().includes(q); }) : tagSet;
      gridContainer.innerHTML = filtered.map(function(t) { return renderTagCardStr(t, tagCounts[t] || 0); }).join('');
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
  var esc = function(s) { return String(s||'').replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c; }); };
  var color = tag.color || 'var(--accent)';
  var name = tag.name;
  return '\
    <a href="./tag.html?tag=' + encodeURIComponent(name) + '" class="alltags-card">\
      <span class="alltags-card-dot" style="background-color:' + esc(color) + ';"></span>\
      <span class="alltags-card-name">#' + esc(name) + '</span>\
      <span class="alltags-card-count">' + count + ' video' + (count === 1 ? '' : 's') + '</span>\
    </a>';
}

function renderTagCardStr(name, count) {
  var esc = function(s) { return String(s||'').replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c; }); };
  return '\
    <a href="./tag.html?tag=' + encodeURIComponent(name) + '" class="alltags-card">\
      <span class="alltags-card-dot" style="background-color:var(--accent);"></span>\
      <span class="alltags-card-name">#' + esc(name) + '</span>\
      <span class="alltags-card-count">' + count + ' video' + (count === 1 ? '' : 's') + '</span>\
    </a>';
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
  var container = document.getElementById('related-tags-container');
  var descEl = document.getElementById('related-tags-desc');
  if (!container) return;

  var tagName = currentTag.name;
  var tagCounts = {};
  taggedVideos.forEach(function(v) {
    (v.tags || []).forEach(function(t) {
      if (t !== tagName && t !== currentTag.id) {
        tagCounts[t] = (tagCounts[t] || 0) + 1;
      }
    });
  });

  var entries = Object.keys(tagCounts).map(function(k) { return [k, tagCounts[k]]; });
  entries.sort(function(a, b) { return b[1] - a[1]; });
  var related = entries.slice(0, 8).map(function(e) { return { name: e[0], coCount: e[1] }; });

  if (related.length === 0) {
    container.innerHTML = '<span style="font-size:var(--text-sm); color:var(--text-muted);">No related tags found.</span>';
    return;
  }

  if (descEl) descEl.innerText = 'Also appears in ' + related[0].coCount + ' video' + (related[0].coCount > 1 ? 's' : '') + ' tagged with #' + tagName;

  var esc = function(s) { return String(s||'').replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c; }); };
  container.innerHTML = related.map(function(t) {
    return '\
    <a href="./tag.html?tag=' + encodeURIComponent(t.name) + '" class="related-tag-card" style="display:flex; align-items:center; gap:var(--space-md); padding:var(--space-md) var(--space-lg); background:var(--bg-secondary); border:1px solid var(--border); border-radius:var(--radius-md); border-left:4px solid var(--accent); text-decoration:none; transition:all var(--transition-fast);">\
      <span style="display:flex; align-items:center; justify-content:center; width:36px; height:36px; border-radius:var(--radius-sm); background:var(--accent)20; color:var(--accent); font-weight:700; font-size:var(--text-sm); flex-shrink:0;">' + esc(t.name.charAt(0).toUpperCase()) + '</span>\
      <div style="flex:1; min-width:0;">\
        <div style="font-size:var(--text-sm); font-weight:600; color:var(--text-primary);">#' + esc(t.name) + '</div>\
        <div style="font-size:var(--text-xs); color:var(--text-muted); margin-top:2px;">' + t.coCount + ' video' + (t.coCount > 1 ? 's' : '') + '</div>\
      </div>\
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--text-muted); flex-shrink:0;">\
        <polyline points="9 18 15 12 9 6"></polyline>\
      </svg>\
    </a>';
  }).join('');
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
