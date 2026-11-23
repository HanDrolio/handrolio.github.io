const PALETTE={Fire:'#fa723b',Water:'#58c2ed',Electric:'#ffdc4c',Ice:'#b1effa',Grass:'#89cf60',Psychic:'#e88cde',Ghost:'#9777df',Dark:'#7860a5',Poison:'#c47adc',Ground:'#b99a60',Rock:'#bb9f6a',Flying:'#c9eaf3',Dragon:'#8dacf7',Bug:'#c5df76',Fighting:'#ffc28d',Normal:'#fff7d2',Steel:'#d2e7df',Fairy:'#ffa4dc'};
const mix=(a,b,t)=>a+(b-a)*t;
const clamp=t=>Math.max(0,Math.min(1,t));

export function animationFamily(name,type,category){
  if(/recover|roost|synthesis|morning sun|soft-boiled|slack off|rest|wish|heal bell|strength sap/i.test(name))return 'healing';
  if(category==='Status')return /powder|spore|kiss|toxic|will-o-wisp|thunder wave|glare|leech seed/i.test(name)?'affliction':'boost';
  if(/earthquake|earth power|bulldoze|high horsepower|drill run/i.test(name))return 'earth';
  if(type==='Rock')return 'rocks';
  if(/surf|scald|hydro|waterfall|aqua|liquidation|crabhammer/i.test(name))return 'water';
  if(/drain|giga|leech life/i.test(name))return 'drain';
  if(type==='Electric')return 'lightning';
  if(type==='Ice')return 'ice';
  if(type==='Fire')return 'fire';
  if(type==='Psychic')return 'psychic';
  if(type==='Ghost'||type==='Dark')return 'shadow';
  if(/hurricane|air slash|air cutter|gust/i.test(name))return 'wind';
  if(category==='Physical')return 'impact';
  return 'energy';
}

