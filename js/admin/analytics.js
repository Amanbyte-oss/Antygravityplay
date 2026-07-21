// ============================================================
// Analytics.js - Analytics page with date ranges and chart rendering
// Displays views/likes totals, line/bar/pie/donut charts, data export
// ============================================================

// Wait for the DOM to be fully loaded before initializing analytics
document.addEventListener('DOMContentLoaded', () => {
  // Inject the admin sidebar, highlighting "analytics" as active
  window.Components.injectAdminSidebar('analytics');

  // Module-level state for analytics data and currently selected date range
  let analyticsData = null;    // Will hold the full analytics dataset
  let currentRange = '30';      // Default date range: 30 days

  // If running from file:// protocol, use locally computed data (no server fetch)
  if (window.location.protocol === 'file:') {
    analyticsData = getDefaultAnalytics();
    initAnalytics(analyticsData, currentRange);
  } else {
    // Otherwise, try to fetch analytics.json from the server
    fetch('../data/analytics.json')
      .then(r => r.json())
      .catch(() => getDefaultAnalytics())   // Fallback to computed data on fetch failure
      .then(data => {
        // Validate that the loaded data has the expected structure
        if (!data || !Array.isArray(data.viewsByDay)) {
          data = getDefaultAnalytics();
        }
        analyticsData = data;
        initAnalytics(analyticsData, currentRange);
      });
  }

  // -------- Date range button listeners --------
  document.querySelectorAll('.date-range-btn').forEach(btn => {
    // Skip the "Custom" range button (handled separately)
    if (btn.dataset.range === 'custom') return;
    btn.addEventListener('click', () => {
      // Deactivate all range buttons, then activate the clicked one
      document.querySelectorAll('.date-range-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentRange = btn.dataset.range;  // Update the current range ("7", "30", or "90")
      // Re-initialize analytics with the new range if data is loaded
      if (analyticsData) initAnalytics(analyticsData, currentRange);
    });
  });

  // -------- Export data button --------
  document.getElementById('export-data-btn').addEventListener('click', () => {
    if (!analyticsData) return;  // No data to export
    // Create a JSON blob and trigger a download
    const blob = new Blob([JSON.stringify(analyticsData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'analytics.json';
    a.click();
    URL.revokeObjectURL(url);  // Clean up the object URL
    window.App.showToast('Analytics data exported.');
  });

  // -------- Re-render charts when theme changes --------
  window.addEventListener('themechanged', () => {
    if (analyticsData) initAnalytics(analyticsData, currentRange);
  });
});

// ============================================================
// Compute default analytics data from the video store
// ============================================================

/**
 * Returns analytics data. When running locally, computes from stored videos.
 * This is the fallback function when analytics.json fetch fails.
 * @returns {Object} Analytics data object
 */
function getDefaultAnalytics() {
  return computeAnalyticsFromVideos();
}

/**
 * Computes full analytics data from published videos in the local store.
 * Generates viewsByDay for the last 30 days, top 10 videos by views,
 * tag distribution, device breakdown (simulated), totals, and average watch time.
 * @returns {Object} Complete analytics dataset
 */
function computeAnalyticsFromVideos() {
  // Only consider published videos
  const videos = window.App.getVideos().filter(v => v.status === 'published');
  const now = new Date();
  const viewsByDay = [];

  // Loop over the last 30 days to build views-by-day data
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];  // "YYYY-MM-DD"
    // Sum all views for videos published on this date
    const dayViews = videos
      .filter(v => v.publishDate === dateStr)
      .reduce((sum, v) => sum + Number(v.views), 0);
    // If no views for that day, generate a random value for demo purposes
    viewsByDay.push({ date: dateStr, views: dayViews || Math.floor(Math.random() * 5000) + 1000 });
  }

  // Top 10 videos sorted by views (descending)
  const topVideos = [...videos].sort((a, b) => b.views - a.views).slice(0, 10).map(v => ({
    id: v.id, title: v.title, views: Number(v.views)
  }));

  // Tag distribution: count how many videos use each tag
  const tagCounts = {};
  videos.forEach(v => (v.tags || []).forEach(tId => { tagCounts[tId] = (tagCounts[tId] || 0) + 1; }));
  const allTags = window.App.getTags();
  const tagDistribution = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])     // Sort by usage count descending
    .slice(0, 8)                      // Top 8 tags only
    .map(([tId, count]) => {
      const tag = allTags.find(t => t.id === tId);
      return {
        name: tag ? tag.name : tId,
        count,
        percentage: Math.round(count / videos.length * 100)  // Percentage of total videos
      };
    });

  // Return the complete analytics dataset
  return {
    viewsByDay,
    topVideos,
    // Fallback if no tags are used
    tagDistribution: tagDistribution.length > 0 ? tagDistribution : [
      { name: 'Programming', percentage: 25 },
      { name: 'Tutorial', percentage: 20 },
    ],
    deviceBreakdown: { Desktop: 60, Mobile: 35, Tablet: 5 },  // Simulated device stats
    totalViews: videos.reduce((s, v) => s + Number(v.views), 0),
    totalLikes: videos.reduce((s, v) => s + Number(v.likes), 0),
    totalVideos: videos.length,
    // Average watch time calculation from video durations
    avgWatchTime: videos.length > 0 ? Math.round(videos.reduce((s, v) => s + parseDurationToSeconds(v.duration), 0) / videos.length / 60) + ':00' : '0:00'
  };
}

