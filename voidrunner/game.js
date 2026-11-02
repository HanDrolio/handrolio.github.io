let THREE;
try { THREE = await import('https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js'); }
catch { THREE = await import('https://unpkg.com/three@0.170.0/build/three.module.js'); }

// VOIDRUNNER 2.0: procedural Three.js corridor + eight hand-rendered 2D ship frames.
const $ = id => document.getElementById(id);
const world = $('world'), sprites = $('sprites'), ink = sprites.getContext('2d');
const overlay = $('overlay'), headline = $('headline'), message = $('message');
const scoreLabel = $('score'), bestLabel = $('best'), shieldLabel = $('shield');
const trackInput = $('track'), trackName = $('track-name'), volumeControl = $('volume');
const startButton = $('start'), soundButton = $('sound'), pauseButton = $('pause');
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const random = (a, b) => a + Math.random() * (b - a);
const RANGE_X = 4.4, RANGE_Y = 2.8, PLAYER_Z = 7, SPAWN_Z = -105;
const state = {phase:'ready', score:0, best:0, shield:3, elapsed:0, speed:32, nextSpawn:1.2, invincible:0, shake:0, muted:false, volume:.65, prevA:false,prevMenu:false,prevB:false, padName:'', last:0};
try{state.best=Number(localStorage.getItem('voidrunner-best')||0)||0}catch{}
let w=innerWidth,h=innerHeight, pixelRatio=1, pointer=null, obstacles=[], particles=[];
const ship = {x:0,y:0,tilt:0,thruster:0};
const keys = new Set();
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x030618);
scene.fog = new THREE.FogExp2(0x080c2b, .009);
const camera = new THREE.PerspectiveCamera(73,w/h,.1,220);
camera.position.set(0,0,13);
camera.lookAt(0,0,-30);
const renderer = new THREE.WebGLRenderer({canvas:world,antialias:false,powerPreference:'high-performance',alpha:false});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.7));
renderer.setSize(w,h,false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.3;
const mat=(color,opacity=1)=>new THREE.MeshBasicMaterial({color,transparent:opacity<1,opacity,depthWrite:opacity===1});
const cyan=mat(0x67e3ff), pink=mat(0xff3988), gold=mat(0xffd86d), dark=mat(0x191e48), glow=mat(0x287dff,.16);
scene.add(new THREE.AmbientLight(0x7dbdff,.8));
const light1=new THREE.PointLight(0x1b8aff,70,45);light1.position.set(0,3,6);scene.add(light1);
const light2=new THREE.PointLight(0xfa368c,50,40);light2.position.set(-6,-1,-5);scene.add(light2);

// Enormous moving hexagonal rings, rails and stars form a genuine perspective scene.
const ringGeometry = new THREE.TorusGeometry(7.2,.055,5,6);
const rings=[];
for(let i=0;i<17;i++){
  const group=new THREE.Group();
  const edge=new THREE.Mesh(ringGeometry,i%3===0?pink:cyan);group.add(edge);
  const halo=new THREE.Mesh(new THREE.TorusGeometry(7.2,.25,5,6),mat(i%3===0?0xff2b74:0x3a9bff,.075));group.add(halo);
  for(let k=0;k<6;k++){
    let a=k*Math.PI/3;
    const pin=new THREE.Mesh(new THREE.BoxGeometry(.55,.1,.12),mat(k%2?0xffd666:0x5feaff,.75));
    pin.position.set(Math.cos(a)*7.2,Math.sin(a)*7.2,0);pin.rotation.z=a+Math.PI/2;group.add(pin);
  }
  group.position.z=SPAWN_Z+i*7.2;rings.push(group);scene.add(group);
}
for(let j=0;j<6;j++){
 const a=j*Math.PI/3;
 const rail=new THREE.Mesh(new THREE.CylinderGeometry(.027,.027,170,6),mat(j%2?0x297dce:0x4b358f,.55));
 rail.rotation.x=Math.PI/2;rail.position.set(Math.cos(a)*7.2,Math.sin(a)*7.2,-67);scene.add(rail);
}
const starN=680, starPositions=new Float32Array(starN*3);
for(let i=0;i<starN;i++){starPositions[i*3]=random(-65,65);starPositions[i*3+1]=random(-45,45);starPositions[i*3+2]=random(-160,9)}
const starsGeo=new THREE.BufferGeometry();starsGeo.setAttribute('position',new THREE.BufferAttribute(starPositions,3));
const stars=new THREE.Points(starsGeo,new THREE.PointsMaterial({color:0xaadfff,size:.15,transparent:true,opacity:.78,sizeAttenuation:true}));scene.add(stars);
const geometry={shard:new THREE.IcosahedronGeometry(1,1),cube:new THREE.BoxGeometry(1.6,1.6,1.6),cross:new THREE.OctahedronGeometry(1.2),pickup:new THREE.TorusGeometry(.73,.22,7,12)};
const playerCollisionRadius=.65;

function addHazard(x,y,kind='shard'){
 const g=geometry[kind]||geometry.shard;
 const mesh=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:kind==='cube'?0x44112e:0x6b133f,emissive:0xef226f,emissiveIntensity:1.6,roughness:.28,metalness:.65,flatShading:true}));
 mesh.position.set(x,y,SPAWN_Z);mesh.scale.setScalar(kind==='cross'?1:random(.85,1.3));
 const outline=new THREE.LineSegments(new THREE.EdgesGeometry(g),new THREE.LineBasicMaterial({color:0xff9ac0,transparent:true,opacity:.85}));mesh.add(outline);
 const aura=new THREE.Mesh(new THREE.SphereGeometry(1.28,8,7),mat(0xff3078,.075));mesh.add(aura);
 scene.add(mesh);obstacles.push({mesh,x,y,kind,size:1.05,collect:false,dead:false,spin:random(-2,2)});
}
function addPickup(x,y){const mesh=new THREE.Group();const torus=new THREE.Mesh(geometry.pickup,new THREE.MeshBasicMaterial({color:0xffde72}));mesh.add(torus);const core=new THREE.Mesh(new THREE.OctahedronGeometry(.28),new THREE.MeshBasicMaterial({color:0xffeeac}));mesh.add(core);mesh.position.set(x,y,SPAWN_Z);scene.add(mesh);obstacles.push({mesh,x,y,size:.7,collect:true,dead:false,spin:2})}
function spawnWave(){
 const kind=['shard','cube','cross'][Math.floor(Math.random()*3)];
 const x=random(-RANGE_X,RANGE_X),y=random(-RANGE_Y,RANGE_Y);
 addHazard(x,y,kind);
 if(state.elapsed>14&&Math.random()<.48){let xx=clamp(x+random(-3.8,3.8),-RANGE_X,RANGE_X), yy=clamp(y+random(-2.6,2.6),-RANGE_Y,RANGE_Y);if(Math.hypot(xx-x,yy-y)>1.4)addHazard(xx,yy,kind)}
 if(Math.random()<.57){let xx=clamp(x+random(-3.2,3.2),-RANGE_X,RANGE_X),yy=clamp(y+random(-2.6,2.6),-RANGE_Y,RANGE_Y);if(Math.hypot(xx-x,yy-y)>1.8)addPickup(xx,yy)}
}
function removeObstacle(o){scene.remove(o.mesh);o.mesh.traverse(obj=>{if(obj.geometry&&!Object.values(geometry).includes(obj.geometry)&&obj.geometry!==ringGeometry)obj.geometry.dispose();if(obj.material&&!Object.values({cyan,pink,gold,dark,glow}).includes(obj.material))obj.material.dispose()});o.dead=true}
function burst(x,y,color,count=26){const v=new THREE.Vector3(x,y,PLAYER_Z).project(camera);let px=(v.x*.5+.5)*w,py=(-v.y*.5+.5)*h;for(let i=0;i<count;i++){let a=random(0,Math.PI*2),speed=random(100,410);particles.push({x:px,y:py,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,life:random(.3,.75),color,r:random(2,6)})}}
function hud(){scoreLabel.textContent=String(Math.floor(state.score)).padStart(6,'0');bestLabel.textContent=String(state.best).padStart(6,'0');shieldLabel.textContent='◆ '.repeat(state.shield)+'◇ '.repeat(3-state.shield);$('speed').textContent=String(Math.round(state.speed*10))}
hud();
function showOverlay(title,msg,button){headline.innerHTML=title;message.innerHTML=msg;startButton.innerHTML=button+' <span>▶</span>';overlay.classList.add('open')}
function startGame(){for(const o of obstacles)removeObstacle(o);obstacles=[];particles=[];state.phase='playing';state.score=0;state.shield=3;state.elapsed=0;state.speed=32;state.nextSpawn=1.1;state.invincible=0;state.shake=0;ship.x=0;ship.y=0;overlay.classList.remove('open');resumeMusic();hud()}
function pauseGame(){if(state.phase!=='playing')return;state.phase='paused';showOverlay('PAUSED<span>⏸</span>','Take a breather. The void can wait.','RESUME RUN')}
function resumeGame(){state.phase='playing';overlay.classList.remove('open');resumeMusic()}
function endGame(){state.phase='over';state.best=Math.max(state.best,Math.floor(state.score));try{localStorage.setItem('voidrunner-best',String(state.best))}catch{}hud();showOverlay('SIGNAL<span> LOST</span>','DISTANCE SCORE <b>'+Math.floor(state.score)+'</b> · PERSONAL BEST <b>'+state.best+'</b><br>The void got you. The next run is yours.','RUN IT BACK')}
function action(){if(state.phase==='paused')resumeGame();else if(state.phase!=='playing')startGame()}
startButton.addEventListener('click',action);pauseButton.addEventListener('click',()=>state.phase==='paused'?resumeGame():pauseGame());
const webKeys=new Set(['arrowup','arrowdown','arrowleft','arrowright',' ','w','a','s','d','p']);
addEventListener('keydown',e=>{let k=e.key.toLowerCase();if(webKeys.has(k))e.preventDefault();if(!e.repeat&&k==='p'){state.phase==='playing'?pauseGame():state.phase==='paused'?resumeGame():null}if(k===' '&&state.phase!=='playing'&&!e.repeat)action();keys.add(k)});
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));addEventListener('blur',()=>{keys.clear();if(state.phase==='playing')pauseGame()});
world.addEventListener('pointerdown',e=>{if(state.phase!=='playing')return;pointer={id:e.pointerId,x:e.clientX,y:e.clientY,shipX:ship.x,shipY:ship.y};world.setPointerCapture(e.pointerId)});
world.addEventListener('pointermove',e=>{if(!pointer||e.pointerId!==pointer.id)return;ship.x=clamp(pointer.shipX+(e.clientX-pointer.x)/Math.max(35,w*.075),-RANGE_X,RANGE_X);ship.y=clamp(pointer.shipY-(e.clientY-pointer.y)/Math.max(35,h*.12),-RANGE_Y,RANGE_Y)});
world.addEventListener('pointerup',()=>pointer=null);world.addEventListener('pointercancel',()=>pointer=null);
function pollGamepad(){let pad=null;try{pad=Array.from(navigator.getGamepads?.()||[]).find(Boolean)||null}catch{}if(pad){if(state.padName!==pad.id){state.padName=pad.id;$('controller').textContent='🎮 BACKBONE / GAMEPAD CONNECTED'}let A=!!pad.buttons[0]?.pressed,menu=!!pad.buttons[9]?.pressed,B=!!pad.buttons[1]?.pressed;if(A&&!state.prevA&&state.phase!=='playing')action();if(menu&&!state.prevMenu){state.phase==='playing'?pauseGame():state.phase==='paused'?resumeGame():null}if(B&&!state.prevB)toggleSound();state.prevA=A;state.prevMenu=menu;state.prevB=B;const dead=v=>Math.abs(v)<.08?0:v;return [dead(pad.axes[0]||0),dead(pad.axes[1]||0)]}state.prevA=state.prevB=state.prevMenu=false;return [0,0]}
function resize(){w=innerWidth;h=innerHeight;pixelRatio=Math.min(devicePixelRatio||1,1.7);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setPixelRatio(pixelRatio);renderer.setSize(w,h,false);sprites.width=Math.round(w*pixelRatio);sprites.height=Math.round(h*pixelRatio);ink.setTransform(pixelRatio,0,0,pixelRatio,0,0)}addEventListener('resize',resize);resize();

