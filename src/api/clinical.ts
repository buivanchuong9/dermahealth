import { http } from "./http";
import type { Patient, User } from "../domain/core/entities";
export {
  createAppointment,
  getAppointment,
  listAppointments,
} from "./appointments";

export interface ApiPatient {
  id: string;
  code: string;
  userId: string | null;
  organizationId: string;
  name: string;
  dob: string;
  gender: string;
  phone: string;
  email: string | null;
  address: string | null;
  bloodType: string;
  heightCm: number | null;
  weightKg: number | null;
  primaryDoctor: { id: string; code?: string; name: string } | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  activeAppointmentCount?: number;
  activeEncounterId?: string | null;
  activeCarePlanId?: string | null;
  consentSummary?: Array<{
    type: string;
    granted: boolean;
    policyVersion: string;
  }>;
}

export interface UpdatePatientRequest {
  name?: string;
  dob?: string;
  gender?: string;
  phone?: string;
  email?: string | null;
  address?: string | null;
  bloodType?: string;
  heightCm?: number | null;
  weightKg?: number | null;
  primaryDoctorId?: string | null;
  version: number;
}

export interface ApiConsent {
  id: string;
  patientId: string;
  type: string;
  policyVersion: string;
  granted: boolean;
  grantedAt: string | null;
  withdrawnAt: string | null;
  version: number;
}
export interface ApiPractitioner {
  id: string;
  displayName: string;
  avatarFileId: string | null;
  title: string | null;
  bio: string | null;
  status: string;
  specialties: Array<{
    id: string;
    code: string;
    name: string;
    primary: boolean;
  }>;
  clinicAssignments: Array<{
    clinicLocationId: string;
    clinicName: string;
    departmentId: string;
    departmentCode: string;
    departmentName: string;
    slotDurationMinutes: number;
    capacity: number;
  }>;
}
export interface AvailabilitySlot {
  slotId: string;
  startsAt: string;
  endsAt: string;
  remainingCapacity: number;
  capacity?: number;
  bookedCount?: number;
  status?:
    | "AVAILABLE"
    | "FULL"
    | "BLOCKED"
    | "BREAK"
    | "LEAVE"
    | "PAST"
    | "CANCELLED";
  selectable?: boolean;
  unavailableReason?: {
    code: string;
    display: string;
  } | null;
}
export interface PractitionerAvailability {
  practitionerId: string;
  clinicLocationId: string;
  timezone: string | null;
  date: string;
  workingDay?: boolean;
  slotDurationMinutes: number | null;
  capacity: number | null;
  defaultCapacity?: number | null;
  schedule?: {
    startsAt: string;
    endsAt: string;
    breaks: Array<{
      startsAt: string;
      endsAt: string;
      reasonCode: string;
    }>;
  } | null;
  slots: AvailabilitySlot[];
  nextAvailableDates?: Array<{
    date: string;
    availableSlotCount: number;
    firstAvailableAt: string;
  }>;
  generatedAt?: string;
}
export interface Practitioner extends User {
  clinicLocationId?: string;
  clinicName?: string;
}

export const mapApiPatient = (row: ApiPatient): Patient => ({
  id: row.id as Patient["id"],
  userId: row.userId ? (row.userId as Patient["userId"]) : undefined,
  code: row.code,
  name: row.name,
  primaryDoctorId: (row.primaryDoctor?.id ?? "") as Patient["primaryDoctorId"],
  profile: {
    dob: row.dob,
    gender: row.gender,
    phone: row.phone,
    email: row.email ?? "",
    address: row.address ?? "",
    bloodType: row.bloodType,
    heightCm: row.heightCm ?? undefined,
    weightKg: row.weightKg ?? undefined,
  },
});

export async function getCurrentPatient(): Promise<Patient> {
  const row = await getCurrentPatientDetails();
  return mapApiPatient(row);
}
export function getCurrentPatientDetails(): Promise<ApiPatient> {
  return http.get<ApiPatient>("/api/v1/patients/me");
}
export async function getPatient(patientId: string): Promise<Patient> {
  const row = await getPatientDetails(patientId);
  return mapApiPatient(row);
}
export function getPatientDetails(patientId: string): Promise<ApiPatient> {
  return http.get<ApiPatient>(
    `/api/v1/patients/${encodeURIComponent(patientId)}`,
  );
}
export function updatePatient(
  patientId: string,
  payload: UpdatePatientRequest,
): Promise<ApiPatient> {
  return http.patch<ApiPatient>(
    `/api/v1/patients/${encodeURIComponent(patientId)}`,
    payload,
  );
}
export function updateCurrentPatient(
  payload: UpdatePatientRequest,
): Promise<ApiPatient> {
  return http.patch<ApiPatient>("/api/v1/patients/me", payload);
}

