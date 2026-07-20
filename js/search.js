// Search page logic
document.addEventListener('DOMContentLoaded', () => {
  // 1. Inject Navbar & Footer
  window.Components.injectNavbar();
  window.Components.injectFooter();

  // 2. Parse initial search param
  const params = window.App.getQueryParams();
  const searchInput = document.getElementById('search-input');
  
  if (params.q && searchInput) {
    searchInput.value = params.q;
  }

  // 3. Build Tag Filter Chips in the filter panel
  renderFilterChips();

  // 4. Setup Event Listeners
  const categorySelect = document.getElementById('filter-category');
  const durationSelect = document.getElementById('filter-duration');
  const dateSelect = document.getElementById('filter-date');
  const clearBtn = document.getElementById('clear-filters-btn');

  // Debounced search keyup listener
  let debounceTimeout;
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(performSearch, 300);
    });
  }

  [categorySelect, durationSelect, dateSelect].forEach(select => {
    if (select) select.addEventListener('change', performSearch);
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      if (categorySelect) categorySelect.value = 'all';
      if (durationSelect) durationSelect.value = 'all';
      if (dateSelect) dateSelect.value = 'all';
      
      // Deactivate all tags
      document.querySelectorAll('.filter-chip-btn').forEach(btn => {
        btn.classList.remove('active');
      });

      performSearch();
    });
  }

  // 5. Initial Search
  performSearch();
});

// Render tags as chips inside the filter panel
function renderFilterChips() {
  const container = document.getElementById('filter-tags-list');
  if (!container) return;

  const tags = window.App.getTags();
  container.innerHTML = tags.map(tag => `
    <button class="filter-chip-btn" data-tag-id="${tag.id}" type="button">
      #${tag.name}
    </button>
  `).join('');

  // Bind click toggle actions
  container.querySelectorAll('.filter-chip-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('active');
      performSearch();
    });
  });
}

// Perform search filtration and rendering
function performSearch() {
  const searchInput = document.getElementById('search-input');
  const query = searchInput ? searchInput.value.trim().toLowerCase() : '';

  const category = document.getElementById('filter-category').value;
  const duration = document.getElementById('filter-duration').value;
  const date = document.getElementById('filter-date').value;

  // Active tags list
  const activeTags = Array.from(document.querySelectorAll('.filter-chip-btn.active'))
    .map(btn => btn.dataset.tagId);

  // Retrieve published database
  let results = window.App.getVideos().filter(v => v.status === 'published');

  // 1. Text Query Filter (Matches title, description, or creator)
  if (query) {
    results = results.filter(vid => 
      vid.title.toLowerCase().includes(query) ||
      vid.description.toLowerCase().includes(query) ||
      vid.creator.toLowerCase().includes(query)
    );
  }

  // 2. Category Filter
  if (category && category !== 'all') {
    results = results.filter(vid => vid.category === category);
  }

  // 3. Tags Filter (Video must match ALL active tags)
  if (activeTags.length > 0) {
    results = results.filter(vid => 
      activeTags.every(tagId => vid.tags.includes(tagId))
    );
  }

  // 4. Duration Filter
  if (duration && duration !== 'all') {
    results = results.filter(vid => {
      // Parse duration to seconds
      const seconds = parseDurationToSeconds(vid.duration);
      if (duration === 'short') return seconds < 300; // < 5 mins
      if (duration === 'medium') return seconds >= 300 && seconds <= 900; // 5-15 mins
      if (duration === 'long') return seconds > 900; // > 15 mins
      return true;
    });
  }

  // 5. Upload Date Filter
  if (date && date !== 'all') {
    results = results.filter(vid => {
      const pubDate = new Date(vid.publishDate);
      const now = new Date("2026-07-20"); // Using metadata anchor time
      const diffTime = Math.abs(now - pubDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (date === 'today') return diffDays <= 1;
      if (date === 'week') return diffDays <= 7;
      if (date === 'month') return diffDays <= 30;
      return true;
    });
  }

  // Render Grid results
  renderSearchResults(results, query);
}

// Convert string duration "MM:SS" or "H:MM:SS" to number seconds
function parseDurationToSeconds(durationStr) {
  const parts = durationStr.split(':').map(Number);
  if (parts.length === 3) {
    return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
  }
  if (parts.length === 2) {
    return (parts[0] * 60) + parts[1];
  }
  return 0;
}

// Render Results Grid + Text highlights
function renderSearchResults(videos, query) {
  const countEl = document.getElementById('search-results-count');
  const gridEl = document.getElementById('search-results-grid');

  if (countEl) countEl.innerText = `${videos.length} video${videos.length === 1 ? '' : 's'} found`;
  if (!gridEl) return;

  if (videos.length === 0) {
    gridEl.innerHTML = window.Components.renderEmptyState('No videos found matching your parameters.');
    return;
  }

  gridEl.innerHTML = videos.map(vid => {
    let titleHtml = vid.title;
    if (query) {
      // Highlight matching query text
      const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
      titleHtml = vid.title.replace(regex, '<span class="highlight-text">$1</span>');
    }

    const isLiked = window.App.isVideoLiked(vid.id);

    return `
      <article class="video-card reveal-on-scroll" data-video-id="${vid.id}" onclick="window.location.href='./watch.html?id=${vid.id}'">
        <div class="thumbnail-container">
          <img class="lazy" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 9'%3E%3Crect width='100%25' height='100%25' fill='%231f1f1f'/%3E%3C/svg%3E" data-src="${vid.thumbnail}" alt="${vid.title} Preview">
          <span class="duration-badge">${vid.duration}</span>
          <button class="play-hover-btn" aria-label="Play video" onclick="event.stopPropagation(); window.location.href='./watch.html?id=${vid.id}'">
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
              <polygon points="8,5 19,12 8,19"></polygon>
            </svg>
          </button>
        </div>
        <div class="video-info">
          <h3 class="video-title">${titleHtml}</h3>
          <div class="video-meta">
            <div class="video-creator">${vid.creator}</div>
            <div>${Number(vid.views).toLocaleString()} views &bull; ${vid.publishDate}</div>
          </div>
        </div>
      </article>
    `;
  }).join('');

  // Re-trigger scroll reveal transitions
  window.Animations.initScrollReveal();
  window.dispatchEvent(new Event('scroll'));
}

// Regex escaper
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