/**
 * Converts a duration string (mm:ss or hh:mm:ss) to total seconds.
 * @param {string} d - Duration string, e.g., "5:30" or "1:15:00"
 * @returns {number} Total seconds
 */
function parseDurationToSeconds(d) {
  const parts = d.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];  // hh:mm:ss
  if (parts.length === 2) return parts[0] * 60 + parts[1];                    // mm:ss
  return 0;  // Invalid format
}

// ============================================================
// Initialize analytics: update stats and render all charts
// ============================================================

/**
 * Updates the summary stat displays and draws all charts (line, bar, pie, donut)
 * based on the provided analytics data and selected date range.
 * Catches and logs rendering errors to avoid breaking the page.
 * @param {Object} data  - The analytics data object
 * @param {string} range - The selected date range: "7", "30", or "90"
 */
function initAnalytics(data, range) {
  try {
    // Determine number of days to show based on the selected range
    const days = range === '7' ? 7 : range === '90' ? 90 : 30;
    if (!Array.isArray(data.viewsByDay)) return;  // Guard: need viewsByDay array
    // Slice the viewsByDay to only include the last N days
    const sliced = data.viewsByDay.slice(-days);

    // -------- Update summary stat cards --------
    document.getElementById('stat-total-views').textContent = data.totalViews.toLocaleString();
    document.getElementById('stat-total-likes').textContent = data.totalLikes.toLocaleString();
    document.getElementById('stat-total-videos').textContent = data.totalVideos;
    document.getElementById('stat-avg-watch').textContent = data.avgWatchTime;

    // -------- Calculate views change (recent half vs previous half) --------
    const half = Math.floor(sliced.length / 2);
    const recentViews = sliced.slice(half).reduce((s, d) => s + d.views, 0);  // Second half of period
    const prevViews = sliced.slice(0, half).reduce((s, d) => s + d.views, 0); // First half of period
    const change = prevViews > 0 ? ((recentViews - prevViews) / prevViews * 100).toFixed(1) : '+0';
    // Pick the arrow SVG direction based on whether change is positive (up) or negative (down)
    const arrow = change >= 0
      ? '<polyline points="18 15 12 9 6 15"></polyline>'
      : '<polyline points="6 9 12 15 18 9"></polyline>';
    // Update the views change indicator in the DOM
    document.getElementById('stat-views-change').innerHTML = `
      <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">${arrow}</svg>
      <span>${change >= 0 ? '+' : ''}${change}% vs last period</span>
    `;

    // -------- Draw all four charts --------
    drawLineChart('line-chart', sliced);          // Views over time (line)
    drawBarChart('bar-chart', data.topVideos);    // Top 10 videos by views (horizontal bar)
    drawPieChart('pie-chart', data.tagDistribution);  // Tag distribution (pie with hole)
    drawDonutChart('donut-chart', data.deviceBreakdown); // Device breakdown (donut)
  } catch (e) {
    // Log any rendering errors without crashing the page
    console.warn('Analytics render error:', e);
  }
}

// ============================================================
// Draw the line chart (views over time) with hover interaction
// ============================================================
/**
 * Renders a line chart on a canvas element showing views over time.
 * Includes gradient fill, gridlines, axis labels, data point dots,
 * and interactive hover with tooltip highlighting.
 * @param {string} canvasId - The ID of the canvas element
 * @param {Array}  data     - Array of { date, views } objects
 */
