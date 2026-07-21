import { http } from './http';
import type { ReceptionSummaryResponseDto } from './types';

export async function summary(params: { clinicLocationId: string }): Promise<{ success: true; data: ReceptionSummaryResponseDto; meta: Record<string, any>; requestId: string; }> {
  const qs = new URLSearchParams();
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) qs.append(k, String(v));
    }
  }

  return http.get<{ success: true; data: ReceptionSummaryResponseDto; meta: Record<string, any>; requestId: string; }>(`/api/v1/reception/summary${qs.toString() ? '?' + qs.toString() : ''}`);
}
