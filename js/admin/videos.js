// Video management table logic
document.addEventListener('DOMContentLoaded', () => {
  // 1. Inject Admin Sidebar
  window.Components.injectAdminSidebar('videos');

  // 2. Setup state
  const state = {
    videos: window.App.getVideos(),
    categories: window.App.getCategories(),
    searchQuery: '',
    currentPage: 1,
    itemsPerPage: 5,
    sortBy: 'publishDate',
    sortOrder: 'desc', // 'asc' or 'desc'
    selectedIds: []
  };

  // Render initial elements
  renderTable(state);

  // 3. Bind Header Sort events
  setupTableSorting(state);

  // 4. Bind Real-time search
  setupTableSearch(state);

  // 5. Bulk selection listeners
  setupBulkSelection(state);

  // 6. Bulk Action listeners (like delete selected)
  setupBulkActions(state);
});

// Primary table renderer
function renderTable(state) {
  const tbody = document.getElementById('videos-tbody');
  const countSpan = document.getElementById('table-count-span');
  
  if (!tbody) return;

  // Filter videos based on Search Query
  let filtered = [...state.videos];
  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    filtered = filtered.filter(v => 
      v.title.toLowerCase().includes(q) || 
      v.creator.toLowerCase().includes(q)
    );
  }

  // Sort videos
  filtered.sort((a, b) => {
    let valA = a[state.sortBy];
    let valB = b[state.sortBy];

    // Resolve category name if sorting by category
    if (state.sortBy === 'category') {
      valA = state.categories.find(c => c.id === a.category)?.name || a.category;
      valB = state.categories.find(c => c.id === b.category)?.name || b.category;
    }

    if (typeof valA === 'string') {
      return state.sortOrder === 'asc' 
        ? valA.localeCompare(valB) 
        : valB.localeCompare(valA);
    } else {
      return state.sortOrder === 'asc' 
        ? valA - valB 
        : valB - valA;
    }
  });

  // Paginate videos
  const totalItems = filtered.length;
  if (countSpan) countSpan.innerText = `${totalItems} total video${totalItems === 1 ? '' : 's'}`;

  const totalPages = Math.ceil(totalItems / state.itemsPerPage) || 1;
  if (state.currentPage > totalPages) state.currentPage = totalPages;

  const startIdx = (state.currentPage - 1) * state.itemsPerPage;
  const pageItems = filtered.slice(startIdx, startIdx + state.itemsPerPage);

  // Render rows
  if (pageItems.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:var(--space-2xl);">No videos found matching search.</td></tr>';
    renderPaginationControls(state, totalPages);
    return;
  }

  tbody.innerHTML = pageItems.map(vid => {
    const catName = state.categories.find(c => c.id === vid.category)?.name || vid.category;
    const isChecked = state.selectedIds.includes(vid.id) ? 'checked' : '';
    const statusBadgeClass = vid.status === 'published' ? 'badge-success' : 'badge-warning';

    return `
      <tr data-video-id="${vid.id}">
        <td class="checkbox-cell">
          <input type="checkbox" class="admin-checkbox row-select-checkbox" data-id="${vid.id}" ${isChecked}>
        </td>
        <td>
          <div class="video-cell-thumb">
            <img src="${vid.thumbnail}" alt="Thumbnail">
          </div>
        </td>
        <td>
          <div class="inline-editable edit-title" data-id="${vid.id}">${vid.title}</div>
        </td>
        <td>
          <div class="inline-editable edit-category" data-id="${vid.id}" data-value="${vid.category}">${catName}</div>
        </td>
        <td style="font-family: var(--font-mono);">${Number(vid.views).toLocaleString()}</td>
        <td style="font-family: var(--font-mono);">${Number(vid.likes).toLocaleString()}</td>
        <td>
          <div class="inline-editable edit-status" data-id="${vid.id}" data-value="${vid.status}">
            <span class="badge ${statusBadgeClass}">${vid.status}</span>
          </div>
        </td>
        <td class="actions-cell">
          <button class="action-icon-btn delete-btn" data-id="${vid.id}" aria-label="Delete video">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </button>
        </td>
      </tr>
    `;
  }).join('');

  // Setup cell interaction click binds (inline editing and deletion)
  bindTableRowActions(state);

  // Render pagination footer UI
  renderPaginationControls(state, totalPages);

  // Sync main checkbox header
  syncHeaderCheckbox(state, pageItems);
}

// Bind clicks inside row elements
function bindTableRowActions(state) {
  // Title Inline Edit
  document.querySelectorAll('.edit-title').forEach(el => {
    el.addEventListener('click', () => {
      if (el.querySelector('input')) return; // Already editing

      const videoId = el.dataset.id;
      const curText = el.innerText.trim();
      const input = document.createElement('input');
      input.className = 'inline-edit-input';
      input.value = curText;
      
      el.innerHTML = '';
      el.appendChild(input);
      input.focus();

      const saveEdit = () => {
        const nextVal = input.value.trim();
        if (nextVal && nextVal !== curText) {
          const vIdx = state.videos.findIndex(v => v.id === videoId);
          if (vIdx !== -1) {
            state.videos[vIdx].title = nextVal;
            window.App.saveVideos(state.videos);
            window.App.showToast('Title updated successfully.');
          }
        }
        renderTable(state);
      };

      input.addEventListener('blur', saveEdit);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') saveEdit();
        if (e.key === 'Escape') renderTable(state);
      });
    });
  });

  // Category Inline Edit
  document.querySelectorAll('.edit-category').forEach(el => {
    el.addEventListener('click', () => {
      if (el.querySelector('select')) return;

      const videoId = el.dataset.id;
      const curVal = el.dataset.value;
      const select = document.createElement('select');
      select.className = 'inline-edit-select';
      
      select.innerHTML = state.categories.map(c => 
        `<option value="${c.id}" ${c.id === curVal ? 'selected' : ''}>${c.name}</option>`
      ).join('');

      el.innerHTML = '';
      el.appendChild(select);
      select.focus();

      const saveEdit = () => {
        const nextVal = select.value;
        if (nextVal !== curVal) {
          const vIdx = state.videos.findIndex(v => v.id === videoId);
          if (vIdx !== -1) {
            state.videos[vIdx].category = nextVal;
            window.App.saveVideos(state.videos);
            window.App.showToast('Category updated successfully.');
          }
        }
        renderTable(state);
      };

      select.addEventListener('blur', saveEdit);
      select.addEventListener('change', saveEdit);
      select.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') renderTable(state);
      });
    });
  });

  // Status Inline Edit
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
        renderTable(state);
      };

      select.addEventListener('blur', saveEdit);
      select.addEventListener('change', saveEdit);
      select.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') renderTable(state);
      });
    });
  });

  // Single Delete button trigger confirmation
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
          renderTable(state);
        }
      );
    });
  });

  // Individual Row checkboxes selection sync
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

