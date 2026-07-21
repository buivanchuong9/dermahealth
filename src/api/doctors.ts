import { http } from './http';
import type { GenericSuccessEnvelope } from './types';

export async function list(): Promise<GenericSuccessEnvelope> {
  return http.get<GenericSuccessEnvelope>('/api/v1/doctors');
}

export async function availability(doctorId: string): Promise<GenericSuccessEnvelope> {
  return http.get<GenericSuccessEnvelope>(`/api/v1/doctors/${doctorId}/availability`);
}
