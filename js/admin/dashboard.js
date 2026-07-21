// ============================================================
// Admin Dashboard logic & canvas charts
// Manages statistics display, recent uploads grid, Up Next
// video selector, and a 7-day views line chart drawn on canvas.
// ============================================================

// Wait for the DOM to be fully loaded before executing dashboard code
document.addEventListener('DOMContentLoaded', () => {
  // Step 1: Inject the admin sidebar into the page, highlighting "dashboard" as active
  window.Components.injectAdminSidebar('dashboard');

  // Step 2: Retrieve all videos and tags from the central App data store
  const videos = window.App.getVideos();  // Array of all video objects
  const tags = window.App.getTags();       // Array of all tag objects
  
  // Step 3: Calculate and display the aggregate statistics (totals) on the page
  computeStats(videos, tags);

  // Step 4: Render the recent uploads grid (shows up to 5 most recently published videos)
  renderRecentUploadsTable(videos, tags);

  // Step 5: Render the "Up Next" video selector dropdown with save functionality
  renderUpNextSelector(videos, tags);

  // Step 6: Draw the 7-day views trend line chart on the canvas element
  drawViewsChart();

  // Listen for a custom "themechanged" event (e.g., user toggled dark/light mode)
  // When fired, clear the cached chart data and redraw with new theme colors
  window.addEventListener('themechanged', () => {
    invalidateChartCache();  // Clear the cached views data
    drawViewsChart();         // Redraw chart with updated theme colors
  });

  // Listen for a custom "videosupdated" event (e.g., video added/deleted from another admin page)
  // When fired, clear cache and redraw chart with fresh data
  window.addEventListener('videosupdated', () => {
    invalidateChartCache();  // Clear the cached views data
    drawViewsChart();         // Redraw chart with the latest video data
  });
});

// ============================================================
// Compute and display dashboard statistics (published videos only)
// ============================================================
/**
 * Computes aggregate metrics from published videos and tag count,
 * then updates the corresponding DOM elements with formatted values.
 * @param {Array} videos - Array of all video objects from the data store
 * @param {Array} tags   - Array of all tag objects from the data store
 */
function computeStats(videos, tags) {
  // Filter to only videos with status === 'published'
  const published = videos.filter(v => v.status === 'published');
  // Count total number of published videos
  const totalVideos = published.length;
  // Sum all views across published videos (convert to Number to avoid string concatenation)
  const totalViews = published.reduce((acc, v) => acc + Number(v.views), 0);
  // Sum all likes across published videos
  const totalLikes = published.reduce((acc, v) => acc + Number(v.likes), 0);
  // Count total number of tags in the system
  const totalTags = tags.length;

  // Update the DOM elements with the computed statistics
  document.getElementById('stat-total-videos').innerText = totalVideos;
  document.getElementById('stat-total-views').innerText = totalViews.toLocaleString();   // Format with locale commas
  document.getElementById('stat-total-likes').innerText = totalLikes.toLocaleString();   // Format with locale commas
  document.getElementById('stat-total-tags').innerText = totalTags;
}

// ============================================================
// Render the "Recent Uploads" grid (shows up to 5 published video cards)
// ============================================================
/**
 * Builds and injects HTML for a grid of the most recently published videos.
 * Each card shows a thumbnail, view count, status badge, title, and up to 3 tags.
 * @param {Array} videos - Array of all video objects
 * @param {Array} tags   - Array of all tag objects
 */
