import { http } from './http';
import type { GenericSuccessEnvelope } from './types';

export async function list(params: { userId: string, scope: string }): Promise<GenericSuccessEnvelope> {
  const qs = new URLSearchParams();
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) qs.append(k, String(v));
    }
  }

  return http.get<GenericSuccessEnvelope>(`/api/v1/notifications${qs.toString() ? '?' + qs.toString() : ''}`);
}

export async function unread(params: { userId: string }): Promise<GenericSuccessEnvelope> {
  const qs = new URLSearchParams();
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) qs.append(k, String(v));
    }
  }

  return http.get<GenericSuccessEnvelope>(`/api/v1/notifications/unread-count${qs.toString() ? '?' + qs.toString() : ''}`);
}

export async function read(notificationId: string, payload?: any): Promise<GenericSuccessEnvelope> {
  return http.post<GenericSuccessEnvelope>(`/api/v1/notifications/${notificationId}/read`, payload);
}

export async function retry(notificationId: string, payload?: any): Promise<GenericSuccessEnvelope> {
  return http.post<GenericSuccessEnvelope>(`/api/v1/notifications/${notificationId}/retry`, payload);
}
