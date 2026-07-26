// Service worker de Sofia.
// Objectif : démarrage instantané, sans jamais servir une version périmée
// de l'application ni mettre en cache les appels aux fonctions Netlify.
//
// Changer VERSION force la purge des anciens caches au prochain chargement.
const VERSION = 'sofia-v1';
const CACHE_STATIQUE = VERSION + '-statique';
const CACHE_POLICES  = VERSION + '-polices';

// Petits fichiers stables : on les met en cache dès l'installation.
const A_PRECHARGER = [
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.json'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_STATIQUE)
      .then(function(c) { return c.addAll(A_PRECHARGER); })
      .catch(function() {})   // une icône manquante ne doit pas bloquer l'install
      .then(function() { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(cles) {
      return Promise.all(cles.map(function(k) {
        if (k !== CACHE_STATIQUE && k !== CACHE_POLICES) return caches.delete(k);
      }));
    }).then(function() { return self.clients.claim(); })
  );
});

self.addEventListener('message', function(e) {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

function estPolice(url) {
  return url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
}

/** Réseau d'abord : la version en ligne gagne toujours, le cache dépanne hors ligne. */
function reseauDabord(req, nomCache) {
  return fetch(req).then(function(rep) {
    if (rep && rep.ok) {
      var copie = rep.clone();
      caches.open(nomCache).then(function(c) { c.put(req, copie); });
    }
    return rep;
  }).catch(function() {
    return caches.match(req).then(function(cache) {
      return cache || Response.error();
    });
  });
}

/** Cache d'abord, mise à jour en arrière-plan. */
function cacheDabord(req, nomCache) {
  return caches.match(req).then(function(cache) {
    var reseau = fetch(req).then(function(rep) {
      if (rep && (rep.ok || rep.type === 'opaque')) {
        var copie = rep.clone();
        caches.open(nomCache).then(function(c) { c.put(req, copie); });
      }
      return rep;
    }).catch(function() { return cache; });
    return cache || reseau;
  });
}

self.addEventListener('fetch', function(e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  var url;
  try { url = new URL(req.url); } catch (err) { return; }

  // Jamais de cache sur les fonctions : réponses en flux, audio, données live.
  if (url.pathname.indexOf('/.netlify/functions/') === 0) return;

  // Polices Google : elles ne changent pas, on les sert depuis le cache.
  if (estPolice(url)) {
    e.respondWith(cacheDabord(req, CACHE_POLICES));
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Le HTML passe toujours par le réseau en premier : pas de version figée.
  if (req.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html')) {
    e.respondWith(reseauDabord(req, CACHE_STATIQUE));
    return;
  }

  e.respondWith(cacheDabord(req, CACHE_STATIQUE));
});
