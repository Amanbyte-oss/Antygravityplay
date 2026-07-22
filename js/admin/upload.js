// ============================================================
// Upload.js - Video upload/embed page
// Supports multiple platforms: YouTube, Vimeo, Dailymotion, etc.
// Handles URL parsing, oEmbed metadata fetching, embed rendering,
// tag selection, thumbnail management, form submission, and history.
// ============================================================

// Color palette for auto-generated tags (same as used in videos.js)
const TAG_COLORS = ['#0070f3','#7928ca','#ff0080','#ffa42b','#50e3c2','#539df5','#1db954','#f3727f','#e91e63','#ff5722','#9c27b0','#00bcd4','#ff9800','#4caf50','#f44336','#3f51b5'];
// localStorage key for storing recently loaded video history
const HISTORY_KEY = 'video-upload-history';
// Maximum number of history entries to keep
const MAX_HISTORY = 10;

// ─── Module-level state for the current video being prepared for upload ─────
let currentPlatform = 'youtube';           // Currently selected platform ID
let currentVideoId = null;                 // Parsed video ID from URL
let currentEmbedUrl = null;                // Generated embed URL for the <iframe>
let currentVideoUrl = null;                // Direct video page URL
let currentThumbnailUrl = null;            // Auto-detected thumbnail URL from platform
let currentMetadata = null;                // Fetched oEmbed metadata object

// ─── JSONP Helper with timeout ──────────────────────────────────────────────
/**
 * Performs a JSONP request by dynamically creating a <script> tag.
 * The server responds with a function call to the provided callback name.
 * Includes a 5-second timeout and error handling for script load failures.
 * @param {string}   url          - The oEmbed API URL (without callback param)
 * @param {string}   callbackName - Global function name to use as JSONP callback
 * @param {Function} cb           - Node-style callback: cb(err, data)
 */
function jsonp(url, callbackName, cb) {
  // Set a 5-second timeout to abort the request
  const timeout = setTimeout(() => {
    delete window[callbackName];   // Clean up the global callback function
    cb(new Error('Request timed out'), null);  // Call back with error
  }, 5000);

  // Define the global callback function that the JSONP response will invoke
  window[callbackName] = (data) => {
    clearTimeout(timeout);                // Cancel the timeout
    setTimeout(() => delete window[callbackName], 100);  // Delay cleanup to ensure callback fires
    cb(null, data);  // Call back with the data (no error)
  };

  // Create a <script> element and set its src to the JSONP URL with callback parameter
  const s = document.createElement('script');
  s.src = url + (url.includes('?') ? '&' : '?') + 'callback=' + callbackName;
  // Handle script load failure (network error)
  s.onerror = () => {
    clearTimeout(timeout);
    delete window[callbackName];
    cb(new Error('oEmbed failed'), null);
    s.remove();  // Remove the <script> tag from the DOM
  };
  document.head.appendChild(s);  // Inject the script to initiate the request
}

// ============================================================
// Platform Definitions
// Each platform object encapsulates: identification, URL parsing
// regex, embed/video/thumbnail URL generation, and oEmbed metadata fetching.
// ============================================================

