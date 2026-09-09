const MODULE_URL = 'https://esm.run/@mlc-ai/web-llm@0.2.84';
const META_KEY = 'cosmos_webllm_meta_v2';

const DESKTOP_PREFERENCES = [
  'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
  'Llama-3.2-1B-Instruct-q4f16_1-MLC',
  'Qwen3-0.6B-q4f16_1-MLC',
  'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
  'Qwen2-0.5B-Instruct-q4f16_1-MLC'
];

const MOBILE_PREFERENCES = [
  'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
  'Qwen2-0.5B-Instruct-q4f16_1-MLC',
  'Qwen3-0.6B-q4f16_1-MLC'
];

function isAppleMobile() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function readMeta() {
  try {
    const raw = localStorage.getItem(META_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeMeta(meta) {
  try { localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch {}
}

function clearMeta() {
  try { localStorage.removeItem(META_KEY); } catch {}
}

function featureCompatible(record, adapter) {
  return (record.required_features || []).every(feature => adapter.features.has(feature));
}

function vramMB(record) {
  const value = Number(record.vram_required_MB);
  return Number.isFinite(value) ? value : Infinity;
}

function chooseCandidates(webllm, adapter, rememberedModelId = null) {
  const mobile = isAppleMobile();
  const preference = mobile ? MOBILE_PREFERENCES : DESKTOP_PREFERENCES;
  const maxMobileVRAM = 900;

  const records = webllm.prebuiltAppConfig.model_list
    .filter(record => featureCompatible(record, adapter))
    .filter(record => !/(vision|vlm|embedding|coder|math)/i.test(record.model_id || ''))
    .filter(record => !mobile || vramMB(record) <= maxMobileVRAM);

  const available = new Map(records.map(record => [record.model_id, record]));
  const ordered = [];

  if (rememberedModelId && available.has(rememberedModelId)) ordered.push(rememberedModelId);
  for (const id of preference) if (available.has(id) && !ordered.includes(id)) ordered.push(id);

  if (!ordered.length) {
    const fallback = records
      .filter(record => /instruct|chat/i.test(record.model_id || ''))
      .sort((a, b) => vramMB(a) - vramMB(b))[0];
    if (fallback) ordered.push(fallback.model_id);
  }

  if (!ordered.length) throw new Error('No compatible low-resource chat model was found for this device.');
  return ordered;
}

export function createAIService() {
  const listeners = new Set();
  let engine = null;
  let modelId = null;
  let loadPromise = null;
  let status = {
    phase: 'idle',
    progress: 0,
    text: 'deterministic mode',
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

  function subscribe(listener, { immediate = true } = {}) {
    listeners.add(listener);
    if (immediate) listener(snapshot());
    return () => listeners.delete(listener);
  }

  function supported() {
    return window.isSecureContext && 'gpu' in navigator;
  }

  function bootstrap() {
    if (!supported()) {
      publish({ phase: 'unsupported', text: 'WebGPU unavailable', error: 'This browser cannot run WebLLM.' });
      return;
    }

    const meta = readMeta();
    if (meta?.state === 'ready' && meta.modelId) {
      publish({ phase: 'cached', text: 'local model cached · tap restore', modelId: meta.modelId, error: null });
    } else if (meta?.state === 'loading' && meta.modelId) {
      publish({ phase: 'interrupted', text: 'previous model load was interrupted · retry safe model', modelId: meta.modelId, error: null });
    } else {
      publish({ phase: 'idle', text: 'deterministic mode · no local model active', modelId: null, error: null });
    }
  }

  async function unload() {
    const active = engine;
    engine = null;
    modelId = null;
    if (active?.unload) {
      try { await active.unload(); } catch {}
    }
  }

  async function load() {
    if (engine) return modelId;
    if (loadPromise) return loadPromise;
    if (!supported()) throw new Error('WebGPU is unavailable on this browser.');

    loadPromise = (async () => {
      const webllm = await import(MODULE_URL);
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) throw new Error('No WebGPU adapter is available.');

      const meta = readMeta();
      const remembered = meta?.state === 'ready' ? meta.modelId : null;
      const candidates = chooseCandidates(webllm, adapter, remembered);
      let lastError = null;

      for (const candidate of candidates) {
        modelId = candidate;
        writeMeta({ state: 'loading', modelId: candidate, startedAt: Date.now() });
        publish({ phase: 'loading', progress: 0, text: `preparing ${candidate}…`, modelId: candidate, error: null });

        try {
          engine = await webllm.CreateMLCEngine(candidate, {
            appConfig: { ...webllm.prebuiltAppConfig, cacheBackend: 'cache' },
            initProgressCallback: report => {
              const progress = Number.isFinite(report.progress) ? report.progress : 0;
              publish({
                phase: 'loading',
                progress,
                text: report.text || `loading local model ${Math.round(progress * 100)}%`,
                modelId: candidate,
                error: null
              });
            }
          });

          writeMeta({ state: 'ready', modelId: candidate, readyAt: Date.now() });
          publish({ phase: 'ready', progress: 1, text: 'local ai ready', modelId: candidate, error: null });
          return candidate;
        } catch (error) {
          lastError = error;
          engine = null;
          publish({
            phase: 'loading',
            progress: 0,
            text: 'trying a lighter compatible model…',
            modelId: candidate,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      clearMeta();
      throw lastError || new Error('No local model could be initialized.');
    })().catch(error => {
      engine = null;
      publish({
        phase: 'error',
        progress: 0,
        text: 'local ai failed · deterministic mode active',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }).finally(() => {
      loadPromise = null;
    });

    return loadPromise;
  }

  async function complete(messages, onUpdate) {
    if (!engine) throw new Error('The local model is not active.');

    try {
      let text = '';
      const stream = await engine.chat.completions.create({
        messages,
        stream: true,
        temperature: 0.72,
        top_p: 0.9,
        max_tokens: 220
      });

      for await (const chunk of stream) {
        const delta = chunk.choices?.[0]?.delta?.content || '';
        if (!delta) continue;
        text += delta;
        onUpdate?.(text);
      }

      return text.trim();
    } catch (error) {
      await unload();
      publish({
        phase: 'error',
        text: 'generation failed · deterministic mode active',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  function isReady() {
    return Boolean(engine);
  }

  function forget() {
    clearMeta();
    publish({ phase: 'idle', progress: 0, text: 'deterministic mode · no local model active', modelId: null, error: null });
  }

  return {
    bootstrap,
    load,
    unload,
    complete,
    subscribe,
    supported,
    isReady,
    forget,
    getStatus: snapshot,
    device: { appleMobile: isAppleMobile() }
  };
}
