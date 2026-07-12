import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { App as AntApp } from 'antd';
import { userRepository, resetAllRepositoriesToSeed, wasDataAutoRecovered } from '../domain/repositories';
import { patientService } from '../domain/services';
import { useStore } from './useStore';
import { AppStateContext, type AppStateValue } from './appStateContextObject';
import type { UserId } from '../domain/core/ids';

const SESSION_KEY = 'dermahealth:v1:session:currentUserId';
const DEFAULT_USER_ID = 'U-0001' as UserId;

function readStoredUserId(): UserId {
  try {
    return (localStorage.getItem(SESSION_KEY) as UserId | null) ?? DEFAULT_USER_ID;
  } catch {
    return DEFAULT_USER_ID;
  }
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const { notification } = AntApp.useApp();
  const users = useStore(userRepository);
  const [currentUserId, setCurrentUserIdState] = useState<UserId>(readStoredUserId);
  const notifiedRecovery = useRef(false);

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

  const currentUser = users.find((u) => u.id === currentUserId) ?? users[0];
  const currentPatient = patientService.getCurrentPatient();

  const value = useMemo<AppStateValue>(
    () => ({ currentUserId: currentUser.id, currentUser, role: currentUser.role, allUsers: users, setCurrentUserId, currentPatient, resetToSeed }),
    [currentUser, users, setCurrentUserId, currentPatient, resetToSeed],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}