const PLATFORMS = {
  // -------- YouTube --------
  youtube: {
    id:'youtube', name:'YouTube', icon:'▶', color:'#FF0000',
    placeholder:'Paste YouTube URL… (youtube.com/watch?v=… or youtu.be/…)',
    /** Parse a YouTube URL to extract the 11-character video ID */
    parseUrl(url) {
      const patterns = [
        /(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtube\.com\/shorts\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
        /(?:^|[?&])v=([a-zA-Z0-9_-]{11})/
      ];
      // Try each regex pattern until one matches
      for (const re of patterns) { const m = url.match(re); if (m && m[1].length===11) return m[1]; }
      // Also accept a bare 11-char ID (no dots)
      if (/^[a-zA-Z0-9_-]{11}$/.test(url) && !url.includes('.')) return url;
      return null;
    },
    getEmbedUrl(id) { return `https://www.youtube.com/embed/${id}`; },
    getVideoUrl(id) { return `https://www.youtube.com/watch?v=${id}`; },
    getThumbnailUrl(id) { return `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`; },
    /** Fetch video metadata via YouTube oEmbed API using JSONP */
    fetchMetadata(id, cb) {
      jsonp(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`, '__ytCb', (err, d) => {
        cb(err, d);
      });
    },
    /** Fetch video description via noembed.com proxy */
    fetchDescription(id, cb) {
      jsonp(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${id}`, '__ndCb', (err, d) => {
        cb(err, (d && d.description) || '');
      });
    }
  },

  // -------- Vimeo --------
  vimeo: {
    id:'vimeo', name:'Vimeo', icon:'▽', color:'#1AB7EA',
    placeholder:'Paste Vimeo URL… (vimeo.com/123456)',
    /** Parse Vimeo URL to extract the numeric video ID */
    parseUrl(url) {
      const m = url.match(/(?:vimeo\.com|player\.vimeo\.com)\/(?:channels\/[^/]+\/|video\/|)(\d+)/);
      return m ? m[1] : null;
    },
    getEmbedUrl(id) { return `https://player.vimeo.com/video/${id}`; },
    getVideoUrl(id) { return `https://vimeo.com/${id}`; },
    getThumbnailUrl() { return null; },  // Vimeo oEmbed provides thumbnail_url directly
    /** Fetch metadata via Vimeo oEmbed API */
    fetchMetadata(id, cb) {
      jsonp(`https://vimeo.com/api/oembed.json?url=https://vimeo.com/${id}`, '__vmCb', (err, d) => {
        cb(err, d);
      });
    }
  },

  // -------- Dailymotion --------
  dailymotion: {
    id:'dailymotion', name:'Dailymotion', icon:'◆', color:'#0066DC',
    placeholder:'Paste Dailymotion URL… (dailymotion.com/video/…)',
    /** Parse Dailymotion URL to extract the alphanumeric video ID */
    parseUrl(url) {
      const m = url.match(/(?:dailymotion\.com\/(?:embed\/)?video\/|dai\.ly\/)([a-zA-Z0-9]+)/);
      return m ? m[1] : null;
    },
    getEmbedUrl(id) { return `https://www.dailymotion.com/embed/video/${id}`; },
    getVideoUrl(id) { return `https://www.dailymotion.com/video/${id}`; },
    getThumbnailUrl(id) { return `https://www.dailymotion.com/thumbnail/video/${id}`; },
    /** Fetch metadata via Dailymotion oEmbed API */
    fetchMetadata(id, cb) {
      jsonp(`https://www.dailymotion.com/services/oembed?url=https://www.dailymotion.com/video/${id}&format=json`, '__dmCb', (err, d) => {
        cb(err, d);
      });
    }
  },

  // -------- Streamable --------
  streamable: {
    id:'streamable', name:'Streamable', icon:'▶', color:'#0F90FA',
    placeholder:'Paste Streamable URL… (streamable.com/…)',
    /** Parse Streamable URL to extract the video ID */
    parseUrl(url) {
      const m = url.match(/streamable\.com\/(?:e\/)?([a-zA-Z0-9]+)/);
      return m ? m[1] : null;
    },
    getEmbedUrl(id) { return `https://streamable.com/e/${id}`; },
    getVideoUrl(id) { return `https://streamable.com/${id}`; },
    getThumbnailUrl() { return null; },
    /** Fetch metadata via Streamable oEmbed API */
    fetchMetadata(id, cb) {
      jsonp(`https://api.streamable.com/oembed.json?url=https://streamable.com/${id}`, '__stCb', (err, d) => {
        cb(err, d);
      });
    }
  },

  // -------- Cloudflare Stream --------
  cloudflare: {
    id:'cloudflare', name:'Cloudflare Stream', icon:'◎', color:'#F38020',
    placeholder:'Paste Cloudflare Stream URL…',
    /** Parse Cloudflare Stream URL; supports both watch and iframe paths */
    parseUrl(url) {
      const m = url.match(/(?:watch\.cloudflarestream\.com|cloudflarestream\.com)\/(?:iframe\/|)([a-zA-Z0-9]+)/);
      return m ? m[1] : null;
    },
    /** Generate embed URL; supports custom customer subdomain */
    getEmbedUrl(id, orig) {
      const c = orig && orig.match(/customer-([^.]+)\.cloudflarestream\.com/);
      return c ? `https://customer-${c[1]}.cloudflarestream.com/${id}/iframe` : `https://watch.cloudflarestream.com/${id}`;
    },
    /** Generate video URL; detects customer subdomain */
    getVideoUrl(id, orig) {
      const c = orig && orig.match(/customer-([^.]+)\.cloudflarestream\.com/);
      return c ? `https://customer-${c[1]}.cloudflarestream.com/${id}` : `https://watch.cloudflarestream.com/${id}`;
    },
    getThumbnailUrl() { return null; }
  },

  // -------- PeerTube --------
  peertube: {
    id:'peertube', name:'PeerTube', icon:'◉', color:'#F1680D',
    placeholder:'Paste PeerTube URL… ({instance}/w/{id})',
    /** Parse PeerTube URL; supports /w/{id} and /videos/watch|embed/{id} patterns */
    parseUrl(url) {
      const m = url.match(/\/w\/([a-zA-Z0-9-]+)/);
      if (m) return m[1];
      const m2 = url.match(/\/videos\/(?:watch|embed)\/([a-zA-Z0-9-]+)/);
      return m2 ? m2[1] : null;
    },
    /** Generate embed URL; extracts instance hostname from original URL */
    getEmbedUrl(id, orig) {
      const inst = orig && orig.match(/https?:\/\/([^\/]+)/);
      return inst ? `https://${inst[1]}/videos/embed/${id}` : null;
    },
    /** Generate video URL; extracts instance hostname from original URL */
    getVideoUrl(id, orig) {
      const inst = orig && orig.match(/https?:\/\/([^\/]+)/);
      return inst ? `https://${inst[1]}/w/${id}` : null;
    },
    getThumbnailUrl() { return null; }
  },

  // -------- Wistia --------
  wistia: {
    id:'wistia', name:'Wistia', icon:'◈', color:'#54BBFF',
    placeholder:'Paste Wistia URL… ({name}.wistia.com/medias/{id})',
    /** Parse Wistia URL; supports /medias/{id} and wistia.net/embed/iframe/{id} */
    parseUrl(url) {
      const m = url.match(/(?:medias|iframe)\/([a-zA-Z0-9]+)/);
      if (m) return m[1];
      const m2 = url.match(/wistia\.(?:com|net)\/embed\/iframe\/([a-zA-Z0-9]+)/);
      return m2 ? m2[1] : null;
    },
    getEmbedUrl(id) { return `https://fast.wistia.net/embed/iframe/${id}`; },
    /** Generate video URL; detects subdomain from original URL */
    getVideoUrl(id, orig) {
      const d = orig && orig.match(/https?:\/\/([^\/]+)/);
      return d ? `https://${d[1]}/medias/${id}` : `https://fast.wistia.net/medias/${id}`;
    },
    getThumbnailUrl() { return null; },
    /** Fetch metadata via Wistia oEmbed (uses direct JSONP since their API differs slightly) */
    fetchMetadata(id, cb) {
      const url = `https://fast.wistia.com/oembed?url=https://fast.wistia.net/medias/${id}&format=json&callback=__wsCb`;
      window.__wsCb = d => { delete window.__wsCb; cb(null,d); };
      const s = document.createElement('script'); s.src = url;
      s.onerror = () => { delete window.__wsCb; cb(new Error('oEmbed failed'),null); s.remove(); };
      document.head.appendChild(s);
    }
  },

  // -------- Abyss.to --------
  abyss: {
    id:'abyss', name:'Abyss.to', icon:'⬡', color:'#8B5CF6',
    placeholder:'Paste Abyss.to URL… (abyss.to/video/…)',
    /** Parse Abyss.to URL */
    parseUrl(url) {
      const m = url.match(/abyss\.to\/(?:video\/|embed\/|)([a-zA-Z0-9-]+)/);
      return m ? m[1] : null;
    },
    getEmbedUrl(id) { return `https://abyss.to/embed/${id}`; },
    getVideoUrl(id) { return `https://abyss.to/video/${id}`; },
    getThumbnailUrl() { return null; }
  },

  // -------- Pornhub --------
  pornhub: {
    id:'pornhub', name:'Pornhub', icon:'🔥', color:'#FF9900',
    placeholder:'Paste Pornhub URL… (pornhub.com/view_video.php?viewkey=…)',
    parseUrl(url) {
      const m = url.match(/pornhub\.com\/(?:view_video\.php\?viewkey=|embed\/|video\/)([a-zA-Z0-9]+)/);
      if (m) return m[1];
      const m2 = url.match(/[?&]viewkey=([a-zA-Z0-9]+)/);
      return m2 ? m2[1] : null;
    },
    getEmbedUrl(id) { return `https://www.pornhub.com/embed/${id}`; },
    getVideoUrl(id) { return `https://www.pornhub.com/view_video.php?viewkey=${id}`; },
    getThumbnailUrl() { return null; },
    fetchMetadata(id, cb) {
      const url = `https://www.pornhub.com/embed/${id}`;
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = url;
      iframe.onload = function() {
        try {
          const doc = iframe.contentDocument || iframe.contentWindow.document;
          const titleEl = doc.querySelector('meta[property="og:title"]') || doc.querySelector('title');
          const thumbEl = doc.querySelector('meta[property="og:image"]');
          const descEl = doc.querySelector('meta[property="og:description"]');
          cb(null, {
            title: titleEl ? titleEl.getAttribute('content') || titleEl.textContent : '',
            thumbnail_url: thumbEl ? thumbEl.getAttribute('content') : '',
            author_name: 'Pornhub',
            description: descEl ? descEl.getAttribute('content') : ''
          });
        } catch(e) {
          cb(null, { title: '', thumbnail_url: '', author_name: 'Pornhub', description: '' });
        }
        iframe.remove();
      };
      iframe.onerror = function() {
        cb(null, { title: '', thumbnail_url: '', author_name: 'Pornhub', description: '' });
        iframe.remove();
      };
      document.body.appendChild(iframe);
      setTimeout(function() {
        if (iframe.parentNode) {
          iframe.remove();
          cb(null, { title: '', thumbnail_url: '', author_name: 'Pornhub', description: '' });
        }
      }, 5000);
    }
  },

  // -------- Google Drive --------
  googledrive: {
    id:'googledrive', name:'Google Drive', icon:'▣', color:'#4285F4',
    placeholder:'Paste Google Drive video URL… (drive.google.com/file/d/{id}/view)',
    /** Parse Google Drive URL to extract the file ID */
    parseUrl(url) {
      const m = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      return m ? m[1] : null;
    },
    /** Google Drive embed uses /preview instead of /view */
    getEmbedUrl(id) { return `https://drive.google.com/file/d/${id}/preview`; },
    getVideoUrl(id) { return `https://drive.google.com/file/d/${id}/view`; },
    getThumbnailUrl() { return null; }
  },

  // -------- ScreenPal --------
  screenpal: {
    id:'screenpal', name:'ScreenPal', icon:'●', color:'#00B4D8',
    placeholder:'Paste ScreenPal URL… (screenpal.com/watch/…)',
    /** Parse ScreenPal URL */
    parseUrl(url) {
      const m = url.match(/screenpal\.com\/(?:watch|embed)\/([a-zA-Z0-9]+)/);
      return m ? m[1] : null;
    },
    getEmbedUrl(id) { return `https://screenpal.com/embed/${id}`; },
    getVideoUrl(id) { return `https://screenpal.com/watch/${id}`; },
    getThumbnailUrl() { return null; }
  },

  // -------- Dropbox --------
  dropbox: {
    id:'dropbox', name:'Dropbox', icon:'◆', color:'#0061FF',
    placeholder:'Paste Dropbox share URL… (dropbox.com/s/… or dropbox.com/scl/fi/…)',
    /** Parse Dropbox share URL; supports both /s/ and /scl/fi/ patterns */
    parseUrl(url) {
      const m = url.match(/dropbox\.com\/(?:s\/|scl\/fi\/)([a-zA-Z0-9_-]+)/);
      return m ? m[1] : null;
    },
    /** Generate embed URL; handles shortlink and new share link formats */
    getEmbedUrl(id, orig) {
      if (orig && orig.includes('/scl/fi/')) {
        return orig.replace(/\?dl=0/,'?dl=0&embed=1').replace(/share$/,'preview');
      }
      return `https://www.dropbox.com/s/${id}/preview`;
    },
    getVideoUrl(id, orig) { return orig || `https://www.dropbox.com/s/${id}`; },
    getThumbnailUrl() { return null; }
  },

  // -------- OneDrive --------
  onedrive: {
    id:'onedrive', name:'OneDrive', icon:'☁', color:'#0078D4',
    placeholder:'Paste OneDrive share URL… (onedrive.live.com/…)',
    /** Parse OneDrive URL; validates domain, returns the full URL as the "ID" */
    parseUrl(url) {
      if (/onedrive\.live\.com/.test(url)) return url;
      return null;
    },
    /** Generate embed URL by extracting resid, authkey, and cid from query params */
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

  // -------- Generic Embed Code (iframe) --------
  iframe: {
    id:'iframe', name:'Embed Code', icon:'</>', color:'#888',
    placeholder:'Paste <iframe> embed code…',
    isIframe: true,  // Flag to switch the UI to iframe textarea mode
    /** Parse iframe HTML or direct URL to extract the src attribute */
    parseUrl(code) {
      // Try to extract src from <iframe> tag
      const m = code.match(/src=["']([^"']+)["']/);
      if (m) {
        const src = m[1].trim();
        if (src && /^https?:\/\//.test(src)) return src;
        return null;
      }
      // If no iframe tag, check if the input itself is a URL
      const trimmed = code.trim();
      if (/^https?:\/\//.test(trimmed)) return trimmed;
      return null;
    },
    getEmbedUrl(src) { return src; },
    getVideoUrl(src) { return src; },
    getThumbnailUrl() { return null; }
  }
};

// ============================================================
// Initialization - runs when DOM is fully loaded
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  // Inject the admin sidebar, highlighting "upload" as active
  window.Components.injectAdminSidebar('upload');

  // Set up tab switching (e.g., "Upload", "Details", "Tags")
  setupTabs();
  // Render the platform selector buttons (YouTube, Vimeo, etc.)
  renderPlatformSelector();
  // Set up the URL input, load/clear buttons, and paste detection
  setupPlatformInput();
  // Set up the thumbnail file upload box
  setupThumbnailUpload();
  // Render the recently loaded videos history bar
  renderRecentHistory();
  // Set up the chip-based tag input
  initTagChips();
  // Set up the final form submission handler
  setupFormSubmission();
});

// ============================================================
// Tabs - switches between upload form panels
// ============================================================

function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      // Deactivate all tabs and panels
      document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      // Activate the panel corresponding to the clicked tab's data-tab attribute
      const panel = document.getElementById('tab-panel-' + btn.dataset.tab);
      if (panel) panel.classList.add('active');
    });
  });
}

