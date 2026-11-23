import {Summit} from './world.js';
import {BattleEffects} from './battle-effects.js';
import {enablePartyDrag} from './drag-party.js';
import {validOrder,swapSlots} from './team-order.js';
import {createDialogueGate} from './dialogue-gate.js';
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clone=s=>JSON.parse(JSON.stringify(s));
const COLORS={Normal:'#a1a286',Fire:'#d98b53',Water:'#639cac',Electric:'#b9a442',Grass:'#7e9d5a',Ice:'#7dbab5',Fighting:'#b77a63',Poison:'#a184b4',Ground:'#b6a16c',Flying:'#95a6b6',Psychic:'#c58c9c',Bug:'#9ca657',Rock:'#9b9572',Ghost:'#887f9e',Dragon:'#8394bb',Dark:'#827967',Steel:'#92a4a3',Fairy:'#c6a0ad'};
const chip=t=>`<span class="type-chip" style="--type-color:${COLORS[t]||COLORS.Normal}">${esc(t)}</span>`;
const pad=n=>String(n).padStart(2,'0');
const SAVE_KEY='kanto-gym-circuit-v2';
const STATS_KEY='kanto-champion-record-v1';
let state=null,view=null,dex=[],busy=true,lead=1,tab='fight',focusIndex=0,speed=1,sound=false,audio=null,currentSave=null,counted=false,history=[],uiEpoch=0;
let teamOrder=[],scene='field',partySelection=0,playingTurn=false;
let record={played:0,wins:0,streak:0,best:0};
let saved=null;
try{saved=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');record={...record,...JSON.parse(localStorage.getItem(STATS_KEY)||'{}')};speed=Number(localStorage.getItem('kanto-speed'))||1;sound=localStorage.getItem('kanto-sound')==='true';}catch{}
let resumable=saved?.battle?.turn>0&&!saved.battle.ended&&saved.battle.requestState!=='teampreview'?saved:null;
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
let spriteMotion=localStorage.getItem('kanto-sprite-motion')==='on'||(localStorage.getItem('kanto-sprite-motion')===null&&!reducedMotion);
const opponent=()=>state?.stage?.name||'Brock';
const opponentTitle=()=>state?.stage?.title||'PEWTER GYM';
const nextStageName=()=>['Misty','Lt. Surge','Champion Blue','Brock'][state?.stage?.index||0];
let messageId=0;
const pending=new Map();
const worker=new Worker(new URL('worker.js',location.href),{type:'module'});
worker.onmessage=({data})=>{const p=pending.get(data.id);if(p){pending.delete(data.id);data.error?p.reject(new Error(data.error)):p.resolve(data.result);}};
worker.onerror=e=>{for(const p of pending.values())p.reject(new Error(e.message||'The battle engine could not load.'));pending.clear();showEngineError();};
const request=(type,data={})=>new Promise((resolve,reject)=>{const id=++messageId;pending.set(id,{resolve,reject});worker.postMessage({id,type,...data});});
const sleep=ms=>new Promise(r=>setTimeout(r,ms/speed));
// Battle text and the VS portrait stay visible until a player action arrives.
const dialogue=createDialogueGate({
  onWait:()=>{
    document.body.classList.add('dialogue-waiting');
    $('#dialogue-continue').hidden=false;
    $('#message-sub').textContent='▶ TAP / CLICK / PRESS A TO CONTINUE';
    commands();
  },
  onAdvance:()=>{
    document.body.classList.remove('dialogue-waiting');
    $('#dialogue-continue').hidden=true;
    commands();
  }
});


function save(){
  try{
    // A newly dealt team must not overwrite the unfinished battle offered by Resume.
    if(currentSave&&(!resumable||currentSave.requestState!=='teampreview'))localStorage.setItem(SAVE_KEY,JSON.stringify({battle:currentSave,counted,lead,teamOrder,history}));
    localStorage.setItem(STATS_KEY,JSON.stringify(record));
  }catch{}
}
function stats(){for(const k of ['played','wins','streak','best'])$(`#stat-${k}`).textContent=pad(record[k]);}
function toast(text){const el=$('#toast');el.textContent=text;el.classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('visible'),3300);}
function say(main,sub=''){ $('#message').textContent=main;$('#message-sub').textContent=sub; }
function nameOf(ident){return ident?.split(': ').slice(1).join(': ')||ident||'';}
function sideOf(ident){return ident?.startsWith('p2')?'p2':'p1';}
function active(s,id){if(id==='p1'&&s?.request?.teamPreview)return s[id].pokemon.find(p=>p.slot===lead)||s[id].pokemon[0];return s?.[id]?.pokemon.find(p=>p.active)||s?.[id]?.pokemon[0];}
function health(p){return Math.max(0,p.hp/p.maxhp*100);}
function hpColor(p){return health(p)<20?'red':health(p)<50?'yellow':'';}
function monByIdent(s,ident){return s[sideOf(ident)]?.pokemon.find(p=>p.name===nameOf(ident));}
function sprite(num,back=false,motion=false){return `assets/${back?'back':motion&&spriteMotion?'calm':'front'}/${num>=1&&num<=151?num:132}.png`;}
function imageFallback(e){if(e.target.tagName==='IMG'&&!e.target.dataset.fallback){e.target.dataset.fallback='true';e.target.src=sprite(132);}}
document.addEventListener('error',imageFallback,true);

