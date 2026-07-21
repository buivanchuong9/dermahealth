import { http } from './http';
import { setAccessToken } from './authToken';
import type { KioskDeviceRegisteredResponseDto, KioskDeviceResponseDto, RegisterKioskDeviceRequest } from './types';

export async function register(payload: RegisterKioskDeviceRequest): Promise<{ success: true; data: KioskDeviceRegisteredResponseDto; meta: Record<string, any>; requestId: string; }> {
  const session = await http.post<{ success: true; data: KioskDeviceRegisteredResponseDto; meta: Record<string, any>; requestId: string; }>('/api/v1/kiosk-devices', payload, { auth: false });
  if (session && (session as any).accessToken) {
    setAccessToken((session as any).accessToken, (session as any).accessTokenExpiresAt || '');
  }
  return session;
}

export async function list(): Promise<{ success: true; data: KioskDeviceResponseDto[]; meta: Record<string, any>; requestId: string; }> {
  return http.get<{ success: true; data: KioskDeviceResponseDto[]; meta: Record<string, any>; requestId: string; }>('/api/v1/kiosk-devices');
}

export async function deactivate(deviceId: string, payload?: any): Promise<{ success: true; data: KioskDeviceResponseDto; meta: Record<string, any>; requestId: string; }> {
  return http.post<{ success: true; data: KioskDeviceResponseDto; meta: Record<string, any>; requestId: string; }>(`/api/v1/kiosk-devices/${deviceId}/deactivations`, payload);
}

export async function rotateSecret(deviceId: string, payload?: any): Promise<{ success: true; data: KioskDeviceRegisteredResponseDto; meta: Record<string, any>; requestId: string; }> {
  return http.post<{ success: true; data: KioskDeviceRegisteredResponseDto; meta: Record<string, any>; requestId: string; }>(`/api/v1/kiosk-devices/${deviceId}/credential-rotations`, payload);
}
