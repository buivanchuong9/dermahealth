import { encounterRepository, medicalRecordRepository, workflowRepository } from '../repositories';
import { auditService } from './auditService';
import { InvalidTransitionError } from '../guards';
import { nextId } from '../core/ids';
import type { EncounterStatus } from '../core/enums';
import type { MedicalEncounter, EncounterEvent } from '../core/entities';
import type { EncounterId, PatientId, UserId, AppointmentId, WorkflowInstanceId } from '../core/ids';

/** Canonical valid-transition table for MedicalEncounter.status (Task 2 + Task 3 of the
 * business spec). Anything not listed here is rejected by `transitionStatus`. */
export const ENCOUNTER_TRANSITIONS: Record<EncounterStatus, EncounterStatus[]> = {
  registered: ['intake_in_progress'],
  intake_in_progress: ['intake_complete'],
  intake_complete: ['ai_assessed', 'under_doctor_review'], // doctor review may proceed even if AI is unavailable
  ai_assessed: ['routed', 'escalated', 'under_doctor_review'],
  routed: ['checked_in', 'escalated'],
  checked_in: ['under_doctor_review'],
  under_doctor_review: ['awaiting_results', 'diagnosed', 'escalated'],
  awaiting_results: ['under_doctor_review', 'diagnosed'],
  diagnosed: ['plan_approved'],
  plan_approved: ['workflow_active'],
  workflow_active: ['in_progress'],
  in_progress: ['results_complete', 'final_review'],
  results_complete: ['final_review'],
  final_review: ['discharge_ready', 'awaiting_results'],
  discharge_ready: ['record_signed'],
  record_signed: ['closed'],
  closed: ['post_visit_monitoring'],
  post_visit_monitoring: ['escalated', 'closed'],
  escalated: ['routed', 'post_visit_monitoring', 'follow_up_linked', 'under_doctor_review'],
  follow_up_linked: [],
};

function canTransition(from: EncounterStatus, to: EncounterStatus): boolean {
  return ENCOUNTER_TRANSITIONS[from]?.includes(to) ?? false;
}

function addEvent(encounter: MedicalEncounter, label: string, kind: EncounterEvent['kind']): MedicalEncounter {
  const event: EncounterEvent = { id: nextId('EV'), at: new Date().toISOString(), label, kind };
  const updated: MedicalEncounter = { ...encounter, events: [...encounter.events, event], updatedAt: event.at };
  encounterRepository.upsert(updated);
  return updated;
}

function getEncounter(id: EncounterId): MedicalEncounter | undefined {
  return encounterRepository.getById(id);
}

function listForPatient(patientId: PatientId): MedicalEncounter[] {
  return encounterRepository.getAll().filter((e) => e.patientId === patientId);
}

/** The one encounter driving the "live" demo — the most recently updated non-closed encounter. */
function getActiveEncounter(patientId: PatientId): MedicalEncounter | undefined {
  const open = listForPatient(patientId).filter((e) => e.status !== 'closed' && e.status !== 'follow_up_linked');
  return open.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
}

function transitionStatus(
  encounterId: EncounterId, next: EncounterStatus, actorId: UserId, opts?: { reason?: string; blockingCondition?: string },
): MedicalEncounter {
  const encounter = encounterRepository.getById(encounterId);
  if (!encounter) throw new InvalidTransitionError(`Không tìm thấy lượt khám ${encounterId}`);
  if (!canTransition(encounter.status, next)) {
    throw new InvalidTransitionError(`Không thể chuyển trạng thái từ "${encounter.status}" sang "${next}".`);
  }
  const updated: MedicalEncounter = { ...encounter, status: next, blockingCondition: opts?.blockingCondition, updatedAt: new Date().toISOString() };
  encounterRepository.upsert(updated);
  auditService.log({
    actorId, action: 'ENCOUNTER_STATUS_CHANGED', entityType: 'MedicalEncounter', entityId: encounterId,
    previousState: encounter.status, newState: next, reason: opts?.reason, patientId: encounter.patientId,
    encounterId, sourceModule: 'EncounterService',
  });
  return addEvent(encounterRepository.getById(encounterId)!, `Trạng thái lượt khám: ${next}`, 'info');
}

