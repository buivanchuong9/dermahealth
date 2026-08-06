import { http } from "./http";
import type {
  ComparisonSession,
  AdverseEvent,
  Lesion,
  LesionDetailBundle,
  LesionObservation,
  Laterality,
  MetricSource,
  ReviewInput,
  TimelineEvent,
} from "../domain/skinProgress";

export type LifetimeRecordEventType =
  | "encounter"
  | "diagnosis"
  | "procedure"
  | "prescription"
  | "laboratory"
  | "imaging"
  | "vaccination"
  | "allergy"
  | "document"
  | "care_plan";

export interface LifetimeRecordSource {
  organizationId: string;
  organizationName: string;
  facilityId?: string | null;
  facilityName?: string | null;
  province?: string | null;
  system?: string | null;
}

export interface LifetimeRecordClinicalItem {
  id: string;
  code?: string | null;
  display: string;
  status?: string | null;
  value?: string | null;
  note?: string | null;
}

export interface LifetimeRecordEvent {
  id: string;
  occurredAt: string;
  endedAt?: string | null;
  type: LifetimeRecordEventType;
  title: string;
  summary?: string | null;
  status?: string | null;
  specialty?: string | null;
  practitionerName?: string | null;
  source: LifetimeRecordSource;
  diagnoses: LifetimeRecordClinicalItem[];
  medications: LifetimeRecordClinicalItem[];
  orders: LifetimeRecordClinicalItem[];
  results: LifetimeRecordClinicalItem[];
  procedures: LifetimeRecordClinicalItem[];
  documents: Array<{
    id: string;
    title: string;
    contentType?: string | null;
    signedAt?: string | null;
    downloadUrl?: string | null;
  }>;
  provenance: {
    sourceRecordId: string;
    sourceSystem?: string | null;
    importedAt?: string | null;
    lastVerifiedAt?: string | null;
    integrityHash?: string | null;
  };
}

export type AllergyVerificationStatus =
  | 'patient_reported'
  | 'clinician_verified'
  | 'unverified'
  | 'imported_unverified'
  | 'organization_verified'
  | 'superseded'
  | 'entered_in_error';

export type AllergyKnowledgeState = 'unknown' | 'no_known_allergies' | 'known_allergies';
export type AllergySourceType = 'patient_reported' | 'clinical_assessment' | 'imported_unverified' | 'legacy_backfill';
export type VitalSourceType = 'clinical_measurement' | 'patient_reported' | 'device_imported' | 'ehr_imported' | 'legacy_backfill';

export interface AllergyKnowledgeStateInfo {
  state: AllergyKnowledgeState;
  assessedAt?: string | null;
  assessedByUserId?: string | null;
  organizationId?: string | null;
}

export interface AllergyIntolerance {
  id: string;
  substance: string;
  substanceCode?: string | null;
  category: string;
  reaction?: string | null;
  severity?: string | null;
  onsetDate?: string | null;
  effectiveAt?: string | null;
  verificationStatus: AllergyVerificationStatus;
  verifiedAt?: string | null;
  verifiedByUserId?: string | null;
  note?: string | null;
  active: boolean;
  recordedAt: string;
  sourceType: AllergySourceType;
  organizationId: string;
  clinicLocationId?: string | null;
  encounterId?: string | null;
  supersedesId?: string | null;
  enteredInErrorAt?: string | null;
}

export interface VitalObservation {
  id: string;
  type: string;
  value: number;
  unit: string;
  /** When the measurement was clinically taken — always show this to users. */
  observedAt: string;
  /** When it was entered into the system — may differ from observedAt for imports. */
  recordedAt: string;
  sourceType: VitalSourceType;
  organizationId: string;
  clinicLocationId?: string | null;
  encounterId?: string | null;
  method?: string | null;
  note?: string | null;
  bmiSourceHeightId?: string | null;
  bmiSourceWeightId?: string | null;
}

export interface PatientProfileNarrative {
  chiefComplaint?: string | null;
  medicalHistory?: string | null;
  familyHistory?: string | null;
  socialHistory?: string | null;
  currentSymptoms?: string | null;
  lifestyle?: string | null;
  occupation?: string | null;
  /** Always true — narratives are patient-provided. Never render as clinician history. */
  isPatientProvided: boolean;
  updatedAt: string;
}

