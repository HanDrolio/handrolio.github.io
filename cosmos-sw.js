/* COSM.OS v3: offline-friendly cache-first 3D worlds.
 * Only cache public static assets. User-provided audio is never cached.
 */
const ASSETS='cosmos-assets-v3';
const SHELL='cosmos-shell-v3';
const PREFIX='cosmos-';
const LOCAL=['./','./index.html','./navigator.html','./cosmos-infinite.js','./cosmos-personas.js','./cosmos-cache.js'];
self.addEventListener('install',event=>{
 event.waitUntil((async()=>{
  const cache=await caches.open(SHELL);
  await Promise.allSettled(LOCAL.map(u=>cache.add(new Request(u,{cache:'reload'}))));
  await self.skipWaiting();
 })());
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==ASSETS&&k!==SHELL).map(k=>caches.delete(k)));
  await self.clients.claim();
 })());
});
const ASSET_HOSTS=new Set(['cdn.jsdelivr.net','unpkg.com','raw.githubusercontent.com','hidencod.github.io','clouds.matteason.co.uk']);
self.addEventListener('fetch',event=>{
 const req=event.request;
 if(req.method!=='GET')return;
 const url=new URL(req.url);
 if(url.protocol!=='https:'&&url.protocol!=='http:')return;
 if(req.mode==='navigate'&&url.origin===self.location.origin){
  event.respondWith((async()=>{
   const cache=await caches.open(SHELL);
   try{
    const result=await fetch(req);
    if(result.ok)event.waitUntil(cache.put(req,result.clone()).catch(()=>{}));
    return result;
   }catch(err){
    return await cache.match(req)||await cache.match('./index.html')||Response.error();
   }
  })());return;
 }
 const local=url.origin===self.location.origin;
 if(!local&&!ASSET_HOSTS.has(url.hostname))return;
 const isStatic=local?(/\.((?:js|mjs|css|png|jpg|jpeg|webp|glb|gltf|bin))$/i.test(url.pathname)):true;
 if(!isStatic)return;
 event.respondWith((async()=>{
  const cache=await caches.open(local?SHELL:ASSETS);
  const hit=await cache.match(req);
  if(hit)return hit;
  const response=await fetch(req);
  if(response.ok||response.type==='opaque'){
   event.waitUntil(cache.put(req,response.clone()).catch(()=>{}));
  }
  return response;
 })());
});
