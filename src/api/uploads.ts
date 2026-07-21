import { http } from './http';
import type { ConfirmUploadRequest, GenericSuccessEnvelope, PresignRequest } from './types';

export async function presign(payload: PresignRequest): Promise<GenericSuccessEnvelope> {
  return http.post<GenericSuccessEnvelope>('/api/v1/uploads/presign', payload);
}

export async function confirm(fileId: string, payload: ConfirmUploadRequest): Promise<GenericSuccessEnvelope> {
  return http.post<GenericSuccessEnvelope>(`/api/v1/uploads/${fileId}/confirm`, payload);
}
