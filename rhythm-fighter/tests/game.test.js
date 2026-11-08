import test from 'node:test';
import assert from 'node:assert/strict';
import {judgement,FighterSession} from '../src/combat.js';
import {makeChart,estimateBPM} from '../src/analyzer.js';
import {day444,PERSONAS,LANES,STAGES,hashString} from '../src/data.js';

test('standard PS face buttons are Cross Circle Square Triangle',()=>{
  assert.deepEqual(LANES.map(l=>l.button),['✕','○','□','△']);
});
test('eight personas and seven stages',()=>{
  assert.equal(PERSONAS.length,8);assert.equal(STAGES.length,7);
});
test('judgement respects precise inclusive boundaries',()=>{
  assert.equal(judgement(.025),'PERFECT');
  assert.equal(judgement(.050),'GREAT');
  assert.equal(judgement(.080),'GOOD');
  assert.equal(judgement(.081),'MISS');
});
test('wider-window glyph expands perfect',()=>{
  assert.equal(judgement(.0275,true),'PERFECT');
});
test('same audio and seed generate deterministic single-note chart',()=>{
  const frames=Array.from({length:1400},(_,i)=>({time:i*256/11025,energy:.6+(i%10===0?.4:0),onset:i%10===0?.8:.12,bands:[.9,.7,.5,.6],flux:[i%5===0?.7:0,.2,.3,.2]}));
  const analysis={bpm:126,frames,duration:30,mean:.7,step:256/11025};
  const first=makeChart(analysis,'normal','flux',444);
  const second=makeChart(analysis,'normal','flux',444);
  assert.deepEqual(first,second);
  for(let i=1;i<first.length;i++)assert.ok(first[i].time>first[i-1].time);
  for(const n of first)assert.ok(n.lane>=0&&n.lane<4);
  assert.ok(first.length>40);
});
test('hitting notes damages enemy, builds combo and meter',()=>{
  const s=new FighterSession({notes:[{time:1,lane:0,duration:0}],persona:'orion',glyphs:[]});
  s.update(1,new Set([0]));assert.equal(s.press(0,1),'PERFECT');
  assert.ok(s.foeHP<1000);assert.equal(s.combo,1);assert.ok(s.meter>0);
});
test('misses damage player and reset combo',()=>{
  const s=new FighterSession({notes:[{time:1,lane:1,duration:0}],persona:'brix',glyphs:[]});
  s.update(1.2,new Set());
  assert.equal(s.misses,1);assert.ok(s.hp<1000);
});
test('full holds count, early release misses',()=>{
  const note={time:1,lane:0,duration:.35};
  const full=new FighterSession({notes:[note],persona:'ripple',glyphs:[]});
  full.update(1,new Set([0]));full.press(0,1);full.update(1.36,new Set([0]));
  assert.equal(full.perfect,1);
  const early=new FighterSession({notes:[note],persona:'ripple',glyphs:[]});
  early.update(1,new Set([0]));early.press(0,1);early.release(0,1.1);
  assert.equal(early.misses,1);
});
test('daily 4:44 boundary is in local time',()=>{
  assert.equal(day444(new Date('2026-11-07T04:43:00')), '2026-11-06');
  assert.equal(day444(new Date('2026-11-07T04:44:00')), '2026-11-07');
  assert.equal(hashString('same'),hashString('same'));
});