// ============================================================
// Platform Selector - renders buttons for each supported video platform
// ============================================================

function renderPlatformSelector() {
  const container = document.getElementById('platform-selector');
  if (!container) return;

  // Generate a button for each platform definition
  container.innerHTML = Object.values(PLATFORMS).map(p => `
    <button type="button" class="platform-btn${p.id === currentPlatform ? ' active' : ''}" data-platform="${p.id}" style="--platform-color:${p.color}">
      <span class="platform-icon">${p.icon}</span>
      <span class="platform-name">${p.name}</span>
    </button>
  `).join('');

  // Attach a delegated click listener to handle platform switching
  container.addEventListener('click', e => {
    const btn = e.target.closest('.platform-btn');
    if (!btn) return;  // Click was not on a platform button
    const pid = btn.dataset.platform;
    if (pid === currentPlatform) return;  // Already on this platform
    switchPlatform(pid);  // Switch to the clicked platform
  });
}

// ============================================================
// Switch to a different platform (update UI, reset current video state)
// ============================================================

function switchPlatform(pid) {
  currentPlatform = pid;   // Update the current platform
  clearVideo();             // Clear any loaded video state

  // Toggle the 'active' class on platform buttons
  document.querySelectorAll('.platform-btn').forEach(b => b.classList.toggle('active', b.dataset.platform === pid));

  const plat = PLATFORMS[pid];
  const urlSection = document.getElementById('platform-url-section');
  const input = document.getElementById('platform-url-input');

  // Hide the URL section for "Embed Code" platform; show for all others
  if (plat.isIframe) {
    if (urlSection) urlSection.style.display = 'none';
  } else {
    if (urlSection) urlSection.style.display = '';
    if (input) input.placeholder = plat.placeholder;
  }
}

