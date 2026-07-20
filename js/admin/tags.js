document.addEventListener('DOMContentLoaded', () => {
  window.Components.injectAdminSidebar('tags');

  const TAG_PALETTE = ['#0070f3','#7928ca','#ff0080','#ffa42b','#50e3c2','#539df5','#1db954','#f3727f','#e91e63','#ff5722','#9c27b0','#00bcd4','#ff9800','#4caf50','#f44336','#3f51b5'];

  const state = {
    tags: window.App.getTags(),
    currentPage: 1,
    itemsPerPage: 10,
    searchQuery: '',
    selectedIds: [],
    sortBy: 'name',
    sortOrder: 'asc'
  };

  renderTagsTable(state);

  document.getElementById('add-tag-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const name = e.target.value.trim();
      if (!name) return;
      const exists = state.tags.some(t => t.name.toLowerCase() === name.toLowerCase());
      if (exists) {
        window.App.showToast('Tag already exists.', 'warning');
        return;
      }
      const id = 'tag-' + Date.now();
      const color = TAG_PALETTE[Math.floor(Math.random() * TAG_PALETTE.length)];
      state.tags.push({ id, name, color, usageCount: 0, createdDate: new Date().toISOString().split('T')[0] });
      window.App.saveTags(state.tags);
      e.target.value = '';
      window.App.showToast('Tag added successfully.');
      renderTagsTable(state);
    }
  });

  document.getElementById('table-search-input').addEventListener('input', () => {
    state.searchQuery = document.getElementById('table-search-input').value.trim().toLowerCase();
    state.currentPage = 1;
    renderTagsTable(state);
  });

  document.getElementById('merge-btn').addEventListener('click', () => mergeTags(state));

  document.getElementById('header-checkbox').addEventListener('change', function() {
    const visibleRows = document.querySelectorAll('.tag-row-checkbox');
    visibleRows.forEach(cb => {
      cb.checked = this.checked;
      const id = cb.dataset.id;
      if (this.checked) {
        if (!state.selectedIds.includes(id)) state.selectedIds.push(id);
      } else {
        state.selectedIds = state.selectedIds.filter(v => v !== id);
      }
    });
    updateMergeBar(state);
  });

  document.getElementById('confirm-delete-overlay').querySelector('.modal-close').addEventListener('click', () => closeModal('confirm-delete-overlay'));
  document.getElementById('cancel-delete-btn').addEventListener('click', () => closeModal('confirm-delete-overlay'));
  document.getElementById('confirm-delete-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal('confirm-delete-overlay');
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal('confirm-delete-overlay');
  });
});

