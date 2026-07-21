const TAG_COLORS = ['#0070f3','#7928ca','#ff0080','#ffa42b','#50e3c2','#539df5','#1db954','#f3727f','#e91e63','#ff5722','#9c27b0','#00bcd4','#ff9800','#4caf50','#f44336','#3f51b5'];
const HISTORY_KEY = 'video-upload-history';
const MAX_HISTORY = 10;

let currentPlatform = 'youtube';
let currentVideoId = null;
let currentEmbedUrl = null;
let currentVideoUrl = null;
let currentThumbnailUrl = null;
let currentMetadata = null;

// ─── JSONP Helper with timeout ──────────────────────────────────────────────
function jsonp(url, callbackName, cb) {
  const timeout = setTimeout(() => {
    delete window[callbackName];
    cb(new Error('Request timed out'), null);
  }, 5000);

  window[callbackName] = (data) => {
    clearTimeout(timeout);
    setTimeout(() => delete window[callbackName], 100);
    cb(null, data);
  };

  const s = document.createElement('script');
  s.src = url + (url.includes('?') ? '&' : '?') + 'callback=' + callbackName;
  s.onerror = () => {
    clearTimeout(timeout);
    delete window[callbackName];
    cb(new Error('oEmbed failed'), null);
    s.remove();
  };
  document.head.appendChild(s);
}

// ─── Platform Definitions ──────────────────────────────────────────────────