export interface LifetimeMedicalRecord {
  patient: {
    id: string;
    nationalHealthId?: string | null;
    code: string;
    name: string;
    dob?: string | null;
    gender?: string | null;
    bloodType?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    heightCm?: number | null;
    weightKg?: number | null;
  };
  summary: {
    encounterCount: number;
    organizationCount: number;
    facilityCount: number;
    firstRecordedAt?: string | null;
    lastRecordedAt?: string | null;
    activeConditions: LifetimeRecordClinicalItem[];
    allergies: LifetimeRecordClinicalItem[];
    currentMedications: LifetimeRecordClinicalItem[];
    allergyKnowledgeState: AllergyKnowledgeStateInfo;
  };
  allergies: AllergyIntolerance[];
  vitals: VitalObservation[];
  narrative: PatientProfileNarrative | null;
  events: LifetimeRecordEvent[];
  page: number;
  limit: number;
  total: number;
  synchronizedAt: string;
}

const patientLifetimePath = (patientId: string) =>
  `/api/v1/patients/${encodeURIComponent(patientId)}/lifetime-medical-record`;

const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const asString = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;

const asNullableString = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;

const asNumber = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

const asArray = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [];

const EVENT_TYPES = new Set<LifetimeRecordEventType>([
  "encounter",
  "diagnosis",
  "procedure",
  "prescription",
  "laboratory",
  "imaging",
  "vaccination",
  "allergy",
  "document",
  "care_plan",
]);

const mapClinicalItem = (value: unknown): LifetimeRecordClinicalItem => {
  const item = asObject(value);
  return {
    id: asString(item.id),
    code: asNullableString(item.code),
    display: asString(item.display, "Chưa có mô tả"),
    status: asNullableString(item.status),
    value: asNullableString(item.value),
    note: asNullableString(item.note),
  };
};

const mapEvent = (value: unknown): LifetimeRecordEvent => {
  const event = asObject(value);
  const source = asObject(event.source);
  const provenance = asObject(event.provenance);
  const rawType = asString(event.type, "encounter") as LifetimeRecordEventType;
  return {
    id: asString(event.id),
    occurredAt: asString(event.occurredAt),
    endedAt: asNullableString(event.endedAt),
    type: EVENT_TYPES.has(rawType) ? rawType : "encounter",
    title: asString(event.title, "Sự kiện khám chữa bệnh"),
    summary: asNullableString(event.summary),
    status: asNullableString(event.status),
    specialty: asNullableString(event.specialty),
    practitionerName: asNullableString(event.practitionerName),
    source: {
      organizationId: asString(source.organizationId),
      organizationName: asString(source.organizationName, "Đơn vị y tế"),
      facilityId: asNullableString(source.facilityId),
      facilityName: asNullableString(source.facilityName),
      province: asNullableString(source.province),
      system: asNullableString(source.system),
    },
    diagnoses: asArray(event.diagnoses).map(mapClinicalItem),
    medications: asArray(event.medications).map(mapClinicalItem),
    orders: asArray(event.orders).map(mapClinicalItem),
    results: asArray(event.results).map(mapClinicalItem),
    procedures: asArray(event.procedures).map(mapClinicalItem),
    documents: asArray(event.documents).map((value) => {
      const document = asObject(value);
      return {
        id: asString(document.id),
        title: asString(document.title, "Tài liệu lâm sàng"),
        contentType: asNullableString(document.contentType),
        signedAt: asNullableString(document.signedAt),
        downloadUrl: asNullableString(document.downloadUrl),
      };
    }),
    provenance: {
      sourceRecordId: asString(provenance.sourceRecordId),
      sourceSystem: asNullableString(provenance.sourceSystem),
      importedAt: asNullableString(provenance.importedAt),
      lastVerifiedAt: asNullableString(provenance.lastVerifiedAt),
      integrityHash: asNullableString(provenance.integrityHash),
    },
  };
};

