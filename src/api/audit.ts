import { http } from './http';
import type { AuditEventId, EncounterId, PatientId, UserId } from '../domain/core/ids';
import type { AuditEvent } from '../domain/core/entities';
import type { UserRole } from '../domain/core/role';

interface AuditEventDto {
  id: string;
  at: string;
  actorId: string;
  actorName: string;
  role: UserRole;
  action: string;
  entityType: string;
  entityId: string;
  patientId?: unknown;
  encounterId?: unknown;
  previousState?: unknown;
  newState?: unknown;
  reason?: unknown;
  sourceModule: string;
  severity: AuditEvent['severity'];
}

const optionalString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

const mapEvent = (dto: AuditEventDto): AuditEvent => ({
  id: dto.id as AuditEventId,
  at: dto.at,
  actorId: dto.actorId as UserId,
  actorName: dto.actorName,
  role: dto.role,
  action: dto.action,
  entityType: dto.entityType,
  entityId: dto.entityId,
  patientId: optionalString(dto.patientId) as PatientId | undefined,
  encounterId: optionalString(dto.encounterId) as EncounterId | undefined,
  previousState: optionalString(dto.previousState),
  newState: optionalString(dto.newState),
  reason: optionalString(dto.reason),
  sourceModule: dto.sourceModule,
  severity: dto.severity,
});

export const listAudit = async () => (await http.get<AuditEventDto[]>('/api/v1/audit')).map(mapEvent);

export const getEncounterAuditTrail = async (encounterId: string) =>
  (await http.get<AuditEventDto[]>(`/api/v1/audit/encounters/${encodeURIComponent(encounterId)}`)).map(mapEvent);

export const getPatientAuditTrail = async (patientId: string) =>
  (await http.get<AuditEventDto[]>(`/api/v1/audit/patients/${encodeURIComponent(patientId)}`)).map(mapEvent);

export interface LogClientEventRequest {
  entityType: string;
  entityId: string;
  patientId?: string;
  encounterId?: string;
  previousState?: unknown;
  newState?: unknown;
  reason: string;
  sourceModule: string;
  severity: AuditEvent['severity'];
  occurredAt: string;
}

export const logClientEvent = async (body: LogClientEventRequest) =>
  mapEvent(await http.post<AuditEventDto>('/api/v1/audit/client-events', body));
