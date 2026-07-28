import { http } from './http';
import type {
  ClinicalDocumentId,
  ClinicalOrderId,
  DoctorDiagnosisId,
  EncounterId,
  MedicalRecordId,
  MedicationId,
  MedicationOrderEventId,
  MedicationOrderId,
  PrescriptionId,
  UserId,
  WorkflowTaskId,
} from '../domain/core/ids';
import type {
  ClinicalDocument,
  DischargeInstruction,
  FollowUpInstruction,
  MedicalRecord,
  MedicalRecordAddendum,
  Medication,
  MedicationOrder,
  MedicationOrderEvent,
  Prescription,
} from '../domain/core/entities';
import type { MedicalRecordStatus } from '../domain/core/enums';

interface MedicalRecordDto {
  id: string;
  encounterId: string;
  status: MedicalRecordStatus;
  diagnosisId?: unknown;
  prescriptionId?: unknown;
  documentIds?: string[];
  discharge?: DischargeInstruction;
  followUp?: FollowUpInstruction;
  signedBy?: unknown;
  signedAt?: unknown;
  addenda?: MedicalRecordAddendum[];
  reopenedReason?: unknown;
}

interface ClinicalDocumentDto {
  id: string;
  encounterId: string;
  workflowTaskId?: unknown;
  clinicalOrderId?: unknown;
  type: string;
  fileName: string;
  fileHash: string;
  version: number;
  uploadedBy: string;
  uploadedAt: string;
  reviewStatus: ClinicalDocument['reviewStatus'];
  signatureStatus: ClinicalDocument['signatureStatus'];
  incorrectLinkFlag?: boolean;
}

interface PrescriptionDto {
  id: string;
  encounterId: string;
  doctorId: string;
  medications: Array<Omit<Medication, 'id'> & { id?: string }>;
  orders?: MedicationOrderDto[];
  issuedAt: string;
}

interface MedicationOrderEventDto {
  id: string;
  orderId: string;
  type: MedicationOrderEvent['type'];
  actorId: string;
  notes?: unknown;
  occurredAt: string;
}

interface MedicationOrderDto {
  id: string;
  prescriptionId: string;
  encounterId: string;
  medicationName: string;
  dose: string;
  route?: unknown;
  frequency?: unknown;
  durationDays: number;
  instructions?: unknown;
  prescribedBy: string;
  prescribedAt: string;
  createdAt: string;
  events?: MedicationOrderEventDto[];
}

// The spec shows no field names for this request (bare `{}` example with no
// Schema captured), so this mirrors medicalRecordService.issuePrescription's
// input shape rather than a confirmed contract — verify against the backend's
// Schema tab before relying on it.
export interface CreatePrescriptionRequest {
  medications: Omit<Medication, 'id'>[];
}

// Same caveat as CreatePrescriptionRequest: field names inferred from
// medicalRecordService.uploadDocument, not confirmed against the spec.
export interface CreateClinicalDocumentRequest {
  type: string;
  fileName: string;
  workflowTaskId?: string;
  clinicalOrderId?: string;
}

// Inferred from medicalRecordService.attachDiagnosis — unconfirmed.
export interface UpdateMedicalRecordDiagnosisRequest {
  diagnosisId: string;
}

// Inferred from medicalRecordService.setDischargeAndFollowUp — unconfirmed.
export interface UpdateMedicalRecordDischargeFollowupRequest {
  discharge: DischargeInstruction;
  followUp: FollowUpInstruction;
}

const optionalString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

const mapRecord = (dto: MedicalRecordDto): MedicalRecord => ({
  id: dto.id as MedicalRecordId,
  encounterId: dto.encounterId as EncounterId,
  status: dto.status,
  diagnosisId: optionalString(dto.diagnosisId) as DoctorDiagnosisId | undefined,
  prescriptionId: optionalString(dto.prescriptionId) as PrescriptionId | undefined,
  documentIds: (dto.documentIds ?? []) as ClinicalDocumentId[],
  discharge: dto.discharge,
  followUp: dto.followUp,
  signedBy: optionalString(dto.signedBy) as UserId | undefined,
  signedAt: optionalString(dto.signedAt),
  addenda: dto.addenda ?? [],
  reopenedReason: optionalString(dto.reopenedReason),
});

