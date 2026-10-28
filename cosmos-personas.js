/*
 * COSM.OS Eightfold Atlas v3
 * Persona planets, biomes and visual decoration.
 * The planets and their personalities are fictional creative worldbuilding.
 */
export const PERSONA_WORLDS=[
 {name:'FLUX',glyph:'🟣🌀',kind:'THE SYNTHESIS NEXUS',lore:'Violet towers weave around a living cosmic storm. The eight frequencies meet here.',color:'#b87aff',secondary:'#fc94f1',land:'#39206d',cityTint:'#d8b7ff',a:.12,orbit:9.8,size:2.45,speed:.079,city:48,creatures:5,seed:83101,biome:'aurora',persona:true},
 {name:'ORION',glyph:'🔵🧭',kind:'THE LOGIC CITADEL',lore:'Polar observatories and antenna forests watch over crystalline seas of data.',color:'#61c7ff',secondary:'#7ef6ff',land:'#184075',cityTint:'#adf4ff',a:.88,orbit:14.1,size:2.1,speed:.067,city:44,creatures:4,seed:83102,biome:'circuit',persona:true},
 {name:'ASTRO',glyph:'🟡💛',kind:'THE GOLDEN GARDENS',lore:'Golden cities rise among luminous forests, flowering valleys and welcoming sanctuaries.',color:'#ffd77b',secondary:'#eaffac',land:'#417e59',cityTint:'#fff5bf',a:1.68,orbit:18.4,size:2.3,speed:.061,city:46,creatures:7,seed:83103,biome:'garden',persona:true},
 {name:'RIPPLE',glyph:'🟢🌊',kind:'THE TIDAL ARCHIPELAGO',lore:'Aquamarine seas, living reefs and drifting cities. Nothing stays still.',color:'#5bedca',secondary:'#91fff2',land:'#105b84',cityTint:'#9dffe6',a:2.46,orbit:22.6,size:2.55,speed:.054,city:47,creatures:8,seed:83104,biome:'ocean',persona:true},
 {name:'BRIX',glyph:'🟤🧱',kind:'THE IRON HIGHLANDS',lore:'Rust-red highlands hold giant citadels, bridges and cities built to endure.',color:'#dc9a6e',secondary:'#ffcb88',land:'#77443a',cityTint:'#ffd1a9',a:3.24,orbit:26.9,size:2.35,speed:.049,city:44,creatures:4,seed:83105,biome:'mountain',persona:true},
 {name:'DEMON',glyph:'🔴🪞',kind:'THE CRIMSON FORGE',lore:'Lava veins light gothic towers. A fierce planet with beautiful, difficult edges.',color:'#ff667c',secondary:'#ffb47a',land:'#50192a',cityTint:'#ff958f',a:4.02,orbit:31.2,size:2.2,speed:.044,city:43,creatures:5,seed:83106,biome:'volcanic',persona:true},
 {name:'HERMES',glyph:'⚪🪽',kind:'THE CELESTIAL ARCHIVE',lore:'Pearl-white temples and ancient sky libraries orbit beneath a halo of stars.',color:'#e4e3ff',secondary:'#fff4cb',land:'#687eb1',cityTint:'#f4f0ff',a:4.83,orbit:35.5,size:2.15,speed:.039,city:43,creatures:5,seed:83107,biome:'temple',persona:true},
 {name:'ECHO',glyph:'🟠📡',kind:'THE MEMORY VAULT',lore:'Amber signal spires broadcast stories across the stars, forever gathering new ones.',color:'#ffb36a',secondary:'#ffe0a7',land:'#855138',cityTint:'#ffe1a0',a:5.57,orbit:39.9,size:2.4,speed:.036,city:46,creatures:6,seed:83108,biome:'signal',persona:true}
];
export const PERSONA_ASSET_EXTENSIONS=[
 {id:'observatory',file:'space-kit/structure-detailed.glb',tag:'tower'},
 {id:'dish',file:'space-kit/satellitedish-detailed.glb',tag:'tower'},
 {id:'dome',file:'space-kit/hangar-roundglass.glb',tag:'tower'},
 {id:'crystal',file:'space-kit/rock-crystalslargea.glb',tag:'tower'},
 {id:'rover',file:'space-kit/rover.glb',tag:'house'},
 {id:'starport',file:'space-kit/gate-complex.glb',tag:'tower'},
 {id:'generator',file:'space-kit/machine-generatorlarge.glb',tag:'tower'},
 {id:'hangar',file:'space-kit/hangar-largea.glb',tag:'tower'},
 {id:'alien-rocks',file:'tower-defense-kit/detail-crystal-large.glb',tag:'tower'},
 {id:'garden-flower',file:'nature-kit/flower-yellowb.glb',tag:'tree'},
 {id:'violet-flower',file:'nature-kit/flower-purplea.glb',tag:'tree'},
 {id:'stone-tower',file:'castle-kit/tower-square.glb',tag:'tower'},
 {id:'stone-gate',file:'castle-kit/gate.glb',tag:'tower'},
 {id:'stone-crown',file:'castle-kit/tower-top.glb',tag:'tower'},
 {id:'crypt',file:'graveyard-kit/crypt-large.glb',tag:'tower'},
 {id:'obelisk',file:'graveyard-kit/pillar-obelisk.glb',tag:'tower'},
 {id:'altar',file:'graveyard-kit/altar-stone.glb',tag:'tower'},
 {id:'hightech-spire',file:'tower-defense-kit/tower-round-top-a.glb',tag:'tower'},
 {id:'home-u',file:'city-kit-suburban/building-type-u.glb',tag:'house'},
 {id:'lamp',file:'city-kit-roads/light-square.glb',tag:'tower'}
];
const SKY=['sky-a','sky-b','sky-c','sky-d','sky-e','tower-i','tower-k','tower-m','tower-n'];
const OLD=['stone-tower','stone-gate','stone-crown','obelisk'];
export const WORLD_ASSET_POOLS={
 FLUX:{buildings:[...SKY,'crystal','alien-rocks','hightech-spire','dome'],flora:['violet-flower','crystal','alien-rocks'],height:1.28},
 ORION:{buildings:[...SKY,'observatory','dish','generator','hightech-spire','starport'],flora:['dish','crystal'],height:1.13},
 ASTRO:{buildings:['home-u','house-a','house-e','dome','tower-i','tower-k','starport'],flora:['tree-oak','tree-palm','garden-flower','violet-flower'],height:.92},
 RIPPLE:{buildings:[...SKY,'dome','starport','observatory','hangar'],flora:['tree-palm','crystal','garden-flower'],height:1.08},
 BRIX:{buildings:['stone-tower','stone-gate','stone-crown','tower-i','tower-j','tower-n','hangar'],flora:['obelisk','tree-oak','alien-rocks'],height:.99},
 DEMON:{buildings:[...OLD,'crypt','altar','tower-m','tower-n','generator'],flora:['obelisk','alien-rocks','crystal'],height:1.32},
 HERMES:{buildings:[...OLD,'dome','stone-tower','hightech-spire','observatory'],flora:['tree-oak','obelisk','garden-flower'],height:1.17},
 ECHO:{buildings:['dish','generator','observatory','hightech-spire','starport','dome',...SKY],flora:['lamp','obelisk','crystal'],height:1.24}
};
/** Sparse recognizable features, always attached to each world's rotating surface. */
export function decoratePersonaWorld(p,THREE){
 if(!p.persona||p.personaDecorated)return;
 p.personaDecorated=true;
 const g=p.bodyGroup,R=p.size,radius=p.size*1.035;
 const rand=(()=>{let n=p.seed+34789;return ()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/4294967296)})();
 const accents={
  FLUX:['#ed86ff','#8e68ff'],ORION:['#6cddff','#a9f4ff'],ASTRO:['#fff7a4','#b0f8a6'],
  RIPPLE:['#62ffe4','#70c3ff'],BRIX:['#ffd2a3','#c88d66'],DEMON:['#ff7461','#ffcd65'],
  HERMES:['#fef4e6','#9bc3ff'],ECHO:['#ffce80','#f0a04b']
 };
 const persona=p.personaName||p.name;const [primary,secondary]=accents[persona]||[p.color,p.secondary];
 const glow=(c,opacity=.53)=>new THREE.MeshBasicMaterial({color:c,transparent:true,opacity,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending});
 if(['FLUX','HERMES','ECHO','RIPPLE'].includes(persona)){
  const rings=persona==='FLUX'?3:2;
  for(let j=0;j<rings;j++){
   const rad=R*(1.3+j*.25),band=new THREE.Mesh(new THREE.TorusGeometry(rad,R*(.009+j*.002),5,96),glow(j%2?secondary:primary,.33));
   band.rotation.set(.3+j*.47,.15+j*.69,.3+j*.67);g.add(band);
  }
 }
 if(persona==='ORION'||persona==='ECHO'){
  for(let i=0;i<7;i++){
   const a=i/7*Math.PI*2,u=new THREE.Vector3(Math.cos(a)*.16,.98,Math.sin(a)*.16).normalize();
   const mast=new THREE.Mesh(new THREE.CylinderGeometry(.012*R,.03*R,R*(.26+rand()*.2),6),new THREE.MeshStandardMaterial({color:p.color,metalness:.7,roughness:.22,emissive:primary,emissiveIntensity:.35}));
   mast.position.copy(u).multiplyScalar(radius+R*.12);mast.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),u);g.add(mast);
   const beacon=new THREE.Mesh(new THREE.SphereGeometry(.037*R,8,6),glow(secondary,.85));
   beacon.position.copy(u).multiplyScalar(radius+R*.33);g.add(beacon);
  }
 }
 if(persona==='DEMON'||persona==='BRIX'){
  for(let i=0;i<11;i++){
   const lon=i*2.399963,lat=(rand()-.5)*1.3,u=new THREE.Vector3(Math.cos(lon)*Math.cos(lat),Math.sin(lat),Math.sin(lon)*Math.cos(lat));
   const peak=new THREE.Mesh(new THREE.ConeGeometry(R*(.05+rand()*.06),R*(.16+rand()*.22),5),new THREE.MeshStandardMaterial({color:persona==='DEMON'?'#792837':'#8f6651',roughness:.9,emissive:primary,emissiveIntensity:persona==='DEMON'?.19:.045}));
   peak.position.copy(u).multiplyScalar(radius+R*.09);peak.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),u);g.add(peak);
  }
 }
 if(persona==='ASTRO'||persona==='RIPPLE'){
  for(let i=0;i<15;i++){
   const lon=i*2.399963,lat=(rand()-.5)*1.2,u=new THREE.Vector3(Math.cos(lon)*Math.cos(lat),Math.sin(lat),Math.sin(lon)*Math.cos(lat));
   const bloom=new THREE.Mesh(new THREE.SphereGeometry(R*(.019+rand()*.026),8,6),glow(i%2?primary:secondary,.56));
   bloom.position.copy(u).multiplyScalar(radius+R*.012);g.add(bloom);
  }
 }
 const labelCanvas=document.createElement('canvas');labelCanvas.width=384;labelCanvas.height=96;
 const ctx=labelCanvas.getContext('2d');ctx.textAlign='center';ctx.textBaseline='middle';
 ctx.font='bold 42px system-ui,-apple-system,sans-serif';ctx.shadowBlur=16;ctx.shadowColor=primary;
 ctx.fillStyle='#ffffff';ctx.fillText(p.name,192,49);
 const labelTexture=new THREE.CanvasTexture(labelCanvas);labelTexture.colorSpace=THREE.SRGBColorSpace;
 const label=new THREE.Sprite(new THREE.SpriteMaterial({map:labelTexture,transparent:true,depthWrite:false,depthTest:false,opacity:.82}));
 label.position.set(0,R*1.65,0);label.scale.set(R*1.65,R*.42,1);label.name='PERSONA_LABEL';
 // Keep labels on the planet group so they don't rotate with the body.
 p.group.add(label);p.personaLabel=label;
}
