import {clamp,mulberry32,hashString} from './data.js';

// Original, dependency-free spectral analyser. FFT uses a Hann window and samples
// the decoded waveform at ~11 kHz so long tracks remain practical on mobile.
const N=512, RATE=11025, HOP=256;
const bitReverse=new Uint16Array(N);
for(let i=0;i<N;i++){let x=i,r=0;for(let b=0;b<9;b++){r=(r<<1)|(x&1);x>>=1;}bitReverse[i]=r;}
const twiddles=new Map();
for(let size=2;size<=N;size*=2){
  const c=new Float32Array(size/2),s=new Float32Array(size/2);
  for(let k=0;k<size/2;k++){c[k]=Math.cos(-2*Math.PI*k/size);s[k]=Math.sin(-2*Math.PI*k/size);}
  twiddles.set(size,{c,s});
}
const hann=Float32Array.from({length:N},(_,i)=>0.5-0.5*Math.cos(2*Math.PI*i/(N-1)));
const groupBin=(k)=>{
  const hz=k*RATE/N;
  return hz<145?0:hz<470?1:hz<1850?2:3;
};
export function fftBands(frame) {
  const re=new Float32Array(N),im=new Float32Array(N);
  for(let i=0;i<N;i++)re[bitReverse[i]]=frame[i]*hann[i];
  for(let size=2;size<=N;size*=2){
    const {c,s}=twiddles.get(size);
    for(let start=0;start<N;start+=size){
      for(let k=0;k<size/2;k++){
        const j=start+k,h=j+size/2,cs=c[k],sn=s[k];
        const tr=cs*re[h]-sn*im[h],ti=sn*re[h]+cs*im[h];
        re[h]=re[j]-tr; im[h]=im[j]-ti; re[j]+=tr; im[j]+=ti;
      }
    }
  }
  const sums=[0,0,0,0],counts=[0,0,0,0];
  for(let k=2;k<N/2;k++){
    const band=groupBin(k);
    sums[band]+=re[k]*re[k]+im[k]*im[k]; counts[band]++;
  }
  return sums.map((x,i)=>Math.log1p(Math.sqrt(x/Math.max(1,counts[i]))));
}
export async function analyzeBuffer(buffer,onProgress=()=>{}) {
  const duration=buffer.duration;
  const channels=Array.from({length:Math.min(2,buffer.numberOfChannels)},(_,i)=>buffer.getChannelData(i));
  const ratio=buffer.sampleRate/RATE;
  const frames=[],prev=[0,0,0,0],sample=new Float32Array(N);
  const total=Math.max(0,Math.ceil((duration*RATE-N)/HOP));
  for(let step=0;step<total;step++){
    const offset=step*HOP;
    for(let i=0;i<N;i++){
      const at=Math.min(channels[0].length-1,Math.floor((offset+i)*ratio));
      sample[i]=channels.reduce((sum,c)=>sum+c[at],0)/channels.length;
    }
    const bands=fftBands(sample);
    const flux=bands.map((v,i)=>Math.max(0,v-prev[i]));
    const energy=bands.reduce((a,b)=>a+b,0)/4;
    const onset=flux.reduce((a,b)=>a+b,0);
    frames.push({time:offset/RATE,bands,flux,energy,onset});
    for(let i=0;i<4;i++)prev[i]=bands[i];
    if(step%180===0){onProgress(step/Math.max(1,total));await new Promise(resolve=>setTimeout(resolve,0));}
  }
  const bpm=estimateBPM(frames);
  const mean=frames.reduce((sum,f)=>sum+f.energy,0)/Math.max(1,frames.length);
  onProgress(1);
  return {duration,bpm,frames,mean,step:HOP/RATE};
}
export function estimateBPM(frames) {
  if(frames.length<100)return 120;
  const step=HOP/RATE;
  const size=Math.min(frames.length,Math.floor(90/step));
  let best=120,score=-Infinity;
  const avg=frames.slice(0,size).reduce((a,f)=>a+f.onset,0)/size;
  for(let bpm=70;bpm<=190;bpm++){
    const lag=Math.round(60/bpm/step);
    let sum=0,power=0;
    for(let i=lag;i<size;i+=2){
      const a=Math.max(0,frames[i].onset-avg*0.7);
      const b=Math.max(0,frames[i-lag].onset-avg*0.7);
      sum+=a*b;power+=a*a+b*b;
    }
    const v=sum/Math.max(1e-5,power);
    if(v>score){score=v;best=bpm;}
  }
  return best;
}
export function makeChart(analysis,difficulty='normal',persona='orion',seed=444){
  const frames=analysis.frames;
  const bpm=clamp(analysis.bpm||120,70,200);
  const div={easy:1,normal:2,hard:3,expert:bpm>=115?4:3}[difficulty]||2;
  const step=60/bpm/div, rng=mulberry32((seed^hashString(persona))>>>0);
  const pattern={orion:[0,1,0,1,2,3,2,3],astro:[0,0,1,1,2,2,3,3],
    ripple:[0,0,1,0,2,0,3],brix:[0,0,0,1,1,1,2,2,2],
    demon:[3,0,1,3,2,1,0,2],hermes:[0,1,2,3,0,1,2,3],
    echo:[3,2,1,0,0,1,2,3],flux:[0,2,1,3,1,3,2,0]}[persona]||[0,1,2,3];
  const notes=[],duration=analysis.duration,mean=analysis.mean||.01;
  let count=0,lastTime=-1;
  for(let center=.65;center<duration-.32;center+=step){
    let strongest=null,peak=-Infinity;
    const start=Math.max(0,Math.round((center-.087)/analysis.step));
    const end=Math.min(frames.length-1,Math.round((center+.087)/analysis.step));
    for(let i=start;i<=end;i++){
      const f=frames[i];
      const metric=f.onset*1.7+f.energy*.18;
      if(metric>peak){peak=metric;strongest=f;}
    }
    if(!strongest)continue;
    // Short breaks survive analysis instead of being filled with fake random notes.
    if(strongest.energy<mean*.16&&strongest.onset<mean*.24)continue;
    const bandScores=strongest.flux.map((flux,i)=>flux*(i===0?1.1:1)+(strongest.bands[i]||0)*.09);
    let lane=bandScores.indexOf(Math.max(...bandScores));
    const signature=pattern[count%pattern.length];
    if(rng()<.3 || strongest.onset<mean*.20)lane=signature;
    if(persona==='demon'&&rng()<.3)lane=Math.floor(rng()*4);
    if(persona==='flux')lane=(lane+Math.floor(count/16))%4;
    const time=Math.max(.45,strongest.time);
    if(time-lastTime<Math.min(step*.70,.08))continue;
    const intensity=clamp(strongest.energy/(mean||1),.35,2.4);
    notes.push({time,lane,duration:0,intensity,judged:false,result:null});
    lastTime=time;count++;
  }
  // Bass-heavy tracks reward charged notes, but notes still never overlap.
  if(difficulty!=='expert')for(let i=13;i<notes.length-1;i+=17){
    const note=notes[i],next=notes[i+1];
    if(note.lane!==0)continue;
    const len=Math.min(.48,next.time-note.time-.075);
    if(len>.24)note.duration=len;
  }
  return notes;
}
// Generates actual original music, not silence or a simulated waveform.
export function createDemo(demo) {
  const sr=16000,seconds=48,beat=60/demo.bpm;
  const samples=new Float32Array(sr*seconds);
  const bassNotes=[55,55,65.41,73.42,82.41,65.41,73.42,49];
  const rng=mulberry32(demo.seed);
  const noise=new Float32Array(samples.length);
  for(let i=0;i<noise.length;i++)noise[i]=rng()*2-1;
  for(let i=0;i<samples.length;i++){
    const t=i/sr,q=t/beat,phase=q%1,bar=Math.floor(q/4),beatNum=Math.floor(q)%4;
    const kickT=phase*beat, kick=Math.sin(2*Math.PI*(57*kickT+95*kickT*Math.exp(-kickT*30)))*Math.exp(-kickT*24)*.46;
    const snareT=((q+3)%4)%4;
    const snare=beatNum%2===1?noise[i]*Math.exp(-phase*beat*24)*.21:0;
    const hatPhase=(q*2)%1;
    const hat=noise[i]*Math.exp(-hatPhase*beat*.5*85)*.09;
    const bassHz=bassNotes[(Math.floor(q/2)+bar)%bassNotes.length];
    const env=.75+.25*Math.cos(phase*Math.PI);
    const bass=(Math.sin(2*Math.PI*bassHz*t)+.31*Math.sin(2*Math.PI*bassHz*2*t))*env*.23;
    const noteIndex=Math.floor(q*2)%8;
    const melody=[0,7,10,14,12,7,5,3][(noteIndex+Math.floor(bar/4))%8];
    const mHz=220*Math.pow(2,melody/12);
    const pluck=(Math.sin(2*Math.PI*mHz*t)+.22*Math.sin(2*Math.PI*mHz*2*t))*Math.exp(-hatPhase*beat*.5*7)*.13;
    const arrangement=bar%8===7?.45:1;
    samples[i]=clamp((kick+snare+hat+bass+pluck)*arrangement,-.96,.96);
  }
  const output=new ArrayBuffer(44+samples.length*2),view=new DataView(output);
  const write=(at,str)=>{for(let i=0;i<str.length;i++)view.setUint8(at+i,str.charCodeAt(i));};
  write(0,'RIFF');view.setUint32(4,36+samples.length*2,true);write(8,'WAVE');write(12,'fmt ');
  view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);
  view.setUint32(24,sr,true);view.setUint32(28,sr*2,true);view.setUint16(32,2,true);
  view.setUint16(34,16,true);write(36,'data');view.setUint32(40,samples.length*2,true);
  for(let i=0;i<samples.length;i++)view.setInt16(44+i*2,samples[i]*32767,true);
  return new Blob([output],{type:'audio/wav'});
}