const PLATFORMS = {
  youtube: {
    id:'youtube', name:'YouTube', icon:'▶', color:'#FF0000',
    placeholder:'Paste YouTube URL… (youtube.com/watch?v=… or youtu.be/…)',
    parseUrl(url) {
      const patterns = [
        /(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtube\.com\/shorts\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
        /(?:^|[?&])v=([a-zA-Z0-9_-]{11})/
      ];
      for (const re of patterns) { const m = url.match(re); if (m && m[1].length===11) return m[1]; }
      if (/^[a-zA-Z0-9_-]{11}$/.test(url) && !url.includes('.')) return url;
      return null;
    },
    getEmbedUrl(id) { return `https://www.youtube.com/embed/${id}`; },
    getVideoUrl(id) { return `https://www.youtube.com/watch?v=${id}`; },
    getThumbnailUrl(id) { return `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`; },
    fetchMetadata(id, cb) {
      jsonp(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`, '__ytCb', (err, d) => {
        cb(err, d);
      });
    },
    fetchDescription(id, cb) {
      jsonp(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${id}`, '__ndCb', (err, d) => {
        cb(err, (d && d.description) || '');
      });
    }
  },

  vimeo: {
    id:'vimeo', name:'Vimeo', icon:'▽', color:'#1AB7EA',
    placeholder:'Paste Vimeo URL… (vimeo.com/123456)',
    parseUrl(url) {
      const m = url.match(/(?:vimeo\.com|player\.vimeo\.com)\/(?:channels\/[^/]+\/|video\/|)(\d+)/);
      return m ? m[1] : null;
    },
    getEmbedUrl(id) { return `https://player.vimeo.com/video/${id}`; },
    getVideoUrl(id) { return `https://vimeo.com/${id}`; },
    getThumbnailUrl() { return null; },
    fetchMetadata(id, cb) {
      jsonp(`https://vimeo.com/api/oembed.json?url=https://vimeo.com/${id}`, '__vmCb', (err, d) => {
        cb(err, d);
      });
    }
  },

  dailymotion: {
    id:'dailymotion', name:'Dailymotion', icon:'◆', color:'#0066DC',
    placeholder:'Paste Dailymotion URL… (dailymotion.com/video/…)',
    parseUrl(url) {
      const m = url.match(/(?:dailymotion\.com\/(?:embed\/)?video\/|dai\.ly\/)([a-zA-Z0-9]+)/);
      return m ? m[1] : null;
    },
    getEmbedUrl(id) { return `https://www.dailymotion.com/embed/video/${id}`; },
    getVideoUrl(id) { return `https://www.dailymotion.com/video/${id}`; },
    getThumbnailUrl(id) { return `https://www.dailymotion.com/thumbnail/video/${id}`; },
    fetchMetadata(id, cb) {
      jsonp(`https://www.dailymotion.com/services/oembed?url=https://www.dailymotion.com/video/${id}&format=json`, '__dmCb', (err, d) => {
        cb(err, d);
      });
    }
  },

  streamable: {
    id:'streamable', name:'Streamable', icon:'▶', color:'#0F90FA',
    placeholder:'Paste Streamable URL… (streamable.com/…)',
    parseUrl(url) {
      const m = url.match(/streamable\.com\/(?:e\/)?([a-zA-Z0-9]+)/);
      return m ? m[1] : null;
    },
    getEmbedUrl(id) { return `https://streamable.com/e/${id}`; },
    getVideoUrl(id) { return `https://streamable.com/${id}`; },
    getThumbnailUrl() { return null; },
    fetchMetadata(id, cb) {
      jsonp(`https://api.streamable.com/oembed.json?url=https://streamable.com/${id}`, '__stCb', (err, d) => {
        cb(err, d);
      });
    }
  },

  cloudflare: {
    id:'cloudflare', name:'Cloudflare Stream', icon:'◎', color:'#F38020',
    placeholder:'Paste Cloudflare Stream URL…',
    parseUrl(url) {
      const m = url.match(/(?:watch\.cloudflarestream\.com|cloudflarestream\.com)\/(?:iframe\/|)([a-zA-Z0-9]+)/);
      return m ? m[1] : null;
    },
    getEmbedUrl(id, orig) {
      const c = orig && orig.match(/customer-([^.]+)\.cloudflarestream\.com/);
      return c ? `https://customer-${c[1]}.cloudflarestream.com/${id}/iframe` : `https://watch.cloudflarestream.com/${id}`;
    },
    getVideoUrl(id, orig) {
      const c = orig && orig.match(/customer-([^.]+)\.cloudflarestream\.com/);
      return c ? `https://customer-${c[1]}.cloudflarestream.com/${id}` : `https://watch.cloudflarestream.com/${id}`;
    },
    getThumbnailUrl() { return null; }
  },

  peertube: {
    id:'peertube', name:'PeerTube', icon:'◉', color:'#F1680D',
    placeholder:'Paste PeerTube URL… ({instance}/w/{id})',
    parseUrl(url) {
      const m = url.match(/\/w\/([a-zA-Z0-9-]+)/);
      if (m) return m[1];
      const m2 = url.match(/\/videos\/(?:watch|embed)\/([a-zA-Z0-9-]+)/);
      return m2 ? m2[1] : null;
    },
    getEmbedUrl(id, orig) {
      const inst = orig && orig.match(/https?:\/\/([^\/]+)/);
      return inst ? `https://${inst[1]}/videos/embed/${id}` : null;
    },
    getVideoUrl(id, orig) {
      const inst = orig && orig.match(/https?:\/\/([^\/]+)/);
      return inst ? `https://${inst[1]}/w/${id}` : null;
    },
    getThumbnailUrl() { return null; }
  },

  wistia: {
    id:'wistia', name:'Wistia', icon:'◈', color:'#54BBFF',
    placeholder:'Paste Wistia URL… ({name}.wistia.com/medias/{id})',
    parseUrl(url) {
      const m = url.match(/(?:medias|iframe)\/([a-zA-Z0-9]+)/);
      if (m) return m[1];
      const m2 = url.match(/wistia\.(?:com|net)\/embed\/iframe\/([a-zA-Z0-9]+)/);
      return m2 ? m2[1] : null;
    },
    getEmbedUrl(id) { return `https://fast.wistia.net/embed/iframe/${id}`; },
    getVideoUrl(id, orig) {
      const d = orig && orig.match(/https?:\/\/([^\/]+)/);
      return d ? `https://${d[1]}/medias/${id}` : `https://fast.wistia.net/medias/${id}`;
    },
    getThumbnailUrl() { return null; },
    fetchMetadata(id, cb) {
      const url = `https://fast.wistia.com/oembed?url=https://fast.wistia.net/medias/${id}&format=json&callback=__wsCb`;
      window.__wsCb = d => { delete window.__wsCb; cb(null,d); };
      const s = document.createElement('script'); s.src = url;
      s.onerror = () => { delete window.__wsCb; cb(new Error('oEmbed failed'),null); s.remove(); };
      document.head.appendChild(s);
    }
  },

  abyss: {
    id:'abyss', name:'Abyss.to', icon:'⬡', color:'#8B5CF6',
    placeholder:'Paste Abyss.to URL… (abyss.to/video/…)',
    parseUrl(url) {
      const m = url.match(/abyss\.to\/(?:video\/|embed\/|)([a-zA-Z0-9-]+)/);
      return m ? m[1] : null;
    },
    getEmbedUrl(id) { return `https://abyss.to/embed/${id}`; },
    getVideoUrl(id) { return `https://abyss.to/video/${id}`; },
    getThumbnailUrl() { return null; }
  },

  googledrive: {
    id:'googledrive', name:'Google Drive', icon:'▣', color:'#4285F4',
    placeholder:'Paste Google Drive video URL… (drive.google.com/file/d/{id}/view)',
    parseUrl(url) {
      const m = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      return m ? m[1] : null;
    },
    getEmbedUrl(id) { return `https://drive.google.com/file/d/${id}/preview`; },
    getVideoUrl(id) { return `https://drive.google.com/file/d/${id}/view`; },
    getThumbnailUrl() { return null; }
  },

  screenpal: {
    id:'screenpal', name:'ScreenPal', icon:'●', color:'#00B4D8',
    placeholder:'Paste ScreenPal URL… (screenpal.com/watch/…)',
    parseUrl(url) {
      const m = url.match(/screenpal\.com\/(?:watch|embed)\/([a-zA-Z0-9]+)/);
      return m ? m[1] : null;
    },
    getEmbedUrl(id) { return `https://screenpal.com/embed/${id}`; },
    getVideoUrl(id) { return `https://screenpal.com/watch/${id}`; },
    getThumbnailUrl() { return null; }
  },

  dropbox: {
    id:'dropbox', name:'Dropbox', icon:'◆', color:'#0061FF',
    placeholder:'Paste Dropbox share URL… (dropbox.com/s/… or dropbox.com/scl/fi/…)',
    parseUrl(url) {
      const m = url.match(/dropbox\.com\/(?:s\/|scl\/fi\/)([a-zA-Z0-9_-]+)/);
      return m ? m[1] : null;
    },
    getEmbedUrl(id, orig) {
      if (orig && orig.includes('/scl/fi/')) {
        return orig.replace(/\?dl=0/,'?dl=0&embed=1').replace(/share$/,'preview');
      }
      return `https://www.dropbox.com/s/${id}/preview`;
    },
    getVideoUrl(id, orig) { return orig || `https://www.dropbox.com/s/${id}`; },
    getThumbnailUrl() { return null; }
  },

  onedrive: {
    id:'onedrive', name:'OneDrive', icon:'☁', color:'#0078D4',
    placeholder:'Paste OneDrive share URL… (onedrive.live.com/…)',
    parseUrl(url) {
      if (/onedrive\.live\.com/.test(url)) return url;
      return null;
    },
    getEmbedUrl(id) {
      let cid='', resid='', authkey='';
      const p = new URLSearchParams(id.split('?')[1]||'');
      if (p.get('resid')) resid = p.get('resid');
      if (p.get('authkey')) authkey = p.get('authkey');
      const cidMatch = id.match(/cid=([a-f0-9]+)/i) || id.match(/[?&]id=([^&]+)/);
      if (cidMatch) cid = cidMatch[1];
      if (resid && authkey) return `https://onedrive.live.com/embed?cid=${encodeURIComponent(cid)}&resid=${encodeURIComponent(resid)}&authkey=${encodeURIComponent(authkey)}`;
      if (id.includes('embed')) return id;
      const base = id.split('?')[0];
      return `${base}?embed=1`;
    },
    getVideoUrl(id) { return id; },
    getThumbnailUrl() { return null; }
  },

  iframe: {
    id:'iframe', name:'Embed Code', icon:'</>', color:'#888',
    placeholder:'Paste <iframe> embed code…',
    isIframe: true,
    parseUrl(code) {
      const m = code.match(/src=["']([^"']+)["']/);
      if (m) {
        const src = m[1].trim();
        if (src && /^https?:\/\//.test(src)) return src;
        return null;
      }
      const trimmed = code.trim();
      if (/^https?:\/\//.test(trimmed)) return trimmed;
      return null;
    },
    getEmbedUrl(src) { return src; },
    getVideoUrl(src) { return src; },
    getThumbnailUrl() { return null; }
  }
};

// ─── Initialization ────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  window.Components.injectAdminSidebar('upload');

  const selectedTags = [];
  setupTabs();
  renderPlatformSelector();
  setupPlatformInput();
  setupExistingTags(selectedTags);
  setupCustomTagCreator(selectedTags);
  setupThumbnailUpload();
  renderRecentHistory();
  setupFormSubmission(selectedTags);
});

// ─── Tabs ──────────────────────────────────────────────────────────────────

function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      const panel = document.getElementById('tab-panel-' + btn.dataset.tab);
      if (panel) panel.classList.add('active');
    });
  });
}

