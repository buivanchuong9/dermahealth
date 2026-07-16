import { http } from './http';
import { clearAccessToken, setAccessToken } from './authToken';
import type { AuthSession, LoginRequest, LogoutAllRequest } from './types';

export async function login(payload: LoginRequest): Promise<AuthSession> {
  const session = await http.post<AuthSession>('/api/v1/auth/sessions', payload, { auth: false });
  setAccessToken(session.accessToken, session.accessTokenExpiresAt);
  return session;
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
  const session = await http.post<AuthSession>('/api/v1/auth/session-refreshes');
  setAccessToken(session.accessToken, session.accessTokenExpiresAt);
  return session;
}
