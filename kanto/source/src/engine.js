import {Battle,Dex,PRNG,extractChannelMessages} from '@pkmn/sim';
import {randomTeam,championTeam,SETS,SPECIES} from './sets.js';
import {validOrder} from './team-order.js';

export const FORMAT = {name:'Kanto Champion Loop',mod:'gen9',ruleset:['Standard NatDex','Terastal Clause']};
Dex.formats.extend([FORMAT]);

export function createBattle(team=randomTeam(),seed) {
  return new Battle({formatid:'kantochampionloop',seed,
    p1:{name:'YOU',team},p2:{name:'BLUE',team:championTeam()}});
}

export function legalChoices(b,sideID) {
  const side=b[sideID],r=side.activeRequest;
  if(!r||r.wait||b.ended) return [];
  if(r.teamPreview) return [{command:'team 1',kind:'team',score:0}];
  const switches=side.pokemon.map((p,i)=>({p,i})).filter(({p})=>p.hp>0&&!p.isActive).map(({p,i})=>({command:`switch ${i+1}`,kind:'switch',pokemon:p}));
  if(r.forceSwitch) return switches;
  const active=r.active?.[0];
  const moves=(active?.moves||[]).map((m,i)=>({command:`move ${i+1}`,kind:'move',move:Dex.moves.get(m.id),disabled:m.disabled,pp:m.pp})).filter(m=>!m.disabled&&m.pp!==0);
  return [...moves,...(!active?.trapped?switches:[])];
}

function stat(p,id) {
  let n=p.getStat(id,false,true);
  if(id==='spe'){if(p.item==='choicescarf')n*=1.5;if(p.status==='par')n*=.5;}
  return n;
}

function effectiveness(move,target) {
  if(!Dex.getImmunity(move.type,target))return 0;
  const immunities={levitate:'Ground',waterabsorb:'Water',dryskin:'Water',stormdrain:'Water',voltabsorb:'Electric',lightningrod:'Electric',motordrive:'Electric',flashfire:'Fire',sapsipper:'Grass'};
  if(immunities[target.ability]===move.type)return 0;
  return 2**Dex.getEffectiveness(move.type,target);
}

export function expectedDamage(b,source,target,move) {
  if(!source||!target||move.category==='Status')return 0;
  const eff=effectiveness(move,target);
  if(!eff)return 0;
  if(move.damage==='level')return 100;
  if(typeof move.damage==='number')return move.damage;
  let power=move.basePower||70;
  if(move.id==='gyroball')power=Math.min(150,25*stat(target,'spe')/Math.max(1,stat(source,'spe')));
  if(move.id==='flail')power=source.hp/source.maxhp<.05?200:source.hp/source.maxhp<.2?100:20;
  if(move.id==='grassknot')power=target.species.weightkg>=200?120:target.species.weightkg>=100?100:target.species.weightkg>=50?80:60;
  if(move.id==='facade'&&source.status)power*=2;
  if(move.id==='knockoff'&&target.item)power*=1.5;
  if(move.multihit)power*=source.ability==='skilllink'?5:Array.isArray(move.multihit)?3:move.multihit;
  const physical=move.category==='Physical';
  let atk=stat(source,physical?'atk':'spa'),def=stat(target,physical?'def':'spd');
  if(target.item==='eviolite'&&target.species.nfe)def*=1.5;
  if(target.item==='assaultvest'&&!physical)def*=1.5;
  if(source.item==='choiceband'&&physical||source.item==='choicespecs'&&!physical)atk*=1.5;
  if(source.item==='lightball'&&source.baseSpecies.baseSpecies==='Pikachu')atk*=2;
  if(source.item==='thickclub'&&physical)atk*=2;
  let damage=((42*power*atk/Math.max(1,def))/50+2)*eff*(source.hasType(move.type)?1.5:1)*.925;
  if(source.item==='lifeorb')damage*=1.3;
  if(source.ability==='guts'&&source.status&&physical)damage*=1.5;
  if(source.ability==='technician'&&power<=60)damage*=1.5;
  if(source.status==='brn'&&physical&&source.ability!=='guts')damage*=.5;
  if(b.field.weather==='sunnyday')damage*=move.type==='Fire'?1.5:move.type==='Water'?.5:1;
  if(b.field.weather==='raindance')damage*=move.type==='Water'?1.5:move.type==='Fire'?.5:1;
  if(target.ability==='multiscale'&&target.hp===target.maxhp)damage*=.5;
  return damage*(typeof move.accuracy==='number'?move.accuracy/100:1);
}

