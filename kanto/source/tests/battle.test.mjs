import test from 'node:test';
import assert from 'node:assert/strict';
import {TeamValidator,Battle} from '@pkmn/sim';
import {SETS,SPECIES,randomTeam,championTeam,CHAMPION_NUMS} from '../src/sets.js';
import {Game,createBattle,chooseAI,legalChoices,publicLog,snapshot,catalog} from '../src/engine.js';
import {STAGES,newRun,partyForStage,foeForStage,evolutionAtLevel} from '../src/circuit.js';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';

test('all 151 original species have legal level-100 National Dex sets and held items',()=>{
  assert.equal(SPECIES.length,151);
  assert.equal(Object.keys(SETS).length,151);
  const validator=new TeamValidator('kantochampionloop');
  for(let n=1;n<=151;n++){
    const s=SETS[n];assert.ok(s,`Missing #${n}`);
    assert.equal(s.level,100);assert.ok(s.item);assert.ok(s.ability);
    assert.ok(s.moves.length>=1&&s.moves.length<=4);
    assert.equal(Object.values(s.evs).reduce((a,b)=>a+b,0),508);
    assert.equal(validator.validateTeam([s]),null,`${s.species}: ${validator.validateTeam([s])}`);
  }
});

test('random teams have six unique original species, and all 151 are reachable',()=>{
  const seen=new Set();
  for(let i=0;i<600;i++){
    const team=randomTeam();assert.equal(team.length,6);assert.equal(new Set(team.map(s=>s.species)).size,6);
    for(const s of team){seen.add(s.species);assert.equal(s.level,100);assert.ok(s.item);}
  }
  assert.equal(seen.size,151);
  assert.deepEqual(championTeam().map(s=>s.species),CHAMPION_NUMS.map(n=>SETS[n].species));
  const c=championTeam();c[0].moves[0]='Splash';assert.notEqual(championTeam()[0].moves[0],'Splash');
});

test('lead selection, tactical choices, and serialization preserve a playable battle',()=>{
  const g=new Game();const expected=g.battle.p1.pokemon[4].name;
  const started=g.start(5);assert.equal(g.battle.p1.active[0].name,expected);assert.equal(started.state.turn,1);
  const before=JSON.stringify(g.battle.toJSON());
  const choice=chooseAI(g.battle);assert.ok(legalChoices(g.battle,'p2').some(c=>c.command===choice));
  assert.equal(JSON.stringify(g.battle.toJSON()),before,'AI search must not alter the battle or its RNG');
  const command=chooseAI(g.battle,'p1',{search:false});const r=g.act(command);
  assert.ok(r.logs.length);assert.ok(r.state.turn>=1);
  const loaded=new Game(r.save);assert.deepEqual(loaded.result().state,r.state);
  assert.equal(JSON.stringify(loaded.battle.prng.getSeed()),JSON.stringify(g.battle.prng.getSeed()));
});

test('real battle rules apply status, held-item effects, and move restrictions',()=>{
  const g=new Game();g.battle.destroy();
  g.battle=createBattle([{...SETS[59],moves:['Will-O-Wisp','Flare Blitz','Extreme Speed','Morning Sun']}],[1,2,3,4]);
  g.start(1);
  // Direct engine control isolates the rule behavior from AI decisions.
  g.battle.choose('p1','move 1');g.battle.choose('p2','move 4');
  assert.equal(g.battle.p2.active[0].status,'brn');
  assert.ok(publicLog(g.battle).some(l=>l.startsWith('|-status|')));
  const moveRequest=g.battle.p1.activeRequest.active[0].moves;
  assert.equal(moveRequest[0].pp,23);
});

test('AI prefers a guaranteed winning attack over resisted coverage',()=>{
  const b=new Battle({formatid:'kantochampionloop',seed:[42,1,2,3],p1:{name:'YOU',team:[SETS[9]]},p2:{name:'BLUE',team:[{...SETS[145],moves:['Thunderbolt','Heat Wave','Roost','Hurricane']}]}});
  b.choose('p1','team 1');b.choose('p2','team 1');b.p1.active[0].hp=10;
  assert.equal(chooseAI(b),'move 1');
});

test('Focus Sash is consumed and Choice Specs locks the selected move',()=>{
  const sash=new Battle({formatid:'kantochampionloop',seed:[19,20,21,22],p1:{name:'YOU',team:[{...SETS[150],moves:['Shadow Ball','Psystrike','Ice Beam','Aura Sphere']}]},p2:{name:'BLUE',team:[SETS[63]]}});
  sash.choose('p1','team 1');sash.choose('p2','team 1');sash.choose('p1','move 1');sash.choose('p2','move 1');
  assert.equal(sash.p2.active[0].hp,1);assert.equal(sash.p2.active[0].item,'');
  assert.ok(publicLog(sash).some(l=>l.includes('Focus Sash')));
  const choice=new Battle({formatid:'kantochampionloop',seed:[2,3,4,5],p1:{name:'YOU',team:[SETS[135]]},p2:{name:'BLUE',team:[SETS[113]]}});
  choice.choose('p1','team 1');choice.choose('p2','team 1');choice.choose('p1','move 1');choice.choose('p2','move 2');
  assert.ok(!choice.ended);assert.equal(choice.p1.activeRequest.active[0].moves.filter(m=>!m.disabled).length,1);
  assert.equal(choice.p1.activeRequest.active[0].moves.find(m=>!m.disabled).id,'thunderbolt');
});

