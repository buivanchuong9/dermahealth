import { http } from './http';
import type { DeletionRequest, GenericSuccessEnvelope, UpdateCurrentUserRequest, UpsertUserPreferenceRequest, UserResponseDto } from './types';

export async function listPendingInvitations(params: { organizationId: string }): Promise<{ success: true; data: UserResponseDto[]; meta: Record<string, any>; requestId: string; }> {
  const qs = new URLSearchParams();
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) qs.append(k, String(v));
    }
  }

  return http.get<{ success: true; data: UserResponseDto[]; meta: Record<string, any>; requestId: string; }>(`/api/v1/users/invitations${qs.toString() ? '?' + qs.toString() : ''}`);
}

export async function revokeInvitation(invitationId: string): Promise<void> {
  return http.delete<void>(`/api/v1/users/invitations/${invitationId}`);
}

export async function list(): Promise<{ success: true; data: UserResponseDto[]; meta: Record<string, any>; requestId: string; }> {
  return http.get<{ success: true; data: UserResponseDto[]; meta: Record<string, any>; requestId: string; }>('/api/v1/users');
}

export async function detail(userId: string): Promise<{ success: true; data: UserResponseDto; meta: Record<string, any>; requestId: string; }> {
  return http.get<{ success: true; data: UserResponseDto; meta: Record<string, any>; requestId: string; }>(`/api/v1/users/${userId}`);
}

export async function update(userId: string, payload: UpdateCurrentUserRequest): Promise<{ success: true; data: UserResponseDto; meta: Record<string, any>; requestId: string; }> {
  return http.patch<{ success: true; data: UserResponseDto; meta: Record<string, any>; requestId: string; }>(`/api/v1/users/${userId}`, payload);
}

export async function getPreferences(userId: string): Promise<GenericSuccessEnvelope> {
  return http.get<GenericSuccessEnvelope>(`/api/v1/users/${userId}/preferences`);
}

export async function putPreferences(userId: string, payload: UpsertUserPreferenceRequest): Promise<GenericSuccessEnvelope> {
  return http.put<GenericSuccessEnvelope>(`/api/v1/users/${userId}/preferences`, payload);
}

export async function deletion(id: string, payload: DeletionRequest): Promise<GenericSuccessEnvelope> {
  return http.post<GenericSuccessEnvelope>(`/api/v1/users/${id}/deletion-request`, payload);
}
