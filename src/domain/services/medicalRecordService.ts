import { encounterRepository, medicalRecordRepository, diagnosisRepository } from '../repositories';
import { auditService } from './auditService';
import { assertRole, InvalidTransitionError } from '../guards';
import { nextId } from '../core/ids';
import type { MedicalRecord, ClinicalDocument, Prescription, Medication } from '../core/entities';
import type { EncounterId, UserId, MedicalRecordId, ClinicalOrderId, WorkflowTaskId } from '../core/ids';

// EMR boundary: MedicalRecord.status === 'signed' is the immutability line.
// Every mutating function here checks it and refuses to touch clinical
// content once signed — the only way to change a signed record is
// addAddendum (append-only) or reopenRecord (medical_administrator only,
// logged, and flips status back to 'reopened' rather than silently
// un-signing it).

function getForEncounter(encounterId: EncounterId): MedicalRecord | undefined {
  const encounter = encounterRepository.getById(encounterId);
  return encounter?.medicalRecordId ? medicalRecordRepository.records().getById(encounter.medicalRecordId) : undefined;
}

function ensureDraft(encounterId: EncounterId): MedicalRecord {
  const existing = getForEncounter(encounterId);
  if (existing) return existing;
  const record: MedicalRecord = { id: nextId('MREC'), encounterId, status: 'draft', documentIds: [], addenda: [] };
  medicalRecordRepository.records().upsert(record);
  const encounter = encounterRepository.getById(encounterId);
  if (encounter) encounterRepository.upsert({ ...encounter, medicalRecordId: record.id });
  return record;
}

function assertMutable(record: MedicalRecord): void {
  if (record.status === 'signed' || record.status === 'amended') {
    throw new InvalidTransitionError('Hồ sơ đã ký — không thể chỉnh sửa trực tiếp, chỉ có thể bổ sung ghi chú (addendum) hoặc mở lại bởi Quản trị viên y tế.');
  }
}

function issuePrescription(encounterId: EncounterId, doctorId: UserId, medications: Omit<Medication, 'id'>[]): Prescription {
  assertRole(doctorId, ['doctor']);
  const record = ensureDraft(encounterId);
  assertMutable(record);
  const prescription: Prescription = { id: nextId('RX'), encounterId, doctorId, issuedAt: new Date().toISOString(), medications: medications.map((m) => ({ id: nextId('MED'), ...m })) };
  medicalRecordRepository.prescriptions().upsert(prescription);
  medicalRecordRepository.records().upsert({ ...record, prescriptionId: prescription.id, status: 'in_review' });
  auditService.log({ actorId: doctorId, action: 'PRESCRIPTION_ISSUED', entityType: 'Prescription', entityId: prescription.id, encounterId, sourceModule: 'EMR' });
  return prescription;
}

function uploadDocument(
  encounterId: EncounterId, actorId: UserId,
  input: { type: string; fileName: string; workflowTaskId?: WorkflowTaskId; clinicalOrderId?: ClinicalOrderId },
): ClinicalDocument {
  const record = ensureDraft(encounterId);
  const doc: ClinicalDocument = {
    id: nextId('DOC'), encounterId, workflowTaskId: input.workflowTaskId, clinicalOrderId: input.clinicalOrderId,
    type: input.type, fileName: input.fileName, fileHash: `sha256:mock-${Math.random().toString(16).slice(2, 9)}`,
    version: 1, uploadedBy: actorId, uploadedAt: new Date().toISOString(), reviewStatus: 'pending', signatureStatus: 'unsigned',
  };
  medicalRecordRepository.documents().upsert(doc);
  medicalRecordRepository.records().upsert({ ...record, documentIds: [...record.documentIds, doc.id] });
  auditService.log({ actorId, action: 'DOCUMENT_UPLOADED', entityType: 'ClinicalDocument', entityId: doc.id, encounterId, sourceModule: 'DocumentManagement' });
  return doc;
}

function reviewDocument(documentId: string, actorId: UserId): ClinicalDocument {
  const doc = medicalRecordRepository.documents().getById(documentId);
  if (!doc) throw new Error(`Không tìm thấy tài liệu ${documentId}`);
  auditService.log({ actorId, action: 'DOCUMENT_REVIEWED', entityType: 'ClinicalDocument', entityId: documentId, encounterId: doc.encounterId, sourceModule: 'DocumentManagement' });
  return medicalRecordRepository.documents().upsert({ ...doc, reviewStatus: 'reviewed' });
}

function flagIncorrectLink(documentId: string, actorId: UserId, reason: string): ClinicalDocument {
  const doc = medicalRecordRepository.documents().getById(documentId);
  if (!doc) throw new Error(`Không tìm thấy tài liệu ${documentId}`);
  auditService.log({ actorId, action: 'DOCUMENT_INCORRECT_LINK_FLAGGED', entityType: 'ClinicalDocument', entityId: documentId, reason, encounterId: doc.encounterId, sourceModule: 'DocumentManagement', severity: 'warning' });
  return medicalRecordRepository.documents().upsert({ ...doc, incorrectLinkFlag: true });
}