function drawLineChart(canvasId, data) {
  // Get the canvas element and its 2D context
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Set canvas size to match its parent container's CSS size, accounting for device pixel ratio
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width * window.devicePixelRatio;
  canvas.height = rect.height * window.devicePixelRatio;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

  const w = rect.width;   // Width in CSS pixels
  const h = rect.height;  // Height in CSS pixels

  // Theme-aware colors
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  const gridColor = isLight ? '#ebebeb' : '#2e2e2e';
  const textColor = isLight ? '#888888' : '#7c7c7c';
  const accentColor = isLight ? '#0070f3' : '#1ed760';

  // Padding for the chart area (leaves room for axis labels)
  const pad = { top: 20, right: 20, bottom: 30, left: 55 };
  const gw = w - pad.left - pad.right;  // Graph width
  const gh = h - pad.top - pad.bottom;  // Graph height

  ctx.clearRect(0, 0, w, h);  // Clear the canvas

  // Max Y value with 15% headroom so the line doesn't touch the top
  const maxVal = Math.max(...data.map(d => d.views)) * 1.15;

  // -------- Draw horizontal gridlines and Y-axis labels --------
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1;
  ctx.fillStyle = textColor;
  ctx.font = '10px var(--font-mono)';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  for (let i = 0; i <= 4; i++) {
    const val = (maxVal / 4) * i;
    const y = h - pad.bottom - (gh * (i / 4));
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(w - pad.right, y);
    ctx.stroke();
    ctx.fillText(Math.round(val).toLocaleString(), pad.left - 8, y);
  }
  ctx.setLineDash([]);

  // -------- Calculate data point positions --------
  const step = gw / (data.length - 1 || 1);  // Horizontal spacing between points
  const points = data.map((d, i) => ({
    x: pad.left + i * step,
    y: h - pad.bottom - (gh * (d.views / maxVal)),
    label: d.date.slice(5)  // Extract "MM-DD" from "YYYY-MM-DD"
  }));

  // -------- Draw X-axis date labels (only show a subset to avoid crowding) --------
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const labelStep = Math.max(1, Math.floor(data.length / 8));  // Show ~8 labels
  points.forEach((p, i) => {
    if (i % labelStep === 0 || i === data.length - 1) {
      ctx.fillStyle = textColor;
      ctx.fillText(p.label, p.x, h - pad.bottom + 8);
    }
  });

  // -------- Draw the gradient fill under the line --------
  const grad = ctx.createLinearGradient(0, pad.top, 0, h - pad.bottom);
  grad.addColorStop(0, isLight ? 'rgba(0,112,243,0.25)' : 'rgba(30,215,96,0.25)');
  grad.addColorStop(0.5, isLight ? 'rgba(0,112,243,0.08)' : 'rgba(30,215,96,0.08)');
  grad.addColorStop(1, isLight ? 'rgba(0,112,243,0.01)' : 'rgba(30,215,96,0.01)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(points[0].x, h - pad.bottom);
  points.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.lineTo(points[points.length - 1].x, h - pad.bottom);
  ctx.closePath();
  ctx.fill();

  // -------- Draw the main line stroke --------
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = accentColor;
  ctx.shadowBlur = 4;  // Glow effect on the line
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  points.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.stroke();
  ctx.shadowBlur = 0;  // Reset shadow

  // -------- Draw data point dots --------
  ctx.fillStyle = isLight ? '#ffffff' : '#121212';
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 2;
  points.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });

  // -------- Interactive hover: tooltip and highlight --------
  const tooltip = document.getElementById('chart-tooltip');
  if (!tooltip) return;

  let hoveredPoint = -1;  // Track which point is currently hovered

  // Mouse move handler: detect closest point and show tooltip
  canvas.onmousemove = function(e) {
    const r = canvas.getBoundingClientRect();
    const mx = e.clientX - r.left;  // Mouse X relative to canvas

    // Find the closest data point horizontally
    let minDist = Infinity;
    let closest = null;
    points.forEach(p => {
      const d = Math.abs(mx - p.x);
      if (d < minDist) { minDist = d; closest = p; }
    });

    // If a point is within 40px, show tooltip
    if (closest && minDist < 40) {
      const idx = points.indexOf(closest);

      // Only redraw if hovering a new point (performance optimization)
      if (hoveredPoint !== idx) {
        ctx.clearRect(0, 0, w, h);
        redrawChart(ctx, points, data, maxVal, w, h, pad, gw, gh, accentColor, gridColor, textColor, isLight, labelStep);

        // Draw a larger highlight circle on the hovered point
        const hp = points[idx];
        ctx.fillStyle = accentColor;
        ctx.beginPath();
        ctx.arc(hp.x, hp.y, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = isLight ? '#ffffff' : '#121212';
        ctx.beginPath();
        ctx.arc(hp.x, hp.y, 4, 0, Math.PI * 2);
        ctx.fill();
        hoveredPoint = idx;
      }

      // Update and show the tooltip
      tooltip.innerHTML = `<strong>${data[idx].date}</strong>: ${data[idx].views.toLocaleString()} views`;
      tooltip.style.left = (e.clientX + 12) + 'px';
      tooltip.style.top = (e.clientY - 10) + 'px';
      tooltip.classList.add('visible');
    } else {
      // Mouse is not near any point → hide tooltip
      if (hoveredPoint !== -1) {
        ctx.clearRect(0, 0, w, h);
        redrawChart(ctx, points, data, maxVal, w, h, pad, gw, gh, accentColor, gridColor, textColor, isLight, labelStep);
        hoveredPoint = -1;
      }
      tooltip.classList.remove('visible');
    }
  };

  // Mouse leave handler: clear hover state and hide tooltip
  canvas.onmouseleave = () => {
    if (hoveredPoint !== -1) {
      ctx.clearRect(0, 0, w, h);
      redrawChart(ctx, points, data, maxVal, w, h, pad, gw, gh, accentColor, gridColor, textColor, isLight, labelStep);
      hoveredPoint = -1;
    }
    tooltip.classList.remove('visible');
  };
}

