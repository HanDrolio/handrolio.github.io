// COSM.OS Galactic Navigator v1.2 alpha.
// Holographic radar, first-person atmospheric flybys, inhabited cities,
// and cinematic warp transitions. Does not alter the original homepage.
export function createNavigator({THREE,scene,camera,stage,planets,audio}){
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),ease=t=>t*t*(3-2*t);
 const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),UP=V(0,1,0);
 const state={mode:"orbit",mapOpen:false,hits:[],target:null,from:V(),elapsed:0,duration:7,flyby:0,
  steerYaw:0,steerPitch:0,homeFov:camera.fov,cities:new Map(),tick:0,
  warp:null,warpTime:0,flash:0,captionAt:0};
 const css=[
 "#nav-overlay{display:none;position:fixed;inset:0;z-index:40;background:#030716c9;backdrop-filter:blur(11px);align-items:center;justify-content:center;padding:12px}",
 "#nav-overlay.open{display:flex}",
 "#nav-panel{position:relative;width:min(94vw,400px);border-radius:24px;border:1px solid #80d5ff86;background:linear-gradient(135deg,#122244f5,#060a21f8);padding:17px 12px;text-align:center;box-shadow:0 10px 70px #000d}",
 "#nav-heading{color:#d2f4ff;font:950 14px system-ui;letter-spacing:.19em}",
 "#nav-subheading{color:#8ebce7;font:700 10px system-ui;letter-spacing:.09em;margin-top:6px}",
 "#nav-radar{width:min(76vw,310px);height:min(76vw,310px);display:block;margin:10px auto 5px;touch-action:manipulation}",
 "#nav-close{position:absolute;right:10px;top:10px;width:36px;height:36px;border:1px solid #b4c5e277;background:#243453;color:#fff;border-radius:50%;font-size:20px;touch-action:manipulation}",
 "#nav-return{position:fixed;display:none;z-index:14;left:12px;top:max(61px,env(safe-area-inset-top) + 52px);padding:10px 13px;border:1px solid #9addff91;border-radius:12px;background:#152c46e6;color:#e9fbff;font:900 11px system-ui;letter-spacing:.08em;backdrop-filter:blur(10px);touch-action:manipulation}",
 "#nav-reticle{position:fixed;display:none;pointer-events:none;left:50%;top:48%;width:35px;height:35px;transform:translate(-50%,-50%);z-index:10;border:1px solid #bfefffa8;border-radius:50%;box-shadow:0 0 16px #68bdff66}",
 "#nav-reticle::before,#nav-reticle::after{content:'';position:absolute;background:#c6ffffa8;left:50%;top:50%;transform:translate(-50%,-50%)}",
 "#nav-reticle::before{width:50px;height:1px}#nav-reticle::after{height:50px;width:1px}",
 "#nav-flight-label{position:fixed;z-index:10;top:max(71px,env(safe-area-inset-top) + 65px);right:13px;max-width:55vw;text-align:right;color:#a9eeff;text-shadow:0 2px 12px #000;font:800 10px monospace;letter-spacing:.10em;pointer-events:none;opacity:0}",
 "#nav-hint{position:fixed;z-index:10;bottom:max(90px,env(safe-area-inset-bottom) + 88px);left:14px;right:14px;color:#c2e5ff;text-align:center;font:700 10px monospace;letter-spacing:.08em;pointer-events:none;text-shadow:0 1px 10px #000;opacity:0;transition:opacity .3s}",
 "#nav-warpbar{position:fixed;z-index:12;bottom:max(82px,env(safe-area-inset-bottom) + 80px);left:50%;transform:translateX(-50%);width:min(64vw,270px);height:2px;background:#ffffff36;opacity:0;pointer-events:none}",
 "#nav-warpfill{height:100%;width:0;background:linear-gradient(90deg,#45e5ff,#d68aff);box-shadow:0 0 13px #9ceaff}",
 "#nav-flash{position:fixed;inset:0;z-index:15;pointer-events:none;opacity:0;background:radial-gradient(circle at 50% 48%,#d3f7ff,#817bfa4d 35%,transparent 75%)}",
 "#nav-warp-title{position:fixed;z-index:16;top:33%;left:10px;right:10px;text-align:center;font:950 clamp(16px,5.4vw,30px) system-ui;letter-spacing:.16em;color:#f0ffff;text-shadow:0 0 25px #81dbff,0 4px 15px #000;pointer-events:none;opacity:0;transform:scale(.85);transition:opacity .25s,transform .5s}",
 "#nav-caption{position:fixed;z-index:16;top:42%;left:12px;right:12px;text-align:center;color:#bbdaff;font:800 11px monospace;letter-spacing:.12em;opacity:0;pointer-events:none;transition:opacity .35s}",
 "#nav-letter-top,#nav-letter-bottom{position:fixed;z-index:13;left:0;right:0;height:0;background:#01020b;pointer-events:none;transition:height .55s ease}",
 "#nav-letter-top{top:0}#nav-letter-bottom{bottom:0}body.nav-cinematic #nav-letter-top,body.nav-cinematic #nav-letter-bottom{height:7vh}"
 ].join("");
 const style=document.createElement("style");style.textContent=css;document.head.appendChild(style);
 const ui=document.createElement("div");
 ui.innerHTML='<div id="nav-overlay" role="dialog" aria-label="Galaxy radar" aria-modal="true"><div id="nav-panel"><button type="button" id="nav-close">×</button><div id="nav-heading">✦ GALACTIC RADAR</div><div id="nav-subheading">SELECT A PLANET · FLY THROUGH ITS ATMOSPHERE</div><canvas id="nav-radar" width="310" height="310"></canvas><div id="nav-subheading">TAP A GLOWING WORLD TO ENGAGE AUTOPILOT</div></div></div><button type="button" id="nav-return">← GALAXY</button><div id="nav-reticle"></div><div id="nav-flight-label"></div><div id="nav-hint"></div><div id="nav-warpbar"><div id="nav-warpfill"></div></div><div id="nav-flash"></div><div id="nav-warp-title"></div><div id="nav-caption"></div><div id="nav-letter-top"></div><div id="nav-letter-bottom"></div>';
 document.body.appendChild(ui);
 const $=id=>document.getElementById(id),overlay=$("nav-overlay"),radar=$("nav-radar"),rc=radar.getContext("2d");
 const ret=$("nav-return"),status=$("nav-flight-label"),hint=$("nav-hint"),bar=$("nav-warpbar"),
 fill=$("nav-warpfill"),flash=$("nav-flash"),title=$("nav-warp-title"),caption=$("nav-caption");
 const hash=s=>[...s].reduce((n,c)=>(Math.imul(n,33)+c.charCodeAt(0))>>>0,437);
 const rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 const palettes={earth:["#4edaff","#6dfbd9","#e3ffff"],gas:["#b59aff","#f4c0ff","#ffffff"],
 lava:["#ff814f","#ffc074","#fff0c5"],ice:["#82e1ff","#b9f1ff","#f2ffff"],
 rebirth:["#ca8bff","#7cf4ff","#ffffff"],fusion:["#afcfff","#e4c3ff","#ffffff"]};
 const names=["AZURA","VESPER","IGNIS","GLACIA"];
 const nameOf=(p,i)=>p.name||names[i%4];
 function showStatus(s){status.textContent=s;status.style.opacity="1"}
 function showHint(s){hint.textContent=s;hint.style.opacity=s?"1":"0";state.captionAt=performance.now()}
 function makeMode(mode){
  state.mode=mode;const active=mode!=="orbit";
  ret.style.display=active?"block":"none";$("nav-reticle").style.display=active?"block":"none";
  bar.style.opacity=(mode==="flight"||mode==="return")?"1":"0";
  document.body.classList.toggle("nav-cinematic",mode==="flight"||mode==="return");
  if(mode==="orbit"){status.style.opacity="0";hint.style.opacity="0";camera.fov=state.homeFov;camera.updateProjectionMatrix()}
 }
 function closeRadar(){overlay.classList.remove("open");state.mapOpen=false}
 function openRadar(){if(state.mode==="flight"||state.mode==="return")return;state.mapOpen=true;overlay.classList.add("open");drawRadar()}
 function handleTap(){if(state.mode==="orbit"||state.mode==="flyby")openRadar()}
 $("nav-close").onclick=closeRadar;
 overlay.addEventListener("pointerdown",e=>{if(e.target===overlay)closeRadar()});
 function drawRadar(){
  const c=155,R=131;rc.setTransform(1,0,0,1,0,0);rc.clearRect(0,0,310,310);
  const bg=rc.createRadialGradient(c,c,0,c,c,R);
  bg.addColorStop(0,"#134163");bg.addColorStop(.6,"#0a2441");bg.addColorStop(1,"#06132b");
  rc.beginPath();rc.arc(c,c,R,0,6.283);rc.fillStyle=bg;rc.fill();
  rc.lineWidth=1;rc.strokeStyle="#93e1ff38";
  for(const f of [.25,.5,.75,1]){rc.beginPath();rc.arc(c,c,R*f,0,6.283);rc.stroke()}
  rc.beginPath();rc.moveTo(c-R,c);rc.lineTo(c+R,c);rc.moveTo(c,c-R);rc.lineTo(c,c+R);rc.stroke();
  const spin=performance.now()*.0007;rc.beginPath();rc.moveTo(c,c);rc.arc(c,c,R,spin,spin+.52);rc.closePath();rc.fillStyle="#73e8ff16";rc.fill();
  rc.fillStyle="#fff";rc.beginPath();rc.arc(c,c,4,0,6.283);rc.fill();
  rc.font="bold 9px monospace";rc.textAlign="center";rc.fillStyle="#9ccee9";rc.fillText("CORE",c,c+18);
  state.hits=[];
  planets.forEach((p,i)=>{
   if(p.dead||p.colliding||!p.group.visible)return;
   const x=c+clamp(p.group.position.x/15,-.95,.95)*R,y=c+clamp(p.group.position.z/15,-.95,.95)*R;
   const col=(palettes[p.kind]||palettes.rebirth)[0];
   rc.fillStyle=col;rc.shadowBlur=14;rc.shadowColor=col;rc.beginPath();rc.arc(x,y,8,0,6.283);rc.fill();
   rc.shadowBlur=0;rc.strokeStyle="#f7ffffaa";rc.beginPath();rc.arc(x,y,11,0,6.283);rc.stroke();
   rc.fillStyle="#dceeff";rc.fillText(nameOf(p,i),x,y-17);
   state.hits.push({p,x,y});
  });
  if(!state.hits.length){rc.fillStyle="#c9dcef";rc.fillText("NO STABLE DESTINATIONS",c,75)}
 }
 radar.addEventListener("pointerup",e=>{
  e.preventDefault();e.stopPropagation();
  const box=radar.getBoundingClientRect(),x=(e.clientX-box.left)*310/box.width,y=(e.clientY-box.top)*310/box.height;
  let chosen=null,minimum=30;
  for(const h of state.hits){const d=Math.hypot(x-h.x,y-h.y);if(d<minimum){chosen=h;minimum=d}}
  if(chosen){closeRadar();flyTo(chosen.p)}
 });
 function createCity(p,i){
  if(state.cities.has(p))return;
  const rand=rng(hash(nameOf(p,i))),colors=palettes[p.kind]||palettes.rebirth;
  const normals=[V(.38,.26,.87),V(-.37,.33,.85),V(.45,.48,.70),V(-.40,.21,.88)];
  const primary=normals[i%4].normalize();
  const districts=[primary,primary.clone().applyAxisAngle(UP,.57),primary.clone().applyAxisAngle(UP,-.57),primary.clone().negate(),primary.clone().applyAxisAngle(UP,1.4)];
  const group=new THREE.Group();p.group.add(group);
  const standard=new THREE.MeshStandardMaterial({color:0xe2f5ff,metalness:.5,roughness:.33,
   emissive:new THREE.Color(colors[0]),emissiveIntensity:.62});
  const count=innerWidth<700?130:190,towers=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),standard,count);
  towers.frustumCulled=false;
  const o=new THREE.Object3D(),white=new THREE.Color("#fff"),accent=new THREE.Color(colors[1]);
  for(let n=0;n<count;n++){
   const d=districts[n%districts.length],u=V().crossVectors(UP,d).normalize(),v=V().crossVectors(d,u).normalize();
   const direction=d.clone().addScaledVector(u,(rand()-.5)*.5).addScaledVector(v,(rand()-.5)*.5).normalize();
   const h=.048+Math.pow(rand(),3)*.38,w=.018+rand()*.032;
   o.position.copy(direction).multiplyScalar(1+.5*h+.01);
   o.quaternion.setFromUnitVectors(UP,direction);o.scale.set(w,h,w);o.updateMatrix();
   towers.setMatrixAt(n,o.matrix);towers.setColorAt(n,accent.clone().lerp(white,rand()*.78));
  }
  towers.instanceMatrix.needsUpdate=true;group.add(towers);
  const rings=[];
  for(let n=0;n<districts.length;n++){
   const d=districts[n],ring=new THREE.Mesh(new THREE.RingGeometry(.19,.24,42),
    new THREE.MeshBasicMaterial({color:colors[n%3],transparent:true,opacity:.55,side:THREE.DoubleSide,
     depthWrite:false,blending:THREE.AdditiveBlending}));
   ring.position.copy(d).multiplyScalar(1.015);ring.quaternion.setFromUnitVectors(V(0,0,1),d);
   group.add(ring);rings.push(ring);
  }
  const animals=new THREE.InstancedMesh(new THREE.ConeGeometry(.036,.145,3),
   new THREE.MeshBasicMaterial({color:colors[1],side:THREE.DoubleSide}),innerWidth<700?15:25);
  const cars=new THREE.InstancedMesh(new THREE.BoxGeometry(.06,.019,.11),
   new THREE.MeshBasicMaterial({color:colors[2]}),innerWidth<700?21:33);
  const lights=new THREE.InstancedMesh(new THREE.SphereGeometry(.016,6,5),
   new THREE.MeshBasicMaterial({color:colors[0]}),30);
  for(const m of [animals,cars,lights]){m.frustumCulled=false;group.add(m)}
  const atmosphere=new THREE.Mesh(new THREE.SphereGeometry(1.21,32,24),
   new THREE.MeshBasicMaterial({color:colors[0],transparent:true,opacity:.072,side:THREE.DoubleSide,
     depthWrite:false,blending:THREE.AdditiveBlending}));
  group.add(atmosphere);
  state.cities.set(p,{p,i,primary,districts,group,towers,rings,animals,cars,lights,atmosphere});
 }
 function updateCity(t,beat){
  state.tick++;
  if(state.tick%2!==0)return;
  const o=new THREE.Object3D(),u=V(),v=V(),q=V();
  for(const [p,c] of state.cities){
   const visible=!p.dead&&!p.colliding&&p.group.visible;c.group.visible=visible;if(!visible)continue;
   for(let i=0;i<c.animals.count;i++){
    const d=c.districts[i%c.districts.length],a=t*(.25+i%3*.035)+i*2.19;
    u.crossVectors(UP,d).normalize();v.crossVectors(d,u).normalize();
    q.copy(d).addScaledVector(u,Math.cos(a)*.39).addScaledVector(v,Math.sin(a)*.31).normalize();
    o.position.copy(q).multiplyScalar(1.16+.05*Math.sin(t+i));o.quaternion.setFromUnitVectors(V(0,0,1),v);
    o.scale.setScalar(.75+.22*Math.sin(t*9+i));o.updateMatrix();c.animals.setMatrixAt(i,o.matrix);
   }
   c.animals.instanceMatrix.needsUpdate=true;
   for(let i=0;i<c.cars.count;i++){
    const d=c.districts[i%c.districts.length],a=t*(.22+i%4*.04)+i*1.35;
    u.crossVectors(UP,d).normalize();v.crossVectors(d,u).normalize();
    q.copy(d).addScaledVector(u,Math.cos(a)*.28).addScaledVector(v,Math.sin(a)*.28).normalize();
    o.position.copy(q).multiplyScalar(1.105+(i%4)*.016);o.quaternion.setFromUnitVectors(V(0,0,1),u);
    o.scale.setScalar(.84+beat*.17);o.updateMatrix();c.cars.setMatrixAt(i,o.matrix);
   }
   c.cars.instanceMatrix.needsUpdate=true;
   for(let i=0;i<c.lights.count;i++){
    const d=c.districts[i%c.districts.length],a=t*(.19+i%4*.033)+i*.58;
    u.crossVectors(UP,d).normalize();v.crossVectors(d,u).normalize();
    q.copy(d).addScaledVector(u,Math.cos(a)*(.15+i%5*.04))
     .addScaledVector(v,Math.sin(a)*(.15+i%5*.04)).normalize();
    o.position.copy(q).multiplyScalar(1.18+(i%5)*.023);
    o.quaternion.identity();o.scale.setScalar(.8+beat*.4);o.updateMatrix();c.lights.setMatrixAt(i,o.matrix);
   }
   c.lights.instanceMatrix.needsUpdate=true;
   for(const ring of c.rings)ring.material.opacity=.39+.16*Math.sin(t*1.6)+beat*.25;
   c.atmosphere.material.opacity=state.target===p&&state.mode==="flyby"?.13:.065;
  }
 }
 function populate(){planets.forEach((p,i)=>{if(!p.dead&&!p.colliding&&p.group.visible&&!state.cities.has(p))createCity(p,i)})}
 function titleCard(text,sub){
  title.textContent=text;caption.textContent=sub;
  title.style.opacity="1";title.style.transform="scale(1)";
  caption.style.opacity="1";state.captionAt=performance.now();
 }
 function beginWarp(type){
  state.flash=.7;document.body.classList.add("nav-cinematic");
  titleCard(type==="return"?"RETURN TO THE STARS":"WARP DRIVE ENGAGED",
   type==="return"?"GALACTIC EXTRACTION":"COSM.OS · FIRST PERSON NAVIGATOR");
 }
 function flyTo(p){
  if(!p||p.dead||p.colliding)return;
  populate();state.target=p;state.elapsed=0;state.flyby=0;state.steerYaw=state.steerPitch=0;
  state.from.copy(camera.position);
  state.duration=clamp(camera.position.distanceTo(p.group.position)*.19,6.1,10);
  makeMode("flight");showStatus("TARGET LOCK · "+(p.name||"PLANET"));
  showHint("AUTOPILOT ENGAGED · DRAG TO LOOK");beginWarp("enter");
 }
 function returnToGalaxy(){
  closeRadar();if(state.mode==="orbit")return;
  state.from.copy(camera.position);state.elapsed=0;state.duration=4.3;
  state.steerYaw=state.steerPitch=0;makeMode("return");showStatus("WARP OUT · GALAXY VIEW");
  showHint("RETURNING TO ORBIT");beginWarp("return");
 }
 ret.onclick=returnToGalaxy;
 function steer(dx,dy){
  if(state.mode!=="flight"&&state.mode!=="flyby")return;
  state.steerYaw=clamp(state.steerYaw-dx*.0045,-.75,.75);
  state.steerPitch=clamp(state.steerPitch-dy*.0038,-.42,.42);
 }
 function pose(p,look){
  camera.position.copy(p);camera.lookAt(p.clone().add(look.normalize()));
  camera.rotateY(state.steerYaw);camera.rotateX(state.steerPitch);
 }
 function warpTrails(){
  const n=90,geo=new THREE.BufferGeometry();
  geo.setAttribute("position",new THREE.BufferAttribute(new Float32Array(n*6),3).setUsage(THREE.DynamicDrawUsage));
  const line=new THREE.LineSegments(geo,new THREE.LineBasicMaterial({color:0xa8ddff,transparent:true,opacity:.56,
   blending:THREE.AdditiveBlending,depthWrite:false}));
  camera.add(line);scene.add(camera);
  line.frustumCulled=false;line.visible=false;state.warp=line;
 }
 function updateWarp(dt){
  const active=state.mode==="flight"||state.mode==="return";state.warp.visible=active;
  if(!active)return;
  state.warpTime+=dt;const pos=state.warp.geometry.attributes.position.array;
  for(let i=0;i<pos.length;i+=6){
   const n=i/6,a=n*2.399963,r=.4+(n%12)*.14,z=-2-((state.warpTime*19+n*.83)%28);
   const x=Math.cos(a)*r,y=Math.sin(a)*r;
   pos[i]=x;pos[i+1]=y;pos[i+2]=z;pos[i+3]=x;pos[i+4]=y;pos[i+5]=z-3.5;
  }
  state.warp.geometry.attributes.position.needsUpdate=true;
 }
 function flight(dt,t,beat,bass){
  if(state.mode==="return"){
   state.elapsed+=dt;const u=clamp(state.elapsed/state.duration,0,1),e=ease(u);
   const pos=state.from.clone().lerp(V(0,6,25),e);
   pos.y+=Math.sin(Math.PI*u)*2;pose(pos,V().sub(pos));
   camera.fov=state.homeFov+Math.sin(Math.PI*u)*18;camera.updateProjectionMatrix();
   fill.style.width=Math.round(u*100)+"%";
   if(u>.45&&u<.53)state.flash=Math.max(state.flash,.72);
   if(u>=1){
    state.target=null;state.steerYaw=state.steerPitch=0;
    makeMode("orbit");document.body.classList.remove("nav-cinematic");
    titleCard("BACK IN THE GALAXY","THE JOURNEY CONTINUES");state.flash=.27;
   }
   return;
  }
  const p=state.target;
  if(!p||p.dead||p.colliding||!p.group.visible){
   state.from.copy(camera.position);state.elapsed=0;state.duration=3;
   makeMode("return");beginWarp("return");return;
  }
  const city=state.cities.get(p);if(!city)return;
  const world=p.group.position,size=p.group.scale.x||p.size||1;
  const normal=city.primary,tangent=V().crossVectors(UP,normal).normalize();
  if(state.mode==="flight"){
   state.elapsed+=dt;const u=clamp(state.elapsed/state.duration,0,1),e=ease(u);
   const destination=world.clone().addScaledVector(normal,size*1.34);
   const pos=state.from.clone().lerp(destination,e);
   pos.y+=Math.sin(Math.PI*u)*2.2;
   const toward=world.clone().sub(pos).normalize();
   const horizon=tangent.clone().addScaledVector(normal,-.32).normalize();
   const mix=ease(clamp((u-.62)/.38,0,1));
   pose(pos,toward.lerp(horizon,mix));
   camera.fov=state.homeFov+18*Math.sin(Math.PI*u)+9*mix;camera.updateProjectionMatrix();
   fill.style.width=Math.round(u*100)+"%";
   if(u>.88)state.flash=Math.max(state.flash,(u-.88)*5);
   if(u>=1){
    makeMode("flyby");document.body.classList.remove("nav-cinematic");
    state.flyby=0;state.flash=.68;
    titleCard("ATMOSPHERIC ENTRY",(p.name||"WORLD")+" · CITIES & ALIEN LIFE");
    showStatus("INHABITED WORLD · "+(p.name||"PLANET"));
    showHint("DRAG TO LOOK · TAP TO SCAN · ← GALAXY TO EXIT");
   }
  }else{
   state.flyby+=dt*(.22+clamp(bass,0,.3)*.6);
   const radial=normal.clone().applyAxisAngle(UP,state.flyby*.24);
   const pos=world.clone().addScaledVector(radial,size*(1.33+.09*Math.sin(state.flyby*.8)));
   const horizon=V().crossVectors(UP,radial).normalize().addScaledVector(radial,-.28);
   pose(pos,horizon);
   const fov=state.homeFov+18+Math.sin(state.flyby*.7)*2;
   camera.fov+=(fov-camera.fov)*Math.min(1,dt*2);camera.updateProjectionMatrix();
  }
 }
 function update(dt,t,beat=0,levels={}){
  populate();updateCity(t,beat);
  if(state.mapOpen&&state.tick%6===0)drawRadar();
  if(state.mode!=="orbit")flight(dt,t,beat,levels.bass||0);
  updateWarp(dt);
  state.flash=Math.max(0,state.flash-dt*1.5);flash.style.opacity=String(Math.min(.82,state.flash));
  const elapsed=(performance.now()-state.captionAt)/1000;
  if(elapsed>2.3){title.style.opacity="0";title.style.transform="scale(1.1)";caption.style.opacity="0"}
  if(elapsed>7&&state.mode!=="orbit")hint.style.opacity="0";
 }
 warpTrails();
 return {get active(){return state.mode!=="orbit"},get mode(){return state.mode},
  openRadar,closeRadar,handleTap,steer,update,flyTo,returnToGalaxy};
}
