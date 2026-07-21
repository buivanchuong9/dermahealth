import { http } from './http';
import type { CurrentUserResponseDto, MfaCodeRequest, UpdateCurrentUserRequest, UpsertUserPreferenceRequest, UserPreferenceResponseDto } from './types';

export async function getProfile(): Promise<{ success: true; data: CurrentUserResponseDto; meta: Record<string, any>; requestId: string; }> {
  return http.get<{ success: true; data: CurrentUserResponseDto; meta: Record<string, any>; requestId: string; }>('/api/v1/me');
}

export async function updateProfile(payload: UpdateCurrentUserRequest): Promise<{ success: true; data: CurrentUserResponseDto; meta: Record<string, any>; requestId: string; }> {
  return http.patch<{ success: true; data: CurrentUserResponseDto; meta: Record<string, any>; requestId: string; }>('/api/v1/me', payload);
}

export async function getPreferences(): Promise<{ success: true; data: UserPreferenceResponseDto; meta: Record<string, any>; requestId: string; }> {
  return http.get<{ success: true; data: UserPreferenceResponseDto; meta: Record<string, any>; requestId: string; }>('/api/v1/me/preferences');
}

export async function putPreferences(payload: UpsertUserPreferenceRequest): Promise<{ success: true; data: UserPreferenceResponseDto; meta: Record<string, any>; requestId: string; }> {
  return http.put<{ success: true; data: UserPreferenceResponseDto; meta: Record<string, any>; requestId: string; }>('/api/v1/me/preferences', payload);
}

export async function beginMfaEnrollment(payload?: any): Promise<{ success: true; data: CurrentUserResponseDto; meta: Record<string, any>; requestId: string; }> {
  return http.post<{ success: true; data: CurrentUserResponseDto; meta: Record<string, any>; requestId: string; }>('/api/v1/me/mfa', payload);
}

export async function disableMfa(): Promise<void> {
  return http.delete<void>('/api/v1/me/mfa');
}

export async function confirmMfaEnrollment(payload: MfaCodeRequest): Promise<void> {
  return http.post<void>('/api/v1/me/mfa/confirmations', payload);
}
