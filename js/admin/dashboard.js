// Admin Dashboard logic & canvas charts
document.addEventListener('DOMContentLoaded', () => {
  // 1. Inject Admin Sidebar
  window.Components.injectAdminSidebar('dashboard');

  // 2. Fetch video data & compute statistics
  const videos = window.App.getVideos();
  const categories = window.App.getCategories();
  
  computeStats(videos, categories);

  // 3. Render recent uploads (5 rows max)
  renderRecentUploadsTable(videos, categories);

  // 4. Draw Canvas Analytics Line Chart (7 days views trend)
  drawViewsChart();

  // Redraw chart if theme changes
  window.addEventListener('themechanged', () => {
    drawViewsChart();
  });
});

// Compute platform metrics
function computeStats(videos, categories) {
  const totalVideos = videos.length;
  const totalViews = videos.reduce((acc, v) => acc + Number(v.views), 0);
  const totalLikes = videos.reduce((acc, v) => acc + Number(v.likes), 0);
  const totalCategories = categories.length;

  document.getElementById('stat-total-videos').innerText = totalVideos;
  document.getElementById('stat-total-views').innerText = totalViews.toLocaleString();
  document.getElementById('stat-total-likes').innerText = totalLikes.toLocaleString();
  document.getElementById('stat-total-categories').innerText = totalCategories;
}

// Render Recent Uploads Table (max 5 rows)
function renderRecentUploadsTable(videos, categories) {
  const tbody = document.getElementById('recent-uploads-tbody');
  if (!tbody) return;

  const sortedRecent = [...videos]
    .sort((a, b) => new Date(b.publishDate) - new Date(a.publishDate))
    .slice(0, 5);

  if (sortedRecent.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No videos found.</td></tr>';
    return;
  }

  tbody.innerHTML = sortedRecent.map(vid => {
    const cat = categories.find(c => c.id === vid.category)?.name || vid.category;
    const badgeClass = vid.status === 'published' ? 'badge-success' : 'badge-warning';
    
    return `
      <tr>
        <td>
          <div class="video-cell-thumb">
            <img src="${vid.thumbnail}" alt="${vid.title} Thumb">
          </div>
        </td>
        <td style="font-weight: 500;">${vid.title}</td>
        <td>${cat}</td>
        <td style="font-family: var(--font-mono);">${Number(vid.views).toLocaleString()}</td>
        <td><span class="badge ${badgeClass}">${vid.status}</span></td>
      </tr>
    `;
  }).join('');
}

// Draw a beautiful custom line chart with Canvas API
function drawViewsChart() {
  const canvas = document.getElementById('analytics-line-chart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  
  // Set canvas display resolution based on actual sizing (retina support)
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * window.devicePixelRatio;
  canvas.height = rect.height * window.devicePixelRatio;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

  const width = rect.width;
  const height = rect.height;

  // Chart theme colors
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  const gridColor = isLight ? '#ebebeb' : '#2e2e2e';
  const textColor = isLight ? '#888888' : '#7c7c7c';
  const accentColor = isLight ? '#0070f3' : '#1ed760'; // Vercel Blue / Spotify Green
  
  // Chart Data: Views over the last 7 days
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const data = [12000, 19000, 15000, 25000, 22000, 30000, 28000];
  const maxVal = Math.max(...data) * 1.15; // 15% headroom

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  // Setup padding
  const paddingLeft = 45;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;

  const graphWidth = width - paddingLeft - paddingRight;
  const graphHeight = height - paddingTop - paddingBottom;

  // Draw Gridlines and Y labels
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
    
    // Gridline
    ctx.beginPath();
    ctx.moveTo(paddingLeft, y);
    ctx.lineTo(width - paddingRight, y);
    ctx.stroke();

    // Label
    ctx.fillText(Math.round(val).toLocaleString(), paddingLeft - 8, y);
  }

  // Draw X labels
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const stepX = graphWidth / (data.length - 1);

  for (let i = 0; i < data.length; i++) {
    const x = paddingLeft + (i * stepX);
    ctx.fillText(labels[i], x, height - paddingBottom + 8);
  }

  // Draw Line and Gradient fill
  const points = data.map((val, idx) => {
    return {
      x: paddingLeft + (idx * stepX),
      y: height - paddingBottom - (graphHeight * (val / maxVal))
    };
  });

  // 1. Draw Area Gradient
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
  
  // Smooth curves
  for (let i = 0; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.lineTo(points[points.length - 1].x, height - paddingBottom);
  ctx.closePath();
  ctx.fill();

  // 2. Draw Stroke Line
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();

  // 3. Draw Dots on hover values
  ctx.fillStyle = isLight ? '#ffffff' : '#121212';
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 2;

  for (let i = 0; i < points.length; i++) {
    ctx.beginPath();
    ctx.arc(points[i].x, points[i].y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}