const mapLifetimeMedicalRecord = (value: unknown): LifetimeMedicalRecord => {
  const root = asObject(value);
  const patient = asObject(root.patient);
  const summary = asObject(root.summary);
  return {
    patient: {
      id: asString(patient.id),
      nationalHealthId: asNullableString(patient.nationalHealthId),
      code: asString(patient.code),
      name: asString(patient.name),
      dob: asNullableString(patient.dob),
      gender: asNullableString(patient.gender),
      bloodType: asNullableString(patient.bloodType),
      phone: asNullableString(patient.phone),
      email: asNullableString(patient.email),
      address: asNullableString(patient.address),
      heightCm:
        typeof patient.heightCm === "number" &&
        Number.isFinite(patient.heightCm)
          ? patient.heightCm
          : null,
      weightKg:
        typeof patient.weightKg === "number" &&
        Number.isFinite(patient.weightKg)
          ? patient.weightKg
          : null,
    },
    summary: {
      encounterCount: asNumber(summary.encounterCount),
      organizationCount: asNumber(summary.organizationCount),
      facilityCount: asNumber(summary.facilityCount),
      firstRecordedAt: asNullableString(summary.firstRecordedAt),
      lastRecordedAt: asNullableString(summary.lastRecordedAt),
      activeConditions: asArray(summary.activeConditions).map(mapClinicalItem),
      allergies: asArray(summary.allergies).map(mapClinicalItem),
      currentMedications: asArray(summary.currentMedications).map(mapClinicalItem),
      allergyKnowledgeState: (() => {
        const ks = asObject(summary.allergyKnowledgeState);
        const VALID_KS = new Set<string>(['unknown', 'no_known_allergies', 'known_allergies']);
        const rawState = asString(ks.state, 'unknown');
        return {
          state: (VALID_KS.has(rawState) ? rawState : 'unknown') as AllergyKnowledgeState,
          assessedAt: asNullableString(ks.assessedAt),
          assessedByUserId: asNullableString(ks.assessedByUserId),
          organizationId: asNullableString(ks.organizationId),
        };
      })(),
    },
    allergies: asArray(root.allergies).map((v) => {
      const a = asObject(v);
      const VALID_VERIFICATION = new Set<string>([
        'patient_reported', 'clinician_verified', 'unverified',
        'imported_unverified', 'organization_verified', 'superseded', 'entered_in_error',
      ]);
      const rawStatus = asString(a.verificationStatus, 'patient_reported');
      const VALID_SOURCE = new Set<string>(['patient_reported', 'clinical_assessment', 'imported_unverified', 'legacy_backfill']);
      const rawSource = asString(a.sourceType, 'patient_reported');
      return {
        id: asString(a.id),
        substance: asString(a.substance, 'Chất gây dị ứng chưa xác định'),
        substanceCode: asNullableString(a.substanceCode),
        category: asString(a.category, 'other'),
        reaction: asNullableString(a.reaction),
        severity: asNullableString(a.severity),
        onsetDate: asNullableString(a.onsetDate),
        effectiveAt: asNullableString(a.effectiveAt),
        verificationStatus: (VALID_VERIFICATION.has(rawStatus) ? rawStatus : 'patient_reported') as AllergyVerificationStatus,
        verifiedAt: asNullableString(a.verifiedAt),
        verifiedByUserId: asNullableString(a.verifiedByUserId),
        note: asNullableString(a.note),
        active: typeof a.active === 'boolean' ? a.active : true,
        recordedAt: asString(a.recordedAt),
        sourceType: (VALID_SOURCE.has(rawSource) ? rawSource : 'patient_reported') as AllergySourceType,
        organizationId: asString(a.organizationId),
        clinicLocationId: asNullableString(a.clinicLocationId),
        encounterId: asNullableString(a.encounterId),
        supersedesId: asNullableString(a.supersedesId),
        enteredInErrorAt: asNullableString(a.enteredInErrorAt),
      };
    }),
    vitals: asArray(root.vitals).map((v) => {
      const obs = asObject(v);
      const VALID_VSOURCE = new Set<string>(['clinical_measurement', 'patient_reported', 'device_imported', 'ehr_imported', 'legacy_backfill']);
      const rawVSource = asString(obs.sourceType, 'clinical_measurement');
      return {
        id: asString(obs.id),
        type: asString(obs.type),
        value: typeof obs.value === 'number' ? obs.value : 0,
        unit: asString(obs.unit),
        observedAt: asString(obs.observedAt),
        recordedAt: asString(obs.recordedAt),
        sourceType: (VALID_VSOURCE.has(rawVSource) ? rawVSource : 'clinical_measurement') as VitalSourceType,
        organizationId: asString(obs.organizationId),
        clinicLocationId: asNullableString(obs.clinicLocationId),
        encounterId: asNullableString(obs.encounterId),
        method: asNullableString(obs.method),
        note: asNullableString(obs.note),
        bmiSourceHeightId: asNullableString(obs.bmiSourceHeightId),
        bmiSourceWeightId: asNullableString(obs.bmiSourceWeightId),
      };
    }),
    narrative: (() => {
      const n = asObject(root.narrative);
      if (!root.narrative) return null;
      return {
        chiefComplaint: asNullableString(n.chiefComplaint),
        medicalHistory: asNullableString(n.medicalHistory),
        familyHistory: asNullableString(n.familyHistory),
        socialHistory: asNullableString(n.socialHistory),
        currentSymptoms: asNullableString(n.currentSymptoms),
        lifestyle: asNullableString(n.lifestyle),
        occupation: asNullableString(n.occupation),
        isPatientProvided: true,
        updatedAt: asString(n.updatedAt),
      };
    })(),
    events: asArray(root.events).map(mapEvent),
    page: asNumber(root.page),
    limit: asNumber(root.limit),
    total: asNumber(root.total),
    synchronizedAt: asString(root.synchronizedAt),
  };
};

