document.addEventListener('DOMContentLoaded', function() {
  window.Components.injectNavbar();
  window.Components.injectFooter();
  var backLink = document.getElementById('back-link');
  if (backLink) {
    backLink.addEventListener('click', function(e) {
      e.preventDefault();
      if (document.referrer && document.referrer.indexOf(window.location.hostname) !== -1) {
        history.back();
      } else {
        window.location.href = './index.html';
      }
    });
  }
  var params = window.App.getQueryParams();
  var videoId = params.id;
  if (!videoId) { renderErrorView('Invalid Video Reference.'); return; }
  loadVideoAndRender(videoId);
});

function loadVideoAndRender(videoId) {
  var video = null;
  (async function() {
    if (window.__supabase && window.SupabaseVideos) {
      try {
        var sb = await window.SupabaseVideos.fetchById(videoId);
        if (sb) { video = sb; renderPage(video); return; }
      } catch(e) {}
    }
    if (!video) {
      var db = window.App.getVideos();
      video = db.find(function(v) { return v.id === videoId; });
    }
    if (video) { renderPage(video); return; }
    if (window.__supabase && window.SupabaseVideos) {
      renderErrorView('The video you are looking for does not exist.');
      return;
    }
    var tryLater = function() {
      document.removeEventListener('supabase-ready', tryLater);
      loadVideoAndRender(videoId);
    };
    document.addEventListener('supabase-ready', tryLater);
    renderLoadingView();
  })();
}

function renderPage(video) {
  video.views = (video.views || 0) + 1;
  if (window.SupabaseEngagement) window.SupabaseEngagement.incrementViews(video.id);
  else if (window.Engagement) window.Engagement.incrementView(video.id);
  var handleLike = function() {
    if (window.SupabaseEngagement) window.SupabaseEngagement.incrementLikes(video.id);
    else if (window.Engagement) window.Engagement.incrementLike(video.id);
    var countEl = document.getElementById('watch-like-count');
    if (countEl) countEl.innerText = String(Number(countEl.innerText.replace(/\D/g,'')) + 1);
    var likeBtn = document.getElementById('watch-like-btn');
    if (likeBtn) { likeBtn.classList.add('liked'); likeBtn.style.animation = 'none'; void likeBtn.offsetWidth; likeBtn.style.animation = 'heartBeat 0.4s ease'; }
    var npHeart = document.getElementById('np-heart');
    if (npHeart) npHeart.classList.add('liked');
  };
  var handleReaction = function() {
    if (window.SupabaseEngagement) window.SupabaseEngagement.incrementReactions(video.id);
    else if (window.Engagement) window.Engagement.incrementReaction(video.id);
    var countEl = document.getElementById('watch-reaction-count');
    if (countEl) countEl.innerText = String(Number(countEl.innerText.replace(/\D/g,'')) + 1);
    var reactBtn = document.getElementById('watch-reaction-btn');
    if (reactBtn) { reactBtn.style.animation = 'none'; void reactBtn.offsetWidth; reactBtn.style.animation = 'reactionPop 0.4s ease'; }
  };
  setupPlayer(video);
  setupDetails(video, handleLike, handleReaction);
  setupRelated(video);
  var source = video.video_source || '';
  if (window.SupabaseEngagement) {
    window.SupabaseEngagement.subscribeToVideo(video.id, function(data) {
      updateCounts(data);
    });
  } else if (window.Engagement) {
    window.Engagement.subscribe(video.id, function(data) {
      updateCounts(data);
    });
  }
  window.Animations.initScrollReveal();
}

function updateCounts(data) {
  var viewsEl = document.getElementById('watch-views-count');
  var likesEl = document.getElementById('watch-like-count');
  var reactsEl = document.getElementById('watch-reaction-count');
  var fmt = window.Engagement ? window.Engagement.formatNum : function(n) { return Number(n).toLocaleString(); };
  if (viewsEl && data.views !== undefined) viewsEl.innerText = fmt(data.views);
  if (likesEl && data.likes !== undefined) likesEl.innerText = fmt(data.likes);
  if (reactsEl && data.reactions !== undefined) reactsEl.innerText = fmt(data.reactions);
}