function threat(b,source,target) {
  return Math.max(0,...source.moveSlots.filter(m=>m.pp>0).map(m=>expectedDamage(b,source,target,Dex.moves.get(m.id))));
}

function actionScore(b,sideID,action) {
  const side=b[sideID],own=side.active[0],foe=side.foe.active[0];
  if(!foe||!own)return 0;
  const inDanger=threat(b,foe,own)/Math.max(1,own.hp);
  if(action.kind==='switch') {
    const p=action.pokemon;
    const outgoing=threat(b,p,foe)/Math.max(1,foe.hp);
    const incoming=threat(b,foe,p)/Math.max(1,p.hp);
    return 32+Math.min(1.3,outgoing)*65-Math.min(2,incoming)*60+(inDanger>1?25:0)+(p.ability==='regenerator'?7:0);
  }
  const m=action.move;if(!m)return 0;
  const damage=expectedDamage(b,own,foe,m);
  let score=Math.min(1.5,damage/Math.max(1,foe.hp))*105;
  const priority=m.priority||0;
  const faster=stat(own,'spe')>stat(foe,'spe')||priority>0;
  if(damage>=foe.hp*.98)score+=faster?65:15;
  if(damage>0&&inDanger>=1&&!faster)score-=30;
  if(m.selfSwitch)score+=14;
  if(m.recoil&&own.hp/own.maxhp<.3)score-=10;
  if(m.drain)score+=(1-own.hp/own.maxhp)*25;
  if(m.heal||m.id==='roost'||m.id==='synthesis'||m.id==='morningsun'||m.id==='softboiled')score+=(1-own.hp/own.maxhp)*140-(own.hp/own.maxhp>.85?65:0);
  if(m.id==='wish')score+=(1-own.hp/own.maxhp)*105-(own.volatiles.wish?80:0);
  if(m.id==='protect')score+=own.volatiles.wish?80:own.item==='leftovers'&&own.hp<own.maxhp?12:-30;
  if(m.id==='rest')score+=(1-own.hp/own.maxhp)*120-(own.hp/own.maxhp>.7?65:0);
  if(m.id==='sleeptalk')score+=own.status==='slp'?120:-100;
  if(m.boosts&&m.target==='self') {
    const boost=Object.entries(m.boosts).reduce((sum,[stat,n])=>sum+Math.max(0,Math.min(n,6-own.boosts[stat])),0);
    score+=boost*22*(own.hp/own.maxhp)*(inDanger>.7?.4:1);
  }
  if(m.id==='shellsmash')score+=inDanger<.65?72:15;
  if(m.id==='growth')score+=b.field.weather==='sunnyday'?75:35;
  if(m.status) {
    let valid=!foe.status;
    if(['psn','tox'].includes(m.status)&&(foe.hasType('Poison')||foe.hasType('Steel')))valid=false;
    if(m.status==='brn'&&foe.hasType('Fire'))valid=false;
    if(m.status==='par'&&(foe.hasType('Electric')||!Dex.getImmunity(m.type,foe)))valid=false;
    if(m.status==='slp'&&side.foe.pokemon.some(p=>p.status==='slp'&&p.statusState.source!==p))valid=false;
    if(valid)score+=m.status==='slp'?65:m.status==='brn'&&stat(foe,'atk')>stat(foe,'spa')?65:40;
    else if(m.category==='Status')score-=85;
  }
  if(m.sideCondition) {
    const existing=side.foe.sideConditions[m.sideCondition];
    score+=existing?-35:Math.min(6,side.foe.pokemonLeft)*10;
  }
  if(m.id==='leechseed')score+=!foe.volatiles.leechseed&&!foe.hasType('Grass')?48:-50;
  if(m.id==='rapidspin'&&Object.keys(side.sideConditions).some(k=>['stealthrock','spikes','toxicspikes','stickyweb'].includes(k)))score+=65;
  if(m.id==='defog')score+=Object.keys(side.sideConditions).length?55:-45;
  if(m.id==='taunt')score+=!foe.volatiles.taunt&&foe.moveSlots.filter(m=>Dex.moves.get(m.id).category==='Status').length>=2?45:-30;
  if(m.id==='encore')score+=foe.lastMove&&foe.lastMove.category==='Status'?50:-25;
  if(m.id==='destinybond')score+=inDanger>1&&faster?55:-30;
  if(m.id==='splash'||m.id==='stringshot')score-=100;
  return score;
}

