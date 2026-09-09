export function createStore(initialState) {
  let state = structuredClone(initialState);
  const listeners = new Set();

  function getState() {
    return state;
  }

  function setState(next) {
    state = typeof next === 'function' ? next(state) : next;
    listeners.forEach(listener => listener(state));
    return state;
  }

  function patch(patchObject) {
    return setState(current => ({ ...current, ...patchObject }));
  }

  function subscribe(listener, { immediate = false } = {}) {
    listeners.add(listener);
    if (immediate) listener(state);
    return () => listeners.delete(listener);
  }

  return { getState, setState, patch, subscribe };
}
