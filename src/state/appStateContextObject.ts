import { createContext } from 'react';
import type { User, Patient } from '../domain/core/entities';
import type { UserId } from '../domain/core/ids';
import type { UserRole } from '../domain/core/enums';

export interface AppStateValue {
  currentUserId: UserId;
  currentUser: User;
  role: UserRole;
  allUsers: User[];
  setCurrentUserId: (id: UserId) => void;
  currentPatient: Patient;
  resetToSeed: () => void;
  refreshMe: () => void;
  resetSession: () => void;
}

export const AppStateContext = createContext<AppStateValue | null>(null);