// Generate pagination numbers and bindings
function renderPaginationControls(state, totalPages) {
  const container = document.getElementById('pagination-wrapper');
  if (!container) return;

  const startIdx = (state.currentPage - 1) * state.itemsPerPage + 1;
  let endIdx = state.currentPage * state.itemsPerPage;
  const totalItems = state.videos.length;
  if (endIdx > totalItems) endIdx = totalItems;

  const prevDisabled = state.currentPage === 1 ? 'disabled' : '';
  const nextDisabled = state.currentPage === totalPages ? 'disabled' : '';

  // Page index pills list
  let pageButtons = '';
  for (let i = 1; i <= totalPages; i++) {
    pageButtons += `
      <button class="pagination-btn ${state.currentPage === i ? 'active' : ''}" data-page="${i}">
        ${i}
      </button>
    `;
  }

  container.innerHTML = `
    <div class="pagination-container">
      <div>
        Showing <span style="font-weight:600; color:var(--text-primary);">${totalItems === 0 ? 0 : startIdx}-${endIdx}</span> of <span style="font-weight:600; color:var(--text-primary);">${totalItems}</span> videos
      </div>
      <div class="pagination-controls">
        <button class="pagination-btn ${prevDisabled}" id="prev-page-btn" aria-label="Previous page">
          &larr;
        </button>
        ${pageButtons}
        <button class="pagination-btn ${nextDisabled}" id="next-page-btn" aria-label="Next page">
          &rarr;
        </button>
      </div>
    </div>
  `;

  // Bind controls
  const prevBtn = document.getElementById('prev-page-btn');
  const nextBtn = document.getElementById('next-page-btn');

  if (prevBtn && state.currentPage > 1) {
    prevBtn.addEventListener('click', () => {
      state.currentPage -= 1;
      renderTable(state);
    });
  }

  if (nextBtn && state.currentPage < totalPages) {
    nextBtn.addEventListener('click', () => {
      state.currentPage += 1;
      renderTable(state);
    });
  }

  container.querySelectorAll('.pagination-btn[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.currentPage = Number(btn.dataset.page);
      renderTable(state);
    });
  });
}

// Table column header sort bindings
function setupTableSorting(state) {
  document.querySelectorAll('.sortable-header').forEach(header => {
    header.addEventListener('click', () => {
      const field = header.dataset.sort;
      
      // Determine next sort direction
      if (state.sortBy === field) {
        state.sortOrder = state.sortOrder === 'asc' ? 'desc' : 'asc';
      } else {
        state.sortBy = field;
        state.sortOrder = 'asc';
      }

      // Reset Active classes on headers
      document.querySelectorAll('.sortable-header').forEach(h => {
        h.classList.remove('asc', 'desc');
      });

      header.classList.add(state.sortOrder);
      
      state.currentPage = 1;
      renderTable(state);
    });
  });
}

// Table search input debouncing
function setupTableSearch(state) {
  const searchInput = document.getElementById('table-search-input');
  if (!searchInput) return;

  let searchDebounce;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      state.searchQuery = searchInput.value.trim();
      state.currentPage = 1;
      renderTable(state);
    }, 250);
  });
}

// Bulk Selection (Header checkbox toggle)
function setupBulkSelection(state) {
  const headerCheckbox = document.getElementById('header-checkbox');
  if (!headerCheckbox) return;

  headerCheckbox.addEventListener('change', () => {
    const isChecked = headerCheckbox.checked;
    
    // Select/deselect current page items
    const rowCheckboxes = document.querySelectorAll('.row-select-checkbox');
    rowCheckboxes.forEach(cb => {
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

// Sync header checkbox visual state based on whether all visible page rows are selected
function syncHeaderCheckbox(state, pageItems) {
  const headerCheckbox = document.getElementById('header-checkbox');
  if (!headerCheckbox || pageItems.length === 0) return;

  const allSelected = pageItems.every(vid => state.selectedIds.includes(vid.id));
  headerCheckbox.checked = allSelected;
  syncBulkButtonDisplay(state);
}

// Manage bulk action buttons display
function syncBulkButtonDisplay(state) {
  const bulkBar = document.getElementById('bulk-actions-bar');
  const countSpan = document.getElementById('bulk-selected-count');
  
  if (!bulkBar) return;

  const count = state.selectedIds.length;
  if (count > 0) {
    bulkBar.style.display = 'flex';
    if (countSpan) countSpan.innerText = `${count} selected`;
  } else {
    bulkBar.style.display = 'none';
  }
}

// Setup bulk operation buttons (Delete selected)
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
        renderTable(state);
      }
    );
  });
}
