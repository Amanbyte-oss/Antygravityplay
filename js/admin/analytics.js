document.addEventListener('DOMContentLoaded', () => {
  window.Components.injectAdminSidebar('analytics');

  let analyticsData = null;
  let currentRange = '30';

  fetch('../data/analytics.json')
    .then(r => r.json())
    .catch(() => getDefaultAnalytics())
    .then(data => {
      analyticsData = data;
      initAnalytics(analyticsData);
    });

  document.querySelectorAll('.date-range-btn').forEach(btn => {
    if (btn.dataset.range === 'custom') return;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.date-range-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentRange = btn.dataset.range;
      if (analyticsData) initAnalytics(analyticsData);
    });
  });

  document.getElementById('export-data-btn').addEventListener('click', () => {
    if (!analyticsData) return;
    const blob = new Blob([JSON.stringify(analyticsData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'analytics.json';
    a.click();
    URL.revokeObjectURL(url);
    window.App.showToast('Analytics data exported.');
  });

  window.addEventListener('themechanged', () => {
    if (analyticsData) initAnalytics(analyticsData);
  });
});

function getDefaultAnalytics() {
  const data = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    data.push({
      date: d.toISOString().split('T')[0],
      views: Math.floor(Math.random() * 5000) + 1000
    });
  }
  return {
    viewsByDay: data,
    topVideos: [
      { id: 'v1', title: 'Sample Video 1', views: 15000 },
      { id: 'v2', title: 'Sample Video 2', views: 12000 },
    ],
    tagDistribution: [
      { name: 'Programming', percentage: 25 },
      { name: 'Tutorial', percentage: 20 },
      { name: 'Review', percentage: 15 },
      { name: 'Live', percentage: 12 },
      { name: 'Design', percentage: 10 },
      { name: 'Gameplay', percentage: 8 },
      { name: 'Food', percentage: 5 },
      { name: 'Workout', percentage: 5 },
    ],
    deviceBreakdown: { Desktop: 60, Mobile: 35, Tablet: 5 },
    totalViews: 1048502,
    totalLikes: 72450,
    totalVideos: 21,
    avgWatchTime: '8:42'
  };
}

function initAnalytics(data) {
  const days = currentRange === '7' ? 7 : currentRange === '90' ? 90 : 30;
  const sliced = data.viewsByDay.slice(-days);

  document.getElementById('stat-total-views').textContent = data.totalViews.toLocaleString();
  document.getElementById('stat-total-likes').textContent = data.totalLikes.toLocaleString();
  document.getElementById('stat-total-videos').textContent = data.totalVideos;
  document.getElementById('stat-avg-watch').textContent = data.avgWatchTime;

  const prevViews = data.totalViews * 0.88;
  const change = ((data.totalViews - prevViews) / prevViews * 100).toFixed(1);
  document.getElementById('stat-views-change').innerHTML = `
    <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="18 15 12 9 6 15"></polyline></svg>
    <span>+${change}% vs last period</span>
  `;

  drawLineChart('line-chart', sliced);
  drawBarChart('bar-chart', data.topVideos);
  drawPieChart('pie-chart', data.tagDistribution);
  drawDonutChart('donut-chart', data.deviceBreakdown);
}

