import { createStore } from './store.js';
import { createStorage } from './storage.js';
import { createAIService } from './ai.js';
import { createUI } from './ui.js';
import { route } from './router.js';
import { buildModelMessages } from './prompts.js';
import { detectThreads, makeEntryId, migrateEntries } from './threads.js';
import { getPersona, isPersona } from './registry.js';

const storage = createStorage();
const initialState = storage.load();
if (initialState.lock && !isPersona(initialState.lock)) initialState.lock = null;
if (migrateEntries(initialState.entries)) storage.save(initialState);

const store = createStore(initialState);
const ai = createAIService();
let generating = false;

function persist() {
  storage.save(store.getState());
}

function updateState(updater, { save = false } = {}) {
  const next = store.setState(updater);
  if (save) storage.save(next);
  return next;
}

function setGenerating(value) {
  generating = Boolean(value);
  ui.setGenerating(generating);
  ui.render(store.getState());
}

function makeMessage(role, text, extra = {}) {
  return {
    id: `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    role,
    text,
    ts: Date.now(),
    ...extra
  };
}

async function deterministicReply(result) {
  await new Promise(resolve => setTimeout(resolve, 180));
  return result.text;
}

async function sendChat(text) {
  const userMessage = makeMessage('you', text);
  updateState(state => ({ ...state, messages: [...state.messages, userMessage] }), { save: true });

  const stateAfterUser = store.getState();
  const result = route(text, stateAfterUser.lock);

  if (result.override || !ai.isReady()) {
    const reply = await deterministicReply(result);
    updateState(state => ({
      ...state,
      messages: [...state.messages, makeMessage('os', reply, { persona: result.persona })]
    }), { save: true });
    ui.flash(getPersona(result.persona).color);
    return;
  }

  const request = buildModelMessages({
    state: stateAfterUser,
    text,
    personaId: result.persona,
    surface: 'chat'
  });

  const placeholder = makeMessage('os', 'thinking locally…', {
    persona: result.persona,
    generating: true
  });

  updateState(state => ({ ...state, messages: [...state.messages, placeholder] }));
  setGenerating(true);

  let pendingPartial = '';
  let frame = null;

  const paintPartial = partial => {
    pendingPartial = partial;
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = null;
      updateState(state => ({
        ...state,
        messages: state.messages.map(message =>
          message.id === placeholder.id ? { ...message, text: pendingPartial || 'thinking locally…' } : message
        )
      }));
    });
  };

  try {
    const finalText = await ai.complete(request, paintPartial);
    updateState(state => ({
      ...state,
      messages: state.messages.map(message =>
        message.id === placeholder.id
          ? { ...message, text: finalText || result.text, generating: false }
          : message
      )
    }), { save: true });
  } catch (error) {
    console.error('Local chat generation failed', error);
    updateState(state => ({
      ...state,
      messages: state.messages.map(message =>
        message.id === placeholder.id
          ? { ...message, text: result.text, generating: false }
          : message
      )
    }), { save: true });
  } finally {
    if (frame) cancelAnimationFrame(frame);
    setGenerating(false);
    ui.flash(getPersona(result.persona).color);
    ui.refs.input.focus();
  }
}

async function sendEntry(text) {
  const stateBefore = store.getState();
  const result = route(text, stateBefore.lock);
  const shouldGenerate = !result.override && ai.isReady();
  const ts = Date.now();

  const entry = {
    id: makeEntryId(ts),
    text,
    ts,
    persona: result.persona,
    reply: shouldGenerate ? 'thinking locally…' : result.text,
    threadIds: detectThreads(text, stateBefore.entries)
  };

  updateState(state => ({ ...state, entries: [entry, ...state.entries] }), { save: true });
  ui.flash(getPersona(result.persona).color);

  if (!shouldGenerate) return;

  const request = buildModelMessages({
    state: store.getState(),
    text,
    personaId: result.persona,
    surface: 'log'
  });

  setGenerating(true);
  try {
    const finalText = await ai.complete(request);
    updateState(state => ({
      ...state,
      entries: state.entries.map(item => item.id === entry.id ? { ...item, reply: finalText || result.text } : item)
    }), { save: true });
  } catch (error) {
    console.error('Local log generation failed', error);
    updateState(state => ({
      ...state,
      entries: state.entries.map(item => item.id === entry.id ? { ...item, reply: result.text } : item)
    }), { save: true });
  } finally {
    setGenerating(false);
    ui.flash(getPersona(result.persona).color);
    ui.refs.input.focus();
  }
}

async function submit(text) {
  if (generating) return;
  const state = store.getState();
  return state.mode === 'chat' ? sendChat(text) : sendEntry(text);
}

function setMode(mode) {
  if (generating || !['chat', 'log'].includes(mode)) return;
  updateState(state => ({ ...state, mode }), { save: true });
}

function toggleLock(id) {
  if (!isPersona(id)) return;
  updateState(state => ({ ...state, lock: state.lock === id ? null : id }), { save: true });
  ui.refs.input.focus();
}

function deleteEntry(id) {
  updateState(state => ({ ...state, entries: state.entries.filter(entry => entry.id !== id) }), { save: true });
}

async function loadModel() {
  try {
    await ai.load();
  } catch (error) {
    console.error('Local model load failed', error);
  }
}

function exportAll() {
  const blob = new Blob([storage.exportState(store.getState())], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `cosmos-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 0);
}

async function importAll(file) {
  try {
    const raw = await file.text();
    const next = storage.importState(raw);
    if (next.lock && !isPersona(next.lock)) next.lock = null;
    migrateEntries(next.entries);
    store.setState(next);
    storage.save(next);
  } catch (error) {
    console.error(error);
    alert("That file isn't a COSM.OS backup.");
  }
}

const ui = createUI({
  onSubmit: submit,
  onMode: setMode,
  onToggleLock: toggleLock,
  onDeleteEntry: deleteEntry,
  onLoadModel: loadModel,
  onExport: exportAll,
  onImport: importAll
});

store.subscribe(state => ui.render(state), { immediate: true });
ai.subscribe(ui.paintModelStatus);
ai.bootstrap();

if (navigator.storage?.persist) {
  navigator.storage.persist().catch(() => {});
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    const hadController = Boolean(navigator.serviceWorker.controller);
    let reloading = false;

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController || reloading) return;
      reloading = true;
      window.location.reload();
    });

    try {
      const registration = await navigator.serviceWorker.register('./sw.js', {
        updateViaCache: 'none'
      });

      registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
      await registration.update().catch(() => {});

      const checkForUpdate = () => registration.update().catch(() => {});
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') checkForUpdate();
      });
    } catch (error) {
      console.warn('COSM.OS service worker registration failed', error);
    }
  });
}

window.COSMOS_DEBUG = {
  version: '2.0-modular',
  state: () => structuredClone(store.getState()),
  ai: () => ai.getStatus(),
  device: ai.device,
  async storage() {
    return navigator.storage?.estimate ? navigator.storage.estimate() : null;
  },
  persist
};