// ─── Platform Selector ─────────────────────────────────────────────────────

function renderPlatformSelector() {
  const container = document.getElementById('platform-selector');
  if (!container) return;

  container.innerHTML = Object.values(PLATFORMS).map(p => `
    <button type="button" class="platform-btn${p.id === currentPlatform ? ' active' : ''}" data-platform="${p.id}" style="--platform-color:${p.color}">
      <span class="platform-icon">${p.icon}</span>
      <span class="platform-name">${p.name}</span>
    </button>
  `).join('');

  container.addEventListener('click', e => {
    const btn = e.target.closest('.platform-btn');
    if (!btn) return;
    const pid = btn.dataset.platform;
    if (pid === currentPlatform) return;
    switchPlatform(pid);
  });
}

function switchPlatform(pid) {
  currentPlatform = pid;
  clearVideo();

  document.querySelectorAll('.platform-btn').forEach(b => b.classList.toggle('active', b.dataset.platform === pid));

  const plat = PLATFORMS[pid];
  const urlSection = document.getElementById('platform-url-section');
  const iframeSection = document.getElementById('platform-iframe-section');
  const input = document.getElementById('platform-url-input');

  if (plat.isIframe) {
    urlSection.style.display = 'none';
    iframeSection.classList.remove('hidden');
  } else {
    urlSection.style.display = '';
    iframeSection.classList.add('hidden');
    input.placeholder = plat.placeholder;
  }
}

