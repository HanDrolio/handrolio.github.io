const STORAGE_KEY = 'cosmos_v4';
const LEGACY_KEYS = ['cosmos_v3'];

function emptyState() {
  return {
    version: 4,
    mode: 'chat',
    lock: null,
    messages: [],
    entries: []
  };
}

function normalizeState(input = {}) {
  const base = emptyState();
  return {
    ...base,
    ...input,
    version: 4,
    mode: input.mode === 'log' ? 'log' : 'chat',
    lock: typeof input.lock === 'string' ? input.lock : null,
    messages: Array.isArray(input.messages) ? input.messages : [],
    entries: Array.isArray(input.entries) ? input.entries : []
  };
}

function parse(raw) {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function createStorage() {
  function load() {
    const current = parse(localStorage.getItem(STORAGE_KEY));
    if (current) return normalizeState(current);

    for (const key of LEGACY_KEYS) {
      const legacy = parse(localStorage.getItem(key));
      if (!legacy) continue;
      const migrated = normalizeState(legacy);
      save(migrated);
      return migrated;
    }

    return emptyState();
  }

  function save(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeState(state)));
      return true;
    } catch (error) {
      console.warn('COSM.OS storage save failed', error);
      return false;
    }
  }

  function exportState(state) {
    return JSON.stringify(normalizeState(state), null, 2);
  }

  function importState(raw) {
    const data = typeof raw === 'string' ? parse(raw) : raw;
    if (!data || typeof data !== 'object') throw new Error('Invalid COSM.OS backup.');
    return normalizeState(data);
  }

  return { load, save, exportState, importState, key: STORAGE_KEY };
}
