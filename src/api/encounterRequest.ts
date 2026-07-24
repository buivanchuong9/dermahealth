import { http } from './http';
import type { ClinicalAlertId, EncounterCreationRequestId, EncounterId, PatientId, UserId } from '../domain/core/ids';
import type { EncounterCreationRequest } from '../domain/core/entities';
import type { EncounterCreationRequestStatus } from '../domain/core/enums';
import type { UserRole } from '../domain/core/role';

interface EncounterCreationRequestDto {
  id: string;
  patientId: string;
  sourceAlertId?: unknown;
  requestedByRole: UserRole;
  reason: string;
  status: EncounterCreationRequestStatus;
  requestedAt: string;
  decidedBy?: unknown;
  decidedAt?: unknown;
  createdEncounterId?: unknown;
}

// Bare `{}` example body — mirrors crmService.requestEncounterCreation's input.
export interface CreatePatientEncounterRequest {
  reason: string;
  sourceAlertId?: string;
}

// Bare `{}` example body — mirrors crmService.decideEncounterCreationRequest's input.
export interface DecideEncounterRequestRequest {
  decision: 'approve' | 'reject';
  department?: string;
}

const optionalString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

const mapRequest = (dto: EncounterCreationRequestDto): EncounterCreationRequest => ({
  id: dto.id as EncounterCreationRequestId,
  patientId: dto.patientId as PatientId,
  sourceAlertId: optionalString(dto.sourceAlertId) as ClinicalAlertId | undefined,
  requestedByRole: dto.requestedByRole,
  reason: dto.reason,
  status: dto.status,
  requestedAt: dto.requestedAt,
  decidedBy: optionalString(dto.decidedBy) as UserId | undefined,
  decidedAt: optionalString(dto.decidedAt),
  createdEncounterId: optionalString(dto.createdEncounterId) as EncounterId | undefined,
});

export const createPatientEncounterRequest = async (
  patientId: string,
  body: CreatePatientEncounterRequest,
) =>
  mapRequest(
    await http.post<EncounterCreationRequestDto>(
      `/api/v1/patients/${encodeURIComponent(patientId)}/encounter-requests`,
      body,
    ),
  );

export const listEncounterRequests = async (status: EncounterCreationRequestStatus) =>
  (
    await http.get<EncounterCreationRequestDto[]>(
      `/api/v1/encounter-requests?status=${encodeURIComponent(status)}`,
    )
  ).map(mapRequest);

export const decideEncounterRequest = (requestId: string, body: DecideEncounterRequestRequest) =>
  http.post<unknown>(`/api/v1/encounter-requests/${encodeURIComponent(requestId)}/decide`, body);
