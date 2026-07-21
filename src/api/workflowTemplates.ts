import { http } from './http';
import type { CreateWorkflowTemplateRequest, GenericSuccessEnvelope, UpdateWorkflowTemplateRequest } from './types';

export async function list(): Promise<GenericSuccessEnvelope> {
  return http.get<GenericSuccessEnvelope>('/api/v1/workflow-templates');
}

export async function create(payload: CreateWorkflowTemplateRequest): Promise<GenericSuccessEnvelope> {
  return http.post<GenericSuccessEnvelope>('/api/v1/workflow-templates', payload);
}

export async function recommend(): Promise<GenericSuccessEnvelope> {
  return http.get<GenericSuccessEnvelope>('/api/v1/workflow-templates/recommend');
}

export async function update(templateId: string, payload: UpdateWorkflowTemplateRequest): Promise<GenericSuccessEnvelope> {
  return http.patch<GenericSuccessEnvelope>(`/api/v1/workflow-templates/${templateId}`, payload);
}

export async function versions(templateId: string): Promise<GenericSuccessEnvelope> {
  return http.get<GenericSuccessEnvelope>(`/api/v1/workflow-templates/${templateId}/versions`);
}

export async function createVersion(templateId: string, payload?: any): Promise<GenericSuccessEnvelope> {
  return http.post<GenericSuccessEnvelope>(`/api/v1/workflow-templates/${templateId}/versions`, payload);
}