// ─── Platform Input ────────────────────────────────────────────────────────

function setupPlatformInput() {
  const input = document.getElementById('platform-url-input');
  const loadBtn = document.getElementById('load-video-btn');
  const clearBtn = document.getElementById('clear-video-btn');
  const iframeInput = document.getElementById('iframe-code-input');
  const loadIframeBtn = document.getElementById('load-iframe-btn');

  loadBtn.addEventListener('click', () => loadVideo(currentPlatform, input.value));

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); loadVideo(currentPlatform, input.value); }
  });

  input.addEventListener('paste', () => {
    clearTimeout(window._pasteDebounce);
    window._pasteDebounce = setTimeout(() => loadVideo(currentPlatform, input.value), 800);
  });

  loadIframeBtn.addEventListener('click', () => loadVideo('iframe', iframeInput.value));

  iframeInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); loadVideo('iframe', iframeInput.value); }
  });

  clearBtn.addEventListener('click', clearVideo);

  // Initial placeholder
  input.placeholder = PLATFORMS[currentPlatform].placeholder;
}

// ─── Load Video ────────────────────────────────────────────────────────────

function loadVideo(platformId, rawInput) {
  const plat = PLATFORMS[platformId];
  if (!plat) return;

  const errorEl = document.getElementById('platform-error');
  const input = document.getElementById('platform-url-input');
  const clearBtn = document.getElementById('clear-video-btn');
  const submitBtn = document.getElementById('submit-btn');

  errorEl.textContent = '';
  input.classList.remove('has-error');

  if (!rawInput || !rawInput.trim()) {
    errorEl.textContent = 'Please enter a URL or embed code.';
    input.classList.add('has-error');
    return;
  }

  const parsed = plat.parseUrl(rawInput.trim());
  if (!parsed) {
    errorEl.textContent = `Could not extract a valid video ID from that ${plat.isIframe ? 'code' : 'URL'}.`;
    input.classList.add('has-error');
    return;
  }

  const embedUrl = plat.getEmbedUrl(parsed, rawInput.trim());
  if (!embedUrl) {
    errorEl.textContent = 'Could not generate an embed URL for that input.';
    input.classList.add('has-error');
    return;
  }

  // Duplicate prevention
  if (currentPlatform === platformId && currentVideoId === parsed && currentEmbedUrl === embedUrl) return;

  currentPlatform = platformId;
  currentVideoId = parsed;
  currentEmbedUrl = embedUrl;
  currentVideoUrl = plat.getVideoUrl(parsed, rawInput.trim()) || embedUrl;
  currentThumbnailUrl = plat.getThumbnailUrl ? plat.getThumbnailUrl(parsed) : null;
  currentMetadata = null;

  renderEmbed(embedUrl);
  clearBtn.classList.remove('hidden');
  submitBtn.disabled = false;

  // Auto-fill title fallback
  const titleInput = document.getElementById('title-input');
  if (platformId === 'iframe') {
    titleInput.value = `Embedded Content (${parsed.substring(0,60)})`;
  } else {
    titleInput.value = `${plat.name} Video (${parsed})`;
  }

  // Metadata display
  const metaEl = document.getElementById('video-metadata');
  const metaTitle = document.getElementById('meta-title');
  const metaChannel = document.getElementById('meta-channel');
  const metaThumb = document.getElementById('meta-thumbnail');
  metaEl.classList.add('hidden');

  // Auto-fill description
  const descriptionInput = document.getElementById('description-input');

  if (plat.fetchMetadata) {
    plat.fetchMetadata(parsed, (err, data) => {
      if (err || !data) return;
      currentMetadata = data;
      titleInput.value = data.title || titleInput.value;
      metaTitle.textContent = data.title || '';
      metaChannel.textContent = data.author_name || data.channel_name || '';
      if (data.thumbnail_url) {
        metaThumb.src = data.thumbnail_url;
        metaThumb.alt = data.title || 'Video thumbnail';
        autoSetThumbnail(data.thumbnail_url);
      }
      metaEl.classList.remove('hidden');
    });
  }

  if (plat.fetchDescription && !descriptionInput.value) {
    plat.fetchDescription(parsed, (err, desc) => {
      if (desc) descriptionInput.value = desc;
    });
  }

  // Auto-set thumbnail from platform template
  if (currentThumbnailUrl && !metaThumb.src) {
    autoSetThumbnail(currentThumbnailUrl);
  }

  // Save to history
  saveToHistory(platformId, parsed, embedUrl);
}