// ============================================================
// Redraw the line chart (used when re-rendering during hover)
// ============================================================
/**
 * Redraws the static elements of the line chart (grid, line, gradient, dots).
 * Called when clearing and redrawing during hover state changes to avoid
 * duplicating the drawing code.
 */
function redrawChart(ctx, points, data, maxVal, w, h, pad, gw, gh, accentColor, gridColor, textColor, isLight, labelStep) {
  // Draw gridlines
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1;
  ctx.fillStyle = textColor;
  ctx.font = '10px var(--font-mono)';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let i = 0; i <= 4; i++) {
    const val = (maxVal / 4) * i;
    const y = h - pad.bottom - (gh * (i / 4));
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(w - pad.right, y);
    ctx.stroke();
    ctx.fillText(Math.round(val).toLocaleString(), pad.left - 8, y);
  }
  ctx.setLineDash([]);

  // Draw X-axis labels
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  points.forEach((p, i) => {
    if (i % labelStep === 0 || i === data.length - 1) {
      ctx.fillStyle = textColor;
      ctx.fillText(p.label, p.x, h - pad.bottom + 8);
    }
  });

  // Draw gradient fill
  const grad = ctx.createLinearGradient(0, pad.top, 0, h - pad.bottom);
  grad.addColorStop(0, isLight ? 'rgba(0,112,243,0.25)' : 'rgba(30,215,96,0.25)');
  grad.addColorStop(0.5, isLight ? 'rgba(0,112,243,0.08)' : 'rgba(30,215,96,0.08)');
  grad.addColorStop(1, isLight ? 'rgba(0,112,243,0.01)' : 'rgba(30,215,96,0.01)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(points[0].x, h - pad.bottom);
  points.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.lineTo(points[points.length - 1].x, h - pad.bottom);
  ctx.closePath();
  ctx.fill();

  // Draw line stroke with shadow glow
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = accentColor;
  ctx.shadowBlur = 4;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  points.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Draw data point dots
  ctx.fillStyle = isLight ? '#ffffff' : '#121212';
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 2;
  points.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });
}

// Color palette for bar chart bars
const BAR_COLORS = ['#0070f3', '#7928ca', '#ff0080', '#ffa42b', '#50e3c2', '#f3727f', '#1db954', '#539df5', '#e91e63', '#ff5722'];

// ============================================================
// Draw horizontal bar chart (top videos by views)
// ============================================================
/**
 * Renders a horizontal bar chart showing the top videos by view count.
 * Supports hover highlighting and tooltip display.
 * @param {string} canvasId - The ID of the canvas element
 * @param {Array}  data     - Array of { id, title, views } objects
 */
