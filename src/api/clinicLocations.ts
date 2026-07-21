import { http } from './http';
import type { ClinicLocationResponseDto } from './types';

export async function list(): Promise<{ success: true; data: ClinicLocationResponseDto[]; meta: Record<string, any>; requestId: string; }> {
  return http.get<{ success: true; data: ClinicLocationResponseDto[]; meta: Record<string, any>; requestId: string; }>('/api/v1/clinic-locations');
}