function orderedParty(){return (state?.request?.teamPreview?teamOrder:state?.p1.pokemon.map(p=>p.slot)||[]).map(slot=>view.p1.pokemon.find(p=>p.slot===slot)).filter(Boolean);}
function teamCards(side,editor=false){
  const preview=state?.request?.teamPreview,draggable=preview&&side==='p1';
  const party=draggable?orderedParty():view[side].pokemon;
  return party.map((p,index)=>`<article class="party-card ${!preview&&p.active?'is-active':''} ${draggable&&index===0?'is-lead':''} ${p.fainted?'is-fainted':''} ${editor&&index===partySelection?'party-focus':''}" ${draggable?`data-order-slot="${p.slot}"`:''} role="listitem"><button class="party-main" data-action="${draggable?'preview-lead':'inspect'}" data-side="${side}" data-mon="${esc(p.key)}" data-slot="${p.slot}" aria-label="${draggable?`${index===0?'Current lead:':'Make lead:'} ${esc(p.name)}`:`Inspect ${esc(p.name)}`}"><img src="${sprite(p.originalNum)}" alt="" draggable="false"><div class="mon-text"><div class="mon-name">${esc(p.name)}<small>Lv${p.level}</small></div><div class="mon-role">${esc(p.role)}</div><div class="mon-item">◇ ${esc(p.item||'Item used')}</div><div class="mon-hp"><i style="width:${health(p)}%;background:${health(p)<20?'#bf7051':health(p)<50?'#c7a748':'#6b9365'}"></i></div>${editor?`<div class="party-hp-count">${p.hp}/${p.maxhp}</div>`:''}</div></button><button class="party-info" data-action="inspect" data-side="${side}" data-mon="${esc(p.key)}" aria-label="Set details for ${esc(p.name)}">i</button>${draggable?`<span class="order-label">${index===0?'LEAD':pad(index+1)}</span><span class="drag-grip" aria-hidden="true">⠿</span>`:''}</article>`).join('');
}
function setScene(next){if(busy)return;scene=next;syncScene();commands();readyMessage();}
function syncScene(){
  if(!state)return;
  const preview=!!state.request?.teamPreview;
  if(!preview)scene='battle';
  $('#overworld').classList.toggle('hidden',!preview||scene!=='field');
  $('#party-overlay').classList.toggle('hidden',!preview||scene!=='party');
  $('.console').classList.toggle('mode-field',preview&&scene==='field');
  $('.console').classList.toggle('mode-party',preview&&scene==='party');
  document.body.classList.toggle('previewing',preview);
  world.enabled=preview&&scene==='field';
  if(preview&&scene==='party')$('#party-editor-grid').innerHTML=teamCards('p1',true);
  $('#screen-overlay').classList.toggle('hidden',!state.ended);
}
function swapParty(source,target){
  if(busy||!state?.request?.teamPreview)return;
  teamOrder=swapSlots(teamOrder,source,target);lead=teamOrder[0];render();save();playSound('select');
  const first=view.p1.pokemon.find(p=>p.slot===lead);say(`${first.name} will lead your team.`,'Drag any two slots to swap their places.');
}
function chooseLead(slot){if(teamOrder[0]!==slot)swapParty(teamOrder[0],slot);else{lead=slot;readyMessage();}}
const world=new Summit($('#summit-canvas'),near=>{
  $('#talk-prompt').classList.toggle('hidden',!near);
  if(state?.request?.teamPreview&&scene==='field'&&!busy)say(near?`${opponent().toUpperCase()}: Ready to battle?`:`${opponent()} is waiting at the gym.`,near?'Press A to challenge. START opens your party.':'D-pad: walk · A: talk · START: party');
});
const effects=new BattleEffects({field:$('#battlefield'),canvas:$('#effect-canvas'),layer:$('#fx-layer'),speed:()=>speed,reduced:reducedMotion});
enablePartyDrag({canDrag:()=>!busy&&!!state?.request?.teamPreview,onSwap:swapParty});