function renderTagsTable(state) {
  const tbody = document.getElementById('tags-tbody');
  const countSpan = document.getElementById('table-count-span');

  let filtered = [...state.tags];
  if (state.searchQuery) {
    filtered = filtered.filter(t => t.name.toLowerCase().includes(state.searchQuery));
  }

  const videos = window.App.getVideos();

  filtered.sort((a, b) => {
    if (state.sortBy === 'usage') {
      const valA = videos.filter(v => v.tags && v.tags.includes(a.id)).length;
      const valB = videos.filter(v => v.tags && v.tags.includes(b.id)).length;
      return state.sortOrder === 'asc' ? valA - valB : valB - valA;
    }
    const valA = a[state.sortBy] || '';
    const valB = b[state.sortBy] || '';
    if (typeof valA === 'string') {
      return state.sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    return state.sortOrder === 'asc' ? valA - valB : valB - valA;
  });

  const totalItems = filtered.length;
  countSpan.textContent = `${totalItems} tag${totalItems !== 1 ? 's' : ''}`;

  const totalPages = Math.ceil(totalItems / state.itemsPerPage) || 1;
  if (state.currentPage > totalPages) state.currentPage = totalPages;

  const startIdx = (state.currentPage - 1) * state.itemsPerPage;
  const pageItems = filtered.slice(startIdx, startIdx + state.itemsPerPage);

  if (pageItems.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:var(--space-2xl);">No tags found.</td></tr>';
    renderPagination(state, totalItems, totalPages);
    return;
  }

  tbody.innerHTML = pageItems.map(tag => {
    const usageCount = videos.filter(v => v.tags && v.tags.includes(tag.id)).length;
    const isChecked = state.selectedIds.includes(tag.id) ? 'checked' : '';
    return `
      <tr data-id="${tag.id}">
        <td class="checkbox-cell">
          <input type="checkbox" class="admin-checkbox tag-row-checkbox" data-id="${tag.id}" ${isChecked}>
        </td>
        <td>
          <span class="tag-name-display" data-id="${tag.id}">${tag.name}</span>
        </td>
        <td style="font-family:var(--font-mono);">${usageCount}</td>
        <td>${tag.createdDate || '-'}</td>
        <td>
          <div style="display:flex;gap:var(--space-xs);">
            <button class="action-icon-btn edit-tag-btn" data-id="${tag.id}" aria-label="Edit tag">
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button class="action-icon-btn delete-btn delete-tag-btn" data-id="${tag.id}" aria-label="Delete tag">
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  bindTagActions(state, filtered);
  renderPagination(state, totalItems, totalPages);
  updateMergeBar(state);
}

function bindTagActions(state, filtered) {
  document.querySelectorAll('.edit-tag-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tag = state.tags.find(t => t.id === btn.dataset.id);
      if (!tag) return;
      const display = document.querySelector(`.tag-name-display[data-id="${tag.id}"]`);
      if (!display || display.querySelector('input')) return;

      const input = document.createElement('input');
      input.className = 'inline-edit-input';
      input.value = tag.name;
      input.style.width = '140px';
      display.innerHTML = '';
      display.appendChild(input);
      input.focus();
      input.select();

      const save = () => {
        const val = input.value.trim();
        if (val && val !== tag.name) {
          const exists = state.tags.some(t => t.name.toLowerCase() === val.toLowerCase() && t.id !== tag.id);
          if (exists) {
            window.App.showToast('Tag name already exists.', 'warning');
          } else {
            tag.name = val;
            window.App.saveTags(state.tags);
            window.App.showToast('Tag updated.');
          }
        }
        renderTagsTable(state);
      };

      input.addEventListener('blur', save);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') save();
        if (e.key === 'Escape') renderTagsTable(state);
      });
    });
  });

  document.querySelectorAll('.delete-tag-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tag = state.tags.find(t => t.id === btn.dataset.id);
      if (!tag) return;
      const videos = window.App.getVideos();
      const usageCount = videos.filter(v => v.tags && v.tags.includes(tag.id)).length;
      document.getElementById('delete-warning-text').textContent = usageCount > 0
        ? `This tag is used in ${usageCount} video${usageCount !== 1 ? 's' : ''}.`
        : 'This tag is not used in any videos.';
      document.getElementById('confirm-delete-btn').replaceWith(
        document.getElementById('confirm-delete-btn').cloneNode(true)
      );
      document.getElementById('confirm-delete-btn').addEventListener('click', () => {
        state.tags = state.tags.filter(t => t.id !== tag.id);
        window.App.saveTags(state.tags);
        state.selectedIds = state.selectedIds.filter(id => id !== tag.id);
        window.App.showToast('Tag deleted.');
        closeModal('confirm-delete-overlay');
        renderTagsTable(state);
      });
      openModal('confirm-delete-overlay');
    });
  });

  document.querySelectorAll('.tag-row-checkbox').forEach(cb => {
    cb.addEventListener('change', () => {
      const id = cb.dataset.id;
      if (cb.checked) {
        if (!state.selectedIds.includes(id)) state.selectedIds.push(id);
      } else {
        state.selectedIds = state.selectedIds.filter(v => v !== id);
      }
      updateMergeBar(state);
    });
  });

  document.querySelectorAll('.sortable-header').forEach(header => {
    header.addEventListener('click', () => {
      const field = header.dataset.sort;
      if (state.sortBy === field) {
        state.sortOrder = state.sortOrder === 'asc' ? 'desc' : 'asc';
      } else {
        state.sortBy = field;
        state.sortOrder = 'asc';
      }
      document.querySelectorAll('.sortable-header').forEach(h => h.classList.remove('asc', 'desc'));
      header.classList.add(state.sortOrder);
      state.currentPage = 1;
      renderTagsTable(state);
    });
  });
}

function renderPagination(state, totalItems, totalPages) {
  const container = document.getElementById('pagination-wrapper');
  if (!container) return;
  const startIdx = (state.currentPage - 1) * state.itemsPerPage + 1;
  let endIdx = state.currentPage * state.itemsPerPage;
  if (endIdx > totalItems) endIdx = totalItems;

  let pageBtns = '';
  for (let i = 1; i <= totalPages; i++) {
    pageBtns += `<button class="pagination-btn ${i === state.currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
  }

  container.innerHTML = `
    <div class="pagination-container">
      <div>Showing <span style="font-weight:600;color:var(--text-primary);">${totalItems === 0 ? 0 : startIdx}-${endIdx}</span> of <span style="font-weight:600;color:var(--text-primary);">${totalItems}</span> tags</div>
      <div class="pagination-controls">
        <button class="pagination-btn ${state.currentPage === 1 ? 'disabled' : ''}" id="prev-page">&larr;</button>
        ${pageBtns}
        <button class="pagination-btn ${state.currentPage === totalPages ? 'disabled' : ''}" id="next-page">&rarr;</button>
      </div>
    </div>
  `;

  if (state.currentPage > 1) {
    document.getElementById('prev-page').addEventListener('click', () => {
      state.currentPage--;
      renderTagsTable(state);
    });
  }
  if (state.currentPage < totalPages) {
    document.getElementById('next-page').addEventListener('click', () => {
      state.currentPage++;
      renderTagsTable(state);
    });
  }
  container.querySelectorAll('[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.currentPage = Number(btn.dataset.page);
      renderTagsTable(state);
    });
  });
}