function renderRecentUploadsTable(videos, tags) {
  // Get the DOM container for the recent uploads grid
  const grid = document.getElementById('recent-uploads-grid');
  // Guard: exit early if the container element does not exist in the DOM
  if (!grid) return;

  // Filter to only published videos (also guard against null/undefined entries)
  const published = videos.filter(v => v && v.status === 'published');
  // Reverse the order (newest first) then take the first 5 items
  const sortedRecent = [...published].reverse().slice(0, 5);

  // If there are no published videos, show an empty-state message
  if (sortedRecent.length === 0) {
    grid.innerHTML = '<div class="uploads-empty">No recent uploads found.</div>';
    return;
  }

  // Build HTML for each video card and join them into a single string
  grid.innerHTML = sortedRecent.map((vid, idx) => {
    // Safely get the tags array; default to empty array if missing or not an array
    const safeTags = Array.isArray(vid.tags) ? vid.tags : [];
    // Resolve each tag ID to the full tag object by looking it up in the tags array
    const resolvedTags = safeTags.map(tId => tags.find(t => t && t.id === tId)).filter(Boolean);
    // Generate HTML for up to 3 tag pills; show a "+N more" indicator if there are more than 3
    const tagHtml = resolvedTags.length > 0
      ? resolvedTags.slice(0, 3).map(t =>
          `<span class="upload-tag" style="background-color:${t.color}18; color:${t.color};">${t.name}</span>`
        ).join('') + (resolvedTags.length > 3 ? `<span class="upload-tag-more">+${resolvedTags.length - 3}</span>` : '')
      : '<span class="upload-tag-none">—</span>';  // Fallback: em dash if no tags

    // Determine the CSS class for the status badge (green for published, yellow for draft)
    const badgeClass = vid.status === 'published' ? 'badge-success' : 'badge-warning';
    // Use the video's thumbnail URL or a dark placeholder SVG if none is set
    const thumbSrc = vid.thumbnail || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 9%22%3E%3Crect width=%22100%25%22 height=%22100%25%22 fill=%22%231f1f1f%22/%3E%3C/svg%3E';

    // Return the HTML template string for a single upload card
    return `
      <div class="upload-card" style="animation-delay:${idx * 0.06}s">
        <div class="upload-card-thumb">
          <!-- Thumbnail image with lazy loading; falls back to placeholder on error -->
          <img src="${thumbSrc}" alt="${vid.title || ''}" loading="lazy" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 9%22%3E%3Crect width=%22100%25%22 height=%22100%25%22 fill=%22%231f1f1f%22/%3E%3C/svg%3E'">
          <div class="upload-card-overlay">
            <!-- Views count with an eye icon SVG -->
            <span class="upload-card-views">
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              ${Number(vid.views || 0).toLocaleString()}
            </span>
            <!-- Status badge (published = green, otherwise draft = yellow) -->
            <span class="badge ${badgeClass}">${vid.status || 'draft'}</span>
          </div>
        </div>
        <div class="upload-card-body">
          <!-- Video title (fallback to "Untitled" if missing) -->
          <h3 class="upload-card-title">${vid.title || 'Untitled'}</h3>
          <!-- Tag pills row -->
          <div class="upload-card-tags">${tagHtml}</div>
        </div>
      </div>
    `;
  }).join('');  // Join the array of HTML strings into one string for innerHTML
}

// ============================================================
// Render the "Up Next" video selector (pin a video to the front page)
// ============================================================
/**
 * Renders the Up Next selector card showing currently pinned video (if any),
 * a dropdown to choose a video, and a save button. Persists the selection to localStorage.
 * @param {Array} videos - Array of all video objects
 * @param {Array} tags   - Array of all tag objects (unused here, kept for API consistency)
 */