function hud(p,side){
  if(!p)return '';
  const boosts=Object.entries(p.boosts||{}).filter(([,v])=>v!==0).map(([k,v])=>`<span class="${v<0?'negative':''}">${k.toUpperCase()} ${v>0?'+':''}${v}</span>`).join('');
  return `<div class="hud-name"><span>${esc(p.species)}</span><small>Lv${p.level}</small></div><div class="hud-hp"><span>HP</span><div class="hp-track"><div class="hp-fill ${hpColor(p)}" style="width:${health(p)}%"></div></div></div>${side==='p1'?`<div class="hp-count">${Math.round(p.hp)} / ${p.maxhp}</div>`:''}<div class="hud-footer"><span>${p.status?`<span class="status-badge">${esc(p.status.toUpperCase())}</span>`:esc(p.types.join(' / ').toUpperCase())}</span><div class="boost-chips">${boosts}</div></div>`;
}
function renderField(){
  for(const [side,sel]of [['p1','player'],['p2','enemy']]){
    const p=active(view,side);if(!p)continue;
    $(`#${sel}-hud`).innerHTML=hud(p,side);
    const wrap=$(`#${sel}-sprite`),img=wrap.querySelector('img');
    const url=sprite(p.num,side==='p1',true);if(img.getAttribute('src')!==url)img.src=url;
    img.alt=`${side==='p1'?'Your':opponent()+'’s'} ${p.species}`;
    wrap.classList.toggle('fainted',p.fainted||p.hp===0);
  }
  $('#weather-label').textContent=[view.weather?.replace(/sunnyday/,'SUN').replace(/raindance/,'RAIN').replace(/sandstorm/,'SAND').replace(/snow/,'SNOW'),view.terrain].filter(Boolean).join(' · ').toUpperCase();
  $('#field-conditions').innerHTML=['p1','p2'].flatMap(id=>view[id].conditions.map(c=>`<span>${id==='p1'?'YOU':opponent().toUpperCase()}: ${esc(c.name.toUpperCase())}${c.layers>1?` ×${c.layers}`:''}</span>`)).join('');
}
function typeEffect(move,target){
  if(move.category==='Status'||!target)return '';
  const chart={Normal:{Rock:.5,Ghost:0,Steel:.5},Fire:{Fire:.5,Water:.5,Grass:2,Ice:2,Bug:2,Rock:.5,Dragon:.5,Steel:2},Water:{Fire:2,Water:.5,Grass:.5,Ground:2,Rock:2,Dragon:.5},Electric:{Water:2,Electric:.5,Grass:.5,Ground:0,Flying:2,Dragon:.5},Grass:{Fire:.5,Water:2,Grass:.5,Poison:.5,Ground:2,Flying:.5,Bug:.5,Rock:2,Dragon:.5,Steel:.5},Ice:{Fire:.5,Water:.5,Grass:2,Ice:.5,Ground:2,Flying:2,Dragon:2,Steel:.5},Fighting:{Normal:2,Ice:2,Poison:.5,Flying:.5,Psychic:.5,Bug:.5,Rock:2,Ghost:0,Dark:2,Steel:2,Fairy:.5},Poison:{Grass:2,Poison:.5,Ground:.5,Rock:.5,Ghost:.5,Steel:0,Fairy:2},Ground:{Fire:2,Electric:2,Grass:.5,Poison:2,Flying:0,Bug:.5,Rock:2,Steel:2},Flying:{Electric:.5,Grass:2,Fighting:2,Bug:2,Rock:.5,Steel:.5},Psychic:{Fighting:2,Poison:2,Psychic:.5,Dark:0,Steel:.5},Bug:{Fire:.5,Grass:2,Fighting:.5,Poison:.5,Flying:.5,Psychic:2,Ghost:.5,Dark:2,Steel:.5,Fairy:.5},Rock:{Fire:2,Ice:2,Fighting:.5,Ground:.5,Flying:2,Bug:2,Steel:.5},Ghost:{Normal:0,Psychic:2,Ghost:2,Dark:.5},Dragon:{Dragon:2,Steel:.5,Fairy:0},Dark:{Fighting:.5,Psychic:2,Ghost:2,Dark:.5,Fairy:.5},Steel:{Fire:.5,Water:.5,Electric:.5,Ice:2,Rock:2,Steel:.5,Fairy:2},Fairy:{Fire:.5,Fighting:2,Poison:.5,Dragon:2,Dark:2,Steel:.5}};
  const mult=target.types.reduce((a,t)=>a*(chart[move.type]?.[t]??1),1);
  return mult===0?'IMMUNE':mult>1?`${mult}× TYPE`:mult<1?`${mult}× TYPE`:'';
}
function commands(){
  $('#fight-tab').classList.toggle('selected',tab==='fight');$('#switch-tab').classList.toggle('selected',tab==='switch');
  $('#reroll-inline').classList.toggle('hidden',!state?.request?.teamPreview);
  $('#reroll-inline').disabled=busy;
  const el=$('#commands');
  if(busy){el.innerHTML=dialogue.waiting?'<div class="waiting-command message-wait">▶ TAP SCREEN OR PRESS A</div>':`<div class="waiting-command"><div class="loading-ring"></div> ${playingTurn?'PLAYING TURN…':'GET READY…'}</div>`;return;}
  if(state.ended){
    const won=state.winner==='YOU';
    const next=won&&!state.stage.final?'NEXT GYM':'NEW RUN';
    const note=won&&!state.stage.final?`Next: ${nextStageName()} · Team heals and evolves to Lv${[21,24,63][state.stage.index]}`:'A new team begins at Brock.';
    el.innerHTML=`<div class="start-command"><button class="challenge-button" data-action="next">${next} <span>→</span></button><button class="roll-command" data-action="log" aria-label="Read battle log">≡</button><div class="start-note">${note}</div></div>`;return;
  }
  if(state.request?.teamPreview){
    $('#fight-tab').classList.toggle('selected',scene==='field');$('#switch-tab').classList.toggle('selected',scene==='party');
    el.innerHTML=`<div class="field-commands ${resumable?'has-resume':''}"><button class="challenge-button party-menu-button" data-action="${scene==='party'?'field':'party'}">${scene==='party'?'DONE':'POKÉMON'} <span>${scene==='party'?'↩':'▦'}</span></button><button class="challenge-button" data-action="start">FIGHT ${esc(opponent().toUpperCase())} <span>→</span></button>${resumable?`<button class="resume-command" data-action="resume">RESUME LAST BATTLE · TURN ${pad(resumable.battle.turn)}</button>`:''}<div class="start-note">${scene==='party'?'Drag to swap · Tap to lead · Alt + arrows to reorder':`Lead: ${esc(state.p1.pokemon.find(p=>p.slot===lead)?.name)} · D-pad: walk · A: talk`}</div></div>`;return;
  }
  const forced=state.request?.forceSwitch?.some(Boolean),req=state.request?.active?.[0];
  if(forced)tab='switch';
  if(tab==='switch'){
    $('#switch-tab').classList.add('selected');$('#fight-tab').classList.remove('selected');
    el.innerHTML=`<div class="switch-grid">${state.p1.pokemon.map(p=>`<button class="switch-option ${p.active?'active':''}" data-command="switch ${p.slot}" ${p.fainted||p.active||(!forced&&req?.trapped)?'disabled':''} title="${esc(p.name)} · ${p.hp}/${p.maxhp} HP"><img alt="" src="${sprite(p.originalNum)}"><div><strong>${esc(p.name)}</strong><small>${p.fainted?'FAINTED':p.active?'IN BATTLE':`${Math.ceil(health(p))}% HP`}${p.status?` · ${p.status.toUpperCase()}`:''}</small></div></button>`).join('')}</div>`;
    if(req?.trapped)say(`${active(state,'p1').name} is trapped!`,'Choose a move to continue.');
  }else{
    const p=active(state,'p1'),target=active(state,'p2');
    el.innerHTML=`<div class="move-grid">${(req?.moves||[]).map((m,i)=>{const move=p.moves.find(x=>x.id===m.id)||dex.flatMap(d=>d.set.moves).find(x=>x.id===m.id)||{name:m.move,type:'Normal',category:'Physical',description:'A forced move.',power:50,accuracy:100};return `<button class="move-button" style="--type-color:${COLORS[move.type]}" data-command="move ${i+1}" ${m.disabled||m.pp===0?'disabled':''} title="${esc(move.description)}" aria-label="Use ${esc(move.name)}, ${move.type}, ${m.pp??'—'} PP"><div><span class="move-name">${esc(move.name)}</span><div class="move-meta">${chip(move.type)}<span class="category-label">${esc(move.category)}</span><span>${move.power?move.power+' PWR':'STATUS'}</span></div></div><div class="move-pp">${m.pp??'—'}/${m.maxpp??'—'}<span>PP</span></div>${typeEffect(move,target)?`<span class="effect-chip">${typeEffect(move,target)}</span>`:''}</button>`;}).join('')}</div>`;
  }
  focusIndex=0;
}
function render(){
  if(!state)return;
  $('#player-team').innerHTML=teamCards('p1');$('#champion-team').innerHTML=teamCards('p2');
  $('#opponent-name').textContent=opponent();
  $('#opponent-hint').textContent=`${state.stage.badge} ${state.stage.final?'Title':'Badge'} · Ace Lv${state.stage.aceLevel} · ${state.stage.index+1}/4`;
  $('#opponent-tag').textContent=state.stage.final?'CHAMPION BLUE':'GYM LEADER';
  $('#opponent-quote').textContent=state.stage.final?'The final hurdle. Six surprises await.':'Defeat this leader to level up and evolve your same six.';
  const portrait=$('#opponent-portrait');
  portrait.src=`assets/trainers/${state.stage.id}.svg`;
  portrait.alt=`${opponent()} trainer pixel art`;
  $('.world-location').textContent=opponentTitle();
  $('.world-trainer-label').textContent=opponent().toUpperCase();
  $('#summit-canvas').setAttribute('aria-label',`Approach ${opponent()} at ${opponentTitle()}`);

  $('#team-hint').textContent=state.request?.teamPreview?'Drag to swap. Tap a Pokémon to lead.':'Tap a Pokémon to inspect its set.';
  $('#turn-counter').textContent=state.ended?'BATTLE OVER':state.turn?`TURN ${pad(state.turn)}`:'READY?';
  $('#screen-state').textContent=state.ended?(state.winner==='YOU'?state.stage.final?'NEW CHAMPION':state.stage.badge.toUpperCase()+' BADGE':'RUN ENDED'):`${opponentTitle()} · LV${state.stage.aceLevel}`;
  renderField();syncScene();commands();stats();
}
function overlay(){
  const el=$('#screen-overlay');
  if(state.ended){
    el.classList.remove('hidden');
    const won=state.winner==='YOU';
    el.innerHTML=`<div class="boot-card"><span class="eyebrow">${esc(opponentTitle())} · RESULT</span><div class="result-score ${won?'':'loss'}">${won?state.stage.final?'CHAMPION!':esc(state.stage.badge.toUpperCase()+' BADGE!'):'RUN OVER'}</div><p>${won?state.stage.final?'You conquered the circuit.':`You defeated ${esc(opponent())}!`:`${esc(opponent())} defeated your team.`}</p><span>${won&&!state.stage.final?'Your same six will return stronger.':'Start a new run from Pewter.'}</span></div>`;
  }else el.classList.add('hidden');
}

