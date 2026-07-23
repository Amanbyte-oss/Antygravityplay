var CACHE_NAME = 'antigravity-v1';
var SHELL = [
  './',
  './index.html',
  './offline.html',
  './404.html',
  './403.html',
  './500.html',
  './maintenance.html',
  './css/main.css',
  './css/system.css',
  './css/home.css',
  './css/search.css',
  './css/watch.css',
  './js/main.js',
  './js/components.js',
  './js/mockData.js'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(c) { return c.addAll(SHELL); })
  );
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.filter(function(k) { return k !== CACHE_NAME; }).map(function(k) { return caches.delete(k); }));
    })
  );
});

self.addEventListener('fetch', function(e) {
  e.respondWith(
    fetch(e.request).catch(function() {
      if (e.request.mode === 'navigate') return caches.match('./offline.html');
      return caches.match(e.request);
    })
  );
});