const mapDocument = (dto: ClinicalDocumentDto): ClinicalDocument => ({
  id: dto.id as ClinicalDocumentId,
  encounterId: dto.encounterId as EncounterId,
  workflowTaskId: optionalString(dto.workflowTaskId) as WorkflowTaskId | undefined,
  clinicalOrderId: optionalString(dto.clinicalOrderId) as ClinicalOrderId | undefined,
  type: dto.type,
  fileName: dto.fileName,
  fileHash: dto.fileHash,
  version: dto.version,
  uploadedBy: dto.uploadedBy as UserId,
  uploadedAt: dto.uploadedAt,
  reviewStatus: dto.reviewStatus,
  signatureStatus: dto.signatureStatus,
  incorrectLinkFlag: dto.incorrectLinkFlag,
});

const mapPrescription = (dto: PrescriptionDto): Prescription => ({
  id: dto.id as PrescriptionId,
  encounterId: dto.encounterId as EncounterId,
  doctorId: dto.doctorId as UserId,
  medications: dto.medications.map((m, index) => ({
    ...m,
    id: (m.id ?? `${dto.id}:medication:${index}`) as MedicationId,
  })),
  medicationOrders: (dto.orders ?? []).map(mapMedicationOrder),
  issuedAt: dto.issuedAt,
});

const mapMedicationOrderEvent = (
  dto: MedicationOrderEventDto,
): MedicationOrderEvent => ({
  id: dto.id as MedicationOrderEventId,
  orderId: dto.orderId as MedicationOrderId,
  type: dto.type,
  actorId: dto.actorId as UserId,
  notes: optionalString(dto.notes),
  occurredAt: dto.occurredAt,
});

const mapMedicationOrder = (dto: MedicationOrderDto): MedicationOrder => ({
  id: dto.id as MedicationOrderId,
  prescriptionId: dto.prescriptionId as PrescriptionId,
  encounterId: dto.encounterId as EncounterId,
  medicationName: dto.medicationName,
  dose: dto.dose,
  route: optionalString(dto.route),
  frequency: optionalString(dto.frequency),
  durationDays: dto.durationDays,
  instructions: optionalString(dto.instructions),
  prescribedBy: dto.prescribedBy as UserId,
  prescribedAt: dto.prescribedAt,
  createdAt: dto.createdAt,
  events: (dto.events ?? []).map(mapMedicationOrderEvent),
});

const encounterPath = (encounterId: string) =>
  `/api/v1/encounters/${encodeURIComponent(encounterId)}`;

export const getEncounterMedicalRecord = async (encounterId: string) =>
  mapRecord(await http.get<MedicalRecordDto>(`${encounterPath(encounterId)}/medical-record`));

export const createEncounterPrescription = async (
  encounterId: string,
  body: CreatePrescriptionRequest,
) => mapPrescription(await http.post<PrescriptionDto>(`${encounterPath(encounterId)}/prescriptions`, body));

export const getEncounterPrescriptions = async (encounterId: string) =>
  (await http.get<PrescriptionDto[]>(`${encounterPath(encounterId)}/prescriptions`)).map(mapPrescription);

export interface RecordMedicationEventRequest {
  notes?: string;
}

const medicationOrderPath = (orderId: string) =>
  `/api/v1/medication-orders/${encodeURIComponent(orderId)}`;

export const dispenseMedicationOrder = async (
  orderId: string,
  body: RecordMedicationEventRequest = {},
) =>
  mapMedicationOrderEvent(
    await http.post<MedicationOrderEventDto>(`${medicationOrderPath(orderId)}/dispense`, body),
  );

export const administerMedicationOrder = async (
  orderId: string,
  body: RecordMedicationEventRequest = {},
) =>
  mapMedicationOrderEvent(
    await http.post<MedicationOrderEventDto>(
      `${medicationOrderPath(orderId)}/administer`,
      body,
    ),
  );

export const confirmMedicationOrderAdherence = async (
  orderId: string,
  body: RecordMedicationEventRequest = {},
) =>
  mapMedicationOrderEvent(
    await http.post<MedicationOrderEventDto>(
      `${medicationOrderPath(orderId)}/adherence-confirmations`,
      body,
    ),
  );