function synth(freq=440,duration=.08,type='square',gain=.018){
  if(!sound)return;try{audio??=new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,audio.currentTime);g.gain.setValueAtTime(gain,audio.currentTime);g.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+duration);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+duration);}catch{}
}
function playSound(type){if(type==='hit'){synth(95,.13,'sawtooth',.015);setTimeout(()=>synth(55,.1,'triangle',.02),30);}else if(type==='win'){[392,494,587,784].forEach((f,i)=>setTimeout(()=>synth(f,.2,'square'),i*120));}else synth(520,.05);}
async function animateMove(ident,moveName,targetIdent){
  const side=sideOf(ident),p=monByIdent(view,ident),move=p?.moves.find(m=>m.name===moveName)||dex.flatMap(d=>d.set.moves).find(m=>m.name===moveName)||{type:'Normal',category:'Physical'};
  const self=move.target==='self'||['Recover','Roost','Synthesis','Morning Sun','Rest','Soft-Boiled','Slack Off','Wish','Protect','Nasty Plot','Shell Smash','Swords Dance','Dragon Dance','Growth','Quiver Dance','Iron Defense','Harden','Curse','Belly Drum','Bulk Up','Coil','Agility','Calm Mind'].includes(moveName);
  playSound(move.category==='Status'?'select':'hit');
  await effects.move({side,target:self?side:sideOf(targetIdent||`${side==='p1'?'p2':'p1'}a: `),name:moveName,type:move.type,category:move.category,self});
}
async function damageAnimation(p,ident,heal=false,amount=0){
  renderField();await effects.damage(sideOf(ident),amount,heal);
}

function condition(p,value){if(!p||!value)return;const [hp,status]=value.split(' ');if(hp==='0'){p.hp=0;return;}const [now,max]=hp.split('/').map(Number);if(Number.isFinite(now))p.hp=max?Math.max(0,Math.round(now/max*p.maxhp)):now;if(status&&status!=='fnt')p.status=status;}

