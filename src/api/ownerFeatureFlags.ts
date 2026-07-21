import { http } from './http';
import type { GenericSuccessEnvelope, SetFeatureFlagOverrideRequest } from './types';

export async function list(): Promise<GenericSuccessEnvelope> {
  return http.get<GenericSuccessEnvelope>('/api/v1/owner/feature-flags');
}

export async function setOverride(key: string, organizationId: string, payload: SetFeatureFlagOverrideRequest): Promise<GenericSuccessEnvelope> {
  return http.put<GenericSuccessEnvelope>(`/api/v1/owner/feature-flags/${key}/organizations/${organizationId}`, payload);
}

export async function clearOverride(key: string, organizationId: string): Promise<void> {
  return http.delete<void>(`/api/v1/owner/feature-flags/${key}/organizations/${organizationId}`);
}
