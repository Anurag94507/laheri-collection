/*
 * Laheri Collection service worker.
 * - Precaches the app shell so the installed app opens offline.
 * - Navigations: network first, cached shell when offline (so a deploy is picked up immediately).
 * - Hashed /assets/* : cache first, they can never change under the same URL.
 * - Other same-origin files: serve cached, refresh in the background (stale-while-revalidate),
 *   so replaced logos/photos show up on the next view instead of staying stale forever.
 * - /api/* is never touched: stock, orders, bills and sign-in must stay live.
 */
const VERSION = 'laheri-v1';
const SHELL_CACHE = `${VERSION}-shell`;
const STATIC_CACHE = `${VERSION}-static`;
const SHELL_FILES = ['/index.html', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];

const offlinePage = new Response(
  '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Laheri Collection</title>' +
    '<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#0F1B3C;color:#E7D5A3;font-family:Georgia,serif;text-align:center">' +
    '<div><h1 style="font-weight:500;letter-spacing:.06em">Laheri Collection</h1>' +
    '<p style="font-family:system-ui,sans-serif;font-size:14px;color:#E7D5A3;opacity:.7">You are offline. Reconnect to browse the shop.</p></div>',
  { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
);

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // cache: 'reload' bypasses the HTTP cache so a new deploy never installs old shell bytes.
      await Promise.all(
        SHELL_FILES.map((url) =>
          cache.add(new Request(url, { cache: 'reload' })).catch(() => undefined)
        )
      );
      await self.skipWaiting();
    })()
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

const isApi = (pathname) => pathname === '/api' || pathname.startsWith('/api/');
const isImmutable = (pathname) => pathname.startsWith('/assets/');

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || isApi(url.pathname)) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          if (fresh.ok) (await caches.open(SHELL_CACHE)).put('/index.html', fresh.clone());
          return fresh;
        } catch {
          return (await caches.match('/index.html', { ignoreSearch: true })) || offlinePage;
        }
      })()
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached && isImmutable(url.pathname)) return cached;
      if (cached) {
        fetch(request)
          .then((res) => {
            if (res && res.ok) caches.open(STATIC_CACHE).then((cache) => cache.put(request, res));
          })
          .catch(() => undefined);
        return cached;
      }
      try {
        const res = await fetch(request);
        if (res.ok) (await caches.open(STATIC_CACHE)).put(request, res.clone());
        return res;
      } catch {
        return new Response('', { status: 504, statusText: 'Offline' });
      }
    })()
  );
});
