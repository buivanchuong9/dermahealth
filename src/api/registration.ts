import { http } from './http';
import { setAccessToken } from './authToken';
import { ROLE_LABEL, type UserRole } from '../domain/core/role';
import type { AuthSession, RegisterRequest } from './types';

// Suffix matches the "auth" group's POST /api/v1/auth/registrations endpoint
// in the API docs — kept in its own file so registration-specific i18n and
// role mapping can grow independently of login/logout/refresh in `auth.ts`.
const REGISTRATIONS_ENDPOINT = '/api/v1/auth/registrations';

export const REGISTRATION_MESSAGES = {
  success: 'Đăng ký tài khoản thành công.',
  genericError: 'Đăng ký thất bại. Vui lòng thử lại.',
} as const;

export async function registerAccount(payload: RegisterRequest): Promise<AuthSession> {
  const session = await http.post<AuthSession>(REGISTRATIONS_ENDPOINT, payload, { auth: false });
  setAccessToken(session.accessToken, session.accessTokenExpiresAt);
  return session;
}

// First membership is treated as the account's primary role — same rule
// AppStateContext.refreshMe() uses — so permission gating (hasRoleAccess)
// can key off it right after registration, before the first /me refresh.
export function getPrimaryRole(session: AuthSession): UserRole {
  return (session.user.memberships[0]?.role as UserRole | undefined) ?? 'patient';
}

export function getPrimaryRoleLabel(session: AuthSession): string {
  return ROLE_LABEL[getPrimaryRole(session)];
}
