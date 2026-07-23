var CURRENT_SOURCE = 'youtube';
var CURRENT_ID = null;
var CURRENT_EMBED = null;
var CURRENT_EXTERNAL = null;
var CURRENT_THUMB = null;
var CURRENT_META = null;

var PLATFORM_LIST = [
  { id:'direct', name:'Direct URL', icon:'🔗', color:'#1ed760', placeholder:'Paste direct video URL (mp4, webm, etc.)…' },
  { id:'youtube', name:'YouTube', icon:'▶', color:'#FF0000', placeholder:'Paste YouTube URL…' },
  { id:'vimeo', name:'Vimeo', icon:'▽', color:'#1AB7EA', placeholder:'Paste Vimeo URL…' },
  { id:'dailymotion', name:'Dailymotion', icon:'◆', color:'#0066DC', placeholder:'Paste Dailymotion URL…' },
  { id:'streamable', name:'Streamable', icon:'▶', color:'#0F90FA', placeholder:'Paste Streamable URL…' },
  { id:'cloudflare', name:'Cloudflare Stream', icon:'◎', color:'#F38020', placeholder:'Paste Cloudflare Stream URL…' },
  { id:'peertube', name:'PeerTube', icon:'◉', color:'#F1680D', placeholder:'Paste PeerTube URL…' },
  { id:'wistia', name:'Wistia', icon:'◈', color:'#54BBFF', placeholder:'Paste Wistia URL…' },
  { id:'abyss', name:'Abyss.to', icon:'⬡', color:'#8B5CF6', placeholder:'Paste Abyss.to URL…' },
  { id:'pornhub', name:'Pornhub', icon:'🔥', color:'#FF9900', placeholder:'Paste Pornhub URL…' },
  { id:'googledrive', name:'Google Drive', icon:'▣', color:'#4285F4', placeholder:'Paste Google Drive URL…' },
  { id:'screenpal', name:'ScreenPal', icon:'●', color:'#00B4D8', placeholder:'Paste ScreenPal URL…' },
  { id:'dropbox', name:'Dropbox', icon:'◆', color:'#0061FF', placeholder:'Paste Dropbox URL…' },
  { id:'onedrive', name:'OneDrive', icon:'☁', color:'#0078D4', placeholder:'Paste OneDrive URL…' },
  { id:'embed', name:'Embed Code', icon:'</>', color:'#888', placeholder:'Paste iframe embed code…', noUrl:true }
];