/** v2.7.1 currently supports only the patientId path parameter. Filtering is
 * intentionally performed by the UI until the backend publishes query params. */
export async function getLifetimeMedicalRecord(
  patientId: string,
): Promise<LifetimeMedicalRecord> {
  const raw = await http.get<unknown>(patientLifetimePath(patientId));
  return mapLifetimeMedicalRecord(raw);
}

export interface CreateExternalRecordImportRequest {
  sourceOrganizationId: string;
  sourceFacilityId?: string;
  sourceSystem: string;
  externalPatientId: string;
  consentId: string;
  records: Array<{
    resourceType: string;
    externalId: string;
    occurredAt: string;
    payload: Record<string, unknown>;
    integrityHash?: string;
  }>;
}

export const importExternalLifetimeRecords = (
  patientId: string,
  body: CreateExternalRecordImportRequest,
) =>
  http.post<{ importJobId: string; accepted: number; rejected: number }>(
    `${patientLifetimePath(patientId)}/imports`,
    body,
  );

export interface CreateAllergyRequest {
  category: string;
  substance: string;
  substanceCode?: string;
  reaction?: string;
  severity?: string;
  onsetDate?: string;
  note?: string;
}

export const createAllergy = (patientId: string, body: CreateAllergyRequest) =>
  http.post<AllergyIntolerance>(`/api/v1/patients/${encodeURIComponent(patientId)}/allergies`, body);

export const verifyAllergy = (patientId: string, allergyId: string) =>
  http.post<AllergyIntolerance>(
    `/api/v1/patients/${encodeURIComponent(patientId)}/allergies/${encodeURIComponent(allergyId)}/verifications`,
    {},
  );

export interface CorrectAllergyRequest {
  reason: string;
  category?: string;
  substance?: string;
  reaction?: string;
  severity?: string;
  note?: string;
}

export const correctAllergy = (patientId: string, allergyId: string, body: CorrectAllergyRequest) =>
  http.post<AllergyIntolerance>(
    `/api/v1/patients/${encodeURIComponent(patientId)}/allergies/${encodeURIComponent(allergyId)}/corrections`,
    body,
  );

export const enterAllergyInError = (patientId: string, allergyId: string, reason: string) =>
  http.post<AllergyIntolerance>(
    `/api/v1/patients/${encodeURIComponent(patientId)}/allergies/${encodeURIComponent(allergyId)}/entered-in-error`,
    { reason },
  );

