// ============================================================
// Tags.js - Tag management CRUD: create, read, update, delete,
// inline rename, merge, pagination, search, sort
// ============================================================

// Wait for the DOM to be fully loaded before initializing
document.addEventListener('DOMContentLoaded', () => {
  // Inject the admin sidebar, highlighting "tags" as active
  window.Components.injectAdminSidebar('tags');

  // Color palette for auto-generating new tag colors
  const TAG_PALETTE = ['#0070f3','#7928ca','#ff0080','#ffa42b','#50e3c2','#539df5','#1db954','#f3727f','#e91e63','#ff5722','#9c27b0','#00bcd4','#ff9800','#4caf50','#f44336','#3f51b5'];

  // Central state for the tags page
  const state = {
    tags: window.App.getTags(),    // Array of all tag objects
    currentPage: 1,                // Current pagination page
    itemsPerPage: 12,              // Tags per page
    searchQuery: '',               // Current search/filter text
    selectedIds: [],               // Array of tag IDs checked for merge
    sortBy: 'name',                // Field to sort by
    sortOrder: 'asc'               // Sort direction
  };

  renderTags(state);  // Initial render

  // -------- Add tag input (Enter key) --------
  document.getElementById('add-tag-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const name = e.target.value.trim();
      if (!name) return;  // Ignore empty input
      // Check for duplicate tag names (case-insensitive)
      if (state.tags.some(t => t.name.toLowerCase() === name.toLowerCase())) {
        window.App.showToast('Tag already exists.', 'warning');
        return;
      }
      // Create a new tag with a unique ID and random color
      const id = 'tag-' + Date.now();
      const color = TAG_PALETTE[Math.floor(Math.random() * TAG_PALETTE.length)];
      state.tags.push({ id, name, color, usageCount: 0, createdDate: new Date().toISOString().split('T')[0] });
      window.App.saveTags(state.tags);  // Persist
      e.target.value = '';  // Clear the input
      window.App.showToast('Tag added successfully.');
      renderTags(state);  // Re-render
    }
  });

  // -------- Search input --------
  const searchInput = document.getElementById('table-search-input');
  searchInput.addEventListener('input', () => {
    state.searchQuery = searchInput.value.trim().toLowerCase();
    state.currentPage = 1;  // Reset to first page
    renderTags(state);
  });

  // -------- Sort dropdown --------
  document.getElementById('sort-select').addEventListener('change', function() {
    const [field, order] = this.value.split('-');  // e.g., "name-asc"
    state.sortBy = field;
    state.sortOrder = order;
    state.currentPage = 1;
    renderTags(state);
  });

  // -------- Merge button --------
  document.getElementById('merge-btn').addEventListener('click', () => mergeTags(state));

  // -------- Header "select all" checkbox --------
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
    updateMergeBar(state);  // Show/hide the merge bar
  });

  // -------- Delete confirmation modal close handlers --------
  document.getElementById('confirm-delete-overlay').querySelector('.modal-close').addEventListener('click', () => closeModal('confirm-delete-overlay'));
  document.getElementById('cancel-delete-btn').addEventListener('click', () => closeModal('confirm-delete-overlay'));
  document.getElementById('confirm-delete-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal('confirm-delete-overlay');  // Click on backdrop closes
  });
  // Escape key closes the modal
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal('confirm-delete-overlay');
  });
});

// ============================================================
// Render the tag chips bar (clickable preview chips for filtering)
// ============================================================
/**
 * Renders all tags as clickable chips at the top of the page.
 * Clicking a chip either sets it as the search filter or clears the filter if already active.
 * @param {Object} state - The central state object for the tags page
 */
