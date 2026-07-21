import { http } from './http';
import type { GenericSuccessEnvelope } from './types';

export async function taken(id: string, payload?: any): Promise<GenericSuccessEnvelope> {
  return http.patch<GenericSuccessEnvelope>(`/api/v1/medication-reminders/${id}/taken`, payload);
}
