const TAG_PALETTE = ['#0070f3','#7928ca','#ff0080','#ffa42b','#50e3c2','#539df5','#1db954','#f3727f','#e91e63','#ff5722','#9c27b0','#00bcd4','#ff9800','#4caf50','#f44336','#3f51b5'];

function renderTagPills(video) {
  const allTags = window.App.getTags();
  const resolvedTags = (video.tags || []).map(tId => allTags.find(t => t.id === tId)).filter(Boolean);
  if (resolvedTags.length === 0) return '<span class="tag-none">—</span>';
  return resolvedTags.map(t =>
    `<span class="card-tag" style="background-color:${t.color}18; color:${t.color};">${t.name}</span>`
  ).join(' ');
}

document.addEventListener('DOMContentLoaded', () => {
  window.Components.injectAdminSidebar('videos');

  const state = {
    videos: window.App.getVideos(),
    searchQuery: '',
    currentPage: 1,
    itemsPerPage: 15,
    sortBy: 'publishDate',
    sortOrder: 'desc',
    selectedIds: []
  };

  renderCards(state);
  setupSortDropdown(state);
  setupTableSearch(state);
  setupBulkSelection(state);
  setupBulkActions(state);
});

function renderCards(state) {
  const grid = document.getElementById('videos-grid');
  const countSpan = document.getElementById('table-count-span');
  if (!grid) return;

  let filtered = [...state.videos];
  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    filtered = filtered.filter(v =>
      v.title.toLowerCase().includes(q) ||
      v.creator.toLowerCase().includes(q)
    );
  }

  filtered.sort((a, b) => {
    let valA = a[state.sortBy];
    let valB = b[state.sortBy];
    if (typeof valA === 'string') {
      return state.sortOrder === 'asc'
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    }
    return state.sortOrder === 'asc' ? valA - valB : valB - valA;
  });

  const totalItems = filtered.length;
  if (countSpan) countSpan.innerText = `${totalItems} total video${totalItems === 1 ? '' : 's'}`;

  const totalPages = Math.ceil(totalItems / state.itemsPerPage) || 1;
  if (state.currentPage > totalPages) state.currentPage = totalPages;

  const startIdx = (state.currentPage - 1) * state.itemsPerPage;
  const pageItems = filtered.slice(startIdx, startIdx + state.itemsPerPage);

  if (pageItems.length === 0) {
    grid.innerHTML = '<div class="videos-empty"><div class="empty-icon">🎬</div>No videos found matching search.</div>';
    renderPaginationControls(state, totalPages);
    return;
  }

  grid.innerHTML = pageItems.map((vid, idx) => {
    const isChecked = state.selectedIds.includes(vid.id) ? 'checked' : '';
    const badgeClass = vid.status === 'published' ? 'badge-success' : 'badge-warning';
    const tagHtml = renderTagPills(vid);

    return `
      <div class="video-card" data-video-id="${vid.id}" style="animation-delay:${idx * 0.04}s">
        <div class="video-card-check">
          <input type="checkbox" class="card-checkbox row-select-checkbox" data-id="${vid.id}" ${isChecked}>
        </div>
        <div class="video-card-thumb">
          <img src="${vid.thumbnail}" alt="${vid.title}" loading="lazy">
          <div class="video-card-stats">
            <span><svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> ${Number(vid.views).toLocaleString()}</span>
            <span><svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg> ${Number(vid.likes).toLocaleString()}</span>
          </div>
        </div>
        <div class="video-card-body">
          <div class="video-card-title">
            <div class="inline-editable edit-title" data-id="${vid.id}">${vid.title}</div>
          </div>
          <div class="video-card-tags">
            <div class="tags-cell-display" data-video-id="${vid.id}">${tagHtml}</div>
          </div>
          <div class="video-card-meta">
            <span class="video-card-date">${vid.publishDate}</span>
            <div class="inline-editable edit-status" data-id="${vid.id}" data-value="${vid.status}">
              <span class="badge ${badgeClass}">${vid.status}</span>
            </div>
          </div>
        </div>
        <div class="video-card-actions">
          <button class="card-action-btn delete-btn" data-id="${vid.id}" aria-label="Delete video">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>
    `;
  }).join('');

  bindCardActions(state);
  renderPaginationControls(state, totalPages, filtered.length);
  syncHeaderCheckbox(state, pageItems);
}