function evaluate(b) {
  if(b.ended)return b.winner==='BLUE'?20000:b.winner==='YOU'?-20000:0;
  function value(side){
    let sum=0;
    for(const p of side.pokemon){
      if(!p.hp)continue;
      sum+=170+85*p.hp/p.maxhp;
      if(p.status)sum-=p.status==='slp'?22:p.status==='tox'?18:12;
      if(p.isActive){
        for(const [stat,n] of Object.entries(p.boosts))sum+=n*(stat==='atk'||stat==='spa'?12:stat==='spe'?10:7);
        if(p.volatiles.substitute)sum+=22;
        if(p.volatiles.leechseed)sum-=18;
      }
    }
    for(const [id,condition] of Object.entries(side.sideConditions)) {
      if(['stealthrock','spikes','toxicspikes','stickyweb'].includes(id))sum-=side.pokemonLeft*5*(condition.layers||1);
      if(['reflect','lightscreen','auroraveil'].includes(id))sum+=20;
    }
    return sum;
  }
  return value(b.p2)-value(b.p1);
}

export function chooseAI(b,sideID='p2',{search=true}={}) {
  const actions=legalChoices(b,sideID);
  if(!actions.length)return null;
  for(const a of actions)a.score=actionScore(b,sideID,a);
  actions.sort((a,c)=>c.score-a.score);
  if(actions.length===1||!search||b[sideID].activeRequest?.forceSwitch||b.requestState==='teampreview')return actions[0].command;
  const foeID=sideID==='p2'?'p1':'p2';
  const replies=legalChoices(b,foeID);
  if(!replies.length)return actions[0].command;
  for(const a of replies)a.score=actionScore(b,foeID,a);
  replies.sort((a,c)=>c.score-a.score);
  const candidates=actions.slice(0,4),likely=replies.slice(0,3);
  const serialized=JSON.stringify(b.toJSON());
  let best=actions[0].command,bestScore=-Infinity;
  for(const candidate of candidates){
    const values=[];
    for(const reply of likely){
      const sim=Battle.fromJSON(serialized);
      // Independent common random samples. The AI cannot inspect the live RNG.
      sim.prng=new PRNG([12345,(b.turn*179+19)%65536,54321,1984]);
      try{
        if(!sim.choose(sideID,candidate.command)||!sim.choose(foeID,reply.command))continue;
        let guard=0;
        while(!sim.ended&&sim.requestState==='switch'&&guard++<3){
          for(const id of ['p1','p2']){
            const c=legalChoices(sim,id)[0];if(c)sim.choose(id,c.command);
          }
        }
        values.push(evaluate(sim)*(sideID==='p2'?1:-1));
      }finally{sim.destroy();}
    }
    if(!values.length)continue;
    const score=.5*Math.min(...values)+.5*values.reduce((a,c)=>a+c,0)/values.length+candidate.score*.08-(candidate.kind==='switch'?7:0);
    if(score>bestScore){bestScore=score;best=candidate.command;}
  }
  return best;
}