// ============================================================
// Platform Input - set up URL input, iframe input, load/clear buttons
// ============================================================

function setupPlatformInput() {
  // Get references to all the DOM elements
  const input = document.getElementById('platform-url-input');      // URL input for standard platforms
  const loadBtn = document.getElementById('load-video-btn');         // "Load" button for URL
  const clearBtn = document.getElementById('clear-video-btn');       // "Clear" button
  const iframeInput = document.getElementById('iframe-code-input'); // Textarea for iframe embed code
  const loadIframeBtn = document.getElementById('load-iframe-btn');  // "Load" button for iframe

  if (!input || !loadBtn) return;

  // Clicking the "Load Video" button triggers loadVideo with the current platform and URL value
  loadBtn.addEventListener('click', () => loadVideo(currentPlatform, input.value));

  // Pressing Enter in the URL input also triggers loading
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); loadVideo(currentPlatform, input.value); }
  });

  // Debounced paste detection: when user pastes a URL, auto-load after 800ms of inactivity
  input.addEventListener('paste', () => {
    clearTimeout(window._pasteDebounce);
    window._pasteDebounce = setTimeout(() => loadVideo(currentPlatform, input.value), 800);
  });

  // Load iframe embed code when the iframe load button is clicked
  if (loadIframeBtn && iframeInput) loadIframeBtn.addEventListener('click', () => loadVideo('iframe', iframeInput.value));

  // Ctrl+Enter in the iframe textarea also triggers loading
  if (iframeInput) iframeInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); loadVideo('iframe', iframeInput.value); }
  });

  // Clear button resets the current video state
  if (clearBtn) clearBtn.addEventListener('click', clearVideo);

  // Set the initial placeholder text for the URL input based on the default platform
  input.placeholder = PLATFORMS[currentPlatform].placeholder;
}

