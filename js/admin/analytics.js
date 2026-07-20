document.addEventListener('DOMContentLoaded', () => {
  window.Components.injectAdminSidebar('analytics');

  let analyticsData = null;
  let currentRange = '30';

  if (window.location.protocol === 'file:') {
    analyticsData = getDefaultAnalytics();
    initAnalytics(analyticsData, currentRange);
  } else {
    fetch('../data/analytics.json')
      .then(r => r.json())
      .catch(() => getDefaultAnalytics())
      .then(data => {
        if (!data || !Array.isArray(data.viewsByDay)) {
          data = getDefaultAnalytics();
        }
        analyticsData = data;
        initAnalytics(analyticsData, currentRange);
      });
  }

  document.querySelectorAll('.date-range-btn').forEach(btn => {
    if (btn.dataset.range === 'custom') return;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.date-range-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentRange = btn.dataset.range;
      if (analyticsData) initAnalytics(analyticsData, currentRange);
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
    if (analyticsData) initAnalytics(analyticsData, currentRange);
  });
});

function getDefaultAnalytics() {
  return computeAnalyticsFromVideos();
}

function computeAnalyticsFromVideos() {
  const videos = window.App.getVideos().filter(v => v.status === 'published');
  const now = new Date();
  const viewsByDay = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayViews = videos
      .filter(v => v.publishDate === dateStr)
      .reduce((sum, v) => sum + Number(v.views), 0);
    viewsByDay.push({ date: dateStr, views: dayViews || Math.floor(Math.random() * 5000) + 1000 });
  }

  const topVideos = [...videos].sort((a, b) => b.views - a.views).slice(0, 10).map(v => ({
    id: v.id, title: v.title, views: Number(v.views)
  }));

  const tagCounts = {};
  videos.forEach(v => (v.tags || []).forEach(tId => { tagCounts[tId] = (tagCounts[tId] || 0) + 1; }));
  const allTags = window.App.getTags();
  const tagDistribution = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([tId, count]) => {
      const tag = allTags.find(t => t.id === tId);
      return { name: tag ? tag.name : tId, count, percentage: Math.round(count / videos.length * 100) };
    });

  return {
    viewsByDay,
    topVideos,
    tagDistribution: tagDistribution.length > 0 ? tagDistribution : [
      { name: 'Programming', percentage: 25 },
      { name: 'Tutorial', percentage: 20 },
    ],
    deviceBreakdown: { Desktop: 60, Mobile: 35, Tablet: 5 },
    totalViews: videos.reduce((s, v) => s + Number(v.views), 0),
    totalLikes: videos.reduce((s, v) => s + Number(v.likes), 0),
    totalVideos: videos.length,
    avgWatchTime: videos.length > 0 ? Math.round(videos.reduce((s, v) => s + parseDurationToSeconds(v.duration), 0) / videos.length / 60) + ':00' : '0:00'
  };
}

