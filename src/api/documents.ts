import { http } from './http';
import type { GenericSuccessEnvelope, ReasonDto } from './types';

export async function review(documentId: string, payload?: any): Promise<GenericSuccessEnvelope> {
  return http.post<GenericSuccessEnvelope>(`/api/v1/documents/${documentId}/review`, payload);
}

export async function flag(documentId: string, payload: ReasonDto): Promise<GenericSuccessEnvelope> {
  return http.post<GenericSuccessEnvelope>(`/api/v1/documents/${documentId}/flag-incorrect-link`, payload);
}