// ============================================================
// Load Video - parse URL/embed code, fetch metadata, render preview
// ============================================================
/**
 * Main function to process a video URL or embed code for a given platform.
 * Validates input, parses the ID, generates embed/video URLs, fetches metadata
 * via oEmbed, auto-fills form fields, and renders the embedded preview.
 * @param {string} platformId - The platform identifier (e.g., "youtube", "vimeo")
 * @param {string} rawInput   - The raw URL or embed code entered by the user
 */
function loadVideo(platformId, rawInput) {
  // Look up the platform definition object
  const plat = PLATFORMS[platformId];
  if (!plat) return;  // Unknown platform, do nothing

  // DOM element references for error, input, buttons
  const errorEl = document.getElementById('platform-error');
  const input = document.getElementById('platform-url-input');
  const clearBtn = document.getElementById('clear-video-btn');
  const submitBtn = document.getElementById('submit-btn');

  if (!errorEl || !input) return;

  // Clear any previous error state
  errorEl.textContent = '';
  input.classList.remove('has-error');

  // Validate: input must be non-empty after trimming
  if (!rawInput || !rawInput.trim()) {
    errorEl.textContent = 'Please enter a URL or embed code.';
    input.classList.add('has-error');
    return;
  }

  // Step 1: Parse the URL/code to extract the video ID using the platform's parseUrl function
  const parsed = plat.parseUrl(rawInput.trim());
  if (!parsed) {
    errorEl.textContent = `Could not extract a valid video ID from that ${plat.isIframe ? 'code' : 'URL'}.`;
    input.classList.add('has-error');
    return;
  }

  // Step 2: Generate the embed URL from the parsed ID
  const embedUrl = plat.getEmbedUrl(parsed, rawInput.trim());
  if (!embedUrl) {
    errorEl.textContent = 'Could not generate an embed URL for that input.';
    input.classList.add('has-error');
    return;
  }

  // Step 3: Duplicate prevention - if same platform, same ID, same embed URL, do nothing
  if (currentPlatform === platformId && currentVideoId === parsed && currentEmbedUrl === embedUrl) return;

  // Step 4: Update all module-level state variables with the new video info
  currentPlatform = platformId;
  // Highlight the active platform button (important when loading via iframe textarea)
  document.querySelectorAll('.platform-btn').forEach(function(b) {
    b.classList.toggle('active', b.dataset.platform === platformId);
  });
  // Show/hide URL section based on platform type
  var urlSec = document.getElementById('platform-url-section');
  if (urlSec) urlSec.style.display = plat.isIframe ? 'none' : '';
  currentVideoId = parsed;
  currentEmbedUrl = embedUrl;
  currentVideoUrl = plat.getVideoUrl(parsed, rawInput.trim()) || embedUrl;
  currentThumbnailUrl = plat.getThumbnailUrl ? plat.getThumbnailUrl(parsed) : null;
  currentMetadata = null;  // Will be populated by oEmbed if available

  // Step 5: Render the embed preview (iframe or fallback for file:// protocol)
  renderEmbed(embedUrl);
  // Show the clear button and enable the submit button
  if (clearBtn) clearBtn.classList.remove('hidden');
  if (submitBtn) submitBtn.disabled = false;

  // Step 6: Auto-fill the title input with a fallback name
  const titleInput = document.getElementById('title-input');
  if (titleInput) {
    if (platformId === 'iframe') {
      titleInput.value = `Embedded Content (${parsed.substring(0,60)})`;
    } else {
      titleInput.value = `${plat.name} Video (${parsed})`;
    }
  }

  // Step 7: Fetch and display metadata via oEmbed (if the platform supports it)
  const metaEl = document.getElementById('video-metadata');
  const metaTitle = document.getElementById('meta-title');
  const metaChannel = document.getElementById('meta-channel');
  const metaThumb = document.getElementById('meta-thumbnail');
  if (metaEl) metaEl.classList.add('hidden');  // Hide metadata panel until data loads

  // Auto-fill description
  const descriptionInput = document.getElementById('description-input');

  // If the platform has a fetchMetadata method, call it
  if (plat.fetchMetadata) {
    plat.fetchMetadata(parsed, (err, data) => {
      if (err || !data) return;  // Silently fail if metadata fetch fails
      currentMetadata = data;    // Store metadata for later use (e.g., saving to history)
      // Override the title with the fetched title if available
      titleInput.value = data.title || titleInput.value;
      metaTitle.textContent = data.title || '';
      metaChannel.textContent = data.author_name || data.channel_name || '';
      // If oEmbed returns a thumbnail URL, use it
      if (data.thumbnail_url) {
        metaThumb.src = data.thumbnail_url;
        metaThumb.alt = data.title || 'Video thumbnail';
        autoSetThumbnail(data.thumbnail_url);  // Set the thumbnail preview
      }
      metaEl.classList.remove('hidden');  // Show the metadata panel
    });
  }

  // If the platform has a fetchDescription method and description is empty, fetch it
  if (plat.fetchDescription && !descriptionInput.value) {
    plat.fetchDescription(parsed, (err, desc) => {
      if (desc) descriptionInput.value = desc;
    });
  }

  // Step 8: If a thumbnail URL template exists for this platform and hasn't been set via oEmbed, use it
  if (currentThumbnailUrl && !metaThumb.src) {
    autoSetThumbnail(currentThumbnailUrl);
  }

  // Step 9: Save this load to the recent history (localStorage)
  saveToHistory(platformId, parsed, embedUrl);
}

