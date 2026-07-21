import { http } from './http';
import type { AppointmentResponseDto, AppointmentWithCheckInTokenResponseDto, CancelAppointmentRequest, CheckInTokenIssuedResponseDto, CreateAppointmentRequest, GenericSuccessEnvelope, MarkMissedRequest, RescheduleAppointmentRequest, RevokeCheckInTokenRequest, RevokeCheckInTokenResponseDto, SetAppointmentStatusRequest } from './types';

export async function list(): Promise<{ success: true; data: AppointmentResponseDto[]; meta: Record<string, any>; requestId: string; }> {
  return http.get<{ success: true; data: AppointmentResponseDto[]; meta: Record<string, any>; requestId: string; }>('/api/v1/appointments');
}

export async function book(payload: CreateAppointmentRequest): Promise<{ success: true; data: AppointmentWithCheckInTokenResponseDto; meta: Record<string, any>; requestId: string; }> {
  return http.post<{ success: true; data: AppointmentWithCheckInTokenResponseDto; meta: Record<string, any>; requestId: string; }>('/api/v1/appointments', payload);
}

export async function detail(appointmentId: string): Promise<{ success: true; data: AppointmentResponseDto; meta: Record<string, any>; requestId: string; }> {
  return http.get<{ success: true; data: AppointmentResponseDto; meta: Record<string, any>; requestId: string; }>(`/api/v1/appointments/${appointmentId}`);
}

export async function cancel(appointmentId: string, payload: CancelAppointmentRequest): Promise<{ success: true; data: AppointmentResponseDto; meta: Record<string, any>; requestId: string; }> {
  return http.post<{ success: true; data: AppointmentResponseDto; meta: Record<string, any>; requestId: string; }>(`/api/v1/appointments/${appointmentId}/cancellations`, payload);
}

export async function reschedule(appointmentId: string, payload: RescheduleAppointmentRequest): Promise<{ success: true; data: AppointmentWithCheckInTokenResponseDto; meta: Record<string, any>; requestId: string; }> {
  return http.post<{ success: true; data: AppointmentWithCheckInTokenResponseDto; meta: Record<string, any>; requestId: string; }>(`/api/v1/appointments/${appointmentId}/reschedules`, payload);
}

export async function markMissed(appointmentId: string, payload: MarkMissedRequest): Promise<{ success: true; data: AppointmentResponseDto; meta: Record<string, any>; requestId: string; }> {
  return http.post<{ success: true; data: AppointmentResponseDto; meta: Record<string, any>; requestId: string; }>(`/api/v1/appointments/${appointmentId}/missed-markings`, payload);
}

export async function issueCheckInToken(appointmentId: string, payload?: any): Promise<{ success: true; data: CheckInTokenIssuedResponseDto; meta: Record<string, any>; requestId: string; }> {
  return http.post<{ success: true; data: CheckInTokenIssuedResponseDto; meta: Record<string, any>; requestId: string; }>(`/api/v1/appointments/${appointmentId}/check-in-tokens`, payload);
}

export async function revokeCheckInToken(appointmentId: string, payload: RevokeCheckInTokenRequest): Promise<{ success: true; data: RevokeCheckInTokenResponseDto; meta: Record<string, any>; requestId: string; }> {
  return http.post<{ success: true; data: RevokeCheckInTokenResponseDto; meta: Record<string, any>; requestId: string; }>(`/api/v1/appointments/${appointmentId}/check-in-tokens/revocations`, payload);
}

export async function setStatus(appointmentId: string, payload: SetAppointmentStatusRequest): Promise<GenericSuccessEnvelope> {
  return http.patch<GenericSuccessEnvelope>(`/api/v1/appointments/${appointmentId}/status`, payload);
}

export async function issueCheckInTokenAlias(appointmentId: string, payload?: any): Promise<GenericSuccessEnvelope> {
  return http.post<GenericSuccessEnvelope>(`/api/v1/appointments/${appointmentId}/check-in-token`, payload);
}

export async function revokeCheckInTokenAlias(appointmentId: string, payload: RevokeCheckInTokenRequest): Promise<GenericSuccessEnvelope> {
  return http.post<GenericSuccessEnvelope>(`/api/v1/appointments/${appointmentId}/check-in-token/revoke`, payload);
}
