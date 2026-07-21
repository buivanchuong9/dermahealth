import { http } from './http';
import type { AlertRequest, EncounterRequestDto, GenericSuccessEnvelope, PatientDetailResponseDto, PatientResponseDto, PhotoRequest, ReminderRequest, UpdatePatientRequest } from './types';

export async function list(): Promise<{ success: true; data: PatientResponseDto[]; meta: Record<string, any>; requestId: string; }> {
  return http.get<{ success: true; data: PatientResponseDto[]; meta: Record<string, any>; requestId: string; }>('/api/v1/patients');
}

export async function self(): Promise<{ success: true; data: PatientDetailResponseDto; meta: Record<string, any>; requestId: string; }> {
  return http.get<{ success: true; data: PatientDetailResponseDto; meta: Record<string, any>; requestId: string; }>('/api/v1/patients/me');
}

export async function detail(patientId: string): Promise<{ success: true; data: PatientDetailResponseDto; meta: Record<string, any>; requestId: string; }> {
  return http.get<{ success: true; data: PatientDetailResponseDto; meta: Record<string, any>; requestId: string; }>(`/api/v1/patients/${patientId}`);
}

export async function update(patientId: string, payload: UpdatePatientRequest): Promise<{ success: true; data: PatientResponseDto; meta: Record<string, any>; requestId: string; }> {
  return http.patch<{ success: true; data: PatientResponseDto; meta: Record<string, any>; requestId: string; }>(`/api/v1/patients/${patientId}`, payload);
}

export async function carePlan(patientId: string): Promise<GenericSuccessEnvelope> {
  return http.get<GenericSuccessEnvelope>(`/api/v1/patients/${patientId}/care-plan`);
}

export async function createAlert(patientId: string, payload: AlertRequest): Promise<GenericSuccessEnvelope> {
  return http.post<GenericSuccessEnvelope>(`/api/v1/patients/${patientId}/alerts`, payload);
}

export async function alerts(patientId: string): Promise<GenericSuccessEnvelope> {
  return http.get<GenericSuccessEnvelope>(`/api/v1/patients/${patientId}/alerts`);
}

export async function encounterRequest(patientId: string, payload: EncounterRequestDto): Promise<GenericSuccessEnvelope> {
  return http.post<GenericSuccessEnvelope>(`/api/v1/patients/${patientId}/encounter-requests`, payload);
}

export async function reminders(patientId: string): Promise<GenericSuccessEnvelope> {
  return http.get<GenericSuccessEnvelope>(`/api/v1/patients/${patientId}/medication-reminders`);
}

export async function addReminder(patientId: string, payload: ReminderRequest): Promise<GenericSuccessEnvelope> {
  return http.post<GenericSuccessEnvelope>(`/api/v1/patients/${patientId}/medication-reminders`, payload);
}

export async function progressPhoto(patientId: string, payload: PhotoRequest): Promise<GenericSuccessEnvelope> {
  return http.post<GenericSuccessEnvelope>(`/api/v1/patients/${patientId}/progress-photos`, payload);
}

export async function healthSummary(patientId: string): Promise<GenericSuccessEnvelope> {
  return http.get<GenericSuccessEnvelope>(`/api/v1/patients/${patientId}/health-summary`);
}

export async function healthHistory(patientId: string): Promise<GenericSuccessEnvelope> {
  return http.get<GenericSuccessEnvelope>(`/api/v1/patients/${patientId}/health-score-history`);
}

export async function overview(patientId: string): Promise<GenericSuccessEnvelope> {
  return http.get<GenericSuccessEnvelope>(`/api/v1/patients/${patientId}/reports/overview`);
}

export async function treatment(patientId: string): Promise<GenericSuccessEnvelope> {
  return http.get<GenericSuccessEnvelope>(`/api/v1/patients/${patientId}/reports/treatment-history`);
}

export async function medicine(patientId: string): Promise<GenericSuccessEnvelope> {
  return http.get<GenericSuccessEnvelope>(`/api/v1/patients/${patientId}/reports/medicine-history`);
}

export async function ai(patientId: string): Promise<GenericSuccessEnvelope> {
  return http.get<GenericSuccessEnvelope>(`/api/v1/patients/${patientId}/reports/ai-summary`);
}

export async function exportReport(patientId: string): Promise<GenericSuccessEnvelope> {
  return http.get<GenericSuccessEnvelope>(`/api/v1/patients/${patientId}/reports/export`);
}
