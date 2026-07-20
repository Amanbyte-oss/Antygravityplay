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
    // Try to find by tag name as last resort
    if (tagName) {
      tag = tags.find(t => t.name.toLowerCase() === decodeURIComponent(tagName).toLowerCase());
    }
  }

  if (!tag) {
    renderErrorView('Tag not found. The tag you are looking for does not exist or the link may be incorrect. Try browsing from the <a href="./index.html" style="color: var(--accent);">home page</a>.');
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

  // 7. Trigger scroll reveal
  window.Animations.initScrollReveal();
  window.dispatchEvent(new Event('scroll'));
});

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
