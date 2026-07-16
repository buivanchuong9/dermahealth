import { http } from './http';
import type { AuthUser, UpdateMeRequest, UpdatePreferencesRequest, UserPreferences } from './types';

export function getMe(): Promise<AuthUser> {
  return http.get<AuthUser>('/api/v1/me');
}

export function updateMe(payload: UpdateMeRequest): Promise<AuthUser> {
  return http.patch<AuthUser>('/api/v1/me', payload);
}

export function getMyPreferences(): Promise<UserPreferences> {
  return http.get<UserPreferences>('/api/v1/me/preferences');
}

export function updateMyPreferences(payload: UpdatePreferencesRequest): Promise<UserPreferences> {
  return http.put<UserPreferences>('/api/v1/me/preferences', payload);
}