var PARSERS = {
  direct: function(url) {
    return /^https?:\/\/.+\.(mp4|webm|ogg|mov|avi|mkv)(\?.*)?$/i.test(url) ? url : null;
  },
  youtube: function(url) {
    var m = url.match(/(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (m) return m[1];
    if (/^[a-zA-Z0-9_-]{11}$/.test(url) && !url.includes('.')) return url;
    return null;
  },
  vimeo: function(url) {
    var m = url.match(/(?:vimeo\.com|player\.vimeo\.com)\/(?:channels\/[^/]+\/|video\/|)(\d+)/);
    return m ? m[1] : null;
  },
  dailymotion: function(url) {
    var m = url.match(/(?:dailymotion\.com\/(?:embed\/)?video\/|dai\.ly\/)([a-zA-Z0-9]+)/);
    return m ? m[1] : null;
  },
  streamable: function(url) {
    var m = url.match(/streamable\.com\/(?:e\/)?([a-zA-Z0-9]+)/);
    return m ? m[1] : null;
  },
  cloudflare: function(url) {
    var m = url.match(/(?:watch\.cloudflarestream\.com|cloudflarestream\.com)\/(?:iframe\/|)([a-zA-Z0-9]+)/);
    return m ? m[1] : null;
  },
  peertube: function(url) {
    var m = url.match(/\/w\/([a-zA-Z0-9-]+)/);
    if (m) return m[1];
    var m2 = url.match(/\/videos\/(?:watch|embed)\/([a-zA-Z0-9-]+)/);
    return m2 ? m2[1] : null;
  },
  wistia: function(url) {
    var m = url.match(/(?:medias|iframe)\/([a-zA-Z0-9]+)/);
    if (m) return m[1];
    var m2 = url.match(/wistia\.(?:com|net)\/embed\/iframe\/([a-zA-Z0-9]+)/);
    return m2 ? m2[1] : null;
  },
  abyss: function(url) {
    var m = url.match(/abyss\.to\/(?:video\/|embed\/|)([a-zA-Z0-9-]+)/);
    return m ? m[1] : null;
  },
  pornhub: function(url) {
    var m = url.match(/pornhub\.com\/(?:view_video\.php\?viewkey=|embed\/|video\/)([a-zA-Z0-9]+)/);
    if (m) return m[1];
    var m2 = url.match(/[?&]viewkey=([a-zA-Z0-9]+)/);
    return m2 ? m2[1] : null;
  },
  googledrive: function(url) {
    var m = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    return m ? m[1] : null;
  },
  screenpal: function(url) {
    var m = url.match(/screenpal\.com\/(?:watch|embed)\/([a-zA-Z0-9]+)/);
    return m ? m[1] : null;
  },
  dropbox: function(url) {
    var m = url.match(/dropbox\.com\/(?:s\/|scl\/fi\/)([a-zA-Z0-9_-]+)/);
    return m ? m[1] : null;
  },
  onedrive: function(url) {
    return /onedrive\.live\.com/.test(url) ? url : null;
  },
  embed: function(code) {
    var m = code.match(/src=["']([^"']+)["']/);
    if (m && /^https?:\/\//.test(m[1])) return m[1];
    var t = code.trim();
    if (/^https?:\/\//.test(t)) return t;
    return null;
  }
};

function getEmbedUrl(source, id, raw) {
  if (source === 'direct') return '';
  if (source === 'youtube') return 'https://www.youtube.com/embed/' + id;
  if (source === 'vimeo') return 'https://player.vimeo.com/video/' + id;
  if (source === 'dailymotion') return 'https://www.dailymotion.com/embed/video/' + id;
  if (source === 'streamable') return 'https://streamable.com/e/' + id;
  if (source === 'cloudflare') {
    var c = raw && raw.match(/customer-([^.]+)\.cloudflarestream\.com/);
    return c ? 'https://customer-' + c[1] + '.cloudflarestream.com/' + id + '/iframe' : 'https://watch.cloudflarestream.com/' + id;
  }
  if (source === 'peertube') {
    var inst = raw && raw.match(/https?:\/\/([^\/]+)/);
    return inst ? 'https://' + inst[1] + '/videos/embed/' + id : null;
  }
  if (source === 'wistia') return 'https://fast.wistia.net/embed/iframe/' + id;
  if (source === 'abyss') return 'https://abyss.to/embed/' + id;
  if (source === 'pornhub') return 'https://www.pornhub.com/embed/' + id;
  if (source === 'googledrive') return 'https://drive.google.com/file/d/' + id + '/preview';
  if (source === 'screenpal') return 'https://screenpal.com/embed/' + id;
  if (source === 'dropbox') {
    if (raw && raw.includes('/scl/fi/')) return raw.replace(/\?dl=0/,'?dl=0&embed=1');
    return 'https://www.dropbox.com/s/' + id + '/preview';
  }
  if (source === 'onedrive') {
    if (id.includes('embed')) return id;
    return id.split('?')[0] + '?embed=1';
  }
  if (source === 'embed') return id;
  return null;
}

function getExternalUrl(source, id, raw) {
  if (source === 'direct') return id;
  if (source === 'youtube') return 'https://www.youtube.com/watch?v=' + id;
  if (source === 'vimeo') return 'https://vimeo.com/' + id;
  if (source === 'dailymotion') return 'https://www.dailymotion.com/video/' + id;
  if (source === 'streamable') return 'https://streamable.com/' + id;
  if (source === 'cloudflare') {
    var c = raw && raw.match(/customer-([^.]+)\.cloudflarestream\.com/);
    return c ? 'https://customer-' + c[1] + '.cloudflarestream.com/' + id : 'https://watch.cloudflarestream.com/' + id;
  }
  if (source === 'peertube') {
    var inst = raw && raw.match(/https?:\/\/([^\/]+)/);
    return inst ? 'https://' + inst[1] + '/w/' + id : null;
  }
  if (source === 'wistia') return 'https://fast.wistia.net/medias/' + id;
  if (source === 'abyss') return 'https://abyss.to/video/' + id;
  if (source === 'pornhub') return 'https://www.pornhub.com/view_video.php?viewkey=' + id;
  if (source === 'googledrive') return 'https://drive.google.com/file/d/' + id + '/view';
  if (source === 'screenpal') return 'https://screenpal.com/watch/' + id;
  if (source === 'dropbox') return raw || 'https://www.dropbox.com/s/' + id;
  if (source === 'onedrive') return id;
  if (source === 'embed') return id;
  return null;
}

function getThumbnailUrl(source, id) {
  if (source === 'direct') return null;
  if (source === 'youtube') return 'https://i.ytimg.com/vi/' + id + '/maxresdefault.jpg';
  if (source === 'dailymotion') return 'https://www.dailymotion.com/thumbnail/video/' + id;
  return null;
}

document.addEventListener('DOMContentLoaded', function() {
  window.Components.injectAdminSidebar('upload');
  setupTabs();
  renderPlatforms();
  setupInputs();
  setupThumbnail();
  renderHistory();
  setupSubmit();
});

function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.tab-btn').forEach(function(t) { t.classList.remove('active'); });
      btn.classList.add('active');
      document.querySelectorAll('.tab-panel').forEach(function(p) { p.classList.remove('active'); });
      var panel = document.getElementById('tab-panel-' + btn.dataset.tab);
      if (panel) panel.classList.add('active');
    });
  });
}