function parseDurationToSeconds(d) {
  const parts = d.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

function initAnalytics(data, range) {
  try {
    const days = range === '7' ? 7 : range === '90' ? 90 : 30;
    if (!Array.isArray(data.viewsByDay)) return;
    const sliced = data.viewsByDay.slice(-days);

    document.getElementById('stat-total-views').textContent = data.totalViews.toLocaleString();
    document.getElementById('stat-total-likes').textContent = data.totalLikes.toLocaleString();
    document.getElementById('stat-total-videos').textContent = data.totalVideos;
    document.getElementById('stat-avg-watch').textContent = data.avgWatchTime;

    const half = Math.floor(sliced.length / 2);
    const recentViews = sliced.slice(half).reduce((s, d) => s + d.views, 0);
    const prevViews = sliced.slice(0, half).reduce((s, d) => s + d.views, 0);
    const change = prevViews > 0 ? ((recentViews - prevViews) / prevViews * 100).toFixed(1) : '+0';
    const arrow = change >= 0
      ? '<polyline points="18 15 12 9 6 15"></polyline>'
      : '<polyline points="6 9 12 15 18 9"></polyline>';
    document.getElementById('stat-views-change').innerHTML = `
      <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">${arrow}</svg>
      <span>${change >= 0 ? '+' : ''}${change}% vs last period</span>
    `;

    drawLineChart('line-chart', sliced);
    drawBarChart('bar-chart', data.topVideos);
    drawPieChart('pie-chart', data.tagDistribution);
    drawDonutChart('donut-chart', data.deviceBreakdown);
  } catch (e) {
    console.warn('Analytics render error:', e);
  }
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

  const pad = { top: 20, right: 20, bottom: 30, left: 55 };
  const gw = w - pad.left - pad.right;
  const gh = h - pad.top - pad.bottom;

  ctx.clearRect(0, 0, w, h);

  const maxVal = Math.max(...data.map(d => d.views)) * 1.15;

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

  const step = gw / (data.length - 1 || 1);
  const points = data.map((d, i) => ({
    x: pad.left + i * step,
    y: h - pad.bottom - (gh * (d.views / maxVal)),
    label: d.date.slice(5)
  }));

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const labelStep = Math.max(1, Math.floor(data.length / 8));
  points.forEach((p, i) => {
    if (i % labelStep === 0 || i === data.length - 1) {
      ctx.fillStyle = textColor;
      ctx.fillText(p.label, p.x, h - pad.bottom + 8);
    }
  });

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

  let hoveredPoint = -1;

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

      if (hoveredPoint !== idx) {
        ctx.clearRect(0, 0, w, h);
        redrawChart(ctx, points, data, maxVal, w, h, pad, gw, gh, accentColor, gridColor, textColor, isLight, labelStep);

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

      tooltip.innerHTML = `<strong>${data[idx].date}</strong>: ${data[idx].views.toLocaleString()} views`;
      tooltip.style.left = (e.clientX + 12) + 'px';
      tooltip.style.top = (e.clientY - 10) + 'px';
      tooltip.classList.add('visible');
    } else {
      if (hoveredPoint !== -1) {
        ctx.clearRect(0, 0, w, h);
        redrawChart(ctx, points, data, maxVal, w, h, pad, gw, gh, accentColor, gridColor, textColor, isLight, labelStep);
        hoveredPoint = -1;
      }
      tooltip.classList.remove('visible');
    }
  };

  canvas.onmouseleave = () => {
    if (hoveredPoint !== -1) {
      ctx.clearRect(0, 0, w, h);
      redrawChart(ctx, points, data, maxVal, w, h, pad, gw, gh, accentColor, gridColor, textColor, isLight, labelStep);
      hoveredPoint = -1;
    }
    tooltip.classList.remove('visible');
  };
}

