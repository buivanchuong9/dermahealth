import { http } from './http';
import type { GenericSuccessEnvelope, LateResultDto, ReasonDto, TextDto } from './types';

export async function check(recordId: string): Promise<GenericSuccessEnvelope> {
  return http.get<GenericSuccessEnvelope>(`/api/v1/medical-records/${recordId}/completion-check`);
}

export async function sign(recordId: string, payload?: any): Promise<GenericSuccessEnvelope> {
  return http.post<GenericSuccessEnvelope>(`/api/v1/medical-records/${recordId}/sign`, payload);
}

export async function addendum(recordId: string, payload: TextDto): Promise<GenericSuccessEnvelope> {
  return http.post<GenericSuccessEnvelope>(`/api/v1/medical-records/${recordId}/addendum`, payload);
}

export async function reopen(recordId: string, payload: ReasonDto): Promise<GenericSuccessEnvelope> {
  return http.post<GenericSuccessEnvelope>(`/api/v1/medical-records/${recordId}/reopen`, payload);
}

export async function late(recordId: string, payload: LateResultDto): Promise<GenericSuccessEnvelope> {
  return http.post<GenericSuccessEnvelope>(`/api/v1/medical-records/${recordId}/flag-late-result`, payload);
}
