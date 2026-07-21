import { http } from './http';
import type { DecisionRequest, GenericSuccessEnvelope } from './types';

export async function list(params: { status: string }): Promise<GenericSuccessEnvelope> {
  const qs = new URLSearchParams();
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) qs.append(k, String(v));
    }
  }

  return http.get<GenericSuccessEnvelope>(`/api/v1/encounter-requests${qs.toString() ? '?' + qs.toString() : ''}`);
}

export async function decide(requestId: string, payload: DecisionRequest): Promise<GenericSuccessEnvelope> {
  return http.post<GenericSuccessEnvelope>(`/api/v1/encounter-requests/${requestId}/decide`, payload);
}
