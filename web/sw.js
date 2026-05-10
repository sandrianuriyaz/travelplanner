const CACHE_NAME = 'travel-planner-v1';

// Aset statis yang di-cache untuk offline
const STATIC_ASSETS = [
  '/index.html',
  '/login.html',
  '/dashboard.html',
  '/generate.html',
  '/map.html',
  '/explore.html',
  '/dist/output.css',
  '/js/api.js',
  '/manifest.json',
];

// Install: cache semua aset statis
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: hapus cache lama
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: strategi cache-first untuk aset statis, network-first untuk API
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Biarkan request API lewat network (jangan di-cache)
  if (url.pathname.startsWith('/api/') || url.hostname !== self.location.hostname) {
    return;
  }

  // Cache-first untuk aset statis
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        // Cache respons baru yang berhasil
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback: tampilkan halaman utama
        if (request.destination === 'document') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
