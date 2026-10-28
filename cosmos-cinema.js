/* COSM.OS INFINITE EPOCH • v4 • song-timed cinematic director
 * Audio clock controls the film; BPM controls edit cadence. Not spectrum-reactive.
 * Preserve the original Navigator and all its features.
 */
export function installCosmicCinema(api) {
 const {THREE,scene,camera,planets,audio,galacticDirector,say,getBPM}=api;
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};
 const vec=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
 const seeded=n=>()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296};
 const pick=(a,r)=>a[Math.floor(r()*a.length)];
 const cultures=['ORBITAL COMMONWEALTH','TIDAL REPUBLIC','SYNTHETIC SYNDICATE','CRYSTAL DYNASTY','FREE COLONIES','NOMAD FLOTILLA','CELESTIAL FEDERATION','CROWN WORLDS'];
 const faiths=['KEEPERS OF FIRST LIGHT','ORDER OF THE TWIN MOONS','CHILDREN OF THE GREAT SPIRAL','PILGRIMS OF THE NINTH DAWN','THE ETERNAL TIDE','COVENANT OF THE GLASS SUN','SILENT STAR CHURCH','ARCHIVISTS OF THE LAST SIGNAL'];
 const philosophies=['reincarnation in starlight','communal memory','sacred silence','harmonic mathematics','the living ocean','ancestor constellations','the eternal migration','the first machine'];
 const scenes=[{name:'GENESIS',sub:'A UNIVERSE IS BORN',start:0,end:.2},{name:'ASCENSION',sub:'CIVILIZATIONS & FAITHS',start:.2,end:.45},{name:'THE LONG WAR',sub:'FLEETS CROSS THE VOID',start:.45,end:.75},{name:'AFTERMATH',sub:'EXODUS & RECONSTRUCTION',start:.75,end:.9},{name:'SINGULARITY',sub:'EVERYTHING BECOMES ONE',start:.9,end:1}];
 const civilizations=new Map(),ships=[],ufos=[],beacons=[],bolts=[],scaleBackup=new Map();
 const cluster=new THREE.Group(),singularity=new THREE.Group();scene.add(cluster);cluster.add(singularity);
 let random=seeded(437),universe=0,cycle=0,demo=0,lastT=0,lastP=-1,lastScene=-1,lastShot=-1,lastBar=-1,enabled=true,activeSrc='',blend=false,flash=0;
 const el=document.createElement('style');
 el.textContent=[
 '#epochUI{position:fixed;inset:0;z-index:6;pointer-events:none;color:#e5f6ff;font-family:system-ui,-apple-system,sans-serif}',
 '#epochUI *{box-sizing:border-box}#epochMode{position:absolute;right:13px;top:max(50px,env(safe-area-inset-top) + 42px);pointer-events:auto;color:#e3f4ff;border:1px solid #91c6dc70;border-radius:16px;background:#081a2be5;backdrop-filter:blur(16px);font:800 10px monospace;letter-spacing:.1em;padding:12px;cursor:pointer}',
 '#epochMode.on{background:#0b3238e8;color:#afffeb;border-color:#59e8d5a2}',
 '#epochIntel{position:absolute;top:max(100px,env(safe-area-inset-top) + 90px);right:13px;width:min(270px,43vw);border:1px solid #75b5cf55;border-radius:15px;background:linear-gradient(125deg,#07152be8,#0a1c2cc9);backdrop-filter:blur(20px);padding:14px 14px;box-shadow:0 10px 40px #000a}',
 '#epochIntel .ey{font:800 9px monospace;letter-spacing:.13em;color:#78d6ea}#epochIntel h3{font:900 17px system-ui;margin:9px 0 5px}#epochIntel p{font:600 10px/1.6 system-ui;color:#b7cde1;margin:4px 0}#epochIntel .meta{font:800 9px/1.6 monospace;color:#9adfe1;margin-top:8px}',
 '#epochIntel button{pointer-events:auto;border:1px solid #83bed977;border-radius:10px;background:#1a344c;color:#ddf9ff;padding:9px;width:100%;margin-top:10px;font:800 9px monospace;cursor:pointer}',
 '#epochAct{position:absolute;left:17px;bottom:max(209px,env(safe-area-inset-bottom) + 208px);width:min(68vw,560px);text-shadow:0 2px 18px #000e}#epochAct strong{display:block;font-size:clamp(19px,4.5vw,34px);letter-spacing:.05em;font-weight:950}#epochAct small{display:block;margin-top:5px;color:#add0e6;font:800 10px monospace;letter-spacing:.12em}',
 '#epochTimeline{position:absolute;bottom:max(89px,env(safe-area-inset-bottom) + 87px);left:12px;right:12px;max-width:690px;margin:auto;padding:12px 15px;border:1px solid #83bbdb55;border-radius:15px;background:#071529d9;backdrop-filter:blur(20px);box-shadow:0 10px 40px #0009}',
 '#epochTimeline .row{display:flex;justify-content:space-between;gap:8px;align-items:center}#epochStage{font:900 10px monospace;letter-spacing:.08em}#epochClock{font:700 10px monospace;color:#9dcde4}',
 '#epochBar{height:4px;margin:13px 0 9px;border-radius:7px;background:#335168;overflow:hidden}#epochFill{height:100%;width:0;background:linear-gradient(90deg,#62bdff,#a3ffd7,#fdd694);box-shadow:0 0 12px #53cafa}',
 '#epochMarkers{display:flex;justify-content:space-between;color:#84a7bf;font:700 8px monospace;letter-spacing:.03em}#epochGlow{position:absolute;inset:0;opacity:0;pointer-events:none;background:radial-gradient(circle,#d9ffffb0,#9c99ff33 34%,transparent 75%);mix-blend-mode:screen}',
 '#epochVortex{position:absolute;left:50%;top:50%;width:min(66vw,470px);aspect-ratio:1;transform:translate(-50%,-50%) scale(.5);opacity:0;pointer-events:none;border-radius:50%;border:2px solid #b7b6ff;background:radial-gradient(circle,#000 0 25%,#130f37 29%,#957afb87 39%,#303e8c22 52%,transparent 72%);box-shadow:0 0 50px #896dff7a,0 0 120px #4674ff50,inset 0 0 36px #a9a4ff}',
 'body.epochOn #hint{opacity:0!important}body.epochOn #personaCard{opacity:0!important;pointer-events:none}',
 'body:not(.epochOn) #epochIntel,body:not(.epochOn) #epochTimeline,body:not(.epochOn) #epochAct{display:none}',
 '@media(max-width:600px){#epochIntel{width:45vw;padding:9px 10px;top:max(104px,env(safe-area-inset-top) + 96px)}#epochIntel h3{font-size:13px}#epochIntel p{font-size:9px}#epochIntel .meta{font-size:8px}#epochAct{bottom:max(204px,env(safe-area-inset-bottom) + 205px)}#epochTimeline{bottom:max(87px,env(safe-area-inset-bottom) + 84px);padding:11px}#epochMarkers{font-size:7px}}',
 '@media(prefers-reduced-motion:reduce){#epochGlow,#epochVortex{transition:none}}'
 ].join('');
 document.head.appendChild(el);
 const u=document.createElement('div');u.id='epochUI';
 u.innerHTML='<div id="epochGlow"></div><div id="epochVortex"></div><button id="epochMode" class="on" aria-pressed="true">◉ CINEMA · ON</button><section id="epochIntel"><div class="ey">CIVILIZATION INTELLIGENCE</div><h3 id="epochWorld">THE EIGHTFOLD ATLAS</h3><p id="epochGov">Eight inhabited planets</p><p id="epochFaith"></p><div class="meta" id="epochStatus">AWAITING FIRST CONTACT</div><button id="epochExplore">◈ RETURN TO FREE EXPLORATION</button></section><div id="epochAct"><strong id="epochTitle">THE INFINITE EPOCH</strong><small id="epochSubtitle">ONE SONG · ONE UNIVERSE · INFINITE LIVES</small></div><section id="epochTimeline"><div class="row"><div id="epochStage">GENESIS · A UNIVERSE IS BORN</div><div id="epochClock">00:00 / DEMO</div></div><div id="epochBar"><div id="epochFill"></div></div><div id="epochMarkers"><span>GENESIS</span><span>ASCENSION</span><span>WAR</span><span>AFTERMATH</span><span>∞</span></div></section>';
 document.body.appendChild(u);const $=id=>document.getElementById(id);
 const hullGeo=new THREE.ConeGeometry(.17,.8,5),wingGeo=new THREE.BoxGeometry(.63,.03,.21),glassGeo=new THREE.SphereGeometry(.13,8,6),beamGeo=new THREE.CylinderGeometry(.025,.025,1,5);
 const hullMat=new THREE.MeshStandardMaterial({color:0xbcdce9,roughness:.18,metalness:.84,emissive:0x194d7f,emissiveIntensity:.35});
 const wingMat=new THREE.MeshBasicMaterial({color:0x72e9ff}),enemyMat=new THREE.MeshBasicMaterial({color:0xff8466}),portalMat=new THREE.MeshBasicMaterial({color:0x66ffa0,transparent:true,opacity:.8});
 for(let i=0;i<(innerWidth<700?12:20);i++){
  const g=new THREE.Group(),enemy=i%4===0;
  const hull=new THREE.Mesh(hullGeo,hullMat);hull.rotation.x=Math.PI/2;g.add(hull);
  g.add(new THREE.Mesh(wingGeo,enemy?enemyMat:wingMat));
  const canopy=new THREE.Mesh(glassGeo,enemy?enemyMat:wingMat);canopy.position.set(0,.1,-.18);g.add(canopy);
  cluster.add(g);ships.push({g,i,source:i%8,dest:(i*3+3)%8,enemy});
 }
 
 // Civilian saucers, each carrying a visible little alien pilot.
 const saucerGeo=new THREE.SphereGeometry(.53,16,8),headGeo=new THREE.SphereGeometry(.17,10,7),eyeGeo=new THREE.SphereGeometry(.034,7,5);
 const alienMat=new THREE.MeshStandardMaterial({color:0x95d9a0,emissive:0x2b7d59,emissiveIntensity:.38});
 for(let i=0;i<(innerWidth<700?7:12);i++){
  const craft=new THREE.Group(),saucer=new THREE.Mesh(saucerGeo,i%3?wingMat:enemyMat);
  saucer.scale.set(1,.22,1);craft.add(saucer);
  const dome=new THREE.Mesh(headGeo,alienMat);dome.position.y=.27;dome.scale.set(1,1.3,1);craft.add(dome);
  for(const x of [-.075,.075]){const eye=new THREE.Mesh(eyeGeo,bhPreEye());eye.position.set(x,.30,.145);craft.add(eye)}
  const antenna=new THREE.Mesh(new THREE.ConeGeometry(.035,.22,5),wingMat);antenna.position.y=.54;craft.add(antenna);
  cluster.add(craft);ufos.push({craft,i,world:i%8});
 }
 function bhPreEye(){return new THREE.MeshBasicMaterial({color:0x10102c})}
 for(let i=0;i<12;i++){const mesh=new THREE.Mesh(beamGeo,i%2?enemyMat:wingMat);cluster.add(mesh);bolts.push(mesh)}
 for(let i=0;i<8;i++){const mesh=new THREE.Mesh(new THREE.TorusGeometry(1,.017,5,56),new THREE.MeshBasicMaterial({color:0x8ad4ff,transparent:true,opacity:.16}));cluster.add(mesh);beacons.push(mesh)}
 const bhMat=new THREE.MeshBasicMaterial({color:0x000005}),ringMat=new THREE.MeshBasicMaterial({color:0xb5aaff,transparent:true,opacity:.73,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending});
 const hole=new THREE.Mesh(new THREE.SphereGeometry(1.65,28,18),bhMat);
 const disk=new THREE.Mesh(new THREE.TorusGeometry(2.4,.23,9,96),ringMat),disk2=new THREE.Mesh(new THREE.TorusGeometry(3.1,.07,7,96),ringMat.clone());
 singularity.add(hole,disk,disk2);singularity.visible=false;
 const easterEgg=new THREE.Group(),eggRing=new THREE.Mesh(new THREE.TorusGeometry(.7,.09,7,48),portalMat);easterEgg.add(eggRing);
 const eggShip=new THREE.Mesh(new THREE.SphereGeometry(.25,12,8),wingMat);eggShip.scale.set(1,.3,1);easterEgg.add(eggShip);cluster.add(easterEgg);easterEgg.visible=false;
 function spawnSocieties(seed){
  random=seeded(12345+seed*977);civilizations.clear();
  for(let i=0;i<planets.length;i++){const p=planets[i];civilizations.set(p,{name:p.name.split(' · ')[0],society:pick(cultures,random),religion:pick(faiths,random),belief:pick(philosophies,random),population:(.3+random()*9).toFixed(1),technology:2+Math.floor(random()*8),opponent:(i+2+Math.floor(random()*3))%Math.max(1,planets.length)});}
  selectWorld(planets[0],0);
 }
 function selectWorld(p,t){const c=civilizations.get(p);if(!c)return;
  $('epochWorld').textContent=c.name.toUpperCase();
  $('epochGov').textContent=c.society+' · '+c.population+'B citizens';
  $('epochFaith').textContent='FAITH: '+c.religion;
  $('epochStatus').textContent=(t>.45&&t<.75?'⚔ AT WAR WITH '+(planets[c.opponent]?.name.split(' · ')[0]||'UNKNOWN'):t>=.75&&t<.9?'REBUILDING THE HOMEWORLD':t>=.9?'EVENT HORIZON WARNING':'TECHNOLOGY: TIER '+c.technology)+' · '+c.belief.toUpperCase();
 }
 function restore(){for(const [p,s] of scaleBackup)if(p.group)p.group.scale.setScalar(s);scaleBackup.clear()}
 function newUniverse(change=true){
  restore();
  if(change)window.cosmosInfinite?.nextGalaxy?.();
  universe=galacticDirector?.galaxyNumber?.()||universe+1;cycle++;
  spawnSocieties(cycle+universe);
  lastScene=-1;lastShot=-1;lastBar=-1;blend=false;singularity.visible=false;easterEgg.visible=false;flash=1;
 }
 function onTrack(){
  const src=audio.src||'';
  if(activeSrc&&src!==activeSrc)newUniverse(true);
  activeSrc=src;demo=0;lastT=0;lastP=-1;lastScene=-1;lastBar=-1;blend=false;
 }
 function toggle(b){enabled=!!b;document.body.classList.toggle('epochOn',enabled);
  $('epochMode').classList.toggle('on',enabled);$('epochMode').textContent=enabled?'◉ CINEMA · ON':'◉ CINEMA · OFF';$('epochMode').setAttribute('aria-pressed',String(enabled));
  cluster.visible=enabled;restore();singularity.visible=false;$('epochVortex').style.opacity=0;
  if(enabled){window.cosmosInfinite?.setAutopilot?.(false);blend=false;lastScene=-1;say('THE INFINITE EPOCH · CINEMA ONLINE',3)}
  else say('ORIGINAL NAVIGATOR · FREE FLIGHT',3);
 }
 function cam(position,look,dt){
  const alpha=blend?1-Math.exp(-dt*1.9):1;
  camera.position.lerp(position,alpha);
  camera.up.set(0,1,0);camera.lookAt(look);blend=true;
 }
 function clock(dt){
  if(audio.src&&Number.isFinite(audio.duration)&&audio.duration>0)return {t:audio.currentTime,length:audio.duration,audio:true};
  if(!audio.src)demo+=dt;
  return {t:demo%120,length:120,audio:false};
 }
 function stamp(t){t=Math.max(0,Math.floor(t));return String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0')}
 function update(dt){
  if(!enabled)return;
  const time=clock(dt),t=time.t,length=time.length,progress=clamp(t/Math.max(1,length),0,1);
  if(lastP>=0&&(progress<lastP-.4||(!time.audio&&t<lastT-.5)))newUniverse(true);
  const bpm=clamp(Number(getBPM())||110,55,190);
  const a=scenes.findIndex(s=>progress<s.end),act=a<0?4:a;
  if(lastScene!==act){lastScene=act;lastShot=-1;blend=false;flash=1;
   const s=scenes[act];$('epochStage').textContent=s.name+' · '+s.sub;
   $('epochTitle').textContent=['BEFORE THERE WAS TIME','A THOUSAND LIVING WORLDS','THE STARS TAKE SIDES','THE SURVIVORS REMEMBER','EVERY UNIVERSE ENDS'][act];
   $('epochSubtitle').textContent=['FROM STARDUST TO SOLAR SYSTEMS','CULTURE · FAITH · DISCOVERY','ARMADAS · ALLIANCES · CONQUEST','EXODUS · RECOVERY · RENEWAL','A NEW UNIVERSE WILL FOLLOW'][act];
  }
  // BPM controls bar-aligned edits and choreographed flight speed, not spectral brightness.
  const bar=Math.floor(t*bpm/240);if(bar!==lastBar){lastBar=bar;if(bar%4===0)flash=.28}
  $('epochClock').textContent=stamp(t)+' / '+stamp(length)+' · '+Math.round(bpm)+' BPM'+(time.audio?'':' · DEMO');
  $('epochFill').style.width=(progress*100).toFixed(3)+'%';
  $('epochGlow').style.opacity=String(Math.min(.4,flash*.22));flash=Math.max(0,flash-dt*1.4);
  const phase=(progress-scenes[act].start)/(scenes[act].end-scenes[act].start),shots=act===0?3:act===2?7:act===4?1:5;
  const shot=Math.min(shots-1,Math.floor(clamp(phase,0,.999)*shots));
  const p=planets[(act*3+shot+cycle)%Math.max(1,planets.length)];
  if(!p)return;
  if(shot!==lastShot){lastShot=shot;selectWorld(p,progress)}
  // Slow, cinematic tracking shots. Objects exist in 3D, not a flat music overlay.
  let pos,look;
  if(act===0){const angle=t*.024+cycle*.5;pos=vec(Math.cos(angle)*64,17+Math.sin(t*.03)*8,Math.sin(angle)*64);look=vec();}
  else if(act===4){const radius=40-24*smooth(phase);pos=vec(Math.cos(t*.015)*radius,5+4*Math.sin(t*.05),Math.sin(t*.015)*radius);look=vec();}
  else {const angle=t*(act===2?.14:.11)+shot*1.8;
   const radius=p.size*(act===2?5.8:act===3?3.2:3.9)+3;
   pos=vec(p.position.x+Math.cos(angle)*radius,p.position.y+radius*(.25+.12*Math.sin(t*.15)),p.position.z+Math.sin(angle)*radius);
   look=p.position.clone();
  }
  cam(pos,look,dt);
  const velocity=clamp(bpm/110,.55,1.8);
  ships.forEach((ship,i)=>{
   const visible=act!==4&&i<(act===0?4:act===3?Math.floor(ships.length*.7):ships.length)&&planets.length>1;
   ship.g.visible=visible;if(!visible)return;
   const origin=planets[ship.source%planets.length],destination=planets[ship.dest%planets.length];
   const u=(t*(.008+.002*(i%4))*velocity+i*.19)%1;
   const xyz=origin.position.clone().lerp(destination.position,smooth(u));
   xyz.y+=Math.sin(u*Math.PI)*(3+i%5);xyz.z+=Math.sin(u*Math.PI)*(i%2?-4:4);
   ship.g.position.copy(xyz);
   const dir=destination.position.clone().sub(origin.position).normalize();
   ship.g.quaternion.setFromUnitVectors(vec(0,0,-1),dir);
   ship.g.scale.setScalar(act===2?.9:.55+(i%4)*.1);
  });
  ufos.forEach((u,i)=>{
   const p=planets[u.world%planets.length],a=t*(.055+.012*(i%3))*velocity+i*1.72;
   u.craft.visible=act!==4&&act!==0&&!!p;
   if(!u.craft.visible)return;
   const radius=p.size*(2.3+i%3*.45);
   u.craft.position.set(p.position.x+Math.cos(a)*radius,
     p.position.y+Math.sin(a*.8)*radius*.27,p.position.z+Math.sin(a)*radius);
   u.craft.rotation.y=-a+Math.PI*.5;u.craft.rotation.z=Math.sin(t*.9+i)*.12;
 });
  bolts.forEach((laser,i)=>{
   const a=ships[(i*3)%ships.length],b=ships[(i*3+7)%ships.length];
   const fire=act===2&&a.g.visible&&b.g.visible&&((t*velocity*.7+i*.31)%3)<.48;
   laser.visible=fire;if(!fire)return;
   const diff=b.g.position.clone().sub(a.g.position),distance=diff.length();
   laser.position.copy(a.g.position).addScaledVector(diff,.5);
   laser.quaternion.setFromUnitVectors(vec(0,1,0),diff.normalize());
   laser.scale.set(1,Math.max(.1,distance),1);
  });
  beacons.forEach((ring,i)=>{
   const world=planets[i%planets.length];
   ring.visible=act!==4&&!!world;if(!world)return;
   ring.position.copy(world.position);ring.quaternion.copy(camera.quaternion);
   ring.scale.setScalar(world.size*(2+Math.sin(t*.4+i)*.2));
   ring.material.opacity=act===2?.22:.12;
  });
  // Original Easter egg: little green portal near the fourth world, sector C-137.
  easterEgg.visible=act===1&&phase>.46&&phase<.91&&planets.length>3;
  if(easterEgg.visible){easterEgg.position.copy(planets[3].position).add(vec(2.4,1.5,2));easterEgg.rotation.z+=dt*1.3;easterEgg.rotation.y+=dt*.7}
  singularity.visible=act===4;
  if(act===4){
   const x=smooth(phase);
   singularity.position.set(0,0,0);singularity.scale.setScalar(.5+x*6);
   disk.quaternion.copy(camera.quaternion);disk2.quaternion.copy(camera.quaternion);
   disk.rotation.z+=t*.016;disk2.rotation.z-=t*.011;
   if(scaleBackup.size===0)for(const world of planets)scaleBackup.set(world,world.group.scale.x);
   for(const world of planets)world.group.scale.setScalar(Math.max(.008,(scaleBackup.get(world)||1)*(1-smooth((x-.16)/.8))));
   $('epochVortex').style.opacity=String(clamp((x-.1)*1.7,0,.85));
   $('epochVortex').style.transform='translate(-50%,-50%) rotate('+(t*6).toFixed(1)+'deg) scale('+(0.5+x*2)+')';
  }else {if(scaleBackup.size)restore();$('epochVortex').style.opacity=0}
  lastP=progress;lastT=t;
 }
 $('epochMode').addEventListener('click',()=>toggle(!enabled));
 $('epochExplore').addEventListener('click',()=>{toggle(false);say('TAP SPACE OR OPEN RADAR TO EXPLORE WORLDS',4)});
 document.body.classList.add('epochOn');spawnSocieties(1000);
 return {update,onTrack,toggle,get enabled(){return enabled},next:()=>{newUniverse(true);demo=0;lastP=-1}};
}
