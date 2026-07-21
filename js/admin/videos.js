// ============================================================
// Videos.js - Video management: table/grid view with inline editing,
// search, sort, pagination, bulk actions, and tag management
// ============================================================

// Color palette used for auto-generating new tag colors (random pick)
const TAG_PALETTE = ['#0070f3','#7928ca','#ff0080','#ffa42b','#50e3c2','#539df5','#1db954','#f3727f','#e91e63','#ff5722','#9c27b0','#00bcd4','#ff9800','#4caf50','#f44336','#3f51b5'];

// ============================================================
// Render tag pill HTML for a given video (used in card display)
// ============================================================
/**
 * Generates inline HTML for color-coded tag pills based on a video's tag IDs.
 * Resolves each tag ID to its full tag object to get name and color.
 * @param {Object} video - The video object containing a `tags` array of tag IDs
 * @returns {string} HTML string of tag pill spans, or fallback text if no tags
 */
function renderTagPills(video) {
  // Fetch all tags from the data store
  const allTags = window.App.getTags();
  // Resolve each tag ID in the video's tags array to its corresponding tag object; filter out any that weren't found
  const resolvedTags = (video.tags || []).map(tId => allTags.find(t => t.id === tId)).filter(Boolean);
  // If no tags resolved, return an em dash fallback
  if (resolvedTags.length === 0) return '<span class="tag-none">—</span>';
  // Map each resolved tag to a colored pill span and join them with spaces
  return resolvedTags.map(t =>
    `<span class="card-tag" style="background-color:${t.color}18; color:${t.color};">${t.name}</span>`
  ).join(' ');
}

// ============================================================
// Initialization - runs when the DOM is fully loaded
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  // Inject the admin sidebar and highlight "videos" as the active page
  window.Components.injectAdminSidebar('videos');

  // Central state object for the videos page
  const state = {
    videos: window.App.getVideos(),  // Array of all video objects from the data store
    searchQuery: '',                  // Current search/filter text
    currentPage: 1,                   // Current pagination page number
    itemsPerPage: 15,                 // Number of video cards to show per page
    sortBy: 'publishDate',            // Field to sort by (default: publish date)
    sortOrder: 'desc',                // Sort direction ('asc' or 'desc')
    selectedIds: []                   // Array of video IDs currently checked for bulk actions
  };

  // Initial render of the video cards
  renderCards(state);
  // Set up the sort dropdown listener
  setupSortDropdown(state);
  // Set up the search input listener with debounce
  setupTableSearch(state);
  // Set up the "select all" header checkbox
  setupBulkSelection(state);
  // Set up the bulk action buttons (e.g., delete selected)
  setupBulkActions(state);
});

// ============================================================
// Main render function: filters, sorts, paginates, and draws the video card grid
// ============================================================
/**
 * Filters videos by search query, sorts them, paginates the results,
 * and renders the HTML for the video card grid. Also triggers binding
 * of inline editing actions, pagination controls, and header checkbox sync.
 * @param {Object} state - The central state object for the videos page
 */