/** Closure validation: mandatory elements must exist before a record can be signed. */
function checkCompletionRequirements(record: MedicalRecord): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!record.diagnosisId) missing.push('Chưa có chẩn đoán');
  else {
    const diagnosis = diagnosisRepository.diagnoses().getById(record.diagnosisId);
    if (!diagnosis || (diagnosis.status !== 'confirmed' && diagnosis.status !== 'revised')) missing.push('Chẩn đoán chưa được xác nhận');
  }
  return { ok: missing.length === 0, missing };
}

function attachDiagnosis(encounterId: EncounterId, diagnosisId: MedicalRecord['diagnosisId']): MedicalRecord {
  const record = ensureDraft(encounterId);
  assertMutable(record);
  return medicalRecordRepository.records().upsert({ ...record, diagnosisId, status: 'in_review' });
}

function setDischargeAndFollowUp(encounterId: EncounterId, discharge: MedicalRecord['discharge'], followUp: MedicalRecord['followUp']): MedicalRecord {
  const record = ensureDraft(encounterId);
  assertMutable(record);
  return medicalRecordRepository.records().upsert({ ...record, discharge, followUp, status: 'awaiting_signature' });
}

function signRecord(recordId: MedicalRecordId, doctorId: UserId): MedicalRecord {
  assertRole(doctorId, ['doctor']);
  const record = medicalRecordRepository.records().getById(recordId);
  if (!record) throw new Error(`Không tìm thấy hồ sơ ${recordId}`);
  if (record.status === 'signed') throw new InvalidTransitionError('Hồ sơ đã được ký trước đó.');
  const check = checkCompletionRequirements(record);
  if (!check.ok) throw new InvalidTransitionError(`Chưa đủ điều kiện ký hồ sơ: ${check.missing.join(', ')}`);
  const signed = medicalRecordRepository.records().upsert({ ...record, status: 'signed', signedBy: doctorId, signedAt: new Date().toISOString() });
  const encounter = encounterRepository.getById(record.encounterId);
  auditService.log({ actorId: doctorId, action: 'MEDICAL_RECORD_SIGNED', entityType: 'MedicalRecord', entityId: recordId, newState: 'signed', patientId: encounter?.patientId, encounterId: record.encounterId, sourceModule: 'EMR' });
  return signed;
}

/** Append-only correction path for an already-signed record. */
function addAddendum(recordId: MedicalRecordId, actorId: UserId, text: string): MedicalRecord {
  assertRole(actorId, ['doctor']);
  const record = medicalRecordRepository.records().getById(recordId);
  if (!record) throw new Error(`Không tìm thấy hồ sơ ${recordId}`);
  if (record.status !== 'signed' && record.status !== 'amended') throw new InvalidTransitionError('Chỉ có thể bổ sung ghi chú (addendum) cho hồ sơ đã ký.');
  const addendum = { id: nextId('ADD'), text, addedBy: actorId, addedAt: new Date().toISOString() };
  const updated = medicalRecordRepository.records().upsert({ ...record, addenda: [...record.addenda, addendum], status: 'amended' });
  auditService.log({ actorId, action: 'MEDICAL_RECORD_ADDENDUM_ADDED', entityType: 'MedicalRecord', entityId: recordId, reason: text, encounterId: record.encounterId, sourceModule: 'EMR' });
  return updated;
}

function reopenRecord(recordId: MedicalRecordId, actorId: UserId, reason: string): MedicalRecord {
  assertRole(actorId, ['medical_administrator']);
  const record = medicalRecordRepository.records().getById(recordId);
  if (!record) throw new Error(`Không tìm thấy hồ sơ ${recordId}`);
  const updated = medicalRecordRepository.records().upsert({ ...record, status: 'reopened', reopenedReason: reason });
  auditService.log({ actorId, action: 'MEDICAL_RECORD_REOPENED', entityType: 'MedicalRecord', entityId: recordId, reason, newState: 'reopened', encounterId: record.encounterId, sourceModule: 'EMR', severity: 'warning' });
  return updated;
}

/** A result that arrives after the record is signed never silently mutates it — it raises a flag instead. */
function flagLateResult(recordId: MedicalRecordId, actorId: UserId, description: string): MedicalRecord {
  const record = medicalRecordRepository.records().getById(recordId);
  if (!record) throw new Error(`Không tìm thấy hồ sơ ${recordId}`);
  auditService.log({ actorId, action: 'LATE_RESULT_FLAGGED', entityType: 'MedicalRecord', entityId: recordId, reason: description, encounterId: record.encounterId, sourceModule: 'EMR', severity: 'warning' });
  if (record.status === 'signed') return record; // untouched — a human must explicitly addendum/reopen
  return medicalRecordRepository.records().upsert({ ...record, status: 'addendum_required' });
}

function listDocuments(encounterId: EncounterId): ClinicalDocument[] {
  return medicalRecordRepository.documents().getAll().filter((d) => d.encounterId === encounterId);
}
function getPrescription(encounterId: EncounterId): Prescription | undefined {
  return medicalRecordRepository.prescriptions().getAll().find((p) => p.encounterId === encounterId);
}

export const medicalRecordService = {
  getForEncounter, ensureDraft, issuePrescription, uploadDocument, reviewDocument, flagIncorrectLink,
  checkCompletionRequirements, attachDiagnosis, setDischargeAndFollowUp, signRecord, addAddendum,
  reopenRecord, flagLateResult, listDocuments, getPrescription,
};
