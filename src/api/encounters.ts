import { http } from "./http";
import type { MedicalEncounter } from "../domain/core/entities";
import type {
  AppointmentId,
  EncounterId,
  PatientId,
  UserId,
} from "../domain/core/ids";
import type { EncounterStatus } from "../domain/core/enums";

export interface ApiEncounterEvent {
  id: string;
  at: string;
  label: string;
  kind: "info" | "warning" | "success" | "danger";
}

export interface ApiEncounter {
  id: string;
  patientId: string;
  parentEncounterId: string | null;
  appointmentId: string | null;
  type: MedicalEncounter["type"];
  origin: MedicalEncounter["origin"];
  status: EncounterStatus;
  department: string;
  room: string | null;
  queueNumber: number | null;
  peopleAheadInQueue: number | null;
  estimatedWaitMinutes: number | null;
  currentDoctorId: string | null;
  blockingCondition: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEncounterRequest {
  patientId: string;
  type: MedicalEncounter["type"];
  origin: MedicalEncounter["origin"];
  department: string;
  parentEncounterId?: string;
}

export interface TransitionEncounterRequest {
  toStatus: EncounterStatus;
  reason?: string;
  blockingCondition?: string;
  version: number;
}

const encounterPath = (encounterId: string) =>
  `/api/v1/encounters/${encodeURIComponent(encounterId)}`;

export const listEncounterDetails = () =>
  http.get<ApiEncounter[]>("/api/v1/encounters");

export const createEncounter = (payload: CreateEncounterRequest) =>
  http.post<ApiEncounter>("/api/v1/encounters", payload);

export const getActiveEncounter = () =>
  http.get<ApiEncounter>("/api/v1/encounters/active");

export const getEncounter = (encounterId: string) =>
  http.get<ApiEncounter>(encounterPath(encounterId));

export const getEncounterEvents = async (encounterId: string) =>
  http.get<ApiEncounterEvent[]>(`${encounterPath(encounterId)}/events`);

export const transitionEncounter = (
  encounterId: string,
  payload: TransitionEncounterRequest,
) => http.post<ApiEncounter>(`${encounterPath(encounterId)}/transitions`, payload);

export const closeEncounter = (encounterId: string, version: number) =>
  http.post<ApiEncounter>(`${encounterPath(encounterId)}/closures`, { version });

export interface ActivateEncounterWorkflowRequest {
  templateId: string;
  encounterVersion: number;
}

export const activateEncounterWorkflow = (
  encounterId: string,
  body: ActivateEncounterWorkflowRequest,
) => http.post<unknown>(`${encounterPath(encounterId)}/workflow/activate`, body);

// Compatibility endpoints retained by the backend for older clients.
export const transitionEncounterLegacy = (
  encounterId: string,
  payload: TransitionEncounterRequest,
) => http.post<string>(`${encounterPath(encounterId)}/transition`, payload);

export const closeEncounterLegacy = (encounterId: string, version: number) =>
  http.post<string>(`${encounterPath(encounterId)}/close`, { version });

export const mapEncounter = (
  row: ApiEncounter,
  events: ApiEncounterEvent[] = [],
): MedicalEncounter => ({
  id: row.id as EncounterId,
  patientId: row.patientId as PatientId,
  parentEncounterId: (row.parentEncounterId ?? undefined) as
    | EncounterId
    | undefined,
  appointmentId: (row.appointmentId ?? undefined) as
    | AppointmentId
    | undefined,
  type: row.type,
  origin: row.origin,
  status: row.status,
  department: row.department,
  room: row.room ?? undefined,
  queueNumber: row.queueNumber ?? undefined,
  peopleAheadInQueue: row.peopleAheadInQueue ?? undefined,
  estimatedWaitMinutes: row.estimatedWaitMinutes ?? undefined,
  currentDoctorId: (row.currentDoctorId ?? undefined) as UserId | undefined,
  blockingCondition: row.blockingCondition ?? undefined,
  version: row.version,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  aiAssessmentIds: [],
  doctorReviewIds: [],
  diagnosisIds: [],
  clinicalOrderIds: [],
  events,
});

export async function listEncounters(): Promise<MedicalEncounter[]> {
  const rows = await listEncounterDetails();
  return Promise.all(
    rows.map(async (row) => {
      const events = await getEncounterEvents(row.id).catch(() => []);
      return mapEncounter(row, events);
    }),
  );
}