export function moveInfo(id) {
  const m=Dex.moves.get(id);
  return {id:m.id,name:m.name,type:m.type,category:m.category,power:m.basePower,accuracy:m.accuracy,pp:m.pp,priority:m.priority,description:m.shortDesc||m.desc,target:m.target};
}

export function snapshot(b) {
  const sides={};
  for(const id of ['p1','p2']){
    const side=b[id];
    sides[id]={name:side.name,conditions:Object.entries(side.sideConditions).map(([id,state])=>({id,name:Dex.conditions.get(id).name||id,layers:state.layers||1})),pokemon:side.pokemon.map((p,index)=>({
      slot:index+1,key:p.set.species,name:p.name,species:p.species.name,num:p.species.num,originalNum:Dex.species.get(p.set.species).num,
      hp:p.hp,maxhp:p.maxhp,status:p.status,active:p.isActive,fainted:p.fainted||p.hp===0,level:p.level,
      types:p.getTypes(),item:Dex.items.get(p.item).name||'',originalItem:p.set.item,
      ability:Dex.abilities.get(p.ability).name,abilityDescription:Dex.abilities.get(p.ability).shortDesc,
      nature:p.set.nature,evs:p.set.evs,stats:{hp:p.maxhp,...p.storedStats},boosts:{...p.boosts},role:SETS[Dex.species.get(p.set.species).num]?.role||'Attacker',
      moves:p.moveSlots.map(m=>({...moveInfo(m.id),pp:m.pp,maxpp:m.maxpp})),
    }))};
  }
  return {turn:b.turn,ended:b.ended,winner:b.winner,request:b.p1.activeRequest,weather:b.field.weather,terrain:b.field.terrain,...sides};
}

export function publicLog(b,from=0) {
  return extractChannelMessages(b.log.slice(from).join('\n'),[1])[1];
}

export class Game {
  constructor(saved){
    this.battle=saved?Battle.fromJSON(saved):createBattle();
    if(this.battle.sides.some(side=>side.pokemon.some(p=>!p.species.num||!p.species.name)))throw new Error('Invalid saved cartridge state.');
  }
  fresh(){this.battle.destroy();this.battle=createBattle();return this.result(0);}
  start(lead=1,order){
    const b=this.battle,from=b.log.length;
    if(b.requestState!=='teampreview')throw new Error('This battle has already started.');
    if(order!==undefined&&!validOrder(order,b.p1.pokemon.map((p,i)=>i+1)))throw new Error('Party order must contain each of your six slots exactly once.');
    if(order===undefined&&(!Number.isInteger(lead)||lead<1||lead>b.p1.pokemon.length))throw new Error('Choose a valid lead Pokémon.');
    b.choose('p1',`team ${order?order.join(','):lead}`);b.choose('p2','team 1');
    return this.result(from);
  }
  act(command,{search=true}={}){
    const b=this.battle,from=b.log.length;
    if(b.ended)throw new Error('This battle is finished. Start a new challenge.');
    // Decide independently before committing the human input; never pass command to AI.
    const ai=chooseAI(b,'p2',{search});
    if(!b.choose('p1',command))throw new Error(b.p1.choice.error||'That action is unavailable.');
    if(ai&&!b.ended&&!b.p2.isChoiceDone())b.choose('p2',ai);
    let guard=0;
    while(!b.ended&&b.p1.activeRequest?.wait&&guard++<12){
      const next=chooseAI(b,'p2',{search});
      if(!next)break;
      b.choose('p2',next);
    }
    return this.result(from);
  }
  result(from=0){return {state:snapshot(this.battle),logs:publicLog(this.battle,from),save:this.battle.toJSON()};}
}

export function catalog() {
  return SPECIES.map(s=>({num:s.num,name:s.name,types:s.types,baseStats:s.baseStats,set:{...SETS[s.num],moves:SETS[s.num].moves.map(moveInfo)},abilityDescription:Dex.abilities.get(SETS[s.num].ability).shortDesc}));
}