function drawLineChart(canvasId, data) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width * window.devicePixelRatio;
  canvas.height = rect.height * window.devicePixelRatio;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

  const w = rect.width;
  const h = rect.height;
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  const gridColor = isLight ? '#ebebeb' : '#2e2e2e';
  const textColor = isLight ? '#888888' : '#7c7c7c';
  const accentColor = isLight ? '#0070f3' : '#1ed760';

  const pad = { top: 20, right: 20, bottom: 30, left: 50 };
  const gw = w - pad.left - pad.right;
  const gh = h - pad.top - pad.bottom;

  ctx.clearRect(0, 0, w, h);

  const maxVal = Math.max(...data.map(d => d.views)) * 1.15;

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

  const step = gw / (data.length - 1 || 1);
  const points = data.map((d, i) => ({
    x: pad.left + i * step,
    y: h - pad.bottom - (gh * (d.views / maxVal)),
    label: d.date.slice(5)
  }));

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const labelStep = Math.max(1, Math.floor(data.length / 10));
  points.forEach((p, i) => {
    if (i % labelStep === 0 || i === data.length - 1) {
      ctx.fillText(p.label, p.x, h - pad.bottom + 8);
    }
  });

  const grad = ctx.createLinearGradient(0, pad.top, 0, h - pad.bottom);
  const ac = accentColor;
  grad.addColorStop(0, isLight ? 'rgba(0,112,243,0.2)' : 'rgba(30,215,96,0.2)');
  grad.addColorStop(1, isLight ? 'rgba(0,112,243,0.01)' : 'rgba(30,215,96,0.01)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(points[0].x, h - pad.bottom);
  points.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.lineTo(points[points.length - 1].x, h - pad.bottom);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  points.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.stroke();

  ctx.fillStyle = isLight ? '#ffffff' : '#121212';
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 2;
  points.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });

  const tooltip = document.getElementById('chart-tooltip');
  if (!tooltip) return;

  canvas.onmousemove = function(e) {
    const r = canvas.getBoundingClientRect();
    const mx = e.clientX - r.left;
    let minDist = Infinity;
    let closest = null;
    points.forEach(p => {
      const d = Math.abs(mx - p.x);
      if (d < minDist) { minDist = d; closest = p; }
    });
    if (closest && minDist < 40) {
      const idx = points.indexOf(closest);
      tooltip.innerHTML = `<strong>${data[idx].date}</strong>: ${data[idx].views.toLocaleString()} views`;
      tooltip.style.left = (e.clientX + 12) + 'px';
      tooltip.style.top = (e.clientY - 10) + 'px';
      tooltip.classList.add('visible');
    } else {
      tooltip.classList.remove('visible');
    }
  };

  canvas.onmouseleave = () => tooltip.classList.remove('visible');
}

function drawBarChart(canvasId, data) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width * window.devicePixelRatio;
  canvas.height = rect.height * window.devicePixelRatio;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

  const w = rect.width;
  const h = rect.height;
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  const gridColor = isLight ? '#ebebeb' : '#2e2e2e';
  const textColor = isLight ? '#888888' : '#7c7c7c';
  const accentColor = isLight ? '#0070f3' : '#1ed760';

  const pad = { top: 10, right: 20, bottom: 10, left: 140 };
  const gw = w - pad.left - pad.right;

  ctx.clearRect(0, 0, w, h);

  const maxVal = Math.max(...data.map(d => d.views)) * 1.1;
  const barH = Math.min(28, (h - pad.top - pad.bottom) / data.length - 4);

  ctx.fillStyle = textColor;
  ctx.font = '11px var(--font-sans)';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  data.forEach((d, i) => {
    const y = pad.top + i * (barH + 6) + barH / 2;
    const bw = (d.views / maxVal) * gw;

    let label = d.title;
    if (label.length > 20) label = label.slice(0, 18) + '...';
    ctx.fillText(label, pad.left - 8, y);

    ctx.fillStyle = accentColor;
    const grad = ctx.createLinearGradient(pad.left, 0, pad.left + bw, 0);
    grad.addColorStop(0, accentColor);
    grad.addColorStop(1, isLight ? 'rgba(0,112,243,0.3)' : 'rgba(30,215,96,0.3)');
    ctx.fillStyle = grad;
    const radius = Math.min(4, barH / 2);
    const bx = pad.left;
    const by = pad.top + i * (barH + 6);
    const bw2 = Math.max(bw, radius * 2);
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

    ctx.fillStyle = textColor;
    ctx.textAlign = 'left';
    ctx.font = '10px var(--font-mono)';
    ctx.fillText(d.views.toLocaleString(), pad.left + bw2 + 6, y);
    ctx.textAlign = 'right';
  });
}