function renderPlatforms() {
  var container = document.getElementById('platform-selector');
  if (!container) return;
  container.innerHTML = PLATFORM_LIST.map(function(p) {
    return '<button type="button" class="platform-btn' + (p.id === CURRENT_SOURCE ? ' active' : '') + '" data-platform="' + p.id + '" style="--platform-color:' + p.color + '"><span class="platform-icon">' + p.icon + '</span><span class="platform-name">' + p.name + '</span></button>';
  }).join('');
  container.addEventListener('click', function(e) {
    var btn = e.target.closest('.platform-btn');
    if (!btn) return;
    var pid = btn.dataset.platform;
    if (pid === CURRENT_SOURCE) return;
    switchPlatform(pid);
  });
}

function switchPlatform(pid) {
  CURRENT_SOURCE = pid;
  clearVideo();
  document.querySelectorAll('.platform-btn').forEach(function(b) {
    b.classList.toggle('active', b.dataset.platform === pid);
  });
  var plat = PLATFORM_LIST.find(function(p) { return p.id === pid; });
  var urlSection = document.getElementById('platform-url-section');
  var input = document.getElementById('platform-url-input');
  var embedSection = document.getElementById('platform-embed-section');
  var directSection = document.getElementById('direct-upload-section');
  if (plat && plat.noUrl) {
    if (urlSection) urlSection.style.display = 'none';
    if (directSection) directSection.classList.add('hidden');
  } else if (pid === 'upload') {
    if (urlSection) urlSection.style.display = 'none';
    if (embedSection) embedSection.style.display = 'none';
    if (directSection) directSection.classList.remove('hidden');
  } else if (pid === 'direct') {
    if (urlSection) urlSection.style.display = '';
    if (embedSection) embedSection.style.display = 'none';
    if (directSection) directSection.classList.add('hidden');
    if (input && plat) input.placeholder = plat.placeholder;
  } else {
    if (urlSection) urlSection.style.display = '';
    if (embedSection) embedSection.style.display = '';
    if (directSection) directSection.classList.add('hidden');
    if (input && plat) input.placeholder = plat.placeholder;
  }
}

