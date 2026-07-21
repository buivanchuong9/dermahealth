import { http } from './http';
import type { GenericSuccessEnvelope } from './types';

export async function kpis(): Promise<GenericSuccessEnvelope> {
  return http.get<GenericSuccessEnvelope>('/api/v1/dashboard/operational-kpis');
}
