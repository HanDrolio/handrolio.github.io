import {Game,catalog} from './engine.js';
let game;
self.onmessage=({data})=>{
  const {id,type,...input}=data;
  try{
    let result;
    if(type==='boot'){
      game?.battle.destroy();game=new Game();
      result={...game.result(),catalog:catalog(),restored:false};
    }else if(type==='resume'){
      const resumed=new Game(input.saved);
      if(resumed.battle.ended||resumed.battle.requestState==='teampreview'){
        resumed.battle.destroy();throw new Error('No unfinished battle to resume.');
      }
      game?.battle.destroy();game=resumed;
      result={...game.result(),restored:true};
    }else if(type==='new')result=game.fresh();
    else if(type==='advance')result=game.advance();
    else if(type==='start')result=game.start(input.lead,input.order);
    else if(type==='act')result=game.act(input.command);
    self.postMessage({id,result});
  }catch(error){self.postMessage({id,error:error.message});}
};