export interface CreateSelfPatientRequest {
  dob: string;
  gender: string;
  phone: string;
  address?: string | null;
  bloodType?: string;
  heightCm?: number | null;
  weightKg?: number | null;
}
export function createSelfPatient(
  payload: CreateSelfPatientRequest,
): Promise<ApiPatient> {
  return http.post<ApiPatient>("/api/v1/patients/me", payload);
}
export async function listPatients(): Promise<Patient[]> {
  const rows = await http.get<ApiPatient[]>("/api/v1/patients");
  return rows.map(mapApiPatient);
}

export function searchPatientDetails(search?: string): Promise<ApiPatient[]> {
  const params = new URLSearchParams({ page: "1", limit: "100" });
  if (search?.trim()) params.set("search", search.trim());
  return http.get<ApiPatient[]>(`/api/v1/patients?${params.toString()}`);
}

export function getPatientConsents(patientId: string): Promise<ApiConsent[]> {
  return http.get<ApiConsent[]>(
    `/api/v1/patients/${encodeURIComponent(patientId)}/consents`,
  );
}

export function grantPatientConsent(
  patientId: string,
  payload: { type: string; policyVersion: string; grantedAt: string },
): Promise<ApiConsent> {
  return http.post<ApiConsent>(
    `/api/v1/patients/${encodeURIComponent(patientId)}/consent-grants`,
    payload,
  );
}

export function withdrawPatientConsent(
  patientId: string,
  payload: { type: string; reason: string; version: number },
): Promise<ApiConsent> {
  return http.post<ApiConsent>(
    `/api/v1/patients/${encodeURIComponent(patientId)}/consent-withdrawals`,
    payload,
  );
}

export function syncPatientConsent(
  patientId: string,
  type: string,
): Promise<string> {
  return http.put<string>(
    `/api/v1/patients/${encodeURIComponent(patientId)}/consents/${encodeURIComponent(type)}`,
    {},
  );
}
export async function listPractitioners(): Promise<Practitioner[]> {
  const rows = await http.get<ApiPractitioner[]>("/api/v1/practitioners");
  return rows.map((row) => ({
    id: row.id as User["id"],
    name: row.displayName,
    role: "doctor",
    roles: ["doctor"],
    specialty:
      row.specialties.find((item) => item.primary)?.name ??
      row.specialties[0]?.name,
    department: row.clinicAssignments[0]?.departmentName,
    clinicLocationId: row.clinicAssignments[0]?.clinicLocationId,
    clinicName: row.clinicAssignments[0]?.clinicName,
    online: row.status === "active",
  }));
}

export const listDoctorsLegacy = () =>
  http.get<string>("/api/v1/doctors");

export const getDoctorAvailabilityLegacy = (doctorId: string) =>
  http.get<string>(
    `/api/v1/doctors/${encodeURIComponent(doctorId)}/availability`,
  );
export async function getAvailability(
  practitionerId: string,
  clinicLocationId: string,
  date: string,
): Promise<AvailabilitySlot[]> {
  return (
    await getPractitionerAvailability(practitionerId, clinicLocationId, date)
  ).slots;
}

export function getPractitionerAvailability(
  practitionerId: string,
  clinicLocationId: string,
  date: string,
): Promise<PractitionerAvailability> {
  const query = new URLSearchParams({
    clinicLocationId,
    date,
    includeUnavailable: "true",
  });
  return http.get<PractitionerAvailability>(
    `/api/v1/practitioners/${encodeURIComponent(practitionerId)}/availability?${query}`,
  );
}

export interface ScheduleWindow {
  id: string;
  /** 0 = Sunday .. 6 = Saturday, matching JS Date#getDay(). */
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
  effectiveFrom: string;
  effectiveTo: string | null;
}
export interface ScheduleException {
  id: string;
  kind: "unavailable" | "override";
  startsAt: string;
  endsAt: string;
  reason: string | null;
}
export interface PractitionerScheduleConfig {
  practitionerId: string;
  clinicLocationId: string;
  assignmentId: string;
  timezone: string;
  slotDurationMinutes: number;
  capacity: number;
  weeklySchedule: ScheduleWindow[];
  exceptions: ScheduleException[];
}
export interface WeeklyScheduleWindowInput {
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
  effectiveFrom?: string;
  effectiveTo?: string;
}

