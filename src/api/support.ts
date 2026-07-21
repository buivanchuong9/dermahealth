import { http } from './http';
import type { GenericSuccessEnvelope, SupportRequest } from './types';

export async function create(payload: SupportRequest): Promise<GenericSuccessEnvelope> {
  return http.post<GenericSuccessEnvelope>('/api/v1/support/tickets', payload);
}
