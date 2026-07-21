import { http } from './http';
import type { GenericSuccessEnvelope, ReasonedVersionRequest, VersionOnlyRequest } from './types';

export async function list(): Promise<GenericSuccessEnvelope> {
  return http.get<GenericSuccessEnvelope>('/api/v1/workflow-instances');
}

export async function detail(instanceId: string): Promise<GenericSuccessEnvelope> {
  return http.get<GenericSuccessEnvelope>(`/api/v1/workflow-instances/${instanceId}`);
}

export async function verify(instanceId: string): Promise<GenericSuccessEnvelope> {
  return http.get<GenericSuccessEnvelope>(`/api/v1/workflow-instances/${instanceId}/identity-verify`);
}

export async function suspend(instanceId: string, payload: ReasonedVersionRequest): Promise<GenericSuccessEnvelope> {
  return http.post<GenericSuccessEnvelope>(`/api/v1/workflow-instances/${instanceId}/suspend`, payload);
}

export async function resume(instanceId: string, payload: VersionOnlyRequest): Promise<GenericSuccessEnvelope> {
  return http.post<GenericSuccessEnvelope>(`/api/v1/workflow-instances/${instanceId}/resume`, payload);
}

export async function cancel(instanceId: string, payload: ReasonedVersionRequest): Promise<GenericSuccessEnvelope> {
  return http.post<GenericSuccessEnvelope>(`/api/v1/workflow-instances/${instanceId}/cancel`, payload);
}

export async function complete(instanceId: string, payload: VersionOnlyRequest): Promise<GenericSuccessEnvelope> {
  return http.post<GenericSuccessEnvelope>(`/api/v1/workflow-instances/${instanceId}/complete`, payload);
}