export function getPractitionerSchedule(
  practitionerId: string,
  clinicLocationId: string,
): Promise<PractitionerScheduleConfig> {
  const query = new URLSearchParams({ clinicLocationId });
  return http.get<PractitionerScheduleConfig>(
    `/api/v1/practitioners/${encodeURIComponent(practitionerId)}/schedule?${query}`,
  );
}

export function replacePractitionerSchedule(
  practitionerId: string,
  clinicLocationId: string,
  windows: WeeklyScheduleWindowInput[],
): Promise<PractitionerScheduleConfig> {
  const query = new URLSearchParams({ clinicLocationId });
  return http.put<PractitionerScheduleConfig>(
    `/api/v1/practitioners/${encodeURIComponent(practitionerId)}/schedule?${query}`,
    { windows },
  );
}

export function createScheduleException(
  practitionerId: string,
  clinicLocationId: string,
  payload: { kind: "unavailable" | "override"; startsAt: string; endsAt: string; reason?: string },
): Promise<ScheduleException> {
  const query = new URLSearchParams({ clinicLocationId });
  return http.post<ScheduleException>(
    `/api/v1/practitioners/${encodeURIComponent(practitionerId)}/schedule-exceptions?${query}`,
    payload,
  );
}

export function deleteScheduleException(
  practitionerId: string,
  clinicLocationId: string,
  exceptionId: string,
): Promise<{ deleted: boolean }> {
  const query = new URLSearchParams({ clinicLocationId });
  return http.delete<{ deleted: boolean }>(
    `/api/v1/practitioners/${encodeURIComponent(practitionerId)}/schedule-exceptions/${encodeURIComponent(exceptionId)}?${query}`,
  );
}

export interface HealthPoint {
  id: string;
  takenAt: string;
  aiScore: number | null;
}
export interface HealthSummary {
  score: number | null;
  treatmentProgress: number | null;
  riskLevel: string;
  dataAvailability: { progressPhotos: number; clinicalScoringModel: boolean };
  notice: string;
}
export interface OperationalKpis {
  activeEncounters: number;
  awaitingDoctorReview: number;
  emergencyEncounters: number;
  overdueSlaTasks: number;
  recordsAwaitingSignature: number;
  openCrmAlerts: number;
  failedNotifications: number;
  unhealthyIntegrations: number;
}
export interface MedicationReminder {
  id: string;
  patientId: string;
  medicationName: string;
  schedule: unknown;
  takenAt: string | null;
  createdAt: string;
}

export interface MedicationReminderSchedule {
  timezone: string;
  startDate: string;
  endDate?: string;
  times: string[];
  daysOfWeek?: number[];
}

export const getHealthSummary = (patientId: string) =>
  http.get<HealthSummary>(`/api/v1/patients/${patientId}/health-summary`);
export const getHealthHistory = (patientId: string) =>
  http.get<HealthPoint[]>(`/api/v1/patients/${patientId}/health-score-history`);
export const getOperationalKpis = () =>
  http.get<OperationalKpis>("/api/v1/dashboard/operational-kpis");
export const getReport = <T>(
  patientId: string,
  type: "overview" | "treatment-history" | "medicine-history" | "ai-summary",
) => http.get<T>(`/api/v1/patients/${patientId}/reports/${type}`);
export const getMedicationReminders = (patientId: string) =>
  http.get<MedicationReminder[]>(
    `/api/v1/patients/${patientId}/medication-reminders`,
  );
export const markReminderTaken = (id: string) =>
  http.patch<MedicationReminder>(`/api/v1/medication-reminders/${id}/taken`);

// Bare `{}` body in the spec — inferred field names, no confirmed schema.
export interface CreateMedicationReminderRequest {
  medicationName: string;
  schedule: MedicationReminderSchedule;
}
export const createMedicationReminder = (
  patientId: string,
  body: CreateMedicationReminderRequest,
) =>
  http.post<MedicationReminder>(
    `/api/v1/patients/${patientId}/medication-reminders`,
    body,
  );

// Bare `{}` body in the spec — inferred field names, no confirmed schema.
export interface CreateProgressPhotoRequest {
  fileId: string;
  takenAt: string;
  note?: string;
}
export interface ProgressPhoto {
  id?: string;
  patientId?: string;
  fileName: string;
  status?: string;
  takenAt?: string;
  createdAt?: string;
}
export const createProgressPhoto = (
  patientId: string,
  body: CreateProgressPhotoRequest,
) =>
  http.post<ProgressPhoto>(
    `/api/v1/patients/${encodeURIComponent(patientId)}/progress-photos`,
    body,
  );

export const getReportExport = (patientId: string) =>
  http.get<unknown>(
    `/api/v1/patients/${encodeURIComponent(patientId)}/reports/export`,
  );