function describe(line){
  const [,kind,a,b,c,...rest]=line.split('|'),name=nameOf(a),owner=sideOf(a)==='p2'?`${opponent()}’s `:'';
  switch(kind){
    case 'turn':return `Turn ${a}`;
    case 'switch':case 'drag':return `${sideOf(a)==='p2'?`${opponent()} sent out`:'Go,'} ${name}!`;
    case 'move':return `${owner}${name} used ${b}!`;
    case 'faint':return `${owner}${name} fainted!`;
    case '-supereffective':return 'It’s super effective!';
    case '-resisted':return 'It’s not very effective…';
    case '-crit':return 'A critical hit!';
    case '-miss':return 'The attack missed!';
    case '-immune':return `${name} is immune!`;
    case '-fail':return 'But it failed!';
    case '-status':return `${name} ${ {brn:'was burned!',par:'was paralyzed!',psn:'was poisoned!',tox:'was badly poisoned!',slp:'fell asleep!',frz:'was frozen!'}[b]||b}`;
    case '-curestatus':return `${name} recovered from ${b}!`;
    case '-boost':return `${name}’s ${b.toUpperCase()} rose${+c>1?' sharply':''}!`;
    case '-unboost':return `${name}’s ${b.toUpperCase()} fell${+c>1?' sharply':''}!`;
    case '-weather':return a==='none'?'The weather cleared.':`Weather: ${a.replace('SunnyDay','harsh sunlight').replace('RainDance','rain')}.`;
    case '-sidestart':return `${a.startsWith('p2')?opponent()+'’s':'Your'} side: ${b.replace('move: ','')}.`;
    case '-sideend':return `${b.replace('move: ','')} wore off.`;
    case '-enditem':return `${name} used its ${b}!`;
    case '-item':return `${name} obtained ${b}!`;
    case '-ability':return `${name}’s ${b}!`;
    case '-activate':return `${name}: ${b.replace(/^(move|ability|item): /,'')}!`;
    case '-start':return `${name}: ${b.replace(/^move: /,'')}!`;
    case '-end':return `${name}’s ${b.replace(/^move: /,'')} ended.`;
    case 'cant':return `${name} couldn’t move! (${b})`;
    case '-heal':return `${name} recovered health${c?.includes('item:')?` with ${c.split('item: ')[1]}`:''}.`;
    case '-damage':return c?.includes('[from]')?`${name} took damage from ${c.replace('[from] ','').replace(/^(item|ability|move): /,'')}.`:`${name} took damage!`;
    case '-fieldstart':return `${a.replace(/^move: /,'')} is active!`;
    case '-fieldend':return `${a.replace(/^move: /,'')} ended.`;
    case '-transform':return `${name} transformed into ${nameOf(b)}!`;
    case 'win':return `${a} won the battle!`;
    case 'tie':return 'The battle ended in a draw.';
    case 'message':case '-message':return a;
    default:return '';
  }
}
async function playLogs(lines){
  const epoch=uiEpoch;
  for(const line of lines){
    if(epoch!==uiEpoch)return;
    const [,kind,a,b,c]=line.split('|');
    const text=describe(line);
    if(text){history.push({text,kind});if(history.length>600)history.shift();}
    const p=a?.startsWith('p')?monByIdent(view,a):null;
    if(kind==='move'){
      say(text,'');await animateMove(a,b,c);
    }else if(kind==='switch'||kind==='drag'){
      for(const q of view[sideOf(a)].pokemon)q.active=false;
      if(p){p.active=true;p.fainted=false;condition(p,c);renderField();}
      say(text,'');await effects.entry(sideOf(a));
    }else if(kind==='-damage'||kind==='-heal'){
      const oldHP=p?.hp||0;condition(p,b);if(text)say(text,'');await damageAnimation(p,a,kind==='-heal',Math.abs((p?.hp||0)-oldHP));
    }else if(kind==='faint'){
      say(text,'');await effects.faint(sideOf(a));if(p){p.hp=0;p.fainted=true;}renderField();await sleep(100);
    }else if(kind==='-status'){
      if(p)p.status=b;say(text,'');renderField();await sleep(180);
    }else if(kind==='-curestatus'){
      if(p)p.status='';say(text,'');renderField();await sleep(150);
    }else if(kind==='-boost'||kind==='-unboost'){
      if(p)p.boosts[b]=Math.max(-6,Math.min(6,(p.boosts[b]||0)+(+c)*(kind==='-boost'?1:-1)));say(text,'');renderField();await sleep(120);
    }else if(['-supereffective','-resisted','-crit','-miss','-immune','-fail','cant','-activate','-transform'].includes(kind)){
      say(text,'');await sleep(180);
    }else if(text&&kind!=='turn'&&kind!=='win'&&kind!=='tie'){
      say(text,'');await sleep(100);
    }
    // Never discard a readable result while another event or opponent move plays.
    // Each line of narrated text, including KOs and results, requires a fresh tap.
    if(text&&kind!=='turn')await dialogue.wait();
  }
}
function readyMessage(){
  if(state.ended){say(state.winner==='YOU'?state.stage.final?'You became Kanto Champion!':`${opponent()} defeated! Badge secured.`:'Your Kanto run ended.',state.winner==='YOU'&&!state.stage.final?`Next: ${nextStageName()} · Your six stay together.`:`${record.wins} wins · Best streak: ${record.best}`);return;}
  if(state.request?.teamPreview){say(scene==='party'?'Choose the order of your six.':world.near()?`${opponent().toUpperCase()}: Ready for a battle?`:`${opponent()} awaits. Ace Lv${state.stage.aceLevel}.`,scene==='party'?'Drag to swap · First slot leads · B: done':world.near()?'A: challenge · START: party':'D-pad: walk · A: talk · START: party');return;}
  const p=active(state,'p1');
  if(state.request?.forceSwitch?.some(Boolean))say(`${p.name} can’t battle anymore.`,'Choose your next Pokémon.');
  else say(`What will ${p.name} do?`,`${p.ability} · ${p.item||'No held item'}${state.request?.active?.[0]?.trapped?' · TRAPPED':''}`);
}

async function apply(result,animate=false){
  if(result.catalog)dex=result.catalog;
  currentSave=result.save;
  if(result.state.ended&&!counted){counted=true;if(result.state.winner==='YOU'){record.wins++;record.streak++;record.best=Math.max(record.best,record.streak);playSound('win');}else record.streak=0;}
  save();
  if(animate){playingTurn=true;commands();await playLogs(result.logs);playingTurn=false;}
  state=result.state;view=clone(state);busy=false;
  if(state.request?.teamPreview){const slots=state.p1.pokemon.map(p=>p.slot);if(!validOrder(teamOrder,slots))teamOrder=slots;lead=teamOrder[0];}
  if(state.request?.forceSwitch?.some(Boolean))tab='switch';
  render();overlay();readyMessage();save();
}
async function run(type,data={}){
  if(busy)return;
  busy=true;focusIndex=0;commands();
  try{
    const r=await request(type,data);
    if(type==='start'){record.played++;resumable=null;}
    if(type==='act')tab='fight';
    if(type==='start'){scene='battle';$('#overworld').classList.add('hidden');$('#party-overlay').classList.add('hidden');$('.console').classList.remove('mode-field','mode-party');world.enabled=false;$('#screen-overlay').classList.add('hidden');say(`${opponent().toUpperCase()} wants to battle!`,'');await effects.intro(opponent(),()=>dialogue.wait());}
    await apply(r,true);
  }catch(e){busy=false;commands();toast(e.message);readyMessage();}
}
async function fresh(){
  if(busy)return;
  counted=false;history=[];lead=1;teamOrder=[];scene='field';partySelection=0;tab='fight';uiEpoch++;world.reset();
  await run('new');
}
async function advanceCircuit(){
  if(busy||!state?.ended)return;
  if(state.winner!=='YOU'||state.stage.final){await fresh();return;}
  counted=false;scene='field';tab='fight';partySelection=0;uiEpoch++;world.reset();
  await run('advance');
  if(state?.stage)toast(`Your team grew to Lv${state.stage.aceLevel}! Next: ${opponent()}.`);
}
async function resumeBattle(){
  if(busy||!resumable)return;
  const previous=resumable;busy=true;commands();
  try{
    const result=await request('resume',{saved:previous.battle});
    counted=!!previous.counted;history=previous.history||[];teamOrder=previous.teamOrder||[];lead=previous.lead||1;scene='battle';tab='fight';resumable=null;
    await apply(result);toast(`Resumed your battle at turn ${state.turn}.`);
  }catch(error){resumable=null;busy=false;commands();save();toast(error.message);}
}
async function begin(){
  if(busy||!state?.request?.teamPreview)return;
  if(scene==='field'&&!world.near()){busy=true;commands();await world.approach(sleep);busy=false;}
  run('start',{lead:teamOrder[0],order:[...teamOrder]});
}
function showEngineError(){
  busy=false;$('#screen-overlay').classList.remove('hidden');$('#screen-overlay').innerHTML='<div class="boot-card"><h3>CARTRIDGE ERROR</h3><p>The battle engine couldn’t load.</p><span>Refresh to try again.</span></div>';say('Couldn’t load the battle engine.','Refresh the page to retry.');
  $('#commands').innerHTML='<button class="challenge-button" data-action="reload">RELOAD GAME <span>↻</span></button>';
}