function drawPieChart(canvasId, data) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const rect = canvas.parentElement.getBoundingClientRect();
  const size = Math.min(rect.width, rect.height);
  canvas.width = rect.width * window.devicePixelRatio;
  canvas.height = rect.height * window.devicePixelRatio;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

  const w = rect.width;
  const h = rect.height;
  const cx = w / 2;
  const cy = h / 2;
  const radius = Math.min(w, h) / 2 - 20;

  ctx.clearRect(0, 0, w, h);

  const colors = ['#0070f3', '#7928ca', '#ff0080', '#ffa42b', '#50e3c2', '#f3727f', '#1db954', '#539df5'];
  const total = data.reduce((s, d) => s + d.percentage, 0);
  let startAngle = -Math.PI / 2;

  data.forEach((d, i) => {
    const sliceAngle = (d.percentage / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, startAngle, startAngle + sliceAngle);
    ctx.closePath();
    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();

    const midAngle = startAngle + sliceAngle / 2;
    const labelR = radius * 0.65;
    const lx = cx + Math.cos(midAngle) * labelR;
    const ly = cy + Math.sin(midAngle) * labelR;

    ctx.fillStyle = '#fff';
    ctx.font = '11px var(--font-sans)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (d.percentage > 5) {
      ctx.fillText(d.percentage + '%', lx, ly);
    }

    startAngle += sliceAngle;
  });

  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.4, 0, Math.PI * 2);
  ctx.fillStyle = isThemeLight() ? '#fafafa' : '#121212';
  ctx.fill();

  ctx.fillStyle = isThemeLight() ? '#171717' : '#ffffff';
  ctx.font = 'bold 14px var(--font-sans)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Tags', cx, cy);

  const legend = document.getElementById('pie-legend');
  if (legend) {
    legend.innerHTML = data.map((d, i) => `
      <div class="chart-legend-item">
        <span class="chart-legend-dot" style="background-color:${colors[i % colors.length]}"></span>
        ${d.name} (${d.percentage}%)
      </div>
    `).join('');
  }
}

function drawDonutChart(canvasId, data) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width * window.devicePixelRatio;
  canvas.height = rect.height * window.devicePixelRatio;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

  const w = rect.width;
  const h = rect.height;
  const cx = w / 2;
  const cy = h / 2;
  const outerR = Math.min(w, h) / 2 - 20;
  const innerR = outerR * 0.55;

  ctx.clearRect(0, 0, w, h);

  const entries = Object.entries(data);
  const colors = { Desktop: '#0070f3', Mobile: '#7928ca', Tablet: '#50e3c2' };
  const total = entries.reduce((s, [, v]) => s + v, 0);
  let startAngle = -Math.PI / 2;

  entries.forEach(([key, val]) => {
    const sliceAngle = (val / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, startAngle, startAngle + sliceAngle);
    ctx.arc(cx, cy, innerR, startAngle + sliceAngle, startAngle, true);
    ctx.closePath();
    ctx.fillStyle = colors[key] || '#888';
    ctx.fill();
    startAngle += sliceAngle;
  });

  ctx.fillStyle = isThemeLight() ? '#171717' : '#ffffff';
  ctx.font = 'bold 20px var(--font-sans)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(total + '%', cx, cy);

  ctx.font = '10px var(--font-sans)';
  ctx.fillStyle = isThemeLight() ? '#888888' : '#7c7c7c';
  ctx.fillText('Total', cx, cy + 18);

  const legend = document.getElementById('donut-legend');
  if (legend) {
    legend.innerHTML = entries.map(([key, val]) => `
      <div class="chart-legend-item">
        <span class="chart-legend-dot" style="background-color:${colors[key] || '#888'}"></span>
        ${key} (${val}%)
      </div>
    `).join('');
  }
}

function isThemeLight() {
  return document.documentElement.getAttribute('data-theme') === 'light';
}
