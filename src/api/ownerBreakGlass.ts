import { http } from './http';
import type { GenericSuccessEnvelope, RequestBreakGlassRequest } from './types';

export async function request(payload: RequestBreakGlassRequest): Promise<GenericSuccessEnvelope> {
  return http.post<GenericSuccessEnvelope>('/api/v1/owner/break-glass', payload);
}

export async function listAll(): Promise<GenericSuccessEnvelope> {
  return http.get<GenericSuccessEnvelope>('/api/v1/owner/break-glass');
}

export async function end(grantId: string, payload?: any): Promise<GenericSuccessEnvelope> {
  return http.post<GenericSuccessEnvelope>(`/api/v1/owner/break-glass/${grantId}/end`, payload);
}

export async function listMine(): Promise<GenericSuccessEnvelope> {
  return http.get<GenericSuccessEnvelope>('/api/v1/owner/break-glass/mine');
}