function updateMergeBar(state) {
  const bar = document.getElementById('merge-bar');
  const countSpan = document.getElementById('merge-count');
  const select = document.getElementById('merge-target-select');

  if (state.selectedIds.length < 2) {
    bar.classList.add('hidden');
    return;
  }

  bar.classList.remove('hidden');
  countSpan.textContent = state.selectedIds.length;

  const selectedTags = state.tags.filter(t => state.selectedIds.includes(t.id));
  select.innerHTML = selectedTags.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
}

function mergeTags(state) {
  const targetId = document.getElementById('merge-target-select').value;
  if (!targetId) return;
  const idsToMerge = state.selectedIds.filter(id => id !== targetId);
  if (idsToMerge.length === 0) return;

  const targetTag = state.tags.find(t => t.id === targetId);
  const mergeNames = idsToMerge.map(id => state.tags.find(t => t.id === id)?.name).filter(Boolean);

  state.tags = state.tags.filter(t => !idsToMerge.includes(t.id));

  const videos = window.App.getVideos();
  videos.forEach(v => {
    if (v.tags) {
      let changed = false;
      idsToMerge.forEach(id => {
        const idx = v.tags.indexOf(id);
        if (idx !== -1) {
          v.tags[idx] = targetId;
          changed = true;
        }
      });
      if (changed) {
        v.tags = [...new Set(v.tags)];
      }
    }
  });

  window.App.saveVideos(videos);
  window.App.saveTags(state.tags);
  state.selectedIds = [];
  window.App.showToast(`Merged ${mergeNames.join(', ')} into ${targetTag.name}.`);
  renderTagsTable(state);
}

function openModal(id) {
  document.getElementById(id).classList.add('active');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}
