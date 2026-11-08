import {LANES,STAGES,clamp} from './data.js';
const TAU=Math.PI*2;
const LANE_SYMBOL=['✕','○','□','△'];
const ready=(ctx,s=1)=>{ctx.strokeStyle='#ffffff';ctx.lineWidth=2*s;};
function poly(ctx,coords,fill,stroke=null,w=2){
  ctx.beginPath();coords.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));
  ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=w;ctx.stroke();}
}
function round(ctx,x,y,w,h,r,fill,stroke){
  if(w<=0||h<=0)return;
  ctx.beginPath();ctx.roundRect(x,y,w,h,Math.min(r,w/2,h/2));
  if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.5;ctx.stroke();}
}
function line(ctx,x1,y1,x2,y2,color,width=2){
  ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);
  ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();
}
function label(ctx,text,x,y,size=13,color='#f5f6ff',align='left',weight=800){
  ctx.fillStyle=color;ctx.font=weight+' '+size+'px system-ui, sans-serif';ctx.textAlign=align;
  ctx.fillText(text,x,y);
}
function star(ctx,x,y,r,color){
  ctx.beginPath();ctx.moveTo(x-r,y);ctx.lineTo(x,y-r*.62);ctx.lineTo(x+r,y);
  ctx.lineTo(x,y+r*.62);ctx.closePath();ctx.fillStyle=color;ctx.fill();
}
function radial(ctx,x,y,r,color,alpha=1){
  const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);
  g.addColorStop(.22,color);g.addColorStop(1,'transparent');
  ctx.globalAlpha=alpha;ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);ctx.globalAlpha=1;
}
function stage(ctx,w,h,game,t,energy){
  const stageInfo=STAGES.find(s=>s.id===game.stage)||STAGES[0];
  const c=stageInfo.color,a=stageInfo.accent,ry=h*.59;
  const gradient=ctx.createLinearGradient(0,0,0,ry);
  gradient.addColorStop(0,'#040821');gradient.addColorStop(.58,game.stage==='club'?'#32102e':'#14164b');
  gradient.addColorStop(1,'#09091b');ctx.fillStyle=gradient;ctx.fillRect(0,0,w,ry);
  radial(ctx,w*.58,ry*.41,Math.min(420,w*.48),c,.10+energy*.10);
  ctx.save();ctx.globalAlpha=.65;
  if(game.stage==='chromebook'){
    for(let i=0;i<40;i++){
      const x=(i*43)%w,shift=(t*(15+i%6*9)+i*61)%(ry+70);
      for(let j=0;j<6;j++)label(ctx,'01▣<>/'[(i+j)%6],x,shift-j*20,12,c,'center',500);
    }
    for(let i=0;i<8;i++)line(ctx,0,ry*.27+i*16,w,ry*.27+i*16,c,.5);
  }else if(game.stage==='motel6'){
    const y=ry*.34;
    round(ctx,w*.17,y,w*.66,ry*.36,8,'#160b31',c);
    round(ctx,w*.29,y+18,w*.42,ry*.21,4,'#090915',a);
    if(Math.sin(t*8)>-.5)for(let i=0;i<22;i++){
      const yy=y+20+i*3.8;line(ctx,w*.30,yy,w*.70,yy,'#aaa7e0',Math.sin(i*2+t*4)>.8?3:1);
    }
    label(ctx,'MOTEL',w*.34,y-18,Math.max(15,w*.024),a);
    label(ctx,'6',w*.69,y-16,Math.max(21,w*.038),a);
    for(let i=0;i<8;i++)line(ctx,i*w/7,ry,w*.5,ry*.64,c,.7);
  }else if(game.stage==='ward'){
    for(let i=0;i<9;i++)line(ctx,0,ry*.35+i*24,w,ry*.35+i*24,'#81c9e5',.6);
    for(let i=0;i<12;i++)line(ctx,i*w/11,ry*.35,i*w/11,ry,'#81c9e5',.6);
    ctx.beginPath();for(let i=0;i<130;i++){
      const x=w*(i/129),pulse=((i/129)*8+t*.65)%1;
      const y=ry*.48 - (pulse<.09?Math.sin(pulse/.09*Math.PI)*38*energy:Math.sin(i/17)*2);
      i?ctx.lineTo(x,y):ctx.moveTo(x,y);
    }ctx.strokeStyle=a;ctx.lineWidth=2.5;ctx.stroke();
    round(ctx,w*.1,ry*.22,w*.8,ry*.5,4,'#06102f99','#76c5ed99');
  }else if(game.stage==='garden'){
    const sky=ctx.createLinearGradient(0,0,0,ry);sky.addColorStop(0,'#13195b');sky.addColorStop(1,'#37616a');
    ctx.fillStyle=sky;ctx.fillRect(0,0,w,ry);
    radial(ctx,w*.7,ry*.22,ry*.20,a,.6);
    for(let i=0;i<4;i++){
      ctx.beginPath();ctx.ellipse(w*(.2+i*.24),ry*.83,w*.35,ry*.17,0,0,TAU);
      ctx.fillStyle=i%2?'#174a58':'#205a5a';ctx.fill();
    }
    line(ctx,w*.5,ry*.7,w*.5,ry*.22,'#2d243f',Math.max(8,w*.022));
    for(let i=0;i<9;i++){
      const ang=i*TAU/9,px=w*.5+Math.cos(ang)*w*.13,py=ry*.25+Math.sin(ang)*ry*.16;
      line(ctx,w*.5,ry*.4,px,py,'#262747',5);
      radial(ctx,px,py,ry*.07,'#56f3c1',.35);
    }
  }else if(game.stage==='club'){
    for(let i=0;i<7;i++){
      const x=w*(i+.5)/7;
      line(ctx,x,0,w*.5+(x-w*.5)*.28,ry*.85,i%2?c:a,4);
      radial(ctx,x,ry*.32,ry*.22,i%2?c:a,.12+energy*.21);
    }
    for(let i=0;i<20;i++){
      const x=w*(i+.5)/20;const amp=.6+.4*Math.sin(t*1.6+i);
      round(ctx,x,ry*.7-amp*ry*.1,w/25,amp*ry*.1,3,'#060818');
    }
  }else if(game.stage==='void'){
    for(let i=0;i<35;i++){
      const angle=i*2.399+t*(i%2?.04:-.025);
      const dist=(i%12+2)/15;
      const x=w*.5+Math.cos(angle)*w*.52*dist;
      const y=ry*.51+Math.sin(angle)*ry*.45*dist;
      ctx.save();ctx.translate(x,y);ctx.rotate(angle+t*.07);
      poly(ctx,[[0,-12],[10,0],[0,12],[-10,0]],i%3?c:a);
      ctx.restore();
    }
    radial(ctx,w*.5,ry*.45,ry*.3,'#6f4dff',.25);
  }else{
    // Rotunda: orbital chamber with an eightfold constellation.
    for(let i=0;i<7;i++){
      ctx.beginPath();ctx.ellipse(w*.5,ry*.42,w*(.10+i*.08),ry*(.12+i*.055),t*.03,0,TAU);
      ctx.strokeStyle=i%2?c:a;ctx.globalAlpha=.12+energy*.08;ctx.lineWidth=1.5;ctx.stroke();
    }
    ctx.globalAlpha=1;
    for(let i=0;i<8;i++){
      const x=w*(i+.5)/8;
      poly(ctx,[[x-14,ry*.71],[x-8,ry*.34],[x+8,ry*.34],[x+14,ry*.71]],'#121d49',c,1);
      star(ctx,x,ry*.34,5,i%2?a:c);
    }
    ctx.save();ctx.translate(w*.5,ry*.31);ctx.rotate(t*.14);
    poly(ctx,[[0,-25],[17,0],[0,25],[-17,0]],a,c,3);ctx.restore();
  }
  ctx.restore();
  // Retro arcade floor; perspective lines make the two combatants feel grounded.
  const floor=ctx.createLinearGradient(0,ry*.71,0,ry);floor.addColorStop(0,'#12163944');
  floor.addColorStop(1,'#050a24');ctx.fillStyle=floor;ctx.fillRect(0,ry*.72,w,ry*.28);
  for(let i=0;i<=12;i++)line(ctx,w*i/12,ry,w*.5+(i-6)*w*.011,ry*.71,c,.38);
  for(let i=0;i<5;i++){
    const y=ry*.72+Math.pow(i/4,1.5)*ry*.28;
    line(ctx,0,y,w,y,c,i===4?2:.6);
  }
  // Audio-responsive bars across the back wall.
  for(let i=0;i<42;i++){
    const band=game.bands?.[i%4]||0;
    const val=clamp((band*.12+energy*.23+Math.sin(t*4+i)*.02),.05,.9);
    const x=(i+.5)*w/42;
    ctx.globalAlpha=.10+energy*.12;
    round(ctx,x,ry*.70-val*ry*.11,w/78,val*ry*.11,1,i%4===0?a:c);
  }ctx.globalAlpha=1;
}
function fighter(ctx,x,y,s,facing,p,anim,enemy=false,gameTime=0){
  ctx.save();ctx.translate(x,y);ctx.scale(s*facing,s);
  const bob=Math.sin(gameTime*3+(enemy?2:0))*2;
  const punch=anim.attack?Math.sin(Math.min(1,anim.attack)*Math.PI):0;
  const stagger=anim.hurt?Math.sin(Math.min(1,anim.hurt)*Math.PI):0;
  ctx.translate(-stagger*16,bob);
  ctx.globalAlpha=.27;ctx.beginPath();ctx.ellipse(0,5,68,11,0,0,TAU);
  ctx.fillStyle=p.color;ctx.fill();ctx.globalAlpha=1;
  // Cape, torso, armor, gloves, and aggressive angular pose.
  poly(ctx,[[-20,-118],[-64,-78],[-47,-19],[6,-54],[24,-105]],p.secondary);
  poly(ctx,[[-20,-62],[-33,-19],[-12,1],[1,-5],[0,-56]],'#09132c',p.color,2);
  poly(ctx,[[2,-62],[6,-3],[27,1],[34,-17],[23,-61]],'#101630',p.color,2);
  poly(ctx,[[-29,-112],[24,-114],[34,-70],[10,-50],[-18,-58],[-37,-80]],p.secondary,p.color,3);
  poly(ctx,[[-11,-107],[23,-101],[15,-80],[-19,-82]],p.color);
  poly(ctx,[[3,-98],[17,-95],[9,-83]],'#f6f8ff');
  const gauntlet=punch*36;
  poly(ctx,[[-25,-107],[-47,-89],[-40,-57],[-25,-54],[-17,-87]],'#121930',p.color,2);
  poly(ctx,[[-40,-60],[-44,-47],[-32,-35],[-18,-48],[-22,-64]],p.color);
  poly(ctx,[[22,-108],[39+gauntlet,-83],[38+gauntlet,-68],[21,-70],[8,-94]],'#101630',p.color,2.5);
  poly(ctx,[[36+gauntlet,-84],[52+gauntlet,-82],[61+gauntlet,-69],[52+gauntlet,-59],[37+gauntlet,-62]],p.color);
  ctx.beginPath();ctx.ellipse(0,-138,24,27,-.18,0,TAU);ctx.fillStyle='#0b132a';ctx.fill();
  ctx.strokeStyle=p.color;ctx.lineWidth=3;ctx.stroke();
  poly(ctx,[[-25,-155],[-7,-167],[18,-162],[25,-145],[8,-145],[-17,-144]],p.secondary);
  // Distinct persona crest on forehead.
  round(ctx,-17,-144,35,10,4,p.color);
  label(ctx,p.icon,0,-135,18,'#061024','center',900);
  for(let i=0;i<3;i++)line(ctx,-34+i*13,-73,-27+i*13,-68,p.color,1.7);
  if(p.id==='astro'){star(ctx,-4,-90,12,'#fff1a3');}
  if(p.id==='ripple'){for(let i=0;i<3;i++)line(ctx,-37,-68+i*13,-54,-58+i*13,'#71fff1',3);}
  if(p.id==='brix'){round(ctx,-35,-119,18,16,2,p.color);round(ctx,21,-119,18,16,2,p.color);}
  if(p.id==='demon'){poly(ctx,[[-21,-155],[-27,-185],[-3,-163]],p.color);poly(ctx,[[15,-157],[25,-185],[26,-145]],p.color);}
  if(p.id==='hermes'){poly(ctx,[[-18,-154],[-48,-174],[-31,-148]],'#eae9ff');}
  if(p.id==='echo'){ctx.beginPath();ctx.arc(0,-137,31,Math.PI*.2,Math.PI*.8);ctx.strokeStyle=p.color;ctx.lineWidth=3;ctx.stroke();}
  if(p.id==='flux'){for(let i=0;i<3;i++)star(ctx,40+i*12,-128+i*22,6,p.color);}
  ctx.restore();
}
function health(ctx,game,w,h){
  const s=game.session,f=Math.max(.72,Math.min(1.12,w/980));
  const pad=Math.max(12,w*.03),length=Math.min(w*.36,450),barH=12*f;
  round(ctx,pad,19*f,length+4,barH+6,4,'#0c1431','#79b6ff');
  round(ctx,pad+2,22*f,Math.max(0,length*s.hp/1000),barH,2,'#57dcf1');
  const foeMax=game.enemyHP||1000;
  round(ctx,w-pad-length-4,19*f,length+4,barH+6,4,'#0c1431','#fa8aa8');
  round(ctx,w-pad-length-2,22*f,Math.max(0,length*s.foeHP/foeMax),barH,2,'#ff5f8d');
  label(ctx,s.persona.name,pad,49*f,14*f,s.persona.color);
  label(ctx,s.enemy.name,w-pad,49*f,14*f,s.enemy.color,'right');
  label(ctx,'VS',w/2,37*f,19*f,'#ffe16a','center',900);
  round(ctx,pad,57*f,length*.62,7*f,2,'#0e1534','#4a79c4');
  round(ctx,pad,57*f,length*.62*s.meter/100,7*f,2,s.persona.color);
  label(ctx,'METER '+Math.floor(s.meter)+'%',pad,77*f,10*f,'#9bcffe');
  label(ctx,String(s.combo)+' COMBO',w/2,84*f,22*f,'#ffe16a','center');
  label(ctx,'SCORE '+s.score.toLocaleString(),w-pad,77*f,11*f,'#e2eeff','right');
}
function highway(ctx,game,w,h,time){
  const s=game.session;
  const top=h*.62,row=(h-top-25)/4;
  const hit=Math.max(78,Math.min(138,w*.17));
  const scroll=Math.max(210,w*.62)*(game.glyphs?.includes('bolt')?1.24:1);
  round(ctx,7,top-12,w-14,h-top+7,10,'#05102fe9','#5880b47e');
  for(let r=0;r<4;r++){
    const lane=3-r,y=top+row*(r+.5);
    ctx.fillStyle=r%2===0?'#15215477':'#0c143677';
    ctx.fillRect(9,top+row*r+1,w-18,row-2);
    line(ctx,9,top+row*(r+1),w-9,top+row*(r+1),'#5b8bd244',1);
    label(ctx,LANES[lane].button,20,y+8,Math.min(27,row*.6),LANES[lane].color);
    if(w>650)label(ctx,LANES[lane].name,54,y+5,Math.min(12,row*.24),'#8ab3dd');
  }
  line(ctx,hit,top-8,hit,h-22,'#ffe97a',3.5);
  radial(ctx,hit,top+row*2,row*.62,'#fef4c2',.1);
  for(const n of s.notes){
    if(n.judged)continue;
    const dt=n.time-time;
    if(dt<-.13||dt>(w-hit+90)/scroll)continue;
    const x=hit+dt*scroll;
    const y=top+row*(3-n.lane+.5);
    const r=clamp(row*.34,12,24);
    if(n.duration){
      round(ctx,x,y-r*.42,Math.min(n.duration*scroll,w-x),r*.84,r*.42,LANES[n.lane].color+'77',LANES[n.lane].color);
    }
    radial(ctx,x,y,r*2,LANES[n.lane].color,.2);
    ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fillStyle='#061126';ctx.fill();
    ctx.strokeStyle=LANES[n.lane].color;ctx.lineWidth=3;ctx.stroke();
    label(ctx,LANE_SYMBOL[n.lane],x,y+r*.34,r*1.15,LANES[n.lane].color,'center',900);
  }
  if(s.activeHold){
    const a=s.activeHold,n=a.note;
    const y=top+row*(3-n.lane+.5);
    round(ctx,hit+7,y-12,65,24,5,'#214b72','#ffe16e');
    label(ctx,'HOLD',hit+39,y+5,12,'#ffe16e','center');
  }
  const duration=Math.max(1,game.trackDuration||48);
  round(ctx,9,h-15,w-18,5,3,'#22315e');
  round(ctx,9,h-15,(w-18)*clamp(time/duration,0,1),5,3,'#ffed78');
  if(s.lastResult!=='READY'&&time-s.hitTime<.64){
    const alpha=1-(time-s.hitTime)/.64;
    ctx.save();ctx.globalAlpha=alpha;
    label(ctx,s.lastResult,hit+30,top-24,18,'#fff1b7','left',950);
    ctx.restore();
  }
  for(const e of s.effects){
    const age=time-e.at;
    ctx.save();ctx.globalAlpha=clamp(1-age/1.15,0,1);
    label(ctx,e.text,w*.5,top-12-age*25,15,e.positive?'#8dfbcb':'#ff7994','center',900);
    ctx.restore();
  }
}
function overlay(ctx,game,w,h,t){
  if(!game.session)return;
  const s=game.session;
  const attack=clamp(1-(t-s.hitTime)/.34,0,1);
  const hurt=clamp(1-(t-s.foeHitTime)/.35,0,1);
  if(attack>0){
    const x=w*.65,y=h*.39;
    for(let i=0;i<9;i++){
      const a=i*TAU/9+attack*.2;
      line(ctx,x+Math.cos(a)*12,y+Math.sin(a)*12,x+Math.cos(a)*(40+attack*44),
        y+Math.sin(a)*(40+attack*44),s.persona.color,(1.5+attack*2));
    }
    radial(ctx,x,y,80,s.persona.color,attack*.24);
  }
  if(hurt>.1)radial(ctx,w*.3,h*.36,70,'#ff5c75',hurt*.17);
}
export class Renderer{
  constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.w=0;this.h=0;this.dpr=1;}
  resize(){
    const rect=this.canvas.getBoundingClientRect();
    this.dpr=Math.min(window.devicePixelRatio||1,1.7);
    this.w=rect.width;this.h=rect.height;
    const cw=Math.max(1,Math.floor(this.w*this.dpr)),ch=Math.max(1,Math.floor(this.h*this.dpr));
    if(this.canvas.width!==cw||this.canvas.height!==ch){this.canvas.width=cw;this.canvas.height=ch;}
  }
  draw(game,clock){
    const {ctx}=this;
    if(this.w!==this.canvas.clientWidth||this.h!==this.canvas.clientHeight)this.resize();
    const w=this.w,h=this.h;
    ctx.setTransform(this.dpr,0,0,this.dpr,0,0);ctx.clearRect(0,0,w,h);
    const time=game.audio?.currentTime||0;
    let bands=[0,0,0,0],energy=0;
    if(game.analyser){const array=new Uint8Array(game.analyser.frequencyBinCount);
      game.analyser.getByteFrequencyData(array);
      const len=array.length;for(let i=0;i<4;i++){let sum=0,count=0;
        for(let k=Math.max(1,Math.floor(i*len/4));k<Math.floor((i+1)*len/4);k+=7){sum+=array[k];count++;}
        bands[i]=sum/(Math.max(1,count)*255);
      }
      energy=bands.reduce((a,b)=>a+b,0)/4;
    }else if(game.analysis?.frames?.length){
      const f=game.analysis.frames[Math.min(game.analysis.frames.length-1,Math.floor(time/game.analysis.step))];
      bands=f?.bands.map(x=>clamp(x/5,0,1))||bands;energy=f?.energy/5||0;
    }
    game.bands=bands;stage(ctx,w,h,game,clock,energy);
    if(!game.session){
      radial(ctx,w*.5,h*.33,w*.4,'#854dff',.08);
      return;
    }
    const s=game.session,baseY=h*.60,scale=clamp(w/740,.57,1.18);
    const a=clamp(1-(time-s.hitTime)/.35,0,1);
    const b=clamp(1-(time-s.foeHitTime)/.4,0,1);
    fighter(ctx,w*.27,baseY,scale,1,s.persona,{attack:a,hurt:b*.35},false,clock);
    fighter(ctx,w*.73,baseY,scale,-1,s.enemy,{attack:b*.4,hurt:a},true,clock);
    overlay(ctx,game,w,h,time);health(ctx,game,w,h);
    highway(ctx,game,w,h,time);
    label(ctx,game.mode.toUpperCase()+'  /  '+(game.stage||'ROTUNDA').toUpperCase(),w/2,h*.60-11,
      clamp(w*.013,9,12),'#eae6ff','center',700);
    if(game.paused){
      ctx.fillStyle='#05091ddd';ctx.fillRect(0,0,w,h);
      label(ctx,'PAUSED',w/2,h*.43,clamp(w*.056,30,58),'#ffe478','center',900);
      label(ctx,'START / OPTIONS OR ESC TO RESUME',w/2,h*.49,clamp(w*.014,10,16),'#e5eaff','center');
    }
  }
}
