// Tag page logic
document.addEventListener('DOMContentLoaded', () => {
  // 1. Inject Navbar & Footer
  window.Components.injectNavbar();
  window.Components.injectFooter();

  // 2. Parse tag identifier from URL (support both ?id= and ?tag=)
  const params = window.App.getQueryParams();
  const tagId = params.id;
  const tagName = params.tag;
  const tags = window.App.getTags();
  let tag = null;

  if (tagId) {
    tag = tags.find(t => t.id === tagId);
  } else if (tagName) {
    tag = tags.find(t => t.name.toLowerCase() === tagName.toLowerCase());
  }

  if (!tag) {
    if (tagName) {
      tag = tags.find(t => t.name.toLowerCase() === decodeURIComponent(tagName).toLowerCase());
    }
  }

  // If no specific tag is requested, show "Browse All Tags" view
  if (!tag) {
    renderAllTagsView();
    return;
  }

  // 3. Retrieve videos containing this tag
  const allVideos = window.App.getVideos().filter(v => v.status === 'published' && v.tags.includes(tag.id));

  // 4. Setup tag details header
  setupTagHeader(tag, allVideos.length);

  // 5. Render matching videos
  renderTagVideos(allVideos);

  // 6. Render related tags
  renderRelatedTags(tag, allVideos);

  // 7. Trigger scroll reveal and lazy loading
  window.Animations.initScrollReveal();
  if (window.refreshLazyLoading) window.refreshLazyLoading();
});

// Render "Browse All Tags" view with search
function renderAllTagsView() {
  const titleEl = document.getElementById('tag-page-title');
  const descEl = document.getElementById('tag-page-desc');
  const heroIcon = document.getElementById('tag-hero-icon');
  const heroSection = document.getElementById('tag-hero');
  const gridHeading = document.getElementById('grid-heading');
  const gridEl = document.getElementById('tag-video-grid');
  const relatedSection = document.querySelector('.related-tags-section');
  if (titleEl) titleEl.innerText = 'Browse All Tags';
  if (descEl) descEl.innerText = 'Click on a tag to explore videos';
  if (heroIcon) {
    heroIcon.style.backgroundColor = 'var(--accent)';
    heroIcon.innerText = '#';
  }
  if (heroSection) {
    heroSection.style.background = 'linear-gradient(135deg, var(--accent)15, transparent 100%)';
  }
  if (gridHeading) gridHeading.innerText = 'All Tags';
  if (relatedSection) relatedSection.style.display = 'none';

  if (!gridEl) return;

  const allVideos = window.App.getVideos().filter(v => v.status === 'published');
  const allTags = window.App.getTags();

  // Count videos per tag
  const tagCounts = {};
  allVideos.forEach(v => {
    (v.tags || []).forEach(tId => {
      tagCounts[tId] = (tagCounts[tId] || 0) + 1;
    });
  });

  const sortedTags = [...allTags].sort((a, b) => (tagCounts[b.id] || 0) - (tagCounts[a.id] || 0));

  gridEl.innerHTML = `
    <div class="alltags-wrapper">
      <div class="alltags-search-bar">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="alltags-search-icon">
          <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input type="text" id="alltags-search-input" class="alltags-search-input" placeholder="Search tags..." autofocus>
      </div>
      <div id="alltags-grid" class="alltags-grid">
        ${sortedTags.map(t => renderTagCard(t, tagCounts[t.id] || 0)).join('')}
      </div>
    </div>
  `;

  // Live search filter
  const searchInput = document.getElementById('alltags-search-input');
  const gridContainer = document.getElementById('alltags-grid');
  if (searchInput && gridContainer) {
    searchInput.addEventListener('input', () => {
      const q = searchInput.value.toLowerCase().trim();
      const filtered = q
        ? sortedTags.filter(t => t.name.toLowerCase().includes(q))
        : sortedTags;
      gridContainer.innerHTML = filtered.map(t => renderTagCard(t, tagCounts[t.id] || 0)).join('');
    });
  }

  window.Animations.initScrollReveal();
  if (window.refreshLazyLoading) window.refreshLazyLoading();
}