function renderCards(state) {
  // Get the grid container and the count span from the DOM
  const grid = document.getElementById('videos-grid');
  const countSpan = document.getElementById('table-count-span');
  // Guard: exit if the grid container is missing
  if (!grid) return;

  // Step 1: Apply search filter if a search query exists
  let filtered = [...state.videos];
  if (state.searchQuery) {
    // Convert search query to lowercase for case-insensitive matching
    const q = state.searchQuery.toLowerCase();
    // Keep only videos whose title OR creator includes the search text
    filtered = filtered.filter(v =>
      v.title.toLowerCase().includes(q) ||
      v.creator.toLowerCase().includes(q)
    );
  }

  // Step 2: Sort the filtered results
  filtered.sort((a, b) => {
    let valA = a[state.sortBy];  // Get the sort field value from video A
    let valB = b[state.sortBy];  // Get the sort field value from video B
    // If the values are strings, use localeCompare for alphabetical sorting
    if (typeof valA === 'string') {
      return state.sortOrder === 'asc'
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    }
    // For numeric values, simply subtract for ascending/descending
    return state.sortOrder === 'asc' ? valA - valB : valB - valA;
  });

  // Step 3: Update the total count display
  const totalItems = filtered.length;
  if (countSpan) countSpan.innerText = `${totalItems} total video${totalItems === 1 ? '' : 's'}`;

  // Step 4: Calculate pagination
  const totalPages = Math.ceil(totalItems / state.itemsPerPage) || 1;
  // If current page exceeds total pages (e.g., after filtering), clamp it
  if (state.currentPage > totalPages) state.currentPage = totalPages;

  // Calculate the start index and slice the array for the current page
  const startIdx = (state.currentPage - 1) * state.itemsPerPage;
  const pageItems = filtered.slice(startIdx, startIdx + state.itemsPerPage);

  // Step 5: Handle empty state (no videos match the current filters)
  if (pageItems.length === 0) {
    grid.innerHTML = '<div class="videos-empty"><div class="empty-icon">🎬</div>No videos found matching search.</div>';
    renderPaginationControls(state, totalPages);
    return;
  }

  // Step 6: Generate HTML for each video card on the current page
  grid.innerHTML = pageItems.map((vid, idx) => {
    // Determine if this video's checkbox should be pre-checked (for bulk actions)
    const isChecked = state.selectedIds.includes(vid.id) ? 'checked' : '';
    // Pick the badge class based on publish status
    const badgeClass = vid.status === 'published' ? 'badge-success' : 'badge-warning';
    // Generate tag pill HTML for this video
    const tagHtml = renderTagPills(vid);

    // Return the HTML template for a single video card
    return `
      <div class="video-card" data-video-id="${vid.id}" style="animation-delay:${idx * 0.04}s">
        <!-- Checkbox for bulk selection -->
        <div class="video-card-check">
          <input type="checkbox" class="card-checkbox row-select-checkbox" data-id="${vid.id}" ${isChecked}>
        </div>
        <!-- Thumbnail with stats overlay (views and likes) -->
        <div class="video-card-thumb">
          <img src="${vid.thumbnail}" alt="${vid.title}" loading="lazy">
          <div class="video-card-stats">
            <span><svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> ${Number(vid.views).toLocaleString()}</span>
            <span><svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg> ${Number(vid.likes).toLocaleString()}</span>
          </div>
        </div>
        <!-- Card body: inline-editable title, tags, date, and status -->
        <div class="video-card-body">
          <div class="video-card-title">
            <!-- Clickable title that switches to an inline input field for editing -->
            <div class="inline-editable edit-title" data-id="${vid.id}">${vid.title}</div>
          </div>
          <div class="video-card-tags">
            <!-- Clickable tag display that opens an inline tag selector -->
            <div class="tags-cell-display" data-video-id="${vid.id}">${tagHtml}</div>
          </div>
          <div class="video-card-meta">
            <span class="video-card-date">${vid.publishDate}</span>
            <!-- Clickable status badge that switches to an inline select dropdown -->
            <div class="inline-editable edit-status" data-id="${vid.id}" data-value="${vid.status}">
              <span class="badge ${badgeClass}">${vid.status}</span>
            </div>
          </div>
        </div>
        <!-- Delete action button -->
        <div class="video-card-actions">
          <button class="card-action-btn delete-btn" data-id="${vid.id}" aria-label="Delete video">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>
    `;
  }).join('');  // Join all card HTML strings into one

  // Step 7: Bind event handlers for inline editing, delete, and checkbox actions
  bindCardActions(state);
  // Step 8: Render pagination controls (prev/next, page numbers, showing X-Y of Z)
  renderPaginationControls(state, totalPages, filtered.length);
  // Step 9: Sync the header "select all" checkbox state with visible cards
  syncHeaderCheckbox(state, pageItems);
}

// ============================================================
// Bind all interactive card actions: title inline edit, tag selector,
// status inline edit, delete button, and individual checkbox
// ============================================================
/**
 * Attaches event listeners to newly rendered video card elements:
 * - Title click → inline input for renaming
 * - Tags click → inline tag selector with existing tag toggle and new tag creation
 * - Status click → inline dropdown to toggle published/draft
 * - Delete button → confirmation modal then deletion
 * - Checkbox → track selection for bulk actions
 * @param {Object} state - The central state object
 */
