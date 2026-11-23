import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/engine.js';
import {validOrder,swapSlots} from '../src/team-order.js';
import {animationFamily} from '../src/battle-effects.js';

test('drag swaps preserve all six Pokémon and can change any slot including the lead',()=>{
  let order=[1,2,3,4,5,6];
  order=swapSlots(order,2,5);assert.deepEqual(order,[1,5,3,4,2,6]);
  order=swapSlots(order,1,6);assert.deepEqual(order,[6,5,3,4,2,1]);
  assert.ok(validOrder(order,[1,2,3,4,5,6]));
  assert.deepEqual(swapSlots(order,6,6),order);
  assert.deepEqual(swapSlots(order,9,2),order);
});

test('battle starts in the exact reordered party sequence',()=>{
  const g=new Game(),original=g.battle.p1.pokemon.map(p=>p.name),order=[5,3,6,1,4,2];
  const r=g.start(order[0],order);
  assert.deepEqual(g.battle.p1.pokemon.map(p=>p.name),order.map(i=>original[i-1]));
  assert.equal(g.battle.p1.active[0].name,original[4]);
  const restored=new Game(JSON.parse(JSON.stringify(r.save)));
  assert.deepEqual(restored.battle.p1.pokemon.map(p=>p.name),order.map(i=>original[i-1]));
});

test('invalid party orders are rejected before either side commits a choice',()=>{
  for(const order of [[1,1,3,4,5,6],[1,2,3],[0,2,3,4,5,6],[1,2,3,4,5,7],['1',2,3,4,5,6]]){
    const g=new Game();assert.throws(()=>g.start(1,order),/Party order/);assert.equal(g.battle.requestState,'teampreview');
    assert.equal(g.battle.p1.choice.actions.length,0);assert.equal(g.battle.p2.choice.actions.length,0);
  }
});

test('signature move animations have distinct effect families with a fallback',()=>{
  for(const [name,type,category,want] of [
    ['Earthquake','Ground','Physical','earth'],['Stone Edge','Rock','Physical','rocks'],['Surf','Water','Special','water'],
    ['Thunderbolt','Electric','Special','lightning'],['Ice Beam','Ice','Special','ice'],['Flamethrower','Fire','Special','fire'],
    ['Psychic','Psychic','Special','psychic'],['Giga Drain','Grass','Special','drain'],['Hurricane','Flying','Special','wind'],
    ['Shadow Ball','Ghost','Special','shadow'],['Swords Dance','Normal','Status','boost'],['Recover','Normal','Status','healing'],
    ['Sleep Powder','Grass','Status','affliction'],['Double-Edge','Normal','Physical','impact'],['Hyper Voice','Normal','Special','energy']
  ])assert.equal(animationFamily(name,type,category),want,name);
});
