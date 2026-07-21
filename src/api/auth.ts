import { http } from './http';
import { setAccessToken } from './authToken';
import type { AcceptInvitationRequest, CreateAccountRequest, CreateSessionRequest, ForgotPasswordRequest, GenericSuccessEnvelope, PatientRegistrationResponseDto, ResetPasswordRequest, SessionResponseDto, StaffInvitationRegistrationResponseDto } from './types';

export async function register(payload: CreateAccountRequest): Promise<PatientRegistrationResponseDto | StaffInvitationRegistrationResponseDto> {
  const session = await http.post<PatientRegistrationResponseDto | StaffInvitationRegistrationResponseDto>('/api/v1/auth/registrations', payload, { auth: false });
  if (session && (session as any).data?.accessToken) {
    setAccessToken((session as any).data.accessToken, (session as any).data.accessTokenExpiresAt || '');
  }
  return session;
}

export async function activateInvitation(payload: AcceptInvitationRequest): Promise<void> {
  return http.post<void>('/api/v1/auth/invitations/activation', payload);
}

export async function createSession(payload: CreateSessionRequest): Promise<{ success: true; data: SessionResponseDto; meta: Record<string, any>; requestId: string; }> {
  return http.post<{ success: true; data: SessionResponseDto; meta: Record<string, any>; requestId: string; }>('/api/v1/auth/sessions', payload);
}

export async function endAllSessions(): Promise<void> {
  return http.delete<void>('/api/v1/auth/sessions');
}

export async function login(payload: CreateSessionRequest): Promise<{ success: true; data: SessionResponseDto; meta: Record<string, any>; requestId: string; }> {
  const session = await http.post<{ success: true; data: SessionResponseDto; meta: Record<string, any>; requestId: string; }>('/api/v1/auth/login', payload, { auth: false });
  if (session && session.data?.accessToken) {
    setAccessToken(session.data.accessToken, session.data.accessTokenExpiresAt || '');
  }
  return session;
}

export async function createSessionRefresh(payload?: any): Promise<{ success: true; data: SessionResponseDto; meta: Record<string, any>; requestId: string; }> {
  return http.post<{ success: true; data: SessionResponseDto; meta: Record<string, any>; requestId: string; }>('/api/v1/auth/session-refreshes', payload);
}

export async function refresh(payload?: any): Promise<{ success: true; data: SessionResponseDto; meta: Record<string, any>; requestId: string; }> {
  return http.post<{ success: true; data: SessionResponseDto; meta: Record<string, any>; requestId: string; }>('/api/v1/auth/refresh', payload);
}

export async function me(): Promise<GenericSuccessEnvelope> {
  return http.get<GenericSuccessEnvelope>('/api/v1/auth/me');
}

export async function endCurrentSession(): Promise<void> {
  return http.delete<void>('/api/v1/auth/sessions/current');
}

export async function logout(payload?: any): Promise<void> {
  return http.post<void>('/api/v1/auth/logout', payload);
}

export async function forgotPassword(payload: ForgotPasswordRequest): Promise<void> {
  return http.post<void>('/api/v1/auth/forgot-password', payload);
}

export async function resetPassword(payload: ResetPasswordRequest): Promise<void> {
  return http.post<void>('/api/v1/auth/reset-password', payload);
}
