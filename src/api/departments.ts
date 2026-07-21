import { http } from './http';
import type { DepartmentResponseDto } from './types';

export async function list(): Promise<{ success: true; data: DepartmentResponseDto[]; meta: Record<string, any>; requestId: string; }> {
  return http.get<{ success: true; data: DepartmentResponseDto[]; meta: Record<string, any>; requestId: string; }>('/api/v1/departments');
}
