const RELEASE = 'aeccb18136ab52';
const GENERATED = ["./THREE-LICENSE.txt","./assets/index-DF5DE88a.js","./assets/index-DZmrw6JY.css","./assets/three-core-DDTEyzDJ.js","./assets/three-renderer-CI-vBaZn.js","./index.html","./mark.svg","./media/orbit.svg","./media/weather.mp4","./media/window.svg"];
const PREFIX = 'memory-museum-shell-';
const CACHE = PREFIX + RELEASE;
const scope = self.registration.scope;
const home = new URL('./index.html', scope).href;

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(GENERATED.map(path => new Request(new URL(path, scope), { cache: 'reload' })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

async function sliceMedia(response, range) {
  const bounds = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (!bounds || !bounds[1] && !bounds[2]) return new Response(null, { status: 416 });
  const data = await response.arrayBuffer();
  const size = data.byteLength;
  const start = bounds[1] ? Number(bounds[1]) : Math.max(0, size - Number(bounds[2]));
  const end = bounds[1] && bounds[2] ? Math.min(size - 1, Number(bounds[2])) : size - 1;
  if (start >= size || end < start) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
  return new Response(data.slice(start, end + 1), { status: 206, headers: {
    'Accept-Ranges': 'bytes', 'Content-Range': `bytes ${start}-${end}/${size}`,
    'Content-Length': String(end - start + 1), 'Content-Type': response.headers.get('Content-Type') || 'application/octet-stream',
  } });
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || !request.url.startsWith(scope)) return;
  const url = new URL(request.url);
  if (url.pathname.endsWith('/sw.js')) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (request.mode === 'navigate') {
      try { return await fetch(request); }
      catch { return await cache.match(home) || Response.error(); }
    }
    const cached = await cache.match(request);
    if (!cached) return fetch(request);
    const range = request.headers.get('Range');
    return range ? sliceMedia(cached, range) : cached;
  })());
});
