/* COSM.OS service worker — cache the shell so deterministic mode opens offline.
   WebLLM manages its own model cache after the operator loads a model. */
const CACHE = 'cosmos-v6-qwen-balanced';
const SHELL = [
  './',
  './index.html',
  './css/style.css',
  './js/personas.js',
  './js/engine.js',
  './js/threads.js',
  './js/webllm.js',
  './js/webllm-worker.js',
  './js/app.js',
  './manifest.webmanifest',
  './icon.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(hit => hit || fetch(event.request).then(response => {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(event.request, copy)).catch(() => {});
      return response;
    }).catch(() => caches.match('./index.html')))
  );
});
