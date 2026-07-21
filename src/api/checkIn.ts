import { http } from './http';
import type { CheckInResponseDto, CreateCheckInRequest } from './types';

// Primary check-in endpoint: POST /api/v1/check-ins
export async function checkIn(
  payload: CreateCheckInRequest,
): Promise<{ success: true; data: CheckInResponseDto; meta: Record<string, any>; requestId: string }> {
  return http.post('/api/v1/check-ins', payload);
}
