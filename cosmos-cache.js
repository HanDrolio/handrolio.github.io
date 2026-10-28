/* COSM.OS v3 install-once asset cache and first-flight progress UI. */
export const CACHE_NAME='cosmos-assets-v3';
const TIMEOUT_MS=18000;
const sleepRace=(promise,ms)=>new Promise((resolve,reject)=>{
 const timer=setTimeout(()=>reject(new Error('asset timeout')),ms);
 promise.then(v=>{clearTimeout(timer);resolve(v)},e=>{clearTimeout(timer);reject(e)});
});
function validResponse(response){return !!response&&(response.ok||response.type==='opaque')}
export async function preloadCosmos(options){
 const overlay=document.getElementById('preloadScreen');
 const status=document.getElementById('preloadStatus');
 const counter=document.getElementById('preloadCounter');
 const bar=document.getElementById('preloadBar');
 const close=(message)=>{if(status)status.textContent=message;if(overlay){overlay.classList.add('finished');setTimeout(()=>overlay.remove(),800)}};
 const originals=options.assetSpecs.map(item=>item.source==='quaternius'
  ?options.heroBase+item.file:options.cityBase+item.file);
 const textures=Object.values(options.hdFiles).map(file=>options.textureBase+file);
 const resources=[
  ...originals,...textures,
  'https://clouds.matteason.co.uk/images/2048x1024/clouds-alpha.png',
  'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js',
  'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js'
 ];
 const urls=[...new Set(resources)];
 let cache=null,cached=0,downloaded=0,failed=0,complete=0,bytes=0;
 try{
  if('serviceWorker' in navigator){
   await navigator.serviceWorker.register('./cosmos-sw.js',{updateViaCache:'none'}).catch(err=>console.warn('Service worker unavailable:',err.message));
  }
  if('caches' in window)cache=await caches.open(CACHE_NAME);
 }catch(err){console.warn('Asset cache unavailable:',err.message)}
 if(!cache){close('LIVE STREAMING MODE · BROWSER CACHE UNAVAILABLE');return {cached,downloaded,failed:0,resources:urls.length,cacheEnabled:false}}
 const update=()=>{
  const progress=Math.round((complete/urls.length)*100);
  if(bar)bar.style.width=progress+'%';
  if(counter)counter.textContent=complete+' / '+urls.length+' ASSETS · '+progress+'%';
  if(status)status.textContent=cached+' ALREADY CACHED · '+downloaded+' DOWNLOADED'+(failed?' · '+failed+' USING LIVE FALLBACK':'');
 };
 if(overlay)overlay.hidden=false;
 update();
 let cursor=0;
 async function worker(){
  for(;;){
   const index=cursor++;
   if(index>=urls.length)return;
   const url=urls[index];
   try{
    const request=new Request(url,{mode:'cors',credentials:'omit'});
    const hit=await cache.match(request);
    if(hit&&validResponse(hit)){cached++;complete++;update();continue}
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),TIMEOUT_MS);
    try{
     const response=await fetch(request,{signal:controller.signal,cache:'default'});
     if(!validResponse(response))throw new Error('HTTP '+response.status);
     try{await cache.put(request,response.clone())}catch(err){console.warn('Cache write skipped:',err.message)}
     if(response.headers.has('content-length'))bytes+=Number(response.headers.get('content-length'))||0;
     downloaded++;
    }finally{clearTimeout(timer)}
   }catch(err){failed++;console.warn('Preload failed:',url,err.message)}
   complete++;update();
  }
 }
 await Promise.all(Array.from({length:Math.min(6,urls.length)},worker));
 try{if(navigator.storage?.persist)await navigator.storage.persist()}catch(err){}
 close(failed?'ATLAS ONLINE · '+failed+' ASSETS WILL STREAM IF NEEDED':'EIGHTFOLD ATLAS INSTALLED · READY TO EXPLORE');
 window.cosmosCacheStatus={cached,downloaded,failed,total:urls.length,cacheEnabled:true,bytes};
 return window.cosmosCacheStatus;
}