export const assessAllergyKnowledgeState = (
  patientId: string,
  knowledgeState: AllergyKnowledgeState,
  options?: { note?: string; clinicLocationId?: string; encounterId?: string },
) =>
  http.post<AllergyKnowledgeStateInfo>(
    `/api/v1/patients/${encodeURIComponent(patientId)}/allergy-knowledge-assessments`,
    { knowledgeState, ...options },
  );

export interface ShareLifetimeRecordRequest {
  recipientOrganizationId: string;
  recipientPractitionerId?: string;
  purpose: "treatment" | "referral" | "emergency" | "patient_request";
  eventIds?: string[];
  expiresAt: string;
  consentId: string;
}

export const shareLifetimeMedicalRecord = (
  patientId: string,
  body: ShareLifetimeRecordRequest,
) =>
  http.post<{ shareId: string; accessUrl: string; expiresAt: string }>(
    `${patientLifetimePath(patientId)}/shares`,
    body,
  );

// DermaTimeline API contracts follow the Lifetime Medical Record transport conventions.

export interface PaginatedLesions {
  items: Lesion[];
  nextCursor: string | null;
}

export const listPatientLesions = (
  patientId: string,
  cursor?: string,
  signal?: AbortSignal,
) => {
  const query = new URLSearchParams({ limit: "30" });
  if (cursor) query.set("cursor", cursor);
  return http.get<PaginatedLesions>(
    `/api/v1/patients/${encodeURIComponent(patientId)}/lesions?${query.toString()}`,
    { signal },
  );
};

export const getLesion = (lesionId: string, signal?: AbortSignal) =>
  http.get<LesionDetailBundle>(
    `/api/v1/lesions/${encodeURIComponent(lesionId)}`,
    { signal },
  );

export interface CreateLesionRequest {
  title: string;
  bodyRegion: string;
  laterality: Laterality;
  firstObservedAt: string;
  diagnosis?: string;
  diagnosisCode?: string;
  clinicianId?: string;
  currentTreatment?: string;
}

export const createLesion = (
  patientId: string,
  body: CreateLesionRequest,
  idempotencyKey: string,
) =>
  http.post<Lesion>(
    `/api/v1/patients/${encodeURIComponent(patientId)}/lesions`,
    body,
    { idempotencyKey },
  );

export interface CreateObservationMetricRequest {
  code: string;
  value: number;
  source: MetricSource;
  measurementMethod?: string;
  observedAt: string;
}

export interface CreateObservationRequest {
  encounterId?: string;
  capturedAt: string;
  imageAssetIds: string[];
  patientReportedSymptoms: string[];
  clinicianNotes?: string;
  treatmentContext?: string;
  clinicalMetrics: CreateObservationMetricRequest[];
}

export const createObservation = (
  lesionId: string,
  body: CreateObservationRequest,
  idempotencyKey: string,
) =>
  http.post<LesionObservation>(
    `/api/v1/lesions/${encodeURIComponent(lesionId)}/observations`,
    body,
    { idempotencyKey },
  );

export const submitObservation = (
  observationId: string,
  idempotencyKey: string,
) =>
  http.post<LesionObservation>(
    `/api/v1/observations/${encodeURIComponent(observationId)}/submit`,
    undefined,
    { idempotencyKey },
  );

export const createComparison = (
  lesionId: string,
  body: {
    baselineObservationId: string;
    targetObservationId: string;
  },
  idempotencyKey: string,
) =>
  http.post<ComparisonSession>(
    `/api/v1/lesions/${encodeURIComponent(lesionId)}/comparisons`,
    body,
    { idempotencyKey },
  );

export const getComparison = (comparisonId: string) =>
  http.get<ComparisonSession>(
    `/api/v1/comparisons/${encodeURIComponent(comparisonId)}`,
  );

export const createClinicianReview = (
  comparisonId: string,
  body: ReviewInput,
  idempotencyKey: string,
) =>
  http.post<LesionDetailBundle>(
    `/api/v1/comparisons/${encodeURIComponent(comparisonId)}/reviews`,
    body,
    { idempotencyKey },
  );

