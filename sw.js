var CACHE_NAME = 'sofia-v1';
var ASSETS = [
  '/',
  '/index.html'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  // Pour les appels API Netlify, toujours aller sur le réseau
  if (e.request.url.includes('/.netlify/functions/') ||
      e.request.url.includes('api.elevenlabs') ||
      e.request.url.includes('api.anthropic') ||
      e.request.url.includes('api.unsplash') ||
      e.request.url.includes('openweathermap')) {
    e.respondWith(fetch(e.request));
    return;
  }
  // Pour le reste, cache en premier
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      return cached || fetch(e.request);
    })
  );
});