function modal(title,html,kicker='KANTO / GYM CIRCUIT'){
  $('#modal-title').textContent=title;$('#modal-kicker').textContent=kicker;$('#modal-body').innerHTML=html;if(!$('#modal').open)$('#modal').showModal();
}
function closeModal(){if($('#modal').open)$('#modal').close();}
function inspect(key,side='p1',dexNumber=null){
  const p=dexNumber?null:state?.[side]?.pokemon.find(p=>p.key===key);
  const entry=dex.find(d=>d.num===(dexNumber||p?.originalNum));if(!entry)return;
  const set=p||entry.set;
  const types=p?.types||entry.types,moves=p?.moves||entry.set.moves;
  const evs=Object.entries(set.evs||{}).filter(([,n])=>n).map(([k,n])=>`${n} ${k.toUpperCase()}`).join(' / ');
  const canLead=p&&side==='p1'&&state.request?.teamPreview;
  modal(entry.name,`<div class="detail-header"><div class="detail-image"><img src="${sprite(p?.num||entry.num)}" alt="${esc(entry.name)}"></div><div><span class="eyebrow">#${String(entry.num).padStart(3,'0')} · LEVEL ${p?.level||100}</span><p class="detail-role">${esc(set.role)}</p><div class="detail-types">${types.map(chip).join('')}</div></div></div><div class="detail-info"><div class="detail-cell"><b>HELD ITEM</b>${esc(set.item||'Item used / removed')}${p&&p.item!==p.originalItem?`<small>Started with ${esc(p.originalItem)}</small>`:''}</div><div class="detail-cell"><b>ABILITY</b>${esc(set.ability)}<small>${esc(p?.abilityDescription||entry.abilityDescription)}</small></div><div class="detail-cell"><b>NATURE</b>${esc(set.nature)}</div><div class="detail-cell"><b>EV SPREAD</b><small>${esc(evs)}</small></div></div>${moves.map(m=>`<div class="detail-move"><div><strong>${esc(m.name)}</strong><p>${esc(m.description)}</p></div><div>${chip(m.type)}<br>${m.category} · ${m.power||'—'} power<br>${m.accuracy===true?'Always hits':m.accuracy+'% acc'} · ${m.pp}${m.maxpp?'/'+m.maxpp:''} PP</div></div>`).join('')}<div class="detail-stats">${Object.entries(p?.stats||entry.baseStats).map(([k,v])=>`<div class="detail-stat">${k.toUpperCase()}<b>${v}</b></div>`).join('')}</div><p class="dex-summary">${p?'Battle stats with nature, IVs, and EVs.':'Base species stats. This is the set used when rolled.'}</p>${canLead?`<button class="challenge-button detail-lead" data-action="lead" data-slot="${p.slot}">${lead===p.slot?'CURRENT LEAD':'MAKE THIS YOUR LEAD'} <span>→</span></button>`:''}`,dexNumber?'THE ORIGINAL 151 · SET LIBRARY':`${side==='p2'?opponent().toUpperCase():'YOUR TEAM'} · OPEN TEAM SHEET`);
}
function showDex(){
  if(!dex.length){toast('The Pokédex is still loading.');return;}
  modal('The original 151.',`<div class="dex-search"><input type="search" id="dex-search" placeholder="Search Pokémon, number, or role…" aria-label="Search Pokédex"><select id="dex-type" aria-label="Filter by type"><option value="">All types</option>${Object.keys(COLORS).map(t=>`<option>${t}</option>`).join('')}</select></div><div class="dex-grid" id="dex-grid"></div><span class="dex-summary" id="dex-summary"></span>`,'POKÉDEX · COMPETITIVE SET LIBRARY');
  filterDex();
}
function filterDex(){
  const query=($('#dex-search')?.value||'').toLowerCase(),type=$('#dex-type')?.value;
  const matches=dex.filter(d=>(!type||d.types.includes(type))&&`${d.name} ${d.num} ${String(d.num).padStart(3,'0')} ${d.set.role}`.toLowerCase().includes(query));
  $('#dex-grid').innerHTML=matches.map(d=>`<button class="dex-mon" data-action="dex-inspect" data-num="${d.num}"><small>#${String(d.num).padStart(3,'0')}</small><img src="${sprite(d.num)}" alt="" loading="lazy"><span>${esc(d.name)}</span></button>`).join('')||'<p class="dex-summary">No Pokémon found.</p>';
  $('#dex-summary').textContent=`${matches.length} of 151 Pokémon · Tap a sprite to inspect the set.`;
}
function showLog(){modal('Battle record.',`<div class="battle-log" id="battle-log">${history.length?history.map(e=>`<p class="${e.kind==='turn'?'log-turn':''}">${esc(e.text)}</p>`).join(''):'<p>Your battle hasn’t started yet. Pick your lead and challenge the leader.</p>'}</div><div class="modal-actions">${state&&!state.ended&&!state.request?.teamPreview?'<button class="secondary-button" data-action="forfeit">FORFEIT BATTLE</button>':''}<button class="secondary-button" data-action="close">BACK TO BATTLE</button></div>`);const log=$('#battle-log');log.scrollTop=log.scrollHeight;}
function showGuide(){modal('The Kanto Gym Circuit.',`<div class="guide-content"><span class="guide-pill">3 Gym Leaders + Champion</span><span class="guide-pill">Six evolving partners</span><span class="guide-pill">Ace-level caps</span><span class="guide-pill">Original 151</span><h3>THE CIRCUIT</h3><p>Brock Lv14 → Misty Lv21 → Lt. Surge Lv24 → Champion Blue Lv63, using his original Pidgeot, Alakazam, Rhydon, Exeggutor, Arcanine and Blastoise. Every victory heals your same six Pokémon and raises them to match the next boss's ace. Level evolutions occur at their normal thresholds; trade and stone evolutions unlock at Lv36 for the Champion leap.</p><h3>THE AI</h3><p>Brock chooses from several reasonable moves, Misty narrows her decisions, Surge chooses the strongest immediate option, and Blue runs limited turn simulations against possible replies. Opponents never inspect your chosen move before deciding.</p><h3>THE RULES</h3><p>Pokémon Showdown Gen 9 National Dex mechanics. Six permanent partners for each four-fight run, but fainting in one battle does not permanently remove them. Losing restarts with a fresh six. Your Pokémon match the opponent's ace level. Move sets refresh when Pokémon evolve.</p><h3>CONTROLS</h3><p>Walk with D-pad and press A to challenge, or tap the fight button. START opens your party. Drag to reorder, tap to lead. Battle moves, switches, and controller input work as before. Sound and sprite motion can be toggled separately.</p></div>`,'FIELD GUIDE · FOUR FIGHTS');}

