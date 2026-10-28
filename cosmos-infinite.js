/*
 COSM.OS Infinite Frequency - procedural galaxies and world-attached cinematic events.
 No Spotify audio is accessed or synchronized. Local audio is analyzed by the host page.
*/
export function installInfiniteFrequency(api){
 const {THREE,scene,camera,renderer,planets,buildPlanet,randSeed,makeSprite,prepareRealBuilding,urbanAssets}=api;
 const homeWorlds=planets.slice(), homeColors=api.galaxyGeo().attributes.color.array.slice();
 const titleA=['NYX','SOL','CYRA','VEL','ORO','KAI','LYRA','MIRA','AEON','NOVA','ZEPH','ASTRA','TERRA','RHEA','DUSK','ECHO'];
 const titleB=['PRIME','VII','IX','NOVA','HAVEN','DELTA','ARC','MINOR','OMEGA','BETA','-9','-42'];
 const kinds=['OCEAN CITADEL','CRYSTAL CITY','VOLCANIC WORLD','FROZEN METROPOLIS','EMERALD PLANET','DESERT NEBULA','LUMINOUS MOON'];
 const themes=[['#42c9e8','#8dfdde','#184f9e'],['#c17cff','#ff84da','#4a2187'],['#ff9160','#ffdc7c','#8e3a31'],['#a2f3ff','#c8d4ff','#356b97'],['#68ed9e','#caffb2','#1d7358'],['#efb878','#ffe4a7','#98643a'],['#d3a0ff','#9cdaff','#553b9a']];
 let galaxyNumber=0,auto=false,autoClock=0,autoLeg=0,stageNumber=0,decorationClock=0,qualityTimer=0,lowFrameTime=0,rebirth=null,blackHole=null;
 const rings=[],shots=[],collisions=[],destroyed=new Set();
 const ui={
  auto:document.getElementById('auto'),
  next:document.getElementById('nextGalaxy'),
  home:document.getElementById('homeGalaxy'),
  galaxy:document.getElementById('galaxyReadout'),
  spotify:document.getElementById('spotifyLink')
 };
 const homeText='COSM.OS CORE · 8 PERSONA WORLDS';
 const shade=new THREE.Color();
 function notice(t){api.say(t,2.7)}
 function updateUI(){
  if(ui.auto){ui.auto.textContent=auto?'◈ AUTO ON':'◈ AUTO OFF';ui.auto.setAttribute('aria-pressed',String(auto))}
  if(ui.galaxy)ui.galaxy.textContent=galaxyNumber===0?homeText:'GALAXY '+galaxyNumber+' · '+planets.length+' PERSONA WORLDS';
  const subtitle=document.getElementById('subtitle');
  if(subtitle&&api.mode()==='galaxy')subtitle.textContent=galaxyNumber===0?'8 PERSONAS · EXPLORE':('GALAXY '+galaxyNumber+' · '+planets.length+' WORLDS');
 }
 function setAuto(on){auto=!!on;autoClock=0;autoLeg=0;updateUI();notice(auto?'◈ AUTOPILOT ENGAGED':'◈ MANUAL NAVIGATION')}
 function manualOverride(){if(auto)setAuto(false)}
 function hashNumber(n){n=(n^0x9e3779b9)>>>0;n=Math.imul(n^(n>>>16),0x85ebca6b)>>>0;n=Math.imul(n^(n>>>13),0xc2b2ae35)>>>0;return (n^(n>>>16))>>>0}
 function clearTravel(){api.abortTravel();autoClock=0;autoLeg=0}
 function disposePlanet(p){
  p.disposed=true;
  scene.remove(p.group);
  const geometries=new Set(),materials=new Set(),textures=new Set();
  for(const g of [p._highGeometry,p._lowGeometry])if(g)geometries.add(g);
  p.group.traverse(o=>{
   if(o.geometry&&!o.isInstancedMesh)geometries.add(o.geometry);
   if(o.isInstancedMesh&&typeof o.dispose==='function')o.dispose();
   if(o.material)for(const m of (Array.isArray(o.material)?o.material:[o.material])){
    if(!m||materials.has(m))continue;materials.add(m);
    for(const key of ['map','bumpMap','alphaMap','emissiveMap'])if(m[key]&&m[key].isCanvasTexture)textures.add(m[key]);
   }
  });
  // HD texture maps are per-planet, unlike shared source textures in GLB assets.
  for(const tex of [p.surface?.material?.map,p.surface?.material?.bumpMap,p.cloudShell?.material?.map])if(tex&&tex.isTexture)textures.add(tex);
  for(const t of textures)t.dispose();
  for(const m of materials){
   // Shared source texture from GLB models belongs to the asset library.
   if(m.map&&m.map.isTexture&&!m.map.isCanvasTexture){} 
   m.dispose();
  }
  for(const g of geometries)g.dispose();
  p.group.clear();
 }
 function resetVisuals(){
  for(const c of collisions){c.done=true}
  collisions.length=0;
  for(const o of rings){scene.remove(o.mesh);if(o.mesh.geometry)o.mesh.geometry.dispose();o.mesh.material.dispose()}
  rings.length=0;
  for(const s of shots){scene.remove(s.mesh);s.mesh.material.dispose();s.mesh.geometry.dispose()}
  shots.length=0;
  if(blackHole){scene.remove(blackHole.group);blackHole.group.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose()}});blackHole=null}
  for(const p of [...homeWorlds,...planets]){p.group.scale.setScalar(1);p.group.visible=planets.includes(p);p.detailed=true;p.destroyed=false}
  destroyed.clear();rebirth=null;stageNumber=0;
 }
 function restoreHome(){
  for(const p of planets.slice())if(p.generated)disposePlanet(p);else p.group.visible=false;
  planets.length=0;for(const p of homeWorlds){p.group.visible=true;planets.push(p)}
 }
 function generatedSpecs(n){
  const r=randSeed(hashNumber(n*45637+9917));
  const archetypes=api.personaSpecs||homeWorlds;
  // The infinite multiverse always has the same eight COSM.OS archetypes,
  // with new terrain hues, weather, orbital patterns, cities and terrain.
  return archetypes.map((base,i)=>{
   const tint=themes[(i+Math.floor(r()*themes.length))%themes.length];
   const variability=.76+r()*.45;
   return {...base,name:base.name+' · '+n,personaName:base.name,
    // Each galaxy is a new evolution of the same eight characters.
    color:base.color,secondary:tint[1],land:tint[2],
    a:base.a+(r()-.5)*.24,orbit:9.8+i*4.25+r()*.8,
    size:base.size*variability,speed:base.speed*(.8+r()*.33),
    city:innerWidth<700?34+Math.floor(r()*16):55+Math.floor(r()*24),
    creatures:base.creatures,seed:hashNumber(n*982451653+i*93623+777),
    generated:true,persona:true,cityTint:base.cityTint
   };
  });
 }
 function colorGalaxy(n){
  const geo=api.galaxyGeo(),a=geo.attributes.color.array;
  if(n===0)a.set(homeColors);
  else{
   const rand=randSeed(hashNumber(n+2783)),hue=rand();
   for(let i=0;i<a.length;i+=3){
    const arm=((i/3)%5)|0;
    shade.setHSL((hue+arm*.12+rand()*.08)%1,.5+rand()*.3,.53+rand()*.17);
    a[i]=shade.r;a[i+1]=shade.g;a[i+2]=shade.b;
   }
  }
  geo.attributes.color.needsUpdate=true;
 }
 function switchGalaxy(number,fromAuto=false){
  const next=Math.max(0,Math.floor(number));
  if(next===galaxyNumber&&next===0)return;
  resetVisuals();clearTravel();api.clearCityBlueprints();
  if(next===0)restoreHome();
  else{
   for(const p of planets.slice())if(p.generated)disposePlanet(p);else p.group.visible=false;
   planets.length=0;
   for(const [i,spec] of generatedSpecs(next).entries()){
    buildPlanet(spec,i+1200+next*11);
    const p=planets[planets.length-1];
    p.detailed=false;
    if(p._lowGeometry)p.surface.geometry=p._lowGeometry;
    for(const a of p.population||[])a.sprite.visible=false;
    for(const o of p.proceduralBuildings||[])o.visible=false;
    for(const o of p.shuttles||[])o.mesh.visible=false;
    for(const l of p.life||[])l.object.visible=false;
    for(const asset of urbanAssets.values())prepareRealBuilding(p,asset);
   }
  }
  galaxyNumber=next;colorGalaxy(next);api.refreshDestinations();updateUI();
  api.resetStory();
  api.alignStoryWithAudio();
  api.setGalaxyDistance(78);
  notice(next===0?'✦ RETURNED TO THE EIGHTFOLD ATLAS':'✦ DISCOVERED GALAXY '+next+' · '+planets.length+' PERSONA WORLDS');
  if(fromAuto)autoClock=0;
 }
 function ringAt(pos,color,radius,life=1.8){
  if(rings.length>16){const old=rings.shift();scene.remove(old.mesh);old.mesh.geometry.dispose();old.mesh.material.dispose()}
  const g=new THREE.RingGeometry(radius*.65,radius,48);
  const m=new THREE.MeshBasicMaterial({color,transparent:true,opacity:.83,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false,depthTest:true});
  const mesh=new THREE.Mesh(g,m);mesh.position.copy(pos);scene.add(mesh);
  rings.push({mesh,age:0,life});
 }
 function worldPulse(p,color=p.secondary,size=1){
  if(!p)return;
  ringAt(p.position,color,p.size*size,2);
  const sprite=makeSprite(color,p.size*1.6,.8);sprite.position.copy(p.position);scene.add(sprite);
  rings.push({mesh:sprite,age:0,life:1.05,sprite:true,base:p.size*1.6});
 }
 function pickWorld(exclude=[]){
  const candidates=planets.filter(p=>!destroyed.has(p)&&!exclude.includes(p));
  const pool=candidates.length?candidates:planets.filter(p=>!exclude.includes(p));
  if(!pool.length)return null;
  return pool[(stageNumber++)%pool.length];
 }
 function meteorTo(p,count=7){
  if(!p)return;
  for(let i=0;i<count&&shots.length<30;i++){
   const rnd=randSeed(hashNumber((stageNumber+1)*11009+i*2377+galaxyNumber));
   const dir=new THREE.Vector3(rnd()-.5,rnd()-.5,rnd()-.5).normalize();
   const end=p.position.clone().addScaledVector(dir,p.size*1.015);
   const begin=p.position.clone().addScaledVector(dir,p.size*(3.0+rnd()*2)).add(new THREE.Vector3((rnd()-.5)*p.size*2,(rnd()-.5)*p.size*2,(rnd()-.5)*p.size*2));
   const mesh=new THREE.Mesh(new THREE.IcosahedronGeometry(p.size*.035,0),new THREE.MeshBasicMaterial({color:i%2?'#ffbc83':'#b6f4ff',transparent:true,opacity:1}));
   mesh.position.copy(begin);scene.add(mesh);
   shots.push({mesh,p,begin,end,age:-rnd()*.9,life:1+rnd()*.7});
  }
 }
 function createBlackHole(p){
  if(!p)return;
  if(blackHole){scene.remove(blackHole.group);blackHole.group.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose()}})}
  const group=new THREE.Group(),radius=p.size*.6;
  const disk=new THREE.Mesh(new THREE.RingGeometry(radius*.85,radius*1.8,72),new THREE.MeshBasicMaterial({color:0xb582ff,side:THREE.DoubleSide,transparent:true,opacity:.8,blending:THREE.AdditiveBlending,depthWrite:false}));
  const disk2=new THREE.Mesh(new THREE.RingGeometry(radius*1.85,radius*2.25,72),new THREE.MeshBasicMaterial({color:0x68c9ff,side:THREE.DoubleSide,transparent:true,opacity:.45,blending:THREE.AdditiveBlending,depthWrite:false}));
  const core=new THREE.Mesh(new THREE.SphereGeometry(radius,32,24),new THREE.MeshBasicMaterial({color:0x02010a}));
  group.add(disk,disk2,core);group.position.copy(p.position);scene.add(group);
  blackHole={p,group,disk,disk2,age:0};
 }
 function event(type,intensity=1){
  if(!planets.length)return '';
  const p=pickWorld();
  if(!p)return '';
  if(type==='meteor'){meteorTo(p,Math.min(18,Math.ceil(intensity)));worldPulse(p,'#8feaff',.7);return '☄ '+p.name+' · METEOR STORM'}
  if(type==='supernova'){worldPulse(p,'#ffe0ac',2.4);ringAt(p.position,'#ffc385',p.size*2.1,3);return '🌠 '+p.name+' · STELLAR SHOCKWAVE'}
  if(type==='eruption'){meteorTo(p,5);worldPulse(p,'#ff7a4f',1.9);p.heatTimer=4;return '💥 '+p.name+' · SURFACE ERUPTION'}
  if(type==='collision'){
   const q=pickWorld([p]);if(!q){worldPulse(p);return '✦ COSMIC DISTURBANCE'}
   collisions.push({p,q,age:0,life:4,hit:false});
   return '⚠ COLLISION COURSE · '+p.name+' + '+q.name;
  }
  if(type==='blackhole'){createBlackHole(p);worldPulse(p,'#9e71ff',1.8);return '🕳 '+p.name+' · GRAVITATIONAL COLLAPSE'}
  if(type==='rebirth'){
   for(const p of planets)worldPulse(p,p.secondary,1.8);
   rebirth={age:0,life:3.2,starting:new Map(planets.map(p=>[p,p.group.scale.x]))};
   if(blackHole){scene.remove(blackHole.group);blackHole.group.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose()}});blackHole=null}
   collisions.length=0;
   return '✦ THE WORLDS ARE REBORN';
  }
  return '';
 }
 function resetStory(){
  resetVisuals();
 }
 function tick(dt){
  // Live geometry is modified only for the active system; inactive homeworlds stay frozen.
  for(const c of collisions.slice()){
   if(c.done)continue;
   c.age+=dt;const t=Math.min(1,c.age/c.life),ease=t*t*(3-2*t);
   const mid=c.p.position.clone().add(c.q.position).multiplyScalar(.5);
   if(t<.86){
    const f=ease/.86;
    for(const p of [c.p,c.q]){
     p.group.position.lerp(mid,Math.min(1,f));
     p.position.copy(p.group.position);
     p.group.scale.setScalar(Math.max(.16,1-f*.77));
    }
   }else{
    for(const p of [c.p,c.q]){p.group.position.copy(mid);p.position.copy(mid);p.group.scale.setScalar(.025);destroyed.add(p);p.destroyed=true}
    if(!c.hit){c.hit=true;ringAt(mid,'#ffd9af',Math.max(c.p.size,c.q.size)*3,3);for(let i=0;i<2;i++)worldPulse(c.p,'#ffbc88',2)}
   }
   if(t>=1)c.done=true;
  }
  for(let i=collisions.length-1;i>=0;i--)if(collisions[i].done)collisions.splice(i,1);
  if(rebirth){
   rebirth.age+=dt;const t=Math.min(1,rebirth.age/rebirth.life),e=t*t*(3-2*t);
   for(const p of planets){const origin=rebirth.starting.get(p)||.025;p.group.scale.setScalar(origin+(1-origin)*e)}
   if(t>=1){for(const p of planets){p.group.scale.setScalar(1);p.destroyed=false}destroyed.clear();rebirth=null}
  }
  for(const p of planets){if(p.heatTimer>0){p.heatTimer-=dt;if(p.surface&&p.surface.material)p.surface.material.emissiveIntensity=.45+p.heatTimer*.22}}
  for(let i=shots.length-1;i>=0;i--){
   const s=shots[i];s.age+=dt;if(s.age<0)continue;
   const t=Math.min(1,s.age/s.life);s.mesh.position.lerpVectors(s.begin,s.end,t*t*(3-2*t));
   s.mesh.scale.setScalar(Math.max(.05,1-t*.8));
   if(t>=1){worldPulse(s.p,'#ffca86',.4);scene.remove(s.mesh);s.mesh.material.dispose();s.mesh.geometry.dispose();shots.splice(i,1)}
  }
  for(let i=rings.length-1;i>=0;i--){
   const o=rings[i];o.age+=dt;const t=o.age/o.life;
   if(o.sprite){o.mesh.material.opacity=Math.max(0,.75*(1-t));o.mesh.scale.setScalar(o.base*(1+t*2))}
   else{o.mesh.quaternion.copy(camera.quaternion);o.mesh.scale.setScalar(1+t*2.9);o.mesh.material.opacity=Math.max(0,.76*(1-t))}
   if(t>=1){scene.remove(o.mesh);if(o.mesh.geometry)o.mesh.geometry.dispose();o.mesh.material.dispose();rings.splice(i,1)}
  }
  if(blackHole){
   const h=blackHole;h.age+=dt;h.group.position.copy(h.p.position);
   h.disk.quaternion.copy(camera.quaternion);h.disk.rotateZ(h.age*.5);
   h.disk2.quaternion.copy(camera.quaternion);h.disk2.rotateZ(-h.age*.32);
   if(!rebirth){h.p.group.scale.setScalar(Math.max(.05,1-h.age*.13));if(h.age>7){destroyed.add(h.p);h.p.destroyed=true}}
  }
  // Adaptive LOD: do not animate/draw thousands of tiny city sprites from galaxy view.
  qualityTimer+=dt;
  if(qualityTimer>.65){
   qualityTimer=0;
   for(const p of planets){
    const dist=camera.position.distanceTo(p.position);
    const detailed=api.mode()==='observe'&&api.target()===p || dist<p.size*7.5;
    if(p.detailed!==detailed){
     p.detailed=detailed;
     if(p._highGeometry&&p._lowGeometry)p.surface.geometry=detailed?p._highGeometry:p._lowGeometry;
     for(const a of p.population||[])a.sprite.visible=detailed;
     for(const o of p.realBuildings||[])o.visible=detailed;
     for(const o of p.proceduralBuildings||[])o.visible=detailed&&!(p.loadedTypes>=1);
     for(const s of p.shuttles||[])s.mesh.visible=detailed;
     for(const l of p.life||[])l.object.visible=detailed;
    }
   }
  }
  // If autonomous travel is enabled, perform real cinematic warp sequences.
  if(auto&&api.mode()!=='warp'&&api.mode()!=='return'){
   autoClock+=dt;
   if(autoClock>6&&autoLeg===0){autoLeg=1;const p=planets[Math.floor((galaxyNumber*7+stageNumber)%planets.length)];if(p)api.navigateTo(p)}
   if(autoClock>31&&autoLeg===1){autoLeg=2;api.navigateTo(null)}
   if(autoClock>42){switchGalaxy(galaxyNumber+1,true);autoClock=0;autoLeg=0}
  }
  // Autonomous visual storytelling continues when no local track is currently playing.
  if(auto&&(!api.audio().src||api.audio().ended)){
   decorationClock+=dt;
   if(decorationClock>15){decorationClock=0;event(['meteor','supernova','eruption'][Math.floor(Math.random()*3)],6)}
  }else decorationClock=0;
  lowFrameTime=lowFrameTime*.98+dt*.02;
  if(lowFrameTime>.042&&renderer.getPixelRatio()>1.01)renderer.setPixelRatio(1);
 }
 function onTrack(){
  decorationClock=0;autoClock=0;autoLeg=0;
  if(auto)switchGalaxy(galaxyNumber+1,true);
 }
 const roofRaycaster=new THREE.Raycaster();
 let lastRoofSample=0,lastRoofPlanet=null,lastRoofClearance=0;
 function preventCameraClip(){
  // Protect the observer camera from intersecting planetary geometry.
  if(api.mode()==='warp'||api.mode()==='return')return;
  for(const p of planets){
   const v=camera.position.clone().sub(p.position);let minimum=p.size*1.065;
   if(v.lengthSq()<p.size*p.size*4&&p.bodyGroup){
    const local=v.clone().normalize().applyAxisAngle(new THREE.Vector3(0,1,0),-(p.bodyGroup.rotation.y||0));
    // A simple spherical collision field keeps the orbit camera above skyscraper roofs.
    for(const plan of api.cityBlueprint(p)){
     if(plan.kind==='building'&&local.dot(plan.unit)>.995){
      minimum=Math.max(minimum,p.size*1.008+plan.height*1.1);
     }
    }
   }
   // Mesh-accurate roof collision on a close-up planet, throttled for mobile GPUs.
   // Unlike the old height proxy, this uses the actual loaded GLB city geometry.
   if(api.mode()==='observe'&&api.target()===p&&p.realBuildings?.length&&v.lengthSq()<p.size*p.size*3.24){
    const now=performance.now();
    if(lastRoofPlanet!==p||now-lastRoofSample>120){
     lastRoofPlanet=p;lastRoofSample=now;lastRoofClearance=0;
     p.group.updateMatrixWorld(true);
     roofRaycaster.set(p.position,v.clone().normalize());
     roofRaycaster.near=p.size*.99;roofRaycaster.far=p.size*1.85;
     const meshes=p.realBuildings.filter(o=>o.visible);
     for(const hit of roofRaycaster.intersectObjects(meshes,false)){
      lastRoofClearance=Math.max(lastRoofClearance,hit.distance+p.size*.019);
     }
    }
    minimum=Math.max(minimum,lastRoofClearance);
   }
   if(v.lengthSq()<minimum*minimum){
    if(api.mode()==='observe'&&api.target()===p)api.raiseObservationDistance(minimum);
    if(v.lengthSq()<.0001)v.set(0,0,1);
    camera.position.copy(p.position).add(v.normalize().multiplyScalar(minimum));
    if(api.mode()==='observe')camera.lookAt(p.position);
   }
  }
 }
 if(ui.auto)ui.auto.addEventListener('click',()=>setAuto(!auto));
 if(ui.next)ui.next.addEventListener('click',()=>{manualOverride();switchGalaxy(galaxyNumber+1)});
 if(ui.home)ui.home.addEventListener('click',()=>{manualOverride();switchGalaxy(0)});
 if(ui.spotify)ui.spotify.addEventListener('click',()=>window.open('https://open.spotify.com/','_blank','noopener,noreferrer'));
 document.getElementById('destinations')?.addEventListener('pointerdown',manualOverride);
 document.getElementById('return')?.addEventListener('pointerdown',manualOverride);
 document.getElementById('radar')?.addEventListener('pointerdown',manualOverride);
 window.cosmosInfinite={nextGalaxy:()=>{manualOverride();switchGalaxy(galaxyNumber+1)},homeGalaxy:()=>{manualOverride();switchGalaxy(0)},setAutopilot:setAuto};
 updateUI();
 return {event,tick,onTrack,manualOverride,preventCameraClip,resetStory,resetVisuals,galaxyNumber:()=>galaxyNumber};
}