import { auditRepository, userRepository } from '../repositories';
import { nextId } from '../core/ids';
import type { AuditEvent } from '../core/entities';
import type { UserId, PatientId, EncounterId } from '../core/ids';

export interface LogInput {
  actorId: UserId;
  action: string;
  entityType: string;
  entityId: string;
  patientId?: PatientId;
  encounterId?: EncounterId;
  previousState?: string;
  newState?: string;
  reason?: string;
  sourceModule: string;
  severity?: AuditEvent['severity'];
}

function log(input: LogInput): AuditEvent {
  const actor = userRepository.getById(input.actorId);
  const event: AuditEvent = {
    id: nextId('AUD'),
    at: new Date().toISOString(),
    actorId: input.actorId,
    actorName: actor?.name ?? input.actorId,
    role: actor?.role ?? 'system_administrator',
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    patientId: input.patientId,
    encounterId: input.encounterId,
    previousState: input.previousState,
    newState: input.newState,
    reason: input.reason,
    sourceModule: input.sourceModule,
    severity: input.severity ?? 'info',
  };
  auditRepository.upsert(event);
  return event;
}

function listAll(): AuditEvent[] {
  return [...auditRepository.getAll()].sort((a, b) => b.at.localeCompare(a.at));
}

function listByEncounter(encounterId: EncounterId): AuditEvent[] {
  return listAll().filter((e) => e.encounterId === encounterId);
}

function listByPatient(patientId: PatientId): AuditEvent[] {
  return listAll().filter((e) => e.patientId === patientId);
}

export const auditService = { log, listAll, listByEncounter, listByPatient };