function setupPlayer(video) {
  var container = document.getElementById('player-container');
  var videoEl = document.getElementById('main-video-player');
  var embedPlaceholder = document.getElementById('player-embed-placeholder');
  var loadingEl = document.getElementById('player-loading');
  if (!container) return;
  var vs = video.video_source || '';
  var ec = video.embed_code || '';
  var eu = video.external_url || '';
  var directSources = ['upload', 'direct', ''];
  var embedSources = ['youtube','vimeo','dailymotion','streamable','cloudflare','peertube','wistia','abyss','pornhub','googledrive','screenpal','dropbox','onedrive'];

  if (embedSources.indexOf(vs) !== -1 && ec) {
    if (videoEl) videoEl.style.display = 'none';
    if (embedPlaceholder) {
      embedPlaceholder.style.display = 'block';
      embedPlaceholder.innerHTML = '';
      var iframe = document.createElement('iframe');
      iframe.src = ec;
      iframe.title = video.title || 'Video player';
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      iframe.allowFullscreen = true;
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = '0';
      embedPlaceholder.appendChild(iframe);
    }
    if (loadingEl) loadingEl.style.display = 'none';
  } else if (vs === 'embed' && ec) {
    if (videoEl) videoEl.style.display = 'none';
    if (embedPlaceholder) {
      embedPlaceholder.style.display = 'block';
      var isIframe = /<iframe/i.test(ec);
      if (isIframe) {
        embedPlaceholder.innerHTML = ec;
        var ifr = embedPlaceholder.querySelector('iframe');
        if (ifr) { ifr.style.width = '100%'; ifr.style.height = '100%'; ifr.style.border = '0'; }
      } else if (/^https?:\/\//.test(ec)) {
        var iframe2 = document.createElement('iframe');
        iframe2.src = ec;
        iframe2.title = video.title || 'Embedded content';
        iframe2.allowFullscreen = true;
        iframe2.style.width = '100%';
        iframe2.style.height = '100%';
        iframe2.style.border = '0';
        embedPlaceholder.innerHTML = '';
        embedPlaceholder.appendChild(iframe2);
      } else {
        embedPlaceholder.innerHTML = '<div style="padding:20px;color:var(--text-muted);text-align:center;">' + ec + '</div>';
      }
    }
    if (loadingEl) loadingEl.style.display = 'none';
  } else if (directSources.indexOf(vs) !== -1 || !vs) {
    var videoUrl = eu || video.videoUrl || '';
    if (embedPlaceholder) embedPlaceholder.style.display = 'none';
    if (videoEl) {
      videoEl.style.display = 'block';
      if (videoUrl) {
        if (videoUrl.indexOf('.m3u8') !== -1) {
          if (window.Hls) {
            var hls = new window.Hls();
            hls.loadSource(videoUrl);
            hls.attachMedia(videoEl);
            hls.on(window.Hls.Events.MANIFEST_PARSED, function() {
              videoEl.play().catch(function(){});
            });
          } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
            videoEl.src = videoUrl;
            videoEl.addEventListener('loadedmetadata', function() {
              videoEl.play().catch(function(){});
            });
          } else {
            loadHlsJs(videoUrl, videoEl);
          }
        } else {
          videoEl.src = videoUrl;
          videoEl.load();
        }
      }
    }
    if (loadingEl) loadingEl.style.display = 'none';
  } else {
    if (loadingEl) loadingEl.style.display = 'none';
    if (embedPlaceholder) {
      embedPlaceholder.style.display = 'block';
      embedPlaceholder.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted);"><p>No player available for this video source.</p></div>';
    }
  }
}

function loadHlsJs(url, videoEl) {
  var tag = document.createElement('script');
  tag.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest';
  tag.onload = function() {
    if (window.Hls.isSupported()) {
      var hls = new window.Hls();
      hls.loadSource(url);
      hls.attachMedia(videoEl);
      hls.on(window.Hls.Events.MANIFEST_PARSED, function() {
        videoEl.play().catch(function(){});
      });
    }
  };
  document.head.appendChild(tag);
}

