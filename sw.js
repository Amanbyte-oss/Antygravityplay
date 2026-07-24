var CACHE_NAME = 'antigravity-v2';
var SHELL = [
  './',
  './index.html',
  './watch.html',
  './offline.html',
  './404.html',
  './403.html',
  './500.html',
  './maintenance.html',
  './admin/index.html',
  './admin/upload.html',
  './admin/videos.html',
  './admin/tags.html',
  './admin/settings.html',
  './admin/analytics.html',
  './css/main.css',
  './css/system.css',
  './css/home.css',
  './css/search.css',
  './css/watch.css',
  './css/admin/dashboard.css',
  './css/admin/upload.css',
  './css/admin/videos.css',
  './js/main.js',
  './js/components.js',
  './js/mockData.js',
  './js/supabase.js',
  './js/supabase-api.js'
];

self.addEventListener('install', function(e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(c) { return c.addAll(SHELL).catch(function() {}); })
  );
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.filter(function(k) { return k !== CACHE_NAME; }).map(function(k) { return caches.delete(k); }));
    }).then(function() { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request, { redirect: 'follow' }).then(function(res) {
      if (res.status === 404) {
        return caches.match(e.request).then(function(cached) {
          if (cached) return cached;
          if (e.request.mode === 'navigate') return caches.match('./404.html');
          return res;
        });
      }
      return res;
    }).catch(function() {
      if (e.request.mode === 'navigate') return caches.match('./offline.html');
      return caches.match(e.request).then(function(cached) { return cached || new Response('', { status: 503 }); });
    })
  );
});
