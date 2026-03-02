/* Simple cache-first service worker (offline-ready) */

const CACHE_NAME = 'connect4-pwa-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/manifest.webmanifest',
  '/offline.html',
  '/src/app.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => (k === CACHE_NAME ? null : caches.delete(k))));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle GET
  if (req.method !== 'GET') return;

  event.respondWith(
    (async () => {
      try {
        const cached = await caches.match(req);
        if (cached) return cached;

        const fresh = await fetch(req);
        // Cache same-origin navigations/assets
        if (new URL(req.url).origin === self.location.origin) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(req, fresh.clone());
        }
        return fresh;
      } catch {
        // Fallback for navigation
        if (req.mode === 'navigate') return caches.match('/offline.html');
        return new Response('', { status: 503, statusText: 'Offline' });
      }
    })()
  );
});