// ─── Embed Render ──────────────────────────────────────────────────────────

function renderEmbed(embedUrl) {
  const container = document.getElementById('embed-container');
  const player = document.getElementById('embed-player');
  const loader = document.getElementById('embed-loader');
  const fallback = document.getElementById('embed-fallback');

  container.classList.remove('hidden');
  fallback.classList.add('hidden');
  loader.classList.remove('hidden');
  player.innerHTML = '';

  if (window.location.protocol === 'file:') {
    loader.classList.add('hidden');
    fallback.classList.remove('hidden');
    fallback.innerHTML = `
      <p style="margin-bottom:8px;">⚠️ Embedded preview unavailable on local files.</p>
      <a href="${embedUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block; padding:8px 20px; background:var(--accent); color:#fff; border-radius:var(--radius-full); text-decoration:none; font-weight:600; font-size:var(--text-sm);">
        Open video directly ↗
      </a>
    `;
    return;
  }

  const iframe = document.createElement('iframe');
  iframe.src = embedUrl;
  iframe.title = 'Video player';
  iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
  iframe.allowFullscreen = true;
  iframe.style.border = '0';

  let loaded = false;
  iframe.addEventListener('load', () => {
    loaded = true;
    loader.classList.add('hidden');
  });

  setTimeout(() => {
    if (!loaded) {
      loader.classList.add('hidden');
      fallback.classList.remove('hidden');
    }
  }, 10000);

  player.appendChild(iframe);
}