function credits(){modal('Built on good company.',`<div class="guide-content"><p>A fan-made battle challenge built for Han. Pokémon characters, names, and original FireRed/LeafGreen sprites belong to Nintendo, Game Freak, and The Pokémon Company.</p><h3>BATTLE ENGINE</h3><p><a href="https://github.com/pkmn/ps" target="_blank" rel="noopener">@pkmn/sim</a>, a browser-compatible extraction of the MIT-licensed <a href="https://github.com/smogon/pokemon-showdown" target="_blank" rel="noopener">Pokémon Showdown simulator</a>. The battle AI, interface, and move effects are custom.</p><h3>SPRITES & TYPE</h3><p>FireRed/LeafGreen back sprites and animated Emerald front sprites from <a href="https://github.com/PokeAPI/sprites" target="_blank" rel="noopener">PokéAPI Sprites</a>. Blue’s trainer sprite hosted by Pokémon Showdown. Silkscreen by Jason Kottke and Space Grotesk by Florian Karsten, distributed under the SIL Open Font License.</p><p>No official affiliation. No account, battle server, or external API needed during play.</p></div>`,'KANTO / CHAMPION LOOP · CREDITS');}

function control(key){
  // Pointer buttons are acknowledged by the click-capture listener below.
  // Keyboard and gamepad A also reach the same gate without triggering moves.
  if(dialogue.waiting)return;
  if($('#modal').open){if(key==='b')closeModal();return;}
  if(busy)return;
  if(state?.request?.teamPreview){
    if(scene==='field'){if(key==='b'){setScene('party');return;}if(key==='a'){if(world.near())begin();else say(`${opponent()} is at the top of the stairs.`,`Walk up, or tap FIGHT ${opponent().toUpperCase()} to approach.`);return;}world.move(key);playSound('select');return;}
    if(key==='b'){setScene('field');return;}
    if(key==='a'){chooseLead(teamOrder[partySelection]);return;}
    const delta={up:-1,down:1,left:-1,right:1}[key]||0;partySelection=(partySelection+delta+6)%6;
    $$('#party-editor-grid .party-card').forEach((card,i)=>card.classList.toggle('party-focus',i===partySelection));playSound('select');return;
  }
  if(key==='b'){
    if(busy)return;
    tab=tab==='fight'?'switch':'fight';commands();return;
  }
  const options=$$('#commands button:not(:disabled)');if(!options.length)return;
  if(key==='a'){options[Math.min(focusIndex,options.length-1)]?.click();return;}
  const isSwitch=tab==='switch'&&!state?.request?.teamPreview;
  const cols=isSwitch?(matchMedia('(orientation: landscape) and (max-height: 600px)').matches?2:3):matchMedia('(orientation: landscape) and (max-height: 600px)').matches?1:2;
  const delta={left:-1,right:1,up:-cols,down:cols}[key]||0;
  focusIndex=(focusIndex+delta+options.length)%options.length;
  $$('#commands .control-focus').forEach(n=>n.classList.remove('control-focus'));options[focusIndex].classList.add('control-focus');playSound('select');
}

