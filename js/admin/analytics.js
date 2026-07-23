var analyticsState = {
  data: null,
  range: '30',
  videoTimeline: [],
  selectedVideoId: null,
  engagementData: {}
};

document.addEventListener('DOMContentLoaded', function() {
  window.Components.injectAdminSidebar('analytics');

  analyticsState.data = computeAnalyticsFromVideos();
  initAnalytics(analyticsState.data, analyticsState.range);
  populateVideoSelect();

  document.querySelectorAll('.date-range-btn').forEach(function(btn) {
    if (btn.dataset.range === 'custom') return;
    btn.addEventListener('click', function() {
      document.querySelectorAll('.date-range-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      analyticsState.range = btn.dataset.range;
      if (analyticsState.data) initAnalytics(analyticsState.data, analyticsState.range);
    });
  });

  var exportBtn = document.getElementById('export-data-btn');
  if (exportBtn) exportBtn.addEventListener('click', function() {
    if (!analyticsState.data) return;
    var blob = new Blob([JSON.stringify(analyticsState.data, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'analytics.json';
    a.click();
    URL.revokeObjectURL(url);
    window.App.showToast('Analytics data exported.');
  });

  window.addEventListener('themechanged', function() {
    if (analyticsState.data) initAnalytics(analyticsState.data, analyticsState.range);
  });

  var select = document.getElementById('vd-video-select');
  if (select) {
    select.addEventListener('change', function() {
      var val = this.value;
      if (val) {
        analyticsState.selectedVideoId = val;
        showVideoDetail(val);
      } else {
        analyticsState.selectedVideoId = null;
        hideVideoDetail();
      }
    });
  }

  subscribeToEngagement();
});

function subscribeToEngagement() {
  if (!window.Engagement || !window.Engagement.subscribeAll) return;
  window.Engagement.subscribeAll(function(data) {
    analyticsState.engagementData[data.id] = data;
    if (analyticsState.data) {
      var videos = window.App.getVideos();
      var idx = videos.findIndex(function(v) { return v.id === data.id; });
      if (idx !== -1) {
        if (data.views !== undefined) videos[idx].views = data.views;
        if (data.likes !== undefined) videos[idx].likes = data.likes;
        if (data.reactions !== undefined) videos[idx].reactions = data.reactions;
        window.App.saveVideos(videos);
      }
    }
    analyticsState.data = computeAnalyticsFromVideos();
    initAnalytics(analyticsState.data, analyticsState.range);

    if (analyticsState.selectedVideoId) {
      recordTimelineSnapshot(analyticsState.selectedVideoId);
      updateVideoDetailStats(analyticsState.selectedVideoId);
    }
  });
}

function recordTimelineSnapshot(videoId) {
  var videos = window.App.getVideos();
  var v = videos.find(function(x) { return x.id === videoId; });
  if (!v) return;
  var now = new Date();
  var timeStr = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');
  analyticsState.videoTimeline.push({ time: timeStr, views: Number(v.views), likes: Number(v.likes), reactions: Number(v.reactions) });
  if (analyticsState.videoTimeline.length > 30) analyticsState.videoTimeline.shift();
  drawTrendChart(analyticsState.videoTimeline);
}

function populateVideoSelect() {
  var select = document.getElementById('vd-video-select');
  if (!select) return;
  var videos = window.App.getVideos().filter(function(v) { return v.status === 'published'; });
  videos.sort(function(a, b) { return b.views - a.views; });
  select.innerHTML = '<option value="">\u2014 Select a video \u2014</option>' +
    videos.map(function(v) {
      var esc = function(s) { return String(s||'').replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c; }); };
      return '<option value="' + esc(v.id) + '">' + esc(v.title) + ' (' + Number(v.views).toLocaleString() + ' views)</option>';
    }).join('');
}

function showVideoDetail(videoId) {
  var panel = document.getElementById('vd-panel');
  var empty = document.getElementById('vd-empty');
  if (panel) panel.style.display = '';
  if (empty) empty.style.display = 'none';
  analyticsState.videoTimeline = [];
  recordTimelineSnapshot(videoId);
  updateVideoDetailStats(videoId);
}

function hideVideoDetail() {
  var panel = document.getElementById('vd-panel');
  var empty = document.getElementById('vd-empty');
  if (panel) panel.style.display = 'none';
  if (empty) empty.style.display = '';
}

function updateVideoDetailStats(videoId) {
  var videos = window.App.getVideos();
  var video = videos.find(function(v) { return v.id === videoId; });
  if (!video) return;

  var viewsEl = document.getElementById('vd-views');
  var likesEl = document.getElementById('vd-likes');
  var reactsEl = document.getElementById('vd-reactions');
  var rankEl = document.getElementById('vd-rank');
  var liveBadge = document.getElementById('vd-live-badge');

  var eng = analyticsState.engagementData[videoId] || {};
  var views = eng.views !== undefined ? eng.views : Number(video.views);
  var likes = eng.likes !== undefined ? eng.likes : Number(video.likes);
  var reacts = eng.reactions !== undefined ? eng.reactions : Number(video.reactions);

  var fmt = window.Engagement && window.Engagement.formatNum ? window.Engagement.formatNum : function(n) { return Number(n).toLocaleString(); };
  if (viewsEl) viewsEl.textContent = fmt(views);
  if (likesEl) likesEl.textContent = fmt(likes);
  if (reactsEl) reactsEl.textContent = fmt(reacts);

  var sorted = videos.filter(function(v) { return v.status === 'published'; }).sort(function(a, b) { return Number(b.views) - Number(a.views); });
  var rank = sorted.findIndex(function(v) { return v.id === videoId; }) + 1;
  if (rankEl) rankEl.textContent = '#' + rank + ' / ' + sorted.length;
}

function computeAnalyticsFromVideos() {
  var videos = window.App.getVideos().filter(function(v) { return v.status === 'published'; });
  var now = new Date();
  var viewsByDay = [];
  for (var i = 29; i >= 0; i--) {
    var d = new Date(now);
    d.setDate(d.getDate() - i);
    var dateStr = d.toISOString().split('T')[0];
    var dayViews = videos.filter(function(v) { return v.publishDate === dateStr; }).reduce(function(s, v) { return s + Number(v.views); }, 0);
    viewsByDay.push({ date: dateStr, views: dayViews || Math.floor(Math.random() * 5000) + 1000 });
  }

  var topVideos = [...videos].sort(function(a, b) { return b.views - a.views; }).slice(0, 10).map(function(v) {
    return { id: v.id, title: v.title, views: Number(v.views) };
  });

  var tagCounts = {};
  videos.forEach(function(v) { (v.tags || []).forEach(function(tId) { tagCounts[tId] = (tagCounts[tId] || 0) + 1; }); });
  var allTags = window.App.getTags();
  var tagDistEntries = Object.entries(tagCounts).sort(function(a, b) { return b[1] - a[1]; }).slice(0, 8);
  var tagDistribution = tagDistEntries.map(function(e) {
    var tag = allTags.find(function(t) { return t.id === e[0]; });
    return { name: tag ? tag.name : e[0], count: e[1], percentage: Math.round(e[1] / videos.length * 100) };
  });

  return {
    viewsByDay: viewsByDay,
    topVideos: topVideos,
    tagDistribution: tagDistribution.length > 0 ? tagDistribution : [{ name: 'Programming', percentage: 25 }, { name: 'Tutorial', percentage: 20 }],
    deviceBreakdown: { Desktop: 60, Mobile: 35, Tablet: 5 },
    totalViews: videos.reduce(function(s, v) { return s + Number(v.views); }, 0),
    totalLikes: videos.reduce(function(s, v) { return s + Number(v.likes); }, 0),
    totalReactions: videos.reduce(function(s, v) { return s + Number(v.reactions); }, 0),
    totalVideos: videos.length,
    avgWatchTime: videos.length > 0 ? Math.round(videos.reduce(function(s, v) { return s + parseDurationToSeconds(v.duration); }, 0) / videos.length / 60) + ':00' : '0:00'
  };
}

function parseDurationToSeconds(d) {
  var parts = String(d).split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

function initAnalytics(data, range) {
  try {
    var days = range === '7' ? 7 : range === '90' ? 90 : 30;
    if (!Array.isArray(data.viewsByDay)) return;
    var sliced = data.viewsByDay.slice(-days);

    var statViews = document.getElementById('stat-total-views');
    var statLikes = document.getElementById('stat-total-likes');
    var statReactions = document.getElementById('stat-total-reactions');
    var statVideos = document.getElementById('stat-total-videos');
    var statAvg = document.getElementById('stat-avg-watch');
    var fmt = window.Engagement && window.Engagement.formatNum ? window.Engagement.formatNum : function(n) { return Number(n).toLocaleString(); };
    if (statViews) statViews.textContent = fmt(data.totalViews);
    if (statLikes) statLikes.textContent = fmt(data.totalLikes);
    if (statReactions) statReactions.textContent = fmt(data.totalReactions);
    if (statVideos) statVideos.textContent = data.totalVideos;
    if (statAvg) statAvg.textContent = data.avgWatchTime;

    var half = Math.floor(sliced.length / 2);
    var recentViews = sliced.slice(half).reduce(function(s, d) { return s + d.views; }, 0);
    var prevViews = sliced.slice(0, half).reduce(function(s, d) { return s + d.views; }, 0);
    var change = prevViews > 0 ? ((recentViews - prevViews) / prevViews * 100).toFixed(1) : '+0';
    var arrow = change >= 0
      ? '<polyline points="18 15 12 9 6 15"></polyline>'
      : '<polyline points="6 9 12 15 18 9"></polyline>';
    var viewsChange = document.getElementById('stat-views-change');
    if (viewsChange) viewsChange.innerHTML = '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">' + arrow + '</svg><span>' + (change >= 0 ? '+' : '') + change + '% vs last period</span>';

    drawLineChart('line-chart', sliced);
    drawBarChart('bar-chart', data.topVideos);
    drawPieChart('pie-chart', data.tagDistribution);
    drawDonutChart('donut-chart', data.deviceBreakdown);
  } catch (e) {
    console.error('Analytics render error:', e);
  }
}

function drawLineChart(canvasId, data) {
  var canvas = document.getElementById(canvasId);
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width * window.devicePixelRatio;
  canvas.height = rect.height * window.devicePixelRatio;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  var w = rect.width;
  var h = rect.height;
  var isLight = document.documentElement.getAttribute('data-theme') === 'light';
  var gridColor = isLight ? '#ebebeb' : '#2e2e2e';
  var textColor = isLight ? '#888888' : '#7c7c7c';
  var accentColor = isLight ? '#0070f3' : '#1ed760';
  var pad = { top: 20, right: 20, bottom: 30, left: 55 };
  var gw = w - pad.left - pad.right;
  var gh = h - pad.top - pad.bottom;
  ctx.clearRect(0, 0, w, h);
  var maxVal = Math.max.apply(null, data.map(function(d) { return d.views; })) * 1.15;
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1;
  ctx.fillStyle = textColor;
  ctx.font = '10px var(--font-mono)';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (var i = 0; i <= 4; i++) {
    var val = (maxVal / 4) * i;
    var y = h - pad.bottom - (gh * (i / 4));
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(w - pad.right, y);
    ctx.stroke();
    ctx.fillText(Math.round(val).toLocaleString(), pad.left - 8, y);
  }
  ctx.setLineDash([]);
  var step = gw / (data.length - 1 || 1);
  var points = data.map(function(d, i) {
    return { x: pad.left + i * step, y: h - pad.bottom - (gh * (d.views / maxVal)), label: d.date.slice(5) };
  });
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  var labelStep = Math.max(1, Math.floor(data.length / 8));
  points.forEach(function(p, i) {
    if (i % labelStep === 0 || i === data.length - 1) {
      ctx.fillStyle = textColor;
      ctx.fillText(p.label, p.x, h - pad.bottom + 8);
    }
  });
  var grad = ctx.createLinearGradient(0, pad.top, 0, h - pad.bottom);
  grad.addColorStop(0, isLight ? 'rgba(0,112,243,0.25)' : 'rgba(30,215,96,0.25)');
  grad.addColorStop(0.5, isLight ? 'rgba(0,112,243,0.08)' : 'rgba(30,215,96,0.08)');
  grad.addColorStop(1, isLight ? 'rgba(0,112,243,0.01)' : 'rgba(30,215,96,0.01)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(points[0].x, h - pad.bottom);
  points.forEach(function(p) { ctx.lineTo(p.x, p.y); });
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
  points.forEach(function(p) { ctx.lineTo(p.x, p.y); });
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = isLight ? '#ffffff' : '#121212';
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 2;
  points.forEach(function(p) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });
  var tooltip = document.getElementById('chart-tooltip');
  if (!tooltip) return;
  var hoveredPoint = -1;
  canvas.onmousemove = function(e) {
    var r = canvas.getBoundingClientRect();
    var mx = e.clientX - r.left;
    var minDist = Infinity;
    var closest = null;
    points.forEach(function(p) {
      var d = Math.abs(mx - p.x);
      if (d < minDist) { minDist = d; closest = p; }
    });
    if (closest && minDist < 40) {
      var idx = points.indexOf(closest);
      if (hoveredPoint !== idx) {
        ctx.clearRect(0, 0, w, h);
        redrawChart(ctx, points, data, maxVal, w, h, pad, gw, gh, accentColor, gridColor, textColor, isLight, labelStep);
        var hp = points[idx];
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
      tooltip.innerHTML = '<strong>' + data[idx].date + '</strong>: ' + data[idx].views.toLocaleString() + ' views';
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
  canvas.onmouseleave = function() {
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
  for (var i = 0; i <= 4; i++) {
    var val = (maxVal / 4) * i;
    var y = h - pad.bottom - (gh * (i / 4));
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(w - pad.right, y);
    ctx.stroke();
    ctx.fillText(Math.round(val).toLocaleString(), pad.left - 8, y);
  }
  ctx.setLineDash([]);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  points.forEach(function(p, i) {
    if (i % labelStep === 0 || i === data.length - 1) {
      ctx.fillStyle = textColor;
      ctx.fillText(p.label, p.x, h - pad.bottom + 8);
    }
  });
  var grad = ctx.createLinearGradient(0, pad.top, 0, h - pad.bottom);
  grad.addColorStop(0, isLight ? 'rgba(0,112,243,0.25)' : 'rgba(30,215,96,0.25)');
  grad.addColorStop(0.5, isLight ? 'rgba(0,112,243,0.08)' : 'rgba(30,215,96,0.08)');
  grad.addColorStop(1, isLight ? 'rgba(0,112,243,0.01)' : 'rgba(30,215,96,0.01)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(points[0].x, h - pad.bottom);
  points.forEach(function(p) { ctx.lineTo(p.x, p.y); });
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
  points.forEach(function(p) { ctx.lineTo(p.x, p.y); });
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = isLight ? '#ffffff' : '#121212';
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 2;
  points.forEach(function(p) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });
}

var BAR_COLORS = ['#0070f3', '#7928ca', '#ff0080', '#ffa42b', '#50e3c2', '#f3727f', '#1db954', '#539df5', '#e91e63', '#ff5722'];

function drawBarChart(canvasId, data) {
  var canvas = document.getElementById(canvasId);
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width * window.devicePixelRatio;
  canvas.height = rect.height * window.devicePixelRatio;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  var w = rect.width;
  var h = rect.height;
  var isLight = document.documentElement.getAttribute('data-theme') === 'light';
  var textColor = isLight ? '#888888' : '#7c7c7c';
  var pad = { top: 20, right: 80, bottom: 10, left: 150 };
  var gw = w - pad.left - pad.right;
  ctx.clearRect(0, 0, w, h);
  var maxVal = Math.max.apply(null, data.map(function(d) { return d.views; })) * 1.1;
  var barH = Math.min(26, (h - pad.top - pad.bottom) / data.length - 6);
  var bars = [];
  function renderBars(hoverIdx) {
    ctx.clearRect(0, 0, w, h);
    ctx.textBaseline = 'middle';
    data.forEach(function(d, i) {
      var y = pad.top + i * (barH + 8) + barH / 2;
      var bw = Math.max(4, (d.views / maxVal) * gw);
      var label = d.title;
      if (label.length > 24) label = label.slice(0, 22) + '...';
      ctx.fillStyle = textColor;
      ctx.font = '11px var(--font-sans)';
      ctx.textAlign = 'right';
      ctx.fillText(label, pad.left - 10, y);
      var color = BAR_COLORS[i % BAR_COLORS.length];
      var isHovered = i === hoverIdx;
      var grad = ctx.createLinearGradient(pad.left, 0, pad.left + bw, 0);
      grad.addColorStop(0, color);
      grad.addColorStop(1, isHovered ? color : color + '60');
      ctx.fillStyle = grad;
      var radius = Math.min(4, barH / 2);
      var bx = pad.left;
      var by = pad.top + i * (barH + 8);
      var bw2 = Math.max(bw, radius * 2);
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
  var tooltip = document.getElementById('chart-tooltip');
  if (!tooltip) return;
  var hoveredBar = -1;
  canvas.onmousemove = function(e) {
    var r = canvas.getBoundingClientRect();
    var mx = e.clientX - r.left;
    var my = e.clientY - r.top;
    var found = -1;
    for (var i = 0; i < bars.length; i++) {
      var b = bars[i];
      if (mx >= b.bx && mx <= b.bx + b.bw && my >= b.by && my <= b.by + b.bh) { found = i; break; }
    }
    if (found !== hoveredBar) { renderBars(found); hoveredBar = found; }
    if (found !== -1) {
      var esc = function(s) { return String(s||'').replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c; }); };
      var d = data[found];
      var label = esc(d.title);
      if (label.length > 30) label = label.slice(0, 28) + '...';
      tooltip.innerHTML = '<strong>' + label + '</strong>: ' + d.views.toLocaleString() + ' views';
      tooltip.style.left = (e.clientX + 12) + 'px';
      tooltip.style.top = (e.clientY - 10) + 'px';
      tooltip.classList.add('visible');
    } else {
      tooltip.classList.remove('visible');
    }
  };
  canvas.onmouseleave = function() {
    if (hoveredBar !== -1) { renderBars(-1); hoveredBar = -1; }
    tooltip.classList.remove('visible');
  };
}

var PIE_COLORS = ['#0070f3', '#7928ca', '#ff0080', '#ffa42b', '#50e3c2', '#f3727f', '#1db954', '#539df5'];

function drawPieChart(canvasId, data) {
  var canvas = document.getElementById(canvasId);
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width * window.devicePixelRatio;
  canvas.height = rect.height * window.devicePixelRatio;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  var w = rect.width;
  var h = rect.height;
  var cx = w / 2;
  var cy = h / 2;
  var radius = Math.min(w, h) / 2 - 20;
  var total = data.reduce(function(s, d) { return s + d.percentage; }, 0);
  var segments = [];
  var accumAngle = -Math.PI / 2;
  data.forEach(function(d, i) {
    var sliceAngle = (d.percentage / total) * Math.PI * 2;
    segments.push({ start: accumAngle, end: accumAngle + sliceAngle, mid: accumAngle + sliceAngle / 2 });
    accumAngle += sliceAngle;
  });
  function renderPie(hoverIdx) {
    ctx.clearRect(0, 0, w, h);
    segments.forEach(function(seg, i) {
      var isHovered = i === hoverIdx;
      var explodeDist = isHovered ? 10 : 0;
      var offX = Math.cos(seg.mid) * explodeDist;
      var offY = Math.sin(seg.mid) * explodeDist;
      ctx.beginPath();
      ctx.moveTo(cx + offX, cy + offY);
      ctx.arc(cx + offX, cy + offY, radius, seg.start, seg.end);
      ctx.closePath();
      ctx.fillStyle = PIE_COLORS[i % PIE_COLORS.length];
      ctx.fill();
      ctx.strokeStyle = isThemeLight() ? '#fafafa' : '#121212';
      ctx.lineWidth = isHovered ? 3 : 2;
      ctx.stroke();
      var labelR = radius * 0.65;
      var lx = cx + offX + Math.cos(seg.mid) * labelR;
      var ly = cy + offY + Math.sin(seg.mid) * labelR;
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px var(--font-sans)';
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = 4;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (data[i].percentage > 5) { ctx.fillText(data[i].percentage + '%', lx, ly); }
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
    var dx = mx - cx;
    var dy = my - cy;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > radius || dist < radius * 0.42) return -1;
    var angle = Math.atan2(dy, dx);
    if (angle < -Math.PI / 2) angle += Math.PI * 2;
    for (var i = 0; i < segments.length; i++) {
      var s = segments[i];
      if (angle >= s.start && angle < s.end) return i;
    }
    return -1;
  }
  var tooltip = document.getElementById('chart-tooltip');
  if (!tooltip) return;
  var hoveredSeg = -1;
  var esc = function(s) { return String(s||'').replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c; }); };
  canvas.onmousemove = function(e) {
    var r = canvas.getBoundingClientRect();
    var mx = e.clientX - r.left;
    var my = e.clientY - r.top;
    var seg = getHoveredSegment(mx, my);
    if (seg !== hoveredSeg) { renderPie(seg); hoveredSeg = seg; }
    if (seg !== -1) {
      tooltip.innerHTML = '<strong>' + esc(data[seg].name) + '</strong>: ' + data[seg].percentage + '% of content';
      tooltip.style.left = (e.clientX + 12) + 'px';
      tooltip.style.top = (e.clientY - 10) + 'px';
      tooltip.classList.add('visible');
    } else { tooltip.classList.remove('visible'); }
  };
  canvas.onmouseleave = function() {
    if (hoveredSeg !== -1) { renderPie(-1); hoveredSeg = -1; }
    tooltip.classList.remove('visible');
  };
  var legend = document.getElementById('pie-legend');
  if (legend) {
    legend.innerHTML = data.map(function(d, i) {
      return '<div class="chart-legend-item" data-index="' + i + '"><span class="chart-legend-dot" style="background-color:' + PIE_COLORS[i % PIE_COLORS.length] + '"></span>' + esc(d.name) + ' (' + d.percentage + '%)</div>';
    }).join('');
    legend.querySelectorAll('.chart-legend-item').forEach(function(el) {
      el.addEventListener('mouseenter', function() {
        var idx = parseInt(el.dataset.index, 10);
        renderPie(idx); hoveredSeg = idx;
      });
      el.addEventListener('mouseleave', function() {
        renderPie(-1); hoveredSeg = -1;
      });
    });
  }
}

var DONUT_COLORS = { Desktop: '#0070f3', Mobile: '#7928ca', Tablet: '#50e3c2' };

function drawDonutChart(canvasId, data) {
  var canvas = document.getElementById(canvasId);
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width * window.devicePixelRatio;
  canvas.height = rect.height * window.devicePixelRatio;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  var w = rect.width;
  var h = rect.height;
  var cx = w / 2;
  var cy = h / 2;
  var outerR = Math.min(w, h) / 2 - 20;
  var innerR = outerR * 0.58;
  var entries = Object.entries(data);
  var total = entries.reduce(function(s, e) { return s + e[1]; }, 0);
  var segments = [];
  var accumAngle = -Math.PI / 2;
  entries.forEach(function(e) {
    var sliceAngle = (e[1] / total) * Math.PI * 2;
    segments.push({ key: e[0], val: e[1], start: accumAngle, end: accumAngle + sliceAngle, mid: accumAngle + sliceAngle / 2 });
    accumAngle += sliceAngle;
  });
  function renderDonut(hoverIdx) {
    ctx.clearRect(0, 0, w, h);
    segments.forEach(function(seg, i) {
      var isHovered = i === hoverIdx;
      var explodeDist = isHovered ? 8 : 0;
      var offX = Math.cos(seg.mid) * explodeDist;
      var offY = Math.sin(seg.mid) * explodeDist;
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
    var dx = mx - cx;
    var dy = my - cy;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > outerR || dist < innerR) return -1;
    var angle = Math.atan2(dy, dx);
    if (angle < -Math.PI / 2) angle += Math.PI * 2;
    for (var i = 0; i < segments.length; i++) {
      var s = segments[i];
      if (angle >= s.start && angle < s.end) return i;
    }
    return -1;
  }
  var tooltip = document.getElementById('chart-tooltip');
  if (!tooltip) return;
  var hoveredSeg = -1;
  canvas.onmousemove = function(e) {
    var r = canvas.getBoundingClientRect();
    var mx = e.clientX - r.left;
    var my = e.clientY - r.top;
    var seg = getHoveredSegment(mx, my);
    if (seg !== hoveredSeg) { renderDonut(seg); hoveredSeg = seg; }
    if (seg !== -1) {
      tooltip.innerHTML = '<strong>' + segments[seg].key + '</strong>: ' + segments[seg].val + '% of traffic';
      tooltip.style.left = (e.clientX + 12) + 'px';
      tooltip.style.top = (e.clientY - 10) + 'px';
      tooltip.classList.add('visible');
    } else { tooltip.classList.remove('visible'); }
  };
  canvas.onmouseleave = function() {
    if (hoveredSeg !== -1) { renderDonut(-1); hoveredSeg = -1; }
    tooltip.classList.remove('visible');
  };
  var legend = document.getElementById('donut-legend');
  if (legend) {
    legend.innerHTML = segments.map(function(seg, i) {
      return '<div class="chart-legend-item" data-index="' + i + '"><span class="chart-legend-dot" style="background-color:' + (DONUT_COLORS[seg.key] || '#888') + '"></span>' + seg.key + ' (' + seg.val + '%)</div>';
    }).join('');
    legend.querySelectorAll('.chart-legend-item').forEach(function(el) {
      el.addEventListener('mouseenter', function() {
        var idx = parseInt(el.dataset.index, 10);
        renderDonut(idx); hoveredSeg = idx;
      });
      el.addEventListener('mouseleave', function() {
        renderDonut(-1); hoveredSeg = -1;
      });
    });
  }
}

function drawTrendChart(timeline) {
  var canvas = document.getElementById('vd-trend-chart');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width * window.devicePixelRatio;
  canvas.height = rect.height * window.devicePixelRatio;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  var w = rect.width;
  var h = rect.height;
  ctx.clearRect(0, 0, w, h);
  if (timeline.length < 2) {
    ctx.fillStyle = document.documentElement.getAttribute('data-theme') === 'light' ? '#888888' : '#7c7c7c';
    ctx.font = '12px var(--font-sans)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Waiting for data\u2026', w / 2, h / 2);
    return;
  }
  var isLight = document.documentElement.getAttribute('data-theme') === 'light';
  var textColor = isLight ? '#888888' : '#7c7c7c';
  var accentColor = isLight ? '#0070f3' : '#1ed760';
  var pad = { top: 10, right: 10, bottom: 25, left: 45 };
  var gw = w - pad.left - pad.right;
  var gh = h - pad.top - pad.bottom;
  var maxVal = Math.max.apply(null, timeline.map(function(t) { return t.views; })) * 1.15;
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  var step = gw / (timeline.length - 1 || 1);
  var points = timeline.map(function(t, i) {
    var x = pad.left + i * step;
    var y = h - pad.bottom - (gh * (t.views / maxVal));
    return { x: x, y: y, time: t.time, views: t.views };
  });
  ctx.moveTo(points[0].x, points[0].y);
  points.forEach(function(p) { ctx.lineTo(p.x, p.y); });
  ctx.stroke();
  ctx.fillStyle = isLight ? '#ffffff' : '#121212';
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 2;
  points.forEach(function(p) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });
  ctx.fillStyle = textColor;
  ctx.font = '9px var(--font-mono)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  var labelStep2 = Math.max(1, Math.floor(timeline.length / 6));
  points.forEach(function(p, i) {
    if (i % labelStep2 === 0 || i === timeline.length - 1) {
      ctx.fillText(p.time, p.x, h - pad.bottom + 5);
    }
  });
  var maxYLabel = Math.round(maxVal);
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = textColor;
  ctx.font = '9px var(--font-mono)';
  ctx.fillText(maxYLabel.toLocaleString(), pad.left - 5, pad.top);
}

function isThemeLight() {
  return document.documentElement.getAttribute('data-theme') === 'light';
}