function setupInputs() {
  var input = document.getElementById('platform-url-input');
  var loadBtn = document.getElementById('load-video-btn');
  var clearBtn = document.getElementById('clear-video-btn');
  var embedTextarea = document.getElementById('embed-code-textarea');
  var loadEmbedBtn = document.getElementById('load-embed-btn');

  if (loadBtn && input) {
    loadBtn.addEventListener('click', function() { loadVideo(input.value); });
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') { e.preventDefault(); loadVideo(input.value); }
    });
    input.addEventListener('paste', function() {
      clearTimeout(window._pd);
      window._pd = setTimeout(function() { loadVideo(input.value); }, 800);
    });
  }
  if (loadEmbedBtn && embedTextarea) {
    loadEmbedBtn.addEventListener('click', function() { loadEmbed(embedTextarea.value); });
  }
  if (clearBtn) clearBtn.addEventListener('click', clearVideo);
}

function loadVideo(raw) {
  if (!raw || !raw.trim()) {
    showError('Please enter a URL.');
    return;
  }
  var plat = PLATFORM_LIST.find(function(p) { return p.id === CURRENT_SOURCE; });
  if (!plat || plat.noUrl) return;
  var parser = PARSERS[CURRENT_SOURCE];
  if (!parser) { showError('No parser for this platform.'); return; }
  var parsed = parser(raw.trim());
  if (!parsed) { showError('Could not extract a valid video ID from that URL.'); return; }
  var embedUrl = getEmbedUrl(CURRENT_SOURCE, parsed, raw.trim());
  if (!embedUrl) { showError('Could not generate an embed URL.'); return; }
  CURRENT_ID = parsed;
  CURRENT_EMBED = embedUrl;
  CURRENT_EXTERNAL = getExternalUrl(CURRENT_SOURCE, parsed, raw.trim()) || embedUrl;
  CURRENT_THUMB = getThumbnailUrl(CURRENT_SOURCE, parsed);
  CURRENT_META = null;
  renderEmbed(embedUrl);
  var clearBtn = document.getElementById('clear-video-btn');
  var submitBtn = document.getElementById('submit-btn');
  if (clearBtn) clearBtn.classList.remove('hidden');
  if (submitBtn) submitBtn.disabled = false;
  var titleInput = document.getElementById('title-input');
  if (titleInput) titleInput.value = plat.name + ' Video (' + parsed + ')';
  metafetch(CURRENT_SOURCE, parsed, embedUrl);
  saveHistory(CURRENT_SOURCE, parsed, embedUrl);
}

function loadEmbed(raw) {
  if (!raw || !raw.trim()) {
    var err = document.getElementById('embed-error');
    if (err) err.textContent = 'Please paste embed code or a URL.';
    return;
  }
  var parsed = PARSERS.embed(raw.trim());
  if (!parsed) {
    var err = document.getElementById('embed-error');
    if (err) err.textContent = 'Could not extract a URL from that embed code.';
    return;
  }
  CURRENT_SOURCE = 'embed';
  document.querySelectorAll('.platform-btn').forEach(function(b) { b.classList.toggle('active', b.dataset.platform === 'embed'); });
  var urlSec = document.getElementById('platform-url-section');
  if (urlSec) urlSec.style.display = 'none';
  CURRENT_ID = parsed;
  CURRENT_EMBED = parsed;
  CURRENT_EXTERNAL = parsed;
  CURRENT_THUMB = null;
  CURRENT_META = null;
  renderEmbed(parsed);
  var clearBtn = document.getElementById('clear-video-btn');
  var submitBtn = document.getElementById('submit-btn');
  if (clearBtn) clearBtn.classList.remove('hidden');
  if (submitBtn) submitBtn.disabled = false;
  var titleInput = document.getElementById('title-input');
  if (titleInput) titleInput.value = 'Embedded Content';
  var err = document.getElementById('embed-error');
  if (err) err.textContent = '';
}

