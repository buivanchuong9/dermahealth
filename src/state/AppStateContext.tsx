import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { App as AntApp } from 'antd';
import { userRepository, resetAllRepositoriesToSeed, wasDataAutoRecovered } from '../domain/repositories';
import { patientService } from '../domain/services';
import { useStore } from './useStore';
import { AppStateContext, type AppStateValue } from './appStateContextObject';
import type { User } from '../domain/core/entities';
import type { UserId } from '../domain/core/ids';
import type { UserRole } from '../domain/core/enums';
import { getMe } from '../api/me';

const SESSION_KEY = 'dermahealth:v1:session:currentUserId';
const DEFAULT_USER_ID = 'U-0005' as UserId;
const ME_USER_ID = 'ME' as UserId;

function readStoredUserId(): UserId | null {
  try {
    return localStorage.getItem(SESSION_KEY) as UserId | null;
  } catch {
    return null;
  }
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const { notification } = AntApp.useApp();
  const users = useStore(userRepository);
  const [currentUserId, setCurrentUserIdState] = useState<UserId>(() => readStoredUserId() ?? DEFAULT_USER_ID);
  const [meUser, setMeUser] = useState<User | null>(null);
  const hadStoredChoice = useRef(readStoredUserId() !== null);
  const notifiedRecovery = useRef(false);

  const refreshMe = useCallback(() => {
    getMe().then((me) => {
      const role = (me.memberships[0]?.role as UserRole | undefined) ?? 'patient';
      setMeUser({ id: ME_USER_ID, name: me.name, role });
      if (!hadStoredChoice.current) {
        setCurrentUserIdState(ME_USER_ID);
      }
    }).catch(() => setMeUser(null));
  }, []);

  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  const resetSession = useCallback(() => {
    setMeUser(null);
    hadStoredChoice.current = false;
    setCurrentUserIdState(DEFAULT_USER_ID);
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      // ignore — private mode / storage disabled
    }
  }, []);

  useEffect(() => {
    if (notifiedRecovery.current || !wasDataAutoRecovered()) return;
    notifiedRecovery.current = true;
    notification.warning({
      message: 'Đã khôi phục dữ liệu mẫu',
      description: 'Dữ liệu đã lưu trước đó không hợp lệ hoặc không tương thích nên hệ thống đã tự động khôi phục về bộ dữ liệu mẫu ban đầu.',
      placement: 'bottomRight',
    });
  }, [notification]);

  const setCurrentUserId = useCallback((id: UserId) => {
    hadStoredChoice.current = true;
    setCurrentUserIdState(id);
    try {
      localStorage.setItem(SESSION_KEY, id);
    } catch {
      // ignore — private mode / storage disabled, session selection just won't survive reload
    }
  }, []);

  const resetToSeed = useCallback(() => {
    resetAllRepositoriesToSeed();
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      // ignore
    }
    window.location.reload();
  }, []);

  const allUsers = meUser ? [meUser, ...users] : users;
  const currentUser = allUsers.find((u) => u.id === currentUserId) ?? allUsers[0];
  const currentPatient = patientService.getCurrentPatient();

  const value = useMemo<AppStateValue>(
    () => ({ currentUserId: currentUser.id, currentUser, role: currentUser.role, allUsers, setCurrentUserId, currentPatient, resetToSeed, refreshMe, resetSession }),
    [currentUser, allUsers, setCurrentUserId, currentPatient, resetToSeed, refreshMe, resetSession],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}
