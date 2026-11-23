// Pointer-based dragging works with mouse, pen, and iOS touch without HTML5 DnD.
export function enablePartyDrag({canDrag,onSwap,onSelect}){
  let drag=null,suppressUntil=0;
  const cleanup=()=>{
    drag?.ghost?.remove();document.querySelectorAll('.drag-source,.drop-target').forEach(el=>el.classList.remove('drag-source','drop-target'));
    document.body.classList.remove('party-dragging');drag=null;
  };
  document.addEventListener('pointerdown',e=>{
    const card=e.target.closest('[data-order-slot]');
    if(!card||!canDrag()||e.button!==0||e.target.closest('.party-info'))return;
    drag={source:+card.dataset.orderSlot,target:+card.dataset.orderSlot,pointer:e.pointerId,x:e.clientX,y:e.clientY,card,list:card.parentElement,active:false};
  });
  document.addEventListener('pointermove',e=>{
    if(!drag||drag.pointer!==e.pointerId)return;
    if(!drag.active&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>7){
      try{drag.card.setPointerCapture(e.pointerId);}catch{}
      drag.active=true;drag.card.classList.add('drag-source');document.body.classList.add('party-dragging');
      const rect=drag.card.getBoundingClientRect(),ghost=drag.card.cloneNode(true);
      ghost.classList.remove('drag-source');ghost.classList.add('party-drag-ghost');ghost.removeAttribute('data-order-slot');
      Object.assign(ghost.style,{width:`${Math.min(rect.width,230)}px`,height:`${Math.min(rect.height,100)}px`});
      document.body.append(ghost);drag.ghost=ghost;
    }
    if(!drag.active)return;
    e.preventDefault();Object.assign(drag.ghost.style,{left:`${e.clientX}px`,top:`${e.clientY}px`});
    const hit=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-order-slot]');
    document.querySelectorAll('.drop-target').forEach(el=>el.classList.remove('drop-target'));
    if(hit&&hit.parentElement===drag.list){drag.target=+hit.dataset.orderSlot;hit.classList.add('drop-target');}
    else drag.target=drag.source;
  },{passive:false});
  document.addEventListener('pointerup',e=>{
    if(!drag||drag.pointer!==e.pointerId)return;
    const {source,target,active}=drag;
    if(active){suppressUntil=performance.now()+500;cleanup();if(source!==target)onSwap(source,target);}
    else cleanup();
  });
  document.addEventListener('pointercancel',cleanup);
  window.addEventListener('blur',cleanup);
  document.addEventListener('click',e=>{
    if(performance.now()<suppressUntil&&e.target.closest('[data-order-slot]')){e.preventDefault();e.stopImmediatePropagation();}
  },true);
  document.addEventListener('keydown',e=>{
    const card=e.target.closest('[data-order-slot]');if(!card||!canDrag()||!e.altKey)return;
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;
    e.preventDefault();e.stopImmediatePropagation();
    const cards=[...card.parentElement.querySelectorAll('[data-order-slot]')],index=cards.indexOf(card),next=index+(['ArrowLeft','ArrowUp'].includes(e.key)?-1:1);
    if(cards[next])onSwap(+card.dataset.orderSlot,+cards[next].dataset.orderSlot);
  },true);
}