function metafetch(source, id, embedUrl) {
  var metaEl = document.getElementById('video-metadata');
  var metaTitle = document.getElementById('meta-title');
  var metaChannel = document.getElementById('meta-channel');
  var metaThumb = document.getElementById('meta-thumbnail');
  if (!metaEl) return;

  if (source === 'youtube') {
    window.__ytCb = function(d) {
      if (!d) return;
      CURRENT_META = d;
      var ti = document.getElementById('title-input');
      if (ti && d.title) ti.value = d.title;
      if (metaTitle) metaTitle.textContent = d.title || '';
      if (metaChannel) metaChannel.textContent = d.author_name || '';
      if (d.thumbnail_url) {
        if (metaThumb) metaThumb.src = d.thumbnail_url;
        autoThumb(d.thumbnail_url);
      }
      metaEl.classList.remove('hidden');
      delete window.__ytCb;
    };
    var s = document.createElement('script');
    s.src = 'https://www.youtube.com/oembed?url=' + encodeURIComponent('https://www.youtube.com/watch?v=' + id) + '&format=json&callback=__ytCb';
    s.onerror = function() { delete window.__ytCb; s.remove(); };
    document.head.appendChild(s);
  } else if (source === 'vimeo') {
    window.__vmCb = function(d) {
      if (!d) return;
      CURRENT_META = d;
      var ti = document.getElementById('title-input');
      if (ti && d.title) ti.value = d.title;
      if (metaTitle) metaTitle.textContent = d.title || '';
      if (metaChannel) metaChannel.textContent = d.author_name || '';
      if (d.thumbnail_url) {
        if (metaThumb) metaThumb.src = d.thumbnail_url;
        autoThumb(d.thumbnail_url);
      }
      metaEl.classList.remove('hidden');
      delete window.__vmCb;
    };
    var s2 = document.createElement('script');
    s2.src = 'https://vimeo.com/api/oembed.json?url=' + encodeURIComponent('https://vimeo.com/' + id) + '&callback=__vmCb';
    s2.onerror = function() { delete window.__vmCb; s2.remove(); };
    document.head.appendChild(s2);
  } else {
    if (CURRENT_THUMB) {
      if (metaThumb) metaThumb.src = CURRENT_THUMB;
      autoThumb(CURRENT_THUMB);
      metaEl.classList.remove('hidden');
    }
  }
}

function renderEmbed(embedUrl) {
  var esc = function(s) { return String(s||'').replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c; }); };
  var container = document.getElementById('embed-container');
  var player = document.getElementById('embed-player');
  var loader = document.getElementById('embed-loader');
  var fallback = document.getElementById('embed-fallback');
  if (!container || !player || !loader || !fallback) return;
  container.classList.remove('hidden');
  fallback.classList.add('hidden');
  loader.classList.remove('hidden');
  player.innerHTML = '';
  if (window.location.protocol === 'file:') {
    loader.classList.add('hidden');
    fallback.classList.remove('hidden');
    fallback.innerHTML = '<p style="margin-bottom:8px;">⚠️ Embedded preview unavailable on local files.</p><a href="' + esc(embedUrl) + '" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:8px 20px;background:var(--accent);color:#fff;border-radius:var(--radius-full);text-decoration:none;font-weight:600;font-size:var(--text-sm);">Open video directly ↗</a>';
    return;
  }
  var iframe = document.createElement('iframe');
  iframe.src = embedUrl;
  iframe.title = 'Video player';
  iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
  iframe.allowFullscreen = true;
  iframe.style.border = '0';
  var loaded = false;
  iframe.addEventListener('load', function() { loaded = true; loader.classList.add('hidden'); });
  setTimeout(function() { if (!loaded) { loader.classList.add('hidden'); fallback.classList.remove('hidden'); } }, 10000);
  player.appendChild(iframe);
}