function redrawChart(ctx, points, data, maxVal, w, h, pad, gw, gh, accentColor, gridColor, textColor, isLight, labelStep) {
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

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  points.forEach((p, i) => {
    if (i % labelStep === 0 || i === data.length - 1) {
      ctx.fillStyle = textColor;
      ctx.fillText(p.label, p.x, h - pad.bottom + 8);
    }
  });

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

const BAR_COLORS = ['#0070f3', '#7928ca', '#ff0080', '#ffa42b', '#50e3c2', '#f3727f', '#1db954', '#539df5', '#e91e63', '#ff5722'];

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
  const textColor = isLight ? '#888888' : '#7c7c7c';

  const pad = { top: 20, right: 80, bottom: 10, left: 150 };
  const gw = w - pad.left - pad.right;

  ctx.clearRect(0, 0, w, h);

  const maxVal = Math.max(...data.map(d => d.views)) * 1.1;
  const barH = Math.min(26, (h - pad.top - pad.bottom) / data.length - 6);

  const bars = [];

  function renderBars(hoverIdx) {
    ctx.clearRect(0, 0, w, h);
    ctx.textBaseline = 'middle';

    data.forEach((d, i) => {
      const y = pad.top + i * (barH + 8) + barH / 2;
      const bw = Math.max(4, (d.views / maxVal) * gw);

      let label = d.title;
      if (label.length > 24) label = label.slice(0, 22) + '...';

      ctx.fillStyle = textColor;
      ctx.font = '11px var(--font-sans)';
      ctx.textAlign = 'right';
      ctx.fillText(label, pad.left - 10, y);

      const color = BAR_COLORS[i % BAR_COLORS.length];
      const isHovered = i === hoverIdx;
      const grad = ctx.createLinearGradient(pad.left, 0, pad.left + bw, 0);
      grad.addColorStop(0, color);
      grad.addColorStop(1, isHovered ? color : color + '60');
      ctx.fillStyle = grad;

      const radius = Math.min(4, barH / 2);
      const bx = pad.left;
      const by = pad.top + i * (barH + 8);
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
      ctx.textAlign = 'right';
      ctx.font = '10px var(--font-mono)';
      ctx.fillText(d.views.toLocaleString(), pad.left + bw2 + 8, y);

      bars[i] = { bx: pad.left, by: pad.top + i * (barH + 8), bw: bw2, bh: barH };
    });
  }

  renderBars(-1);

  const tooltip = document.getElementById('chart-tooltip');
  if (!tooltip) return;

  let hoveredBar = -1;

  canvas.onmousemove = function(e) {
    const r = canvas.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const my = e.clientY - r.top;
    let found = -1;
    for (let i = 0; i < bars.length; i++) {
      const b = bars[i];
      if (mx >= b.bx && mx <= b.bx + b.bw && my >= b.by && my <= b.by + b.bh) {
        found = i;
        break;
      }
    }
    if (found !== hoveredBar) {
      renderBars(found);
      hoveredBar = found;
    }
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

  canvas.onmouseleave = () => {
    if (hoveredBar !== -1) {
      renderBars(-1);
      hoveredBar = -1;
    }
    tooltip.classList.remove('visible');
  };
}

const PIE_COLORS = ['#0070f3', '#7928ca', '#ff0080', '#ffa42b', '#50e3c2', '#f3727f', '#1db954', '#539df5'];

function drawPieChart(canvasId, data) {
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
  const radius = Math.min(w, h) / 2 - 20;

  const total = data.reduce((s, d) => s + d.percentage, 0);
  const segments = [];
  let accumAngle = -Math.PI / 2;

  data.forEach((d, i) => {
    const sliceAngle = (d.percentage / total) * Math.PI * 2;
    segments.push({ start: accumAngle, end: accumAngle + sliceAngle, mid: accumAngle + sliceAngle / 2 });
    accumAngle += sliceAngle;
  });

  function renderPie(hoverIdx) {
    ctx.clearRect(0, 0, w, h);

    segments.forEach((seg, i) => {
      const isHovered = i === hoverIdx;
      const explodeDist = isHovered ? 10 : 0;
      const offX = Math.cos(seg.mid) * explodeDist;
      const offY = Math.sin(seg.mid) * explodeDist;

      ctx.beginPath();
      ctx.moveTo(cx + offX, cy + offY);
      ctx.arc(cx + offX, cy + offY, radius, seg.start, seg.end);
      ctx.closePath();
      ctx.fillStyle = PIE_COLORS[i % PIE_COLORS.length];
      ctx.fill();
      ctx.strokeStyle = isThemeLight() ? '#fafafa' : '#121212';
      ctx.lineWidth = isHovered ? 3 : 2;
      ctx.stroke();

      const labelR = radius * 0.65;
      const lx = cx + offX + Math.cos(seg.mid) * labelR;
      const ly = cy + offY + Math.sin(seg.mid) * labelR;

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px var(--font-sans)';
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = 4;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (data[i].percentage > 5) {
        ctx.fillText(data[i].percentage + '%', lx, ly);
      }
      ctx.shadowBlur = 0;
    });

    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.42, 0, Math.PI * 2);
    ctx.fillStyle = isThemeLight() ? '#fafafa' : '#121212';
    ctx.fill();
    ctx.strokeStyle = isThemeLight() ? '#ebebeb' : '#2e2e2e';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = isThemeLight() ? '#171717' : '#ffffff';
    ctx.font = 'bold 14px var(--font-sans)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Tags', cx, cy - 6);
    ctx.font = '11px var(--font-sans)';
    ctx.fillStyle = isThemeLight() ? '#888888' : '#7c7c7c';
    ctx.fillText(data.length + ' categories', cx, cy + 12);
  }

  renderPie(-1);

  function getHoveredSegment(mx, my) {
    const dx = mx - cx;
    const dy = my - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > radius || dist < radius * 0.42) return -1;
    let angle = Math.atan2(dy, dx);
    if (angle < -Math.PI / 2) angle += Math.PI * 2;
    for (let i = 0; i < segments.length; i++) {
      const s = segments[i];
      let start = s.start;
      let end = s.end;
      if (angle >= start && angle < end) return i;
    }
    return -1;
  }

  const tooltip = document.getElementById('chart-tooltip');
  if (!tooltip) return;

  let hoveredSeg = -1;

  canvas.onmousemove = function(e) {
    const r = canvas.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const my = e.clientY - r.top;
    const seg = getHoveredSegment(mx, my);
    if (seg !== hoveredSeg) {
      renderPie(seg);
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

  canvas.onmouseleave = () => {
    if (hoveredSeg !== -1) {
      renderPie(-1);
      hoveredSeg = -1;
    }
    tooltip.classList.remove('visible');
  };

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
        renderPie(idx);
        hoveredSeg = idx;
      });
      el.addEventListener('mouseleave', () => {
        renderPie(-1);
        hoveredSeg = -1;
      });
    });
  }
}

