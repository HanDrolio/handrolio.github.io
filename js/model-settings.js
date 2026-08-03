/* COSM.OS — generation-only Model Lab v0.7
   No prompt injection, memory depth, starter banks, examples, or response schemas. */

(() => {
  const SETTINGS_KEY = 'cosmos_model_tuning_v2';
  const PRESETS_KEY = 'cosmos_model_presets_v2';
  const ACTIVE_KEY = 'cosmos_model_active_preset_v2';

  const BASE = {
    temperature: 0.72,
    topP: 0.9,
    repeatPenalty: 1.08,
    maxTokens: 220,
    numCtx: 4096
  };

  const BUILT_INS = {
    balanced: { name: 'Balanced', settings: { ...BASE } },
    calm: {
      name: 'Calm',
      settings: { ...BASE, temperature: 0.55, topP: 0.85, repeatPenalty: 1.1, maxTokens: 160 }
    },
    precise: {
      name: 'Precise',
      settings: { ...BASE, temperature: 0.35, topP: 0.8, repeatPenalty: 1.12, maxTokens: 180 }
    },
    creative: {
      name: 'Creative',
      settings: { ...BASE, temperature: 0.95, topP: 0.98, repeatPenalty: 1.03, maxTokens: 320 }
    },
    deep: {
      name: 'Deep',
      settings: { ...BASE, temperature: 0.78, topP: 0.94, maxTokens: 420, numCtx: 8192 }
    }
  };

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
      numCtx: [2048, 4096, 8192, 16384].includes(Number(value.numCtx))
        ? Number(value.numCtx)
        : BASE.numCtx
    };
  }

  function persist() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    localStorage.setItem(PRESETS_KEY, JSON.stringify(customPresets));
    localStorage.setItem(ACTIVE_KEY, activePreset);
  }

  function get() {
    return { ...settings };
  }

  function presetMap() {
    return {
      ...Object.fromEntries(Object.entries(BUILT_INS).map(([id, preset]) => [id, { ...preset, builtIn: true }])),
      ...Object.fromEntries(Object.entries(customPresets).map(([id, preset]) => [id, { ...preset, builtIn: false }]))
    };
  }

  function update(patch) {
    settings = normalize({ ...settings, ...patch });
    activePreset = 'custom-current';
    persist();
    syncUi();
    return get();
  }

  function applyPreset(id) {
    const preset = presetMap()[id];
    if (!preset) return false;
    settings = normalize(preset.settings);
    activePreset = id;
    persist();
    syncUi();
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
    if (customPresets[id] && customPresets[id].name !== clean) {
      id = `${id}-${Date.now().toString(36)}`;
    }
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

  function escapeHtml(value) {
    const node = document.createElement('div');
    node.textContent = value;
    return node.innerHTML;
  }

  function renderPresetOptions() {
    const select = document.querySelector('#tunePreset');
    if (!select) return;

    const presets = presetMap();
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

  const fields = {
    temperature: 'tuneTemperature',
    topP: 'tuneTopP',
    repeatPenalty: 'tuneRepeatPenalty',
    maxTokens: 'tuneMaxTokens',
    numCtx: 'tuneNumCtx'
  };

  function syncUi() {
    renderPresetOptions();

    Object.entries(fields).forEach(([key, id]) => {
      const input = document.getElementById(id);
      if (!input) return;
      input.value = settings[key];
      const output = document.querySelector(`[data-value-for="${key}"]`);
      if (output) {
        output.textContent = ['temperature', 'topP', 'repeatPenalty'].includes(key)
          ? Number(settings[key]).toFixed(2)
          : String(settings[key]);
      }
    });

    const status = document.querySelector('#tuneStatus');
    if (status) {
      const preset = presetMap()[activePreset];
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
      } else {
        applyPreset(event.target.value);
      }
    });

    Object.entries(fields).forEach(([key, id]) => {
      const input = document.getElementById(id);
      if (!input) return;
      input.addEventListener(input.type === 'range' ? 'input' : 'change', () => {
        update({ [key]: Number(input.value) });
      });
    });

    document.querySelector('#tuneSavePreset')?.addEventListener('click', () => {
      const input = document.querySelector('#tunePresetName');
      const id = savePreset(input?.value);
      if (!id) return input?.focus();
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
    applyPreset,
    savePreset,
    deletePreset,
    allPresets: presetMap,
    open,
    close,
    defaults: () => ({ ...BASE })
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