function clearVideo() {
  CURRENT_ID = null;
  CURRENT_EMBED = null;
  CURRENT_EXTERNAL = null;
  CURRENT_THUMB = null;
  CURRENT_META = null;
  var container = document.getElementById('embed-container');
  var player = document.getElementById('embed-player');
  var loader = document.getElementById('embed-loader');
  var fallback = document.getElementById('embed-fallback');
  var metadata = document.getElementById('video-metadata');
  var clearBtn = document.getElementById('clear-video-btn');
  var submitBtn = document.getElementById('submit-btn');
  var err = document.getElementById('platform-error');
  var input = document.getElementById('platform-url-input');
  var embedTa = document.getElementById('embed-code-textarea');
  if (container) container.classList.add('hidden');
  if (player) player.innerHTML = '';
  if (loader) loader.classList.add('hidden');
  if (fallback) fallback.classList.add('hidden');
  if (metadata) metadata.classList.add('hidden');
  if (clearBtn) clearBtn.classList.add('hidden');
  if (submitBtn) submitBtn.disabled = true;
  if (err) err.textContent = '';
  if (input) { input.classList.remove('has-error'); input.value = ''; }
  if (embedTa) embedTa.value = '';
  var thumbUrlInput = document.getElementById('thumbnail-url-input');
  if (thumbUrlInput) thumbUrlInput.value = '';
}

function showError(msg) {
  var err = document.getElementById('platform-error');
  var input = document.getElementById('platform-url-input');
  if (err) err.textContent = msg;
  if (input) input.classList.add('has-error');
}

function autoThumb(url) {
  var preview = document.getElementById('thumbnail-preview');
  var placeholder = document.getElementById('thumbnail-placeholder');
  if (!preview || !placeholder) return;
  preview.src = url;
  preview.style.display = 'block';
  placeholder.style.display = 'none';
  var urlInput = document.getElementById('thumbnail-url-input');
  if (urlInput && !urlInput.value.trim()) urlInput.value = url;
}

function setupThumbnail() {
  var thumbInput = document.getElementById('thumbnail-file-input');
  var thumbBox = document.getElementById('thumbnail-box');
  var thumbPreview = document.getElementById('thumbnail-preview');
  var thumbPlaceholder = document.getElementById('thumbnail-placeholder');
  var thumbUrlInput = document.getElementById('thumbnail-url-input');
  if (!thumbBox || !thumbInput) return;
  thumbBox.addEventListener('click', function() { thumbInput.click(); });
  thumbInput.addEventListener('change', function() {
    if (thumbInput.files.length > 0) {
      var reader = new FileReader();
      reader.onload = function(e) {
        thumbPreview.src = e.target.result;
        thumbPreview.style.display = 'block';
        thumbPlaceholder.style.display = 'none';
      };
      reader.readAsDataURL(thumbInput.files[0]);
    }
  });
  if (thumbUrlInput) {
    thumbUrlInput.addEventListener('input', function() {
      var val = this.value.trim();
      if (val && /^https?:\/\//.test(val)) {
        thumbPreview.src = val;
        thumbPreview.style.display = 'block';
        thumbPlaceholder.style.display = 'none';
      }
    });
    thumbUrlInput.addEventListener('paste', function() {
      setTimeout(function() {
        var val = thumbUrlInput.value.trim();
        if (val && /^https?:\/\//.test(val)) {
          thumbPreview.src = val;
          thumbPreview.style.display = 'block';
          thumbPlaceholder.style.display = 'none';
        }
      }, 50);
    });
  }
  var fetchBtn = document.getElementById('fetch-thumb-btn');
  if (fetchBtn && thumbUrlInput) {
    fetchBtn.addEventListener('click', function() {
      var val = thumbUrlInput.value.trim();
      if (!val) { window.App.showToast('Paste an image URL first.', 'warning'); return; }
      if (!/^https?:\/\//.test(val)) { window.App.showToast('Invalid URL. Must start with http:// or https://', 'warning'); return; }
      thumbPreview.src = val;
      thumbPreview.style.display = 'block';
      thumbPlaceholder.style.display = 'none';
      window.App.showToast('Thumbnail loaded from URL.');
    });
  }
}

var HISTORY_KEY = 'video-upload-history';
var MAX_HISTORY = 10;

function getHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; } catch(_) { return []; }
}