function bindCardActions(state) {
  // -------- Title inline edit --------
  // For each element with class "edit-title", attach a click handler
  document.querySelectorAll('.edit-title').forEach(el => {
    el.addEventListener('click', () => {
      // If an input already exists inside this element, don't create another
      if (el.querySelector('input')) return;
      const videoId = el.dataset.id;   // Get the video ID from data attribute
      const curText = el.innerText.trim();  // Get current title text
      // Create an input element to replace the text
      const input = document.createElement('input');
      input.className = 'inline-edit-input';
      input.value = curText;   // Pre-fill with current title
      el.innerHTML = '';       // Clear existing content
      el.appendChild(input);   // Add the input
      input.focus();           // Auto-focus the input

      // Flag to prevent double-saving
      let saved = false;
      // Inner function to save the edited title
      const saveEdit = () => {
        if (saved) return;     // Prevent saving twice
        saved = true;
        const nextVal = input.value.trim();
        // Only save if the value changed and is non-empty
        if (nextVal && nextVal !== curText) {
          const vIdx = state.videos.findIndex(v => v.id === videoId);
          if (vIdx !== -1) {
            state.videos[vIdx].title = nextVal;  // Update in state
            window.App.saveVideos(state.videos);   // Persist to data store
            window.App.showToast('Title updated successfully.');
          }
        }
        renderCards(state);  // Re-render cards to replace input with text
      };
      // Save on blur (input loses focus)
      input.addEventListener('blur', saveEdit);
      // Save on Enter key, cancel on Escape key
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); saveEdit(); }
        if (e.key === 'Escape') renderCards(state);
      });
    });
  });

  // -------- Tags inline edit – single delegated close listener --------
  // Track the currently active tag selector element so we can close it on outside click
  let activeTagSelector = null;

  // Global document click listener: if user clicks outside the active tag selector, close it
  document.addEventListener('click', function closeTagSelector(ev) {
    if (!activeTagSelector) return;  // No active selector, do nothing
    if (!activeTagSelector.contains(ev.target)) {
      renderCards(state);            // Re-render to close the selector
      activeTagSelector = null;      // Clear the reference
    }
  });

  // Attach click handler to each tag cell display area
  document.querySelectorAll('.tags-cell-display').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();  // Prevent the global close handler from firing now
      // If the inline tag selector is already open, don't open another
      if (el.querySelector('.inline-tag-selector')) return;
      const videoId = el.dataset.videoId;       // Get video ID from data attribute
      const video = state.videos.find(v => v.id === videoId);
      if (!video) return;

      // Fetch all tags and the current video's tag IDs
      const allTags = window.App.getTags();
      const videoTags = video.tags || [];  // Default to empty array if no tags
      // Build the inline tag selector element
      const selector = document.createElement('div');
      selector.className = 'inline-tag-selector';
      activeTagSelector = selector;  // Store reference for global close handler
      // Generate HTML for each tag as a clickable pill (selected or unselected)
      selector.innerHTML = allTags.map(tag => {
        const isSelected = videoTags.includes(tag.id);
        return `
          <span class="inline-tag-option ${isSelected ? 'selected' : ''}" data-tag-id="${tag.id}" style="display:inline-flex;align-items:center;gap:3px;padding:2px 8px;border-radius:9999px;font-size:10px;cursor:pointer;border:1px solid ${tag.color};background-color:${isSelected ? tag.color : 'transparent'};color:${isSelected ? '#fff' : 'inherit'};">
            ${tag.name}
          </span>
        `;
      }).join('');
      // Add a search/input field for creating new tags inline
      selector.innerHTML += `
        <div style="width:100%;margin-top:4px;display:flex;gap:4px;">
          <input type="text" class="inline-tag-search" placeholder="Add tag..." style="flex:1;font-size:10px;padding:2px 6px;border:1px solid var(--border);border-radius:9999px;background:var(--bg-primary);">
        </div>
      `;

      // Replace the cell content with the selector
      el.innerHTML = '';
      el.appendChild(selector);

      // Attach click handler to each tag pill to toggle selection
      selector.querySelectorAll('.inline-tag-option').forEach(opt => {
        opt.addEventListener('click', (e) => {
          e.stopPropagation();
          const tId = opt.dataset.tagId;     // Tag ID from data attribute
          const idx = videoTags.indexOf(tId);
          if (idx !== -1) {
            // Tag is currently selected → remove it
            videoTags.splice(idx, 1);
            opt.classList.remove('selected');
            opt.style.backgroundColor = 'transparent';
            opt.style.color = 'inherit';
          } else {
            // Tag is not selected → add it (max 10 tags per video)
            if (videoTags.length >= 10) {
              window.App.showToast('Maximum 10 tags.', 'error');
              return;
            }
            videoTags.push(tId);
            opt.classList.add('selected');
            // Set the pill background to the tag's color
            const tg = window.App.getTags().find(t => t.id === tId);
            opt.style.backgroundColor = tg ? tg.color : '#888';
            opt.style.color = '#fff';
          }
          // Update the video's tags and persist
          video.tags = videoTags;
          window.App.saveVideos(state.videos);
        });
      });

      // Handle the tag search/creation input
      const searchInput = selector.querySelector('.inline-tag-search');
      if (searchInput) {
        searchInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            const name = searchInput.value.trim();
            if (!name) return;  // Ignore empty input
            // Check the 10-tag limit
            if (videoTags.length >= 10) {
              window.App.showToast('Maximum 10 tags.', 'error');
              return;
            }
            // Look for an existing tag with the same name (case-insensitive)
            const allTagsData = window.App.getTags();
            let existing = allTagsData.find(t => t.name.toLowerCase() === name.toLowerCase());
            if (existing) {
              // Tag exists but not attached to this video → attach it
              if (!videoTags.includes(existing.id)) {
                videoTags.push(existing.id);
                video.tags = videoTags;
                window.App.saveVideos(state.videos);
              }
            } else {
              // Tag does not exist → create a new one with a random color
              const newId = 'tag-' + Date.now();
              const color = TAG_PALETTE[Math.floor(Math.random() * TAG_PALETTE.length)];
              allTagsData.push({ id: newId, name, color, usageCount: 0 });
              window.App.saveTags(allTagsData);  // Save new tag to store
              videoTags.push(newId);               // Attach to video
              video.tags = videoTags;
              window.App.saveVideos(state.videos);
            }
            renderCards(state);  // Re-render to close selector and show updated tags
          }
        });
        // Close the tag selector if the search input loses focus (and nothing else has focus inside it)
        searchInput.addEventListener('blur', () => {
          if (!selector.contains(document.activeElement)) renderCards(state);
        });
      }
    });
  });

  // -------- Status inline edit --------
  // For each element with class "edit-status", attach click handler to switch to a dropdown
  document.querySelectorAll('.edit-status').forEach(el => {
    el.addEventListener('click', () => {
      // If a select dropdown already exists, don't create another
      if (el.querySelector('select')) return;
      const videoId = el.dataset.id;         // Video ID from data attribute
      const curVal = el.dataset.value;       // Current status value
      // Create a select dropdown with published/draft options
      const select = document.createElement('select');
      select.className = 'inline-edit-select';
      select.innerHTML = `
        <option value="published" ${curVal === 'published' ? 'selected' : ''}>published</option>
        <option value="draft" ${curVal === 'draft' ? 'selected' : ''}>draft</option>
      `;
      el.innerHTML = '';        // Clear existing badge content
      el.appendChild(select);   // Add the dropdown
      select.focus();           // Auto-focus

      // Save handler: update the status if it changed
      const saveEdit = () => {
        const nextVal = select.value;
        if (nextVal !== curVal) {
          const vIdx = state.videos.findIndex(v => v.id === videoId);
          if (vIdx !== -1) {
            state.videos[vIdx].status = nextVal;  // Update in state
            window.App.saveVideos(state.videos);   // Persist
            window.App.showToast('Status updated successfully.');
          }
        }
        renderCards(state);  // Re-render to show updated badge
      };
      // Save on change (user selected a different option)
      select.addEventListener('change', saveEdit);
      // Cancel on Escape key
      select.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') renderCards(state);
      });
    });
  });

  // -------- Delete button --------
  // For each delete button, show a confirmation modal before deleting
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();  // Prevent event from bubbling up
      const videoId = btn.dataset.id;  // Get video ID from data attribute
      const video = state.videos.find(v => v.id === videoId);
      // Show confirmation modal with the video title
      window.App.showConfirmModal(
        'Delete Video',
        `Are you sure you want to permanently delete "${video.title}"? This action cannot be undone.`,
        () => {
          // Remove the video from state
          state.videos = state.videos.filter(v => v.id !== videoId);
          window.App.saveVideos(state.videos);  // Persist changes
          // Also remove from selected IDs if it was selected
          state.selectedIds = state.selectedIds.filter(id => id !== videoId);
          window.App.showToast('Video deleted successfully.');
          renderCards(state);  // Re-render the grid
        }
      );
    });
  });

  // -------- Individual card checkbox --------
  // Track checked state for bulk actions
  document.querySelectorAll('.row-select-checkbox').forEach(cb => {
    cb.addEventListener('change', () => {
      const id = cb.dataset.id;  // Video ID from data attribute
      if (cb.checked) {
        // Add to selected IDs if not already present
        if (!state.selectedIds.includes(id)) state.selectedIds.push(id);
      } else {
        // Remove from selected IDs
        state.selectedIds = state.selectedIds.filter(val => val !== id);
      }
      // Update the bulk action bar visibility and count
      syncBulkButtonDisplay(state);
    });
  });
}

