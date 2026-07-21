import { http } from './http';
import type { ApproveClinicalPlanRequest, ClinicalPlanResponseDto, DoctorDiagnosisResponseDto, DoctorReviewResponseDto, GenericSuccessEnvelope, RecordDiagnosisRequest, ReviewAssessmentRequest, ReviseDiagnosisRequest } from './types';

export async function reviewAssessment(encounterId: string, aiAssessmentId: string, payload: ReviewAssessmentRequest): Promise<{ success: true; data: DoctorReviewResponseDto; meta: Record<string, any>; requestId: string; }> {
  return http.post<{ success: true; data: DoctorReviewResponseDto; meta: Record<string, any>; requestId: string; }>(`/api/v1/encounters/${encounterId}/ai-assessments/${aiAssessmentId}/reviews`, payload);
}

export async function reviewAssessmentAlias(encounterId: string, aiAssessmentId: string, payload: ReviewAssessmentRequest): Promise<GenericSuccessEnvelope> {
  return http.post<GenericSuccessEnvelope>(`/api/v1/encounters/${encounterId}/ai-assessments/${aiAssessmentId}/review`, payload);
}

export async function listReviews(encounterId: string): Promise<{ success: true; data: DoctorReviewResponseDto[]; meta: Record<string, any>; requestId: string; }> {
  return http.get<{ success: true; data: DoctorReviewResponseDto[]; meta: Record<string, any>; requestId: string; }>(`/api/v1/encounters/${encounterId}/reviews`);
}

export async function recordDiagnosis(encounterId: string, payload: RecordDiagnosisRequest): Promise<{ success: true; data: DoctorDiagnosisResponseDto; meta: Record<string, any>; requestId: string; }> {
  return http.post<{ success: true; data: DoctorDiagnosisResponseDto; meta: Record<string, any>; requestId: string; }>(`/api/v1/encounters/${encounterId}/diagnoses`, payload);
}

export async function listDiagnoses(encounterId: string): Promise<{ success: true; data: DoctorDiagnosisResponseDto[]; meta: Record<string, any>; requestId: string; }> {
  return http.get<{ success: true; data: DoctorDiagnosisResponseDto[]; meta: Record<string, any>; requestId: string; }>(`/api/v1/encounters/${encounterId}/diagnoses`);
}

export async function approveClinicalPlan(encounterId: string, payload: ApproveClinicalPlanRequest): Promise<{ success: true; data: ClinicalPlanResponseDto; meta: Record<string, any>; requestId: string; }> {
  return http.post<{ success: true; data: ClinicalPlanResponseDto; meta: Record<string, any>; requestId: string; }>(`/api/v1/encounters/${encounterId}/clinical-plan`, payload);
}

export async function getClinicalPlan(encounterId: string): Promise<{ success: true; data: ClinicalPlanResponseDto; meta: Record<string, any>; requestId: string; }> {
  return http.get<{ success: true; data: ClinicalPlanResponseDto; meta: Record<string, any>; requestId: string; }>(`/api/v1/encounters/${encounterId}/clinical-plan`);
}

export async function reviseDiagnosis(diagnosisId: string, payload: ReviseDiagnosisRequest): Promise<{ success: true; data: DoctorDiagnosisResponseDto; meta: Record<string, any>; requestId: string; }> {
  return http.post<{ success: true; data: DoctorDiagnosisResponseDto; meta: Record<string, any>; requestId: string; }>(`/api/v1/diagnoses/${diagnosisId}/revisions`, payload);
}

export async function reviseDiagnosisAlias(diagnosisId: string, payload: ReviseDiagnosisRequest): Promise<GenericSuccessEnvelope> {
  return http.post<GenericSuccessEnvelope>(`/api/v1/diagnoses/${diagnosisId}/revise`, payload);
}
