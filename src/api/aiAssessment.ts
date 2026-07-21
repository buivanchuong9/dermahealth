import { http } from './http';
import type { AIAssessmentResponseDto, GenericSuccessEnvelope, SubmitIntakeRequest, SubmitIntakeResponseDto } from './types';

export async function submitIntake(encounterId: string, payload: SubmitIntakeRequest): Promise<{ success: true; data: SubmitIntakeResponseDto; meta: Record<string, any>; requestId: string; }> {
  return http.post<{ success: true; data: SubmitIntakeResponseDto; meta: Record<string, any>; requestId: string; }>(`/api/v1/encounters/${encounterId}/intake`, payload);
}

export async function list(encounterId: string): Promise<{ success: true; data: AIAssessmentResponseDto[]; meta: Record<string, any>; requestId: string; }> {
  return http.get<{ success: true; data: AIAssessmentResponseDto[]; meta: Record<string, any>; requestId: string; }>(`/api/v1/encounters/${encounterId}/ai-assessments`);
}

export async function reassess(encounterId: string, payload: SubmitIntakeRequest): Promise<{ success: true; data: SubmitIntakeResponseDto; meta: Record<string, any>; requestId: string; }> {
  return http.post<{ success: true; data: SubmitIntakeResponseDto; meta: Record<string, any>; requestId: string; }>(`/api/v1/encounters/${encounterId}/ai-assessments/reassessments`, payload);
}

export async function reassessAlias(encounterId: string, payload: SubmitIntakeRequest): Promise<GenericSuccessEnvelope> {
  return http.post<GenericSuccessEnvelope>(`/api/v1/encounters/${encounterId}/ai-assessments/reassess`, payload);
}

export async function detail(assessmentId: string): Promise<{ success: true; data: AIAssessmentResponseDto; meta: Record<string, any>; requestId: string; }> {
  return http.get<{ success: true; data: AIAssessmentResponseDto; meta: Record<string, any>; requestId: string; }>(`/api/v1/ai-assessments/${assessmentId}`);
}
