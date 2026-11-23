// One acknowledgement per narrated battle beat. No auto-advance timers.
// Isolated from the DOM so it can be tested without a browser.
export function createDialogueGate({onWait=()=>{},onAdvance=()=>{}}={}){
  let resolve=null;
  return {
    get waiting(){return resolve!==null;},
    wait(){
      if(resolve)throw new Error('Dialogue gate is already waiting.');
      return new Promise(done=>{resolve=done;onWait();});
    },
    advance(){
      if(!resolve)return false;
      const done=resolve;resolve=null;
      onAdvance();
      done();
      return true;
    },
    cancel(){return this.advance();}
  };
}