let hardwareHandled=false,hardwareRepeat=null;
document.addEventListener('pointerdown',e=>{
  const button=e.target.closest('[data-key]');hardwareHandled=false;if(!button)return;
  hardwareHandled=true;control(button.dataset.key);
  if(['up','down','left','right'].includes(button.dataset.key)&&state?.request?.teamPreview&&scene==='field'){const key=button.dataset.key;hardwareRepeat=setTimeout(()=>{hardwareRepeat=setInterval(()=>control(key),145);},240);}
});
const stopHardware=()=>{clearTimeout(hardwareRepeat);clearInterval(hardwareRepeat);hardwareRepeat=null;};
document.addEventListener('pointerup',stopHardware);document.addEventListener('pointercancel',stopHardware);window.addEventListener('blur',stopHardware);
// Capture console taps before button commands fire. A single tap means one
// acknowledgement, regardless of whether the user taps the text, A, or the field.
document.addEventListener('click',e=>{
  if(!dialogue.waiting||!e.target.closest('.console'))return;
  e.preventDefault();e.stopImmediatePropagation();
  dialogue.advance();
},true);
document.addEventListener('click',async e=>{
  const button=e.target.closest('button');if(!button)return;
  if(button.dataset.key){if(hardwareHandled&&e.detail>0){hardwareHandled=false;return;}control(button.dataset.key);return;}
  if(button.dataset.command){if(!busy)run('act',{command:button.dataset.command});return;}
  const action=button.dataset.action;if(!action)return;
  playSound('select');
  switch(action){
    case 'start':begin();break;
    case 'resume':resumeBattle();break;
    case 'start-key':if(state?.request?.teamPreview)setScene(scene==='party'?'field':'party');else if(state?.ended)advanceCircuit();else showLog();break;
    case 'reroll':if(busy)return;if(!state?.request?.teamPreview&&!state?.ended){toast('Reroll before a battle, or forfeit from the battle log.');return;}fresh();break;
    case 'next':advanceCircuit();break;
    case 'fight':if(!busy){if(state?.request?.teamPreview){begin();return;}if(state?.request?.forceSwitch?.some(Boolean)){toast('Choose a replacement Pokémon first.');return;}tab='fight';commands();}break;
    case 'switch':if(!busy){if(state?.request?.teamPreview){setScene('party');return;}tab='switch';commands();}break;
    case 'inspect':if(state)inspect(button.dataset.mon,button.dataset.side);break;
    case 'inspect-active':if(state)inspect(active(state,button.dataset.side).key,button.dataset.side);break;
    case 'champion':if(state)modal(opponent()+'.',`<p class="detail-role">${esc(opponentTitle())} · Ace Lv${state.stage.aceLevel} · Stage ${state.stage.index+1} of 4</p><div class="party-list champion-sheet">${teamCards('p2')}</div>`,'OPEN TEAM SHEET');break;
    case 'dex-inspect':inspect(null,'p1',+button.dataset.num);break;
    case 'lead':chooseLead(+button.dataset.slot);closeModal();break;
    case 'preview-lead':if(!busy)chooseLead(+button.dataset.slot);break;
    case 'party':if(!busy)setScene('party');break;
    case 'field':if(!busy)setScene('field');break;
    case 'dex':showDex();break;
    case 'guide':showGuide();break;
    case 'credits':credits();break;
    case 'log':showLog();break;
    case 'battle':closeModal();break;
    case 'close':closeModal();break;
    case 'sound':sound=!sound;document.body.classList.toggle('sound-on',sound);button.setAttribute('aria-label',sound?'Mute sound':'Enable sound');try{localStorage.setItem('kanto-sound',String(sound));}catch{}if(sound)synth();toast(sound?'Sound on · Retro battle effects':'Sound muted');break;
    case 'speed':speed=speed===1?2:speed===2?4:1;button.textContent=`${speed}×`;try{localStorage.setItem('kanto-speed',speed);}catch{}break;
    case 'fullscreen':{
      const expand=!document.body.classList.contains('game-expanded');document.body.classList.toggle('game-expanded',expand);
      if(expand){try{await $('.console').requestFullscreen?.();}catch{}}else if(document.fullscreenElement)document.exitFullscreen?.();break;
    }
    case 'forfeit':if(busy){toast('Wait until this turn finishes.');return;}modal('Leave this run?',`<div class="guide-content"><p>Forfeiting restarts from Brock with a fresh random team.</p></div><div class="modal-actions"><button class="secondary-button" data-action="close">KEEP BATTLING</button><button class="danger-button" data-action="confirm-forfeit">FORFEIT & REROLL</button></div>`);break;
    case 'confirm-forfeit':record.streak=0;save();closeModal();fresh();break;
    case 'reload':location.reload();break;
  }
});
document.addEventListener('input',e=>{if(e.target.id==='dex-search')filterDex();});
document.addEventListener('change',e=>{if(e.target.id==='dex-type')filterDex();});
$('#modal').addEventListener('click',e=>{if(e.target===$('#modal')){const r=$('#modal').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeModal();}});
document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement)document.body.classList.remove('game-expanded');});
document.addEventListener('keydown',e=>{
  if(['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName))return;
  if(dialogue.waiting){
    if(['Enter',' ','z','Z','x','X'].includes(e.key)&&!e.repeat){e.preventDefault();dialogue.advance();}
    return;
  }
  const key={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',z:'a',Z:'a',Enter:'a',x:'b',X:'b',Escape:'b'}[e.key];
  if(key){e.preventDefault();if(!e.repeat||(state?.request?.teamPreview&&scene==='field'))control(key);}
  else if(e.code==='Space'){e.preventDefault();if(!e.repeat)$('#modal').open?closeModal():state?.request?.teamPreview?setScene(scene==='party'?'field':'party'):state?.ended?advanceCircuit():showLog();}
  else if(e.key.toLowerCase()==='l'){e.preventDefault();showLog();}
});
let gamepadFrame=null,lastButtons={},lastPadTime=0;
function pollGamepad(time){
  const pad=[...(navigator.getGamepads?.()||[])].find(Boolean);
  if(pad){const buttons={a:pad.buttons[0]?.pressed,b:pad.buttons[1]?.pressed,select:pad.buttons[8]?.pressed,start:pad.buttons[9]?.pressed,up:pad.buttons[12]?.pressed||pad.axes[1]<-.5,down:pad.buttons[13]?.pressed||pad.axes[1]>.5,left:pad.buttons[14]?.pressed||pad.axes[0]<-.5,right:pad.buttons[15]?.pressed||pad.axes[0]>.5};for(const [key,pressed]of Object.entries(buttons)){if(pressed&&(!lastButtons[key]||(state?.request?.teamPreview&&scene==='field'&&['up','down','left','right'].includes(key)))&&time-lastPadTime>140){lastPadTime=time;if(dialogue.waiting){if(key==='a'||key==='b'||key==='start')dialogue.advance();}
        else if(key==='start')$('[data-action="start-key"]').click();else if(key==='select')showLog();else control(key);}}lastButtons=buttons;}
  gamepadFrame=requestAnimationFrame(pollGamepad);
}
window.addEventListener('gamepadconnected',()=>{if(!gamepadFrame)gamepadFrame=requestAnimationFrame(pollGamepad);toast('Controller connected · A confirms, B goes back.');});
const motionButton=document.createElement('button');
motionButton.type='button';motionButton.className='nav-button';motionButton.style.cssText='font-size:9px;padding:5px;border:1px solid currentColor;border-radius:5px';
const syncMotion=()=>{motionButton.textContent=spriteMotion?'SPRITES ON':'SPRITES OFF';motionButton.setAttribute('aria-pressed',String(spriteMotion));};
syncMotion();
motionButton.addEventListener('click',()=>{spriteMotion=!spriteMotion;localStorage.setItem('kanto-sprite-motion',spriteMotion?'on':'off');syncMotion();if(state)renderField();toast(spriteMotion?'Animated opponent sprites on':'Static opponent sprites on');});
document.querySelector('.site-header nav')?.append(motionButton);
document.body.classList.toggle('sound-on',sound);$('.sound-button').setAttribute('aria-label',sound?'Mute sound':'Enable sound');$('.speed-button').textContent=`${speed}×`;stats();
try{
  const result=await request('boot');
  counted=false;lead=1;history=[];teamOrder=[];
  await apply(result);
}catch(e){showEngineError();toast(e.message);}