function clearVideo() {
  currentVideoId = null;
  currentEmbedUrl = null;
  currentVideoUrl = null;
  currentThumbnailUrl = null;
  currentMetadata = null;

  const container = document.getElementById('embed-container');
  const player = document.getElementById('embed-player');
  const loader = document.getElementById('embed-loader');
  const fallback = document.getElementById('embed-fallback');
  const metadata = document.getElementById('video-metadata');
  const clearBtn = document.getElementById('clear-video-btn');
  const submitBtn = document.getElementById('submit-btn');
  const errorEl = document.getElementById('platform-error');
  const input = document.getElementById('platform-url-input');
  const iframeInput = document.getElementById('iframe-code-input');

  if (container) container.classList.add('hidden');
  if (player) player.innerHTML = '';
  if (loader) loader.classList.add('hidden');
  if (fallback) fallback.classList.add('hidden');
  if (metadata) metadata.classList.add('hidden');
  if (clearBtn) clearBtn.classList.add('hidden');
  if (submitBtn) submitBtn.disabled = true;
  if (errorEl) errorEl.textContent = '';
  if (input) { input.classList.remove('has-error'); input.value = ''; }
  if (iframeInput) iframeInput.value = '';
}

// ─── Recent History ────────────────────────────────────────────────────────

function getHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; } catch (_) { return []; }
}

function saveToHistory(platformId, parsed, embedUrl) {
  let history = getHistory();
  const plat = PLATFORMS[platformId];
  const title = currentMetadata && currentMetadata.title ? currentMetadata.title : (plat ? `${plat.name} (${parsed})` : parsed);
  const thumb = currentMetadata && currentMetadata.thumbnail_url ? currentMetadata.thumbnail_url : (plat && plat.getThumbnailUrl ? plat.getThumbnailUrl(parsed) : null);

  history = history.filter(h => !(h.platform === platformId && h.id === parsed));
  history.unshift({
    platform: platformId,
    id: parsed,
    title: title.substring(0, 80),
    thumbnail: thumb || ''
  });
  if (history.length > MAX_HISTORY) history = history.slice(0, MAX_HISTORY);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  renderRecentHistory();
}

function renderRecentHistory() {
  const container = document.getElementById('recent-history');
  const history = getHistory();
  if (history.length === 0) {
    container.classList.add('hidden');
    return;
  }
  container.classList.remove('hidden');
  container.innerHTML = `<span class="recent-history-label">Recently Loaded</span>` +
    history.map(h => `
      <span class="recent-history-chip" data-platform="${h.platform}" data-id="${h.id}">
        ${h.thumbnail ? `<img src="${h.thumbnail}" alt="" loading="lazy" onerror="this.style.display='none'">` : `<span class="chip-platform-icon">${(PLATFORMS[h.platform]||{}).icon||'▸'}</span>`}
        <span>${h.title}</span>
      </span>
    `).join('');

  container.querySelectorAll('.recent-history-chip').forEach(el => {
    el.addEventListener('click', () => {
      const pid = el.dataset.platform;
      const id = el.dataset.id;
      const plat = PLATFORMS[pid];
      if (!plat) return;

      switchPlatform(pid);
      if (plat.isIframe) {
        document.getElementById('iframe-code-input').value = plat.getEmbedUrl ? plat.getEmbedUrl(id) : id;
        loadVideo(pid, document.getElementById('iframe-code-input').value);
      } else {
        const input = document.getElementById('platform-url-input');
        input.value = plat.getVideoUrl ? plat.getVideoUrl(id) : id;
        loadVideo(pid, input.value);
      }
    });
  });
}

// ─── Thumbnail ─────────────────────────────────────────────────────────────

function autoSetThumbnail(url) {
  const preview = document.getElementById('thumbnail-preview');
  const placeholder = document.getElementById('thumbnail-placeholder');
  if (!preview || !placeholder) return;
  preview.src = url;
  preview.style.display = 'block';
  placeholder.style.display = 'none';
}

