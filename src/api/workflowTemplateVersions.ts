import { http } from './http';
import type { EdgeRequest, GenericSuccessEnvelope, NodePositionsRequest, ReorderRequest, ReplaceStepsRequest, StepCreateRequest, StepPatchRequest, VersionOnlyRequest } from './types';

export async function detail(versionId: string): Promise<GenericSuccessEnvelope> {
  return http.get<GenericSuccessEnvelope>(`/api/v1/workflow-template-versions/${versionId}`);
}

export async function replaceSteps(versionId: string, payload: ReplaceStepsRequest): Promise<GenericSuccessEnvelope> {
  return http.put<GenericSuccessEnvelope>(`/api/v1/workflow-template-versions/${versionId}/steps`, payload);
}

export async function addStep(versionId: string, payload: StepCreateRequest): Promise<GenericSuccessEnvelope> {
  return http.post<GenericSuccessEnvelope>(`/api/v1/workflow-template-versions/${versionId}/steps`, payload);
}

export async function updateStep(versionId: string, code: string, payload: StepPatchRequest): Promise<GenericSuccessEnvelope> {
  return http.patch<GenericSuccessEnvelope>(`/api/v1/workflow-template-versions/${versionId}/steps/${code}`, payload);
}

export async function deleteStep(versionId: string, code: string): Promise<GenericSuccessEnvelope> {
  return http.delete<GenericSuccessEnvelope>(`/api/v1/workflow-template-versions/${versionId}/steps/${code}`);
}

export async function reorder(versionId: string, payload: ReorderRequest): Promise<GenericSuccessEnvelope> {
  return http.post<GenericSuccessEnvelope>(`/api/v1/workflow-template-versions/${versionId}/steps/reorder`, payload);
}

export async function addEdge(versionId: string, payload: EdgeRequest): Promise<GenericSuccessEnvelope> {
  return http.post<GenericSuccessEnvelope>(`/api/v1/workflow-template-versions/${versionId}/edges`, payload);
}

export async function deleteEdge(versionId: string): Promise<GenericSuccessEnvelope> {
  return http.delete<GenericSuccessEnvelope>(`/api/v1/workflow-template-versions/${versionId}/edges`);
}

export async function positions(versionId: string, payload: NodePositionsRequest): Promise<GenericSuccessEnvelope> {
  return http.put<GenericSuccessEnvelope>(`/api/v1/workflow-template-versions/${versionId}/node-positions`, payload);
}

export async function publish(versionId: string, payload: VersionOnlyRequest): Promise<GenericSuccessEnvelope> {
  return http.post<GenericSuccessEnvelope>(`/api/v1/workflow-template-versions/${versionId}/publish`, payload);
}

export async function archive(versionId: string, payload: VersionOnlyRequest): Promise<GenericSuccessEnvelope> {
  return http.post<GenericSuccessEnvelope>(`/api/v1/workflow-template-versions/${versionId}/archive`, payload);
}
