import { http } from './http';
import type { GenericSuccessEnvelope, ReasonedVersionRequest, ReassignTaskRequest, VersionOnlyRequest } from './types';

export async function list(): Promise<GenericSuccessEnvelope> {
  return http.get<GenericSuccessEnvelope>('/api/v1/workflow-tasks');
}

export async function accept(taskId: string, payload: VersionOnlyRequest): Promise<GenericSuccessEnvelope> {
  return http.post<GenericSuccessEnvelope>(`/api/v1/workflow-tasks/${taskId}/accept`, payload);
}

export async function start(taskId: string, payload: VersionOnlyRequest): Promise<GenericSuccessEnvelope> {
  return http.post<GenericSuccessEnvelope>(`/api/v1/workflow-tasks/${taskId}/start`, payload);
}

export async function complete(taskId: string, payload: VersionOnlyRequest): Promise<GenericSuccessEnvelope> {
  return http.post<GenericSuccessEnvelope>(`/api/v1/workflow-tasks/${taskId}/complete`, payload);
}

export async function redo(taskId: string, payload: ReasonedVersionRequest): Promise<GenericSuccessEnvelope> {
  return http.post<GenericSuccessEnvelope>(`/api/v1/workflow-tasks/${taskId}/redo`, payload);
}

export async function reject(taskId: string, payload: ReasonedVersionRequest): Promise<GenericSuccessEnvelope> {
  return http.post<GenericSuccessEnvelope>(`/api/v1/workflow-tasks/${taskId}/reject`, payload);
}

export async function escalate(taskId: string, payload: ReasonedVersionRequest): Promise<GenericSuccessEnvelope> {
  return http.post<GenericSuccessEnvelope>(`/api/v1/workflow-tasks/${taskId}/escalate`, payload);
}

export async function skip(taskId: string, payload: ReasonedVersionRequest): Promise<GenericSuccessEnvelope> {
  return http.post<GenericSuccessEnvelope>(`/api/v1/workflow-tasks/${taskId}/skip`, payload);
}

export async function reassign(taskId: string, payload: ReassignTaskRequest): Promise<GenericSuccessEnvelope> {
  return http.post<GenericSuccessEnvelope>(`/api/v1/workflow-tasks/${taskId}/reassign`, payload);
}
