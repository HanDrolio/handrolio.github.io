import {PERSONAS,STAGES,DEMOS,GLYPHS,LANES,day444,hashString,clamp,loadProgress,saveProgress} from './data.js';
import {analyzeBuffer,makeChart,createDemo} from './analyzer.js';
import {FighterSession} from './combat.js';
import {Renderer} from './render.js';

const $=id=>document.getElementById(id);
const AudioContextImpl=window.AudioContext||window.webkitAudioContext;
const suffix=file=>/\.(mp3|wav|ogg|flac|m4a|aac)$/i.test(file.name||'');
const timeLabel=seconds=>Math.floor(seconds/60)+':'+String(Math.floor(seconds%60)).padStart(2,'0');

class RhythmFighter {
  constructor(){
    this.renderer=new Renderer($('arena'));this.renderer.resize();
    this.state='setup';this.session=null;this.mode='arcade';this.difficulty='normal';
    this.persona='flux';this.stage='rotunda';this.round=1;this.turn=1;this.vsResults=[];
    this.glyphs=['blue','space','loop'];this.progress=loadProgress();
    this.source={type:'demo',id:'neon'};this.ready=false;this.loadToken=0;
    this.audio=new Audio();this.audio.preload='auto';this.audio.playsInline=true;
    this.audio.volume=.8;this.audio.onended=()=>{if(this.state==='playing')this.finish('TRACK COMPLETE');};
    this.audio.onerror=()=>{if(this.state==='playing')this.toast('Audio playback stopped unexpectedly.');};
    this.context=null;this.analyser=null;this.objectURL=null;this.lastFrame=0;
    this.inputHeld=new Set();this.padButtons=new Set();this.connectedPad='';
    this.trackDuration=48;this.trackName='NEON STATIC';this.activeSeed=444;
    this.startCarry=1000;this.enemyHP=1000;
    this.fileQueue=[];this.demoIndex=0;
    this.renderSelectors();this.bind();
    this.prepareDemo(DEMOS[0]);
    requestAnimationFrame(t=>this.frame(t));
    if('serviceWorker' in navigator && window.isSecureContext){
      addEventListener('load',()=>navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(()=>{}),{once:true});
    }
  }
  toast(message){
    clearTimeout(this.toastTimeout);
    const node=$('toast');node.textContent=message;node.hidden=false;
    this.toastTimeout=setTimeout(()=>{node.hidden=true;},2600);
  }
  renderSelectors(){
    $('roster').innerHTML=PERSONAS.map(p=>'<button type="button" data-persona="'+p.id+'" style="--color:'+p.color+'" aria-pressed="'+String(p.id===this.persona)+'" class="'+(p.id===this.persona?'selected':'')+'" title="'+p.name+' / '+p.powerName+'"><b>'+p.icon+'</b><small>'+p.name+'</small></button>').join('');
    $('stages').innerHTML=STAGES.map(s=>'<button type="button" data-stage="'+s.id+'" style="--color:'+s.color+'" aria-pressed="'+String(s.id===this.stage)+'" class="'+(s.id===this.stage?'selected':'')+'">'+s.name+'</button>').join('');
    $('glyphs').innerHTML=GLYPHS.map(g=>'<button type="button" data-glyph="'+g.id+'" title="'+g.name+': '+g.description+'" aria-label="'+g.name+': '+g.description+'" aria-pressed="'+String(this.glyphs.includes(g.id))+'">'+g.icon+'</button>').join('');
    this.updateSelection();
  }
  updateSelection(){
    for(const b of $('roster').querySelectorAll('[data-persona]')){
      const sel=b.dataset.persona===this.persona;b.classList.toggle('selected',sel);b.setAttribute('aria-pressed',String(sel));
    }
    for(const b of $('stages').querySelectorAll('[data-stage]')){
      const sel=b.dataset.stage===this.stage;b.classList.toggle('selected',sel);b.setAttribute('aria-pressed',String(sel));
    }
    for(const b of $('glyphs').querySelectorAll('[data-glyph]')){
      b.setAttribute('aria-pressed',String(this.glyphs.includes(b.dataset.glyph)));
    }
    const p=PERSONAS.find(p=>p.id===this.persona);
    $('fighter-name').textContent=p.name;
    $('fighter-info').textContent=p.style+' / '+p.powerName+'  ·  SPEED '+p.speed+'  POWER '+p.power+'  DEFENSE '+p.defense;
    $('speed-row').hidden=this.mode!=='training';
    $('launch').disabled=!this.ready;
  }
  bind(){
    $('demos').addEventListener('click',e=>{
      const button=e.target.closest('[data-demo]');if(!button)return;
      const chosen=DEMOS.find(d=>d.id===button.dataset.demo);
      if(this.mode==='daily'){this.toast('Daily mode uses its own fixed 4:44 track.');return;}
      this.fileQueue=[];this.demoIndex=DEMOS.indexOf(chosen);this.prepareDemo(chosen);
    });
    $('track-file').addEventListener('change',e=>this.chooseFiles([...e.target.files]));
    const drop=$('drop-area');
    drop.addEventListener('dragover',e=>{e.preventDefault();drop.classList.add('dragover');});
    drop.addEventListener('dragleave',()=>drop.classList.remove('dragover'));
    drop.addEventListener('drop',e=>{e.preventDefault();drop.classList.remove('dragover');this.chooseFiles([...e.dataTransfer.files]);});
    $('mode').addEventListener('change',()=>{
      this.mode=$('mode').value;this.round=1;this.turn=1;this.vsResults=[];
      if(this.mode==='daily')this.prepareDemo(DEMOS[hashString(day444())%DEMOS.length]);
      this.updateSelection();
    });
    $('difficulty').addEventListener('change',()=>this.difficulty=$('difficulty').value);
    $('roster').addEventListener('click',e=>{const b=e.target.closest('[data-persona]');if(b){this.persona=b.dataset.persona;this.updateSelection();}});
    $('stages').addEventListener('click',e=>{const b=e.target.closest('[data-stage]');if(b){this.stage=b.dataset.stage;this.updateSelection();}});
    $('glyphs').addEventListener('click',e=>{
      const b=e.target.closest('[data-glyph]');if(!b)return;
      const id=b.dataset.glyph;if(this.glyphs.includes(id))this.glyphs=this.glyphs.filter(x=>x!==id);
      else if(this.glyphs.length<3)this.glyphs.push(id);
      else this.toast('Equip a maximum of three glyphs.');
      this.updateSelection();
    });
    $('offset').addEventListener('input',()=>{$('offset-value').textContent=$('offset').value+'ms';});
    $('speed').addEventListener('input',()=>{
      $('speed-value').textContent=Math.round(Number($('speed').value)*100)+'%';
      this.audio.playbackRate=Number($('speed').value);
    });
    $('volume').addEventListener('input',()=>{
      this.audio.volume=Number($('volume').value);
      $('volume-value').textContent=Math.round(this.audio.volume*100)+'%';
    });
    $('launch').addEventListener('click',()=>this.startRound());
    $('pause-button').addEventListener('click',()=>this.togglePause());
    $('resume').addEventListener('click',()=>this.resume());
    $('retry').addEventListener('click',()=>{this.state='finished';this.audio.pause();this.startRound();});
    $('quit').addEventListener('click',()=>this.quit());
    $('results-menu').addEventListener('click',()=>this.quit());
    $('replay').addEventListener('click',()=>this.startRound());
    $('next-fight').addEventListener('click',()=>this.nextFight());
    $('help-button').addEventListener('click',()=>this.showHelp());
    $('pause-help').addEventListener('click',()=>this.showHelp());
    $('close-help').addEventListener('click',()=>{$('help').hidden=true;});
    $('help').addEventListener('click',e=>{if(e.target===$('help'))$('help').hidden=true;});
    document.addEventListener('keydown',e=>{
      if(['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName)){
        if(e.code==='Escape')document.activeElement.blur();else return;
      }
      if(e.code==='Escape'){
        e.preventDefault();
        if(!$('help').hidden){$('help').hidden=true;return;}
        this.togglePause();return;
      }
      const map={KeyD:0,KeyF:1,KeyJ:2,KeyK:3};
      if(e.code in map&&this.state==='playing'&&!e.repeat){
        e.preventDefault();const lane=map[e.code];this.inputHeld.add(lane);this.press(lane);
      }
      if(e.code==='Space'&&this.state==='playing'){e.preventDefault();this.togglePause();}
    });
    document.addEventListener('keyup',e=>{
      const map={KeyD:0,KeyF:1,KeyJ:2,KeyK:3};
      if(e.code in map){this.inputHeld.delete(map[e.code]);this.release(map[e.code]);}
    });
    document.addEventListener('visibilitychange',()=>{
      if(document.hidden&&this.state==='playing')this.pause();
    });
    addEventListener('blur',()=>{if(this.state==='playing')this.pause();this.inputHeld.clear();});
    for(const b of $('touch-pad').querySelectorAll('button')){
      const lane=Number(b.dataset.lane);
      b.addEventListener('pointerdown',e=>{
        e.preventDefault();b.setPointerCapture(e.pointerId);this.inputHeld.add(lane);b.classList.add('pressed');this.press(lane);
      });
      for(const eventName of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(eventName,()=>{
        b.classList.remove('pressed');this.inputHeld.delete(lane);this.release(lane);
      });
    }
    addEventListener('gamepadconnected',e=>{
      this.connectedPad=e.gamepad.id;
      $('controller-status').textContent='CONTROLLER CONNECTED';
      this.toast('PlayStation / Backbone controller detected.');
    });
    addEventListener('gamepaddisconnected',()=>{
      this.connectedPad='';this.padButtons.clear();$('controller-status').textContent='KEYBOARD / TOUCH READY';
      this.inputHeld.clear();if(this.state==='playing')this.pause();
    });
    addEventListener('resize',()=>this.renderer.resize());
  }
  async chooseFiles(files){
    if(this.mode==='daily'){this.toast('Daily mode uses the same original track for everyone.');return;}
    const valid=files.filter(f=>(f.type.startsWith('audio/')||suffix(f))&&f.size>0);
    if(!valid.length){this.toast('Select a supported audio file.');return;}
    if(valid.some(f=>f.size>90*1024*1024)){this.toast('Choose audio files under 90 MB each.');return;}
    this.fileQueue=valid;this.demoIndex=-1;
    await this.prepareFile(valid[0]);
  }
  updateDemoButtons(id){
    for(const button of $('demos').querySelectorAll('button'))button.classList.toggle('selected',button.dataset.demo===id);
  }
  async prepareDemo(demo){
    this.updateDemoButtons(demo.id);
    const blob=createDemo(demo);
    await this.prepare(blob,{type:'demo',id:demo.id,name:demo.name,bpm:demo.bpm});
  }
  async prepareFile(file){
    await this.prepare(file,{type:'file',id:file.name+'-'+file.size+'-'+file.lastModified,name:file.name.replace(/\.[a-z0-9]+$/i,'').slice(0,60)});
  }
  async prepare(blob,source){
    const token=++this.loadToken;
    this.ready=false;this.updateSelection();
    $('track-status').textContent='ANALYZING AUDIO…';
    try{
      if(!AudioContextImpl)throw Error('This browser does not support Web Audio.');
      const context=new AudioContextImpl();
      let buffer;
      try {buffer=await context.decodeAudioData(await blob.arrayBuffer());}
      finally{context.close().catch(()=>{});}
      if(token!==this.loadToken)return;
      if(!buffer.duration||buffer.duration>900)throw Error('Use a track under 15 minutes.');
      const analysis=await analyzeBuffer(buffer,p=>{
        if(token===this.loadToken)$('track-status').textContent='ANALYZING AUDIO… '+Math.round(p*100)+'%';
      });
      if(token!==this.loadToken)return;
      const url=URL.createObjectURL(blob);
      if(this.objectURL)URL.revokeObjectURL(this.objectURL);
      this.objectURL=url;this.audio.pause();this.audio.src=url;this.audio.load();
      this.analysis=analysis;this.source=source;this.ready=true;this.trackDuration=analysis.duration;this.trackName=source.name;
      $('track-status').textContent=source.name+'  /  ~'+(source.bpm||analysis.bpm)+' BPM  /  '+timeLabel(analysis.duration);
      this.updateSelection();
    }catch(error){
      if(token!==this.loadToken)return;
      $('track-status').textContent='UNABLE TO LOAD: '+(error.message||'Unsupported audio codec.');
      this.toast('Track could not be analyzed. Try WAV or MP3.');
      this.updateSelection();
    }
  }
  ensureAudioGraph(){
    if(this.context)return;
    this.context=new AudioContextImpl();
    this.analyser=this.context.createAnalyser();
    this.analyser.fftSize=1024;this.analyser.smoothingTimeConstant=.72;
    const source=this.context.createMediaElementSource(this.audio);
    source.connect(this.analyser);this.analyser.connect(this.context.destination);
  }
  get enemy(){
    if(this.mode==='arcade'&&this.round===8)return {id:'architect',name:'THE ARCHITECT'};
    const opponents=PERSONAS.filter(p=>p.id!==this.persona);
    const seed=hashString(this.trackName+this.mode+this.round+day444());
    return opponents[(seed+this.round)%opponents.length];
  }
  playAudio(){
    try{
      this.ensureAudioGraph();
      this.context.resume().catch(()=>{});
      const play=this.audio.play();
      play?.catch(error=>{if(this.state==='playing'){this.pause();this.toast('Tap RESUME to enable audio playback.');}});
    }catch(error){this.toast('Audio unavailable: '+error.message);this.pause();}
  }
  startRound(){
    if(!this.ready||!this.analysis)return;
    this.audio.pause();this.audio.currentTime=0;
    this.audio.playbackRate=this.mode==='training'?Number($('speed').value):1;
    const difficulty=this.mode==='daily'?'normal':this.difficulty;
    const seed=this.mode==='daily'?hashString(day444()):hashString(this.source.id+'|'+this.round+'|'+this.persona);
    this.activeSeed=seed;
    const enemy=this.enemy;
    const realEnemy=enemy.id==='architect'?PERSONAS[4]:enemy;
    this.enemyHP=enemy.id==='architect'?1500:1000;
    const chartPersona=this.mode==='daily'?'orion':this.persona; // identical Daily note pattern for all fighters
    const notes=makeChart(this.analysis,difficulty,chartPersona,seed);
    if(!notes.length){this.toast('This audio contains too little rhythmic activity. Try another track.');return;}
    this.session=new FighterSession({
      notes,persona:this.persona,enemy:realEnemy.id,difficulty,mode:this.mode,seed,
      carry:this.mode==='survival'?this.startCarry:1000,
      glyphs:this.glyphs,enemyHP:this.enemyHP
    });
    if(enemy.id==='architect')this.session.enemy={...PERSONAS[4],name:'THE ARCHITECT',color:'#ffdf64'};
    const startStage=STAGES.findIndex(s=>s.id===this.stage);
    const stageIndex=(this.mode==='arcade'||this.mode==='survival')?(startStage+this.round-1)%STAGES.length:startStage;
    this.liveStage=STAGES[stageIndex].id;
    this.stageForRound=this.liveStage;
    this.state='playing';this.paused=false;
    $('setup').hidden=true;$('results').hidden=true;$('pause-screen').hidden=true;$('help').hidden=true;
    $('gamebar').hidden=false;$('touch-pad').hidden=false;
    document.body.classList.add('active');
    $('now-playing').textContent=this.trackName+'  /  ROUND '+this.round;
    $('time-display').textContent='0:00 / '+timeLabel(this.trackDuration);
    this.inputHeld.clear();this.padButtons.clear();this.lastFrame=0;
    this.playAudio();
  }
  get stage(){return this._stage||'rotunda';}
  set stage(value){this._stage=value;}
  press(lane){
    if(this.state!=='playing'||!this.session)return;
    const result=this.session.press(lane,this.audio.currentTime,Number($('offset').value)/1000);
    if(result==='PERFECT'&&navigator.vibrate)navigator.vibrate(12);
  }
  release(lane){
    if(this.state==='playing')this.session?.release(lane,this.audio.currentTime);
  }
  pollGamepads(){
    if(!navigator.getGamepads)return;
    const pads=[...navigator.getGamepads()].filter(Boolean);
    const pad=pads[0];
    if(!pad){this.padButtons.clear();return;}
    const pressed=new Set();
    for(const n of [0,1,2,3,9])if(pad.buttons[n]&&(pad.buttons[n].pressed||pad.buttons[n].value>.5))pressed.add(n);
    for(const n of [0,1,2,3]){
      if(pressed.has(n)&&!this.padButtons.has(n)){this.inputHeld.add(n);this.press(n);}
      if(!pressed.has(n)&&this.padButtons.has(n)){this.inputHeld.delete(n);this.release(n);}
    }
    if(pressed.has(9)&&!this.padButtons.has(9)){
      if(this.state==='setup'&&this.ready)this.startRound();
      else this.togglePause();
    }
    this.padButtons=pressed;
  }
  togglePause(){
    if(this.state==='playing')this.pause();
    else if(this.state==='paused')this.resume();
  }
  pause(){
    if(this.state!=='playing')return;
    this.audio.pause();this.state='paused';this.paused=true;$('pause-screen').hidden=false;
  }
  resume(){
    if(this.state!=='paused')return;
    $('pause-screen').hidden=true;this.state='playing';this.paused=false;this.playAudio();
  }
  quit(){
    this.audio.pause();this.state='setup';this.paused=false;this.session=null;
    $('setup').hidden=false;$('results').hidden=true;$('pause-screen').hidden=true;$('gamebar').hidden=true;
    $('touch-pad').hidden=true;$('help').hidden=true;document.body.classList.remove('active');
    this.round=1;this.turn=1;this.vsResults=[];this.startCarry=1000;
    this.updateSelection();
  }
  finish(reason){
    if(this.state!=='playing')return;
    this.state='finished';this.audio.pause();
    const s=this.session;const won=s.hp>0&&(s.foeHP<=0||reason==='TRACK COMPLETE'||this.mode==='training');
    if(won&&this.mode!=='training'){
      this.progress.wins++;
      const key=this.source.id+'|'+this.difficulty+'|'+this.persona;
      this.progress.best[key]=Math.max(this.progress.best[key]||0,s.score);
      if(this.mode==='daily'){
        const d=day444();this.progress.daily[d]=Math.max(this.progress.daily[d]||0,s.score);
      }
      if(this.mode==='arcade'&&this.round===8)this.progress.arcadeBest=Math.max(this.progress.arcadeBest,s.score);
      saveProgress(this.progress);
    }
    $('results').hidden=false;$('pause-screen').hidden=true;$('touch-pad').hidden=true;
    $('result-title').innerHTML=(won?'TRACK CLEAR':'K.O.')+'<span>.</span>';
    $('result-score').textContent=s.score.toLocaleString()+'  /  '+s.grade;
    $('result-stats').innerHTML=[
      [s.accuracy+'%','ACCURACY'],[s.maxCombo,'MAX COMBO'],
      [s.perfect,'PERFECT'],[s.great,'GREAT'],[s.good,'GOOD'],[s.misses,'MISSES']
    ].map(([n,k])=>'<div><b>'+n+'</b><span>'+k+'</span></div>').join('');
    let message=(won?'Victory! ':'The opponent took the round. ')+
      'Your hits: '+s.hits+' / '+s.notes.length+'.  '+(this.mode==='training'?'Training results are not ranked.':'Scores are saved on this device.');
    if(this.mode==='arcade'&&won&&this.round===8)message+=' YOU DEFEATED THE ARCHITECT.';
    if(this.mode==='daily')message+=' Today\'s 4:44 best: '+(this.progress.daily[day444()]||0).toLocaleString()+'.';
    if(this.mode==='versus'){
      this.vsResults[this.turn-1]=s.score;
      message=this.turn===1?'PLAYER 1 score recorded. Player 2 now plays the same track.':
        'PLAYER 1: '+this.vsResults[0].toLocaleString()+' · PLAYER 2: '+this.vsResults[1].toLocaleString()+
        ' · '+(this.vsResults[0]===this.vsResults[1]?'TIE GAME':this.vsResults[0]>this.vsResults[1]?'PLAYER 1 WINS':'PLAYER 2 WINS');
    }
    $('result-text').textContent=message;
    const more=(this.mode==='arcade'&&won&&this.round<8)||(this.mode==='survival'&&won)||
      (this.mode==='versus'&&this.turn===1);
    $('next-fight').hidden=!more;
    $('next-fight').textContent=this.mode==='versus'?'PLAYER 2 TURN ▶':this.mode==='survival'?'NEXT SURVIVAL TRACK ▶':'NEXT OPPONENT ▶';
  }
  async nextFight(){
    const s=this.session;
    if(this.mode==='versus')this.turn=2;
    else {this.round++;if(this.mode==='survival')this.startCarry=Math.min(1000,s.hp+70);}
    $('results').hidden=true;this.state='setup';$('setup').hidden=false;
    $('gamebar').hidden=true;document.body.classList.remove('active');
    if(this.mode==='versus')$('track-status').textContent+='  /  PLAYER 2: CHOOSE A FIGHTER';
    else if(this.source.type==='demo'){
      const next=DEMOS[(this.demoIndex>=0?this.demoIndex+this.round-1:this.round-1)%DEMOS.length];
      await this.prepareDemo(next);
    }else if(this.fileQueue.length>1){
      const next=this.fileQueue[(this.round-1)%this.fileQueue.length];
      await this.prepareFile(next);
    }
    this.toast(this.mode==='versus'?'Player 2: choose your fighter then start.':'Next round ready. Press START.');
  }
  showHelp(){$('help').hidden=false;}
  frame(ms){
    const t=ms/1000;
    if(this.state==='playing'&&this.session){
      this.pollGamepads();
      if(this.state==='playing'){
        this.session.update(this.audio.currentTime,this.inputHeld);
        if(this.session.hp<=0||this.session.foeHP<=0)this.finish(this.session.hp<=0?'K.O.':'KNOCKOUT');
        if(Math.floor(t*4)!==Math.floor(this.lastFrame*4))$('time-display').textContent=
          timeLabel(this.audio.currentTime)+' / '+timeLabel(this.trackDuration);
      }
    }else this.pollGamepads();
    this.renderer.draw(this,t);
    this.lastFrame=t;
    requestAnimationFrame(value=>this.frame(value));
  }
}
const game=new RhythmFighter();
export {RhythmFighter,game};
