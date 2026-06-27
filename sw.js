var CACHE_VERSION = 'sofia-v' + Date.now();

self.addEventListener('install', function() { self.skipWaiting(); });

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.map(function(k) { return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  // Ne jamais mettre en cache les fonctions Netlify
  if (e.request.url.includes('/.netlify/functions/')) {
    e.respondWith(fetch(e.request));
    return;
  }
  e.respondWith(fetch(e.request));
});