// ============================================================
// Embed Render - creates the <iframe> video preview or fallback
// ============================================================
/**
 * Injects an iframe with the given embed URL into the player container.
 * Shows a loading indicator and a fallback link if the iframe fails to load
 * within 10 seconds. Also handles the file:// protocol limitation.
 * @param {string} embedUrl - The embed URL to display in the iframe
 */
function renderEmbed(embedUrl) {
  var esc = function(s) { return String(s||'').replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c; }); };
  // DOM element references
  const container = document.getElementById('embed-container');
  const player = document.getElementById('embed-player');
  const loader = document.getElementById('embed-loader');
  const fallback = document.getElementById('embed-fallback');

  if (!container || !player || !loader || !fallback) return;

  // Show the embed container and loading spinner, hide fallback, clear previous player
  container.classList.remove('hidden');
  fallback.classList.add('hidden');
  loader.classList.remove('hidden');
  player.innerHTML = '';

  // If the page is opened via file:// protocol, iframes won't work due to CORS
  // Show a direct link fallback instead
  if (window.location.protocol === 'file:') {
    loader.classList.add('hidden');
    fallback.classList.remove('hidden');
    fallback.innerHTML = `
      <p style="margin-bottom:8px;">⚠️ Embedded preview unavailable on local files.</p>
      <a href="${esc(embedUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block; padding:8px 20px; background:var(--accent); color:#fff; border-radius:var(--radius-full); text-decoration:none; font-weight:600; font-size:var(--text-sm);">
        Open video directly ↗
      </a>
    `;
    return;
  }

  // Create the iframe element with the embed URL and standard player attributes
  const iframe = document.createElement('iframe');
  iframe.src = embedUrl;
  iframe.title = 'Video player';
  iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
  iframe.allowFullscreen = true;
  iframe.style.border = '0';

  // Track whether the iframe has successfully loaded
  let loaded = false;
  iframe.addEventListener('load', () => {
    loaded = true;
    loader.classList.add('hidden');  // Hide the loading spinner
  });

  // Fallback: if iframe doesn't load within 10 seconds, show a direct link fallback
  setTimeout(() => {
    if (!loaded) {
      loader.classList.add('hidden');
      fallback.classList.remove('hidden');
    }
  }, 10000);

  // Append the iframe to the player container
  player.appendChild(iframe);
}

// ============================================================
// Clear Video - reset all current video state and UI
// ============================================================
/**
 * Resets all module-level video state variables, hides the embed preview,
 * clears form inputs, and disables the submit button.
 */
function clearVideo() {
  // Reset all state variables to null
  currentVideoId = null;
  currentEmbedUrl = null;
  currentVideoUrl = null;
  currentThumbnailUrl = null;
  currentMetadata = null;

  // Get references to all UI elements that need to be reset
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

  // Hide/show/clear elements as needed
  if (container) container.classList.add('hidden');  // Hide the entire embed section
  if (player) player.innerHTML = '';                  // Remove any iframe
  if (loader) loader.classList.add('hidden');         // Hide loading spinner
  if (fallback) fallback.classList.add('hidden');     // Hide fallback link
  if (metadata) metadata.classList.add('hidden');     // Hide oEmbed metadata panel
  if (clearBtn) clearBtn.classList.add('hidden');     // Hide the clear button
  if (submitBtn) submitBtn.disabled = true;            // Disable submit until video is loaded
  if (errorEl) errorEl.textContent = '';               // Clear any error message
  if (input) { input.classList.remove('has-error'); input.value = ''; }  // Clear URL input
  if (iframeInput) iframeInput.value = '';             // Clear iframe code textarea

  // Reset thumbnail URL input
  var thumbUrlInput = document.getElementById('thumbnail-url-input');
  if (thumbUrlInput) thumbUrlInput.value = '';
}

// ============================================================
// Recent History - persists recently loaded videos to localStorage
// ============================================================

/**
 * Retrieves the video upload history array from localStorage.
 * Returns an empty array if parsing fails or no data exists.
 * @returns {Array} Array of history entry objects
 */
function getHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; } catch (_) { return []; }
}

/**
 * Adds a new entry to the upload history (deduplicated, max MAX_HISTORY items),
 * saves to localStorage, and re-renders the history chips.
 * @param {string} platformId - Platform identifier
 * @param {string} parsed     - Parsed video ID
 * @param {string} embedUrl   - Generated embed URL
 */
function saveToHistory(platformId, parsed, embedUrl) {
  let history = getHistory();
  const plat = PLATFORMS[platformId];
  // Determine the display title: prefer metadata title, else fallback to platform name + ID
  const title = currentMetadata && currentMetadata.title ? currentMetadata.title : (plat ? `${plat.name} (${parsed})` : parsed);
  // Determine thumbnail: prefer oEmbed thumbnail, else platform template URL
  const thumb = currentMetadata && currentMetadata.thumbnail_url ? currentMetadata.thumbnail_url : (plat && plat.getThumbnailUrl ? plat.getThumbnailUrl(parsed) : null);

  // Remove any existing entry with same platform + ID (dedup)
  history = history.filter(h => !(h.platform === platformId && h.id === parsed));
  // Add new entry at the beginning (most recent first)
  history.unshift({
    platform: platformId,
    id: parsed,
    title: title.substring(0, 80),   // Truncate long titles
    thumbnail: thumb || ''
  });
  // Enforce the maximum history length
  if (history.length > MAX_HISTORY) history = history.slice(0, MAX_HISTORY);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  renderRecentHistory();  // Update the UI
}

/**
 * Renders the recent history bar with clickable chips.
 * Each chip shows a thumbnail (or platform icon fallback) and title.
 * Clicking a chip switches to that platform and loads the video.
 */
