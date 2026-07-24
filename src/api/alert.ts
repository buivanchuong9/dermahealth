import { http } from './http';
import type { CarePlanId, ClinicalAlertId, EncounterId, PatientId, UserId } from '../domain/core/ids';
import type { ClinicalAlert } from '../domain/core/entities';
import type { AlertSeverity, AlertStatus } from '../domain/core/enums';

interface ClinicalAlertDto {
  id: string;
  carePlanId: string;
  patientId: string;
  encounterId?: unknown;
  trigger: string;
  severity: AlertSeverity;
  responsibleActor: string;
  responseDeadlineHours: number;
  requiresLinkedEncounter: boolean;
  status: AlertStatus;
  note: string;
  detectedAt: string;
  closedBy?: unknown;
  closedAt?: unknown;
}

// The spec's example body is a bare `{}` with no field names, so this mirrors
// crmService.raiseAlert's input shape rather than a confirmed contract.
export interface CreatePatientAlertRequest {
  carePlanId: string;
  trigger: string;
  note: string;
}

const optionalString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

const mapAlert = (dto: ClinicalAlertDto): ClinicalAlert => ({
  id: dto.id as ClinicalAlertId,
  carePlanId: dto.carePlanId as CarePlanId,
  patientId: dto.patientId as PatientId,
  encounterId: optionalString(dto.encounterId) as EncounterId | undefined,
  trigger: dto.trigger,
  severity: dto.severity,
  responsibleActor: dto.responsibleActor,
  responseDeadlineHours: dto.responseDeadlineHours,
  requiresLinkedEncounter: dto.requiresLinkedEncounter,
  status: dto.status,
  note: dto.note,
  detectedAt: dto.detectedAt,
  closedBy: optionalString(dto.closedBy) as UserId | undefined,
  closedAt: optionalString(dto.closedAt),
});

export const createPatientAlert = async (patientId: string, body: CreatePatientAlertRequest) =>
  mapAlert(await http.post<ClinicalAlertDto>(`/api/v1/patients/${encodeURIComponent(patientId)}/alerts`, body));

export const listPatientAlerts = async (patientId: string) =>
  (await http.get<ClinicalAlertDto[]>(`/api/v1/patients/${encodeURIComponent(patientId)}/alerts`)).map(mapAlert);

export const listAlerts = async (status: AlertStatus) =>
  (await http.get<ClinicalAlertDto[]>(`/api/v1/alerts?status=${encodeURIComponent(status)}`)).map(mapAlert);

export const closeAlert = (alertId: string) => http.post<unknown>(`/api/v1/alerts/${encodeURIComponent(alertId)}/close`);