function bindCardActions(state) {
  // Title inline edit
  document.querySelectorAll('.edit-title').forEach(el => {
    el.addEventListener('click', () => {
      if (el.querySelector('input')) return;
      const videoId = el.dataset.id;
      const curText = el.innerText.trim();
      const input = document.createElement('input');
      input.className = 'inline-edit-input';
      input.value = curText;
      el.innerHTML = '';
      el.appendChild(input);
      input.focus();

      let saved = false;
      const saveEdit = () => {
        if (saved) return;
        saved = true;
        const nextVal = input.value.trim();
        if (nextVal && nextVal !== curText) {
          const vIdx = state.videos.findIndex(v => v.id === videoId);
          if (vIdx !== -1) {
            state.videos[vIdx].title = nextVal;
            window.App.saveVideos(state.videos);
            window.App.showToast('Title updated successfully.');
          }
        }
        renderCards(state);
      };
      input.addEventListener('blur', saveEdit);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); saveEdit(); }
        if (e.key === 'Escape') renderCards(state);
      });
    });
  });

  // Tags inline edit
  document.querySelectorAll('.tags-cell-display').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      if (el.querySelector('.inline-tag-selector')) return;
      const videoId = el.dataset.videoId;
      const video = state.videos.find(v => v.id === videoId);
      if (!video) return;

      const allTags = window.App.getTags();
      const videoTags = video.tags || [];
      const selector = document.createElement('div');
      selector.className = 'inline-tag-selector';
      selector.innerHTML = allTags.map(tag => {
        const isSelected = videoTags.includes(tag.id);
        return `
          <span class="inline-tag-option ${isSelected ? 'selected' : ''}" data-tag-id="${tag.id}" style="display:inline-flex;align-items:center;gap:3px;padding:2px 8px;border-radius:9999px;font-size:10px;cursor:pointer;border:1px solid ${tag.color};background-color:${isSelected ? tag.color : 'transparent'};color:${isSelected ? '#fff' : 'inherit'};">
            ${tag.name}
          </span>
        `;
      }).join('');
      selector.innerHTML += `
        <div style="width:100%;margin-top:4px;display:flex;gap:4px;">
          <input type="text" class="inline-tag-search" placeholder="Add tag..." style="flex:1;font-size:10px;padding:2px 6px;border:1px solid var(--border);border-radius:9999px;background:var(--bg-primary);">
        </div>
      `;

      el.innerHTML = '';
      el.appendChild(selector);

      selector.querySelectorAll('.inline-tag-option').forEach(opt => {
        opt.addEventListener('click', (e) => {
          e.stopPropagation();
          const tId = opt.dataset.tagId;
          const idx = videoTags.indexOf(tId);
          if (idx !== -1) {
            videoTags.splice(idx, 1);
            opt.classList.remove('selected');
            opt.style.backgroundColor = 'transparent';
            opt.style.color = 'inherit';
          } else {
            if (videoTags.length >= 10) {
              window.App.showToast('Maximum 10 tags.', 'error');
              return;
            }
            videoTags.push(tId);
            opt.classList.add('selected');
            const tg = window.App.getTags().find(t => t.id === tId);
            opt.style.backgroundColor = tg ? tg.color : '#888';
            opt.style.color = '#fff';
          }
          video.tags = videoTags;
          window.App.saveVideos(state.videos);
        });
      });

      const searchInput = selector.querySelector('.inline-tag-search');
      if (searchInput) {
        searchInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            const name = searchInput.value.trim();
            if (!name) return;
            if (videoTags.length >= 10) {
              window.App.showToast('Maximum 10 tags.', 'error');
              return;
            }
            const allTagsData = window.App.getTags();
            let existing = allTagsData.find(t => t.name.toLowerCase() === name.toLowerCase());
            if (existing) {
              if (!videoTags.includes(existing.id)) {
                videoTags.push(existing.id);
                video.tags = videoTags;
                window.App.saveVideos(state.videos);
              }
            } else {
              const newId = 'tag-' + Date.now();
              const color = TAG_PALETTE[Math.floor(Math.random() * TAG_PALETTE.length)];
              allTagsData.push({ id: newId, name, color, usageCount: 0 });
              window.App.saveTags(allTagsData);
              videoTags.push(newId);
              video.tags = videoTags;
              window.App.saveVideos(state.videos);
            }
            renderCards(state);
          }
        });
        searchInput.addEventListener('blur', () => {
          if (!selector.contains(document.activeElement)) renderCards(state);
        });
      }

      document.addEventListener('click', function closeSelector(ev) {
        if (!selector.contains(ev.target)) {
          renderCards(state);
          document.removeEventListener('click', closeSelector);
        }
      });
    });
  });

  // Status inline edit
  document.querySelectorAll('.edit-status').forEach(el => {
    el.addEventListener('click', () => {
      if (el.querySelector('select')) return;
      const videoId = el.dataset.id;
      const curVal = el.dataset.value;
      const select = document.createElement('select');
      select.className = 'inline-edit-select';
      select.innerHTML = `
        <option value="published" ${curVal === 'published' ? 'selected' : ''}>published</option>
        <option value="draft" ${curVal === 'draft' ? 'selected' : ''}>draft</option>
      `;
      el.innerHTML = '';
      el.appendChild(select);
      select.focus();

      const saveEdit = () => {
        const nextVal = select.value;
        if (nextVal !== curVal) {
          const vIdx = state.videos.findIndex(v => v.id === videoId);
          if (vIdx !== -1) {
            state.videos[vIdx].status = nextVal;
            window.App.saveVideos(state.videos);
            window.App.showToast('Status updated successfully.');
          }
        }
        renderCards(state);
      };
      select.addEventListener('change', saveEdit);
      select.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') renderCards(state);
      });
    });
  });

  // Delete button
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const videoId = btn.dataset.id;
      const video = state.videos.find(v => v.id === videoId);
      window.App.showConfirmModal(
        'Delete Video',
        `Are you sure you want to permanently delete "${video.title}"? This action cannot be undone.`,
        () => {
          state.videos = state.videos.filter(v => v.id !== videoId);
          window.App.saveVideos(state.videos);
          state.selectedIds = state.selectedIds.filter(id => id !== videoId);
          window.App.showToast('Video deleted successfully.');
          renderCards(state);
        }
      );
    });
  });

  // Individual card checkbox
  document.querySelectorAll('.row-select-checkbox').forEach(cb => {
    cb.addEventListener('change', () => {
      const id = cb.dataset.id;
      if (cb.checked) {
        if (!state.selectedIds.includes(id)) state.selectedIds.push(id);
      } else {
        state.selectedIds = state.selectedIds.filter(val => val !== id);
      }
      syncBulkButtonDisplay(state);
    });
  });
}