// ============================================================
// Sort dropdown setup
// ============================================================
/**
 * Attaches a change listener to the sort-by dropdown that updates the
 * state sort field and direction, resets to page 1, and re-renders.
 * @param {Object} state - The central state object
 */
function setupSortDropdown(state) {
  const select = document.getElementById('sort-select');
  if (!select) return;  // Guard: exit if element not found
  select.addEventListener('change', () => {
    // The select value is formatted as "field-order" (e.g., "publishDate-desc")
    const [field, order] = select.value.split('-');
    state.sortBy = field;       // Update sort field
    state.sortOrder = order;     // Update sort direction
    state.currentPage = 1;       // Reset to first page
    renderCards(state);          // Re-render with new sort
  });
}

// ============================================================
// Search input with debounce
// ============================================================
/**
 * Attaches an input listener to the search field that debounces for 250ms,
 * then updates the search query in state, resets to page 1, and re-renders.
 * @param {Object} state - The central state object
 */
function setupTableSearch(state) {
  const searchInput = document.getElementById('table-search-input');
  if (!searchInput) return;  // Guard: exit if element not found
  let searchDebounce;         // Timer ID for debounce
  searchInput.addEventListener('input', () => {
    clearTimeout(searchDebounce);  // Clear previous timer
    searchDebounce = setTimeout(() => {
      state.searchQuery = searchInput.value.trim();  // Update search query
      state.currentPage = 1;                           // Reset to first page
      renderCards(state);                               // Re-render with filter
    }, 250);  // 250ms debounce delay
  });
}

