import {Dex} from '@pkmn/sim';
import {SETS,SPECIES,cloneSet} from './sets.js';

// Each new fight starts at the upcoming opponent's ace level.
// The three badges are followed by one randomized, six-Pokemon Champion.
export const STAGES=Object.freeze([
  {id:'brock',name:'Brock',title:'PEWTER GYM',badge:'Boulder',aceLevel:14,skill:0,
    roster:[[74,12],[95,14]]},
  {id:'misty',name:'Misty',title:'CERULEAN GYM',badge:'Cascade',aceLevel:21,skill:1,
    roster:[[120,18],[54,19],[121,21]]},
  {id:'surge',name:'Lt. Surge',title:'VERMILION GYM',badge:'Thunder',aceLevel:24,skill:2,
    roster:[[100,21],[25,22],[82,23],[26,24]]},
  {id:'blue',name:'Blue',title:'INDIGO PLATEAU',badge:'Champion',aceLevel:63,skill:3,roster:null}
]);

function shuffle(numbers,rng=Math.random){
  const pool=[...numbers];
  for(let i=pool.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
  return pool;
}
function inKanto(name){const n=Dex.species.get(name).num;return n>=1&&n<=151;}
const familyRoots=SPECIES.filter(s=>!s.prevo&&(s.evos||[]).some(inKanto)).map(s=>s.num);
const championPool=SPECIES.filter(s=>s.num<144&&!(s.evos||[]).some(inKanto)&&s.num!==132).map(s=>s.num);
export function newRun(rng=Math.random){
  return {stage:0,party:shuffle(familyRoots,rng).slice(0,6),champion:shuffle(championPool,rng).slice(0,6)};
}
// Stone and trade evolutions unlock at the Champion jump. Natural level
// evolutions trigger at their actual level threshold, including multi-stage lines.
export function evolutionAtLevel(baseNum,level){
  let species=Dex.species.get(SETS[baseNum]?.species);
  if(!species?.exists)return baseNum;
  let guard=0;
  while(guard++<3){
    const nextName=(species.evos||[]).find(inKanto);if(!nextName)break;
    const next=Dex.species.get(nextName);
    const threshold=Number.isFinite(next.evoLevel)?next.evoLevel:36;
    if(level<threshold)break;
    species=next;
  }
  return species.num;
}
export function partyForStage(party,stage){
  const level=STAGES[stage].aceLevel;
  return party.map(num=>({...cloneSet(SETS[evolutionAtLevel(num,level)]),level}));
}
export function foeForStage(stage,champion){
  const info=STAGES[stage];
  if(info.roster)return info.roster.map(([num,level])=>({...cloneSet(SETS[num]),level}));
  return champion.map(num=>({...cloneSet(SETS[num]),level:info.aceLevel}));
}
export function stageInfo(stage){
  const s=STAGES[stage];
  return {index:stage,id:s.id,name:s.name,title:s.title,badge:s.badge,aceLevel:s.aceLevel,skill:s.skill,total:STAGES.length,final:stage===STAGES.length-1};
}
export function validRun(run){
  return !!run&&Number.isInteger(run.stage)&&run.stage>=0&&run.stage<STAGES.length&&
    Array.isArray(run.party)&&run.party.length===6&&new Set(run.party).size===6&&run.party.every(n=>familyRoots.includes(n))&&
    Array.isArray(run.champion)&&run.champion.length===6&&new Set(run.champion).size===6&&run.champion.every(n=>championPool.includes(n));
}