function saveHistory(source, id, embedUrl) {
  var history = getHistory();
  var plat = PLATFORM_LIST.find(function(p) { return p.id === source; });
  var title = CURRENT_META && CURRENT_META.title ? CURRENT_META.title : (plat ? plat.name + ' (' + id + ')' : id);
  var thumb = CURRENT_META && CURRENT_META.thumbnail_url ? CURRENT_META.thumbnail_url : (getThumbnailUrl(source, id) || '');
  history = history.filter(function(h) { return !(h.platform === source && h.id === id); });
  history.unshift({ platform: source, id: id, title: title.substring(0, 80), thumbnail: thumb || '' });
  if (history.length > MAX_HISTORY) history = history.slice(0, MAX_HISTORY);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  renderHistory();
}

function renderHistory() {
  var esc = function(s) { return String(s||'').replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c; }); };
  var container = document.getElementById('recent-history');
  var history = getHistory();
  if (!container) return;
  if (history.length === 0) { container.classList.add('hidden'); return; }
  container.classList.remove('hidden');
  container.innerHTML = '<span class="recent-history-label">Recently Loaded</span>' + history.map(function(h) {
    var plat = PLATFORM_LIST.find(function(p) { return p.id === h.platform; });
    return '<span class="recent-history-chip" data-platform="' + esc(h.platform) + '" data-id="' + esc(h.id) + '">' + (h.thumbnail ? '<img src="' + esc(h.thumbnail) + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">' : '<span class="chip-platform-icon">' + (plat ? plat.icon : '▸') + '</span>') + '<span>' + esc(h.title) + '</span></span>';
  }).join('');
  container.querySelectorAll('.recent-history-chip').forEach(function(el) {
    el.addEventListener('click', function() {
      var pid = el.dataset.platform;
      var id = el.dataset.id;
      switchPlatform(pid);
      var input = document.getElementById('platform-url-input');
      var embedTa = document.getElementById('embed-code-textarea');
      var platObj = PLATFORM_LIST.find(function(p) { return p.id === pid; });
      if (platObj && platObj.noUrl) {
        var embedUrl = getEmbedUrl(pid, id, null);
        if (embedTa && embedUrl) { embedTa.value = embedUrl; loadEmbed(embedUrl); }
      } else {
        var extUrl = getExternalUrl(pid, id, null);
        if (input && extUrl) { input.value = extUrl; loadVideo(extUrl); }
      }
    });
  });
}

