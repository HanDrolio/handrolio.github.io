/* COSM.OS — optional local model layer
   Loads WebLLM only when the operator asks. The deterministic router remains
   available as an instant fallback when WebGPU or the model is unavailable. */

(() => {
  if (window.COSMOS_AI) return;

  const scriptURL = document.currentScript?.src || new URL('./js/webllm.js', location.href).href;
  const workerURL = new URL('./webllm-worker.js', scriptURL);
  const MODULE_URL = 'https://esm.run/@mlc-ai/web-llm@0.2.84';
  const MODEL_PREFERENCES = [
    'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
    'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    'Qwen3-0.6B-q4f16_1-MLC',
    'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
    'Qwen2-0.5B-Instruct-q4f16_1-MLC'
  ];

  const listeners = new Set();
  let engine = null;
  let worker = null;
  let modelId = null;
  let loadPromise = null;
  let status = {
    phase: 'idle',
    progress: 0,
    text: 'deterministic fallback',
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

  function supportsWebGPU() {
    return window.isSecureContext && 'gpu' in navigator;
  }

  function requiredFeaturesSupported(record, adapter) {
    return (record.required_features || []).every(feature => adapter.features.has(feature));
  }

  function modelRank(record) {
    const id = record.model_id || '';
    const preferredIndex = MODEL_PREFERENCES.indexOf(id);
    if (preferredIndex !== -1) return preferredIndex;

    const vram = Number.isFinite(record.vram_required_MB) ? record.vram_required_MB : 99999;
    const quantPenalty = /q4f16/i.test(id) ? 10 : /q4f32/i.test(id) ? 20 : 100;
    return 1000 + quantPenalty + vram;
  }

  function selectModels(webllm, adapter) {
    const records = webllm.prebuiltAppConfig.model_list
      .filter(record => requiredFeaturesSupported(record, adapter))
      .filter(record => !/(vision|vlm|embedding|coder|math)/i.test(record.model_id || ''));

    const preferred = records
      .filter(record => MODEL_PREFERENCES.includes(record.model_id))
      .sort((a, b) => modelRank(a) - modelRank(b));

    if (preferred.length) return preferred.map(record => record.model_id);

    const instruct = records
      .filter(record => /instruct|chat/i.test(record.model_id || ''))
      .sort((a, b) => modelRank(a) - modelRank(b));

    if (!instruct[0]) throw new Error('No compatible low-resource chat model was found for this browser.');
    return [instruct[0].model_id];
  }

  function resetWorker() {
    engine = null;
    if (worker) worker.terminate();
    worker = null;
  }

  async function load() {
    if (engine) return modelId;
    if (loadPromise) return loadPromise;

    loadPromise = (async () => {
      if (!supportsWebGPU()) {
        publish({ phase: 'unsupported', text: 'WebGPU unavailable', error: 'This browser cannot run WebLLM.' });
        throw new Error('WebGPU is unavailable. Use a current browser on a supported device.');
      }

      publish({ phase: 'loading', progress: 0, text: 'loading WebLLM…', error: null });
      const webllm = await import(MODULE_URL);
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) throw new Error('No WebGPU adapter is available.');

      const candidates = selectModels(webllm, adapter);
      let lastError = null;

      for (let index = 0; index < candidates.length; index += 1) {
        modelId = candidates[index];
        publish({
          phase: 'loading',
          progress: 0,
          text: index === 0 ? `preparing ${modelId}…` : `trying lighter fallback ${modelId}…`,
          modelId,
          error: lastError ? (lastError instanceof Error ? lastError.message : String(lastError)) : null
        });

        resetWorker();
        worker = new Worker(workerURL, { type: 'module' });

        try {
          engine = await webllm.CreateWebWorkerMLCEngine(worker, modelId, {
            appConfig: { ...webllm.prebuiltAppConfig, cacheBackend: 'cache' },
            initProgressCallback: report => {
              const progress = Number.isFinite(report.progress) ? report.progress : 0;
              publish({
                phase: 'loading',
                progress,
                text: report.text || `loading model ${Math.round(progress * 100)}%`,
                modelId,
                error: null
              });
            }
          });

          publish({ phase: 'ready', progress: 1, text: 'local ai ready', modelId, error: null });
          return modelId;
        } catch (error) {
          lastError = error;
          resetWorker();
        }
      }

      throw lastError || new Error('No local model could be loaded.');
    })().catch(error => {
      resetWorker();
      publish({
        phase: supportsWebGPU() ? 'error' : 'unsupported',
        text: 'local ai failed',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }).finally(() => {
      loadPromise = null;
    });

    return loadPromise;
  }

  async function complete(messages, onUpdate) {
    if (!engine) throw new Error('The local model is not loaded.');

    try {
      let text = '';
      const stream = await engine.chat.completions.create({
        messages,
        stream: true,
        stream_options: { include_usage: false },
        temperature: 0.72,
        top_p: 0.9,
        max_tokens: 220,
        enable_thinking: false
      });

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || '';
        if (!delta) continue;
        text += delta;
        if (onUpdate) onUpdate(text);
      }

      const finalText = await engine.getMessage();
      return (finalText || text).trim();
    } catch (error) {
      resetWorker();
      publish({
        phase: 'error',
        text: 'generation failed',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  function isReady() {
    return Boolean(engine);
  }

  window.COSMOS_AI = { load, complete, isReady, subscribe, supportsWebGPU, getStatus: snapshot };
})();