function setupDetails(video, handleLike, handleReaction) {
  var titleEl = document.getElementById('watch-title');
  var viewsEl = document.getElementById('watch-views-count');
  var dateEl = document.getElementById('watch-publish-date');
  var descEl = document.getElementById('watch-description');
  var creatorAvatarEl = document.getElementById('creator-avatar-letter');
  var creatorNameEl = document.getElementById('creator-name');
  var tagsRow = document.getElementById('watch-tags-row');
  var likeBtn = document.getElementById('watch-like-btn');
  var likeCountEl = document.getElementById('watch-like-count');
  var reactBtn = document.getElementById('watch-reaction-btn');
  var reactCountEl = document.getElementById('watch-reaction-count');
  var fmt = window.Engagement ? window.Engagement.formatNum : function(n) { return Number(n).toLocaleString(); };

  if (titleEl) titleEl.innerText = video.title;
  if (viewsEl) viewsEl.innerText = fmt(video.views);
  if (dateEl) dateEl.innerText = video.publishDate;
  if (descEl) descEl.innerText = video.description;
  if (creatorNameEl) creatorNameEl.innerText = video.creator;
  if (creatorAvatarEl) creatorAvatarEl.innerText = (video.creator || 'A').charAt(0).toUpperCase();

  if (tagsRow) {
    var esc = function(s) { return String(s||'').replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c; }); };
    tagsRow.innerHTML = (video.tags || []).map(function(t) {
      var hash = 0;
      for (var i = 0; i < t.length; i++) hash = t.charCodeAt(i) + ((hash << 5) - hash);
      var colors = ['#0070f3','#7928ca','#ff0080','#ffa42b','#50e3c2','#539df5','#1db954','#f3727f','#e91e63','#ff5722','#9c27b0','#00bcd4','#ff9800','#4caf50','#f44336','#3f51b5'];
      var c = colors[Math.abs(hash) % colors.length];
      return '<a href="./tag.html?tag=' + encodeURIComponent(t) + '" class="tag-badge" style="border-left:4px solid ' + c + '; background:' + c + '18;">' + esc(t) + '</a>';
    }).join('');
  }

  if (likeBtn && likeCountEl) {
    likeCountEl.innerText = fmt(video.likes);
    likeBtn.addEventListener('click', function(e) { e.preventDefault(); handleLike(); });
  }
  if (reactBtn && reactCountEl) {
    reactCountEl.innerText = fmt(video.reactions);
    reactBtn.addEventListener('click', function(e) { e.preventDefault(); handleReaction(); });
  }
  setupEmbedButton(video);
}

function setupEmbedButton(video) {
  var embedBtn = document.getElementById('watch-embed-btn');
  var overlay = document.getElementById('embed-modal-overlay');
  var closeBtn = document.getElementById('embed-modal-close');
  var output = document.getElementById('embed-code-output');
  var copyBtn = document.getElementById('embed-copy-btn');
  if (!embedBtn || !overlay || !output) return;
  var pageUrl = window.location.protocol + '//' + window.location.hostname + (window.location.port ? ':' + window.location.port : '');
  var embedSrc = pageUrl + '/embed.html?id=' + encodeURIComponent(video.id);
  var fallbackUrl = pageUrl + '/watch.html?id=' + encodeURIComponent(video.id);
  var iframeCode = '<iframe src="' + embedSrc.replace(/&/g,'&amp;') + '" width="640" height="360" frameborder="0" allowfullscreen></iframe>';
  embedBtn.addEventListener('click', function() {
    output.textContent = iframeCode;
    overlay.style.display = 'flex';
    requestAnimationFrame(function() { overlay.classList.add('active'); });
  });
  function closeEmbed() {
    overlay.classList.remove('active');
    setTimeout(function() { overlay.style.display = 'none'; }, 200);
  }
  if (closeBtn) closeBtn.addEventListener('click', closeEmbed);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) closeEmbed(); });
  if (copyBtn) {
    copyBtn.addEventListener('click', function() {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(iframeCode).then(function() {
          copyBtn.textContent = 'Copied!';
          setTimeout(function() { copyBtn.textContent = 'Copy Code'; }, 2000);
        }).catch(function() {
          fallbackCopy(iframeCode, copyBtn);
        });
      } else {
        fallbackCopy(iframeCode, copyBtn);
      }
    });
  }
  function fallbackCopy(text, btn) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); btn.textContent = 'Copied!'; setTimeout(function() { btn.textContent = 'Copy Code'; }, 2000); } catch(e) {}
    document.body.removeChild(ta);
  }
}

