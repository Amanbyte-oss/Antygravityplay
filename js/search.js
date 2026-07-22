// ─── SEARCH PAGE LOGIC ───
// This script runs on DOMContentLoaded to build the search page:
// injects navbar/footer, parses URL query params, renders filter tag chips,
// sets up debounced search and filter change listeners, and performs the initial search.
document.addEventListener('DOMContentLoaded', () => {

  // ─── 1. INJECT NAVBAR & FOOTER ───
  // Inject the public navbar (no active page highlight for search)
  window.Components.injectNavbar();
  // Inject the page footer
  window.Components.injectFooter();

  // ─── 2. PARSE INITIAL SEARCH PARAM ───
  // Get query parameters from the URL (e.g., ?q=searchterm)
  const params = window.App.getQueryParams();
  // Find the search input element
  const searchInput = document.getElementById('search-input');
  
  // If a 'q' parameter exists in the URL, pre-fill the search input
  if (params.q && searchInput) {
    searchInput.value = params.q;
  }

  // ─── 3. BUILD TAG FILTER CHIPS ───
  // Render all tags as clickable chips in the filter panel
  renderFilterChips();

  // ─── 4. SETUP EVENT LISTENERS ───
  // Get references to filter UI elements
  const durationSelect = document.getElementById('filter-duration');
  const dateSelect = document.getElementById('filter-date');
  const clearBtn = document.getElementById('clear-filters-btn');

  // ─── DEBOUNCED SEARCH ON KEYUP ───
  // Debounce timer reference to avoid firing search on every keystroke
  let debounceTimeout;
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      // Clear any previously scheduled search
      clearTimeout(debounceTimeout);
      // Schedule a new search after 300ms of inactivity
      debounceTimeout = setTimeout(performSearch, 300);
    });
  }

  // Re-run search when duration or date filter changes
  [durationSelect, dateSelect].forEach(select => {
    if (select) select.addEventListener('change', performSearch);
  });

  // Clear all filters and re-run search
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      // Reset search input
      if (searchInput) searchInput.value = '';
      // Reset duration filter to 'all'
      if (durationSelect) durationSelect.value = 'all';
      // Reset date filter to 'all'
      if (dateSelect) dateSelect.value = 'all';
      
      // Deactivate all tag filter chips
      document.querySelectorAll('.filter-chip-btn').forEach(btn => {
        btn.classList.remove('active');
      });

      // Re-run the search with cleared filters
      performSearch();
    });
  }

  // ─── 5. INITIAL SEARCH ───
  // Perform the initial search based on URL params and default filters
  performSearch();
});

// ─── TAG FILTER CHIPS ───
/**
 * Renders all available tags as clickable filter chips in the #filter-tags-list container.
 * Each chip toggles 'active' state and triggers a new search on click.
 */
function renderFilterChips() {
  // Find the container for tag filter chips
  const container = document.getElementById('filter-tags-list');
  // Exit if the container doesn't exist
  if (!container) return;

  // Get all available tags
  const tags = window.App.getTags();
  // Render each tag as a button chip with its name prefixed by #
  container.innerHTML = tags.map(tag => `
    <button class="filter-chip-btn" data-tag-id="${escapeHtml(tag.id)}" type="button">
      #${escapeHtml(tag.name)}
    </button>
  `).join('');

  // ─── Bind click toggle actions ───
  // Add click listeners to each chip to toggle active state and re-search
  container.querySelectorAll('.filter-chip-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      // Toggle the 'active' class on the clicked chip
      btn.classList.toggle('active');
      // Re-run the search with the updated tag filter
      performSearch();
    });
  });
}

// ─── SEARCH EXECUTION ───
/**
 * Reads all filter values (text query, duration, date, active tags),
 * filters the published video database accordingly, and renders the results.
 * Filters are applied in order: text query, tags, duration, upload date.
 */
