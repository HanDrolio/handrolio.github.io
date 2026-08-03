/* COSM.OS — Electron/Ollama adapter
   Discovers installed Ollama models, defaults to the largest installed Qwen,
   and exposes a manual selector. Generation remains inside Electron's main process. */

(() => {
  if (!window.COSMOS_DESKTOP) return;

  const MODEL_MODE_KEY = 'cosmos_desktop_model_mode_v2';
  const listeners = new Set();

  let modelId = null;
  let models = [];
  let selection = localStorage.getItem(MODEL_MODE_KEY) || 'auto';
  let loadPromise = null;
  let status = {
    phase: 'idle',
    progress: 0,
    text: 'checking Ollama…',
    modelId: null,
    models: [],
    selection,
    error: null
  };

  function snapshot() {
    return {
      ...status,
      models: [...models]
    };
  }

  function publish(patch) {
    status = { ...status, ...patch, models: [...models], selection, modelId };
    listeners.forEach(listener => {
      try { listener(snapshot()); } catch (error) { console.error(error); }
    });
  }

  function subscribe(listener) {
    listeners.add(listener);
    listener(snapshot());
    return () => listeners.delete(listener);
  }

  function isQwen(name = '') {
    return /(?:^|[/:_-])qwen/i.test(name) || /^qwen/i.test(name);
  }

  function chooseAutoModel(items) {
    const candidates = items.filter(model => isQwen(model.name));
    const pool = candidates.length ? candidates : items;
    return [...pool]
      .sort((a, b) => (b.size || 0) - (a.size || 0) || a.name.localeCompare(b.name))[0]?.name || null;
  }

  function resolveSelection() {
    if (selection !== 'auto' && models.some(model => model.name === selection)) {
      return selection;
    }
    selection = 'auto';
    localStorage.setItem(MODEL_MODE_KEY, selection);
    return chooseAutoModel(models);
  }

  async function refreshModels() {
    publish({ phase: 'loading', progress: 0.2, text: 'scanning Ollama models…', error: null });
    const result = await window.COSMOS_DESKTOP.status();

    if (!result.ok) throw new Error(result.error || 'Ollama is not running.');
    models = Array.isArray(result.models) ? result.models : [];
    if (!models.length) throw new Error('Ollama is running, but no local models are installed.');

    modelId = resolveSelection();
    publish({
      phase: 'ready',
      progress: 1,
      text: selection === 'auto' ? 'auto-selected largest installed Qwen' : 'selected local model',
      error: null
    });
    return modelId;
  }

  async function load() {
    if (modelId && models.length) return modelId;
    if (loadPromise) return loadPromise;

    loadPromise = refreshModels().catch(error => {
      modelId = null;
      models = [];
      publish({
        phase: 'error',
        progress: 0,
        text: 'Ollama unavailable · deterministic mode active',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }).finally(() => {
      loadPromise = null;
    });

    return loadPromise;
  }

  async function setModel(value) {
    const requested = String(value || 'auto');
    if (requested !== 'auto' && !models.some(model => model.name === requested)) {
      throw new Error('That Ollama model is not installed.');
    }

    selection = requested;
    localStorage.setItem(MODEL_MODE_KEY, selection);
    modelId = resolveSelection();
    publish({
      phase: 'ready',
      progress: 1,
      text: selection === 'auto' ? 'auto-selected largest installed Qwen' : 'selected local model',
      error: null
    });
    return modelId;
  }

  async function complete(messages, onUpdate) {
    if (!modelId) await load();
    publish({ phase: 'ready', text: `thinking with ${modelId}`, error: null });

    try {
      const result = await window.COSMOS_DESKTOP.chat({
        model: modelId,
        messages,
        temperature: 0.7,
        topP: 0.92,
        maxTokens: 220
      });
      const text = String(result.text || '').trim();
      if (onUpdate) onUpdate(text);
      publish({ phase: 'ready', text: 'desktop Ollama ready', error: null });
      return text;
    } catch (error) {
      publish({
        phase: 'error',
        text: 'generation failed · deterministic mode active',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  window.COSMOS_AI = {
    load,
    complete,
    isReady: () => Boolean(modelId),
    subscribe,
    supportsWebGPU: () => false,
    getStatus: snapshot,
    getModel: () => modelId,
    getModels: () => [...models],
    getSelection: () => selection,
    setModel,
    refreshModels
  };

  load().catch(() => {});
})();