function renderTagChips(state) {
  const container = document.getElementById('tags-chips-container');
  if (!container) return;
  // If no tags exist, show an empty state message
  if (!state.tags.length) {
    container.innerHTML = '<span class="chips-empty">No tags created yet.</span>';
    return;
  }

  // Determine if a search filter is currently active
  const isFiltered = state.searchQuery.length > 0;

  // Generate HTML for each tag chip
  container.innerHTML = state.tags.map(t => {
    // If currently filtered and this chip matches the filter, mark as active
    const active = isFiltered && t.name.toLowerCase() === state.searchQuery;
    return `
      <span class="tag-chip-preview ${active ? 'active-filter' : ''}" data-name="${t.name.toLowerCase()}" title="${active ? 'Click to clear filter' : 'Click to filter by this tag'}">
        <span class="tag-chip-color" style="background-color:${t.color || '#888'};"></span>
        ${t.name}
      </span>
    `;
  }).join('');

  // Attach click handlers: clicking a chip toggles the search filter
  container.querySelectorAll('.tag-chip-preview').forEach(el => {
    el.addEventListener('click', () => {
      const name = el.dataset.name;
      const input = document.getElementById('table-search-input');
      // If the chip's name already matches the search, clear the filter
      if (input.value.trim().toLowerCase() === name) {
        input.value = '';
        state.searchQuery = '';
      } else {
        // Otherwise, set the search to this tag's name
        input.value = name;
        state.searchQuery = name;
      }
      state.currentPage = 1;  // Reset to first page
      renderTags(state);        // Re-render
    });
  });
}

// ============================================================
// Get the maximum usage count among all tags (for usage bar scaling)
// ============================================================
/**
 * Calculates the highest video count across all tags.
 * Used to scale the usage percentage bars proportionally.
 * @param {Array} tags - Array of tag objects
 * @returns {number} Maximum usage count (minimum 1 to avoid division by zero)
 */
function getMaxUsage(tags) {
  const videos = window.App.getVideos();
  let max = 0;
  tags.forEach(t => {
    const count = videos.filter(v => v.tags && v.tags.includes(t.id)).length;
    if (count > max) max = count;
  });
  return max || 1;  // Return at least 1 to prevent division by zero
}

// ============================================================
// Main render function: filter, sort, paginate, and display tag cards
// ============================================================
/**
 * Filters tags by search query, sorts them, paginates, and renders
 * the tag card grid. Also handles the chip bar, pagination,
 * and merge bar. Binds inline editing actions.
 * @param {Object} state - The central state object
 */