// Pre-render an original 8-frame cosmic-surfer spaceship animation on offscreen canvases.
function makeShipFrame(frame){const can=document.createElement('canvas');can.width=can.height=256;const a=can.getContext('2d');a.translate(128,125);let flame=48+[19,30,14,27,10,26,20,35][frame];
 a.shadowBlur=28;a.shadowColor='#2deaff';a.strokeStyle='#57dcff';a.lineWidth=4;
 for(let x of [-41,41]){a.fillStyle='#0c1737';a.beginPath();a.moveTo(x-13,47);a.lineTo(x+12,47);a.lineTo(x+7,74);a.lineTo(x-8,74);a.closePath();a.fill();a.stroke();a.fillStyle='#ffe26a';a.beginPath();a.moveTo(x-8,65);a.lineTo(x+8,65);a.lineTo(x,65+flame);a.closePath();a.fill();a.fillStyle='#ff5c88';a.beginPath();a.moveTo(x-5,65);a.lineTo(x+5,65);a.lineTo(x,65+flame*.6);a.closePath();a.fill()}
 a.shadowBlur=15;a.shadowColor='#2058ff';a.fillStyle='#2042a0';a.beginPath();a.moveTo(0,-105);a.lineTo(28,-45);a.lineTo(104,49);a.lineTo(94,69);a.lineTo(36,45);a.lineTo(0,70);a.lineTo(-36,45);a.lineTo(-94,69);a.lineTo(-104,49);a.lineTo(-28,-45);a.closePath();a.fill();a.lineWidth=7;a.strokeStyle='#031126';a.stroke();a.lineWidth=4;a.strokeStyle='#9beaff';a.stroke();
 a.shadowBlur=0;a.fillStyle='#ffe16a';for(let sign of [-1,1]){a.beginPath();a.moveTo(sign*37,-7);a.lineTo(sign*89,47);a.lineTo(sign*49,31);a.closePath();a.fill()}
 a.fillStyle='#d3f7ff';a.beginPath();a.moveTo(0,-85);a.lineTo(20,-24);a.lineTo(0,11);a.lineTo(-20,-24);a.closePath();a.fill();a.fillStyle='#162b67';a.beginPath();a.ellipse(0,-31,12,23,0,0,Math.PI*2);a.fill();a.strokeStyle='#84ecff';a.lineWidth=3;a.stroke();
 a.fillStyle='#fff';a.globalAlpha=.85;a.fillRect(-4,14,8,8);a.globalAlpha=1;return can}