function createEncounter(
  input: {
    patientId: PatientId; type: MedicalEncounter['type']; origin: MedicalEncounter['origin']; department: string;
    appointmentId?: AppointmentId; parentEncounterId?: EncounterId;
  },
  actorId: UserId,
): MedicalEncounter {
  const now = new Date().toISOString();
  const encounter: MedicalEncounter = {
    id: nextId('ENC'), patientId: input.patientId, appointmentId: input.appointmentId, parentEncounterId: input.parentEncounterId,
    type: input.type, origin: input.origin, status: 'registered', department: input.department, createdAt: now, updatedAt: now,
    aiAssessmentIds: [], doctorReviewIds: [], diagnosisIds: [], clinicalOrderIds: [], events: [],
  };
  encounterRepository.upsert(encounter);
  auditService.log({ actorId, action: 'ENCOUNTER_CREATED', entityType: 'MedicalEncounter', entityId: encounter.id, patientId: input.patientId, encounterId: encounter.id, sourceModule: 'EncounterService', newState: 'registered' });
  return addEvent(encounter, input.parentEncounterId ? `Lượt tái khám được tạo, liên kết với ${input.parentEncounterId}` : 'Đăng ký lượt khám mới', 'info');
}

/** BR: cannot close before the medical record is signed — enforced here, not left to the caller. */
function canCloseEncounter(encounter: MedicalEncounter): { ok: boolean; reason?: string } {
  if (encounter.status !== 'record_signed') return { ok: false, reason: 'Lượt khám phải ở trạng thái "Hồ sơ đã ký" trước khi đóng.' };
  const record = encounter.medicalRecordId ? medicalRecordRepository.records().getById(encounter.medicalRecordId) : undefined;
  if (!record || record.status !== 'signed') return { ok: false, reason: 'Hồ sơ bệnh án chưa được ký.' };
  return { ok: true };
}

function closeEncounter(encounterId: EncounterId, actorId: UserId): MedicalEncounter {
  const encounter = encounterRepository.getById(encounterId);
  if (!encounter) throw new InvalidTransitionError(`Không tìm thấy lượt khám ${encounterId}`);
  const check = canCloseEncounter(encounter);
  if (!check.ok) throw new InvalidTransitionError(check.reason ?? 'Không thể đóng lượt khám.');
  return transitionStatus(encounterId, 'closed', actorId, { reason: 'Đóng lượt khám sau khi hồ sơ đã ký' });
}

/** BR: BPM cannot activate a workflow without an approved clinical plan. */
function canActivateWorkflow(encounter: MedicalEncounter): { ok: boolean; reason?: string } {
  if (!encounter.clinicalPlanId) return { ok: false, reason: 'Chưa có phác đồ điều trị được bác sĩ duyệt.' };
  return { ok: true };
}

function setBlockingCondition(encounterId: EncounterId, blockingCondition: string | undefined): MedicalEncounter | undefined {
  const encounter = encounterRepository.getById(encounterId);
  if (!encounter) return undefined;
  const updated = { ...encounter, blockingCondition, updatedAt: new Date().toISOString() };
  return encounterRepository.upsert(updated);
}

function attachWorkflowInstance(encounterId: EncounterId, instanceId: WorkflowInstanceId): MedicalEncounter | undefined {
  const encounter = encounterRepository.getById(encounterId);
  if (!encounter) return undefined;
  return encounterRepository.upsert({ ...encounter, workflowInstanceId: instanceId });
}

function getWorkflowInstance(encounter: MedicalEncounter) {
  return encounter.workflowInstanceId ? workflowRepository.instances().getById(encounter.workflowInstanceId) : undefined;
}

export const encounterService = {
  ENCOUNTER_TRANSITIONS, canTransition, getEncounter, listForPatient, getActiveEncounter,
  transitionStatus, createEncounter, addEvent, canCloseEncounter, closeEncounter,
  canActivateWorkflow, setBlockingCondition, attachWorkflowInstance, getWorkflowInstance,
};