function renderTags(state) {
  // Step 1: Render the tag chips bar at the top
  renderTagChips(state);

  // Get the grid container and count span
  const grid = document.getElementById('tags-grid');
  const countSpan = document.getElementById('table-count-span');
  if (!grid) return;

  // Step 2: Apply search filter
  let filtered = [...state.tags];
  if (state.searchQuery) {
    filtered = filtered.filter(t => t.name.toLowerCase().includes(state.searchQuery));
  }

  // Step 3: Compute usage data for sorting and display
  const videos = window.App.getVideos();
  const maxUsage = getMaxUsage(state.tags);

  // Step 4: Sort the filtered tags
  filtered.sort((a, b) => {
    if (state.sortBy === 'usage') {
      // For "usage" sort, compute usage count on the fly
      const valA = videos.filter(v => v.tags && v.tags.includes(a.id)).length;
      const valB = videos.filter(v => v.tags && v.tags.includes(b.id)).length;
      return state.sortOrder === 'asc' ? valA - valB : valB - valA;
    }
    // For string fields (name, createdDate), use localeCompare
    const valA = a[state.sortBy] || '';
    const valB = b[state.sortBy] || '';
    return state.sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
  });

  // Step 5: Update the count display
  const totalItems = filtered.length;
  countSpan.textContent = `${totalItems} tag${totalItems !== 1 ? 's' : ''}`;

  // Step 6: Paginate
  const totalPages = Math.ceil(totalItems / state.itemsPerPage) || 1;
  if (state.currentPage > totalPages) state.currentPage = totalPages;

  const startIdx = (state.currentPage - 1) * state.itemsPerPage;
  const pageItems = filtered.slice(startIdx, startIdx + state.itemsPerPage);

  // Step 7: Handle empty state
  if (pageItems.length === 0) {
    grid.innerHTML = '<div class="tags-empty"><div class="empty-icon">🏷️</div>No tags found matching your search.</div>';
    renderPagination(state, totalItems, totalPages);
    updateMergeBar(state);
    return;
  }

  // Step 8: Generate HTML for each tag card
  grid.innerHTML = pageItems.map((tag, idx) => {
    // Calculate usage count and percentage for the visual bar
    const usageCount = videos.filter(v => v.tags && v.tags.includes(tag.id)).length;
    const usagePercent = Math.round((usageCount / maxUsage) * 100);
    // Check if this tag is selected for merge
    const isChecked = state.selectedIds.includes(tag.id) ? 'checked' : '';
    const color = tag.color || '#888';  // Fallback color

    return `
      <div class="tag-card" data-id="${tag.id}" style="animation-delay:${idx * 0.05}s; --tag-color:${color};">
        <!-- Color accent bar at the top of the card -->
        <div class="tag-card-accent" style="background:linear-gradient(90deg, ${color}, ${color}44);"></div>
        <!-- Checkbox for merge selection -->
        <div class="tag-card-check">
          <input type="checkbox" class="tag-card-checkbox" data-id="${tag.id}" ${isChecked}>
        </div>
        <div class="tag-card-body">
          <!-- Tag name row with color dot and clickable name (inline edit) -->
          <div class="tag-card-name-row">
            <span class="tag-card-dot" style="background-color:${color};"></span>
            <span class="tag-card-name" data-id="${tag.id}">${tag.name}</span>
          </div>
          <!-- Usage count with proportional bar -->
          <div class="tag-card-usage">
            <span class="tag-card-usage-text">${usageCount} video${usageCount !== 1 ? 's' : ''}</span>
            <div class="tag-card-usage-bar">
              <div class="tag-card-usage-fill" style="width:${usagePercent}%; background-color:${color};"></div>
            </div>
          </div>
          <!-- Created date -->
          <div class="tag-card-date">${tag.createdDate || '—'}</div>
        </div>
        <!-- Action buttons: edit (rename) and delete -->
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
  }).join('');  // Join all card HTML strings

  // Step 9: Bind card actions (inline rename, delete, checkbox)
  bindTagCardActions(state);
  // Step 10: Sync header checkbox state
  syncTagHeaderCheckbox(state);
  // Step 11: Render pagination controls
  renderPagination(state, totalItems, totalPages);
  // Step 12: Update the merge bar (show/hide)
  updateMergeBar(state);
}

// ============================================================
// Bind tag card actions: inline rename, delete with confirmation, checkbox
// ============================================================
/**
 * Attaches event listeners to tag card elements after render:
 * - Click on tag name → inline input for renaming
 * - Click on edit button → also triggers inline rename
 * - Click on delete button → confirmation modal with usage warning
 * - Checkbox change → update selected IDs for merge
 * @param {Object} state - The central state object
 */
function bindTagCardActions(state) {
  // -------- Inline edit name (click on the tag name text) --------
  document.querySelectorAll('.tag-card-name').forEach(el => {
    el.addEventListener('click', () => {
      // Guard: if an input already exists, don't create another
      if (el.querySelector('input')) return;
      const id = el.dataset.id;
      const tag = state.tags.find(t => t.id === id);
      if (!tag) return;  // Tag not found

      // Create an input field pre-filled with the current name
      const input = document.createElement('input');
      input.className = 'tag-inline-input';
      input.value = tag.name;
      el.innerHTML = '';     // Clear the span content
      el.appendChild(input); // Add the input
      input.focus();         // Auto-focus
      input.select();        // Select all text for easy replacement

      // Save function: validates and persists the new name
      const save = () => {
        const val = input.value.trim();
        if (val && val !== tag.name) {
          // Check for duplicate name (case-insensitive, exclude current tag)
          if (state.tags.some(t => t.name.toLowerCase() === val.toLowerCase() && t.id !== tag.id)) {
            window.App.showToast('Tag name already exists.', 'warning');
          } else {
            tag.name = val;                    // Update in state
            window.App.saveTags(state.tags);    // Persist
            window.App.showToast('Tag updated.');
          }
        }
        renderTags(state);  // Re-render to restore the span view
      };

      // Save on blur (input loses focus)
      input.addEventListener('blur', save);
      // Save on Enter, cancel on Escape
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); save(); }
        if (e.key === 'Escape') renderTags(state);
      });
    });
  });

  // -------- Edit button (pencil icon) also triggers inline edit on the name --------
  document.querySelectorAll('.edit-tag-name-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      // Find the name element and simulate a click on it
      const nameEl = document.querySelector(`.tag-card-name[data-id="${id}"]`);
      if (nameEl) nameEl.click();
    });
  });

  // -------- Delete button (trash icon) with confirmation modal --------
  document.querySelectorAll('.delete-tag-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tag = state.tags.find(t => t.id === btn.dataset.id);
      if (!tag) return;  // Tag not found

      // Determine how many videos use this tag (for the warning message)
      const videos = window.App.getVideos();
      const usageCount = videos.filter(v => v.tags && v.tags.includes(tag.id)).length;
      // Update the modal warning text
      document.getElementById('delete-warning-text').textContent = usageCount > 0
        ? `This tag is used in ${usageCount} video${usageCount !== 1 ? 's' : ''}.`
        : 'This tag is not used in any videos.';

      // Clone the confirm button to remove any previously attached event listeners
      document.getElementById('confirm-delete-btn').replaceWith(
        document.getElementById('confirm-delete-btn').cloneNode(true)
      );
      // Attach fresh click handler to the cloned confirm button
      document.getElementById('confirm-delete-btn').addEventListener('click', () => {
        // Remove the tag from state
        state.tags = state.tags.filter(t => t.id !== tag.id);
        window.App.saveTags(state.tags);  // Persist
        // Also remove from selectedIds if it was selected
        state.selectedIds = state.selectedIds.filter(id => id !== tag.id);
        window.App.showToast('Tag deleted.');
        closeModal('confirm-delete-overlay');  // Close the modal
        renderTags(state);  // Re-render
      });

      openModal('confirm-delete-overlay');  // Show the modal
    });
  });

  // -------- Checkbox (for merge selection) --------
  document.querySelectorAll('.tag-card-checkbox').forEach(cb => {
    cb.addEventListener('change', () => {
      const id = cb.dataset.id;
      if (cb.checked) {
        if (!state.selectedIds.includes(id)) state.selectedIds.push(id);
      } else {
        state.selectedIds = state.selectedIds.filter(v => v !== id);
      }
      updateMergeBar(state);        // Show/hide the merge bar
      syncTagHeaderCheckbox(state);  // Sync the header checkbox
    });
  });
}

// ============================================================
// Sync the header "select all" checkbox with visible card checkboxes
// ============================================================
/**
 * Checks if all visible tag card checkboxes are checked and updates
 * the header checkbox accordingly.
 * @param {Object} state     - The central state object
 * @param {NodeList} [pageItems] - Optional NodeList of checkbox elements; defaults to querying the DOM
 */
function syncTagHeaderCheckbox(state, pageItems) {
  const headerCheckbox = document.getElementById('header-checkbox');
  if (!headerCheckbox) return;
  if (!pageItems) {
    // If no specific page items provided, get all tag card checkboxes from the DOM
    pageItems = document.querySelectorAll('.tag-card-checkbox');
  }
  // If no checkboxes exist, uncheck the header
  if (!pageItems.length) { headerCheckbox.checked = false; return; }
  // Header is checked only if every visible checkbox is checked
  const allChecked = Array.from(pageItems).every(cb => cb.checked);
  headerCheckbox.checked = allChecked;
}

// ============================================================
// Render pagination controls for tags page
// ============================================================
/**
 * Builds and injects pagination HTML (prev/next, page number buttons,
 * "Showing X-Y of Z" summary). Attaches click handlers.
 * @param {Object} state      - The central state object
 * @param {number} totalItems - Total number of filtered tag items
 * @param {number} totalPages - Total number of pages
 */
function renderPagination(state, totalItems, totalPages) {
  const container = document.getElementById('pagination-wrapper');
  if (!container) return;

  // Calculate display indices
  const startIdx = (state.currentPage - 1) * state.itemsPerPage + 1;
  let endIdx = state.currentPage * state.itemsPerPage;
  if (endIdx > totalItems) endIdx = totalItems;

  // Build page number buttons
  let pageBtns = '';
  for (let i = 1; i <= totalPages; i++) {
    pageBtns += `<button class="pagination-btn ${i === state.currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
  }

  // Inject pagination HTML
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

  // Previous page button (disabled on first page)
  if (state.currentPage > 1) {
    document.getElementById('prev-page').addEventListener('click', () => { state.currentPage--; renderTags(state); });
  }
  // Next page button (disabled on last page)
  if (state.currentPage < totalPages) {
    document.getElementById('next-page').addEventListener('click', () => { state.currentPage++; renderTags(state); });
  }
  // Page number buttons
  container.querySelectorAll('[data-page]').forEach(btn => {
    btn.addEventListener('click', () => { state.currentPage = Number(btn.dataset.page); renderTags(state); });
  });
}

// ============================================================
// Update the merge bar visibility and content
// ============================================================
/**
 * Shows or hides the merge bar based on how many tags are selected.
 * When 2+ tags are selected, shows the bar with a count and a target select dropdown.
 * @param {Object} state - The central state object
 */
function updateMergeBar(state) {
  const bar = document.getElementById('merge-bar');
  const countSpan = document.getElementById('merge-count');
  const select = document.getElementById('merge-target-select');

  // Need at least 2 tags selected to enable merging
  if (state.selectedIds.length < 2) {
    bar.classList.add('hidden');  // Hide the merge bar
    return;
  }

  bar.classList.remove('hidden');  // Show the merge bar
  countSpan.textContent = state.selectedIds.length;  // Update selected count

  // Populate the target dropdown with the currently selected tags
  const selectedTags = state.tags.filter(t => state.selectedIds.includes(t.id));
  select.innerHTML = selectedTags.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
}

// ============================================================
// Merge selected tags into a single target tag
// ============================================================
/**
 * Merges all selected (non-target) tags into the chosen target tag.
 * Removes the merged tags from the system and updates all videos
 * that referenced them to use the target tag instead.
 * @param {Object} state - The central state object
 */
function mergeTags(state) {
  // Get the target tag ID from the dropdown
  const targetId = document.getElementById('merge-target-select').value;
  if (!targetId) return;  // No target selected

  // IDs to merge = all selected IDs except the target
  const idsToMerge = state.selectedIds.filter(id => id !== targetId);
  if (idsToMerge.length === 0) return;  // Nothing to merge

  // Get the target tag object and names of tags being merged (for the toast message)
  const targetTag = state.tags.find(t => t.id === targetId);
  const mergeNames = idsToMerge.map(id => state.tags.find(t => t.id === id)?.name).filter(Boolean);

  // Remove the merged tags from the state
  state.tags = state.tags.filter(t => !idsToMerge.includes(t.id));

  // Update all videos: replace references to merged tag IDs with the target ID
  const videos = window.App.getVideos();
  videos.forEach(v => {
    if (v.tags) {
      let changed = false;
      idsToMerge.forEach(id => {
        const idx = v.tags.indexOf(id);
        if (idx !== -1) { v.tags[idx] = targetId; changed = true; }
      });
      // Deduplicate: if the same tag ended up appearing twice, collapse to unique values
      if (changed) v.tags = [...new Set(v.tags)];
    }
  });

  // Persist changes to both videos and tags
  window.App.saveVideos(videos);
  window.App.saveTags(state.tags);

  state.selectedIds = [];  // Clear selection
  window.App.showToast(`Merged ${mergeNames.join(', ')} into ${targetTag.name}.`);
  renderTags(state);  // Re-render
}

// ============================================================
// Modal helpers
// ============================================================
/**
 * Opens a modal overlay by adding the "active" class.
 * @param {string} id - The ID of the modal overlay element
 */
function openModal(id) { document.getElementById(id).classList.add('active'); }

/**
 * Closes a modal overlay by removing the "active" class.
 * @param {string} id - The ID of the modal overlay element
 */
function closeModal(id) { document.getElementById(id).classList.remove('active'); }
