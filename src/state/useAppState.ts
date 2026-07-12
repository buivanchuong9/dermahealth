import { useContext } from 'react';
import { AppStateContext, type AppStateValue } from './appStateContextObject';

export function useAppState(): AppStateValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within an AppStateProvider');
  return ctx;
}
