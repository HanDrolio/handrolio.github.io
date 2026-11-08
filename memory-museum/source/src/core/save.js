import { DEMOS, SEALED_DEMO } from '../memories/demo.js';
import { scheduleEntries } from '../memories/import.js';

export const SETTINGS = { volume: 0.55, lookSpeed: 1, reduced: false, touch: 'auto', muted: false, activePersona: 'orion' };
const KEY = 'cosmos.memory-museum.settings.v1';

export function settings() {
  try { return { ...SETTINGS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
  catch { return { ...SETTINGS }; }
}

export function storeSettings(value) {
  try { localStorage.setItem(KEY, JSON.stringify(value)); } catch {}
}

export function identity() {
  try {
    const key = 'cosmos.memory-museum.archive.v1';
    const id = localStorage.getItem(key) || crypto.randomUUID();
    localStorage.setItem(key, id);
    return id;
  } catch { return 'visitor'; }
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('cosmos-memory-museum', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      db.createObjectStore('memories', { keyPath: 'id' });
      db.createObjectStore('media');
      db.createObjectStore('world');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Another tab is preventing the archive from opening.'));
  });
}

function read(db, store, key) {
  if (!db) return Promise.resolve(undefined);
  return new Promise((resolve, reject) => {
    const table = db.transaction(store).objectStore(store);
    const request = key === undefined ? table.getAll() : table.get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function write(db, tables, callback) {
  if (!db) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(tables, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error || new Error('The archive could not be saved.'));
    callback(tx);
  });
}

export class Archive {
  constructor() {
    this.entries = new Map([...DEMOS, SEALED_DEMO].map(memory => [memory.id, { ...memory }]));
    this.world = { demonVisits: 0, days: [] };
    this.sessionMedia = new Map();
    this.collections = [];
    this.saves = Promise.resolve();
  }

  async load() {
    try {
      this.db = await openDatabase();
      const [memories, world] = await Promise.all([read(this.db, 'memories'), read(this.db, 'world', 'state')]);
      for (const memory of memories || []) this.entries.set(memory.id, memory);
      Object.assign(this.world, world);
    } catch {
      this.db?.close();
      this.db = null;
    }
    return this;
  }

  get memories() { return [...this.entries.values()]; }

  get canPersist() { return Boolean(this.db); }

  getMedia(id) { return this.db ? read(this.db, 'media', id) : Promise.resolve(this.sessionMedia.get(id)); }

  enqueue(operation) {
    const result = this.saves.then(operation);
    this.saves = result.catch(() => {});
    return result;
  }

  installPublished({ collections, memories }) {
    this.collections = collections;
    for (const memory of memories) {
      const stored = this.entries.get(memory.id);
      if (stored) {
        const { integration_status, visit_count, last_visited, notes } = stored;
        this.entries.set(memory.id, { ...memory, integration_status, visit_count, last_visited, notes });
      } else {
        this.entries.set(memory.id, memory);
      }
    }
  }

  saveMany(records, now = new Date()) {
    return this.enqueue(async () => {
      if (this.db) {
        await write(this.db, ['memories', 'media'], tx => {
          const table = tx.objectStore('memories');
          const request = table.getAll();
          request.onsuccess = () => {
            // Serialize the three daily slots across tabs in the same IndexedDB transaction.
            scheduleEntries(records, request.result, now);
            for (const { memory, blob } of records) {
              table.put(memory);
              if (blob) tx.objectStore('media').put(blob, memory.id);
            }
          };
        });
      } else {
        scheduleEntries(records, this.memories, now);
      }
      for (const { memory, blob } of records) {
        this.entries.set(memory.id, memory);
        if (!this.db && blob) this.sessionMedia.set(memory.id, blob);
      }
    });
  }

  update(id, change) {
    return this.enqueue(async () => {
      let next;
      if (this.db) {
        await write(this.db, ['memories'], tx => {
          const table = tx.objectStore('memories');
          const request = table.get(id);
          request.onsuccess = () => {
            next = change(request.result || this.entries.get(id));
            if (next) table.put(next);
          };
        });
      } else {
        next = change(this.entries.get(id));
      }
      if (next) this.entries.set(id, next);
      return next;
    });
  }

  remove(id) {
    return this.enqueue(async () => {
      await write(this.db, ['memories', 'media'], tx => {
        tx.objectStore('memories').delete(id);
        tx.objectStore('media').delete(id);
      });
      this.entries.delete(id);
      this.sessionMedia.delete(id);
    });
  }

  updateWorld(change) {
    return this.enqueue(async () => {
      let next;
      if (this.db) {
        await write(this.db, ['world'], tx => {
          const table = tx.objectStore('world');
          const request = table.get('state');
          request.onsuccess = () => {
            next = change(request.result || this.world);
            table.put(next, 'state');
          };
        });
      } else {
        next = change(this.world);
      }
      this.world = next;
      return next;
    });
  }
}
