import test from 'node:test';
import assert from 'node:assert/strict';
import {createDialogueGate} from '../src/dialogue-gate.js';

test('a battle message waits indefinitely until one explicit tap or button press',async()=>{
  let shown=0,hidden=0,finished=false;
  const gate=createDialogueGate({onWait:()=>shown++,onAdvance:()=>hidden++});
  const turn=gate.wait().then(()=>{finished=true;});
  await Promise.resolve();await Promise.resolve();
  assert.equal(finished,false);
  assert.equal(gate.waiting,true);
  assert.equal(gate.advance(),true);
  await turn;
  assert.equal(gate.waiting,false);
  assert.equal(gate.advance(),false);
  assert.equal(shown,1);
  assert.equal(hidden,1);
});
test('each battle message needs a separate advance; double click cannot skip two beats',async()=>{
  const gate=createDialogueGate();
  const first=gate.wait();
  assert.equal(gate.advance(),true);
  assert.equal(gate.advance(),false);
  await first;
  const second=gate.wait();
  let reached=false;
  second.then(()=>reached=true);
  await Promise.resolve();
  assert.equal(reached,false);
  gate.advance();
  await second;
  assert.equal(reached,true);
});
