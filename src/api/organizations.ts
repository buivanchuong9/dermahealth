import { http } from './http';
import type { OrganizationResponseDto } from './types';

export async function list(): Promise<{ success: true; data: OrganizationResponseDto[]; meta: Record<string, any>; requestId: string; }> {
  return http.get<{ success: true; data: OrganizationResponseDto[]; meta: Record<string, any>; requestId: string; }>('/api/v1/organizations');
}
