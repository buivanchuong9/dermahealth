import { http } from './http';
import type { ConsentResponseDto, CreateConsentGrantRequest, CreateConsentWithdrawalRequest, GenericSuccessEnvelope, SetConsentRequest } from './types';

export async function list(patientId: string): Promise<{ success: true; data: ConsentResponseDto[]; meta: Record<string, any>; requestId: string; }> {
  return http.get<{ success: true; data: ConsentResponseDto[]; meta: Record<string, any>; requestId: string; }>(`/api/v1/patients/${patientId}/consents`);
}

export async function grant(patientId: string, payload: CreateConsentGrantRequest): Promise<{ success: true; data: ConsentResponseDto; meta: Record<string, any>; requestId: string; }> {
  return http.post<{ success: true; data: ConsentResponseDto; meta: Record<string, any>; requestId: string; }>(`/api/v1/patients/${patientId}/consent-grants`, payload);
}

export async function withdraw(patientId: string, payload: CreateConsentWithdrawalRequest): Promise<{ success: true; data: ConsentResponseDto; meta: Record<string, any>; requestId: string; }> {
  return http.post<{ success: true; data: ConsentResponseDto; meta: Record<string, any>; requestId: string; }>(`/api/v1/patients/${patientId}/consent-withdrawals`, payload);
}

export async function setConsent(patientId: string, type: string, payload: SetConsentRequest): Promise<GenericSuccessEnvelope> {
  return http.put<GenericSuccessEnvelope>(`/api/v1/patients/${patientId}/consents/${type}`, payload);
}
