export function validOrder(order,slots) {
  return Array.isArray(order)&&order.length===slots.length&&new Set(order).size===slots.length&&order.every(slot=>Number.isInteger(slot)&&slots.includes(slot));
}

export function swapSlots(order,source,target) {
  const next=[...order],a=next.indexOf(source),b=next.indexOf(target);
  if(a<0||b<0)return next;
  [next[a],next[b]]=[next[b],next[a]];
  return next;
}
