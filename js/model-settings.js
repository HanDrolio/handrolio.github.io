/* COSM.OS — local model tuning + presets
   Stores generation settings and custom presets in localStorage. */

(() => {
  const SETTINGS_KEY = 'cosmos_model_tuning_v1';
  const PRESETS_KEY = 'cosmos_model_presets_v1';
  const ACTIVE_KEY = 'cosmos_model_active_preset_v1';

  const DEFAULT_RESONANCE = `Before answering, silently remove anything that sounds like a textbook, therapist script, corporate support language, generic advice, or commentary about responding. Respond to this exact moment with natural language, concrete detail, and emotional honesty. Prefer one vivid observation over a lecture. Do not force wisdom, productivity, or a question. If the reply could come from any generic chatbot, rewrite it until it fits this persona and this exact conversation.`;

  const BASE = {
    temperature: 0.76,
    topP: 0.94,
    repeatPenalty: 1.08,
    maxTokens: 260,
    numCtx: 4096,
    contextTurns: 4,
    starterCount: 3,
    exampleCount: 2,
    maxWords: 130,
    resonance: true,
    resonancePrompt: DEFAULT_RESONANCE
  };

  const BUILT_INS = {
    balanced: {
      name: 'Balanced conversation',
      settings: { ...BASE }
    },
    ripple: {
      name: 'Ripple calm',
      settings: {
        ...BASE,
        temperature: 0.62,
        topP: 0.88,
        repeatPenalty: 1.12,
        maxTokens: 160,
        contextTurns: 3,
        starterCount: 2,
        exampleCount: 1,
        maxWords: 70
      }
    },
    precise: {
      name: 'Orion precise',
      settings: {
        ...BASE,
        temperature: 0.44,
        topP: 0.82,
        repeatPenalty: 1.12,
        maxTokens: 180,
        contextTurns: 4,
        starterCount: 2,
        exampleCount: 2,
        maxWords: 100
      }
    },
    kablow: {
      name: 'KABLOW creative',
      settings: {
        ...BASE,
        temperature: 1.02,
        topP: 0.98,
        repeatPenalty: 1.03,
        maxTokens: 340,
        contextTurns: 4,
        starterCount: 3,
        exampleCount: 2,
        maxWords: 170
      }
    },
    deep: {
      name: 'Deep conversation',
      settings: {
        ...BASE,
        temperature: 0.8,
        topP: 0.95,
        repeatPenalty: 1.08,
        maxTokens: 460,
        numCtx: 8192,
        contextTurns: 7,
        starterCount: 3,
        exampleCount: 3,
        maxWords: 210
      }
    }
  };

  const listeners = new Set();
  let customPresets = loadJson(PRESETS_KEY, {});
  let activePreset = localStorage.getItem(ACTIVE_KEY) || 'balanced';
  let settings = normalize(loadJson(SETTINGS_KEY, BUILT_INS.balanced.settings));

  function loadJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function clamp(value, min, max, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
  }

  function normalize(value = {}) {
    return {
      temperature: clamp(value.temperature, 0, 1.5, BASE.temperature),
      topP: clamp(value.topP, 0.05, 1, BASE.topP),
      repeatPenalty: clamp(value.repeatPenalty, 0.8, 1.5, BASE.repeatPenalty),
      maxTokens: Math.round(clamp(value.maxTokens, 64, 768, BASE.maxTokens)),
      numCtx: [2048, 4096, 8192, 16384].includes(Number(value.numCtx)) ? Number(value.numCtx) : BASE.numCtx,
      contextTurns: Math.round(clamp(value.contextTurns, 0, 10, BASE.contextTurns)),
      starterCount: Math.round(clamp(value.starterCount, 1, 5, BASE.starterCount)),
      exampleCount: Math.round(clamp(value.exampleCount, 0, 4, BASE.exampleCount)),
      maxWords: Math.round(clamp(value.maxWords, 20, 240, BASE.maxWords)),
      resonance: value.resonance !== false,
      resonancePrompt: String(value.resonancePrompt || DEFAULT_RESONANCE).trim().slice(0, 1600)
    };
  }

  function persist() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    localStorage.setItem(PRESETS_KEY, JSON.stringify(customPresets));
    localStorage.setItem(ACTIVE_KEY, activePreset);
  }

  function publish() {
    const snapshot = get();
    listeners.forEach(listener => {
      try { listener(snapshot); } catch (error) { console.error(error); }
    });
  }

  function get() {
    return { ...settings };
  }

  function update(patch, markCustom = true) {
    settings = normalize({ ...settings, ...patch });
    if (markCustom) activePreset = 'custom-current';
    persist();
    syncUi();
    publish();
    return get();
  }

  function presetMap() {
    return {
      ...Object.fromEntries(Object.entries(BUILT_INS).map(([id, preset]) => [id, { ...preset, builtIn: true }])),
      ...Object.fromEntries(Object.entries(customPresets).map(([id, preset]) => [id, { ...preset, builtIn: false }]))
    };
  }

  function applyPreset(id) {
    const preset = presetMap()[id];
    if (!preset) return false;
    settings = normalize(preset.settings);
    activePreset = id;
    persist();
    syncUi();
    publish();
    return true;
  }

  function slug(value) {
    return String(value || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) || `preset-${Date.now()}`;
  }

  function savePreset(name) {
    const clean = String(name || '').trim().slice(0, 48);
    if (!clean) return null;
    let id = `custom-${slug(clean)}`;
    if (customPresets[id] && customPresets[id].name !== clean) id = `${id}-${Date.now().toString(36)}`;
    customPresets[id] = { name: clean, settings: get() };
    activePreset = id;
    persist();
    syncUi();
    return id;
  }

  function deletePreset(id) {
    if (!customPresets[id]) return false;
    delete customPresets[id];
    activePreset = 'custom-current';
    persist();
    syncUi();
    return true;
  }

  function subscribe(listener) {
    listeners.add(listener);
    listener(get());
    return () => listeners.delete(listener);
  }

  function allPresets() {
    return presetMap();
  }

  const fieldIds = {
    temperature: 'tuneTemperature',
    topP: 'tuneTopP',
    repeatPenalty: 'tuneRepeatPenalty',
    maxTokens: 'tuneMaxTokens',
    numCtx: 'tuneNumCtx',
    contextTurns: 'tuneContextTurns',
    starterCount: 'tuneStarterCount',
    exampleCount: 'tuneExampleCount',
    maxWords: 'tuneMaxWords',
    resonance: 'tuneResonance',
    resonancePrompt: 'tuneResonancePrompt'
  };

  function formatValue(key, value) {
    if (key === 'temperature' || key === 'topP' || key === 'repeatPenalty') return Number(value).toFixed(2);
    return String(value);
  }

  function renderPresetOptions() {
    const select = document.querySelector('#tunePreset');
    if (!select) return;
    const presets = allPresets();
    const built = Object.entries(presets).filter(([, preset]) => preset.builtIn);
    const custom = Object.entries(presets).filter(([, preset]) => !preset.builtIn);

    select.innerHTML = `
      <option value="custom-current">custom · unsaved</option>
      <optgroup label="built in">
        ${built.map(([id, preset]) => `<option value="${id}">${escapeHtml(preset.name)}</option>`).join('')}
      </optgroup>
      ${custom.length ? `<optgroup label="saved presets">${custom.map(([id, preset]) => `<option value="${id}">${escapeHtml(preset.name)}</option>`).join('')}</optgroup>` : ''}`;
    select.value = presets[activePreset] ? activePreset : 'custom-current';

    const deleteButton = document.querySelector('#tuneDeletePreset');
    if (deleteButton) deleteButton.disabled = !customPresets[select.value];
  }

  function escapeHtml(value) {
    const node = document.createElement('div');
    node.textContent = value;
    return node.innerHTML;
  }

  function syncUi() {
    renderPresetOptions();
    Object.entries(fieldIds).forEach(([key, id]) => {
      const input = document.getElementById(id);
      if (!input) return;
      if (input.type === 'checkbox') input.checked = Boolean(settings[key]);
      else input.value = settings[key];

      const output = document.querySelector(`[data-value-for="${key}"]`);
      if (output) output.textContent = formatValue(key, settings[key]);
    });

    const status = document.querySelector('#tuneStatus');
    if (status) {
      const preset = allPresets()[activePreset];
      status.textContent = preset ? `active · ${preset.name}` : 'active · custom settings';
    }
  }

  function open() {
    const dialog = document.querySelector('#modelSettingsDialog');
    if (!dialog) return;
    syncUi();
    if (!dialog.open) dialog.showModal();
  }

  function close() {
    const dialog = document.querySelector('#modelSettingsDialog');
    if (dialog?.open) dialog.close();
  }

  function mount() {
    const dialog = document.querySelector('#modelSettingsDialog');
    const openButton = document.querySelector('#modelTune');
    if (!dialog || !openButton) return;

    openButton.addEventListener('click', open);
    document.querySelector('#tuneClose')?.addEventListener('click', close);
    document.querySelector('#tuneDone')?.addEventListener('click', close);

    dialog.addEventListener('click', event => {
      if (event.target === dialog) close();
    });

    document.querySelector('#tunePreset')?.addEventListener('change', event => {
      if (event.target.value === 'custom-current') {
        activePreset = 'custom-current';
        persist();
        syncUi();
        return;
      }
      applyPreset(event.target.value);
    });

    Object.entries(fieldIds).forEach(([key, id]) => {
      const input = document.getElementById(id);
      if (!input) return;
      const eventName = input.type === 'range' ? 'input' : 'change';
      input.addEventListener(eventName, () => {
        const value = input.type === 'checkbox'
          ? input.checked
          : input.tagName === 'TEXTAREA'
            ? input.value
            : Number(input.value);
        update({ [key]: value });
      });
      if (input.tagName === 'TEXTAREA') {
        input.addEventListener('input', () => update({ [key]: input.value }));
      }
    });

    document.querySelector('#tuneSavePreset')?.addEventListener('click', () => {
      const input = document.querySelector('#tunePresetName');
      const id = savePreset(input?.value);
      if (!id) {
        input?.focus();
        return;
      }
      if (input) input.value = '';
    });

    document.querySelector('#tuneDeletePreset')?.addEventListener('click', () => {
      const select = document.querySelector('#tunePreset');
      if (select && customPresets[select.value]) deletePreset(select.value);
    });

    document.querySelector('#tuneReset')?.addEventListener('click', () => applyPreset('balanced'));
    syncUi();
  }

  window.COSMOS_MODEL_SETTINGS = {
    get,
    update,
    subscribe,
    applyPreset,
    savePreset,
    deletePreset,
    allPresets,
    open,
    close,
    defaults: () => ({ ...BASE })
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