export class BattleEffects {
  constructor({field,canvas,layer,speed,reduced}){Object.assign(this,{field,canvas,layer,speed,reduced});this.ctx=canvas.getContext('2d');}
  actor(side){return this.field.querySelector(side==='p1'?'#player-sprite':'#enemy-sprite');}
  center(side){const r=this.actor(side).getBoundingClientRect(),b=this.field.getBoundingClientRect();return {x:r.left-b.left+r.width*.5,y:r.top-b.top+r.height*.6};}
  async timeline(duration,draw){
    if(this.reduced){await new Promise(r=>setTimeout(r,75));return;}
    this.canvas.width=Math.max(1,this.field.clientWidth);this.canvas.height=Math.max(1,this.field.clientHeight);
    this.field.classList.add('fx-active');const c=this.ctx,start=performance.now(),ms=duration/this.speed();
    await new Promise(resolve=>{
      const frame=now=>{const t=clamp((now-start)/ms);c.clearRect(0,0,this.canvas.width,this.canvas.height);c.imageSmoothingEnabled=false;draw(c,t,this.canvas.width,this.canvas.height);if(t<1)requestAnimationFrame(frame);else resolve();};requestAnimationFrame(frame);
    });
    this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);this.field.classList.remove('fx-active');
  }
  ring(c,x,y,r,color,alpha=1,width=3){c.globalAlpha=alpha;c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.ellipse(x,y,r,r*.68,0,0,Math.PI*2);c.stroke();c.globalAlpha=1;}
  stars(c,x,y,t,color,count=13){
    for(let i=0;i<count;i++){const a=i*2.39996,r=15+t*45,px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;c.globalAlpha=Math.sin(t*Math.PI);c.fillStyle=color;const size=i%3===0?5:3;c.fillRect(Math.round(px),Math.round(py),size,size);c.fillRect(Math.round(px)-2,Math.round(py)+2,size+4,1);}c.globalAlpha=1;
  }
  async move({side,target,name,type,category,self=false}){
    const a=this.center(side),b=this.center(target),family=animationFamily(name,type,category),color=PALETTE[type]||PALETTE.Normal;
    const actor=this.actor(side),direction=side==='p1'?1:-1;
    let lunge;
    if(!this.reduced&&category!=='Status')lunge=actor.animate([{transform:'translate(0,0)'},{transform:`translate(${direction*(family==='impact'?12:4)}px,-2px)`,offset:.35},{transform:'translate(0,0)'}],{duration:470/this.speed(),easing:'ease-in-out'});
    const center=self?a:b;
    if(family==='earth'&&!this.reduced)this.field.animate([{transform:'translateX(0)'},{transform:'translateX(-2px)'},{transform:'translateX(2px)'},{transform:'translateX(-1px)'},{transform:'translateX(0)'}],{duration:140/this.speed(),iterations:3});
    await this.timeline(family==='earth'||family==='wind'?850:680,(c,t,w,h)=>{
      const p=clamp(t*1.5),x=mix(a.x,b.x,p),y=mix(a.y,b.y,p),fade=Math.sin(t*Math.PI);
      if(['boost','healing','affliction'].includes(family)){
        const hue=family==='healing'?'#9cefa8':family==='boost'?'#ffcf76':color;
        c.fillStyle=hue;c.globalAlpha=fade*.16;c.fillRect(center.x-45,center.y-55,90,95);c.globalAlpha=1;
        for(let i=0;i<13;i++){const px=center.x+Math.sin(i*4.1)*35,py=center.y+35-((t*90+i*7)%95);c.fillStyle=hue;c.globalAlpha=fade;c.fillRect(px,py,4,4);if(family==='boost'){c.fillRect(px-2,py+2,8,2);c.fillRect(px+1,py-2,2,8);}if(family==='affliction'){c.fillStyle=color;c.globalAlpha=fade*.6;c.beginPath();c.arc(px,py,5+i%4,0,Math.PI*2);c.fill();}}
        c.globalAlpha=1;this.ring(c,center.x,center.y+10,20+50*t,hue,fade,3);
      }else if(family==='lightning'){
        c.fillStyle='#fff0a5';c.globalAlpha=fade*.1;c.fillRect(0,0,w,h);c.globalAlpha=1;
        for(let pass=0;pass<2;pass++){c.strokeStyle=pass?'#fffbe3':'#ffd13a';c.lineWidth=pass?3:8;c.beginPath();c.moveTo(a.x,a.y);for(let i=1;i<=12;i++){const f=i/12,jitter=i===12?0:Math.sin(i*7+t*40)*14;c.lineTo(mix(a.x,b.x,f)+jitter,mix(a.y,b.y,f)+jitter*.5);}c.stroke();}
        this.stars(c,b.x,b.y,t,'#fff2a3');
      }else if(family==='ice'){
        for(let i=0;i<9;i++){const q=clamp(t*1.8-i*.06),px=mix(a.x,b.x,q)+Math.sin(i*7)*16,py=mix(a.y,b.y,q)+Math.cos(i*5)*17;c.globalAlpha=Math.sin(q*Math.PI);c.fillStyle=i%2?'#dffbff':'#74c5ea';c.beginPath();c.moveTo(px,py-15);c.lineTo(px+7,py);c.lineTo(px,py+15);c.lineTo(px-7,py);c.closePath();c.fill();}c.globalAlpha=1;if(t>.5)this.stars(c,b.x,b.y,(t-.5)*2,'#dcffff',18);
      }else if(family==='fire'){
        for(let i=0;i<20;i++){const q=clamp(t*1.9-i*.035),px=mix(a.x,b.x,q)+Math.sin(i*12.3)*13*q,py=mix(a.y,b.y,q)+Math.cos(i*7)*14*q-5*q;c.globalAlpha=Math.sin(q*Math.PI);c.fillStyle=['#ffe56e','#ffae3f','#ed5e35'][i%3];c.beginPath();c.arc(px,py,5+i%7,0,Math.PI*2);c.fill();c.fillRect(px-3,py-12-i%5,6,12);}c.globalAlpha=1;
      }else if(family==='water'){
        c.strokeStyle='#61c7f3';c.lineWidth=15*fade;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(x,y);c.stroke();c.strokeStyle='#d8f9ff';c.lineWidth=4*fade;c.stroke();
        for(let i=0;i<18;i++){const q=clamp(t*1.8-i*.04),px=mix(a.x,b.x,q)+Math.sin(i*9+q*12)*16,py=mix(a.y,b.y,q)+Math.cos(i*6+q*12)*15;c.globalAlpha=Math.sin(q*Math.PI);c.fillStyle=i%2?'#b8f5ff':'#43a9df';c.fillRect(px,py,4,7);}c.globalAlpha=1;
        if(/surf/i.test(name)){for(let i=0;i<3;i++){c.strokeStyle=['#419cc3','#8fd8e6','#e2fbef'][i];c.lineWidth=5;c.beginPath();for(let px=0;px<w;px+=4){const py=h-15-t*70+Math.sin(px*.065+t*8+i)*7+i*7;px===0?c.moveTo(px,py):c.lineTo(px,py);}c.stroke();}}
      }else if(family==='earth'||family==='rocks'){
        for(let i=0;i<10;i++){const q=clamp((t-i*.035)*1.5),px=b.x+(i-5)*9,py=b.y+33-Math.sin(q*Math.PI)*(15+(i%4)*9);c.globalAlpha=Math.sin(q*Math.PI);c.fillStyle=['#bc965f','#e4c17e','#8a7056'][i%3];c.beginPath();c.moveTo(px-8,py+5);c.lineTo(px-5,py-11-i%8);c.lineTo(px+4,py-14-i%11);c.lineTo(px+9,py+5);c.closePath();c.fill();c.fillStyle='#ead1a0';c.fillRect(px-3,py-6,3,4);}c.globalAlpha=1;
        for(let i=0;i<13;i++){c.fillStyle='#d7bd87';c.globalAlpha=fade*.6;c.fillRect(b.x-55+i*8,b.y+30-Math.sin(t*7+i)*8,7,4);}c.globalAlpha=1;
      }else if(family==='wind'){
        for(let i=0;i<6;i++){const cy=b.y+37-i*14,rx=9+i*6;c.strokeStyle=i%2?'#e8f4da':'#a4c6ba';c.lineWidth=3;c.globalAlpha=fade;c.beginPath();c.ellipse(b.x+Math.sin(t*24+i)*5,cy,rx,5,0,t*18+i,t*18+i+4.6);c.stroke();}c.globalAlpha=1;
      }else if(family==='psychic'){
        c.fillStyle='#8863b1';c.globalAlpha=fade*.23;c.fillRect(0,0,w,h);c.globalAlpha=1;for(let i=0;i<4;i++)this.ring(c,b.x,b.y,15+((t*80+i*20)%85),'#edb2ed',fade*(1-i*.12),3);
      }else if(family==='drain'){
        for(let i=0;i<13;i++){const q=clamp(t*1.7-i*.04),px=mix(b.x,a.x,q)+Math.sin(q*8+i)*14,py=mix(b.y,a.y,q)-Math.sin(q*Math.PI)*27;c.globalAlpha=Math.sin(q*Math.PI);c.fillStyle=i%2?'#d7f7ac':'#76d278';c.fillRect(px,py,5,5);c.fillStyle='#f4ffe0';c.fillRect(px+1,py+1,2,2);}c.globalAlpha=1;
      }else if(family==='shadow'||family==='energy'){
        const radius=(family==='shadow'?16:11)*Math.sin(t*Math.PI);c.fillStyle=color;c.shadowColor=color;c.shadowBlur=12;c.beginPath();c.arc(x,y,radius,0,Math.PI*2);c.fill();c.shadowBlur=0;this.ring(c,x,y,radius+5,'#eee0ff',fade,2);if(t>.55)this.stars(c,b.x,b.y,(t-.55)/.45,color,16);
      }else{
        if(t>.2){const q=clamp((t-.2)*1.3);this.stars(c,b.x,b.y,q,'#fff9db',17);c.save();c.translate(b.x,b.y);c.rotate(-.65);c.globalAlpha=Math.sin(q*Math.PI);c.fillStyle='#fffdf0';for(let i=0;i<3;i++)c.fillRect(i*12-14,-32+q*12,3,58);c.restore();c.globalAlpha=1;}
      }
    });
    lunge?.cancel();
  }
  async entry(side){
    const b=this.center(side),actor=this.actor(side),from=side==='p1'?{x:0,y:this.field.clientHeight-10}:{x:this.field.clientWidth,y:10};
    let entrance;
    if(!this.reduced)entrance=actor.animate([{opacity:0,transform:'scale(.08)'},{opacity:1,transform:'scale(1.025)',offset:.8},{opacity:1,transform:'scale(1)'}],{delay:260/this.speed(),duration:330/this.speed(),fill:'both',easing:'ease-out'});
    await this.timeline(620,(c,t)=>{
      if(t<.55){const q=t/.55,x=mix(from.x,b.x,q),y=mix(from.y,b.y,q)-Math.sin(q*Math.PI)*55;c.save();c.translate(x,y);c.rotate(t*15);c.fillStyle='#f9f5df';c.beginPath();c.arc(0,0,7,0,Math.PI*2);c.fill();c.fillStyle='#d64d44';c.beginPath();c.arc(0,0,7,Math.PI,Math.PI*2);c.fill();c.strokeStyle='#3c4050';c.lineWidth=2;c.beginPath();c.moveTo(-7,0);c.lineTo(7,0);c.stroke();c.fillStyle='#f9f5df';c.fillRect(-2,-2,4,4);c.restore();}
      else this.stars(c,b.x,b.y,(t-.55)/.45,'#fff9c6',20);
    });entrance?.cancel();
  }
  async faint(side){
    const actor=this.actor(side);if(!this.reduced){const a=actor.animate([{opacity:1,transform:'translateY(0) scaleY(1)'},{opacity:.5,transform:'translateY(20px) scaleY(.65)',offset:.6},{opacity:0,transform:'translateY(42px) scaleY(.1)'}],{duration:380/this.speed(),fill:'forwards'});await a.finished.catch(()=>{});a.cancel();}
  }
  async damage(side,amount,heal=false){
    const actor=this.actor(side),b=this.center(side),label=document.createElement('span');label.className=`damage-number ${heal?'is-heal':''}`;label.textContent=`${heal?'+':'−'}${Math.abs(Math.round(amount))}`;Object.assign(label.style,{left:`${b.x}px`,top:`${b.y-25}px`});this.layer.append(label);
    if(!this.reduced){actor.animate(heal?[{filter:'brightness(1)'},{filter:'brightness(1.6) saturate(1.5)'},{filter:'brightness(1)'}]:[{opacity:1,transform:'translateX(0)'},{opacity:.25,transform:'translateX(-2px)'},{opacity:1,transform:'translateX(2px)'},{opacity:.25,transform:'translateX(-1px)'},{opacity:1,transform:'translateX(0)'}],{duration:330/this.speed()});const a=label.animate([{opacity:0,transform:'translate(-50%,0)'},{opacity:1,transform:'translate(-50%,-8px)',offset:.2},{opacity:0,transform:'translate(-50%,-30px)'}],{duration:560/this.speed()});await a.finished.catch(()=>{});}label.remove();
  }
  async intro(opponent='Blue',waitForContinue=async()=>{}){
    const portraits={Brock:'brock',Misty:'misty','Lt. Surge':'surge',Blue:'blue'};
    const key=portraits[opponent]||'blue';
    const el=document.createElement('div');
    el.className='trainer-intro';
    el.innerHTML=`<div class="intro-stripe"></div>
      <div class="intro-trainer intro-you"><img src="assets/player-trainer.svg" alt="Your challenger" draggable="false"><span>CHALLENGER</span></div>
      <span class="versus">VS</span>
      <div class="intro-trainer intro-blue"><img src="assets/trainers/${key}.svg" alt="${opponent} pixel art portrait" draggable="false"><span>${opponent.toUpperCase()}</span></div>
      <span class="intro-hint">TAP OR PRESS A TO BEGIN</span>`;
    this.layer.append(el);
    try{
      // Leave the portraits on screen until the player acknowledges the battle.
      // A minimum hold makes the art readable even if the A button is pressed quickly.
      await new Promise(resolve=>setTimeout(resolve,Math.max(700,900/this.speed())));
      await waitForContinue();
      if(!this.reduced){
        const fade=el.animate([{opacity:1},{opacity:0}],{duration:220,fill:'forwards',easing:'steps(6,end)'});
        await fade.finished.catch(()=>{});
      }
    }finally{el.remove();}
  }}