function drawBarChart(canvasId, data) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Set canvas size with device pixel ratio for sharp rendering
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width * window.devicePixelRatio;
  canvas.height = rect.height * window.devicePixelRatio;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

  const w = rect.width;
  const h = rect.height;
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  const textColor = isLight ? '#888888' : '#7c7c7c';

  // Padding: left side extra wide for video title labels, right for view counts
  const pad = { top: 20, right: 80, bottom: 10, left: 150 };
  const gw = w - pad.left - pad.right;  // Graph width

  ctx.clearRect(0, 0, w, h);

  // Calculate bar dimensions
  const maxVal = Math.max(...data.map(d => d.views)) * 1.1;  // Max value with 10% headroom
  const barH = Math.min(26, (h - pad.top - pad.bottom) / data.length - 6);  // Bar height with spacing

  // Array to store bar bounding boxes for hit detection
  const bars = [];

  /**
   * Renders all bars. If hoverIdx >= 0, that bar is highlighted with full opacity.
   * @param {number} hoverIdx - Index of the hovered bar, or -1 for none
   */
  function renderBars(hoverIdx) {
    ctx.clearRect(0, 0, w, h);
    ctx.textBaseline = 'middle';

    data.forEach((d, i) => {
      const y = pad.top + i * (barH + 8) + barH / 2;  // Vertical center of bar
      const bw = Math.max(4, (d.views / maxVal) * gw); // Bar width proportional to views

      // Draw video title label (truncated to 24 chars)
      let label = d.title;
      if (label.length > 24) label = label.slice(0, 22) + '...';

      ctx.fillStyle = textColor;
      ctx.font = '11px var(--font-sans)';
      ctx.textAlign = 'right';
      ctx.fillText(label, pad.left - 10, y);

      // Draw the bar with a gradient (duller when not hovered)
      const color = BAR_COLORS[i % BAR_COLORS.length];
      const isHovered = i === hoverIdx;
      const grad = ctx.createLinearGradient(pad.left, 0, pad.left + bw, 0);
      grad.addColorStop(0, color);
      grad.addColorStop(1, isHovered ? color : color + '60');  // Semi-transparent when not hovered
      ctx.fillStyle = grad;

      // Draw rounded rectangle bar
      const radius = Math.min(4, barH / 2);  // Corner radius
      const bx = pad.left;
      const by = pad.top + i * (barH + 8);
      const bw2 = Math.max(bw, radius * 2);  // Ensure minimum width for rounded corners
      ctx.beginPath();
      ctx.moveTo(bx + radius, by);
      ctx.lineTo(bx + bw2 - radius, by);
      ctx.arcTo(bx + bw2, by, bx + bw2, by + radius, radius);
      ctx.lineTo(bx + bw2, by + barH - radius);
      ctx.arcTo(bx + bw2, by + barH, bx + bw2 - radius, by + barH, radius);
      ctx.lineTo(bx + radius, by + barH);
      ctx.arcTo(bx, by + barH, bx, by + barH - radius, radius);
      ctx.lineTo(bx, by + radius);
      ctx.arcTo(bx, by, bx + radius, by, radius);
      ctx.closePath();
      ctx.fill();

      // Draw the view count number to the right of the bar
      ctx.fillStyle = textColor;
      ctx.textAlign = 'right';
      ctx.font = '10px var(--font-mono)';
      ctx.fillText(d.views.toLocaleString(), pad.left + bw2 + 8, y);

      // Store bar bounds for hit detection
      bars[i] = { bx: pad.left, by: pad.top + i * (barH + 8), bw: bw2, bh: barH };
    });
  }

  renderBars(-1);  // Initial render (no hover)

  const tooltip = document.getElementById('chart-tooltip');
  if (!tooltip) return;

  let hoveredBar = -1;

  // Mouse move handler: detect which bar is being hovered
  canvas.onmousemove = function(e) {
    const r = canvas.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const my = e.clientY - r.top;
    let found = -1;
    // Check each bar's bounding box
    for (let i = 0; i < bars.length; i++) {
      const b = bars[i];
      if (mx >= b.bx && mx <= b.bx + b.bw && my >= b.by && my <= b.by + b.bh) {
        found = i;
        break;
      }
    }
    // Only re-render if hover state changed
    if (found !== hoveredBar) {
      renderBars(found);
      hoveredBar = found;
    }
    // Show tooltip if hovering a bar
    if (found !== -1) {
      const d = data[found];
      let label = d.title;
      if (label.length > 30) label = label.slice(0, 28) + '...';
      tooltip.innerHTML = `<strong>${label}</strong>: ${d.views.toLocaleString()} views`;
      tooltip.style.left = (e.clientX + 12) + 'px';
      tooltip.style.top = (e.clientY - 10) + 'px';
      tooltip.classList.add('visible');
    } else {
      tooltip.classList.remove('visible');
    }
  };

  // Mouse leave handler: clear hover state
  canvas.onmouseleave = () => {
    if (hoveredBar !== -1) {
      renderBars(-1);
      hoveredBar = -1;
    }
    tooltip.classList.remove('visible');
  };
}