function renderUpNextSelector(videos, tags) {
  // Get the DOM container for the Up Next selector
  const container = document.getElementById('upnext-selector');
  // Guard: exit early if the container element does not exist
  if (!container) return;

  // Filter to only published videos
  const published = videos.filter(v => v && v.status === 'published');
  // Retrieve the previously saved "up-next" video ID from localStorage
  const savedId = localStorage.getItem('up-next-video-id');
  // Find the corresponding video object from published list, or null if not found
  const selectedVideo = savedId ? published.find(v => v.id === savedId) : null;

  // Inject the complete Up Next card HTML into the container
  container.innerHTML = `
    <div class="upnext-card">
      <div class="upnext-card-body">
        <div class="upnext-current">
          <span class="upnext-label">Currently pinned:</span>
          <!-- If a video is pinned, show its thumbnail, title, and creator; otherwise show a "none" message -->
          ${selectedVideo
            ? `<div class="upnext-selected-video">
                <img src="${selectedVideo.thumbnail || ''}" alt="" class="upnext-thumb">
                <div class="upnext-info">
                  <span class="upnext-title">${selectedVideo.title}</span>
                  <span class="upnext-creator">${selectedVideo.creator}</span>
                </div>
              </div>`
            : '<span class="upnext-none">None selected — showing auto-matched related videos</span>'
          }
        </div>
        <div class="upnext-form">
          <label for="upnext-select" class="upnext-select-label">Select a video to pin as "Up Next":</label>
          <div class="upnext-select-row">
            <!-- Dropdown listing all published videos; pre-select the previously saved one -->
            <select id="upnext-select" class="upnext-select">
              <option value="">— Auto (no pin) —</option>
              ${published.map(v => `
                <option value="${v.id}" ${v.id === savedId ? 'selected' : ''}>
                  ${v.title} (${v.creator})
                </option>
              `).join('')}
            </select>
            <!-- Save button to persist the selection -->
            <button id="upnext-save-btn" class="btn btn-primary" style="white-space:nowrap; flex-shrink:0;">Save</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Attach click event listener to the Save button (freshly created in the HTML above)
  document.getElementById('upnext-save-btn').addEventListener('click', () => {
    // Get the dropdown element and its currently selected value
    const select = document.getElementById('upnext-select');
    const val = select.value;
    // If a video was selected, save its ID to localStorage
    if (val) {
      localStorage.setItem('up-next-video-id', val);
      window.App.showToast('Up Next video pinned successfully!');
    } else {
      // If "Auto" was selected (empty value), remove the saved pin from localStorage
      localStorage.removeItem('up-next-video-id');
      window.App.showToast('Up Next pin removed. Auto-matching will be used.');
    }
    // Re-render the selector to reflect the updated selection
    renderUpNextSelector(videos, tags);
  });
}

// ============================================================
// Chart data caching and computation
// ============================================================

// Module-level cache for the 7-day views data so we don't recompute unnecessarily
let cachedChartData = null;

/**
 * Computes the total views per day for the last 7 days (published videos only).
 * Results are cached in cachedChartData to avoid redundant computation.
 * @returns {{ labels: string[], data: number[] }} Object containing date labels (MM-DD) and views per day
 */
function computeViewsLast7Days() {
  // If cached data exists, return it immediately without recomputing
  if (cachedChartData) return cachedChartData;
  // Get all published videos from the data store
  const videos = window.App.getVideos().filter(v => v.status === 'published');
  // Array to hold the view counts for each day
  const days = [];
  // Array to hold short date labels (e.g., "07-15") for the x-axis
  const labels = [];
  // Loop from 6 days ago to today (7 data points)
  for (let i = 6; i >= 0; i--) {
    // Create a Date object for each day going backwards
    const d = new Date();
    d.setDate(d.getDate() - i);
    // Format as YYYY-MM-DD string
    const dateStr = d.toISOString().split('T')[0];
    // Extract month-day portion for the label
    labels.push(dateStr.slice(5));
    // Sum views for all videos published on this specific date
    const dayViews = videos
      .filter(v => v.publishDate === dateStr)
      .reduce((sum, v) => sum + Number(v.views), 0);
    days.push(dayViews);
  }
  // Store the computed data in the cache
  cachedChartData = { labels, data: days };
  return cachedChartData;
}

/**
 * Invalidates (clears) the cached chart data so the next call recomputes from scratch.
 */
function invalidateChartCache() {
  cachedChartData = null;
}

// ============================================================
// Draw the 7-day views trend line chart using the Canvas API
// Includes gradient fill, stroked line, data point dots, and interactive hover tooltips
// ============================================================
/**
 * Renders a custom line chart on the #analytics-line-chart canvas element.
 * Computes data from computeViewsLast7Days(), applies theme-aware colors,
 * and sets up mouse hover interaction for tooltips.
 */
function drawViewsChart() {
  // Get the canvas element from the DOM
  const canvas = document.getElementById('analytics-line-chart');
  // Guard: exit if the canvas element doesn't exist
  if (!canvas) return;

  // Get the 2D rendering context for drawing on the canvas
  const ctx = canvas.getContext('2d');
  
  // Get the canvas element's layout rectangle (CSS dimensions)
  const rect = canvas.getBoundingClientRect();
  // Set actual canvas pixel dimensions to match CSS size multiplied by device pixel ratio
  // This ensures sharp rendering on high-DPI (Retina) displays
  canvas.width = rect.width * window.devicePixelRatio;
  canvas.height = rect.height * window.devicePixelRatio;
  // Scale the drawing context so all coordinates are in CSS pixels, not physical pixels
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

  // Working dimensions in CSS pixels
  const width = rect.width;
  const height = rect.height;

  // Detect the current theme (light vs dark) to pick appropriate chart colors
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  const gridColor = isLight ? '#ebebeb' : '#2e2e2e';     // Horizontal gridline color
  const textColor = isLight ? '#888888' : '#7c7c7c';     // Axis label text color
  const accentColor = isLight ? '#0070f3' : '#1ed760';   // Line and highlight accent color
  
  // Retrieve the 7-day views data (uses cache if available)
  const chartData = computeViewsLast7Days();
  const labels = chartData.labels;  // Array of date strings (MM-DD)
  const data = chartData.data;      // Array of view counts per day
  // Maximum Y value with 15% headroom so the line doesn't touch the top
  const maxVal = Math.max(...data) * 1.15;

  // Clear the entire canvas before redrawing
  ctx.clearRect(0, 0, width, height);

  // Define padding values around the chart area (left, right, top, bottom)
  const paddingLeft = 45;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;

  // Calculate the width and height of the actual graph area (inside the padding)
  const graphWidth = width - paddingLeft - paddingRight;
  const graphHeight = height - paddingTop - paddingBottom;

  // -------- Draw horizontal gridlines and Y-axis labels --------
  const yLines = 4;  // Number of horizontal grid divisions
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1;
  ctx.fillStyle = textColor;
  ctx.font = '10px var(--font-mono)';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  // Loop through each gridline (from bottom i=0 to top i=4)
  for (let i = 0; i <= yLines; i++) {
    // Calculate the view count value at this gridline
    const val = (maxVal / yLines) * i;
    // Calculate the Y pixel position for this gridline
    const y = height - paddingBottom - (graphHeight * (i / yLines));
    ctx.beginPath();
    // Use solid line for the bottom line (i=0), dashed for all others
    ctx.setLineDash(i === 0 ? [] : [4, 4]);
    ctx.moveTo(paddingLeft, y);
    ctx.lineTo(width - paddingRight, y);
    ctx.stroke();
    // Draw the numeric label for this gridline (formatted with locale commas)
    ctx.fillText(Math.round(val).toLocaleString(), paddingLeft - 8, y);
  }
  // Reset line dash to solid for subsequent drawing
  ctx.setLineDash([]);

  // -------- Draw X-axis date labels --------
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  // Calculate the horizontal spacing between each data point
  const stepX = graphWidth / (data.length - 1);

  // Draw each date label below the x-axis
  for (let i = 0; i < data.length; i++) {
    ctx.fillText(labels[i], paddingLeft + (i * stepX), height - paddingBottom + 8);
  }

  // -------- Compute pixel coordinates for each data point --------
  const points = data.map((val, idx) => ({
    x: paddingLeft + (idx * stepX),
    y: height - paddingBottom - (graphHeight * (val / maxVal))
  }));

  // -------- Draw the gradient fill under the line --------
  // Create a vertical linear gradient from top to bottom of the graph area
  const grad = ctx.createLinearGradient(0, paddingTop, 0, height - paddingBottom);
  if (isLight) {
    grad.addColorStop(0, 'rgba(0, 112, 243, 0.25)');  // More opaque at top
    grad.addColorStop(1, 'rgba(0, 112, 243, 0.01)');  // Nearly transparent at bottom
  } else {
    grad.addColorStop(0, 'rgba(30, 215, 96, 0.25)');
    grad.addColorStop(1, 'rgba(30, 215, 96, 0.01)');
  }

  ctx.fillStyle = grad;
  ctx.beginPath();
  // Start from the bottom-left (baseline)
  ctx.moveTo(points[0].x, height - paddingBottom);
  // Draw line segments through each data point
  for (let i = 0; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  // Close back to the bottom-right (baseline)
  ctx.lineTo(points[points.length - 1].x, height - paddingBottom);
  ctx.closePath();
  ctx.fill();  // Fill the enclosed area with the gradient

  // -------- Draw the main line stroke (connecting all data points) --------
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';   // Rounded line ends
  ctx.lineJoin = 'round';  // Rounded line joints
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  // Draw line through all points
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.stroke();

  // -------- Draw circular dots at each data point --------
  ctx.fillStyle = isLight ? '#ffffff' : '#121212';  // Dot fill color (contrasts with background)
  ctx.strokeStyle = accentColor;                     // Dot border color
  ctx.lineWidth = 2;
  for (let i = 0; i < points.length; i++) {
    ctx.beginPath();
    ctx.arc(points[i].x, points[i].y, 4, 0, Math.PI * 2);  // Circle with radius 4
    ctx.fill();   // Fill the dot
    ctx.stroke(); // Stroke the dot border
  }

  // -------- Set up interactive hover behavior --------
  const dpr = window.devicePixelRatio;
  // Bundle all state needed by the hover handlers into a single object
  const state = { points, labels, data, accentColor, isLight, paddingLeft, paddingRight, paddingTop, paddingBottom, width, height, dpr };

  /**
   * Finds the index of the nearest data point to a given mouse X coordinate.
   * Only returns a valid index if the point is within 30px horizontally
   * and the mouse Y is within the graph area vertically.
   * @param {number} mx - Mouse X position in CSS pixels
   * @param {number} my - Mouse Y position in CSS pixels
   * @returns {number} Index of nearest point, or -1 if none close enough
   */
  const findNearest = function(mx, my) {
    let minDist = Infinity, idx = -1;
    state.points.forEach((p, i) => {
      const d = Math.abs(p.x - mx);  // Horizontal distance from mouse to point
      if (d < minDist) { minDist = d; idx = i; }
    });
    // Return index only if within 30px distance and within vertical graph bounds
    return (idx !== -1 && minDist <= 30 && my >= paddingTop && my <= height - paddingBottom) ? idx : -1;
  };

  /**
   * Draws a tooltip and highlight ring around the hovered data point.
   * @param {number} idx - Index of the data point to highlight
   */
  const drawTooltip = function(idx) {
    const p = state.points[idx];                    // Get point coordinates
    const value = state.data[idx].toLocaleString();  // Get formatted value

    ctx.save();  // Save the current canvas state to restore later

    // -------- Draw the highlight ring around the point --------
    ctx.beginPath();
    ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);  // Larger circle (radius 8)
    ctx.fillStyle = isLight ? 'rgba(0,112,243,0.12)' : 'rgba(30,215,96,0.15)';
    ctx.fill();  // Semi-transparent fill
    ctx.strokeStyle = state.accentColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
    ctx.stroke();  // Colored ring border

    // -------- Draw the tooltip rectangle --------
    const tw = 80, th = 26;           // Tooltip width and height
    let tx = p.x - tw / 2, ty = p.y - th - 12;  // Position above the point
    // Clamp tooltip X so it doesn't go off the left edge
    if (tx < 6) tx = 6;
    // Clamp tooltip X so it doesn't go off the right edge
    if (tx + tw > state.width - 6) tx = state.width - tw - 6;
    // If tooltip would go above canvas top, flip it below the point
    if (ty < 6) ty = p.y + 12;

    // Draw tooltip shadow
    ctx.shadowColor = 'rgba(0,0,0,0.2)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = isLight ? '#ffffff' : '#1a1a2e';  // Tooltip background
    ctx.beginPath();
    ctx.roundRect(tx, ty, tw, th, 6);  // Rounded rectangle
    ctx.fill();
    // Draw tooltip border (remove shadow for border to avoid double shadow)
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = state.accentColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(tx, ty, tw, th, 6);
    ctx.stroke();

    // Draw the value text centered inside the tooltip
    ctx.fillStyle = isLight ? '#1a1a2e' : '#e0e0e0';
    ctx.font = 'bold 11px var(--font-mono)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(value, tx + tw / 2, ty + th / 2);

    ctx.restore();  // Restore the canvas state (removes shadow, resets styles)
  };

  // Track which point is currently hovered (-1 means none)
  let hoveredIdx = -1;

  // -------- Mouse move handler: detect hover and show tooltip --------
  canvas.onmousemove = function(e) {
    // Get canvas bounding rect to compute mouse position relative to canvas
    const r = canvas.getBoundingClientRect();
    // Convert mouse coordinates to CSS pixels (accounting for DPR scaling)
    const mx = (e.clientX - r.left) * (canvas.width / r.width / dpr);
    const my = (e.clientY - r.top) * (canvas.height / r.height / dpr);
    // Find the index of the nearest data point
    const idx = findNearest(mx, my);
    // Only redraw if the hovered index changed (optimization)
    if (idx !== hoveredIdx) {
      hoveredIdx = idx;
      drawViewsChart();  // Redraw entire chart (clears previous tooltip)
      if (idx !== -1) drawTooltip(idx);  // Draw tooltip for the new point
    }
  };

  // -------- Mouse leave handler: clear hover state --------
  canvas.onmouseleave = function() {
    if (hoveredIdx !== -1) {
      hoveredIdx = -1;      // Reset hover state
      drawViewsChart();      // Redraw chart without tooltip
    }
  };
}