export interface CorrectMaskRequest {
  action: "CONFIRM" | "CORRECT";
  /** Required for action="CORRECT": an already-uploaded (POST /uploads,
   * context "lesion-image") replacement mask image. */
  uploadObjectId?: string;
  reason: string;
}

export const correctLesionMask = (
  comparisonId: string,
  assetId: string,
  body: CorrectMaskRequest,
  idempotencyKey: string,
) =>
  http.post<LesionDetailBundle>(
    `/api/v1/comparisons/${encodeURIComponent(comparisonId)}/masks/${encodeURIComponent(assetId)}/corrections`,
    body,
    { idempotencyKey },
  );

export const getLesionTimeline = (lesionId: string, cursor?: string) => {
  const query = new URLSearchParams({ limit: "50" });
  if (cursor) query.set("cursor", cursor);
  return http.get<{ items: TimelineEvent[]; nextCursor: string | null }>(
    `/api/v1/lesions/${encodeURIComponent(lesionId)}/timeline?${query.toString()}`,
  );
};

/** Creates a suspected safety event only. This endpoint must never create or
 * confirm an Allergy resource as a side effect. */
export const createAdverseEvent = (
  patientId: string,
  body: Omit<AdverseEvent, "id" | "patientId" | "createdAt" | "updatedAt">,
  idempotencyKey: string,
) =>
  http.post<AdverseEvent>(
    `/api/v1/patients/${encodeURIComponent(patientId)}/adverse-events`,
    body,
    { idempotencyKey },
  );

export const deleteLesion = (lesionId: string) =>
  http.delete<{ success: boolean; lesionId: string }>(
    `/api/v1/lesions/${encodeURIComponent(lesionId)}`,
  );

export interface DermaTimelineRepository {
  listLesions(patientId: string, signal?: AbortSignal): Promise<Lesion[]>;
  getBundle(
    patientId: string,
    lesionId: string,
    signal?: AbortSignal,
  ): Promise<LesionDetailBundle>;
  deleteLesion?(lesionId: string): Promise<void>;
  requestComparison(
    patientId: string,
    bundle: LesionDetailBundle,
    baselineObservationId: string,
    targetObservationId: string,
    idempotencyKey: string,
  ): Promise<ComparisonSession>;
  submitReview(
    patientId: string,
    bundle: LesionDetailBundle,
    input: ReviewInput,
    reviewer: { id: string; name: string },
    idempotencyKey: string,
  ): Promise<LesionDetailBundle>;
  correctMask(
    comparisonId: string,
    assetId: string,
    input: CorrectMaskRequest,
    idempotencyKey: string,
  ): Promise<LesionDetailBundle>;
}

export class ApiDermaTimelineRepository implements DermaTimelineRepository {
  async listLesions(
    patientId: string,
    signal?: AbortSignal,
  ): Promise<Lesion[]> {
    return (await listPatientLesions(patientId, undefined, signal)).items;
  }

  getBundle(
    _patientId: string,
    lesionId: string,
    signal?: AbortSignal,
  ): Promise<LesionDetailBundle> {
    return getLesion(lesionId, signal);
  }

  async deleteLesion(lesionId: string): Promise<void> {
    await deleteLesion(lesionId);
  }

  requestComparison(
    _patientId: string,
    bundle: LesionDetailBundle,
    baselineObservationId: string,
    targetObservationId: string,
    idempotencyKey: string,
  ): Promise<ComparisonSession> {
    return createComparison(
      bundle.lesion.id,
      { baselineObservationId, targetObservationId },
      idempotencyKey,
    );
  }

  submitReview(
    _patientId: string,
    bundle: LesionDetailBundle,
    input: ReviewInput,
    _reviewer: { id: string; name: string },
    idempotencyKey: string,
  ): Promise<LesionDetailBundle> {
    if (!bundle.comparison)
      throw new Error("Không có phiên so sánh để review.");
    return createClinicianReview(bundle.comparison.id, input, idempotencyKey);
  }

  correctMask(
    comparisonId: string,
    assetId: string,
    input: CorrectMaskRequest,
    idempotencyKey: string,
  ): Promise<LesionDetailBundle> {
    return correctLesionMask(comparisonId, assetId, input, idempotencyKey);
  }
}