function setupRelated(currentVideo) {
  var sidebarContainer = document.getElementById('related-videos-container');
  if (!sidebarContainer) return;
  var allVideos = window.App.getVideos();
  var published = allVideos.filter(function(v) { return v.id !== currentVideo.id && v.status === 'published'; });
  (async function() {
    var curatedIds = null;
    if (window.SupabaseSettings) {
      try {
        var raw = await window.SupabaseSettings.get('related_videos');
        if (raw) curatedIds = raw.split(',').map(function(s) { return s.trim(); }).filter(Boolean);
      } catch(e) {}
    }
    if (!curatedIds || curatedIds.length === 0) {
      try { var local = localStorage.getItem('related_videos'); if (local) curatedIds = local.split(',').map(function(s) { return s.trim(); }).filter(Boolean); } catch(e) {}
    }
    var related;
    if (curatedIds && curatedIds.length > 0) {
      var idIndex = {};
      curatedIds.forEach(function(id, i) { idIndex[id] = i; });
      related = curatedIds.map(function(id) { return published.find(function(v) { return v.id === id; }); }).filter(Boolean);
    } else {
      related = published.sort(function(a, b) {
        var aOverlap = (a.tags || []).filter(function(t) { return (currentVideo.tags || []).includes(t); }).length;
        var bOverlap = (b.tags || []).filter(function(t) { return (currentVideo.tags || []).includes(t); }).length;
        if (aOverlap !== bOverlap) return bOverlap - aOverlap;
        return b.views - a.views;
      }).slice(0, 6);
    }
    if (related.length === 0) {
      sidebarContainer.innerHTML = '<p style="font-size:var(--text-sm);color:var(--text-muted);">No related videos.</p>';
      return;
    }
    var esc = function(s) { return String(s||'').replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c; }); };
    var fmt = window.Engagement ? window.Engagement.formatNum : function(n) { return Number(n).toLocaleString(); };
    var html = '<div class="sidebar-section">';
    related.forEach(function(v) {
      html += '<div class="related-card" data-href="./watch.html?id=' + encodeURIComponent(v.id) + '" role="button" tabindex="0">' +
        '<div class="related-thumb"><img src="' + (v.thumbnail || '') + '" alt="" loading="lazy" onerror="this.parentElement.innerHTML=\'<div style=width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:var(--bg-secondary);color:var(--text-muted);font-size:10px;>No thumb</div>\'">' +
        (v.duration ? '<span class="related-duration">' + esc(v.duration) + '</span>' : '') +
        '</div><div class="related-info"><span class="related-title">' + esc(v.title) + '</span><span class="related-meta">' + esc(v.creator) + ' • ' + fmt(v.views) + ' views</span></div></div>';
    });
    html += '</div>';
    sidebarContainer.innerHTML = html;
    sidebarContainer.querySelectorAll('.related-card').forEach(function(card) {
      card.addEventListener('click', function() { window.location.href = card.dataset.href; });
    });
  })();
}

function renderLoadingView() {
  var container = document.getElementById('player-container');
  if (container) container.innerHTML = '<div class="loading-state" style="text-align:center;padding:80px 20px;"><div class="spinner" style="width:40px;height:40px;border:3px solid var(--bg-tertiary);border-top-color:var(--accent);border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 16px;"></div><p style="color:var(--text-muted);">Connecting to server\u2026</p></div>';
}

function renderErrorView(msg) {
  var container = document.getElementById('player-container');
  if (container) container.innerHTML = '<div class="error-state" style="text-align:center;padding:80px 20px;"><h2 style="font-size:var(--text-xl);margin-bottom:var(--space-md);">' + msg + '</h2><a href="./index.html" class="btn btn-primary">Back to Home</a></div>';
}

var youtubePlayerInstance = null;
var youtubeApiLoaded = false;
var youtubeApiCallbacks = [];

function onYouTubeIframeAPIReady() {
  youtubeApiLoaded = true;
  youtubeApiCallbacks.forEach(function(cb) { cb(); });
}