function renderTagCard(tag, count) {
  return `
    <a href="./tag.html?tag=${encodeURIComponent(tag.name)}" class="alltags-card">
      <span class="alltags-card-dot" style="background-color:${tag.color};"></span>
      <span class="alltags-card-name">#${tag.name}</span>
      <span class="alltags-card-count">${count} video${count === 1 ? '' : 's'}</span>
    </a>
  `;
}

// Setup tag header details with hero banner
function setupTagHeader(tag, count) {
  const titleEl = document.getElementById('tag-page-title');
  const countEl = document.getElementById('tag-page-desc');
  const heroIcon = document.getElementById('tag-hero-icon');
  const heroSection = document.getElementById('tag-hero');

  if (titleEl) titleEl.innerText = `#${tag.name}`;
  if (countEl) countEl.innerText = `Showing ${count} video${count === 1 ? '' : 's'} tagged with #${tag.name}`;
  
  if (heroIcon) {
    heroIcon.style.backgroundColor = tag.color || '#1ed760';
    heroIcon.innerText = tag.name.charAt(0).toUpperCase();
  }
  
  if (heroSection) {
    heroSection.style.background = `linear-gradient(135deg, ${tag.color}22 0%, transparent 100%)`;
  }
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

// Render related tags grid
function renderRelatedTags(currentTag, taggedVideos) {
  const container = document.getElementById('related-tags-container');
  const descEl = document.getElementById('related-tags-desc');
  if (!container) return;

  const tagCounts = {};
  taggedVideos.forEach(v => {
    v.tags.forEach(tId => {
      if (tId !== currentTag.id) {
        tagCounts[tId] = (tagCounts[tId] || 0) + 1;
      }
    });
  });

  const allTags = window.App.getTags();
  const related = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([tId, count]) => {
      const t = allTags.find(tg => tg.id === tId);
      return t ? { ...t, coCount: count } : null;
    })
    .filter(Boolean);

  if (related.length === 0) {
    container.innerHTML = '<span style="font-size:var(--text-sm); color:var(--text-muted);">No related tags found.</span>';
    return;
  }

  if (descEl) descEl.innerText = `Also appears in ${related[0].coCount} video${related[0].coCount > 1 ? 's' : ''} tagged with #${currentTag.name}`;

  container.innerHTML = related.map(t => `
    <a href="./tag.html?tag=${encodeURIComponent(t.name)}" class="related-tag-card" style="display:flex; align-items:center; gap:var(--space-md); padding:var(--space-md) var(--space-lg); background:var(--bg-secondary); border:1px solid var(--border); border-radius:var(--radius-md); border-left:4px solid ${t.color}; text-decoration:none; transition:all var(--transition-fast);">
      <span style="display:flex; align-items:center; justify-content:center; width:36px; height:36px; border-radius:var(--radius-sm); background:${t.color}20; color:${t.color}; font-weight:700; font-size:var(--text-sm); flex-shrink:0;">${t.name.charAt(0).toUpperCase()}</span>
      <div style="flex:1; min-width:0;">
        <div style="font-size:var(--text-sm); font-weight:600; color:var(--text-primary);">#${t.name}</div>
        <div style="font-size:var(--text-xs); color:var(--text-muted); margin-top:2px;">${t.coCount} video${t.coCount > 1 ? 's' : ''}</div>
      </div>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--text-muted); flex-shrink:0;">
        <polyline points="9 18 15 12 9 6"></polyline>
      </svg>
    </a>
  `).join('');
}

// Error state display helper
function renderErrorView(message) {
  const container = document.getElementById('tag-page-container');
  if (container) {
    container.innerHTML = window.Components.renderErrorState(message);
  }
}
