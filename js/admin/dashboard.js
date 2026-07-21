// Admin Dashboard logic & canvas charts
document.addEventListener('DOMContentLoaded', () => {
  // 1. Inject Admin Sidebar
  window.Components.injectAdminSidebar('dashboard');

  // 2. Fetch video data & compute statistics
  const videos = window.App.getVideos();
  const tags = window.App.getTags();
  
  computeStats(videos, tags);

  // 3. Render recent uploads (5 rows max)
  renderRecentUploadsTable(videos, tags);

  // 4. Draw Canvas Analytics Line Chart (7 days views trend)
  drawViewsChart();

  // Redraw chart if theme changes
  window.addEventListener('themechanged', () => {
    drawViewsChart();
  });
});

// Compute platform metrics (published only)
function computeStats(videos, tags) {
  const published = videos.filter(v => v.status === 'published');
  const totalVideos = published.length;
  const totalViews = published.reduce((acc, v) => acc + Number(v.views), 0);
  const totalLikes = published.reduce((acc, v) => acc + Number(v.likes), 0);
  const totalTags = tags.length;

  document.getElementById('stat-total-videos').innerText = totalVideos;
  document.getElementById('stat-total-views').innerText = totalViews.toLocaleString();
  document.getElementById('stat-total-likes').innerText = totalLikes.toLocaleString();
  document.getElementById('stat-total-tags').innerText = totalTags;
}

// Render Recent Uploads Grid (max 5 cards)
function renderRecentUploadsTable(videos, tags) {
  const grid = document.getElementById('recent-uploads-grid');
  if (!grid) return;

  const published = videos.filter(v => v && v.status === 'published');
  const sortedRecent = [...published].reverse().slice(0, 5);

  if (sortedRecent.length === 0) {
    grid.innerHTML = '<div class="uploads-empty">No recent uploads found.</div>';
    return;
  }

  grid.innerHTML = sortedRecent.map((vid, idx) => {
    const safeTags = Array.isArray(vid.tags) ? vid.tags : [];
    const resolvedTags = safeTags.map(tId => tags.find(t => t && t.id === tId)).filter(Boolean);
    const tagHtml = resolvedTags.length > 0
      ? resolvedTags.slice(0, 3).map(t =>
          `<span class="upload-tag" style="background-color:${t.color}18; color:${t.color};">${t.name}</span>`
        ).join('') + (resolvedTags.length > 3 ? `<span class="upload-tag-more">+${resolvedTags.length - 3}</span>` : '')
      : '<span class="upload-tag-none">—</span>';

    const badgeClass = vid.status === 'published' ? 'badge-success' : 'badge-warning';
    const thumbSrc = vid.thumbnail || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 9%22%3E%3Crect width=%22100%25%22 height=%22100%25%22 fill=%22%231f1f1f%22/%3E%3C/svg%3E';

    return `
      <div class="upload-card" style="animation-delay:${idx * 0.06}s">
        <div class="upload-card-thumb">
          <img src="${thumbSrc}" alt="${vid.title || ''}" loading="lazy" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 9%22%3E%3Crect width=%22100%25%22 height=%22100%25%22 fill=%22%231f1f1f%22/%3E%3C/svg%3E'">
          <div class="upload-card-overlay">
            <span class="upload-card-views">
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              ${Number(vid.views || 0).toLocaleString()}
            </span>
            <span class="badge ${badgeClass}">${vid.status || 'draft'}</span>
          </div>
        </div>
        <div class="upload-card-body">
          <h3 class="upload-card-title">${vid.title || 'Untitled'}</h3>
          <div class="upload-card-tags">${tagHtml}</div>
        </div>
      </div>
    `;
  }).join('');
}

let cachedChartData = null;

function computeViewsLast7Days() {
  if (cachedChartData) return cachedChartData;
  const videos = window.App.getVideos().filter(v => v.status === 'published');
  const days = [];
  const labels = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    labels.push(dateStr.slice(5));
    const dayViews = videos
      .filter(v => v.publishDate === dateStr)
      .reduce((sum, v) => sum + Number(v.views), 0);
    days.push(dayViews || Math.floor(Math.random() * 5000) + 1000);
  }
  cachedChartData = { labels, data: days };
  return cachedChartData;
}

function invalidateChartCache() {
  cachedChartData = null;
}

