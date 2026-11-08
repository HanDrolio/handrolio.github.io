const CACHE='cosmos-rhythm-v1.0.0';
const CORE=['./','./index.html','./style.css','./icon.svg','./src/main.js','./src/analyzer.js','./src/combat.js','./src/render.js','./src/data.js'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('cosmos-rhythm-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin)return;
  event.respondWith(caches.match(req).then(cached=>{
    const fresh=fetch(req).then(response=>{
      if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(req,copy));}
      return response;
    }).catch(()=>cached);
    return cached||fresh;
  }));
});