// Color palette for pie chart segments
const PIE_COLORS = ['#0070f3', '#7928ca', '#ff0080', '#ffa42b', '#50e3c2', '#f3727f', '#1db954', '#539df5'];

// ============================================================
// Draw the pie chart (tag distribution) with donut hole and hover interaction
// ============================================================
/**
 * Renders a pie (donut) chart showing tag distribution percentages.
 * Supports hover explosion effect (slice pulls outward), tooltip, and
 * a legend with hover highlighting.
 * @param {string} canvasId - The ID of the canvas element
 * @param {Array}  data     - Array of { name, percentage } objects
 */
function drawPieChart(canvasId, data) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Set canvas size with device pixel ratio
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width * window.devicePixelRatio;
  canvas.height = rect.height * window.devicePixelRatio;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

  const w = rect.width;
  const h = rect.height;
  const cx = w / 2;                 // Center X
  const cy = h / 2;                 // Center Y
  const radius = Math.min(w, h) / 2 - 20;  // Outer radius with padding

  // Calculate total of all percentages (may not be exactly 100)
  const total = data.reduce((s, d) => s + d.percentage, 0);
  const segments = [];
  let accumAngle = -Math.PI / 2;  // Start from the top (12 o'clock)

  // Compute the start, end, and midpoint angles for each slice
  data.forEach((d, i) => {
    const sliceAngle = (d.percentage / total) * Math.PI * 2;
    segments.push({ start: accumAngle, end: accumAngle + sliceAngle, mid: accumAngle + sliceAngle / 2 });
    accumAngle += sliceAngle;
  });

  /**
   * Renders the pie chart. If hoverIdx >= 0, that slice "explodes" outward.
   * @param {number} hoverIdx - Index of the hovered slice, or -1 for none
   */
  function renderPie(hoverIdx) {
    ctx.clearRect(0, 0, w, h);

    // Draw each slice
    segments.forEach((seg, i) => {
      const isHovered = i === hoverIdx;
      const explodeDist = isHovered ? 10 : 0;  // Pull-out distance when hovered
      // Offset the slice center for the explode effect
      const offX = Math.cos(seg.mid) * explodeDist;
      const offY = Math.sin(seg.mid) * explodeDist;

      // Draw the slice arc
      ctx.beginPath();
      ctx.moveTo(cx + offX, cy + offY);
      ctx.arc(cx + offX, cy + offY, radius, seg.start, seg.end);
      ctx.closePath();
      ctx.fillStyle = PIE_COLORS[i % PIE_COLORS.length];
      ctx.fill();
      ctx.strokeStyle = isThemeLight() ? '#fafafa' : '#121212';
      ctx.lineWidth = isHovered ? 3 : 2;
      ctx.stroke();

      // Draw the percentage label inside the slice
      const labelR = radius * 0.65;  // Distance from center for label
      const lx = cx + offX + Math.cos(seg.mid) * labelR;
      const ly = cy + offY + Math.sin(seg.mid) * labelR;

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px var(--font-sans)';
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = 4;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // Only show label if the slice is large enough (>5%)
      if (data[i].percentage > 5) {
        ctx.fillText(data[i].percentage + '%', lx, ly);
      }
      ctx.shadowBlur = 0;
    });

    // Draw the donut hole (inner circle)
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.42, 0, Math.PI * 2);
    ctx.fillStyle = isThemeLight() ? '#fafafa' : '#121212';
    ctx.fill();
    ctx.strokeStyle = isThemeLight() ? '#ebebeb' : '#2e2e2e';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Draw text inside the donut hole
    ctx.fillStyle = isThemeLight() ? '#171717' : '#ffffff';
    ctx.font = 'bold 14px var(--font-sans)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Tags', cx, cy - 6);
    ctx.font = '11px var(--font-sans)';
    ctx.fillStyle = isThemeLight() ? '#888888' : '#7c7c7c';
    ctx.fillText(data.length + ' categories', cx, cy + 12);
  }

  renderPie(-1);  // Initial render (no hover)

  /**
   * Determines which pie segment the mouse coordinates fall into.
   * Returns -1 if the mouse is outside the pie or in the donut hole.
   * @param {number} mx - Mouse X relative to canvas
   * @param {number} my - Mouse Y relative to canvas
   * @returns {number} Index of hovered segment, or -1
   */
  function getHoveredSegment(mx, my) {
    const dx = mx - cx;
    const dy = my - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    // Must be within outer radius but outside the inner donut hole
    if (dist > radius || dist < radius * 0.42) return -1;
    let angle = Math.atan2(dy, dx);  // Angle in radians (-π to π)
    if (angle < -Math.PI / 2) angle += Math.PI * 2;  // Normalize to match our 12-o'clock start
    for (let i = 0; i < segments.length; i++) {
      const s = segments[i];
      if (angle >= s.start && angle < s.end) return i;
    }
    return -1;
  }

  const tooltip = document.getElementById('chart-tooltip');
  if (!tooltip) return;

  let hoveredSeg = -1;

  // Mouse move handler: detect hovered segment and show tooltip
  canvas.onmousemove = function(e) {
    const r = canvas.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const my = e.clientY - r.top;
    const seg = getHoveredSegment(mx, my);
    if (seg !== hoveredSeg) {
      renderPie(seg);      // Re-render with (or without) explode effect
      hoveredSeg = seg;
    }
    if (seg !== -1) {
      tooltip.innerHTML = `<strong>${data[seg].name}</strong>: ${data[seg].percentage}% of content`;
      tooltip.style.left = (e.clientX + 12) + 'px';
      tooltip.style.top = (e.clientY - 10) + 'px';
      tooltip.classList.add('visible');
    } else {
      tooltip.classList.remove('visible');
    }
  };

  // Mouse leave handler: clear hover state
  canvas.onmouseleave = () => {
    if (hoveredSeg !== -1) {
      renderPie(-1);
      hoveredSeg = -1;
    }
    tooltip.classList.remove('visible');
  };

  // -------- Legend with hover interaction --------
  const legend = document.getElementById('pie-legend');
  if (legend) {
    legend.innerHTML = data.map((d, i) => `
      <div class="chart-legend-item" data-index="${i}">
        <span class="chart-legend-dot" style="background-color:${PIE_COLORS[i % PIE_COLORS.length]}"></span>
        ${d.name} (${d.percentage}%)
      </div>
    `).join('');
    legend.querySelectorAll('.chart-legend-item').forEach(el => {
      el.addEventListener('mouseenter', () => {
        const idx = parseInt(el.dataset.index, 10);
        renderPie(idx);    // Highlight the corresponding slice
        hoveredSeg = idx;
      });
      el.addEventListener('mouseleave', () => {
        renderPie(-1);     // Remove highlight
        hoveredSeg = -1;
      });
    });
  }
}