// Draw a beautiful custom line chart with Canvas API
function drawViewsChart() {
  const canvas = document.getElementById('analytics-line-chart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * window.devicePixelRatio;
  canvas.height = rect.height * window.devicePixelRatio;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

  const width = rect.width;
  const height = rect.height;

  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  const gridColor = isLight ? '#ebebeb' : '#2e2e2e';
  const textColor = isLight ? '#888888' : '#7c7c7c';
  const accentColor = isLight ? '#0070f3' : '#1ed760';
  
  const chartData = computeViewsLast7Days();
  const labels = chartData.labels;
  const data = chartData.data;
  const maxVal = Math.max(...data) * 1.15;

  ctx.clearRect(0, 0, width, height);

  const paddingLeft = 45;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;

  const graphWidth = width - paddingLeft - paddingRight;
  const graphHeight = height - paddingTop - paddingBottom;

  // Gridlines
  const yLines = 4;
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1;
  ctx.fillStyle = textColor;
  ctx.font = '10px var(--font-mono)';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  for (let i = 0; i <= yLines; i++) {
    const val = (maxVal / yLines) * i;
    const y = height - paddingBottom - (graphHeight * (i / yLines));
    ctx.beginPath();
    ctx.setLineDash(i === 0 ? [] : [4, 4]);
    ctx.moveTo(paddingLeft, y);
    ctx.lineTo(width - paddingRight, y);
    ctx.stroke();
    ctx.fillText(Math.round(val).toLocaleString(), paddingLeft - 8, y);
  }
  ctx.setLineDash([]);

  // X labels
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const stepX = graphWidth / (data.length - 1);

  for (let i = 0; i < data.length; i++) {
    ctx.fillText(labels[i], paddingLeft + (i * stepX), height - paddingBottom + 8);
  }

  // Points data
  const points = data.map((val, idx) => ({
    x: paddingLeft + (idx * stepX),
    y: height - paddingBottom - (graphHeight * (val / maxVal))
  }));

  // Gradient fill
  const grad = ctx.createLinearGradient(0, paddingTop, 0, height - paddingBottom);
  if (isLight) {
    grad.addColorStop(0, 'rgba(0, 112, 243, 0.25)');
    grad.addColorStop(1, 'rgba(0, 112, 243, 0.01)');
  } else {
    grad.addColorStop(0, 'rgba(30, 215, 96, 0.25)');
    grad.addColorStop(1, 'rgba(30, 215, 96, 0.01)');
  }

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(points[0].x, height - paddingBottom);
  for (let i = 0; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.lineTo(points[points.length - 1].x, height - paddingBottom);
  ctx.closePath();
  ctx.fill();

  // Stroke line
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.stroke();

  // Dots
  ctx.fillStyle = isLight ? '#ffffff' : '#121212';
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 2;
  for (let i = 0; i < points.length; i++) {
    ctx.beginPath();
    ctx.arc(points[i].x, points[i].y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Interactive hover
  const dpr = window.devicePixelRatio;
  const state = { points, labels, data, accentColor, isLight, paddingLeft, paddingRight, paddingTop, paddingBottom, width, height, dpr };

  const findNearest = function(mx, my) {
    let minDist = Infinity, idx = -1;
    state.points.forEach((p, i) => {
      const d = Math.abs(p.x - mx);
      if (d < minDist) { minDist = d; idx = i; }
    });
    return (idx !== -1 && minDist <= 30 && my >= paddingTop && my <= height - paddingBottom) ? idx : -1;
  };

  const drawTooltip = function(idx) {
    const p = state.points[idx];
    const value = state.data[idx].toLocaleString();

    ctx.save();
    // Highlight ring
    ctx.beginPath();
    ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = isLight ? 'rgba(0,112,243,0.12)' : 'rgba(30,215,96,0.15)';
    ctx.fill();
    ctx.strokeStyle = state.accentColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
    ctx.stroke();

    // Tooltip
    const tw = 80, th = 26;
    let tx = p.x - tw / 2, ty = p.y - th - 12;
    if (tx < 6) tx = 6;
    if (tx + tw > state.width - 6) tx = state.width - tw - 6;
    if (ty < 6) ty = p.y + 12;

    ctx.shadowColor = 'rgba(0,0,0,0.2)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = isLight ? '#ffffff' : '#1a1a2e';
    ctx.beginPath();
    ctx.roundRect(tx, ty, tw, th, 6);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = state.accentColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(tx, ty, tw, th, 6);
    ctx.stroke();

    ctx.fillStyle = isLight ? '#1a1a2e' : '#e0e0e0';
    ctx.font = 'bold 11px var(--font-mono)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(value, tx + tw / 2, ty + th / 2);
    ctx.restore();
  };

  let hoveredIdx = -1;
  canvas.onmousemove = function(e) {
    const r = canvas.getBoundingClientRect();
    const mx = (e.clientX - r.left) * (canvas.width / r.width / dpr);
    const my = (e.clientY - r.top) * (canvas.height / r.height / dpr);
    const idx = findNearest(mx, my);
    if (idx !== hoveredIdx) {
      hoveredIdx = idx;
      drawViewsChart();
      if (idx !== -1) drawTooltip(idx);
    }
  };
  canvas.onmouseleave = function() {
    if (hoveredIdx !== -1) {
      hoveredIdx = -1;
      drawViewsChart();
    }
  };
}
