// ─── SUPABASE CLIENT ───
// Loads supabase-js from CDN and initializes the client.
// Replace SUPABASE_URL and SUPABASE_ANON_KEY with your project values.
// ─── CONFIG: Paste your Supabase project URL and anon key below ───
const SUPABASE_URL = 'https://oropqrxbsgzluauvmllz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9yb3Bxcnhic2d6bHVhdXZtbGx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3MDQ0MjcsImV4cCI6MjEwMDI4MDQyN30.W0fvGAVSUrTv9MWjV3hThCN7lcnzgSwm_M8gUxX8zOs';
// ─────────────────────────────────────────────────────────────────
window.__supabasePresent = true;

let supabaseClient = null;
let supabaseLoaded = false;

function initSupabase() {
  if (supabaseClient) return supabaseClient;
  if (SUPABASE_URL.includes('your-project')) {
    console.warn('Supabase: No URL configured. Running in local-only mode.');
    return null;
  }
  try {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true }
    });
    supabaseLoaded = true;
    return supabaseClient;
  } catch (e) {
    console.error('Supabase: Init failed', e);
    return null;
  }
}

// Load supabase-js from CDN then initialize
function loadSupabase(callback) {
  if (supabaseClient) { if (callback) callback(supabaseClient); return; }
  if (window.supabase && window.supabase.createClient) {
    callback(initSupabase());
    return;
  }
  var s = document.createElement('script');
  s.src = 'https://unpkg.com/@supabase/supabase-js@2';
  s.onload = function () { callback(initSupabase()); };
  s.onerror = function () {
    console.error('Supabase: Failed to load CDN. Check network.');
    callback(null);
  };
  document.head.appendChild(s);
}

loadSupabase(function (client) {
  window.__supabase = client;
  if (client) {
    document.dispatchEvent(new CustomEvent('supabase-ready'));
  }
});

// Direct REST API fetch via Vercel proxy (serverless function)
(function() {
  if (SUPABASE_URL.includes('your-project')) return;
  var apiUrl = '/api/proxy?path=' + encodeURIComponent('/videos?select=*&order=created_at.desc');
  fetch(apiUrl, {
    headers: { 'Accept': 'application/json' }
  }).then(function(r) {
    if (!r.ok) { console.warn('Supabase: proxy returned', r.status); return null; }
    return r.json();
  }).then(function(rows) {
    if (!Array.isArray(rows) || rows.length === 0) { console.log('Supabase: No videos from proxy'); return; }
    var enriched = rows.map(function(row) {
      var tags = Array.isArray(row.tags) ? row.tags : (typeof row.tags === 'string' ? row.tags.split(',').map(function(s) { return s.trim(); }).filter(Boolean) : []);
      var vs = row.video_source || row.platform || '';
      var eu = row.external_url || row.video_url || '';
      var ec = row.embed_code || row.embed_url || '';
      return {
        id: row.id, title: row.title || '', description: row.description || '',
        video_source: vs, external_url: eu, videoUrl: eu,
        embed_code: ec, thumbnail: row.thumbnail_url || row.thumbnail || '',
        views: row.views || 0, likes: row.likes || 0, reactions: row.reactions || 0,
        tags: tags, duration: row.duration || '',
        publishDate: (row.created_at || '').split('T')[0],
        status: row.status || 'published', creator: row.creator || 'Administrator'
      };
    });
    localStorage.setItem('db-videos', JSON.stringify(enriched));
    console.log('Supabase: Populated localStorage with ' + enriched.length + ' videos');
    window.dispatchEvent(new CustomEvent('videosupdated'));
  }).catch(function(err) {
    console.warn('Supabase: proxy failed', err);
  });
})();
