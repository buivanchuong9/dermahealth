import { http } from './http';
import type { AuditEventId, EncounterId, PatientId, UserId } from '../domain/core/ids';
import type { AuditEvent } from '../domain/core/entities';
import type { UserRole } from '../domain/core/role';

interface AuditEventDto {
  id: string;
  occurredAt: string;
  actorId: string | null;
  actorNameSnap: string | null;
  actorRoleSnap: UserRole | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  patientId?: unknown;
  encounterId?: unknown;
  beforeRedacted?: unknown;
  afterRedacted?: unknown;
  reason?: unknown;
  sourceModule: string | null;
  severity: AuditEvent['severity'] | null;
}

const optionalString = (value: unknown): string | undefined => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'object') return JSON.stringify(value);
  const s = String(value);
  return s.length > 0 ? s : undefined;
};

const mapEvent = (dto: AuditEventDto): AuditEvent => ({
  id: dto.id as AuditEventId,
  at: dto.occurredAt,
  actorId: (dto.actorId || '') as UserId,
  actorName: dto.actorNameSnap || '',
  role: (dto.actorRoleSnap || 'system_administrator') as UserRole,
  action: dto.action,
  entityType: dto.resourceType,
  entityId: dto.resourceId || '',
  patientId: optionalString(dto.patientId) as PatientId | undefined,
  encounterId: optionalString(dto.encounterId) as EncounterId | undefined,
  previousState: optionalString(dto.beforeRedacted),
  newState: optionalString(dto.afterRedacted),
  reason: optionalString(dto.reason),
  sourceModule: dto.sourceModule || '',
  severity: dto.severity || 'info',
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
