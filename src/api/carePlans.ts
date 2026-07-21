import { http } from './http';
import type { ActivityRequest, GenericSuccessEnvelope } from './types';

export async function activities(carePlanId: string): Promise<GenericSuccessEnvelope> {
  return http.get<GenericSuccessEnvelope>(`/api/v1/care-plans/${carePlanId}/activities`);
}

export async function create(carePlanId: string, payload: ActivityRequest): Promise<GenericSuccessEnvelope> {
  return http.post<GenericSuccessEnvelope>(`/api/v1/care-plans/${carePlanId}/activities`, payload);
}

export async function automation(carePlanId: string, payload?: any): Promise<GenericSuccessEnvelope> {
  return http.post<GenericSuccessEnvelope>(`/api/v1/care-plans/${carePlanId}/run-automation`, payload);
}
