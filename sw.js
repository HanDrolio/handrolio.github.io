/* COSM.OS service worker v2
   Online: network-first so chat-driven GitHub changes appear immediately.
   Offline: fall back to the cached app shell. WebLLM manages its own model cache. */
const CACHE = 'cosmos-v7-modular';
const SHELL = [
  './',
  './index.html',
  './css/style.css',
  './js/personas.js',
  './js/v2/registry.js',
  './js/v2/store.js',
  './js/v2/storage.js',
  './js/v2/router.js',
  './js/v2/threads.js',
  './js/v2/ai.js',
  './js/v2/prompts.js',
  './js/v2/ui.js',
  './js/v2/main.js',
  './manifest.webmanifest',
  './icon.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request, { cache: 'no-store' });
    if (response.ok) cache.put(request, response.clone()).catch(() => {});
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (request.mode === 'navigate') return cache.match('./index.html');
    throw new Error('Offline and no cached response is available.');
  }
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(networkFirst(event.request));
});
