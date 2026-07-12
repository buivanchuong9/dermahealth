import { useSyncExternalStore } from 'react';
import type { Entity, EntityStore } from '../domain/store';

/** Subscribes a component to a repository's EntityStore so it re-renders
 * whenever that repository changes anywhere in the app — this, plus
 * AppStateContext for the small bits of session state (current user/role),
 * is the whole "shared application state" mechanism. There is no separate
 * copy of encounters/orders/tasks/etc. living in Context — the repositories
 * (see domain/repositories.ts) already are the single shared source of
 * truth; this hook just makes React aware of that external store. */
export function useStore<T extends Entity>(store: EntityStore<T>): T[] {
  return useSyncExternalStore(store.subscribe, store.getAll, store.getAll);
}
