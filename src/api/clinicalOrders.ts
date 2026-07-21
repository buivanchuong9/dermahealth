import { http } from './http';
import type { ClinicalOrderResponseDto, ClinicalResultResponseDto, CreateClinicalOrderRequest, InvalidSampleRequest, SubmitResultRequest } from './types';

export async function create(encounterId: string, payload: CreateClinicalOrderRequest): Promise<{ success: true; data: ClinicalOrderResponseDto; meta: Record<string, any>; requestId: string; }> {
  return http.post<{ success: true; data: ClinicalOrderResponseDto; meta: Record<string, any>; requestId: string; }>(`/api/v1/encounters/${encounterId}/clinical-orders`, payload);
}

export async function list(encounterId: string): Promise<{ success: true; data: ClinicalOrderResponseDto[]; meta: Record<string, any>; requestId: string; }> {
  return http.get<{ success: true; data: ClinicalOrderResponseDto[]; meta: Record<string, any>; requestId: string; }>(`/api/v1/encounters/${encounterId}/clinical-orders`);
}

export async function markInvalidSample(orderId: string, payload: InvalidSampleRequest): Promise<{ success: true; data: ClinicalOrderResponseDto; meta: Record<string, any>; requestId: string; }> {
  return http.patch<{ success: true; data: ClinicalOrderResponseDto; meta: Record<string, any>; requestId: string; }>(`/api/v1/clinical-orders/${orderId}/invalid-sample`, payload);
}

export async function submitResult(orderId: string, payload: SubmitResultRequest): Promise<{ success: true; data: ClinicalResultResponseDto; meta: Record<string, any>; requestId: string; }> {
  return http.post<{ success: true; data: ClinicalResultResponseDto; meta: Record<string, any>; requestId: string; }>(`/api/v1/clinical-orders/${orderId}/result`, payload);
}

export async function getResult(orderId: string): Promise<{ success: true; data: ClinicalResultResponseDto; meta: Record<string, any>; requestId: string; }> {
  return http.get<{ success: true; data: ClinicalResultResponseDto; meta: Record<string, any>; requestId: string; }>(`/api/v1/clinical-orders/${orderId}/result`);
}
