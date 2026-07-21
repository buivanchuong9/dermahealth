import { http } from './http';
import type { ActivateWorkflowRequest, CloseEncounterRequest, CreateEncounterRequest, DiagnosisDto, DischargeDto, DocumentDto, EncounterEventResponseDto, EncounterResponseDto, GenericSuccessEnvelope, PrescriptionDto, TransitionEncounterRequest } from './types';

export async function list(): Promise<{ success: true; data: EncounterResponseDto[]; meta: Record<string, any>; requestId: string; }> {
  return http.get<{ success: true; data: EncounterResponseDto[]; meta: Record<string, any>; requestId: string; }>('/api/v1/encounters');
}

export async function create(payload: CreateEncounterRequest): Promise<{ success: true; data: EncounterResponseDto; meta: Record<string, any>; requestId: string; }> {
  return http.post<{ success: true; data: EncounterResponseDto; meta: Record<string, any>; requestId: string; }>('/api/v1/encounters', payload);
}

export async function active(): Promise<{ success: true; data: EncounterResponseDto; meta: Record<string, any>; requestId: string; }> {
  return http.get<{ success: true; data: EncounterResponseDto; meta: Record<string, any>; requestId: string; }>('/api/v1/encounters/active');
}

export async function detail(encounterId: string): Promise<{ success: true; data: EncounterResponseDto; meta: Record<string, any>; requestId: string; }> {
  return http.get<{ success: true; data: EncounterResponseDto; meta: Record<string, any>; requestId: string; }>(`/api/v1/encounters/${encounterId}`);
}

export async function events(encounterId: string): Promise<{ success: true; data: EncounterEventResponseDto[]; meta: Record<string, any>; requestId: string; }> {
  return http.get<{ success: true; data: EncounterEventResponseDto[]; meta: Record<string, any>; requestId: string; }>(`/api/v1/encounters/${encounterId}/events`);
}

export async function transition(encounterId: string, payload: TransitionEncounterRequest): Promise<{ success: true; data: EncounterResponseDto; meta: Record<string, any>; requestId: string; }> {
  return http.post<{ success: true; data: EncounterResponseDto; meta: Record<string, any>; requestId: string; }>(`/api/v1/encounters/${encounterId}/transitions`, payload);
}

export async function close(encounterId: string, payload: CloseEncounterRequest): Promise<{ success: true; data: EncounterResponseDto; meta: Record<string, any>; requestId: string; }> {
  return http.post<{ success: true; data: EncounterResponseDto; meta: Record<string, any>; requestId: string; }>(`/api/v1/encounters/${encounterId}/closures`, payload);
}

export async function transitionAlias(encounterId: string, payload: TransitionEncounterRequest): Promise<GenericSuccessEnvelope> {
  return http.post<GenericSuccessEnvelope>(`/api/v1/encounters/${encounterId}/transition`, payload);
}

export async function closeAlias(encounterId: string, payload: CloseEncounterRequest): Promise<GenericSuccessEnvelope> {
  return http.post<GenericSuccessEnvelope>(`/api/v1/encounters/${encounterId}/close`, payload);
}

export async function activate(encounterId: string, payload: ActivateWorkflowRequest): Promise<GenericSuccessEnvelope> {
  return http.post<GenericSuccessEnvelope>(`/api/v1/encounters/${encounterId}/workflow/activate`, payload);
}

export async function get(encounterId: string): Promise<GenericSuccessEnvelope> {
  return http.get<GenericSuccessEnvelope>(`/api/v1/encounters/${encounterId}/medical-record`);
}

export async function prescribe(encounterId: string, payload: PrescriptionDto): Promise<GenericSuccessEnvelope> {
  return http.post<GenericSuccessEnvelope>(`/api/v1/encounters/${encounterId}/prescriptions`, payload);
}

export async function prescriptions(encounterId: string): Promise<GenericSuccessEnvelope> {
  return http.get<GenericSuccessEnvelope>(`/api/v1/encounters/${encounterId}/prescriptions`);
}

export async function document(encounterId: string, payload: DocumentDto): Promise<GenericSuccessEnvelope> {
  return http.post<GenericSuccessEnvelope>(`/api/v1/encounters/${encounterId}/documents`, payload);
}

export async function documents(encounterId: string): Promise<GenericSuccessEnvelope> {
  return http.get<GenericSuccessEnvelope>(`/api/v1/encounters/${encounterId}/documents`);
}

export async function diagnosis(encounterId: string, payload: DiagnosisDto): Promise<GenericSuccessEnvelope> {
  return http.patch<GenericSuccessEnvelope>(`/api/v1/encounters/${encounterId}/medical-record/diagnosis`, payload);
}

export async function discharge(encounterId: string, payload: DischargeDto): Promise<GenericSuccessEnvelope> {
  return http.patch<GenericSuccessEnvelope>(`/api/v1/encounters/${encounterId}/medical-record/discharge-followup`, payload);
}
