import { http } from './http';
import type { GenericSuccessEnvelope } from './types';

export async function list(params: { status: string }): Promise<GenericSuccessEnvelope> {
  const qs = new URLSearchParams();
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) qs.append(k, String(v));
    }
  }

  return http.get<GenericSuccessEnvelope>(`/api/v1/alerts${qs.toString() ? '?' + qs.toString() : ''}`);
}

export async function close(alertId: string, payload?: any): Promise<GenericSuccessEnvelope> {
  return http.post<GenericSuccessEnvelope>(`/api/v1/alerts/${alertId}/close`, payload);
}
