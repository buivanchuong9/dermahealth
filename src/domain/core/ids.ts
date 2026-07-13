// Canonical ID types shared across the whole domain model. All are plain
// strings at runtime — the distinct type aliases exist so repositories and
// services can't accidentally pass, say, an EncounterId where a PatientId
// is expected without TypeScript flagging it via excess-property mistakes
// in call sites (structural typing means this is a naming discipline, not
// a hard guarantee — see `Brand` below for the stricter version used on
// the identifiers that most often get mixed up).

type Brand<T, B extends string> = T & { readonly __brand?: B };

export type PatientId = Brand<string, 'PatientId'>;
export type UserId = Brand<string, 'UserId'>;
export type AppointmentId = Brand<string, 'AppointmentId'>;
export type EncounterId = Brand<string, 'EncounterId'>;
export type SymptomIntakeId = Brand<string, 'SymptomIntakeId'>;
export type AIAssessmentId = Brand<string, 'AIAssessmentId'>;
export type DoctorReviewId = Brand<string, 'DoctorReviewId'>;
export type DoctorDiagnosisId = Brand<string, 'DoctorDiagnosisId'>;
export type ClinicalPlanId = Brand<string, 'ClinicalPlanId'>;
export type ClinicalOrderId = Brand<string, 'ClinicalOrderId'>;
export type ClinicalResultId = Brand<string, 'ClinicalResultId'>;
export type WorkflowTemplateId = Brand<string, 'WorkflowTemplateId'>;
export type WorkflowTemplateVersionId = Brand<string, 'WorkflowTemplateVersionId'>;
export type WorkflowInstanceId = Brand<string, 'WorkflowInstanceId'>;
export type WorkflowTaskId = Brand<string, 'WorkflowTaskId'>;
export type ClinicalDocumentId = Brand<string, 'ClinicalDocumentId'>;
export type MedicalRecordId = Brand<string, 'MedicalRecordId'>;
export type PrescriptionId = Brand<string, 'PrescriptionId'>;
export type MedicationId = Brand<string, 'MedicationId'>;
export type CarePlanId = Brand<string, 'CarePlanId'>;
export type FollowUpActivityId = Brand<string, 'FollowUpActivityId'>;
export type ClinicalAlertId = Brand<string, 'ClinicalAlertId'>;
export type EncounterCreationRequestId = Brand<string, 'EncounterCreationRequestId'>;
export type NotificationId = Brand<string, 'NotificationId'>;
export type ConsentId = Brand<string, 'ConsentId'>;
export type AuditEventId = Brand<string, 'AuditEventId'>;
export type IntegrationConnectionId = Brand<string, 'IntegrationConnectionId'>;
export type IntegrationMessageId = Brand<string, 'IntegrationMessageId'>;
export type AppointmentCheckInTokenId = Brand<string, 'AppointmentCheckInTokenId'>;
export type QueueTicketId = Brand<string, 'QueueTicketId'>;

let seq = 0;

/** Deterministic-enough id generator for a frontend prototype (no backend to assign real ids). */
export function nextId<T extends string = string>(prefix: string): T {
  seq += 1;
  return `${prefix}-${seq.toString().padStart(4, '0')}` as T;
}

/** Resets the id counter — used when the app state is reset to seed data. */
export function resetIdSequence(): void {
  seq = 0;
}
