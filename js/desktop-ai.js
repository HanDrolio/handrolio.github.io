/* COSM.OS — Electron/Ollama adapter
   Implements the same window.COSMOS_AI interface used by the browser WebLLM
   layer, while keeping Ollama access inside Electron's main process. */

(() => {
  if (!window.COSMOS_DESKTOP) return;

  const MODEL_KEY = 'cosmos_desktop_model';
  const listeners = new Set();
  let modelId = null;
  let loadPromise = null;
  let status = {
    phase: 'idle',
    progress: 0,
    text: 'checking Ollama…',
    modelId: null,
    error: null
  };

  function snapshot() {
    return { ...status };
  }

  function publish(patch) {
    status = { ...status, ...patch };
    listeners.forEach(listener => {
      try { listener(snapshot()); } catch (error) { console.error(error); }
    });
  }

  function subscribe(listener) {
    listeners.add(listener);
    listener(snapshot());
    return () => listeners.delete(listener);
  }

  function chooseModel(models) {
    const saved = localStorage.getItem(MODEL_KEY);
    if (saved && models.some(model => model.name === saved)) return saved;

    const preferred = models.find(model => /qwen/i.test(model.name)) || models[0];
    return preferred?.name || null;
  }

  async function load() {
    if (modelId) return modelId;
    if (loadPromise) return loadPromise;

    loadPromise = (async () => {
      publish({ phase: 'loading', progress: 0.2, text: 'connecting to Ollama…', error: null });
      const result = await window.COSMOS_DESKTOP.status();

      if (!result.ok) {
        throw new Error(result.error || 'Ollama is not running.');
      }

      if (!result.models.length) {
        throw new Error('Ollama is running, but no local models are installed.');
      }

      modelId = chooseModel(result.models);
      localStorage.setItem(MODEL_KEY, modelId);
      publish({
        phase: 'ready',
        progress: 1,
        text: 'desktop Ollama ready',
        modelId,
        error: null
      });
      return modelId;
    })().catch(error => {
      modelId = null;
      publish({
        phase: 'error',
        progress: 0,
        text: 'Ollama unavailable · deterministic mode active',
        modelId: null,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }).finally(() => {
      loadPromise = null;
    });

    return loadPromise;
  }

  async function complete(messages, onUpdate) {
    if (!modelId) await load();

    publish({ phase: 'ready', text: `thinking with ${modelId}`, modelId, error: null });

    try {
      const result = await window.COSMOS_DESKTOP.chat({
        model: modelId,
        messages,
        temperature: 0.72,
        topP: 0.9,
        maxTokens: 220
      });

      const text = String(result.text || '').trim();
      if (onUpdate) onUpdate(text);
      publish({ phase: 'ready', text: 'desktop Ollama ready', modelId, error: null });
      return text;
    } catch (error) {
      publish({
        phase: 'error',
        text: 'generation failed · deterministic mode active',
        modelId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  function isReady() {
    return Boolean(modelId);
  }

  function supportsWebGPU() {
    return false;
  }

  window.COSMOS_AI = {
    load,
    complete,
    isReady,
    subscribe,
    supportsWebGPU,
    getStatus: snapshot,
    getModel: () => modelId
  };

  load().catch(() => {});
})();