const shipFrames=Array.from({length:8},(_,i)=>makeShipFrame(i));
function paintShip(t,dt){ink.clearRect(0,0,w,h);if(state.phase==='ready')return;
 const coords=new THREE.Vector3(ship.x,ship.y,PLAYER_Z).project(camera);const sx=(coords.x*.5+.5)*w,sy=(-coords.y*.5+.5)*h;
 const size=clamp(Math.min(h*.43,w*.19),84,205);
 ink.save();ink.translate(sx,sy);ink.rotate(ship.tilt*.16);if(state.invincible>0&&Math.floor(t/80)%2===0)ink.globalAlpha=.35;
 ink.shadowColor='#52cbff';ink.shadowBlur=23;ink.drawImage(shipFrames[Math.floor(t/85)%8],-size/2,-size/2,size,size);ink.restore();
 for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;if(p.life<=0)continue;ink.globalAlpha=clamp(p.life*2,0,1);ink.fillStyle=p.color;ink.shadowColor=p.color;ink.shadowBlur=12;ink.fillRect(p.x,p.y,p.r,p.r)}ink.globalAlpha=1;ink.shadowBlur=0;particles=particles.filter(p=>p.life>0);
 if(state.phase==='playing'){ink.globalAlpha=.13;ink.strokeStyle='#6ecfff';ink.lineWidth=2;for(let i=0;i<10;i++){let x=((i*211+t*.32)%w),y=((i*197+t*.21)%h);ink.beginPath();ink.moveTo(x,y);ink.lineTo(x+(x-w/2)*.022,y+(y-h/2)*.022);ink.stroke()}ink.globalAlpha=1}
}

