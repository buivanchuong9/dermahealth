import { http } from './http';
import type { GenericSuccessEnvelope, RefillRequest } from './types';

export async function refill(id: string, payload: RefillRequest): Promise<GenericSuccessEnvelope> {
  return http.post<GenericSuccessEnvelope>(`/api/v1/prescriptions/${id}/refill-request`, payload);
}
