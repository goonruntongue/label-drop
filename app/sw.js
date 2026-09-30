// Label Drop service worker: makes the home-screen app start even on a weak connection.
// - Page (navigation): network first, fall back to the cached page.
// - Built assets (hashed file names) and icons: cache first.
// - Google Fonts: stale-while-revalidate.
const VERSION = 'label-drop-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(['./', './manifest.webmanifest'])));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((cache) => cache.put('./', copy));
          return res;
        })
        .catch(() => caches.match('./')),
    );
    return;
  }

  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  const isOwnStatic = url.origin === self.location.origin && /\/(assets|icons)\//.test(url.pathname);
  if (!isFont && !isOwnStatic) return;

  event.respondWith(
    caches.open(VERSION).then(async (cache) => {
      const cached = await cache.match(request);
      const network = fetch(request)
        .then((res) => {
          if (res.ok || res.type === 'opaque') cache.put(request, res.clone());
          return res;
        })
        .catch(() => cached);
      return isOwnStatic && cached ? cached : cached ?? network;
    }),
  );
});