// Color map for donut chart segments by device type
const DONUT_COLORS = { Desktop: '#0070f3', Mobile: '#7928ca', Tablet: '#50e3c2' };

// ============================================================
// Draw the donut chart (device breakdown) with hover interaction
// ============================================================
/**
 * Renders a donut chart showing device type distribution (Desktop/Mobile/Tablet).
 * Supports hover explode effect, tooltip, and interactive legend.
 * @param {string} canvasId - The ID of the canvas element
 * @param {Object} data     - Object like { Desktop: 60, Mobile: 35, Tablet: 5 }
 */
function drawDonutChart(canvasId, data) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Set canvas dimensions with device pixel ratio
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width * window.devicePixelRatio;
  canvas.height = rect.height * window.devicePixelRatio;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

  const w = rect.width;
  const h = rect.height;
  const cx = w / 2;                   // Center X
  const cy = h / 2;                   // Center Y
  const outerR = Math.min(w, h) / 2 - 20;  // Outer radius
  const innerR = outerR * 0.58;            // Inner radius (creates the donut hole)

  // Convert data object into entries array and compute segments
  const entries = Object.entries(data);
  const total = entries.reduce((s, [, v]) => s + v, 0);  // Sum of all values (should be 100)
  const segments = [];
  let accumAngle = -Math.PI / 2;  // Start from top (12 o'clock)

  entries.forEach(([key, val]) => {
    const sliceAngle = (val / total) * Math.PI * 2;
    segments.push({ key, val, start: accumAngle, end: accumAngle + sliceAngle, mid: accumAngle + sliceAngle / 2 });
    accumAngle += sliceAngle;
  });

  /**
   * Renders the donut chart with optional hover explode effect.
   * @param {number} hoverIdx - Index of hovered segment, or -1 for none
   */
  function renderDonut(hoverIdx) {
    ctx.clearRect(0, 0, w, h);

    // Draw each donut segment
    segments.forEach((seg, i) => {
      const isHovered = i === hoverIdx;
      const explodeDist = isHovered ? 8 : 0;  // Pull-out distance
      const offX = Math.cos(seg.mid) * explodeDist;
      const offY = Math.sin(seg.mid) * explodeDist;

      // Draw an arc ring (outer arc outward, inner arc back)
      ctx.beginPath();
      ctx.arc(cx + offX, cy + offY, outerR, seg.start, seg.end);
      ctx.arc(cx + offX, cy + offY, innerR, seg.end, seg.start, true);
      ctx.closePath();
      ctx.fillStyle = DONUT_COLORS[seg.key] || '#888';
      ctx.fill();
      ctx.strokeStyle = isThemeLight() ? '#fafafa' : '#121212';
      ctx.lineWidth = isHovered ? 3 : 2;
      ctx.stroke();
    });

    // Draw text in the center of the donut
    ctx.fillStyle = isThemeLight() ? '#171717' : '#ffffff';
    ctx.font = 'bold 22px var(--font-sans)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(total, cx, cy - 4);          // Total sessions (e.g., "100")
    ctx.font = '11px var(--font-sans)';
    ctx.fillStyle = isThemeLight() ? '#888888' : '#7c7c7c';
    ctx.fillText('Sessions', cx, cy + 20);    // Label below total
  }

  renderDonut(-1);  // Initial render (no hover)

  /**
   * Determines which donut segment is under the mouse coordinates.
   * Returns -1 if mouse is outside the donut ring.
   * @param {number} mx - Mouse X relative to canvas
   * @param {number} my - Mouse Y relative to canvas
   * @returns {number} Index of hovered segment, or -1
   */
  function getHoveredSegment(mx, my) {
    const dx = mx - cx;
    const dy = my - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    // Must be within outer ring and outside inner hole
    if (dist > outerR || dist < innerR) return -1;
    let angle = Math.atan2(dy, dx);
    if (angle < -Math.PI / 2) angle += Math.PI * 2;  // Normalize angle
    for (let i = 0; i < segments.length; i++) {
      const s = segments[i];
      if (angle >= s.start && angle < s.end) return i;
    }
    return -1;
  }

  const tooltip = document.getElementById('chart-tooltip');
  if (!tooltip) return;

  let hoveredSeg = -1;

  // Mouse move handler: detect hovered segment and show tooltip
  canvas.onmousemove = function(e) {
    const r = canvas.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const my = e.clientY - r.top;
    const seg = getHoveredSegment(mx, my);
    if (seg !== hoveredSeg) {
      renderDonut(seg);    // Re-render with/without explode
      hoveredSeg = seg;
    }
    if (seg !== -1) {
      tooltip.innerHTML = `<strong>${segments[seg].key}</strong>: ${segments[seg].val}% of traffic`;
      tooltip.style.left = (e.clientX + 12) + 'px';
      tooltip.style.top = (e.clientY - 10) + 'px';
      tooltip.classList.add('visible');
    } else {
      tooltip.classList.remove('visible');
    }
  };

  // Mouse leave handler: clear hover state
  canvas.onmouseleave = () => {
    if (hoveredSeg !== -1) {
      renderDonut(-1);
      hoveredSeg = -1;
    }
    tooltip.classList.remove('visible');
  };

  // -------- Legend with hover interaction --------
  const legend = document.getElementById('donut-legend');
  if (legend) {
    legend.innerHTML = segments.map((seg, i) => `
      <div class="chart-legend-item" data-index="${i}">
        <span class="chart-legend-dot" style="background-color:${DONUT_COLORS[seg.key] || '#888'}"></span>
        ${seg.key} (${seg.val}%)
      </div>
    `).join('');
    legend.querySelectorAll('.chart-legend-item').forEach(el => {
      el.addEventListener('mouseenter', () => {
        const idx = parseInt(el.dataset.index, 10);
        renderDonut(idx);  // Highlight corresponding segment
        hoveredSeg = idx;
      });
      el.addEventListener('mouseleave', () => {
        renderDonut(-1);   // Remove highlight
        hoveredSeg = -1;
      });
    });
  }
}

// ============================================================
// Utility: check if the current theme is light
// ============================================================
/**
 * Checks the current theme by reading the data-theme attribute on <html>.
 * @returns {boolean} True if theme is "light", false otherwise
 */
function isThemeLight() {
  return document.documentElement.getAttribute('data-theme') === 'light';
}
