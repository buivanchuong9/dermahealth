import type {
  Appointment,
  AppointmentCheckInToken,
} from "../domain/core/entities";
import { http } from "./http";

export interface ApiCheckInToken {
  id: string;
  appointmentId: string;
  status: AppointmentCheckInToken["status"];
  issuedAt: string;
  validFrom: string;
  expiresAt: string;
  version: number;
  token?: string;
}

export interface ApiAppointment {
  id: string;
  organizationId: string;
  clinicLocationId: string;
  patientId: string;
  doctorId: string;
  department: string;
  consultationType: string | null;
  mode: Appointment["mode"];
  status: Appointment["status"];
  startAt: string;
  endAt: string;
  encounterId: string | null;
  cancelReason: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  checkInToken?: ApiCheckInToken | null;
}

export interface CreateAppointmentRequest {
  slotId: string;
  mode: Appointment["mode"];
  consultationType?: string;
  onBehalfOfPatientId?: string;
}

const localDate = (iso: string) =>
  new Intl.DateTimeFormat("vi-VN").format(new Date(iso));

const localTime = (iso: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));

export const mapAppointment = (row: ApiAppointment): Appointment => ({
  id: row.id as Appointment["id"],
  patientId: row.patientId as Appointment["patientId"],
  doctorId: row.doctorId as Appointment["doctorId"],
  clinicLocationId: row.clinicLocationId,
  department: row.department,
  consultationType: row.consultationType ?? undefined,
  mode: row.mode,
  status: row.status,
  date: localDate(row.startAt),
  time: localTime(row.startAt),
  startAt: row.startAt,
  endAt: row.endAt,
  cancelReason: row.cancelReason ?? undefined,
  version: row.version,
  encounterId: (row.encounterId ?? undefined) as Appointment["encounterId"],
});

export async function listAppointments(): Promise<Appointment[]> {
  const rows = await http.get<ApiAppointment[]>("/api/v1/appointments");
  return rows.map(mapAppointment);
}

export async function getAppointment(
  appointmentId: string,
): Promise<Appointment> {
  const row = await http.get<ApiAppointment>(
    `/api/v1/appointments/${encodeURIComponent(appointmentId)}`,
  );
  return mapAppointment(row);
}

export async function createAppointment(
  payload: CreateAppointmentRequest,
): Promise<Appointment> {
  const row = await http.post<ApiAppointment>("/api/v1/appointments", payload);
  return mapAppointment(row);
}

export async function cancelAppointment(
  appointmentId: string,
  payload: { reason: string; version: number },
): Promise<Appointment> {
  const row = await http.post<ApiAppointment>(
    `/api/v1/appointments/${encodeURIComponent(appointmentId)}/cancellations`,
    payload,
  );
  return mapAppointment(row);
}

export async function rescheduleAppointment(
  appointmentId: string,
  payload: { slotId: string; version: number },
): Promise<Appointment> {
  const row = await http.post<ApiAppointment>(
    `/api/v1/appointments/${encodeURIComponent(appointmentId)}/reschedules`,
    payload,
  );
  return mapAppointment(row);
}

export async function markAppointmentMissed(
  appointmentId: string,
  version: number,
): Promise<Appointment> {
  const row = await http.post<ApiAppointment>(
    `/api/v1/appointments/${encodeURIComponent(appointmentId)}/missed-markings`,
    { version },
  );
  return mapAppointment(row);
}

export const issueCheckInToken = (appointmentId: string) =>
  http.post<ApiCheckInToken>(
    `/api/v1/appointments/${encodeURIComponent(appointmentId)}/check-in-tokens`,
  );

export const revokeCheckInToken = (
  appointmentId: string,
  reason: string,
) =>
  http.post<{ revoked: boolean }>(
    `/api/v1/appointments/${encodeURIComponent(appointmentId)}/check-in-tokens/revocations`,
    { reason },
  );

// Các endpoint số ít được giữ để tương thích với phiên bản API cũ trong Swagger.
export const updateAppointmentStatusLegacy = (appointmentId: string) =>
  http.patch<string>(
    `/api/v1/appointments/${encodeURIComponent(appointmentId)}/status`,
    {},
  );

export const issueCheckInTokenLegacy = (appointmentId: string) =>
  http.post<string>(
    `/api/v1/appointments/${encodeURIComponent(appointmentId)}/check-in-token`,
  );

export const revokeCheckInTokenLegacy = (
  appointmentId: string,
  reason: string,
) =>
  http.post<string>(
    `/api/v1/appointments/${encodeURIComponent(appointmentId)}/check-in-token/revoke`,
    { reason },
  );
