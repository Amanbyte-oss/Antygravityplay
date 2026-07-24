// ============================================================
// Videos.js - Video management: table/grid view with inline editing,
// search, sort, pagination, bulk actions, and tag management
// ============================================================

// Color palette used for auto-generating new tag colors (random pick)
const TAG_PALETTE = ['#0070f3','#7928ca','#ff0080','#ffa42b','#50e3c2','#539df5','#1db954','#f3727f','#e91e63','#ff5722','#9c27b0','#00bcd4','#ff9800','#4caf50','#f44336','#3f51b5'];

// ============================================================
// Tag color helper - deterministic color from tag string
// ============================================================
function tagColor(str) {
  var hash = 0;
  for (var i = 0; i < str.length; i++) { hash = str.charCodeAt(i) + ((hash << 5) - hash); }
  var colors = ['#0070f3','#7928ca','#ff0080','#ffa42b','#50e3c2','#539df5','#1db954','#f3727f','#e91e63','#ff5722','#9c27b0','#00bcd4','#ff9800','#4caf50','#f44336','#3f51b5'];
  return colors[Math.abs(hash) % colors.length];
}

// ============================================================
// Render tag pill HTML for a given video (used in card display)
// ============================================================
/**
 * Generates inline HTML for color-coded tag pills based on a video's tag strings.
 * Each tag gets a deterministic color from its string.
 * @param {Object} video - The video object containing a `tags` array of strings
 * @returns {string} HTML string of tag pill spans, or fallback text if no tags
 */