// ============================================================
// Header "select all" checkbox setup
// ============================================================
/**
 * Attaches a change listener to the header checkbox that selects or
 * deselects all visible video row checkboxes and updates the bulk bar.
 * @param {Object} state - The central state object
 */
function setupBulkSelection(state) {
  const headerCheckbox = document.getElementById('header-checkbox');
  if (!headerCheckbox) return;  // Guard: exit if element not found
  headerCheckbox.addEventListener('change', () => {
    const isChecked = headerCheckbox.checked;
    // Loop through all individual row checkboxes and set their checked state
    document.querySelectorAll('.row-select-checkbox').forEach(cb => {
      const id = cb.dataset.id;
      cb.checked = isChecked;
      // Update the selectedIds array accordingly
      if (isChecked) {
        if (!state.selectedIds.includes(id)) state.selectedIds.push(id);
      } else {
        state.selectedIds = state.selectedIds.filter(val => val !== id);
      }
    });
    syncBulkButtonDisplay(state);  // Show/hide the bulk action bar
  });
}

// ============================================================
// Sync header checkbox with visible row checkboxes
// ============================================================
/**
 * Checks whether all visible video cards on the current page are selected,
 * and sets the header checkbox accordingly. Also updates the bulk bar.
 * @param {Object} state - The central state object
 * @param {Array} pageItems - Array of video objects on the current page
 */
function syncHeaderCheckbox(state, pageItems) {
  const headerCheckbox = document.getElementById('header-checkbox');
  if (!headerCheckbox || pageItems.length === 0) return;
  // The header checkbox is checked only if every visible card is in selectedIds
  headerCheckbox.checked = pageItems.every(vid => state.selectedIds.includes(vid.id));
  syncBulkButtonDisplay(state);
}

// ============================================================
// Bulk action bar visibility
// ============================================================
/**
 * Shows or hides the bulk action bar and updates the selected count display.
 * @param {Object} state - The central state object
 */
function syncBulkButtonDisplay(state) {
  const bulkBar = document.getElementById('bulk-actions-bar');
  const countSpan = document.getElementById('bulk-selected-count');
  if (!bulkBar) return;  // Guard: exit if element not found
  const count = state.selectedIds.length;
  // Show the bar if at least one video is selected, hide otherwise
  bulkBar.style.display = count > 0 ? 'flex' : 'none';
  if (countSpan) countSpan.innerText = `${count} selected`;  // Update count text
}

