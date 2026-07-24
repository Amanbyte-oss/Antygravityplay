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