function renderTagPills(video) {
  var esc = function(s) { return String(s||'').replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c; }); };
  var tags = video.tags || [];
  if (tags.length === 0) return '<span class="tag-none">—</span>';
  return tags.map(function(t) {
    var c = tagColor(t);
    return '<span class="card-tag" style="background-color:' + c + '18; color:' + c + ';">' + esc(t) + '</span>';
  }).join(' ');
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

  // Re-sync state when Supabase overrides activate (may fire after DOMContentLoaded)
  document.addEventListener('supabase-active', function syncAfterSupabase() {
    state.videos = window.App.getVideos();
    renderCards(state);
  });
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
  var esc = function(s) { return String(s||'').replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c; }); };
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
      <div class="video-card" data-video-id="${vid.id}">
        <!-- Checkbox for bulk selection -->
        <div class="video-card-check">
          <input type="checkbox" class="card-checkbox row-select-checkbox" data-id="${vid.id}" ${isChecked}>
        </div>
        <!-- Thumbnail with stats overlay (views and likes) -->
        <div class="video-card-thumb">
          <img src="${esc(vid.thumbnail)}" alt="${esc(vid.title)}" loading="lazy">
          <div class="video-card-stats">
            <span><svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> ${Number(vid.views).toLocaleString()}</span>
            <span><svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg> ${Number(vid.likes).toLocaleString()}</span>
          </div>
        </div>
        <!-- Card body: inline-editable title, tags, date, and status -->
        <div class="video-card-body">
          <div class="video-card-title">
            <!-- Clickable title that switches to an inline input field for editing -->
            <div class="inline-editable edit-title" data-id="${vid.id}">${esc(vid.title)}</div>
          </div>
          <div class="video-card-tags">
            <!-- Clickable tag display that opens an inline tag selector -->
            <div class="tags-cell-display" data-video-id="${vid.id}">${tagHtml}</div>
          </div>
          <div class="video-card-meta">
            <span class="video-card-date">${vid.publishDate}</span>
            <!-- Clickable status badge that switches to an inline select dropdown -->
            <div class="inline-editable edit-status" data-id="${vid.id}" data-value="${esc(vid.status)}">
              <span class="badge ${badgeClass}">${esc(vid.status)}</span>
            </div>
          </div>
        </div>
        <!-- Action buttons -->
        <div class="video-card-actions">
          <button class="card-action-btn view-live-btn" data-id="${vid.id}" onclick="event.stopPropagation();window.open('../watch.html?id=${encodeURIComponent(vid.id)}','_blank')" aria-label="View live" title="View live">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
          </button>
          <button class="card-action-btn edit-video-btn" data-id="${vid.id}" aria-label="Edit video" title="Edit">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
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
  if (!document._tagSelectorAttached) {
    document._activeTagSelector = null;
    document.addEventListener('click', function closeTagSelector(ev) {
      const sel = document._activeTagSelector;
      if (!sel) return;
      if (!sel.contains(ev.target)) {
        document._activeTagSelector = null;
        renderCards(state);
      }
    });
    document._tagSelectorAttached = true;
  }

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
      document._activeTagSelector = selector;  // Store reference for global close handler
      // Generate HTML for each tag as a clickable pill (selected or unselected)
      selector.innerHTML = allTags.map(tag => {
        const isSelected = videoTags.includes(tag.id);
        return `
          <span class="inline-tag-option ${isSelected ? 'selected' : ''}" data-tag-id="${tag.id}" style="display:inline-flex;align-items:center;gap:3px;padding:2px 8px;border-radius:9999px;font-size:10px;cursor:pointer;border:1px solid ${esc(tag.color)};background-color:${isSelected ? esc(tag.color) : 'transparent'};color:${isSelected ? '#fff' : 'inherit'};">
            ${esc(tag.name)}
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

  // -------- Delete button (handles Supabase + localStorage) --------
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const videoId = btn.dataset.id;
      const video = state.videos.find(v => v.id === videoId);
      window.App.showConfirmModal(
        'Delete Video',
        `Are you sure you want to permanently delete "${video.title}"? This action cannot be undone.`,
        async () => {
          // Delete from Supabase first — if it fails, don't touch local state
          if (window.__supabase && video) {
            const removed = await window.SupabaseVideos.remove(videoId);
            if (!removed) {
              window.App.showToast('Failed to delete video from database. Check Supabase RLS policy (anon DELETE may be disabled).', 'error');
              renderCards(state);
              return;
            }
            // Clean up storage files only after DB delete succeeds
            if (video.thumbnail_url || video.thumbnail) {
              const thumbUrl = video.thumbnail_url || video.thumbnail;
              const thumbPath = window.SupabaseStorage.pathFromUrl('thumbnails', thumbUrl);
              if (thumbPath) await window.SupabaseStorage.deleteFile('thumbnails', thumbPath);
            }
            if (video.video_url || video.videoUrl) {
              const vidUrl = video.video_url || video.videoUrl;
              const vidPath = window.SupabaseStorage.pathFromUrl('videos', vidUrl);
              if (vidPath) await window.SupabaseStorage.deleteFile('videos', vidPath);
            }
          }

          // Local state cleanup (only reaches here if Supabase is inactive or delete succeeded)
          state.videos = state.videos.filter(v => v.id !== videoId);
          window.App.saveVideos(state.videos);
          state.selectedIds = state.selectedIds.filter(id => id !== videoId);
          window.App.showToast('Video deleted successfully.');
          renderCards(state);
        }
      );
    });
  });

  // -------- Edit video button --------
  document.querySelectorAll('.edit-video-btn').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      var videoId = btn.dataset.id;
      var video = state.videos.find(function(v) { return v.id === videoId; });
      if (!video) return;
      openEditModal(video, state);
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
    if (state.selectedIds.length === 0) return;
    window.App.showConfirmModal(
      'Delete Selected Videos',
      `Are you sure you want to permanently delete the ${state.selectedIds.length} selected videos? This cannot be undone.`,
      async () => {
        // Delete from Supabase first — if it fails, don't touch local state
        if (window.__supabase) {
          const removed = await window.SupabaseVideos.removeMany(state.selectedIds);
          if (!removed) {
            window.App.showToast('Failed to delete videos from database. Check Supabase RLS policy (anon DELETE may be disabled).', 'error');
            renderCards(state);
            return;
          }
          // Clean up storage files only after DB delete succeeds
          for (const id of state.selectedIds) {
            const video = state.videos.find(v => v.id === id);
            if (!video) continue;
            if (video.thumbnail_url || video.thumbnail) {
              const p = window.SupabaseStorage.pathFromUrl('thumbnails', video.thumbnail_url || video.thumbnail);
              if (p) await window.SupabaseStorage.deleteFile('thumbnails', p);
            }
            if (video.video_url || video.videoUrl) {
              const p = window.SupabaseStorage.pathFromUrl('videos', video.video_url || video.videoUrl);
              if (p) await window.SupabaseStorage.deleteFile('videos', p);
            }
          }
        }

        state.videos = state.videos.filter(v => !state.selectedIds.includes(v.id));
        window.App.saveVideos(state.videos);
        state.selectedIds = [];
        window.App.showToast('Selected videos deleted successfully.');
        renderCards(state);
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
    var prevBtn = document.getElementById('prev-page-btn');
    if (prevBtn) prevBtn.addEventListener('click', () => {
      state.currentPage--;          // Decrement page
      renderCards(state);            // Re-render
    });
  }
  // Attach click handler to next page button (only if not on last page)
  if (state.currentPage < totalPages) {
    var nextBtn = document.getElementById('next-page-btn');
    if (nextBtn) nextBtn.addEventListener('click', () => {
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

// ============================================================
// Edit Video Modal - open, chip input, save, close
// ============================================================

var _editModalEsc = function(s) { return String(s||'').replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c; }); };

function openEditModal(video, state) {
  var titleInput = document.getElementById('edit-title-input');
  var descInput = document.getElementById('edit-desc-input');
  var statusInput = document.getElementById('edit-status-input');
  var durationInput = document.getElementById('edit-duration-input');
  var thumbnailInput = document.getElementById('edit-thumbnail-input');
  var chipsContainer = document.getElementById('edit-tags-chips');
  var tagInput = document.getElementById('edit-tags-input');
  if (!titleInput || !descInput || !chipsContainer || !tagInput) return;

  titleInput.value = video.title || '';
  descInput.value = video.description || '';
  if (statusInput) statusInput.value = video.status || 'published';
  if (durationInput) durationInput.value = video.duration || '';
  if (thumbnailInput) thumbnailInput.value = video.thumbnail || '';

  chipsContainer.innerHTML = '';
  (video.tags || []).forEach(function(t) {
    var chip = document.createElement('span');
    chip.className = 'tag-chip';
    chip.innerHTML = _editModalEsc(t) + '<span class="tag-chip-remove">&times;</span>';
    chip.querySelector('.tag-chip-remove').addEventListener('click', function(e) { e.stopPropagation(); chip.remove(); });
    chipsContainer.appendChild(chip);
  });

  if (!tagInput._editChipInit) {
    tagInput._editChipInit = true;
    var container = document.getElementById('edit-tags-container');
    if (container) {
      container.addEventListener('click', function(e) { if (e.target === container) tagInput.focus(); });
    }
    tagInput.addEventListener('keydown', function(e) {
      if (e.key === ',' || e.key === 'Enter') {
        e.preventDefault();
        var parts = tagInput.value.split(',').map(function(s) { return s.trim(); }).filter(Boolean);
        parts.forEach(function(name) {
          var dup = false;
          chipsContainer.querySelectorAll('.tag-chip').forEach(function(c) {
            if (c.dataset.tag === name.toLowerCase()) dup = true;
          });
          if (dup) return;
          var chip = document.createElement('span');
          chip.className = 'tag-chip';
          chip.dataset.tag = name.toLowerCase();
          chip.innerHTML = _editModalEsc(name) + '<span class="tag-chip-remove">&times;</span>';
          chip.querySelector('.tag-chip-remove').addEventListener('click', function(ev) { ev.stopPropagation(); chip.remove(); });
          chipsContainer.appendChild(chip);
        });
        tagInput.value = '';
      }
    });
  }

  var modal = document.getElementById('edit-video-modal');
  if (modal) modal.classList.add('active');

  function onSave() {
    var newTitle = titleInput.value.trim();
    var newDesc = descInput.value.trim();
    if (!newTitle) { window.App.showToast('Title is required.', 'error'); return; }

    var newTags = [];
    chipsContainer.querySelectorAll('.tag-chip').forEach(function(c) {
      var text = c.firstChild.textContent || '';
      if (text) newTags.push(text.trim());
    });

    video.title = newTitle;
    video.description = newDesc;
    video.tags = newTags;
    if (statusInput) video.status = statusInput.value;
    if (durationInput) video.duration = durationInput.value.trim();
    if (thumbnailInput) video.thumbnail = thumbnailInput.value.trim();

    window.App.saveVideos(state.videos);

    if (window.__supabase) {
      window.SupabaseVideos.update(video.id, { title: newTitle, description: newDesc, tags: newTags, status: video.status, duration: video.duration, thumbnail: video.thumbnail })
        .catch(function(err) { console.error('Supabase update failed:', err); });
    }

    window.App.showToast('Video updated successfully.', 'success');
    if (modal) modal.classList.remove('active');
    renderCards(state);
  }

  function closeModal() {
    if (modal) modal.classList.remove('active');
  }

  // Replace buttons with clones to remove stale event listeners
  ['edit-modal-save', 'edit-modal-cancel', 'edit-modal-close'].forEach(function(id) {
    var btn = document.getElementById(id);
    if (btn) {
      var clone = btn.cloneNode(true);
      btn.parentNode.replaceChild(clone, btn);
    }
  });

  // Attach fresh listeners
  document.getElementById('edit-modal-save').addEventListener('click', onSave);
  document.getElementById('edit-modal-cancel').addEventListener('click', closeModal);
  document.getElementById('edit-modal-close').addEventListener('click', closeModal);

  // Backdrop click to close (attach once to avoid duplicates)
  if (modal && !modal.dataset._listenerAttached) {
    modal.addEventListener('click', function(e) {
      if (e.target === modal) { var m = document.getElementById('edit-video-modal'); if (m) m.classList.remove('active'); }
    });
    modal.dataset._listenerAttached = '1';
  }
}
