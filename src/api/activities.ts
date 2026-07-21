import { http } from './http';
import type { GenericSuccessEnvelope, TransitionRequest } from './types';

export async function advance(activityId: string, payload: TransitionRequest): Promise<GenericSuccessEnvelope> {
  return http.post<GenericSuccessEnvelope>(`/api/v1/activities/${activityId}/advance`, payload);
}

export async function confirm(activityId: string, payload?: any): Promise<GenericSuccessEnvelope> {
  return http.post<GenericSuccessEnvelope>(`/api/v1/activities/${activityId}/confirm`, payload);
}
