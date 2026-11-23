import test from 'node:test';
import assert from 'node:assert/strict';
import {Worker} from 'node:worker_threads';

test('reload deals a fresh team while explicit resume restores the exact unfinished battle',async()=>{
  const source=new URL('../src/worker.js',import.meta.url).href;
  const worker=new Worker(new URL('data:text/javascript,'+encodeURIComponent(`
    import {parentPort} from 'node:worker_threads';
    globalThis.self={postMessage:value=>parentPort.postMessage(value)};
    await import(${JSON.stringify(source)});
    parentPort.on('message',data=>self.onmessage({data}));
  `)));
  let id=0;
  const request=(type,input={})=>new Promise((resolve,reject)=>{
    const messageId=++id;
    const receive=data=>{if(data.id!==messageId)return;worker.off('message',receive);data.error?reject(new Error(data.error)):resolve(data.result);};
    worker.on('message',receive);worker.postMessage({id:messageId,type,...input});
  });
  try{
    const first=await request('boot');
    const started=await request('start',{order:[6,2,3,4,5,1]});
    const reload=await request('boot',{saved:started.save});
    assert.equal(reload.restored,false);
    assert.equal(reload.state.request.teamPreview,true);
    assert.equal(reload.state.turn,0);
    assert.notDeepEqual(reload.state.p1.pokemon.map(p=>p.species),first.state.p1.pokemon.map(p=>p.species));
    const resumed=await request('resume',{saved:started.save});
    assert.equal(resumed.restored,true);
    assert.deepEqual(resumed.state,started.state);
    await assert.rejects(request('resume',{saved:first.save}),/No unfinished battle/);
    const move=resumed.state.request.active[0].moves.findIndex(m=>!m.disabled&&m.pp>0)+1;
    const played=await request('act',{command:`move ${move}`});
    assert.ok(played.state.turn>=1);
    assert.ok(played.logs.some(line=>line.startsWith('|move|')));
  }finally{await worker.terminate();}
});