function setupThumbnailUpload() {
  const thumbInput = document.getElementById('thumbnail-file-input');
  const thumbBox = document.getElementById('thumbnail-box');
  const thumbPreview = document.getElementById('thumbnail-preview');
  const thumbPlaceholder = document.getElementById('thumbnail-placeholder');

  if (!thumbBox || !thumbInput) return;
  thumbBox.addEventListener('click', () => { thumbInput.click(); });

  thumbInput.addEventListener('change', () => {
    if (thumbInput.files.length > 0) {
      const file = thumbInput.files[0];
      const reader = new FileReader();
      reader.onload = function(e) {
        thumbPreview.src = e.target.result;
        thumbPreview.style.display = 'block';
        thumbPlaceholder.style.display = 'none';
      };
      reader.readAsDataURL(file);
    }
  });
}

// ─── Tag System ────────────────────────────────────────────────────────────

function getTagVideoCount(tagId) {
  const videos = window.App.getVideos();
  return videos.reduce((c, v) => c + ((v.tags || []).includes(tagId) ? 1 : 0), 0);
}

function renderExistingTags(selectedTags) {
  const container = document.getElementById('existing-tags-container');
  if (!container) return;
  const allTags = window.App.getTags();
  container.innerHTML = allTags.map(tag => {
    const isSelected = selectedTags.includes(tag.id);
    return `
      <button type="button" class="tag-checkable-pill ${isSelected ? 'selected' : ''}" data-tag-id="${tag.id}" style="display:inline-flex; align-items:center; gap:4px; padding:4px 12px; border-radius:9999px; font-size:var(--text-xs); font-weight:500; border:1px solid ${tag.color}; background-color:${isSelected ? tag.color : 'transparent'}; color:${isSelected ? '#fff' : 'inherit'}; cursor:pointer; transition:all var(--transition-fast);">
        <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background-color:${tag.color};"></span>
        ${tag.name}
        <span style="opacity:0.6; font-size:10px;">(${getTagVideoCount(tag.id)})</span>
      </button>
    `;
  }).join('');
}

function setupExistingTags(selectedTags) {
  const container = document.getElementById('existing-tags-container');
  if (!container) return;
  renderExistingTags(selectedTags);
  container.addEventListener('click', (e) => {
    const btn = e.target.closest('.tag-checkable-pill');
    if (!btn) return;
    const tagId = btn.dataset.tagId;
    const idx = selectedTags.indexOf(tagId);
    if (idx !== -1) {
      selectedTags.splice(idx, 1);
    } else {
      if (selectedTags.length >= 10) {
        window.App.showToast('Maximum 10 tags per video.', 'error');
        return;
      }
      selectedTags.push(tagId);
    }
    renderExistingTags(selectedTags);
    renderSelectedChips(selectedTags);
  });
}

function setupCustomTagCreator(selectedTags) {
  const input = document.getElementById('custom-tag-input');
  const addBtn = document.getElementById('add-custom-tag-btn');
  if (!input) return;

  const addCustomTag = () => {
    const name = input.value.trim();
    if (!name) return;
    if (selectedTags.length >= 10) {
      window.App.showToast('Maximum 10 tags per video.', 'error');
      return;
    }
    const allTags = window.App.getTags();
    const existingTag = allTags.find(t => t.name.toLowerCase() === name.toLowerCase());
    if (existingTag) {
      if (selectedTags.includes(existingTag.id)) {
        window.App.showToast('Tag already selected.', 'error');
        input.value = '';
        return;
      }
      selectedTags.push(existingTag.id);
    } else {
      const newId = 'tag-' + Date.now();
      const color = TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)];
      allTags.push({ id: newId, name, color, usageCount: 0 });
      window.App.saveTags(allTags);
      selectedTags.push(newId);
      renderExistingTags(selectedTags);
    }
    input.value = '';
    renderSelectedChips(selectedTags);
    window.App.showToast(`Tag "${name}" added.`);
  };

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addCustomTag(); }
  });
  if (addBtn) addBtn.addEventListener('click', addCustomTag);
}