function setupSortDropdown(state) {
  const select = document.getElementById('sort-select');
  if (!select) return;
  select.addEventListener('change', () => {
    const [field, order] = select.value.split('-');
    state.sortBy = field;
    state.sortOrder = order;
    state.currentPage = 1;
    renderCards(state);
  });
}

function setupTableSearch(state) {
  const searchInput = document.getElementById('table-search-input');
  if (!searchInput) return;
  let searchDebounce;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      state.searchQuery = searchInput.value.trim();
      state.currentPage = 1;
      renderCards(state);
    }, 250);
  });
}

function setupBulkSelection(state) {
  const headerCheckbox = document.getElementById('header-checkbox');
  if (!headerCheckbox) return;
  headerCheckbox.addEventListener('change', () => {
    const isChecked = headerCheckbox.checked;
    document.querySelectorAll('.row-select-checkbox').forEach(cb => {
      const id = cb.dataset.id;
      cb.checked = isChecked;
      if (isChecked) {
        if (!state.selectedIds.includes(id)) state.selectedIds.push(id);
      } else {
        state.selectedIds = state.selectedIds.filter(val => val !== id);
      }
    });
    syncBulkButtonDisplay(state);
  });
}

function syncHeaderCheckbox(state, pageItems) {
  const headerCheckbox = document.getElementById('header-checkbox');
  if (!headerCheckbox || pageItems.length === 0) return;
  headerCheckbox.checked = pageItems.every(vid => state.selectedIds.includes(vid.id));
  syncBulkButtonDisplay(state);
}

