import {PERSONAS,clamp,hashString,mulberry32} from './data.js';
export const WINDOWS={perfect:.025,great:.050,good:.080};
export function judgement(seconds,wide=false){
  const delta=Math.abs(seconds),factor=wide?1.1:1;
  if(delta<=WINDOWS.perfect*factor)return 'PERFECT';
  if(delta<=WINDOWS.great*factor)return 'GREAT';
  if(delta<=WINDOWS.good*factor)return 'GOOD';
  return 'MISS';
}
export function damageFor(grade,power=3){
  return Math.round((grade==='PERFECT'?11:grade==='GREAT'?8:grade==='GOOD'?5:0)*(0.66+power*.12));
}
const bonus={PERFECT:1000,GREAT:600,GOOD:300,MISS:0};
export class FighterSession{
  constructor({notes,persona='flux',enemy='orion',difficulty='normal',mode='arcade',seed=444,carry=1000,glyphs=['blue','space','loop'],enemyHP=1000}){
    this.notes=notes.map(n=>({...n,judged:false,result:null}));
    this.persona=PERSONAS.find(p=>p.id===persona)||PERSONAS[7];
    this.enemy=PERSONAS.find(p=>p.id===enemy)||PERSONAS[0];
    this.difficulty=difficulty;this.mode=mode;this.seed=seed;this.glyphs=glyphs;
    this.hp=carry;this.foeHP=enemyHP;this.meter=0;
    this.combo=0;this.maxCombo=0;this.score=0;this.hits=0;this.misses=0;
    this.perfect=0;this.great=0;this.good=0;this.cursor=0;
    this.activeHold=null;this.finished=false;this.lastResult='READY';this.hitTime=-10;
    this.foeHitTime=-10;this.hitLane=0;this.effects=[];this.soundEvents=[];
    this.lastFoeSpecial=(seed%4);this.forgiven=false;this.lastMove='';
    this.rng=mulberry32(seed^hashString(enemy));
  }
  get effectivePersona(){
    if(this.persona.id!=='flux')return this.persona;
    const morph=Math.floor(this.currentTime/10);
    return PERSONAS[(7+morph)%PERSONAS.length];
  }
  get timingWide(){return this.glyphs.includes('blue');}
  get scoreMultiplier(){return this.glyphs.includes('bolt')?2:1;}
  pushEffect(text,positive=true,lane=0){
    this.effects.push({text,positive,lane,at:this.currentTime});
    if(this.effects.length>12)this.effects.shift();
  }
  apply(grade,note){
    if(this.finished)return;
    note.judged=true;note.result=grade;
    this.lastResult=grade;this.hitLane=note.lane;this.hitTime=this.currentTime;
    if(grade==='MISS'){
      if(this.glyphs.includes('loop')&&!this.forgiven){
        this.forgiven=true;return this.apply('GOOD',note);
      }
      this.combo=0;this.misses++;
      const hit=this.mode==='training'?0:Math.round((this.difficulty==='expert'?12:8)*(1.35-this.persona.defense*.075));
      this.hp=Math.max(0,this.hp-hit);
      this.foeHitTime=this.currentTime;this.lastMove='COUNTER!';
      this.pushEffect('MISS  -'+hit,false,note.lane);
      return;
    }
    this.hits++;this.combo++;
    this.maxCombo=Math.max(this.combo,this.maxCombo);
    if(grade==='PERFECT')this.perfect++;
    else if(grade==='GREAT')this.great++;
    else this.good++;
    const fighter=this.effectivePersona;
    let damage=damageFor(grade,fighter.power);
    if(this.persona.id==='orion'&&grade==='PERFECT')damage=Math.round(damage*(1+Math.min(2,this.combo/12)));
    if(this.persona.id==='demon')damage=Math.round(damage*1.8);
    if(this.persona.id==='hermes'&&note.lane===0){damage+=5;this.combo++;}
    if(this.persona.id==='brix'&&note.lane===1)damage+=6;
    if(this.persona.id==='echo'&&note.lane===this.lastFoeSpecial)damage=Math.round(damage*1.45);
    if(this.persona.id==='ripple'&&note.duration)damage=Math.round(damage*1.65);
    if(this.glyphs.includes('boom')&&this.combo===1)damage=Math.round(damage*1.15);
    if(note.duration>0)damage=Math.round(damage*2.1);
    let move=['JAB','COUNTER','SPECIAL','BURST'][note.lane];
    if(this.meter>=85&&note.lane===3){
      damage+=155;this.meter-=85;move=this.persona.powerName+' / ULTIMATE';this.pushEffect('ULTIMATE!',true,note.lane);
    }else if(this.meter>=45&&note.lane===2){
      damage+=45;this.meter-=45;move='EX SPECIAL';
    }else if(this.meter>=35&&note.lane===1){
      damage+=30;this.meter-=35;move='GUARD BREAK';
    }
    if(this.persona.id==='astro'&&grade==='PERFECT')this.hp=Math.min(1000,this.hp+2);
    if(this.glyphs.includes('infinity')&&this.combo>=24)damage+=12;
    const gain=(grade==='PERFECT'?7:grade==='GREAT'?4:2)*(this.glyphs.includes('space')?1.05:1);
    this.meter=Math.min(100,this.meter+gain);
    this.foeHP=Math.max(0,this.foeHP-damage);
    this.score+=Math.round((bonus[grade]+this.combo*15)*this.scoreMultiplier);
    this.lastMove=move;this.lastFoeSpecial=Math.floor(this.rng()*4);
    this.pushEffect(grade+'  +'+damage,true,note.lane);
  }
  press(lane,time,latency=0){
    if(this.finished)return 'NONE';
    this.currentTime=time;
    if(this.activeHold)return 'HOLDING';
    let closest=null,best=Infinity;
    const hitTime=time+latency;
    for(let i=this.cursor;i<this.notes.length;i++){
      const n=this.notes[i];
      if(n.time>hitTime+.090)break;
      if(n.judged||n.lane!==lane)continue;
      const delta=Math.abs(n.time-hitTime);
      if(delta<best){best=delta;closest=n;}
    }
    const grade=closest?judgement(closest.time-hitTime,this.timingWide):'MISS';
    if(!closest||grade==='MISS'){
      this.pushEffect('OFF BEAT',false,lane);
      return 'OFF BEAT';
    }
    if(closest.duration>0){
      closest.judged=true;
      this.activeHold={note:closest,lane,grade,until:closest.time+closest.duration};
      this.pushEffect('CHARGE!',true,lane);
    }else this.apply(grade,closest);
    return grade;
  }
  release(lane,time){
    if(!this.activeHold||this.activeHold.lane!==lane)return;
    this.currentTime=time;
    const hold=this.activeHold;this.activeHold=null;
    this.apply(time+0.03>=hold.until?hold.grade:'MISS',hold.note);
  }
  update(time,held=new Set()){
    if(this.finished)return;
    this.currentTime=time;
    if(this.activeHold){
      const h=this.activeHold;
      if(!held.has(h.lane))this.release(h.lane,time);
      else if(time>=h.until){this.activeHold=null;this.apply(h.grade,h.note);}
    }
    while(this.cursor<this.notes.length){
      const n=this.notes[this.cursor];
      if(n.judged){this.cursor++;continue;}
      if(n.time+WINDOWS.good*(this.timingWide?1.1:1)>=time)break;
      this.apply('MISS',n);this.cursor++;
    }
    this.effects=this.effects.filter(e=>time-e.at<1.15);
  }
  get accuracy(){const n=this.perfect+this.great+this.good+this.misses;return n?Math.round((this.perfect+this.great*.7+this.good*.4)/n*100):0;}
  get grade(){return this.accuracy>=95?'S':this.accuracy>=85?'A':this.accuracy>=70?'B':this.accuracy>=50?'C':'D';}
}
