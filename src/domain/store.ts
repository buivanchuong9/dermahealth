// Generic, localStorage-backed entity store. Every repository in
// repositories.ts is a thin, named wrapper around one of these — this is
// where "typed mock repository with simulated persistence" actually lives,
// so we don't hand-roll the same get/upsert/remove/subscribe boilerplate
// eleven times over.

export interface Entity {
  id: string;
}

export interface EntityStore<T extends Entity> {
  getAll(): T[];
  getById(id: string): T | undefined;
  upsert(entity: T): T;
  remove(id: string): void;
  replaceAll(entities: T[]): void;
  subscribe(listener: () => void): () => void;
}

const STORAGE_PREFIX = 'dermahealth:v1:';
const SCHEMA_VERSION_KEY = 'dermahealth:schemaVersion';

/** Bump this when a persisted entity's shape changes incompatibly. Any
 * mismatch (including a first-ever run with pre-existing v1 keys but no
 * version marker) wipes all persisted collections and falls back to seed. */
export const SCHEMA_VERSION = 1;

let recovered = false;
/** True if this page load discarded persisted data because it was corrupted,
 * shape-invalid, or stamped with an incompatible schema version. Read once
 * after the repositories module has finished initializing. */
export function wasRecoveredFromCorruption(): boolean {
  return recovered;
}

function storageKeysWithPrefix(prefix: string): string[] {
  const keys: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) keys.push(k);
    }
  } catch {
    // localStorage unavailable — nothing to enumerate
  }
  return keys;
}

/** Wipe all persisted collections if the stored schema version doesn't match
 * the running app's, so an old/incompatible shape never reaches loadFromStorage. */
function ensureSchemaVersion(): void {
  // undefined = localStorage inaccessible (abort, no side effects); null = accessible but unset (first run).
  const readStoredVersion = (): string | null | undefined => {
    try {
      return localStorage.getItem(SCHEMA_VERSION_KEY);
    } catch {
      return undefined;
    }
  };
  const storedVersion = readStoredVersion();
  if (storedVersion === undefined) return;
  if (storedVersion === String(SCHEMA_VERSION)) return;
  const priorKeys = storageKeysWithPrefix(STORAGE_PREFIX);
  if (priorKeys.length > 0) {
    recovered = true;
    priorKeys.forEach((k) => {
      try { localStorage.removeItem(k); } catch { /* ignore */ }
    });
  }
  try { localStorage.setItem(SCHEMA_VERSION_KEY, String(SCHEMA_VERSION)); } catch { /* ignore */ }
}

ensureSchemaVersion();

function isValidEntityArray<T>(value: unknown): value is T[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'object' && item !== null && typeof (item as { id?: unknown }).id === 'string');
}

function loadFromStorage<T>(key: string): T[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isValidEntityArray<T>(parsed)) {
      recovered = true;
      try { localStorage.removeItem(STORAGE_PREFIX + key); } catch { /* ignore */ }
      return null;
    }
    return parsed;
  } catch {
    recovered = true;
    try { localStorage.removeItem(STORAGE_PREFIX + key); } catch { /* ignore */ }
    return null;
  }
}

function saveToStorage<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(data));
  } catch {
    // localStorage unavailable (private mode / quota) — degrade to in-memory only
  }
}

const registeredKeys = new Set<string>();

export function createEntityStore<T extends Entity>(key: string, seed: T[]): EntityStore<T> {
  registeredKeys.add(key);
  let data: T[] = loadFromStorage<T>(key) ?? seed;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((l) => l());
  const persist = () => saveToStorage(key, data);

  return {
    getAll: () => data,
    getById: (id) => data.find((d) => d.id === id),
    upsert: (entity) => {
      const idx = data.findIndex((d) => d.id === entity.id);
      data = idx >= 0 ? [...data.slice(0, idx), entity, ...data.slice(idx + 1)] : [...data, entity];
      persist();
      notify();
      return entity;
    },
    remove: (id) => {
      data = data.filter((d) => d.id !== id);
      persist();
      notify();
    },
    replaceAll: (entities) => {
      data = entities;
      persist();
      notify();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/** Wipes every store's persisted copy so the next load falls back to fresh seed data. */
export function clearPersistedState(): void {
  registeredKeys.forEach((key) => {
    try {
      localStorage.removeItem(STORAGE_PREFIX + key);
    } catch {
      // ignore
    }
  });
}
