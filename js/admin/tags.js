document.addEventListener('DOMContentLoaded', () => {
  window.Components.injectAdminSidebar('tags');

  const TAG_PALETTE = ['#0070f3','#7928ca','#ff0080','#ffa42b','#50e3c2','#539df5','#1db954','#f3727f','#e91e63','#ff5722','#9c27b0','#00bcd4','#ff9800','#4caf50','#f44336','#3f51b5'];

  const state = {
    tags: window.App.getTags(),
    currentPage: 1,
    itemsPerPage: 12,
    searchQuery: '',
    selectedIds: [],
    sortBy: 'name',
    sortOrder: 'asc'
  };

  renderTags(state);

  document.getElementById('add-tag-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const name = e.target.value.trim();
      if (!name) return;
      if (state.tags.some(t => t.name.toLowerCase() === name.toLowerCase())) {
        window.App.showToast('Tag already exists.', 'warning');
        return;
      }
      const id = 'tag-' + Date.now();
      const color = TAG_PALETTE[Math.floor(Math.random() * TAG_PALETTE.length)];
      state.tags.push({ id, name, color, usageCount: 0, createdDate: new Date().toISOString().split('T')[0] });
      window.App.saveTags(state.tags);
      e.target.value = '';
      window.App.showToast('Tag added successfully.');
      renderTags(state);
    }
  });

  const searchInput = document.getElementById('table-search-input');
  searchInput.addEventListener('input', () => {
    state.searchQuery = searchInput.value.trim().toLowerCase();
    state.currentPage = 1;
    renderTags(state);
  });

  document.getElementById('sort-select').addEventListener('change', function() {
    const [field, order] = this.value.split('-');
    state.sortBy = field;
    state.sortOrder = order;
    state.currentPage = 1;
    renderTags(state);
  });

  document.getElementById('merge-btn').addEventListener('click', () => mergeTags(state));

  document.getElementById('header-checkbox').addEventListener('change', function() {
    document.querySelectorAll('.tag-card-checkbox').forEach(cb => {
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

function renderTagChips(state) {
  const container = document.getElementById('tags-chips-container');
  if (!container) return;
  if (!state.tags.length) {
    container.innerHTML = '<span class="chips-empty">No tags created yet.</span>';
    return;
  }

  const isFiltered = state.searchQuery.length > 0;

  container.innerHTML = state.tags.map(t => {
    const active = isFiltered && t.name.toLowerCase() === state.searchQuery;
    return `
      <span class="tag-chip-preview ${active ? 'active-filter' : ''}" data-name="${t.name.toLowerCase()}" title="${active ? 'Click to clear filter' : 'Click to filter by this tag'}">
        <span class="tag-chip-color" style="background-color:${t.color || '#888'};"></span>
        ${t.name}
      </span>
    `;
  }).join('');

  container.querySelectorAll('.tag-chip-preview').forEach(el => {
    el.addEventListener('click', () => {
      const name = el.dataset.name;
      const input = document.getElementById('table-search-input');
      if (input.value.trim().toLowerCase() === name) {
        input.value = '';
        state.searchQuery = '';
      } else {
        input.value = name;
        state.searchQuery = name;
      }
      state.currentPage = 1;
      renderTags(state);
    });
  });
}

function getMaxUsage(tags) {
  const videos = window.App.getVideos();
  let max = 0;
  tags.forEach(t => {
    const count = videos.filter(v => v.tags && v.tags.includes(t.id)).length;
    if (count > max) max = count;
  });
  return max || 1;
}

function renderTags(state) {
  renderTagChips(state);

  const grid = document.getElementById('tags-grid');
  const countSpan = document.getElementById('table-count-span');
  if (!grid) return;

  let filtered = [...state.tags];
  if (state.searchQuery) {
    filtered = filtered.filter(t => t.name.toLowerCase().includes(state.searchQuery));
  }

  const videos = window.App.getVideos();
  const maxUsage = getMaxUsage(state.tags);

  filtered.sort((a, b) => {
    if (state.sortBy === 'usage') {
      const valA = videos.filter(v => v.tags && v.tags.includes(a.id)).length;
      const valB = videos.filter(v => v.tags && v.tags.includes(b.id)).length;
      return state.sortOrder === 'asc' ? valA - valB : valB - valA;
    }
    const valA = a[state.sortBy] || '';
    const valB = b[state.sortBy] || '';
    return state.sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
  });

  const totalItems = filtered.length;
  countSpan.textContent = `${totalItems} tag${totalItems !== 1 ? 's' : ''}`;

  const totalPages = Math.ceil(totalItems / state.itemsPerPage) || 1;
  if (state.currentPage > totalPages) state.currentPage = totalPages;

  const startIdx = (state.currentPage - 1) * state.itemsPerPage;
  const pageItems = filtered.slice(startIdx, startIdx + state.itemsPerPage);

  if (pageItems.length === 0) {
    grid.innerHTML = '<div class="tags-empty"><div class="empty-icon">🏷️</div>No tags found matching your search.</div>';
    renderPagination(state, totalItems, totalPages);
    updateMergeBar(state);
    return;
  }

  grid.innerHTML = pageItems.map((tag, idx) => {
    const usageCount = videos.filter(v => v.tags && v.tags.includes(tag.id)).length;
    const usagePercent = Math.round((usageCount / maxUsage) * 100);
    const isChecked = state.selectedIds.includes(tag.id) ? 'checked' : '';
    const color = tag.color || '#888';

    return `
      <div class="tag-card" data-id="${tag.id}" style="animation-delay:${idx * 0.05}s; --tag-color:${color};">
        <div class="tag-card-accent" style="background:linear-gradient(90deg, ${color}, ${color}44);"></div>
        <div class="tag-card-check">
          <input type="checkbox" class="tag-card-checkbox" data-id="${tag.id}" ${isChecked}>
        </div>
        <div class="tag-card-body">
          <div class="tag-card-name-row">
            <span class="tag-card-dot" style="background-color:${color};"></span>
            <span class="tag-card-name" data-id="${tag.id}">${tag.name}</span>
          </div>
          <div class="tag-card-usage">
            <span class="tag-card-usage-text">${usageCount} video${usageCount !== 1 ? 's' : ''}</span>
            <div class="tag-card-usage-bar">
              <div class="tag-card-usage-fill" style="width:${usagePercent}%; background-color:${color};"></div>
            </div>
          </div>
          <div class="tag-card-date">${tag.createdDate || '—'}</div>
        </div>
        <div class="tag-card-actions">
          <button class="tag-card-action edit-tag-name-btn" data-id="${tag.id}" aria-label="Rename tag">
            <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="tag-card-action delete-tag-btn" data-id="${tag.id}" aria-label="Delete tag">
            <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
    `;
  }).join('');

  bindTagCardActions(state);
  syncTagHeaderCheckbox(state);
  renderPagination(state, totalItems, totalPages);
  updateMergeBar(state);
}

function bindTagCardActions(state) {
  // Inline edit name (click on name)
  document.querySelectorAll('.tag-card-name').forEach(el => {
    el.addEventListener('click', () => {
      if (el.querySelector('input')) return;
      const id = el.dataset.id;
      const tag = state.tags.find(t => t.id === id);
      if (!tag) return;

      const input = document.createElement('input');
      input.className = 'tag-inline-input';
      input.value = tag.name;
      el.innerHTML = '';
      el.appendChild(input);
      input.focus();
      input.select();

      const save = () => {
        const val = input.value.trim();
        if (val && val !== tag.name) {
          if (state.tags.some(t => t.name.toLowerCase() === val.toLowerCase() && t.id !== tag.id)) {
            window.App.showToast('Tag name already exists.', 'warning');
          } else {
            tag.name = val;
            window.App.saveTags(state.tags);
            window.App.showToast('Tag updated.');
          }
        }
        renderTags(state);
      };

      input.addEventListener('blur', save);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); save(); }
        if (e.key === 'Escape') renderTags(state);
      });
    });
  });

  // Edit button also triggers inline edit on the name
  document.querySelectorAll('.edit-tag-name-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const nameEl = document.querySelector(`.tag-card-name[data-id="${id}"]`);
      if (nameEl) nameEl.click();
    });
  });

  // Delete
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
        renderTags(state);
      });
      openModal('confirm-delete-overlay');
    });
  });

  // Checkbox
  document.querySelectorAll('.tag-card-checkbox').forEach(cb => {
    cb.addEventListener('change', () => {
      const id = cb.dataset.id;
      if (cb.checked) {
        if (!state.selectedIds.includes(id)) state.selectedIds.push(id);
      } else {
        state.selectedIds = state.selectedIds.filter(v => v !== id);
      }
      updateMergeBar(state);
      syncTagHeaderCheckbox(state);
    });
  });
}

