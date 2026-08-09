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

/** Business data lives in PostgreSQL. This store is only an in-memory view
 * populated from API responses; it deliberately never reads/writes localStorage. */
export function createEntityStore<T extends Entity>(
  _key: string,
  initial: T[],
): EntityStore<T> {
  let data = [...initial];
  const listeners = new Set<() => void>();
  const notify = () => {
    listeners.forEach((listener) => listener());
  };
  return {
    getAll: () => data,
    getById: (id) => data.find((entity) => entity.id === id),
    upsert: (entity) => {
      const index = data.findIndex((item) => item.id === entity.id);
      data =
        index < 0
          ? [...data, entity]
          : [...data.slice(0, index), entity, ...data.slice(index + 1)];
      notify();
      return entity;
    },
    remove: (id) => {
      data = data.filter((entity) => entity.id !== id);
      notify();
    },
    replaceAll: (entities) => {
      data = [...entities];
      notify();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export function clearPersistedState(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const keys = Array.from({ length: localStorage.length }, (_, index) =>
      localStorage.key(index),
    ).filter((key): key is string => key?.startsWith('dermahealth:store:') ?? false);
    keys.forEach((key) => localStorage.removeItem(key));
  } catch {
    // Storage can be unavailable in private/restricted browsing.
  }
}
export function wasRecoveredFromCorruption(): boolean {
  return false;
}
