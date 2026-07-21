import { http } from './http';
import type { GenericSuccessEnvelope } from './types';

export async function connections(): Promise<GenericSuccessEnvelope> {
  return http.get<GenericSuccessEnvelope>('/api/v1/integrations/connections');
}

export async function messages(id: string): Promise<GenericSuccessEnvelope> {
  return http.get<GenericSuccessEnvelope>(`/api/v1/integrations/connections/${id}/messages`);
}

export async function retry(id: string, payload?: any): Promise<GenericSuccessEnvelope> {
  return http.post<GenericSuccessEnvelope>(`/api/v1/integrations/connections/${id}/retry`, payload);
}

export async function reconcile(id: string, payload?: any): Promise<GenericSuccessEnvelope> {
  return http.post<GenericSuccessEnvelope>(`/api/v1/integrations/connections/${id}/reconcile`, payload);
}