function performSearch() {
  // Get the text search query from the input field
  const searchInput = document.getElementById('search-input');
  // Trim whitespace and convert to lowercase for case-insensitive matching
  const query = searchInput ? searchInput.value.trim().toLowerCase() : '';

  // Get the selected duration filter value
  const duration = document.getElementById('filter-duration').value;
  // Get the selected date filter value
  const date = document.getElementById('filter-date').value;

  // ─── ACTIVE TAGS ───
  // Collect all tag IDs from chips that have the 'active' class
  const activeTags = Array.from(document.querySelectorAll('.filter-chip-btn.active'))
    .map(btn => btn.dataset.tagId);

  // ─── RETRIEVE PUBLISHED VIDEOS ───
  // Start with all published videos from the database
  let results = window.App.getVideos().filter(v => v.status === 'published');

  // ─── 1. TEXT QUERY FILTER ───
  // Filter videos whose title, description, or creator contains the query text
  if (query) {
    results = results.filter(vid => 
      // Check if title contains the query (case-insensitive)
      vid.title.toLowerCase().includes(query) ||
      // Check if description contains the query
      vid.description.toLowerCase().includes(query) ||
      // Check if creator name contains the query
      vid.creator.toLowerCase().includes(query)
    );
  }

  // ─── 2. TAGS FILTER ───
  // Video must match ALL active tags (logical AND)
  if (activeTags.length > 0) {
    results = results.filter(vid => 
      // Every active tag must be present in the video's tags array
      activeTags.every(tagId => vid.tags.includes(tagId))
    );
  }

  // ─── 3. DURATION FILTER ───
  // Filter videos by length category: short (<5min), medium (5-15min), long (>15min)
  if (duration && duration !== 'all') {
    results = results.filter(vid => {
      // Parse the video's duration string to total seconds
      const seconds = parseDurationToSeconds(vid.duration);
      // Short videos: less than 5 minutes (300 seconds)
      if (duration === 'short') return seconds < 300;
      // Medium videos: between 5 minutes and 15 minutes inclusive
      if (duration === 'medium') return seconds >= 300 && seconds <= 900;
      // Long videos: greater than 15 minutes (900 seconds)
      if (duration === 'long') return seconds > 900;
      // Fall through (shouldn't happen)
      return true;
    });
  }

  // ─── 4. UPLOAD DATE FILTER ───
  // Filter videos by how recently they were published
  if (date && date !== 'all') {
    results = results.filter(vid => {
      // Parse the video's publish date
      const pubDate = new Date(vid.publishDate);
      // Get the current date/time
      const now = new Date();
      // Calculate the absolute difference in milliseconds
      const diffTime = Math.abs(now - pubDate);
      // Convert to days, rounding up
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Today: published within the last 1 day
      if (date === 'today') return diffDays <= 1;
      // This week: published within the last 7 days
      if (date === 'week') return diffDays <= 7;
      // This month: published within the last 30 days
      if (date === 'month') return diffDays <= 30;
      // Fall through
      return true;
    });
  }

  // ─── RENDER RESULTS ───
  // Pass the filtered results and the original query (for highlighting) to the renderer
  renderSearchResults(results, query);
}

// ─── DURATION PARSER ───
/**
 * Converts a duration string ("MM:SS" or "H:MM:SS") to total seconds.
 * @param {string} durationStr - The duration string to parse
 * @returns {number} Total number of seconds
 */
function parseDurationToSeconds(durationStr) {
  // Return 0 for invalid input
  if (!durationStr || typeof durationStr !== 'string') return 0;
  // Split by colon and convert each part to a number
  const parts = durationStr.split(':').map(Number);
  // Handle "H:MM:SS" format (3 parts)
  if (parts.length === 3) {
    return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
  }
  // Handle "MM:SS" format (2 parts)
  if (parts.length === 2) {
    return (parts[0] * 60) + parts[1];
  }
  // Fallback for unrecognized formats
  return 0;
}

// ─── RESULTS RENDERING ───
/**
 * Renders the filtered video results into the grid and updates the result count.
 * Highlights matching query text in video titles.
 * Also re-triggers scroll reveal and lazy loading for new content.
 * @param {Array} videos - Array of video objects to display
 * @param {string} query - The original search query for text highlighting
 */
function renderSearchResults(videos, query) {
  // Get the results count display element
  const countEl = document.getElementById('search-results-count');
  // Get the results grid container
  const gridEl = document.getElementById('search-results-grid');

  // Update the count text with pluralization
  if (countEl) countEl.innerText = `${videos.length} video${videos.length === 1 ? '' : 's'} found`;
  // Exit if the grid container doesn't exist
  if (!gridEl) return;

  // ─── EMPTY STATE ───
  // If no results, show empty state and stop
  if (videos.length === 0) {
    gridEl.innerHTML = window.Components.renderEmptyState('No videos found matching your parameters.');
    return;
  }

  // ─── RENDER VIDEO CARDS ───
  gridEl.innerHTML = videos.map(vid => {
    const escTitle = escapeHtml(vid.title);
    let titleHtml = escTitle;
    if (query) {
      const regex = new RegExp(`(${escapeRegExp(escapeHtml(query))})`, 'gi');
      titleHtml = escTitle.replace(regex, '<span class="highlight-text">$1</span>');
    }

    const href = `./watch.html?id=${encodeURIComponent(vid.id)}`;
    return `
      <article class="video-card" data-video-id="${escapeHtml(vid.id)}" data-href="${href}">
        <div class="thumbnail-container">
          <img class="lazy" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 9'%3E%3Crect width='100%25' height='100%25' fill='%231f1f1f'/%3E%3C/svg%3E" data-src="${escapeHtml(vid.thumbnail || '')}" alt="${escTitle} Preview">
          <span class="duration-badge">${escapeHtml(vid.duration)}</span>
          <button class="play-hover-btn" data-href="${href}" aria-label="Play ${escTitle}">
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
              <polygon points="8,5 19,12 8,19"></polygon>
            </svg>
          </button>
        </div>
        <div class="video-info">
          <h3 class="video-title">${titleHtml}</h3>
          <div class="video-meta">
            <div class="video-creator">${escapeHtml(vid.creator)}</div>
            <div>${Number(vid.views).toLocaleString()} views &bull; ${escapeHtml(vid.publishDate)}</div>
          </div>
        </div>
      </article>
    `;
  }).join('');

  // ─── RE-TRIGGER ANIMATIONS ───
  // Initialize scroll reveal for newly added elements
  window.Animations.initScrollReveal();
  // Refresh lazy loading for new images
  if (window.refreshLazyLoading) window.refreshLazyLoading();
}

function escapeHtml(s) { return String(s||'').replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c; }); }

// ─── REGEX ESCAPE UTILITY ───
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
