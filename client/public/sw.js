/*
 * Laheri Collection service worker.
 * - App shell precached so the installed app opens instantly and works offline.
 * - Navigations: network first, cached shell when offline.
 * - Same-origin assets: cache first, refreshed in the background.
 * - API calls are never cached (orders, stock and bills must be live).
 */
const VERSION = 'laheri-v1';
const SHELL_CACHE = `${VERSION}-shell`;
const RUNTIME_CACHE = `${VERSION}-runtime`;

const SHELL_FILES = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/logo.svg',
  '/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_FILES))
      .catch(() => undefined)
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          const cache = await caches.open(SHELL_CACHE);
          cache.put('/index.html', fresh.clone());
          return fresh;
        } catch {
          const cache = await caches.open(SHELL_CACHE);
          return (
            (await cache.match('/index.html')) ||
            (await cache.match('/')) ||
            new Response('<h1>Laheri Collection</h1><p>You are offline. Reconnect to browse the shop.</p>', {
              status: 200,
              headers: { 'Content-Type': 'text/html; charset=utf-8' },
            })
          );
        }
      })()
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached) {
        // refresh quietly for next visit
        fetch(request)
          .then((res) => {
            if (res && res.ok) caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, res));
          })
          .catch(() => undefined);
        return cached;
      }
      try {
        const res = await fetch(request);
        if (res.ok) {
          const cache = await caches.open(RUNTIME_CACHE);
          cache.put(request, res.clone());
        }
        return res;
      } catch {
        return new Response('', { status: 504, statusText: 'Offline' });
      }
    })()
  );
});