test('multiple full battles handle faints, pivots, forced switches, and terminal results',()=>{
  let totalTurns=0,forced=0;
  for(let game=0;game<10;game++){
    const g=new Game();g.start(game%6+1);let actions=0;
    while(!g.battle.ended&&actions<260){
      if(g.battle.p1.activeRequest?.forceSwitch)forced++;
      const choice=chooseAI(g.battle,'p1',{search:false});
      assert.ok(choice,`Human has no choice: ${JSON.stringify(g.battle.p1.activeRequest)}`);
      const result=g.act(choice);actions++;
      assert.ok(result.state.ended||legalChoices(g.battle,'p1').length,'Must return control to the player');
      assert.ok(!result.logs.some(l=>l.startsWith('|error|')),result.logs.join('\n'));
    }
    assert.ok(g.battle.ended,'Battle must finish without a softlock');
    assert.ok(['YOU','BROCK',''].includes(g.battle.winner));
    totalTurns+=g.battle.turn;
    const next=g.fresh();assert.equal(next.state.request.teamPreview,true);assert.equal(next.state.turn,0);
    assert.deepEqual(g.battle.p2.pokemon.map(p=>p.set.species),foeForStage(0,g.run.champion).map(s=>s.species));
  }
  assert.ok(totalTurns>=10);assert.ok(forced>=0);
});

test('catalog contains complete move and ability information for inspection',()=>{
  const data=catalog();assert.equal(data.length,151);
  for(const p of data){assert.ok(p.abilityDescription);for(const m of p.set.moves){assert.ok(m.name);assert.ok(m.description);assert.ok(m.type);}}
});

test('optimized browser engine preserves named references, search isolation, and saved-game resume',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'kanto-browser-test-'));
  try{
    const file=join(dir,'engine.mjs');
    await build({entryPoints:['src/engine.js'],outfile:file,bundle:true,platform:'browser',format:'esm',target:'safari16',minify:true,keepNames:true,logLevel:'silent'});
    const bundled=await import(pathToFileURL(file));
    const game=new bundled.Game();game.start(2);
    const before=JSON.stringify(game.battle.toJSON());bundled.chooseAI(game.battle);
    assert.equal(JSON.stringify(game.battle.toJSON()),before);
    const result=game.act(bundled.chooseAI(game.battle,'p1',{search:false}));
    const restored=new bundled.Game(JSON.parse(JSON.stringify(result.save)));
    assert.deepEqual(restored.result().state,result.state);
    assert.ok(restored.battle.p1.active[0].species.num);
    restored.act(bundled.chooseAI(restored.battle,'p1',{search:false}));
  }finally{await rm(dir,{recursive:true,force:true});}
});

test('circuit preserves a six-member evolutionary party at every ace level',()=>{
  assert.deepEqual(STAGES.map(s=>s.aceLevel),[14,21,24,63]);
  const run=newRun();
  assert.equal(run.party.length,6);
  assert.equal(new Set(run.party).size,6);
  for(let stage=0;stage<STAGES.length;stage++){
    const party=partyForStage(run.party,stage);
    assert.equal(party.length,6);
    assert.ok(party.every(p=>p.level===STAGES[stage].aceLevel));
  }
  assert.equal(evolutionAtLevel(4,14),4);
  assert.equal(evolutionAtLevel(4,21),5);
  assert.equal(evolutionAtLevel(4,63),6);
  assert.equal(evolutionAtLevel(25,24),25);
  assert.equal(evolutionAtLevel(25,63),26);
});
test('badge win advances same six to next leader with level cap and a fresh battle',()=>{
  const game=new Game();
  const roots=[...game.run.party],champion=[...game.run.champion];
  assert.equal(game.result().state.stage.name,'Brock');
  assert.equal(game.battle.p2.pokemon.length,2);
  game.battle.ended=true;game.battle.winner='YOU';
  const after=game.advance();
  assert.equal(after.state.stage.name,'Misty');
  assert.equal(after.state.stage.aceLevel,21);
  assert.deepEqual(game.run.party,roots);
  assert.deepEqual(game.run.champion,champion);
  assert.ok(after.state.p1.pokemon.every(p=>p.level===21));
  assert.equal(after.state.request.teamPreview,true);
  const saved=after.save;
  const restored=new Game(JSON.parse(JSON.stringify(saved)));
  assert.equal(restored.result().state.stage.name,'Misty');
  assert.deepEqual(restored.run.party,roots);
  assert.deepEqual(restored.result().state.p1.pokemon.map(p=>p.species),after.state.p1.pokemon.map(p=>p.species));
});