function syncTagHeaderCheckbox(state, pageItems) {
  const headerCheckbox = document.getElementById('header-checkbox');
  if (!headerCheckbox) return;
  if (!pageItems) {
    pageItems = document.querySelectorAll('.tag-card-checkbox');
  }
  if (!pageItems.length) { headerCheckbox.checked = false; return; }
  const allChecked = Array.from(pageItems).every(cb => cb.checked);
  headerCheckbox.checked = allChecked;
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
    document.getElementById('prev-page').addEventListener('click', () => { state.currentPage--; renderTags(state); });
  }
  if (state.currentPage < totalPages) {
    document.getElementById('next-page').addEventListener('click', () => { state.currentPage++; renderTags(state); });
  }
  container.querySelectorAll('[data-page]').forEach(btn => {
    btn.addEventListener('click', () => { state.currentPage = Number(btn.dataset.page); renderTags(state); });
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
        if (idx !== -1) { v.tags[idx] = targetId; changed = true; }
      });
      if (changed) v.tags = [...new Set(v.tags)];
    }
  });

  window.App.saveVideos(videos);
  window.App.saveTags(state.tags);
  state.selectedIds = [];
  window.App.showToast(`Merged ${mergeNames.join(', ')} into ${targetTag.name}.`);
  renderTags(state);
}

function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }
