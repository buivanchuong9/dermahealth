import { http } from './http';
import type { GenericSuccessEnvelope } from './types';

export async function live(): Promise<GenericSuccessEnvelope> {
  return http.get<GenericSuccessEnvelope>('/health/live');
}

export async function ready(): Promise<GenericSuccessEnvelope> {
  return http.get<GenericSuccessEnvelope>('/health/ready');
}