export const addMedicationOrderAdherenceNote = async (
  orderId: string,
  body: RecordMedicationEventRequest,
) =>
  mapMedicationOrderEvent(
    await http.post<MedicationOrderEventDto>(
      `${medicationOrderPath(orderId)}/adherence-notes`,
      body,
    ),
  );

export const createEncounterDocument = async (
  encounterId: string,
  body: CreateClinicalDocumentRequest,
) => mapDocument(await http.post<ClinicalDocumentDto>(`${encounterPath(encounterId)}/documents`, body));

export const getEncounterDocuments = async (encounterId: string) =>
  (await http.get<ClinicalDocumentDto[]>(`${encounterPath(encounterId)}/documents`)).map(mapDocument);

export const updateEncounterMedicalRecordDiagnosis = (
  encounterId: string,
  body: UpdateMedicalRecordDiagnosisRequest,
) => http.patch<unknown>(`${encounterPath(encounterId)}/medical-record/diagnosis`, body);

export const updateEncounterMedicalRecordDischargeFollowup = (
  encounterId: string,
  body: UpdateMedicalRecordDischargeFollowupRequest,
) => http.patch<unknown>(`${encounterPath(encounterId)}/medical-record/discharge-followup`, body);

export type MedicalRecordBreakGlassStatus = 'active' | 'ended' | 'expired';

export interface MedicalRecordBreakGlassGrant {
  id: string;
  encounterId: string;
  medicalRecordId: string;
  patientId: string;
  grantedToUserId: string;
  reason: string;
  status: MedicalRecordBreakGlassStatus;
  grantedAt: string;
  expiresAt: string;
  endedAt: string | null;
}

export interface RequestMedicalRecordBreakGlassRequest {
  reason: string;
  mfaCode: string;
}

// New in v2.6 — emergency, time-limited, MFA-gated read access to a single
// encounter's medical record for staff who lack standing visibility into it.
export const requestEncounterMedicalRecordBreakGlass = (
  encounterId: string,
  body: RequestMedicalRecordBreakGlassRequest,
) =>
  http.post<MedicalRecordBreakGlassGrant>(
    `${encounterPath(encounterId)}/medical-record/break-glass-grants`,
    body,
  );

// New in v2.6 — ends an active break-glass grant.
export const endMedicalRecordBreakGlass = (grantId: string) =>
  http.post<MedicalRecordBreakGlassGrant>(
    `/api/v1/medical-record/break-glass-grants/${encodeURIComponent(grantId)}/end`,
  );

const recordPath = (recordId: string) => `/api/v1/medical-records/${encodeURIComponent(recordId)}`;

export interface MedicalRecordCompletionCheck {
  ok: boolean;
  missing: Array<{
    code: string;
    message: string;
  }>;
  checkedAt: string;
  recordVersion: number;
}

export const getMedicalRecordCompletionCheck = (recordId: string) =>
  http.get<MedicalRecordCompletionCheck>(`${recordPath(recordId)}/completion-check`);

export const signMedicalRecord = (recordId: string) =>
  http.post<unknown>(`${recordPath(recordId)}/sign`);

export const addMedicalRecordAddendum = async (recordId: string, text: string) =>
  mapRecord(await http.post<MedicalRecordDto>(`${recordPath(recordId)}/addendum`, { text }));

export const reopenMedicalRecord = async (recordId: string, reason: string) =>
  mapRecord(await http.post<MedicalRecordDto>(`${recordPath(recordId)}/reopen`, { reason }));

export const flagMedicalRecordLateResult = async (recordId: string, description: string) =>
  mapRecord(await http.post<MedicalRecordDto>(`${recordPath(recordId)}/flag-late-result`, { description }));

// No UI call site for prescription refills yet; body/response are opaque
// (bare `{}` request, generic "data" response) in the spec.
export const requestPrescriptionRefill = (prescriptionId: string) =>
  http.post<unknown>(`/api/v1/prescriptions/${encodeURIComponent(prescriptionId)}/refill-request`);
