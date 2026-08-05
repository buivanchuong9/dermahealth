import { http } from './http';
import { clearAccessToken, setAccessToken } from './authToken';
import type {
  AuthSession,
  ForgotPasswordRequest,
  LoginRequest,
  LogoutAllRequest,
} from './types';

export async function login(payload: LoginRequest): Promise<AuthSession> {
  const session = await http.post<AuthSession>('/api/v1/auth/sessions', payload, { auth: false });
  setAccessToken(session.accessToken, session.accessTokenExpiresAt);
  return session;
}

export function forgotPassword(payload: ForgotPasswordRequest): Promise<{ accepted: boolean }> {
  return http.post<{ accepted: boolean }>('/api/v1/auth/forgot-password', payload, {
    auth: false,
  });
}

export async function logoutAllSessions(payload: LogoutAllRequest): Promise<void> {
  await http.delete<void>('/api/v1/auth/sessions', payload);
  clearAccessToken();
}

export async function logoutCurrentSession(): Promise<void> {
  try {
    await http.delete<void>('/api/v1/auth/sessions/current');
  } finally {
    clearAccessToken();
  }
}

export async function refreshSession(): Promise<AuthSession> {
  const session = await http.post<AuthSession>(
    '/api/v1/auth/session-refreshes',
    undefined,
    { auth: false },
  );
  setAccessToken(session.accessToken, session.accessTokenExpiresAt);
  return session;
}
