// IA one-sheet PWA: use the newest page online; fall back to its saved copy offline.
const CACHE = 'ia-one-sheet-v1';
const ROOT = new URL('./', self.location.href).href;
const FILES = [
  './',
  './manifest.webmanifest',
  './pwa-icons/favicon-32.png',
  './pwa-icons/apple-touch-icon.png',
  './pwa-icons/icon-192.png',
  './pwa-icons/icon-512.png',
  './pwa-icons/icon-maskable-512.png',
  './assets/ia-hero-flow.png',
  './assets/ia-three-pillars-tech.png',
  './assets/ia-workshop-sorter.png',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('ia-one-sheet-') && key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith(ROOT)) return;
  event.respondWith(
    fetch(event.request, { cache: 'no-store' })
      .then((response) => {
        if (response.ok) caches.open(CACHE).then((cache) => cache.put(event.request, response.clone()));
        return response;
      })
      .catch(() => caches.match(event.request, { ignoreSearch: true }).then((saved) => saved || caches.match(ROOT))),
  );
});