function renderSelectedChips(selectedTags) {
  const display = document.getElementById('selected-tags-display');
  const countEl = document.getElementById('selected-tags-count');
  if (!display) return;
  if (countEl) countEl.innerText = selectedTags.length;
  if (selectedTags.length === 0) {
    display.innerHTML = '<span style="color:var(--text-muted); font-size:var(--text-sm);">No tags selected</span>';
    return;
  }
  const allTags = window.App.getTags();
  display.innerHTML = selectedTags.map(tagId => {
    const tag = allTags.find(t => t.id === tagId);
    if (!tag) return '';
    return `
      <span class="tag-chip" style="display:inline-flex; align-items:center; gap:4px; padding:4px 10px; border-radius:9999px; font-size:var(--text-xs); font-weight:500; background-color:${tag.color}20; border:1px solid ${tag.color};">
        <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background-color:${tag.color};"></span>
        ${tag.name}
        <span class="tag-chip-remove" data-tag-id="${tagId}" style="cursor:pointer; margin-left:2px; opacity:0.7; font-size:14px; line-height:1;">&times;</span>
      </span>
    `;
  }).join('');
  display.querySelectorAll('.tag-chip-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const tagId = btn.dataset.tagId;
      const idx = selectedTags.indexOf(tagId);
      if (idx !== -1) {
        selectedTags.splice(idx, 1);
        renderSelectedChips(selectedTags);
        renderExistingTags(selectedTags);
      }
    });
  });
}

// ─── Form Submission ───────────────────────────────────────────────────────

function setupFormSubmission(selectedTags) {
  const form = document.getElementById('upload-video-form');
  const submitBtn = document.getElementById('submit-btn');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    if (!currentVideoId || !currentEmbedUrl) {
      window.App.showToast('Please load a video first.', 'error');
      return;
    }

    if (!/^https?:\/\//.test(currentEmbedUrl)) {
      window.App.showToast('Invalid embed URL. Please reload the video.', 'error');
      return;
    }

    const title = document.getElementById('title-input').value.trim();
    const description = document.getElementById('description-input').value.trim();
    let duration = document.getElementById('duration-input').value.trim();
    if (!duration) duration = '5:00';
    const durValid = /^[0-9]+:[0-5]?[0-9]:[0-5][0-9]$|^[0-9]+:[0-5][0-9]$/.test(duration);
    if (!durValid) {
      window.App.showToast('Invalid duration format. Use mm:ss or hh:mm:ss.', 'error');
      return;
    }
    const publishToggle = document.getElementById('publish-toggle').checked;
    const thumbnailImg = document.getElementById('thumbnail-preview');

    if (!title) {
      window.App.showToast('Video title is required.', 'error');
      return;
    }

    if (selectedTags.length === 0) {
      window.App.showToast('Please select or create at least one tag.', 'error');
      return;
    }

    const plat = PLATFORMS[currentPlatform];
    const placeholderThumb = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 9%22%3E%3Crect width=%22100%25%22 height=%22100%25%22 fill=%22%231f1f1f%22/%3E%3Ctext x=%228%22 y=%225%22 text-anchor=%22middle%22 fill=%22%23666%22 font-size=%221%22%3ENo Thumbnail%3C/text%3E%3C/svg%3E';
    const thumbnailSrc = thumbnailImg.style.display === 'block'
      ? thumbnailImg.src
      : (currentThumbnailUrl || (plat && plat.getThumbnailUrl ? plat.getThumbnailUrl(currentVideoId) : null) || placeholderThumb);

    submitBtn.disabled = true;

    const dbVideos = window.App.getVideos();
    const nextId = 'vid-' + Date.now();

    const newVideoObj = {
      id: nextId,
      title,
      description,
      videoUrl: currentVideoUrl || currentEmbedUrl,
      embedUrl: currentEmbedUrl,
      thumbnail: thumbnailSrc,
      platform: currentPlatform,
      platformLabel: plat ? plat.name : currentPlatform,
      views: 0,
      likes: 0,
      tags: [...selectedTags],
      duration,
      publishDate: new Date().toISOString().split('T')[0],
      status: publishToggle ? 'published' : 'draft',
      creator: 'Administrator'
    };

    dbVideos.push(newVideoObj);
    window.App.saveVideos(dbVideos);

    window.App.showToast('Video published successfully!', 'success');

    setTimeout(() => {
      window.location.href = './videos.html';
    }, 1000);
  });
}