function renderRecentHistory() {
  var esc = function(s) { return String(s||'').replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c; }); };
  const container = document.getElementById('recent-history');
  const history = getHistory();
  // If no history, hide the container
  if (!container) return;
  if (history.length === 0) {
    container.classList.add('hidden');
    return;
  }
  // Show the container and generate HTML for each history entry
  container.classList.remove('hidden');
  container.innerHTML = `<span class="recent-history-label">Recently Loaded</span>` +
    history.map(h => `
      <span class="recent-history-chip" data-platform="${esc(h.platform)}" data-id="${esc(h.id)}">
        <!-- Show thumbnail image if available, otherwise show a platform icon -->
        ${h.thumbnail ? `<img src="${esc(h.thumbnail)}" alt="" loading="lazy" onerror="this.style.display='none'">` : `<span class="chip-platform-icon">${(PLATFORMS[h.platform]||{}).icon||'▸'}</span>`}
        <span>${esc(h.title)}</span>
      </span>
    `).join('');

  // Attach click handler to each history chip
  container.querySelectorAll('.recent-history-chip').forEach(el => {
    el.addEventListener('click', () => {
      const pid = el.dataset.platform;
      const id = el.dataset.id;
      const plat = PLATFORMS[pid];
      if (!plat) return;  // Unknown platform, do nothing

      switchPlatform(pid);  // Switch to the history item's platform
      // Load the video: different handling for iframe vs URL-based platforms
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

// ============================================================
// Thumbnail - auto-set from oEmbed or manual file upload
// ============================================================

/**
 * Sets the thumbnail preview image to the given URL and hides the placeholder.
 * Used when oEmbed returns a thumbnail or when using platform template URLs.
 * @param {string} url - The thumbnail image URL
 */
function autoSetThumbnail(url) {
  const preview = document.getElementById('thumbnail-preview');
  const placeholder = document.getElementById('thumbnail-placeholder');
  if (!preview || !placeholder) return;
  preview.src = url;                  // Set the preview image source
  preview.style.display = 'block';    // Show the preview
  placeholder.style.display = 'none'; // Hide the placeholder
}

/**
 * Sets up the thumbnail file upload box.
 * Clicking the box triggers a hidden file input; on file selection,
 * reads the file as a data URL and displays it as the thumbnail preview.
 */
function setupThumbnailUpload() {
  const thumbInput = document.getElementById('thumbnail-file-input');   // Hidden file input
  const thumbBox = document.getElementById('thumbnail-box');            // Clickable upload box
  const thumbPreview = document.getElementById('thumbnail-preview');    // <img> preview element
  const thumbPlaceholder = document.getElementById('thumbnail-placeholder'); // SVG placeholder
  const thumbUrlInput = document.getElementById('thumbnail-url-input'); // URL text input

  if (!thumbBox || !thumbInput) return;

  // Clicking the upload box triggers the hidden file input
  thumbBox.addEventListener('click', () => { thumbInput.click(); });

  // When a file is selected, read it as a data URL and show the preview
  thumbInput.addEventListener('change', () => {
    if (thumbInput.files.length > 0) {
      const file = thumbInput.files[0];
      const reader = new FileReader();
      reader.onload = function(e) {
        thumbPreview.src = e.target.result;      // Set preview to uploaded image
        thumbPreview.style.display = 'block';     // Show the preview
        thumbPlaceholder.style.display = 'none';  // Hide the placeholder
      };
      reader.readAsDataURL(file);  // Read file as base64 data URL
    }
  });

  // When a thumbnail URL is pasted/typed, update preview
  if (thumbUrlInput) {
    thumbUrlInput.addEventListener('input', function() {
      var val = this.value.trim();
      if (val && /^https?:\/\//.test(val)) {
        thumbPreview.src = val;
        thumbPreview.style.display = 'block';
        thumbPlaceholder.style.display = 'none';
      }
    });
  }
}

// ============================================================
// Tag Chip Input - comma-separated tags with removable chips
// ============================================================

var _tagEsc = function(s) { return String(s||'').replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c; }); };

/**
 * Initializes the chip-based tag input.
 * Typing a tag and pressing comma or Enter adds it as a chip.
 * Chips can be removed by clicking the X button.
 * The final array is read via getTagChips() for form submission.
 */
function initTagChips() {
  var container = document.getElementById('tags-input-container');
  var input = document.getElementById('tags-input');
  if (!container || !input) return;

  // Focus the input when clicking anywhere in the container
  container.addEventListener('click', function(e) {
    if (e.target === container) input.focus();
  });

  // Listen for comma (,) or Enter to add a tag
  input.addEventListener('keydown', function(e) {
    if (e.key === ',' || e.key === 'Enter') {
      e.preventDefault();
      addTagChip(input.value);
    }
  });

  // Also add on blur (when clicking away) if there's content
  input.addEventListener('blur', function() {
    if (input.value.trim()) addTagChip(input.value);
  });
}

/**
 * Adds a tag chip to the display and clears the input.
 * @param {string} raw - Raw input value (comma-separated possible)
 */
function addTagChip(raw) {
  var input = document.getElementById('tags-input');
  var display = document.getElementById('tags-chips-display');
  if (!input || !display) return;

  // Support typing comma within a word: "tech, tutorial" -> two tags
  var parts = raw.split(',').map(function(s) { return s.trim(); }).filter(Boolean);
  if (parts.length === 0) return;

  parts.forEach(function(name) {
    // Check for duplicates among existing chips
    var existing = display.querySelectorAll('.tag-chip');
    var dup = false;
    existing.forEach(function(chip) {
      if (chip.dataset.tag === name.toLowerCase()) dup = true;
    });
    if (dup) return;

    var chip = document.createElement('span');
    chip.className = 'tag-chip';
    chip.dataset.tag = name.toLowerCase();
    chip.innerHTML = _tagEsc(name) + '<span class="tag-chip-remove">&times;</span>';

    chip.querySelector('.tag-chip-remove').addEventListener('click', function(e) {
      e.stopPropagation();
      chip.remove();
    });

    display.appendChild(chip);
  });

  input.value = '';
  input.focus();
}

/**
 * Returns the array of tag strings from the current chips.
 * @returns {string[]}
 */
function getTagChips() {
  var display = document.getElementById('tags-chips-display');
  if (!display) return [];
  var arr = [];
  display.querySelectorAll('.tag-chip').forEach(function(chip) {
    var text = chip.firstChild.textContent || '';
    if (text) arr.push(text.trim());
  });
  return arr;
}

// ============================================================
// Form Submission - validate, construct video object, save to Supabase + localStorage, and redirect
// ============================================================

async function submitToSupabase(videoObj, thumbnailFile) {
  if (!window.__supabase) return false;
  try {
    let thumbnailUrl = videoObj.thumbnail;

    // Upload thumbnail if a file was selected
    if (thumbnailFile) {
      const ext = thumbnailFile.name.split('.').pop() || 'jpg';
      const thumbPath = 'thumbnails/' + Date.now() + '.' + ext;
      const publicUrl = await window.SupabaseStorage.uploadFile('thumbnails', thumbPath, thumbnailFile);
      if (publicUrl) thumbnailUrl = publicUrl;
    }

    // Upload video file if a local video URL points to a File object
    // (The current form handles embed URLs; video files are uploaded via a separate flow)

    const result = await window.SupabaseVideos.insert({
      ...videoObj,
      thumbnail: thumbnailUrl,
      thumbnail_url: thumbnailUrl
    });
    if (result) return result;
    window.App.showToast('Supabase save failed, falling back to local storage.', 'warning');
    return null;
  } catch (e) {
    console.error('Supabase submit error:', e);
    window.App.showToast('Upload failed: ' + e.message, 'error');
    return false;
  }
}

function setupFormSubmission() {
  const form = document.getElementById('upload-video-form');
  const submitBtn = document.getElementById('submit-btn');
  if (!form || !submitBtn) return;

  form.addEventListener('submit', async (e) => {
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
    if (!title) { window.App.showToast('Video title is required.', 'error'); return; }
    const description = document.getElementById('description-input').value.trim();
    let duration = document.getElementById('duration-input').value.trim();
    if (!duration) duration = '5:00';
    if (!/^[0-9]+:[0-5]?[0-9]:[0-5][0-9]$|^[0-9]+:[0-5][0-9]$/.test(duration)) {
      window.App.showToast('Invalid duration. Use mm:ss or hh:mm:ss.', 'error'); return;
    }

    var tagsArr = getTagChips();

    const publishToggle = document.getElementById('publish-toggle').checked;
    const thumbnailImg = document.getElementById('thumbnail-preview');
    const thumbnailFileInput = document.getElementById('thumbnail-file-input');
    const thumbnailFile = thumbnailFileInput && thumbnailFileInput.files.length > 0 ? thumbnailFileInput.files[0] : null;
    const thumbnailUrlInput = document.getElementById('thumbnail-url-input');
    const manualThumbnailUrl = thumbnailUrlInput ? thumbnailUrlInput.value.trim() : '';
    const placeholderThumb = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 9%22%3E%3Crect width=%22100%25%22 height=%22100%25%22 fill=%22%231f1f1f%22/%3E%3Ctext x=%228%22 y=%225%22 text-anchor=%22middle%22 fill=%22%23666%22 font-size=%221%22%3ENo Thumbnail%3C/text%3E%3C/svg%3E';
    const plat = PLATFORMS[currentPlatform];
    const thumbnailSrc = manualThumbnailUrl
      ? manualThumbnailUrl
      : (thumbnailImg.style.display === 'block'
        ? thumbnailImg.src
        : (currentThumbnailUrl || (plat && plat.getThumbnailUrl ? plat.getThumbnailUrl(currentVideoId) : null) || placeholderThumb));

    submitBtn.disabled = true;
    submitBtn.textContent = 'Publishing...';

    const newVideoObj = {
      title,
      description,
      videoUrl: currentVideoUrl || currentEmbedUrl,
      embedUrl: currentEmbedUrl,
      thumbnail: thumbnailSrc,
      platform: currentPlatform,
      platformLabel: plat ? plat.name : currentPlatform,
      views: 0,
      likes: 0,
      tags: tagsArr,
      duration,
      publishDate: new Date().toISOString().split('T')[0],
      status: publishToggle ? 'published' : 'draft',
      creator: 'Administrator'
    };

    // Try Supabase first
    if (window.__supabase) {
      const inserted = await submitToSupabase(newVideoObj, thumbnailFile);
      if (inserted) {
        window.SupabaseVideos.invalidateCache();
        // Also save to localStorage so the video shows immediately on next page load
        const dbVideos = window.App.getVideos();
        dbVideos.push(inserted);
        window.App.saveVideos(dbVideos);
        window.App.showToast('Video published successfully!', 'success');
        setTimeout(() => { window.location.href = './videos.html'; }, 1000);
        return;
      }
    }

    // Fallback: save to localStorage
    const dbVideos = window.App.getVideos();
    newVideoObj.id = 'vid-' + Date.now();
    dbVideos.push(newVideoObj);
    window.App.saveVideos(dbVideos);
    window.App.showToast('Video published successfully (local storage).', 'success');
    setTimeout(() => { window.location.href = './videos.html'; }, 1000);
  });
}
