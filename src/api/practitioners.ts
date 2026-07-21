import { http } from './http';
import type { PractitionerAvailabilityResponseDto, PractitionerResponseDto } from './types';

export async function list(): Promise<{ success: true; data: PractitionerResponseDto[]; meta: Record<string, any>; requestId: string; }> {
  return http.get<{ success: true; data: PractitionerResponseDto[]; meta: Record<string, any>; requestId: string; }>('/api/v1/practitioners');
}

export async function availability(practitionerId: string): Promise<{ success: true; data: PractitionerAvailabilityResponseDto; meta: Record<string, any>; requestId: string; }> {
  return http.get<{ success: true; data: PractitionerAvailabilityResponseDto; meta: Record<string, any>; requestId: string; }>(`/api/v1/practitioners/${practitionerId}/availability`);
}
