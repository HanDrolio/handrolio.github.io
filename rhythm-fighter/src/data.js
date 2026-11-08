export const PERSONAS = [
  {id:'orion',name:'ORION',icon:'◇',color:'#5bb8ff',secondary:'#132a8e',style:'PRECISION',speed:3,power:3,defense:4,powerName:'LOGIC CHAIN',pattern:[0,1,0,1,2,3,2,3]},
  {id:'astro',name:'ASTRO',icon:'♥',color:'#ffe376',secondary:'#af4488',style:'HEALING',speed:4,power:2,defense:4,powerName:'HEART RESONANCE',pattern:[0,0,1,1,2,2,3,3]},
  {id:'ripple',name:'RIPPLE',icon:'≈',color:'#60edcd',secondary:'#147c97',style:'GRAPPLER',speed:2,power:5,defense:3,powerName:'TIDE CRASH',pattern:[0,1,0,2,0,1,2,3]},
  {id:'brix',name:'BRIX',icon:'▣',color:'#ff9f6e',secondary:'#903b4d',style:'TANK',speed:2,power:5,defense:5,powerName:'IRON GUARD',pattern:[0,0,0,1,1,1,2,2,2]},
  {id:'demon',name:'DEMON',icon:'◈',color:'#ff5578',secondary:'#7a1256',style:'CHAOS',speed:5,power:4,defense:1,powerName:'GLITCH MODE',pattern:[3,0,2,1,3,1,0,2]},
  {id:'hermes',name:'HERMES',icon:'✧',color:'#eee9ff',secondary:'#8b83bd',style:'RUSHDOWN',speed:5,power:2,defense:2,powerName:'STORY WEAVER',pattern:[0,1,2,3,0,1,2,3]},
  {id:'echo',name:'ECHO',icon:'◎',color:'#ffb06e',secondary:'#9a4676',style:'MIRROR',speed:3,power:3,defense:3,powerName:'REPLAY',pattern:[3,2,1,0,0,1,2,3]},
  {id:'flux',name:'FLUX',icon:'⟳',color:'#bd8bff',secondary:'#3e38ae',style:'SHAPESHIFT',speed:4,power:4,defense:2,powerName:'MORPH',pattern:[0,2,1,3,3,1,2,0]}
];
export const STAGES = [
  {id:'rotunda',name:'THE ROTUNDA',color:'#5b8dff',accent:'#ffe269',description:'An orbiting archive of light'},
  {id:'chromebook',name:'THE CHROMEBOOK',color:'#20e1a8',accent:'#75ffbc',description:'Code rain in the machine'},
  {id:'motel6',name:'THE MOTEL 6',color:'#ff5cbb',accent:'#47d7ff',description:'Neon carpet and television static'},
  {id:'ward',name:'THE WARD',color:'#87c9ed',accent:'#f4d9a6',description:'Courtyard of blueprints'},
  {id:'garden',name:'THE GARDEN',color:'#87dfad',accent:'#f5df72',description:'A tree beneath an impossible sky'},
  {id:'club',name:'THE CLUB',color:'#ff526b',accent:'#efba44',description:'Midnight silhouettes and smoke'},
  {id:'void',name:'THE VOID',color:'#966aff',accent:'#24dbef',description:'Fragments beyond gravity'}
];
export const DEMOS = [
  {id:'neon',name:'NEON STATIC',bpm:126,seed:1337,stage:'club'},
  {id:'garden',name:'GARDEN PULSE',bpm:96,seed:444,stage:'garden'},
  {id:'void',name:'VOID BREAK',bpm:152,seed:808,stage:'void'}
];
export const GLYPHS = [
  {id:'blue',icon:'🟦',name:'WIDE SIGNAL',description:'Perfect window +10%',effect:'wide'},
  {id:'space',icon:'🌌',name:'COSMIC CHARGE',description:'Meter gain +5%',effect:'meter'},
  {id:'boom',icon:'💥',name:'FIRST IMPACT',description:'First combo hit +15%',effect:'strike'},
  {id:'bolt',icon:'⚡',name:'HYPERDRIVE',description:'Score x2; faster scroll',effect:'speed'},
  {id:'brain',icon:'🧠',name:'PRECOGNITION',description:'Extended note preview',effect:'preview'},
  {id:'loop',icon:'♻️',name:'SECOND CHANCE',description:'Forgives one miss per round',effect:'forgive'},
  {id:'infinity',icon:'♾️',name:'ENDLESS FIRE',description:'After 24 combo, 10-second free meter',effect:'infinite'}
];
export const LANES = [
  {id:0,button:'✕',name:'CROSS',frequency:'KICK',color:'#4db9ff',keyboard:'D'},
  {id:1,button:'○',name:'CIRCLE',frequency:'SNARE',color:'#ff6c7c',keyboard:'F'},
  {id:2,button:'□',name:'SQUARE',frequency:'SYNTH',color:'#ffce68',keyboard:'J'},
  {id:3,button:'△',name:'TRIANGLE',frequency:'LEAD',color:'#69efb7',keyboard:'K'}
];
export function mulberry32(seed) {
  let a=seed>>>0;
  return function(){ a+=0x6D2B79F5; let t=a; t=Math.imul(t^(t>>>15),t|1); t^=t+Math.imul(t^(t>>>7),t|61); return ((t^(t>>>14))>>>0)/4294967296; };
}
export function hashString(text){let h=2166136261;for(const c of String(text)){h=Math.imul(h^c.charCodeAt(0),16777619);}return h>>>0;}
export function day444(now=new Date()){const d=new Date(now);d.setHours(d.getHours()-4);d.setMinutes(d.getMinutes()-44);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');}
export const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
export function loadProgress(){
  try {const value=JSON.parse(localStorage.getItem('cosmos.rhythm.progress.v1')||'{}');return {wins:value.wins||0,best:value.best||{},glyphs:value.glyphs||['blue','space','loop'],daily:value.daily||{},arcadeBest:value.arcadeBest||0};}
  catch{return {wins:0,best:{},glyphs:['blue','space','loop'],daily:{},arcadeBest:0};}
}
export function saveProgress(p){try{localStorage.setItem('cosmos.rhythm.progress.v1',JSON.stringify(p));}catch{}}
