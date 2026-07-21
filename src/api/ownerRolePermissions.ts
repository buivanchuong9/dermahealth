import { http } from './http';
import type { GenericSuccessEnvelope, GrantRolePermissionRequest } from './types';

export async function list(): Promise<GenericSuccessEnvelope> {
  return http.get<GenericSuccessEnvelope>('/api/v1/owner/role-permissions');
}

export async function grant(payload: GrantRolePermissionRequest): Promise<GenericSuccessEnvelope> {
  return http.post<GenericSuccessEnvelope>('/api/v1/owner/role-permissions', payload);
}

export async function listCatalog(): Promise<GenericSuccessEnvelope> {
  return http.get<GenericSuccessEnvelope>('/api/v1/owner/role-permissions/catalog');
}

export async function revoke(role: string, permissionCode: string): Promise<void> {
  return http.delete<void>(`/api/v1/owner/role-permissions/${role}/${permissionCode}`);
}