const DONUT_COLORS = { Desktop: '#0070f3', Mobile: '#7928ca', Tablet: '#50e3c2' };

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
  const innerR = outerR * 0.58;

  const entries = Object.entries(data);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  const segments = [];
  let accumAngle = -Math.PI / 2;

  entries.forEach(([key, val]) => {
    const sliceAngle = (val / total) * Math.PI * 2;
    segments.push({ key, val, start: accumAngle, end: accumAngle + sliceAngle, mid: accumAngle + sliceAngle / 2 });
    accumAngle += sliceAngle;
  });

  function renderDonut(hoverIdx) {
    ctx.clearRect(0, 0, w, h);

    segments.forEach((seg, i) => {
      const isHovered = i === hoverIdx;
      const explodeDist = isHovered ? 8 : 0;
      const offX = Math.cos(seg.mid) * explodeDist;
      const offY = Math.sin(seg.mid) * explodeDist;

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

    ctx.fillStyle = isThemeLight() ? '#171717' : '#ffffff';
    ctx.font = 'bold 22px var(--font-sans)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(total, cx, cy - 4);

    ctx.font = '11px var(--font-sans)';
    ctx.fillStyle = isThemeLight() ? '#888888' : '#7c7c7c';
    ctx.fillText('Sessions', cx, cy + 20);
  }

  renderDonut(-1);

  function getHoveredSegment(mx, my) {
    const dx = mx - cx;
    const dy = my - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > outerR || dist < innerR) return -1;
    let angle = Math.atan2(dy, dx);
    if (angle < -Math.PI / 2) angle += Math.PI * 2;
    for (let i = 0; i < segments.length; i++) {
      const s = segments[i];
      if (angle >= s.start && angle < s.end) return i;
    }
    return -1;
  }

  const tooltip = document.getElementById('chart-tooltip');
  if (!tooltip) return;

  let hoveredSeg = -1;

  canvas.onmousemove = function(e) {
    const r = canvas.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const my = e.clientY - r.top;
    const seg = getHoveredSegment(mx, my);
    if (seg !== hoveredSeg) {
      renderDonut(seg);
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

  canvas.onmouseleave = () => {
    if (hoveredSeg !== -1) {
      renderDonut(-1);
      hoveredSeg = -1;
    }
    tooltip.classList.remove('visible');
  };

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
        renderDonut(idx);
        hoveredSeg = idx;
      });
      el.addEventListener('mouseleave', () => {
        renderDonut(-1);
        hoveredSeg = -1;
      });
    });
  }
}

function isThemeLight() {
  return document.documentElement.getAttribute('data-theme') === 'light';
}
