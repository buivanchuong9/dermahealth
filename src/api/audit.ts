import { http } from './http';
import type { ClientEventRequest, GenericSuccessEnvelope } from './types';

export async function list(): Promise<GenericSuccessEnvelope> {
  return http.get<GenericSuccessEnvelope>('/api/v1/audit');
}

export async function encounter(id: string): Promise<GenericSuccessEnvelope> {
  return http.get<GenericSuccessEnvelope>(`/api/v1/audit/encounters/${id}`);
}

export async function patient(id: string): Promise<GenericSuccessEnvelope> {
  return http.get<GenericSuccessEnvelope>(`/api/v1/audit/patients/${id}`);
}

export async function client(payload: ClientEventRequest): Promise<GenericSuccessEnvelope> {
  return http.post<GenericSuccessEnvelope>('/api/v1/audit/client-events', payload);
}
