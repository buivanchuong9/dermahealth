import { http } from './http';
import type { DecideDangerousActionRequest, GenericSuccessEnvelope, ProposeDangerousActionRequest } from './types';

export async function propose(payload: ProposeDangerousActionRequest): Promise<GenericSuccessEnvelope> {
  return http.post<GenericSuccessEnvelope>('/api/v1/owner/dangerous-actions', payload);
}

export async function list(): Promise<GenericSuccessEnvelope> {
  return http.get<GenericSuccessEnvelope>('/api/v1/owner/dangerous-actions');
}

export async function decide(requestId: string, payload: DecideDangerousActionRequest): Promise<GenericSuccessEnvelope> {
  return http.post<GenericSuccessEnvelope>(`/api/v1/owner/dangerous-actions/${requestId}/approvals`, payload);
}
