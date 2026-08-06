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
  key: string,
  initial: T[],
): EntityStore<T> {
  const loadStored = (): T[] => {
    try {
      const raw = localStorage.getItem(`dermahealth:store:${key}`);
      return raw ? (JSON.parse(raw) as T[]) : initial;
    } catch {
      return initial;
    }
  };
  let data = loadStored();
  const listeners = new Set<() => void>();
  const save = () => {
    try {
      localStorage.setItem(`dermahealth:store:${key}`, JSON.stringify(data));
    } catch {}
  };
  const notify = () => {
    save();
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

export function clearPersistedState(): void {}
export function wasRecoveredFromCorruption(): boolean {
  return false;
}