// ============================================================
// Bulk action: delete selected
// ============================================================
/**
 * Attaches a click listener to the "Delete Selected" button that shows
 * a confirmation modal, then removes all selected videos from state and store.
 * @param {Object} state - The central state object
 */
function setupBulkActions(state) {
  const deleteSelectedBtn = document.getElementById('delete-selected-btn');
  if (!deleteSelectedBtn) return;  // Guard: exit if element not found
  deleteSelectedBtn.addEventListener('click', () => {
    if (state.selectedIds.length === 0) return;  // Nothing selected, do nothing
    // Show a confirmation modal before performing the bulk delete
    window.App.showConfirmModal(
      'Delete Selected Videos',
      `Are you sure you want to permanently delete the ${state.selectedIds.length} selected videos? This cannot be undone.`,
      () => {
        // Filter out all videos whose IDs are in selectedIds
        state.videos = state.videos.filter(v => !state.selectedIds.includes(v.id));
        window.App.saveVideos(state.videos);  // Persist the change
        state.selectedIds = [];                 // Clear selection
        window.App.showToast('Selected videos deleted successfully.');
        renderCards(state);  // Re-render the grid
      }
    );
  });
}

// ============================================================
// Pagination controls renderer
// ============================================================
/**
 * Builds and injects the pagination UI showing prev/next buttons,
 * clickable page numbers, and a "Showing X-Y of Z" summary.
 * Attaches click handlers for all pagination buttons.
 * @param {Object} state - The central state object
 * @param {number} totalPages - Total number of pages
 * @param {number} [totalFiltered] - Total items after filtering (if not provided, uses state.videos.length)
 */
function renderPaginationControls(state, totalPages, totalFiltered) {
  // Get the pagination wrapper element
  const container = document.getElementById('pagination-wrapper');
  if (!container) return;  // Guard: exit if element not found

  // Calculate the start and end item indices for the "Showing X-Y of Z" display
  const startIdx = (state.currentPage - 1) * state.itemsPerPage + 1;
  let endIdx = state.currentPage * state.itemsPerPage;
  // Use the filtered count if provided, otherwise fall back to total videos
  const totalItems = totalFiltered !== undefined ? totalFiltered : state.videos.length;
  // Clamp endIdx to not exceed total items
  if (endIdx > totalItems) endIdx = totalItems;

  // Build the page number buttons HTML
  let pageButtons = '';
  for (let i = 1; i <= totalPages; i++) {
    pageButtons += `
      <button class="pagination-btn ${state.currentPage === i ? 'active' : ''}" data-page="${i}">${i}</button>
    `;
  }

  // Inject the complete pagination HTML
  container.innerHTML = `
    <div class="pagination-container">
      <!-- "Showing X-Y of Z" summary -->
      <div>Showing <span style="font-weight:600;color:var(--text-primary);">${totalItems === 0 ? 0 : startIdx}-${endIdx}</span> of <span style="font-weight:600;color:var(--text-primary);">${totalItems}</span> videos</div>
      <div class="pagination-controls">
        <!-- Previous page button (disabled on first page) -->
        <button class="pagination-btn ${state.currentPage === 1 ? 'disabled' : ''}" id="prev-page-btn">&larr;</button>
        ${pageButtons}
        <!-- Next page button (disabled on last page) -->
        <button class="pagination-btn ${state.currentPage === totalPages ? 'disabled' : ''}" id="next-page-btn">&rarr;</button>
      </div>
    </div>
  `;

  // Attach click handler to previous page button (only if not on first page)
  if (state.currentPage > 1) {
    document.getElementById('prev-page-btn').addEventListener('click', () => {
      state.currentPage--;          // Decrement page
      renderCards(state);            // Re-render
    });
  }
  // Attach click handler to next page button (only if not on last page)
  if (state.currentPage < totalPages) {
    document.getElementById('next-page-btn').addEventListener('click', () => {
      state.currentPage++;          // Increment page
      renderCards(state);            // Re-render
    });
  }
  // Attach click handler to each page number button
  container.querySelectorAll('[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.currentPage = Number(btn.dataset.page);  // Set page from data attribute
      renderCards(state);                              // Re-render
    });
  });
}
