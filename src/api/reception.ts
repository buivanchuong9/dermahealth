import type { QueueTicket } from "../domain/core/entities";
import { http } from "./http";
import { mapQueueTicket, type ApiQueueTicket } from "./queue";

export interface ReceptionSummary {
  upcomingAppointments: number;
  waitingCount: number;
  inServiceCount: number;
}

export interface CheckInRequest {
  token: string;
  clinicLocationId: string;
  deviceId: string;
  deviceSecret: string;
  patientId?: string;
}

interface ApiCheckInResult {
  ticket: ApiQueueTicket;
}

export interface KioskDevice {
  id: string;
  organizationId: string;
  clinicLocationId: string;
  label: string;
  status: "active" | "inactive" | string;
  createdAt: string;
  deviceSecret?: string;
}

export const getReceptionSummary = (clinicLocationId: string) => {
  const query = new URLSearchParams({ clinicLocationId });
  return http.get<ReceptionSummary>(`/api/v1/reception/summary?${query}`);
};

export async function checkIn(payload: CheckInRequest): Promise<QueueTicket> {
  const result = await http.post<ApiCheckInResult>(
    "/api/v1/check-ins",
    payload,
    { auth: false },
  );
  return mapQueueTicket(result.ticket);
}

// Endpoint số ít được giữ cho các bản backend cũ.
export const checkInLegacy = (payload: CheckInRequest) =>
  http.post<string>("/api/v1/check-in", payload, { auth: false });

export const listKioskDevices = () =>
  http.get<KioskDevice[]>("/api/v1/kiosk-devices");

export const createKioskDevice = (payload: {
  clinicLocationId: string;
  label: string;
}) => http.post<KioskDevice>("/api/v1/kiosk-devices", payload);

export const deactivateKioskDevice = (deviceId: string) =>
  http.post<KioskDevice>(
    `/api/v1/kiosk-devices/${encodeURIComponent(deviceId)}/deactivations`,
  );

export const rotateKioskDeviceCredentials = (deviceId: string) =>
  http.post<KioskDevice>(
    `/api/v1/kiosk-devices/${encodeURIComponent(deviceId)}/credential-rotations`,
  );