// Audio: live-deployed vibe1.m4a if present, otherwise a locally chosen file (persisted in IndexedDB).
// The fallback is an original lightweight synthesizer, never somebody else's recorded music.
const music=new Audio();music.loop=true;music.preload='auto';music.playsInline=true;music.volume=state.volume;
let musicMode='synth',musicObjectUrl='',audioContext=null,nextBeat=0,beat=0,musicRequested=false,needsAudioGesture=false;
function dbOpen(){return new Promise((resolve,reject)=>{if(!indexedDB)return reject(new Error('No IndexedDB'));let r=indexedDB.open('voidrunner-music',1);r.onupgradeneeded=()=>r.result.createObjectStore('tracks');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function saveTrack(file){try{const db=await dbOpen();await new Promise((resolve,reject)=>{let tx=db.transaction('tracks','readwrite');tx.objectStore('tracks').put({name:file.name,blob:file},'chosen');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});db.close()}catch{notice('Track plays now. Browser storage could not save it for next time.')}}
async function restoreTrack(){try{const db=await dbOpen();let value=await new Promise((resolve,reject)=>{let r=db.transaction('tracks','readonly').objectStore('tracks').get('chosen');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});db.close();if(value?.blob){useTrack(value.blob,value.name);return true}}catch{}return false}
function useTrack(file,name){if(musicObjectUrl)URL.revokeObjectURL(musicObjectUrl);musicObjectUrl=URL.createObjectURL(file);music.src=musicObjectUrl;musicMode='file';needsAudioGesture=false;trackName.textContent='SOUNDTRACK: '+name.toUpperCase();if(audioContext?.state==='running')audioContext.suspend();if(musicRequested)resumeMusic()}
trackInput.addEventListener('change',async()=>{let file=trackInput.files?.[0];if(!file)return;useTrack(file,file.name);await saveTrack(file)});
music.addEventListener('error',()=>{if(musicMode==='file')notice('Could not decode audio. Try an MP3 or M4A file.');else{musicMode='synth';trackName.textContent='SOUNDTRACK: COSMIC SYNTH'}});
// The loop flag handles normal completion; recover if a mobile browser still fires ended.
music.addEventListener('ended',()=>{if(musicMode==='file'&&musicRequested&&!state.muted){music.currentTime=0;resumeMusic()}});
(async()=>{
  if(await restoreTrack())return;
  trackName.textContent='SOUNDTRACK: LOADING VIBE 1...';
  try{
    const chunks=[];
    for(let i=0;i<13;i+=4){
      const urls=Array.from({length:Math.min(4,13-i)},(_,j)=>'./audio/vibe1.part'+String(i+j).padStart(2,'0'));
      const responses=await Promise.all(urls.map(u=>fetch(u)));
      if(responses.some(r=>!r.ok))throw new Error('Missing audio segment');
      const buffers=await Promise.all(responses.map(r=>r.arrayBuffer()));
      chunks.push(...buffers);
    }
    useTrack(new Blob(chunks,{type:'audio/mp4'}),'VIBE 1 (LIVE A LITTLE)');
  }catch{trackName.textContent='SOUNDTRACK: COSMIC SYNTH (OR LOAD YOUR FILE)'}
})();
function notice(text){const el=$('error');el.textContent=text;el.hidden=false;setTimeout(()=>el.hidden=true,3800)}
function synthTone(freq,duration,type='sawtooth',gain=.04,when=0){if(!audioContext)return;let osc=audioContext.createOscillator(),amp=audioContext.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,when);amp.gain.setValueAtTime(.0001,when);amp.gain.exponentialRampToValueAtTime(gain*state.volume,when+.014);amp.gain.exponentialRampToValueAtTime(.0001,when+duration);osc.connect(amp).connect(audioContext.destination);osc.start(when);osc.stop(when+duration+.02)}
function scheduleSynth(){if(!audioContext||audioContext.state!=='running'||musicMode!=='synth'||state.muted||!musicRequested)return;let now=audioContext.currentTime;if(nextBeat<now)nextBeat=now+.02;const eighth=60/118/2;while(nextBeat<now+.12){if(beat%4===0){synthTone(55,.22,'sine',.11,nextBeat);synthTone(110,.08,'triangle',.04,nextBeat)}if(beat%2===0)synthTone(4800,.025,'square',.009,nextBeat);const notes=[110,0,146.83,0,164.81,0,146.83,196,110,0,146.83,0,220,0,164.81,146.83];let n=notes[beat%16];if(n)synthTone(n,.19,'triangle',.032,nextBeat);beat++;nextBeat+=eighth}}
function resumeMusic(){
 musicRequested=true; // Music belongs to the session, not the current run.
 if(state.muted)return;
 if(musicMode==='file'){
  music.volume=state.volume;
  music.play().then(()=>{
   if(state.muted||musicMode!=='file')return;
   needsAudioGesture=false;soundButton.textContent='♫ ON';soundButton.setAttribute('aria-label','Mute soundtrack');
  }).catch(()=>{
   if(state.muted||musicMode!=='file')return;
   needsAudioGesture=true;soundButton.textContent='♫ PLAY';soundButton.setAttribute('aria-label','Tap to start soundtrack');
   notice('Tap ♫ PLAY to start the soundtrack.');
  });
 }else{
  try{
   audioContext ||=new (window.AudioContext||window.webkitAudioContext)();
   audioContext.resume().catch(()=>notice('Tap ♫ ON to start audio.'));
   nextBeat=0;
  }catch{notice('Audio unavailable in this browser.')}
 }
}
function suspendMusic(){music.pause();if(audioContext&&audioContext.state==='running')audioContext.suspend()}
function toggleSound(){
 // Safari can reject play() when the downloaded soundtrack arrives after launch.
 // In that case, the next tap starts playback instead of accidentally muting it.
 if(needsAudioGesture&&!state.muted){needsAudioGesture=false;resumeMusic();return}
 state.muted=!state.muted;music.muted=state.muted;
 soundButton.textContent=state.muted?'♫ OFF':'♫ ON';
 soundButton.setAttribute('aria-label',state.muted?'Unmute soundtrack':'Mute soundtrack');
 if(state.muted){needsAudioGesture=false;suspendMusic()}
 else if(musicRequested)resumeMusic();
}
soundButton.addEventListener('click',toggleSound);volumeControl.addEventListener('input',()=>{state.volume=+volumeControl.value/100;music.volume=state.volume});

function update(dt,pad){if(state.phase!=='playing')return;
 state.elapsed+=dt;state.speed=32+Math.min(40,state.elapsed*.56);state.score+=dt*(18+state.speed*.37);state.nextSpawn-=dt;state.invincible=Math.max(0,state.invincible-dt);state.shake=Math.max(0,state.shake-dt*2.8);
 let x=0,y=0;if(keys.has('a')||keys.has('arrowleft'))x--;if(keys.has('d')||keys.has('arrowright'))x++;if(keys.has('w')||keys.has('arrowup'))y++;if(keys.has('s')||keys.has('arrowdown'))y--;
 x+=pad[0];y-=pad[1];let length=Math.max(1,Math.hypot(x,y));let dx=x/length,dy=y/length;
 if(!pointer){ship.x=clamp(ship.x+dx*10.4*dt,-RANGE_X,RANGE_X);ship.y=clamp(ship.y+dy*10.4*dt,-RANGE_Y,RANGE_Y)}
 ship.tilt+=(dx-ship.tilt)*Math.min(1,dt*12);
 if(state.nextSpawn<=0){spawnWave();state.nextSpawn=Math.max(.47,1.05-state.elapsed*.006)}
 for(const o of obstacles){let previous=o.mesh.position.z;o.mesh.position.z+=state.speed*dt;o.mesh.rotation.x+=dt*o.spin;o.mesh.rotation.y+=dt*.85;if(o.collect)o.mesh.rotation.z+=dt*2;
 if(previous<PLAYER_Z&&o.mesh.position.z>=PLAYER_Z){if(Math.hypot(ship.x-o.x,ship.y-o.y)<o.size+playerCollisionRadius){burst(o.x,o.y,o.collect?'#ffdf74':'#ff4488',34);removeObstacle(o);if(o.collect){state.score+=150}else if(!state.invincible){state.shield--;state.invincible=1.2;state.shake=.45;$('flash').style.opacity='.85';setTimeout(()=>$('flash').style.opacity='0',120);if(state.shield<=0){endGame();break}}}}
 if(o.mesh.position.z>18&&!o.dead)removeObstacle(o)}
 obstacles=obstacles.filter(o=>!o.dead);hud()
}
function render(dt,t){let s=state.phase==='playing'?state.speed:9;
 for(const ring of rings){ring.position.z+=s*dt;if(ring.position.z>14)ring.position.z-=rings.length*7.2;ring.rotation.z+=dt*.05;}
 const p=starsGeo.attributes.position;for(let i=0;i<starN;i++){let z=p.getZ(i)+s*dt*(.9+(i%5)*.11);p.setZ(i,z>12?-160:z)}p.needsUpdate=true;
 camera.position.x=ship.x*.035+random(-state.shake,state.shake)*.035;camera.position.y=ship.y*.04+random(-state.shake,state.shake)*.035;camera.lookAt(0,0,-35);
 light1.intensity=45+Math.sin(t*.002)*19;light2.intensity=42+Math.sin(t*.003+1)*22;
 renderer.render(scene,camera);paintShip(t,dt)
}
function loop(t){let dt=clamp((t-state.last)/1000||0,0,.04);state.last=t;let pad=pollGamepad();update(dt,pad);scheduleSynth();render(dt,t);requestAnimationFrame(loop)}requestAnimationFrame(loop);
window.addEventListener('webglcontextlost',e=>{e.preventDefault();notice('3D graphics paused. Reload the page to restart.');if(state.phase==='playing')pauseGame()});