function syncBulkButtonDisplay(state) {
  const bulkBar = document.getElementById('bulk-actions-bar');
  const countSpan = document.getElementById('bulk-selected-count');
  if (!bulkBar) return;
  const count = state.selectedIds.length;
  bulkBar.style.display = count > 0 ? 'flex' : 'none';
  if (countSpan) countSpan.innerText = `${count} selected`;
}

function setupBulkActions(state) {
  const deleteSelectedBtn = document.getElementById('delete-selected-btn');
  if (!deleteSelectedBtn) return;
  deleteSelectedBtn.addEventListener('click', () => {
    if (state.selectedIds.length === 0) return;
    window.App.showConfirmModal(
      'Delete Selected Videos',
      `Are you sure you want to permanently delete the ${state.selectedIds.length} selected videos? This cannot be undone.`,
      () => {
        state.videos = state.videos.filter(v => !state.selectedIds.includes(v.id));
        window.App.saveVideos(state.videos);
        state.selectedIds = [];
        window.App.showToast('Selected videos deleted successfully.');
        renderCards(state);
      }
    );
  });
}

function renderPaginationControls(state, totalPages, totalFiltered) {
  const container = document.getElementById('pagination-wrapper');
  if (!container) return;

  const startIdx = (state.currentPage - 1) * state.itemsPerPage + 1;
  let endIdx = state.currentPage * state.itemsPerPage;
  const totalItems = totalFiltered !== undefined ? totalFiltered : state.videos.length;
  if (endIdx > totalItems) endIdx = totalItems;

  let pageButtons = '';
  for (let i = 1; i <= totalPages; i++) {
    pageButtons += `
      <button class="pagination-btn ${state.currentPage === i ? 'active' : ''}" data-page="${i}">${i}</button>
    `;
  }

  container.innerHTML = `
    <div class="pagination-container">
      <div>Showing <span style="font-weight:600;color:var(--text-primary);">${totalItems === 0 ? 0 : startIdx}-${endIdx}</span> of <span style="font-weight:600;color:var(--text-primary);">${totalItems}</span> videos</div>
      <div class="pagination-controls">
        <button class="pagination-btn ${state.currentPage === 1 ? 'disabled' : ''}" id="prev-page-btn">&larr;</button>
        ${pageButtons}
        <button class="pagination-btn ${state.currentPage === totalPages ? 'disabled' : ''}" id="next-page-btn">&rarr;</button>
      </div>
    </div>
  `;

  if (state.currentPage > 1) {
    document.getElementById('prev-page-btn').addEventListener('click', () => {
      state.currentPage--; renderCards(state);
    });
  }
  if (state.currentPage < totalPages) {
    document.getElementById('next-page-btn').addEventListener('click', () => {
      state.currentPage++; renderCards(state);
    });
  }
  container.querySelectorAll('[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.currentPage = Number(btn.dataset.page);
      renderCards(state);
    });
  });
}