function setupSubmit() {
  var form = document.getElementById('upload-video-form');
  var submitBtn = document.getElementById('submit-btn');
  if (!form || !submitBtn) return;
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    if (!CURRENT_ID && CURRENT_SOURCE !== 'embed') {
      window.App.showToast('Please load a video first.', 'error');
      return;
    }
    if (!CURRENT_EMBED && CURRENT_SOURCE !== 'upload' && CURRENT_SOURCE !== 'direct') {
      window.App.showToast('Invalid embed URL. Please reload.', 'error');
      return;
    }
    var title = document.getElementById('title-input').value.trim();
    if (!title) { window.App.showToast('Video title is required.', 'error'); return; }
    var description = document.getElementById('description-input').value.trim();
    var duration = document.getElementById('duration-input').value.trim();
    if (!duration) duration = '5:00';
    if (!/^[0-9]+:[0-5]?[0-9]:[0-5][0-9]$|^[0-9]+:[0-5][0-9]$/.test(duration)) {
      window.App.showToast('Invalid duration. Use mm:ss or hh:mm:ss.', 'error'); return;
    }
    var tags = getTags();
    var publishToggle = document.getElementById('publish-toggle').checked;
    var thumbFileInput = document.getElementById('thumbnail-file-input');
    var thumbFile = thumbFileInput && thumbFileInput.files.length > 0 ? thumbFileInput.files[0] : null;
    var thumbUrlInput = document.getElementById('thumbnail-url-input');
    var manualThumb = thumbUrlInput ? thumbUrlInput.value.trim() : '';
    var previewImg = document.getElementById('thumbnail-preview');
    var placehold = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 9%22%3E%3Crect width=%22100%25%22 height=%22100%25%22 fill=%22%231f1f1f%22/%3E%3Ctext x=%228%22 y=%225%22 text-anchor=%22middle%22 fill=%22%23666%22 font-size=%221%22%3ENo Thumbnail%3C/text%3E%3C/svg%3E';
    var thumbnailSrc = manualThumb || (previewImg && previewImg.style.display === 'block' ? previewImg.src : (CURRENT_THUMB || placehold));

    submitBtn.disabled = true;
    submitBtn.textContent = 'Publishing...';

    if (thumbFile && window.__supabase) {
      var ext = thumbFile.name.split('.').pop() || 'jpg';
      var thumbPath = 'thumbnails/' + Date.now() + '.' + ext;
      var uploaded = await window.SupabaseStorage.uploadFile('thumbnails', thumbPath, thumbFile);
      if (uploaded) thumbnailSrc = uploaded;
    }

    var newVideo = {
      title: title,
      description: description,
      video_source: CURRENT_SOURCE,
      external_url: CURRENT_EXTERNAL || '',
      embed_code: CURRENT_EMBED || '',
      thumbnail: thumbnailSrc,
      tags: tags,
      duration: duration,
      status: publishToggle ? 'published' : 'draft',
      creator: 'Administrator'
    };

    if (window.__supabase) {
      var result = await window.SupabaseVideos.insert(newVideo);
      if (result) {
        window.SupabaseVideos.invalidateCache();
        var dbVids = window.App.getVideos();
        dbVids.push(result);
        window.App.saveVideos(dbVids);
        window.App.showToast('Video published successfully!', 'success');
        setTimeout(function() { window.location.href = './videos.html'; }, 1000);
        return;
      }
      window.App.showToast('Supabase save failed, check console.', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Publish Video';
      return;
    }

    var dbVids = window.App.getVideos();
    newVideo.id = 'vid-' + Date.now();
    dbVids.push(newVideo);
    window.App.saveVideos(dbVids);
    window.App.showToast('Video published successfully (local storage).', 'success');
    setTimeout(function() { window.location.href = './videos.html'; }, 1000);
  });
}

function getTags() {
  var display = document.getElementById('tags-chips-display');
  if (!display) return [];
  var arr = [];
  display.querySelectorAll('.tag-chip').forEach(function(chip) {
    var text = chip.firstChild.textContent || '';
    if (text) arr.push(text.trim());
  });
  return arr;
}

var _tagEsc = function(s) { return String(s||'').replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c; }); };

var tagInputInited = false;
document.addEventListener('DOMContentLoaded', function() {
  if (tagInputInited) return;
  tagInputInited = true;
  var container = document.getElementById('tags-input-container');
  var input = document.getElementById('tags-input');
  if (!container || !input) return;
  container.addEventListener('click', function(e) { if (e.target === container) input.focus(); });
  input.addEventListener('keydown', function(e) {
    if (e.key === ',' || e.key === 'Enter') { e.preventDefault(); addTag(input.value); }
  });
  input.addEventListener('blur', function() { if (input.value.trim()) addTag(input.value); });
});

function addTag(raw) {
  var input = document.getElementById('tags-input');
  var display = document.getElementById('tags-chips-display');
  if (!input || !display) return;
  var parts = raw.split(',').map(function(s) { return s.trim(); }).filter(Boolean);
  if (parts.length === 0) return;
  parts.forEach(function(name) {
    var existing = display.querySelectorAll('.tag-chip');
    var dup = false;
    existing.forEach(function(chip) { if (chip.dataset.tag === name.toLowerCase()) dup = true; });
    if (dup) return;
    var chip = document.createElement('span');
    chip.className = 'tag-chip';
    chip.dataset.tag = name.toLowerCase();
    chip.innerHTML = _tagEsc(name) + '<span class="tag-chip-remove">&times;</span>';
    chip.querySelector('.tag-chip-remove').addEventListener('click', function(e) { e.stopPropagation(); chip.remove(); });
    display.appendChild(chip);
  });
  input.value = '';
  input.focus();
}
